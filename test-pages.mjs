import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = ['index.html', 'story.html', 'rules.html', 'product.html'];
const source = Object.fromEntries(pages.map((page) => [page, readFileSync(page, 'utf8')]));
const styles = readFileSync('styles.css', 'utf8');
const mobileStyles = styles.slice(styles.indexOf('@media (max-width: 820px)'), styles.indexOf('@media (max-width: 430px)'));
const animations = readFileSync('animations.js', 'utf8');
const game = readFileSync('game.mjs', 'utf8');
const favicon = readFileSync('favicon.js', 'utf8');

for (const page of pages) {
  assert.match(source[page], /<link rel="stylesheet" href="styles\.css\?v=5" \/>/, `${page} loads the cache-busted responsive styles`);
  assert.match(source[page], /<script type="module" src="animations\.js\?v=4"><\/script>/, `${page} loads the cache-busted local animations`);
  assert.match(source[page], /<link rel="shortcut icon" type="image\/x-icon" href="favicon\.ico\?v=2" sizes="any" \/>/, `${page} has a root ICO fallback`);
  assert.match(source[page], /<link rel="icon" type="image\/png" href="assets\/favicon-open\.png\?v=2" sizes="128x128" data-animated-favicon \/>/, `${page} has a cache-busted animated favicon`);
  assert.match(source[page], /<script src="favicon\.js" defer><\/script>/, `${page} loads the alternating favicon`);
  assert.match(source[page], /assets\/prototype\/brand-wordmark\.png/, `${page} uses the supplied wordmark`);
  assert.match(source[page], /assets\/prototype\/brand-mark-red\.png/, `${page} uses the supplied footer mark`);
  assert.match(source[page], /class="footer-wordmark"/, `${page} footer uses the supplied wordmark`);
  assert.match(source[page], /Lấy cảm hứng từ truyền thuyết Nàng Han/, `${page} footer follows the supplied brand copy layout`);
  assert.match(source[page], /class="nav-cta"[^>]*>Trải nghiệm ngay!<\/a>/, `${page} has the outlined experience CTA`);
}

assert.match(source['story.html'], /class="story-hero"/, 'story opens with the supplied framed hero composition');
assert.match(source['story.html'], /Bạn chiến đấu[\s\S]*vì điều gì\?/, 'story hero keeps the wireframe question');
assert.match(source['story.html'], /class="[^"]*story-legend-layout[^"]*"/, 'story uses the supplied editorial legend layout');
assert.match(source['story.html'], /Truyền thuyết Nàng Han/, 'story uses the supplied legend title');
assert.match(source['story.html'], /Quẵm tỗ Nãng Han/, 'story keeps the supplied Thai title');
assert.match(source['story.html'], /NNƯT\. Cầm Văn Vui/, 'story credits the supplied source document');
assert.match(source['story.html'], /assets\/prototype\/product-board-scene\.png/, 'story closes with the supplied board scene');

