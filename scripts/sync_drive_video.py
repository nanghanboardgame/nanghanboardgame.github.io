#!/usr/bin/env python3
"""Check or prepare a newer public Drive video for the two Nàng Han feature players.

Usage from the repository root:
    python3 scripts/sync_drive_video.py --check
    python3 scripts/sync_drive_video.py --prepare

--check is read-only. --prepare writes versioned MP4/JPEG assets, updates only the
two feature-video references in index.html and story.html, and advances the
baseline manifest. It never commits, pushes, or changes the homepage banner.

This reads the public folder's embedded _DRIVE_ivd listing, an undocumented
Google Drive page format. A changed or incomplete format is an error, not an
excuse to guess which video to publish.
"""

from __future__ import annotations

import argparse
import ast
import contextlib
import email.utils
import fcntl
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.error
import urllib.request
import warnings
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "scripts" / "drive-video-state.json"
ASSETS = ROOT / "assets"
PAGES = (ROOT / "index.html", ROOT / "story.html")
FOLDER_ID = "1xBkiETWw5wINKG-PcGgc0Cvl_xOw9V6-"
FOLDER_URL = f"https://drive.google.com/drive/folders/{FOLDER_ID}"
MAX_SOURCE_BYTES = 2 * 1024**3
MAX_PUBLISHED_BYTES = 95 * 1024**2
MAX_DURATION_SECONDS = 15 * 60
USER_AGENT = "Mozilla/5.0 (compatible; NangHanVideoSync/1.0)"
IVD_RE = re.compile(r"window\['_DRIVE_ivd'\]\s*=\s*'((?:\\.|[^'\\])*)'", re.DOTALL)
PLAYER_RE = re.compile(
    r'(<video\s+class="feature-video"[^>]*\bposter=")'
    r'(assets/story-intro-poster-v\d+\.jpg)'
    r'("[^>]*>\s*<source\s+src=")'
    r'(assets/story-intro-v\d+\.mp4)'
    r'("\s+type="video/mp4"\s*/?>)',
    re.DOTALL,
)


class SyncError(RuntimeError):
    """A source or local-state mismatch that must be reviewed before publishing."""


@dataclass(frozen=True)
class DriveFile:
    id: str
    name: str
    mime: str
    modified_ms: int
    size: int

    def public_fields(self) -> dict[str, object]:
        return {
            "id": self.id,
            "name": self.name,
            "modified_ms": self.modified_ms,
            "size": self.size,
        }


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SyncError(message)


