"""Small selector and reference-scope checks for the scheduled Drive monitor."""

import sys
import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
import sync_drive_video as sync  # noqa: E402


BASELINE_MS = 1792795330098
PREVIEW = sync.DriveFile("preview-file-id", "Full.moho Preview.mp4", "video/mp4",
                              BASELINE_MS - 1000, 33_705_330)
BASELINE = sync.DriveFile("current-file-id", "1024.mp4", "video/mp4",
                               BASELINE_MS, 74_469_482)
STATE = {
    "published_version": 1,
    "known_file_ids": [PREVIEW.id, BASELINE.id],
    "source_file": {**BASELINE.public_fields(), "sha256": "a" * 64},
}


class DriveVideoSyncTests(unittest.TestCase):
    def test_older_preview_does_not_replace_current_video(self):
        self.assertIsNone(sync.newest_file([PREVIEW, BASELINE], STATE))

    def test_touched_existing_preview_does_not_replace_current_video(self):
        touched_preview = sync.DriveFile(PREVIEW.id, PREVIEW.name, PREVIEW.mime,
                                         BASELINE_MS + 1000, PREVIEW.size)
        self.assertIsNone(sync.newest_file([touched_preview, BASELINE], STATE))

    def test_new_file_with_preserved_older_timestamp_is_selected(self):
        new_file = sync.DriveFile("new-final-file", "Final.mp4", "video/mp4",
                                  BASELINE_MS - 1000, 50_000_000)
        self.assertEqual(sync.newest_file([PREVIEW, BASELINE, new_file], STATE), new_file)

    def test_current_source_update_is_selected(self):
        updated = sync.DriveFile(BASELINE.id, BASELINE.name, BASELINE.mime,
                                 BASELINE_MS + 1000, BASELINE.size)
        self.assertEqual(sync.newest_file([PREVIEW, updated], STATE), updated)

    def test_unique_newer_mp4_is_selected(self):
        next_file = sync.DriveFile("new-file-id", "NangHan-final.mp4", "video/mp4",
                                   BASELINE_MS + 1000, 100_000_000)
        self.assertEqual(sync.newest_file([PREVIEW, BASELINE, next_file], STATE), next_file)

    def test_tied_newest_timestamp_requires_review(self):
        first = sync.DriveFile("first-file-id", "one.mp4", "video/mp4", BASELINE_MS + 1000, 100)
        second = sync.DriveFile("second-file-id", "two.mp4", "video/mp4", BASELINE_MS + 1000, 100)
        with self.assertRaisesRegex(sync.SyncError, "Multiple new videos"):
            sync.newest_file([PREVIEW, first, second], STATE)

    def test_newest_non_mp4_video_requires_review(self):
        mov = sync.DriveFile("new-mov-file", "final.mov", "video/quicktime", BASELINE_MS + 1000, 100)
        with self.assertRaisesRegex(sync.SyncError, "not MP4"):
            sync.newest_file([PREVIEW, mov], STATE)

    def test_only_feature_video_references_change(self):
        replacements = sync.page_replacements(1, 2)
        home_before = sync.PAGES[0].read_text(encoding="utf-8")
        home_after = replacements[sync.PAGES[0]].decode("utf-8")
        self.assertIn('assets/story-intro-v2.mp4', home_after)
        self.assertIn('assets/story-intro-poster-v2.jpg', home_after)
        self.assertEqual(home_before.split('<video class="hero-video"', 1)[1].split('</video>', 1)[0],
                         home_after.split('<video class="hero-video"', 1)[1].split('</video>', 1)[0])

    def test_page_edit_during_transcode_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assets").mkdir()
            pages = (root / "index.html", root / "story.html")
            player = ('<video class="feature-video" controls '
                      'poster="assets/story-intro-poster-v1.jpg">'
                      '<source src="assets/story-intro-v1.mp4" type="video/mp4" /></video>')
            for page in pages:
                page.write_text(player, encoding="utf-8")
            state = copy.deepcopy(STATE)
            candidate = sync.DriveFile("new-final-file", "Final.mp4", "video/mp4",
                                       BASELINE_MS + 1000, 100)

            def fake_download(_candidate, destination):
                destination.write_bytes(b"new source")
                return "b" * 64

            def fake_transcode(_source, target, poster, _width, _height, _duration):
                target.write_bytes(b"new video")
                poster.write_bytes(b"new poster")
                pages[0].write_text(player + "<!-- user edit -->", encoding="utf-8")

            with patch.multiple(sync, ROOT=root, PAGES=pages, download=fake_download,
                                probe=lambda _: (1888, 1080, 68.0, {}), transcode=fake_transcode):
                with self.assertRaisesRegex(sync.SyncError, "changed during video preparation"):
                    sync.prepare(candidate, state, {PREVIEW.id, BASELINE.id, candidate.id})
            self.assertEqual(pages[0].read_text(encoding="utf-8"), player + "<!-- user edit -->")
            self.assertEqual(pages[1].read_text(encoding="utf-8"), player)
            self.assertFalse((root / "assets" / "story-intro-v2.mp4").exists())
            self.assertEqual(state, STATE)

    def test_success_marks_all_observed_files_as_known(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "assets").mkdir()
            pages = (root / "index.html", root / "story.html")
            player = ('<video class="feature-video" controls '
                      'poster="assets/story-intro-poster-v1.jpg">'
                      '<source src="assets/story-intro-v1.mp4" type="video/mp4" /></video>')
            for page in pages:
                page.write_text(player, encoding="utf-8")
            state_path = root / "state.json"
            state_path.write_text(json.dumps(STATE), encoding="utf-8")
            state = copy.deepcopy(STATE)
            older_new = "older-new-file-id"
            candidate = sync.DriveFile("new-final-file", "Final.mp4", "video/mp4",
                                       BASELINE_MS + 1000, 100)

            def fake_download(_candidate, destination):
                destination.write_bytes(b"new source")
                return "b" * 64

            def fake_transcode(_source, target, poster, _width, _height, _duration):
                target.write_bytes(b"new video")
                poster.write_bytes(b"new poster")

            observed_ids = {PREVIEW.id, BASELINE.id, older_new, candidate.id}
            with patch.multiple(sync, ROOT=root, PAGES=pages, STATE_PATH=state_path,
                                download=fake_download, probe=lambda _: (1888, 1080, 68.0, {}),
                                transcode=fake_transcode):
                result = sync.prepare(candidate, state, observed_ids)
            self.assertEqual(result["status"], "prepared")
            self.assertEqual(set(state["known_file_ids"]), observed_ids)
            self.assertEqual(json.loads(state_path.read_text())["known_file_ids"], sorted(observed_ids))
            self.assertTrue(all("story-intro-v2.mp4" in page.read_text() for page in pages))


if __name__ == "__main__":
    unittest.main()