assert.match(source['rules.html'], /class="rules-overview"/, 'rules start with a board overview from the wireframe');
assert.match(source['rules.html'], /assets\/prototype\/team-allies\.png/, 'rules show the supplied Nàng Han faction panel');
assert.match(source['rules.html'], /assets\/prototype\/team-opponents\.png/, 'rules show the supplied opposing faction panel');
assert.match(source['rules.html'], /class="setup-steps"/, 'rules explain the three setup steps before play');
assert.match(source['rules.html'], /class="rules-demo"/, 'rules keep the live demo in the wireframe flow');
assert.doesNotMatch(source['rules.html'], /team-strip|data-player-card/, 'live demo does not repeat the faction overview');
assert.equal((source['rules.html'].match(/data-game-board/g) ?? []).length, 1, 'rules keep exactly one playable board');
assert.equal((source['rules.html'].match(/class="map-note /g) ?? []).length, 12, 'board overview keeps all twelve wireframe callouts');
assert.equal((source['rules.html'].match(/class="map-marker /g) ?? []).length, 12, 'each wireframe callout highlights its board cell');
assert.match(styles, /\.rules-map figcaption \{ position: absolute;/, 'desktop board callouts are positioned around the board');
assert.match(styles, /\.map-note \{ position: static;/, 'mobile board callouts return to document flow');

assert.match(favicon, /\[data-animated-favicon\]/, 'favicon animation targets only the animated PNG link');
assert.match(favicon, /favicon-open\.png\?v=2/, 'favicon animation includes a cache-busted open-eye frame');
assert.match(favicon, /favicon-closed\.png\?v=2/, 'favicon animation includes a cache-busted closed-eye frame');
assert.match(favicon, /prefers-reduced-motion/, 'favicon animation respects reduced-motion preferences');

assert.match(source['index.html'], /class="character-path"/, 'home connects the character and navigation path');
assert.equal((source['index.html'].match(/class="directory-link"/g) ?? []).length, 3, 'home has three destination links');
assert.equal((source['index.html'].match(/class="banner-button"/g) ?? []).length, 2, 'home banner has two destination actions');
assert.match(source['index.html'], /Khám phá câu chuyện/, 'home banner links to the story');
assert.match(source['index.html'], /Trải nghiệm sản phẩm/, 'home banner links to the product');
assert.match(source['index.html'], /href="story\.html"/);
assert.match(source['index.html'], /href="rules\.html"/);
assert.match(source['index.html'], /href="product\.html"/);
assert.doesNotMatch(source['index.html'], /↗/, 'home branches contain text without arrow icons');
assert.match(source['index.html'], /assets\/prototype\/character-white\.png/, 'home uses the supplied white character');
assert.match(source['index.html'], /assets\/prototype\/character-navy\.png/, 'home uses the supplied navy character');
assert.match(source['index.html'], /assets\/prototype\/brand-mark-yellow\.png/, 'home uses the supplied product mark');
assert.match(source['index.html'], /Bạn đã sẵn sàng bước vào hành trình/, 'home video follows the supplied wireframe heading');
assert.match(styles, /assets\/prototype\/directory-frame\.png/, 'home uses the supplied directory frame');
assert.match(styles, /assets\/prototype\/branch-button\.png/, 'home uses the supplied button motif on each branch');
assert.match(styles, /assets\/prototype\/video-frame\.png/, 'home uses the supplied video frame');
assert.match(styles, /assets\/prototype\/product-frame\.png/, 'home uses the supplied product frame');
assert.match(styles, /\.home-directory::before/, 'home directory draws a central spine');
assert.match(styles, /\.home-directory\s*\{[^}]*width:\s*100vw/, 'home directory spans the viewport');
assert.match(styles, /\.directory-link:nth-child\(odd\)/, 'odd branches sit on one side');
assert.match(styles, /\.directory-link:nth-child\(even\)/, 'even branches sit on the other side');
assert.match(mobileStyles, /\.story-legend-layout \{ grid-template-columns: 1fr; \}/, 'story content becomes a single readable mobile column');
assert.match(mobileStyles, /\.faction-panels, \.setup-steps \{ grid-template-columns: 1fr; \}/, 'rules factions and setup steps stack on mobile');
assert.match(animations, /\[data-animated-button\]/, 'anime.js animates the shared CTA buttons');
assert.match(animations, /from '\.\/assets\/vendor\/anime\.esm\.min\.js'/, 'anime.js is served locally so CTA animation is not blocked by the browser');
assert.doesNotMatch(animations, /main > section:not\(:first-child\), \.site-footer/, 'footer stays inside the mobile scroll range');

assert.match(source['rules.html'], /cờ cá ngựa/i, 'rules explain the familiar horse-racing foundation');
assert.match(source['rules.html'], /ô đặc biệt/i, 'rules explain special board spaces');
assert.match(source['rules.html'], /rút một thẻ/i, 'rules connect special spaces to the card deck');
assert.equal((source['rules.html'].match(/class="game-card"/g) ?? []).length, 10, 'rules show ten sample action cards');
assert.equal((source['rules.html'].match(/data-card-toggle/g) ?? []).length, 10, 'each action card can be opened');
assert.match(source['rules.html'], /data-card-detail/, 'cards include an expandable action description');
assert.match(styles, /\.game-card\s*\{[^}]*aspect-ratio:\s*709\s*\/\s*1063/, 'action cards share the source card ratio');
assert.match(styles, /\.game-console\s*\{[^}]*transform:\s*none\s*!important/, 'mobile action bar is not trapped by animation transforms');
assert.match(source['rules.html'], /data-game-board/, 'rules include the playable horse-racing board');
assert.equal((source['rules.html'].match(/data-demo-action=/g) ?? []).length, 6, 'rules expose six guided demo actions');
assert.match(source['rules.html'], /data-demo-action="release"/, 'rules include the release action');
assert.match(source['rules.html'], /data-demo-action="special"/, 'rules include the special-cell action');
assert.match(source['rules.html'], /data-demo-action="capture"/, 'rules include the capture action');
assert.match(source['rules.html'], /Bàn chơi thử/, 'rules use client-friendly demo language');
assert.match(source['rules.html'], /chạm vào bàn cờ để mở các nút thao tác/, 'mobile guidance explains board controls');
assert.match(game, /toggleMobileActions/, 'mobile board can toggle its action controls');
assert.match(game, /mobile-board-trigger/, 'mobile board has an action trigger');
assert.match(source['rules.html'], /<script type="module" src="game\.mjs\?v=3"><\/script>/, 'rules load the cache-busted game engine');

console.log('Page structure checks passed.');