def request(url: str, *, method: str = "GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
    response = urllib.request.urlopen(req, timeout=45)
    host = urllib.parse.urlparse(response.url).hostname or ""
    if not (host == "drive.google.com"
            or host == "drive.usercontent.google.com"
            or host.endswith(".googleusercontent.com")):
        response.close()
        raise SyncError(f"Drive redirected to an unexpected host: {host}")
    return response


def read_listing() -> list[DriveFile]:
    with request(FOLDER_URL) as response:
        require(response.status == 200, f"Drive folder HTTP {response.status}")
        html_bytes = response.read(8 * 1024**2 + 1)
    require(len(html_bytes) <= 8 * 1024**2, "Drive folder page is unexpectedly large")
    html = html_bytes.decode("utf-8")
    matches = IVD_RE.findall(html)
    require(len(matches) == 1, "Drive folder listing is missing or ambiguous")

    # Drive currently stores JSON in a JavaScript single-quoted string. Python's
    # literal parser decodes its \xNN and \uNNNN escapes without executing JS.
    escaped = matches[0].replace(r"\/", "/")
    with warnings.catch_warnings():
        warnings.simplefilter("error", SyntaxWarning)
        warnings.simplefilter("error", DeprecationWarning)
        decoded = ast.literal_eval("'" + escaped + "'")
    payload = json.loads(decoded)
    require(isinstance(payload, list) and len(payload) == 6, "Drive listing format changed")
    require(payload[1:4] == [None, None, None], "Drive listing may be paginated; refusing partial results")
    require(isinstance(payload[4], list) and payload[5] == 1, "Drive listing metadata changed")
    rows = payload[0]
    require(isinstance(rows, list) and 0 < len(rows) < 100,
            "Drive listing is empty or may require pagination")

    files: list[DriveFile] = []
    seen: set[str] = set()
    for row in rows:
        require(isinstance(row, list) and len(row) > 13, "Malformed Drive file entry")
        file_id, parents, name, mime = row[:4]
        require(isinstance(file_id, str) and re.fullmatch(r"[A-Za-z0-9_-]{10,}", file_id) is not None,
                "Malformed Drive file ID")
        require(file_id not in seen, "Duplicate Drive file ID in listing")
        require(isinstance(parents, list) and FOLDER_ID in parents, "Drive returned a file from another folder")
        require(isinstance(name, str) and isinstance(mime, str), "Malformed Drive file name or MIME")
        seen.add(file_id)
        if not mime.startswith("video/"):
            continue
        modified_ms, size = row[9], row[13]
        require(isinstance(modified_ms, int) and modified_ms > 0, "Video lacks a valid Drive modification time")
        require(isinstance(size, int) and 0 < size <= MAX_SOURCE_BYTES,
                "Video is empty or exceeds the 2 GiB source limit")
        files.append(DriveFile(file_id, name, mime, modified_ms, size))
    return files


def read_state() -> dict[str, object]:
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    require(isinstance(state, dict) and state.get("folder_id") == FOLDER_ID, "Baseline folder ID mismatch")
    version = state.get("published_version")
    source = state.get("source_file")
    require(isinstance(version, int) and version >= 1 and isinstance(source, dict), "Malformed baseline manifest")
    require(isinstance(source.get("modified_ms"), int) and source["modified_ms"] > 0,
            "Baseline has no valid modification time")
    require(isinstance(source.get("size"), int) and source["size"] > 0, "Baseline has no valid size")
    require(isinstance(source.get("id"), str) and isinstance(source.get("name"), str),
            "Baseline has no source identity")
    require(isinstance(source.get("sha256"), str) and re.fullmatch(r"[0-9a-f]{64}", source["sha256"]),
            "Baseline has no source SHA-256")
    known_ids = state.get("known_file_ids")
    require(isinstance(known_ids, list) and len(known_ids) > 0
            and all(isinstance(file_id, str) and re.fullmatch(r"[A-Za-z0-9_-]{10,}", file_id)
                    for file_id in known_ids)
            and len(known_ids) == len(set(known_ids)) and source["id"] in known_ids,
            "Baseline has no valid known Drive file IDs")
    return state


def expected_assets(version: int) -> tuple[str, str]:
    return (f"assets/story-intro-v{version}.mp4", f"assets/story-intro-poster-v{version}.jpg")


def page_replacements(
    version: int, new_version: int, originals: dict[Path, bytes] | None = None
) -> dict[Path, bytes]:
    current_video, current_poster = expected_assets(version)
    next_video, next_poster = expected_assets(new_version)
    prepared: dict[Path, bytes] = {}
    for page in PAGES:
        source = (originals[page] if originals is not None else page.read_bytes()).decode("utf-8")
        matches = list(PLAYER_RE.finditer(source))
        require(len(matches) == 1, f"Expected one feature player in {page.name}")
        match = matches[0]
        require(match.group(2) == current_poster and match.group(4) == current_video,
                f"Feature player in {page.name} differs from baseline manifest")
        replacement = match.group(1) + next_poster + match.group(3) + next_video + match.group(5)
        updated = source[:match.start()] + replacement + source[match.end():]
        prepared[page] = updated.encode("utf-8")
    return prepared


def newest_file(files: list[DriveFile], state: dict[str, object]) -> DriveFile | None:
    known_ids = set(state["known_file_ids"])
    new_files = [file for file in files if file.id not in known_ids]
    if new_files:
        latest_ms = max(file.modified_ms for file in new_files)
        latest = [file for file in new_files if file.modified_ms == latest_ms]
        require(len(latest) == 1, "Multiple new videos share the newest Drive timestamp; review manually")
        candidate = latest[0]
    else:
        source = state["source_file"]
        assert isinstance(source, dict)
        candidate = next((file for file in files if file.id == source["id"]), None)
        if candidate is None or (candidate.modified_ms == source["modified_ms"]
                                 and candidate.size == source["size"]):
            return None
    require(candidate.mime == "video/mp4" and candidate.name.lower().endswith(".mp4"),
            f"Newest video is not MP4: {candidate.name}")
    return candidate


def download_url(file_id: str) -> str:
    query = urllib.parse.urlencode({"id": file_id, "export": "download"})
    return f"https://drive.usercontent.google.com/download?{query}"


def verify_headers(response, file: DriveFile) -> None:
    require(response.status == 200, f"Video download HTTP {response.status}")
    mime = response.headers.get_content_type()
    require(mime == "video/mp4", f"Download returned {mime}, expected video/mp4")
    length = response.headers.get("Content-Length")
    require(length is not None and int(length) == file.size,
            "Drive Content-Length differs from the folder listing")
    last_modified = response.headers.get("Last-Modified")
    if last_modified:
        dt = email.utils.parsedate_to_datetime(last_modified)
        delta_ms = abs(round(dt.timestamp() * 1000) - file.modified_ms)
        require(delta_ms < 2000, "Drive Last-Modified differs from the folder listing")


def verify_download(file: DriveFile) -> None:
    with request(download_url(file.id), method="HEAD") as response:
        verify_headers(response, file)


def download(file: DriveFile, destination: Path) -> str:
    digest = hashlib.sha256()
    size = 0
    with request(download_url(file.id)) as response, destination.open("xb") as output:
        verify_headers(response, file)
        while True:
            chunk = response.read(1024**2)
            if not chunk:
                break
            size += len(chunk)
            require(size <= file.size, "Drive sent more bytes than listed")
            output.write(chunk)
            digest.update(chunk)
        output.flush()
        os.fsync(output.fileno())
    require(size == file.size, "Drive download is incomplete")
    return digest.hexdigest()


def probe(path: Path) -> tuple[int, int, float, dict[str, object]]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,codec_type,width,height,pix_fmt",
         "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    videos = [stream for stream in streams if stream.get("codec_type") == "video"]
    require(len(videos) == 1, "Expected exactly one video stream")
    video = videos[0]
    width, height = video.get("width"), video.get("height")
    require(isinstance(width, int) and isinstance(height, int) and width >= 1280 and height >= 720,
            "Video resolution is below 1280×720")
    require(width % 2 == 0 and height % 2 == 0, "Video dimensions must be even for H.264")
    duration = float(data["format"]["duration"])
    require(0 < duration <= MAX_DURATION_SECONDS, "Video duration is invalid or exceeds 15 minutes")
    return width, height, duration, video


def transcode(source: Path, target: Path, poster: Path, width: int, height: int, duration: float) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
         "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "medium",
         "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
         "-movflags", "+faststart", "-map_metadata", "-1", str(target)],
        check=True,
    )
    require(target.stat().st_size <= MAX_PUBLISHED_BYTES,
            "Optimized video exceeds 95 MiB; review compression before publishing")
    actual_width, actual_height, actual_duration, stream = probe(target)
    require((actual_width, actual_height) == (width, height), "Transcode changed the video resolution")
    require(stream.get("codec_name") == "h264" and stream.get("pix_fmt") == "yuv420p",
            "Transcoded video is not browser-compatible H.264/yuv420p")
    require(abs(actual_duration - duration) < 1, "Transcode changed the video duration")
    seek = min(4.0, duration * 0.1)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{seek:.3f}",
         "-i", str(target), "-frames:v", "1", "-q:v", "3", str(poster)],
        check=True,
    )
    require(poster.exists() and poster.stat().st_size > 0, "Poster extraction failed")
    poster_width, poster_height, _, _ = probe_image(poster)
    require((poster_width, poster_height) == (width, height), "Poster resolution differs from video")


