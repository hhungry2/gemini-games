import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, rushSpeed, pauseRush } = load('engine');
const { ACTION_GAMES, createActionState, fishingX, launchLandingX } = load('actionGames');
const dt = 1 / 120;
function random(seed) {
  let n = seed || 1;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}
function ready(id, seed = 4581, level = 1) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id);
  state.level = level; state.duration = 5 / rushSpeed(level);
  state.game.extra = createActionState(id, level, random(seed));
  for (let i = 0; i < 200 && state.phase === 'brief'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input };
}
function direction(input, dx, dy = 0, threshold = 3) {
  input.right = dx > threshold; input.left = dx < -threshold;
  input.down = dy > threshold; input.up = dy < -threshold;
}
function solve(state, input, pointer) {
  const g = state.game, a = g.extra;
  Object.assign(input, emptyRushInput());
  if (a.id === 'target') {
    const point = a.targets[a.count];
    if (pointer) Object.assign(input, { pointerX: point.x, pointerY: point.y, pointerPressed: true, action: true });
    else { direction(input, point.x - a.x, point.y - a.y); input.action = Math.hypot(point.x - a.x, point.y - a.y) < 25; }
  }
  if (a.id === 'rally') {
    if (pointer) Object.assign(input, { pointerDown: true, pointerX: a.ball.x });
    else direction(input, a.ball.x - a.x);
  }
  if (a.id === 'balance') {
    const correction = Math.max(-1, Math.min(1, -a.angle * 4 - a.velocity * 3 - 0.2));
    if (pointer) Object.assign(input, { pointerDown: true, pointerX: 320 + correction * 130 });
    else direction(input, correction, 0, 0.07);
  }
  if (a.id === 'fishing') {
    const aim = fishingX(g.time + 0.34, a.fishPhase);
    if (pointer) Object.assign(input, { pointerDown: true, pointerX: aim });
    else direction(input, aim - a.x);
    input.action = a.stage === 'aim' && (pointer || Math.abs(aim - a.x) < 20);
    input.actionHeld = a.stage !== 'aim';
  }
  if (a.id === 'launch') {
    const targetCharge = (a.target - launchLandingX(0)) / (launchLandingX(1) - launchLandingX(0));
    if (!a.launched && a.charge < targetCharge) {
      if (pointer) input.pointerDown = true; else input.actionHeld = true;
    } else if (!a.launched) input.actionReleased = true;
  }
  if (a.id === 'glide') {
    const gate = a.gates.find(value => value.x - g.time * 220 > 93) ?? a.gates.at(-1);
    const held = a.y + a.vy * 0.21 > gate.y;
    if (pointer) input.pointerDown = held; else input.actionHeld = held;
  }
  if (a.id === 'rhythm') {
    input.action = Math.abs(g.time + dt * rushSpeed(state.level) - a.beats[a.count]) <= dt * rushSpeed(state.level);
    if (pointer) input.pointerPressed = input.action;
  }
  if (a.id === 'scrub') {
    const spot = a.spots.find(value => value.clean < 1);
    const x = spot.x + Math.sin(g.time * 28) * 16, y = spot.y + Math.cos(g.time * 28) * 14;
    if (pointer) Object.assign(input, { pointerDown: true, pointerX: x, pointerY: y });
    else direction(input, x - a.x, y - a.y, 1);
  }
}

for (const definition of ACTION_GAMES) {
  for (const pointer of [false, true]) {
    test(`${definition.id}: ${pointer ? 'touch' : 'keyboard'} wins real rounds across seeds and speeds`, () => {
      for (const level of [1, 7]) for (let seed = 1; seed <= 12; seed++) {
        const { state, input } = ready(definition.id, seed * 7919, level);
        for (let frame = 0; frame < 750 && state.phase === 'play'; frame++) {
          solve(state, input, pointer); stepRush(state, input, dt);
        }
        assert.equal(state.result, 'success', `${definition.id}, ${pointer ? 'touch' : 'keyboard'}, seed ${seed}, level ${level}: ${state.game.reason}`);
        assert.equal(state.score, 1);
      }
    });
  }
}

