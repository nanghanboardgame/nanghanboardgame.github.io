import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = ['index.html', 'story.html', 'rules.html', 'product.html'];
const source = Object.fromEntries(pages.map((page) => [page, readFileSync(page, 'utf8')]));
const styles = readFileSync('styles.css', 'utf8');
const game = readFileSync('game.mjs', 'utf8');

for (const page of pages) {
  assert.match(source[page], /<script type="module" src="animations\.js"><\/script>/, `${page} loads shared animations`);
}

assert.match(source['index.html'], /class="character-path"/, 'home connects the character and navigation path');
assert.equal((source['index.html'].match(/class="directory-link"/g) ?? []).length, 3, 'home has three destination links');
assert.match(source['index.html'], /href="story\.html"/);
assert.match(source['index.html'], /href="rules\.html"/);
assert.match(source['index.html'], /href="product\.html"/);
assert.doesNotMatch(source['index.html'], /↗/, 'home branches contain text without arrow icons');
assert.match(styles, /\.home-directory::before/, 'home directory draws a central spine');
assert.match(styles, /\.directory-link:nth-child\(odd\)/, 'odd branches sit on one side');
assert.match(styles, /\.directory-link:nth-child\(even\)/, 'even branches sit on the other side');

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
assert.match(source['rules.html'], /Thử cách chơi/, 'rules use client-friendly demo language');
assert.match(source['rules.html'], /chạm vào bàn cờ để mở các nút thao tác/, 'mobile guidance explains board controls');
assert.match(game, /show-mobile-actions/, 'mobile board can reveal its action controls');
assert.match(game, /mobile-board-trigger/, 'mobile board has an action trigger');
assert.match(source['rules.html'], /<script type="module" src="game\.mjs"><\/script>/, 'rules load the game engine');

console.log('Page structure checks passed.');
