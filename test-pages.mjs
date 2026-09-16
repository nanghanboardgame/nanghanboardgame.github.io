import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages = ['index.html', 'story.html', 'rules.html', 'product.html'];
const source = Object.fromEntries(pages.map((page) => [page, readFileSync(page, 'utf8')]));

for (const page of pages) {
  assert.match(source[page], /<script type="module" src="animations\.js"><\/script>/, `${page} loads shared animations`);
}

assert.match(source['index.html'], /class="character-path"/, 'home connects the character and navigation path');
assert.equal((source['index.html'].match(/class="directory-link"/g) ?? []).length, 3, 'home has three destination links');
assert.match(source['index.html'], /href="story\.html"/);
assert.match(source['index.html'], /href="rules\.html"/);
assert.match(source['index.html'], /href="product\.html"/);

console.log('Page structure checks passed.');
