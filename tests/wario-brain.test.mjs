import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush, rushSpeed } = load('engine');
const { BRAIN_GAMES, createBrainState, brainCard, brainPad, pipeTile, LIGHT_MASKS, MIRROR_DIRECTION, SCALE_UNDO } = load('brainGames');
const dt = 1 / 60;
function rng(seed) { let value = seed >>> 0; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }; }
function ready(id, seed = 723, level = 1) {
  const state = createRushSession(seed), input = emptyRushInput(); startRush(state, input, id, 0);
  state.level = level; state.duration = 5 / rushSpeed(level); state.game.extra = createBrainState(id, level, rng(seed));
  while (state.phase === 'brief') stepRush(state, input, dt);
  assert.equal(state.game.extra.pack, 'brain'); return { state, input };
}
function tap(input, b) { input.pointerPressed = true; input.action = true; input.pointerX = b.x + (b.width ?? 0) / 2; input.pointerY = b.y + (b.height ?? 0) / 2; }
function select(state, input, index, pointer) {
  const p = state.game.extra;
  if (pointer) tap(input, p.id === 'pipe' ? pipeTile(index) : brainCard(index));
  else if (p.id === 'pipe' && Math.floor(p.selected / 2) !== Math.floor(index / 2)) input.downPressed = true;
  else if (p.selected !== index) input.rightPressed = true;
  else input.action = true;
}
function pressDirection(input, index, pointer) {
  if (pointer) tap(input, brainPad(index));
  else input[['upPressed', 'rightPressed', 'downPressed', 'leftPressed'][index]] = true;
}
function lightSolution(lamps) {
  const initial = lamps.reduce((mask, lit, i) => mask | (lit ? 1 << i : 0), 0);
  for (let combo = 0; combo < 8; combo++) {
    let mask = initial;
    for (let i = 0; i < 3; i++) if (combo & (1 << i)) mask ^= LIGHT_MASKS[i];
    if (mask === 7) return [0, 1, 2].filter(i => combo & (1 << i));
  }
  throw new Error('unsolvable lights');
}
function weightSolution(weights, remaining) {
  if (remaining === 0) return [];
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] <= remaining) {
    const rest = weightSolution(weights, remaining - weights[i]);
    if (rest) return [i, ...rest];
  }
  return null;
}
function solve(state, input, pointer) {
  const p = state.game.extra;
  if (p.id === 'echo' && state.game.time < p.revealUntil || p.id === 'cups' && state.game.time < p.pickAfter) return;
  if (p.id === 'echo' || p.id === 'mirror') { pressDirection(input, p.id === 'echo' ? p.sequence[p.progress] : MIRROR_DIRECTION[p.sequence[p.progress]], pointer); return; }
  if (p.id === 'pipe') { select(state, input, p.rotations.findIndex((rotation, i) => rotation !== p.target[i]), pointer); return; }
  if (p.id === 'lights') { select(state, input, lightSolution(p.lamps)[0], pointer); return; }
  if (p.id === 'scale') { select(state, input, weightSolution(p.weights, p.target - p.total)[0], pointer); return; }
  select(state, input, p.id === 'cups' ? p.answer : p.choices.indexOf(p.answer), pointer);
}

for (const { id } of BRAIN_GAMES) {
  test(`${id}: keyboard and pointer win generated games across difficulty tiers`, () => {
    for (const pointer of [false, true]) for (const level of [1, 4, 8]) for (let seed = 1; seed <= 16; seed++) {
      const { state, input } = ready(id, seed, level);
      for (let frame = 0; state.phase === 'play' && frame < 360; frame++) { solve(state, input, pointer); stepRush(state, input, dt); }
      assert.equal(state.result, 'success', `${id}, seed ${seed}, level ${level}, pointer ${pointer}: ${state.game.reason}`); assert.equal(state.score, 1);
    }
  });
  test(`${id}: untouched games time out and practice restarts with fresh state`, () => {
    const { state, input } = ready(id), previous = state.game.extra;
    while (state.phase === 'play') stepRush(state, input, dt);
    assert.equal(state.result, 'failure'); assert.equal(state.lives, 4);
    while (state.phase === 'result') stepRush(state, input, dt);
    assert.equal(state.phase, 'brief'); assert.equal(state.game.id, id); assert.equal(state.game.time, 0); assert.notEqual(state.game.extra, previous);
  });
  test(`${id}: pause freezes all state, discards pending inputs, and resumes`, () => {
    const { state, input } = ready(id, 62, 8), before = JSON.stringify(state.game), elapsed = state.elapsed;
    pauseRush(state, input, true);
    for (let i = 0; i < 120; i++) { input.action = true; input.pointerPressed = true; input.upPressed = true; stepRush(state, input, dt); }
    assert.equal(JSON.stringify(state.game), before); assert.equal(state.elapsed, elapsed);
    pauseRush(state, input, false);
    while (state.phase === 'play') { solve(state, input, true); stepRush(state, input, dt); }
    assert.equal(state.result, 'success');
  });
  test(`${id}: taps outside game controls do not submit focus or alter the puzzle`, () => {
    const { state, input } = ready(id);
    while (id === 'echo' && state.game.time < state.game.extra.revealUntil || id === 'cups' && state.game.time < state.game.extra.pickAfter) stepRush(state, input, dt);
    const before = JSON.stringify(state.game.extra); tap(input, { x: 22, y: 105 }); stepRush(state, input, dt);
    assert.equal(state.phase, 'play'); assert.equal(JSON.stringify(state.game.extra), before);
  });
  if (id !== 'pipe' && id !== 'lights') test(`${id}: wrong input fails without awarding score or consuming practice lives`, () => {
    const { state, input } = ready(id), p = state.game.extra;
    while (id === 'echo' && state.game.time < p.revealUntil || id === 'cups' && state.game.time < p.pickAfter) stepRush(state, input, dt);
    if (id === 'echo' || id === 'mirror') pressDirection(input, ((id === 'echo' ? p.sequence[0] : MIRROR_DIRECTION[p.sequence[0]]) + 1) % 4, true);
    else if (id === 'scale') { while (state.phase === 'play') { tap(input, brainCard(0)); stepRush(state, input, dt); if (p.total === p.target - p.weights[0]) break; } if (state.phase === 'play') tap(input, brainCard(2)); }
    else tap(input, brainCard(((id === 'cups' ? p.answer : p.choices.indexOf(p.answer)) + 1) % 3));
    stepRush(state, input, dt); assert.equal(state.result, 'failure'); assert.equal(state.score, 0); assert.equal(state.lives, 4);
  });
}

