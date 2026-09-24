import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BOARD_POINTS, DEMO_ACTIONS, DEMO_PATH, getDemoAction } from './game.mjs';

const gameSource = await readFile(new URL('./game.mjs', import.meta.url), 'utf8');
const styleSource = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
assert.doesNotMatch(gameSource, /board\.dataset\.demoAction/, 'board state must not masquerade as an action button');
assert.doesNotMatch(gameSource, /playerCards|data-player-card/, 'the demo does not repeat the faction cards');

assert.deepEqual(
  DEMO_ACTIONS.map(({ id }) => id),
  ['release', 'move', 'special', 'capture', 'finish', 'reset'],
  'the guided demo exposes six deterministic actions',
);

const release = getDemoAction('release');
assert.equal(release.dice, 6, 'releasing a piece always demonstrates a six');
assert.deepEqual(BOARD_POINTS.hanYard, [80, 80], 'the rotated board places Nàng Han in the lower-right yard');
assert.deepEqual(release.start, BOARD_POINTS.hanYard, 'Nàng Han starts in her lower-right yard');
assert.deepEqual(release.end, DEMO_PATH[0], 'a released piece lands on the first visible track cell');
assert.deepEqual(release.end, [63.5, 95.3], 'the release cell follows the rotated Nàng Han lane');
assert.match(release.status, /Nàng Han/, 'Nàng Han is the main moving piece');
assert.match(styleSource, /\.art-board\s*>\s*img\s*\{[^}]*transform:\s*rotate\(180deg\)/, 'the playable board faces the Nàng Han player');

const move = getDemoAction('move');
assert.deepEqual(move.start, DEMO_PATH[0]);
assert.deepEqual(move.end, DEMO_PATH[3], 'the move demo advances through visible track cells');

const special = getDemoAction('special');
assert.deepEqual(special.end, BOARD_POINTS.special, 'the special demo lands on the flower cell');
assert.equal(special.card.id, 'forward', 'the special cell draws the two-step card');
assert.deepEqual(special.cardEnd, DEMO_PATH[4], 'the drawn card moves the piece two more visible cells');

const capture = getDemoAction('capture');
assert.deepEqual(capture.end, capture.opponent.start, 'the attacking piece lands on the opponent');
assert.deepEqual(capture.opponent.end, BOARD_POINTS.rivalYard, 'the captured Quân địch piece returns to its upper-right yard');
assert.match(capture.status, /Nàng Han.*Quân địch/, 'Nàng Han captures a piece from the opposing faction');
assert.match(gameSource, /const hanPiece = makePiece\('magenta', 'Quân của đội Nàng Han'\)/, 'the main piece uses the Nàng Han artwork');
assert.match(gameSource, /const rivalPiece = makePiece\('green', 'Quân của đội Quân địch'\)/, 'the captured piece uses the Quân địch artwork');
assert.match(gameSource, /showAt\(hanPiece, action\.start\)/, 'Nàng Han performs the guided actions');
assert.match(gameSource, /showAt\(rivalPiece, action\.opponent\.start\)/, 'the opposing piece is placed as the capture target');
assert.doesNotMatch(gameSource, /Quân Lục/, 'the allied green piece is not used as the captured opponent');

const finish = getDemoAction('finish');
assert.equal(finish.dice, 5, 'the finish demo uses the exact roll needed for the five-cell home lane');
assert.deepEqual(finish.start, BOARD_POINTS.finishApproach, 'the piece starts immediately before the home lane');
assert.deepEqual(finish.end, BOARD_POINTS.finishGoal, 'the piece ends on the flower cell at the end of the home lane');
assert.deepEqual(finish.path.at(-1), BOARD_POINTS.finishGoal, 'the finish path never enters the board center');
assert.notDeepEqual(finish.end, [50, 50], 'the finish demo must not place the piece on the center star');
assert.equal(getDemoAction('reset').status, 'Đã đặt lại hành động. Chọn một tình huống để xem lại.', 'reset uses player-facing language');
assert.throws(() => getDemoAction('unknown'), /Không có action demo/, 'unknown demo actions are rejected');

console.log('Guided demo checks passed.');
