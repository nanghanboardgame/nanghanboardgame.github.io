import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BOARD_POINTS, DEMO_ACTIONS, DEMO_PATH, getDemoAction } from './game.mjs';

const gameSource = await readFile(new URL('./game.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(gameSource, /board\.dataset\.demoAction/, 'board state must not masquerade as an action button');
assert.doesNotMatch(gameSource, /playerCards|data-player-card/, 'the demo does not repeat the faction cards');

assert.deepEqual(
  DEMO_ACTIONS.map(({ id }) => id),
  ['release', 'move', 'special', 'capture', 'finish', 'reset'],
  'the guided demo exposes six deterministic actions',
);

const release = getDemoAction('release');
assert.equal(release.dice, 6, 'releasing a piece always demonstrates a six');
assert.deepEqual(release.end, DEMO_PATH[0], 'a released piece lands on the first visible track cell');

const move = getDemoAction('move');
assert.deepEqual(move.start, DEMO_PATH[0]);
assert.deepEqual(move.end, DEMO_PATH[3], 'the move demo advances through visible track cells');

const special = getDemoAction('special');
assert.deepEqual(special.end, BOARD_POINTS.special, 'the special demo lands on the flower cell');
assert.equal(special.card.id, 'forward', 'the special cell draws the two-step card');
assert.deepEqual(special.cardEnd, DEMO_PATH[4], 'the drawn card moves the piece two more visible cells');

const capture = getDemoAction('capture');
assert.deepEqual(capture.end, capture.opponent.start, 'the attacking piece lands on the opponent');
assert.deepEqual(capture.opponent.end, BOARD_POINTS.greenYard, 'the captured piece returns to its yard');

assert.deepEqual(getDemoAction('finish').end, BOARD_POINTS.goal, 'the finish demo ends at the board center');
assert.equal(getDemoAction('reset').status, 'Đã đặt lại hành động. Chọn một tình huống để xem lại.', 'reset uses player-facing language');
assert.throws(() => getDemoAction('unknown'), /Không có action demo/, 'unknown demo actions are rejected');

console.log('Guided demo checks passed.');
