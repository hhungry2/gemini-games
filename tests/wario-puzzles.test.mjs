import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush, rushSpeed } = load('engine');
const { PUZZLE_GAMES, createPuzzleState, puzzleCard, MAZE_X, MAZE_Y, MAZE_CELL } = load('puzzleGames');
const dt = 1 / 60;

function rng(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function ready(id, seed = 723, level = 1) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id);
  state.level = level;
  state.duration = 5 / rushSpeed(level);
  state.game.extra = createPuzzleState(id, level, rng(seed));
  for (let i = 0; i < 90 && state.phase === 'brief'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  assert.equal(state.game.extra.pack, 'puzzle');
  return { state, input };
}
function clickCard(state, input, index) {
  const p = state.game.extra, grid = p.id === 'odd' || p.id === 'memory';
  const bounds = puzzleCard(index, grid ? 6 : p.id === 'order' ? p.choices.length : 3, grid);
  input.pointerX = bounds.x + bounds.width / 2; input.pointerY = bounds.y + bounds.height / 2;
  input.pointerPressed = true; input.action = true;
}
function clickMaze(input, target) {
  input.pointerPressed = true; input.action = true;
  input.pointerX = MAZE_X + (target % 4 + 0.5) * MAZE_CELL;
  input.pointerY = MAZE_Y + (Math.floor(target / 4) + 0.5) * MAZE_CELL;
}
function shortestPath(p) {
  const queue = [[p.position]], seen = new Set([p.position]);
  while (queue.length) {
    const path = queue.shift(), current = path.at(-1);
    if (current === p.goal) return path;
    for (const cell of p.route) {
      if (seen.has(cell) || Math.abs(current % 4 - cell % 4) + Math.abs(Math.floor(current / 4) - Math.floor(cell / 4)) !== 1) continue;
      seen.add(cell); queue.push([...path, cell]);
    }
  }
  throw new Error('generated maze has no route to goal');
}
function answerIndex(p) {
  if (p.id === 'odd' || p.id === 'memory') return p.answer;
  if (p.id === 'order') return p.choices.indexOf(p.sorted[p.progress]);
  return p.choices.indexOf(p.answer);
}
function solve(state, input, pointer) {
  const p = state.game.extra;
  if (p.id === 'memory' && state.game.time < p.revealUntil) return;
  if (p.id === 'maze') {
    const next = shortestPath(p)[1];
    if (pointer) clickMaze(input, next);
    else if (next === p.position + 1) input.rightPressed = true;
    else if (next === p.position - 1) input.leftPressed = true;
    else if (next === p.position - 4) input.upPressed = true;
    else input.downPressed = true;
    return;
  }
  const answer = answerIndex(p);
  if (pointer) clickCard(state, input, answer);
  else if ((p.id === 'odd' || p.id === 'memory') && Math.floor(p.selected / 3) !== Math.floor(answer / 3)) input.downPressed = true;
  else if (p.selected !== answer) input.rightPressed = true;
  else input.action = true;
}

for (const { id } of PUZZLE_GAMES) {
  test(`${id}: pointer and keyboard both win seeded questions at every difficulty tier`, () => {
    for (const pointer of [true, false]) for (const level of [1, 4, 8]) for (let seed = 1; seed <= 12; seed++) {
      const { state, input } = ready(id, seed, level);
      for (let frame = 0; state.phase === 'play' && frame < 360; frame++) { solve(state, input, pointer); stepRush(state, input, dt); }
      assert.equal(state.result, 'success', `${id}, level ${level}, seed ${seed}, ${pointer ? 'pointer' : 'keyboard'}: ${state.game.reason}`);
      assert.equal(state.score, 1);
    }
  });

  test(`${id}: wrong choices fail immediately and practice keeps all lives`, () => {
    const { state, input } = ready(id);
    const p = state.game.extra;
    if (id === 'memory') while (state.game.time < p.revealUntil) stepRush(state, input, dt);
    if (id === 'maze') {
      // Traverse safely until the character has a neighboring wall to hit.
      let wall;
      for (const target of shortestPath(p).slice(1)) {
        wall = Array.from({ length: 12 }, (_, i) => i).find(cell => !p.route.includes(cell) && Math.abs(cell % 4 - p.position % 4) + Math.abs(Math.floor(cell / 4) - Math.floor(p.position / 4)) === 1);
        if (wall !== undefined) break;
        clickMaze(input, target); stepRush(state, input, dt);
      }
      assert.notEqual(wall, undefined);
      clickMaze(input, wall);
    } else {
      const amount = id === 'odd' || id === 'memory' ? 6 : id === 'order' ? p.choices.length : 3;
      clickCard(state, input, (answerIndex(p) + 1) % amount);
    }
    stepRush(state, input, dt);
    assert.equal(state.result, 'failure'); assert.equal(state.phase, 'result'); assert.equal(state.lives, 4);
  });

  test(`${id}: a tap outside the board never submits the keyboard focus`, () => {
    const { state, input } = ready(id);
    if (id === 'memory') while (state.game.time < state.game.extra.revealUntil) stepRush(state, input, dt);
    input.pointerPressed = true; input.action = true; input.pointerX = 20; input.pointerY = 105;
    stepRush(state, input, dt);
    assert.equal(state.phase, 'play'); assert.equal(state.result, null);
  });

  test(`${id}: pause freezes the question, consumes pending input, and resumes cleanly`, () => {
    const { state, input } = ready(id, 15, 8), frozen = JSON.stringify(state.game), elapsed = state.elapsed;
    pauseRush(state, input, true);
    for (let frame = 0; frame < 120; frame++) { input.action = true; input.pointerPressed = true; stepRush(state, input, dt); }
    assert.equal(JSON.stringify(state.game), frozen); assert.equal(state.elapsed, elapsed);
    pauseRush(state, input, false);
    for (let frame = 0; state.phase === 'play' && frame < 360; frame++) { solve(state, input, true); stepRush(state, input, dt); }
    assert.equal(state.result, 'success');
  });

  test(`${id}: idle players time out, then receive a clean new practice round`, () => {
    const { state, input } = ready(id);
    for (let frame = 0; frame < 330 && state.phase === 'play'; frame++) stepRush(state, input, dt);
    assert.equal(state.phase, 'result'); assert.equal(state.result, 'failure');
    const oldState = state.game.extra;
    for (let frame = 0; frame < 90 && state.phase === 'result'; frame++) stepRush(state, input, dt);
    assert.equal(state.phase, 'brief'); assert.equal(state.game.extra.id, id); assert.notEqual(state.game.extra, oldState);
    assert.equal(state.game.time, 0); assert.equal(state.game.result, null);
  });
}