def probe_image(path: Path) -> tuple[int, int, str, str]:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,codec_name,pix_fmt", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    stream = json.loads(result.stdout)["streams"][0]
    return stream["width"], stream["height"], stream["codec_name"], stream["pix_fmt"]


def atomic_write(path: Path, data: bytes) -> None:
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        os.fchmod(fd, stat.S_IMODE(path.stat().st_mode))
        with os.fdopen(fd, "wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def install_asset(source: Path, target: Path) -> None:
    require(not target.exists(), f"Versioned asset already exists: {target.name}")
    fd, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as output, source.open("rb") as input_file:
            shutil.copyfileobj(input_file, output, length=1024**2)
            output.flush()
            os.fsync(output.fileno())
        require(not target.exists(), f"Versioned asset appeared during preparation: {target.name}")
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def write_state(state: dict[str, object]) -> None:
    data = (json.dumps(state, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    atomic_write(STATE_PATH, data)


@contextlib.contextmanager
def locked():
    key = hashlib.sha256(str(ROOT).encode()).hexdigest()[:16]
    lock_path = Path(tempfile.gettempdir()) / f"nanghan-drive-video-{key}.lock"
    with lock_path.open("a+b") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def prepare(candidate: DriveFile, state: dict[str, object], observed_ids: set[str]) -> dict[str, object]:
    version = state["published_version"]
    assert isinstance(version, int)
    next_version = version + 1
    old_pages = {page: page.read_bytes() for page in PAGES}
    updates = page_replacements(version, next_version, old_pages)
    video_name, poster_name = expected_assets(next_version)
    video_asset, poster_asset = ROOT / video_name, ROOT / poster_name
    require(not video_asset.exists() and not poster_asset.exists(), "Next versioned asset already exists")
    with tempfile.TemporaryDirectory(prefix="nanghan-drive-video-") as temp_name:
        temp = Path(temp_name)
        source = temp / "source.mp4"
        sha256 = download(candidate, source)
        source_info = {**candidate.public_fields(), "sha256": sha256}
        if sha256 == state["source_file"]["sha256"]:
            # Drive can change the title/date without changing the bytes. Advance
            # the baseline so subsequent scheduled runs do not redownload it.
            state["source_file"] = source_info
            state["known_file_ids"] = sorted(set(state["known_file_ids"]) | observed_ids)
            write_state(state)
            return {"status": "unchanged_content", "source_file": source_info,
                    "published_version": version}

        width, height, duration, _ = probe(source)
        encoded = temp / "encoded.mp4"
        poster = temp / "poster.jpg"
        transcode(source, encoded, poster, width, height, duration)

        # Files and page contents are ready before any existing reference changes.
        # If a normal exception occurs mid-commit, restore the previous pages.
        require(all(page.read_bytes() == original for page, original in old_pages.items()),
                "A feature page changed during video preparation; refusing to overwrite it")
        installed: list[Path] = []
        try:
            install_asset(encoded, video_asset)
            installed.append(video_asset)
            install_asset(poster, poster_asset)
            installed.append(poster_asset)
            for page, data in updates.items():
                require(page.read_bytes() == old_pages[page],
                        f"{page.name} changed during video preparation; refusing to overwrite it")
                atomic_write(page, data)
            state["source_file"] = source_info
            state["published_version"] = next_version
            state["known_file_ids"] = sorted(set(state["known_file_ids"]) | observed_ids)
            write_state(state)
        except Exception:
            for page, old_content in old_pages.items():
                # Restore only our own write; a concurrent user edit must survive.
                if page.read_bytes() == updates[page]:
                    atomic_write(page, old_content)
            if not any(video_name.encode() in page.read_bytes()
                       or poster_name.encode() in page.read_bytes() for page in PAGES):
                for asset in installed:
                    asset.unlink(missing_ok=True)
            raise

        return {"status": "prepared", "source_file": source_info,
                "published_version": next_version, "video": video_name, "poster": poster_name,
                "published_bytes": video_asset.stat().st_size,
                "resolution": [width, height], "duration_seconds": round(duration, 3)}


def run(mode: str) -> dict[str, object]:
    with locked():
        state = read_state()
        # Validate the active player references even when the folder is unchanged.
        page_replacements(state["published_version"], state["published_version"] + 1)
        files = read_listing()
        candidate = newest_file(files, state)
        if candidate is None:
            return {"status": "up_to_date", "published_version": state["published_version"],
                    "baseline": state["source_file"], "video_count": len(files)}
        verify_download(candidate)
        if mode == "check":
            return {"status": "new_video", "candidate": candidate.public_fields(),
                    "published_version": state["published_version"]}
        return prepare(candidate, state, {file.id for file in files})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--check", action="store_true", help="Read-only Drive and baseline check")
    modes.add_argument("--prepare", action="store_true", help="Prepare new versioned assets and references")
    args = parser.parse_args()
    try:
        output = run("check" if args.check else "prepare")
    except (SyncError, OSError, ValueError, KeyError, TypeError, SyntaxError,
            json.JSONDecodeError, urllib.error.URLError, subprocess.CalledProcessError) as error:
        print(json.dumps({"status": "error", "message": str(error)}, ensure_ascii=False), file=sys.stdout)
        return 1
    print(json.dumps(output, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
