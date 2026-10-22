import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const module = { exports: {} };
new Function('module', 'exports', ts.transpileModule(readFileSync(new URL('../src/games/jewel/engine.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(module, module.exports);
const { createGame, cloneGame, adjacent, findMatches, findMove, swapGems, useHammer, shuffleGame, tickGame, checkStatus, STAGES } = module.exports;

test('100 seeded starting boards have 64 distinct gems, no free matches, and a valid move', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const game = createGame('classic', 1, seed);
    assert.equal(game.board.length, 64); assert.equal(new Set(game.board.map(g => g.id)).size, 64);
    assert.equal(findMatches(game.board).length, 0); assert.ok(findMove(game.board));
    assert.deepEqual(game, createGame('classic', 1, seed));
  }
});
test('invalid swaps reject row wrap, diagonals and unmatched pairs without spending moves', () => {
  const game = createGame('classic', 1, 44), snapshot = JSON.stringify(game);
  assert.equal(adjacent(7, 8), false); assert.equal(adjacent(0, 9), false);
  assert.equal(swapGems(game, 7, 8).valid, false); assert.equal(swapGems(game, 0, 9).valid, false);
  let found = false;
  for (let i = 0; i < 63 && !found; i++) if (adjacent(i, i + 1) && !swapGems(game, i, i + 1).valid) found = true;
  assert.ok(found); assert.equal(JSON.stringify(game), snapshot);
});
test('full 30-turn games resolve cascades, score, refill, and finish with no dead board', () => {
  for (let seed = 1; seed <= 25; seed++) {
    let game = createGame('classic', 1, seed);
    for (let turn = 0; turn < 30; turn++) {
      const before = JSON.stringify(game), move = findMove(game.board);
      assert.ok(move);
      const result = swapGems(game, ...move);
      assert.ok(result.valid); assert.equal(JSON.stringify(game), before);
      assert.ok(result.game.score > game.score); assert.ok(result.frames.length > 0);
      game = result.game;
      assert.equal(game.moves, 29 - turn); assert.equal(findMatches(game.board).length, 0);
      assert.equal(new Set(game.board.map(g => g.id)).size, 64); assert.ok(findMove(game.board));
    }
    assert.equal(game.status, 'lost'); assert.equal(swapGems(game, ...findMove(game.board)).valid, false);
  }
});
test('four and five in a row create line and rainbow gems; intersections create bombs', () => {
  const board = createGame('classic', 1, 77).board;
  const blank = () => board.map((g, i) => ({ ...g, color: (Math.floor(i / 8) * 2 + i % 8) % 6 }));
  for (const [length, special] of [[4, 'row'], [5, 'rainbow']]) {
    const game = createGame('classic', 1, 77); game.board = blank();
    for (let i = 0; i < length; i++) game.board[24 + i].color = 0;
    game.board[26].color = 1; game.board[18].color = 0;
    const result = swapGems(game, 18, 26);
    assert.ok(result.valid); assert.ok(result.game.board.some(g => g.special === special), special);
  }
  const game = createGame('classic', 1, 77); game.board = blank();
  for (const i of [25, 27, 28, 18, 34]) game.board[i].color = 0;
  game.board[26].color = 1;
  const result = swapGems(game, 25, 26);
  assert.ok(result.valid); assert.ok(result.frames.some(f => f.cleared.includes(27)));
  assert.ok(result.game.board.some(g => g.special === 'bomb'));
});
test('two neighboring special gems trigger each other; hammer cannot be spent below zero', () => {
  const game = createGame('classic', 1, 123);
  game.board[27].special = 'row'; game.board[28].special = 'column';
  const result = swapGems(game, 27, 28);
  assert.ok(result.valid); assert.ok(result.frames[0].cleared.length >= 15);
  let next = useHammer(game, 0).game; assert.equal(next.moves, 30); assert.equal(next.hammer, 1);
  next = useHammer(next, 10).game; assert.equal(next.hammer, 0); assert.equal(useHammer(next, 20).valid, false);
});
test('rainbows can swap with any neighbor and clear the neighbor color', () => {
  const game = createGame('classic', 1, 43); game.board[27].special = 'rainbow';
  const color = game.board[28].color, indices = game.board.flatMap((g, i) => g.color === color ? [i] : []);
  const result = swapGems(game, 27, 28); assert.ok(result.valid);
  for (const i of indices) assert.ok(result.frames[0].cleared.includes(i));
});
test('shuffle is limited, preserves score and leaves a playable board; undo snapshots are deep', () => {
  let game = createGame('classic', 1, 12); const copy = cloneGame(game);
  game = shuffleGame(game); game = shuffleGame(game);
  assert.equal(game.shuffles, 0); assert.equal(shuffleGame(game), game);
  assert.equal(findMatches(game.board).length, 0); assert.ok(findMove(game.board)); assert.equal(game.score, 0);
  game.board[0].color = (copy.board[0].color + 1) % 6; assert.notEqual(game.board[0].color, copy.board[0].color);
});
test('mission victory takes priority over the final move and time attack ends only on timeout', () => {
  const game = createGame('mission', 1, 1); game.moves = 0; game.score = STAGES[0].target;
  game.collected[STAGES[0].color] = STAGES[0].gems; checkStatus(game); assert.equal(game.status, 'won');
  const timed = createGame('timeAttack', 1, 2); const result = swapGems(timed, ...findMove(timed.board));
  assert.equal(result.game.moves, timed.moves); assert.equal(tickGame(result.game, 100).status, 'lost');
  assert.equal(tickGame(result.game, -100).time, 90); assert.equal(tickGame(createGame(), 100).time, 90);
});
