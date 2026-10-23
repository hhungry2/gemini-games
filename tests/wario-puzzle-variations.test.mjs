import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, rushSpeed, pauseRush } = load('engine');
const { PUZZLE_GAMES, createPuzzleState, puzzleCard, MAZE_X, MAZE_Y, MAZE_CELL } = load('puzzleGames');
const { BRAIN_GAMES, createBrainState, brainCard, brainPad, pipeTile } = load('brainGames');
const dt = 1 / 60, definitions = [...PUZZLE_GAMES, ...BRAIN_GAMES];
function rng(seed) { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; }
function create(id, level, seed, variation) { return createPuzzleState(id, level, rng(seed), variation) ?? createBrainState(id, level, rng(seed), variation); }
function ready(id, level, seed, variation) {
  const state = createRushSession(seed), input = emptyRushInput(); startRush(state, input, id, variation);
  state.level = level; state.duration = 5 / rushSpeed(level); state.game.variation = variation; state.game.extra = create(id, level, seed, variation);
  while (state.phase === 'brief') stepRush(state, input, dt);
  return { state, input };
}
function tap(input, b) { Object.assign(input, { pointerPressed: true, action: true, pointerX: b.x + (b.width ?? 0) / 2, pointerY: b.y + (b.height ?? 0) / 2 }); }
function lightSolution(p) {
  const initial = p.lamps.reduce((mask, lit, i) => mask | (lit ? 1 << i : 0), 0);
  for (let combo = 0; combo < 8; combo++) {
    let value = initial; for (let i = 0; i < 3; i++) if (combo & 1 << i) value ^= p.masks[i];
    if (value === 7) return [0, 1, 2].filter(i => combo & 1 << i);
  }
  assert.fail('unreachable lamp target');
}
function weightSolution(weights, target) {
  if (target === 0) return [];
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] <= target) { const next = weightSolution(weights, target - weights[i]); if (next) return [i, ...next]; }
  return null;
}
function mazePath(p) {
  const queue = [[p.position]], seen = new Set([p.position]);
  while (queue.length) { const path = queue.shift(), at = path.at(-1); if (at === p.goal) return path;
    for (const next of p.route) if (!seen.has(next) && Math.abs(at % 4 - next % 4) + Math.abs(Math.floor(at / 4) - Math.floor(next / 4)) === 1) { seen.add(next); queue.push([...path, next]); }
  }
  assert.fail('unreachable maze goal');
}
function select(state, input, index, pointer) {
  assert.ok(index >= 0, `invalid answer in ${state.game.id}`);
  const p = state.game.extra, grid = p.id === 'odd' || p.id === 'memory', tiles = p.id === 'pipe';
  const count = grid ? 6 : tiles ? 4 : p.id === 'order' ? p.choices.length : 3;
  if (pointer) tap(input, p.pack === 'puzzle' ? puzzleCard(index, count, grid) : tiles ? pipeTile(index) : brainCard(index));
  else if ((grid || tiles) && Math.floor(p.selected / (grid ? 3 : 2)) !== Math.floor(index / (grid ? 3 : 2))) input.downPressed = true;
  else if (p.selected !== index) input.rightPressed = true;
  else input.action = true;
}
function solve(state, input, pointer) {
  const p = state.game.extra;
  if ((p.id === 'memory' || p.id === 'echo') && state.game.time < p.revealUntil || p.id === 'cups' && state.game.time < p.pickAfter) return;
  if (p.id === 'maze') {
    const next = mazePath(p)[1];
    if (pointer) tap(input, { x: MAZE_X + (next % 4 + 0.5) * MAZE_CELL, y: MAZE_Y + (Math.floor(next / 4) + 0.5) * MAZE_CELL });
    else input[next === p.position - 1 ? 'leftPressed' : next === p.position + 1 ? 'rightPressed' : next === p.position - 4 ? 'upPressed' : 'downPressed'] = true;
    return;
  }
  if (p.id === 'echo' || p.id === 'mirror') {
    const direction = p.id === 'echo' ? p.expected[p.progress] : p.mapping[p.sequence[p.progress]];
    if (pointer) tap(input, brainPad(direction)); else input[['upPressed', 'rightPressed', 'downPressed', 'leftPressed'][direction]] = true;
    return;
  }
  const answer = p.id === 'pipe' ? p.rotations.findIndex((n, i) => n !== p.target[i]) : p.id === 'lights' ? lightSolution(p)[0] : p.id === 'scale' ? weightSolution(p.weights, p.target - p.total)[0] : p.id === 'odd' || p.id === 'memory' || p.id === 'cups' ? p.answer : p.id === 'order' ? p.choices.indexOf(p.sorted[p.progress]) : p.choices.indexOf(p.answer);
  select(state, input, answer, pointer);
}