test('Every action game requires intentional input; waiting cannot award a free win', () => {
  for (const { id } of ACTION_GAMES) {
    const { state, input } = ready(id);
    for (let frame = 0; frame < 650 && state.phase === 'play'; frame++) stepRush(state, input, dt);
    assert.equal(state.result, 'failure', id);
    assert.equal(state.score, 0, id);
  }
});

test('Three missed shots fail, and a future unlit target does not count', () => {
  const { state, input } = ready('target');
  const a = state.game.extra;
  const future = a.targets[1];
  for (let i = 0; i < 3; i++) {
    Object.assign(input, { pointerPressed: true, action: true, pointerX: future.x, pointerY: future.y }); stepRush(state, input, dt);
  }
  assert.equal(a.count, 0); assert.equal(state.result, 'failure');
});

test('Fishing can miss the fish, recast, then reel it all the way in', () => {
  const { state, input } = ready('fishing');
  Object.assign(input, { pointerDown: true, pointerPressed: true, pointerX: 75, action: true }); stepRush(state, input, dt);
  for (let i = 0; i < 50 && state.game.extra.stage !== 'aim'; i++) { input.pointerDown = false; stepRush(state, input, dt); }
  assert.equal(state.game.extra.stage, 'aim'); assert.equal(state.result, null);
  for (let i = 0; i < 500 && state.phase === 'play'; i++) { solve(state, input, true); stepRush(state, input, dt); }
  assert.equal(state.result, 'success');
});

test('Launch waits for a release, and too little charge lands short', () => {
  const { state, input } = ready('launch');
  input.actionHeld = true;
  for (let i = 0; i < 8; i++) stepRush(state, input, dt);
  assert.equal(state.game.extra.launched, false);
  input.actionHeld = false; input.actionReleased = true; stepRush(state, input, dt);
  assert.equal(state.game.extra.launched, true);
  for (let i = 0; i < 150 && state.phase === 'play'; i++) stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.ok(state.game.extra.x < state.game.extra.target - 40);
});

test('Glide respects held controls and fails when held against the upper edge', () => {
  const { state, input } = ready('glide'); input.actionHeld = true;
  for (let i = 0; i < 250 && state.phase === 'play'; i++) stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.match(state.game.reason, /高さ/);
});

test('Rhythm rejects an early beat and a held button cannot replace three distinct hits', () => {
  const early = ready('rhythm'); early.input.action = true; stepRush(early.state, early.input, dt);
  assert.equal(early.state.result, 'failure');
  const held = ready('rhythm'); held.input.actionHeld = true;
  for (let i = 0; i < 250 && held.state.phase === 'play'; i++) stepRush(held.state, held.input, dt);
  assert.equal(held.state.result, 'failure'); assert.equal(held.state.game.extra.count, 0);
});

test('Holding a sponge still does not clean; moving it back and forth does', () => {
  const { state, input } = ready('scrub'); const spot = state.game.extra.spots[0];
  Object.assign(input, { pointerDown: true, pointerX: spot.x, pointerY: spot.y }); stepRush(state, input, dt);
  const before = spot.clean;
  for (let i = 0; i < 30; i++) stepRush(state, input, dt);
  assert.equal(spot.clean, before);
  for (let i = 0; i < 30; i++) { input.pointerX = spot.x + (i % 2 ? 8 : -8); stepRush(state, input, dt); }
  assert.equal(spot.clean, 1); assert.equal(state.game.extra.count, 1);
});

test('Pausing a charged launch clears held/released input without launching on resume', () => {
  const { state, input } = ready('launch'); input.actionHeld = true;
  for (let i = 0; i < 50; i++) stepRush(state, input, dt);
  const charge = state.game.extra.charge;
  pauseRush(state, input, true);
  for (let i = 0; i < 50; i++) stepRush(state, input, dt);
  assert.equal(state.game.extra.charge, charge);
  pauseRush(state, input, false); stepRush(state, input, dt);
  assert.equal(state.game.extra.launched, false);
});