test('pipe and lights allow experimentation without accepting incomplete puzzles', () => {
  for (const id of ['pipe', 'lights']) {
    const { state, input } = ready(id), p = state.game.extra;
    if (id === 'pipe') { tap(input, pipeTile(0)); stepRush(state, input, dt); assert.notDeepEqual(p.rotations, p.target); }
    else { const solution = lightSolution(p.lamps); const wrong = [0, 1, 2].find(i => !solution.includes(i)) ?? solution[0]; tap(input, brainCard(wrong)); stepRush(state, input, dt); if (state.phase === 'result') { assert.deepEqual(solution, [wrong]); return; } }
    assert.equal(state.phase, 'play'); assert.equal(state.result, null);
  }
});
test('scale undo removes the most recently added weight with both controls', () => {
  for (const pointer of [true, false]) {
    const { state, input } = ready('scale'); tap(input, brainCard(0)); stepRush(state, input, dt); const p = state.game.extra;
    assert.equal(p.total, p.weights[0]);
    if (pointer) tap(input, SCALE_UNDO); else input.downPressed = true;
    stepRush(state, input, dt); assert.equal(p.total, 0); assert.deepEqual(p.placed, []);
    if (pointer) tap(input, SCALE_UNDO); else input.downPressed = true;
    stepRush(state, input, dt); assert.equal(p.total, 0); assert.equal(state.phase, 'play');
  }
});
test('echo and cups ignore early guesses until reveal and shuffle finish', () => {
  for (const id of ['echo', 'cups']) for (const pointer of [true, false]) {
    const { state, input } = ready(id, 24, 8), p = state.game.extra, revealUntil = id === 'echo' ? p.revealUntil : p.pickAfter;
    while (state.game.time + dt * rushSpeed(state.level) < revealUntil) {
      if (id === 'echo') pressDirection(input, (p.sequence[0] + 1) % 4, pointer);
      else select(state, input, (p.answer + 1) % 3, pointer);
      stepRush(state, input, dt); assert.equal(state.phase, 'play'); assert.equal(p.progress ?? 0, 0);
    }
  }
});
test('all generated brain puzzles are unambiguous, feasible and begin unsolved', () => {
  for (let seed = 0; seed < 300; seed++) for (const level of [1, 8]) for (const { id } of BRAIN_GAMES) {
    const p = createBrainState(id, level, rng(seed)); assert.equal(p.id, id);
    if (id === 'pipe') { assert.notDeepEqual(p.rotations, p.target); assert.ok(p.rotations.reduce((moves, rotation, i) => moves + (p.target[i] - rotation + (i === 0 ? 2 : 4)) % (i === 0 ? 2 : 4), 0) <= 7); }
    if (id === 'lights') { assert.ok(!p.lamps.every(Boolean)); assert.ok(lightSolution(p.lamps).length <= 3); }
    if (id === 'clock' || id === 'pattern') { assert.equal(new Set(p.choices).size, p.choices.length); assert.equal(p.choices.filter(value => value === p.answer).length, 1); }
    if (id === 'scale') { const solution = weightSolution(p.weights, p.target); assert.ok(solution); assert.ok(solution.length <= 4); }
    if (id === 'cups') { let position = p.initial; for (const [a, b] of p.swaps) { assert.notEqual(a, b); if (position === a) position = b; else if (position === b) position = a; } assert.equal(p.answer, position); assert.ok(p.pickAfter < 3); }
    if (id === 'echo') { assert.ok(p.revealUntil < 2); assert.ok(p.sequence.every((value, i) => i === 0 || value !== p.sequence[i - 1])); }
  }
});