test('question generators always provide exactly one correct answer and feasible mazes', () => {
  for (let seed = 0; seed < 250; seed++) for (const level of [1, 8]) for (const { id } of PUZZLE_GAMES) {
    const p = createPuzzleState(id, level, rng(seed));
    assert.equal(p.id, id);
    if ('choices' in p) {
      assert.equal(new Set(p.choices).size, p.choices.length);
      if ('answer' in p) assert.equal(p.choices.filter(n => n === p.answer).length, 1);
    }
    if (id === 'math') assert.equal(p.answer, p.subtract ? p.a - p.b : p.a + p.b);
    if (id === 'count') assert.equal(p.sky.reduce((sum, n) => sum + n, 0), p.answer);
    if (id === 'ink') { assert.notEqual(p.word, p.ink); assert.equal(p.answer, p.ink); }
    if (id === 'largest') { assert.equal(p.answer, Math.max(...p.choices)); assert.equal(p.sizes[p.choices.indexOf(p.answer)], Math.min(...p.sizes)); }
    if (id === 'maze') { assert.ok(shortestPath(p).length <= 8); assert.equal(p.position, 8); assert.equal(p.goal, 3); }
    if (id === 'order') { assert.deepEqual([...p.choices].sort((a, b) => a - b), p.sorted); assert.equal(p.progress, 0); }
  }
});

test('memory gives a readable reveal interval and ignores premature pointer and keyboard guesses', () => {
  for (const pointer of [true, false]) {
    const { state, input } = ready('memory', 19, 8), p = state.game.extra;
    while (state.game.time + dt * rushSpeed(state.level) < p.revealUntil) {
      if (pointer) clickCard(state, input, p.answer); else { p.selected = p.answer; input.action = true; }
      stepRush(state, input, dt);
      assert.equal(state.phase, 'play');
    }
    while (state.game.time < p.revealUntil) stepRush(state, input, dt);
    clickCard(state, input, p.answer); stepRush(state, input, dt);
    assert.equal(state.result, 'success');
  }
});

test('maze rejects distant taps and border presses without teleporting or losing a life', () => {
  const { state, input } = ready('maze');
  const p = state.game.extra;
  clickMaze(input, p.goal); stepRush(state, input, dt); assert.equal(p.position, 8); assert.equal(state.result, null);
  input.leftPressed = true; stepRush(state, input, dt); assert.equal(p.position, 8);
  input.downPressed = true; stepRush(state, input, dt); assert.equal(p.position, 8); assert.equal(state.phase, 'play');
});

test('order requires all distinct numbers in sequence and never awards an early win', () => {
  const { state, input } = ready('order', 98, 8), p = state.game.extra;
  assert.equal(p.choices.length, 4);
  for (let index = 0; index < p.sorted.length; index++) {
    clickCard(state, input, p.choices.indexOf(p.sorted[index])); stepRush(state, input, dt);
    assert.equal(p.progress, index + 1);
    assert.equal(state.phase, index === 3 ? 'result' : 'play');
  }
  assert.equal(state.result, 'success'); assert.equal(state.score, 1);
});