for (const { id } of definitions) {
  test(`${id}: all 3 rule variations win through real keyboard and touch at levels 1 and 7`, () => {
    for (const variation of [0, 1, 2]) for (const level of [1, 7]) for (const pointer of [false, true]) for (let seed = 1; seed <= 12; seed++) {
      const { state, input } = ready(id, level, seed, variation);
      for (let frames = 0; state.phase === 'play' && frames < 360; frames++) { solve(state, input, pointer); stepRush(state, input, dt); }
      assert.equal(state.result, 'success', `${id}, variation ${variation}, level ${level}, seed ${seed}, pointer ${pointer}: ${state.game.reason}`);
      assert.equal(state.score, 1);
    }
  });
  test(`${id}: each variation pauses and resumes without losing its rule or revealing an answer`, () => {
    for (const variation of [0, 1, 2]) {
      const { state, input } = ready(id, 7, 25, variation), before = JSON.stringify(state.game);
      pauseRush(state, input, true); for (let i = 0; i < 60; i++) { input.action = true; input.pointerPressed = true; stepRush(state, input, dt); }
      assert.equal(JSON.stringify(state.game), before); pauseRush(state, input, false);
      for (let frames = 0; state.phase === 'play' && frames < 360; frames++) { solve(state, input, true); stepRush(state, input, dt); }
      assert.equal(state.result, 'success');
    }
  });
}

test('each puzzle has 3 named variations and generated answers agree with the displayed rule', () => {
  for (const definition of definitions) {
    assert.equal(definition.variations.length, 3); assert.equal(new Set(definition.variations.map(v => v.name)).size, 3);
    for (let variation = 0; variation < 3; variation++) for (const level of [1, 7]) for (let seed = 0; seed < 80; seed++) {
      const p = create(definition.id, level, seed, variation); assert.equal(p.variation, variation);
      if ('choices' in p) { assert.equal(p.choices.length, new Set(p.choices).size); if ('answer' in p) assert.equal(p.choices.filter(n => n === p.answer).length, 1); }
      if (p.id === 'math') assert.equal(p.answer, p.multiply ? p.a * p.b : p.subtract ? p.a - p.b : p.a + p.b);
      if (p.id === 'count') assert.equal(p.answer, p.sky.filter(n => n === p.countSymbol).length);
      if (p.id === 'ink') { assert.equal(new Set([p.word, p.ink, p.background]).size, 3); assert.equal(p.answer, [p.ink, p.word, p.background][variation]); }
      if (p.id === 'largest') assert.equal(p.answer, [...p.choices].sort((a, b) => a - b)[variation === 0 ? 2 : variation === 1 ? 0 : 1]);
      if (p.id === 'maze') { assert.notEqual(p.position, p.goal); assert.ok(mazePath(p).length <= 8); }
      if (p.id === 'order') assert.deepEqual(p.sorted, [...p.choices].sort((a, b) => variation === 0 ? a - b : variation === 1 ? b - a : b % 2 - a % 2 || a - b));
      if (p.id === 'lights') { assert.ok(!p.lamps.every(Boolean)); assert.ok(lightSolution(p).length >= 1); }
      if (p.id === 'scale') assert.ok(weightSolution(p.weights, p.target).length <= 4);
      if (p.id === 'echo') { assert.deepEqual(p.expected, variation === 1 ? [...p.sequence].reverse() : variation === 2 ? p.sequence.map(n => (n + 1) % 4) : p.sequence); assert.ok(p.revealUntil < 2); if (variation) assert.notDeepEqual(p.expected, p.sequence); }
      if (p.id === 'clock') { assert.equal(p.answer, (p.hour % 12) * 60 + p.minute); if (variation === 1) assert.equal(p.minute % 15, 0); if (variation === 2) { assert.equal(p.minute % 5, 0); assert.notEqual(p.minute % 15, 0); } }
      if (p.id === 'cups') { let position = p.initial; for (const [a, b] of p.swaps) { if (position === a) position = b; else if (position === b) position = a; if (variation === 1) assert.equal(Math.abs(a - b), 1); } assert.equal(position, p.answer); assert.ok(p.pickAfter < 3); }
      if (p.id === 'mirror') assert.deepEqual(p.mapping, [[0, 3, 2, 1], [2, 1, 0, 3], [2, 3, 0, 1]][variation]);
    }
  }
});

test('every pipe variation actually connects its visible inlet, four tiles and outlet', () => {
  const opens = (p, tile, direction) => tile === p.straight ? p.target[tile] === direction % 2 : p.target[tile] === direction || (p.target[tile] + 1) % 4 === direction;
  for (const variation of [0, 1, 2]) for (let seed = 0; seed < 40; seed++) {
    const p = createBrainState('pipe', 7, rng(seed), variation);
    assert.notDeepEqual(p.rotations, p.target); assert.equal(new Set(p.path).size, 4);
    assert.ok(opens(p, p.inlet.tile, p.inlet.direction)); assert.ok(opens(p, p.outlet.tile, p.outlet.direction));
    for (let i = 1; i < p.path.length; i++) {
      const a = p.path[i - 1], b = p.path[i], direction = b === a + 1 ? 1 : b === a - 1 ? 3 : b === a + 2 ? 2 : 0;
      assert.ok(opens(p, a, direction)); assert.ok(opens(p, b, (direction + 2) % 4));
    }
  }
});
