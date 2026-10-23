import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush } = load('engine');
const { FLIGHT_BOSSES, createFlightBossState } = load('flightBosses');
const { renderFlightBoss } = load('flightBossRender');
const ids = ['boss-dragon', 'boss-slime'];
const dt = 1 / 60;

function randomSeed(seed) {
  let value = seed;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}
function ready(id, variation = 0, level = 1, seed = 17) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id, variation);
  assert.equal(state.game.extra?.pack, 'flight-boss', `${id} must use its own boss simulation`);
  assert.equal(state.duration, 20, `${id} must use the real 20 second boss clock`);
  state.level = level;
  state.game.extra = createFlightBossState(id, level, variation, randomSeed(seed));
  for (let frame = 0; frame < 400 && state.phase === 'brief'; frame++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input };
}
function control(run, touch) {
  const { state, input } = run, boss = state.game.extra;
  Object.assign(input, emptyRushInput());
  if (boss.id === 'boss-dragon') {
    const gate = boss.gates.find(candidate => !candidate.passed), y = gate?.y ?? boss.playerY;
    if (touch) Object.assign(input, { pointerDown: true, pointerX: boss.playerX, pointerY: y });
    else Object.assign(input, { up: boss.playerY > y + 3, down: boss.playerY < y - 3, actionHeld: boss.variation === 2 });
  } else if (touch) Object.assign(input, { pointerDown: true, pointerX: boss.ballX, pointerY: boss.paddleY });
  else Object.assign(input, { left: boss.paddleX > boss.ballX + 4, right: boss.paddleX < boss.ballX - 4 });
}
function play(run, touch, fps = 60) {
  const phases = new Set();
  for (let frame = 0; frame <= 20 * fps && run.state.phase === 'play'; frame++) {
    control(run, touch); stepRush(run.state, run.input, 1 / fps); phases.add(run.state.game.extra.phase);
  }
  return phases;
}
function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value && typeof value === 'object') for (const item of Object.values(value)) finiteTree(item);
}

test('Two independent boss definitions each describe three playable routes and controls', () => {
  assert.deepEqual(FLIGHT_BOSSES.map(boss => boss.id), ids);
  assert.equal(new Set(FLIGHT_BOSSES.map(boss => boss.number)).size, 2);
  for (const definition of FLIGHT_BOSSES) {
    assert.equal(definition.variations.length, 3);
    assert.equal(new Set(definition.variations.map(variation => variation.name)).size, 3);
    assert.ok(definition.hint.includes('指')); assert.ok(definition.shortHint.length > 10);
  }
  assert.equal(createFlightBossState('jump', 1), undefined);
});

test('Factories sanitize tiers and patterns and never share mutable state', () => {
  for (const id of ids) for (const level of [-8, 1, 7, Infinity, NaN]) for (const variation of [-9, 0, 2, 99, NaN]) {
    const boss = createFlightBossState(id, level, variation, randomSeed(9));
    finiteTree(boss); assert.ok(boss.tier >= 1 && boss.tier <= 3); assert.ok(boss.variation >= 0 && boss.variation <= 2);
    assert.equal(boss.armor, 3); assert.equal(boss.maxArmor, 3); assert.equal(boss.phase, 1); assert.equal(boss.hp, boss.maxHp);
  }
  for (const id of ids) {
    const first = createFlightBossState(id, 1), second = createFlightBossState(id, 1);
    first.particles.push({ life: 1 }); assert.equal(second.particles.length, 0);
    if (id === 'boss-dragon') { first.gates[0].x = 12; assert.equal(second.gates[0].x, 595); }
  }
});

for (const id of ids) for (let variation = 0; variation < 3; variation++) for (const level of [1, 7]) for (const touch of [false, true]) {
  test(`${id} pattern ${variation + 1}, level ${level}: ${touch ? 'touch drag' : 'held keyboard'} genuinely wins all three seeded courses`, () => {
    for (const seed of [17, 4103, 987654]) {
      const run = ready(id, variation, level, seed), phases = play(run, touch);
      assert.equal(run.state.result, 'success', `${id}/${variation}/${seed}: ${JSON.stringify(run.state.game.extra)}`);
      assert.equal(run.state.game.extra.hp, 0); assert.equal(run.state.game.extra.armor, 3);
      assert.deepEqual([...phases].sort(), [1, 2, 3]);
      assert.ok(run.state.elapsed > 7 && run.state.elapsed < 20);
      finiteTree(run.state.game.extra);
      if (id === 'boss-dragon') assert.equal(run.state.game.extra.collected, 6);
      else assert.equal(run.state.game.extra.returnCount, 8);
    }
  });
}

for (const id of ids) for (let variation = 0; variation < 3; variation++) {
  test(`${id} pattern ${variation + 1}: inactivity never awards a free win`, () => {
    const { state, input } = ready(id, variation);
    for (let frame = 0; frame < 1250 && state.phase === 'play'; frame++) stepRush(state, input, dt);
    assert.equal(state.result, 'failure'); assert.equal(state.game.extra.armor, 0); assert.ok(state.game.extra.hp > 0); assert.equal(state.score, 0);
  });
}

test('Every route remains winnable at 30 and 144 fps using visible targets', () => {
  for (const id of ids) for (let variation = 0; variation < 3; variation++) for (const fps of [30, 144]) {
    const run = ready(id, variation, 7, 6149); play(run, true, fps);
    assert.equal(run.state.result, 'success', `${id}/${variation}/${fps}fps`); assert.equal(run.state.game.extra.armor, 3);
  }
});

test('Dragon storm rings require charged flight and moving currents change the actual ring centers', () => {
  const run = ready('boss-dragon', 2), boss = run.state.game.extra;
  // Align on every ring, with real vertical controls, but never hold the charge key.
  for (let frame = 0; frame < 1250 && run.state.phase === 'play'; frame++) {
    control(run, false); run.input.actionHeld = false; stepRush(run.state, run.input, dt);
  }
  assert.equal(run.state.result, 'failure'); assert.equal(boss.collected, 0); assert.equal(boss.charge, 0);
  const moving = ready('boss-dragon', 1), before = moving.state.game.extra.gates.map(gate => gate.y);
  for (let frame = 0; frame < 60; frame++) stepRush(moving.state, moving.input, dt);
  assert.ok(moving.state.game.extra.gates.some((gate, index) => Math.abs(gate.y - before[index]) > 5));
});

test('Slime wind and bumpers alter ball velocity without tunnelling outside the side walls', () => {
  const wind = ready('boss-slime', 1), a = wind.state.game.extra;
  a.serveDelay = 0; const vx = a.ballVx;
  for (let frame = 0; frame < 10; frame++) { control(wind, true); stepRush(wind.state, wind.input, dt); }
  assert.notEqual(a.ballVx, vx); assert.notEqual(a.wind, 0);
  const bumper = ready('boss-slime', 2), b = bumper.state.game.extra;
  b.serveDelay = 0; b.ballX = 208; b.ballY = 289; b.ballVx = 80; b.ballVy = 20;
  stepRush(bumper.state, bumper.input, dt);
  assert.ok(b.ballVx < -80); assert.ok(b.bumperCooldown > 0);
  b.ballX = 63; b.ballVx = -290; b.ballY = 330;
  stepRush(bumper.state, bumper.input, dt);
  assert.ok(b.ballX >= 62 && b.ballX <= 578); assert.ok(b.ballVx > 0);
});

for (const id of ids) {
  test(`${id}: pause freezes the whole simulation and reset clears all encounter state`, () => {
    const run = ready(id, 2, 7);
    for (let frame = 0; frame < 140; frame++) { control(run, true); stepRush(run.state, run.input, dt); }
    pauseRush(run.state, run.input, true);
    const frozen = JSON.stringify(run.state.game), time = run.state.elapsed;
    for (let frame = 0; frame < 180; frame++) stepRush(run.state, run.input, dt);
    assert.equal(JSON.stringify(run.state.game), frozen); assert.equal(run.state.elapsed, time);
    assert.equal(run.input.pointerDown, false); assert.equal(run.input.actionHeld, false);
    pauseRush(run.state, run.input, false); control(run, true); stepRush(run.state, run.input, dt);
    assert.ok(run.state.elapsed > time);
    const old = run.state.game.extra;
    startRush(run.state, run.input, id, 2);
    assert.notEqual(run.state.game.extra, old); assert.equal(run.state.game.extra.hp, run.state.game.extra.maxHp);
    assert.equal(run.state.game.extra.armor, 3); assert.equal(run.state.game.extra.phase, 1); assert.equal(run.state.elapsed, 0);
    assert.equal(run.state.game.variation, 2); assert.equal(run.state.game.extra.particles.length, 0);
  });
}

test('All flight boss frames render with finite geometry and never mutate the simulation', () => {
  const context = new Proxy({}, { get: (_, method) => (...args) => {
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${String(method)} ${args}`);
    if (method === 'arc') assert.ok(args[2] >= 0);
    if (method === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0);
    if (method === 'fillText') assert.equal(typeof args[0], 'string');
  } });
  for (const id of ids) for (let variation = 0; variation < 3; variation++) {
    const run = ready(id, variation, 7);
    for (let frame = 0; frame < 1200 && run.state.phase === 'play'; frame++) {
      control(run, true); stepRush(run.state, run.input, dt);
      if (frame % 5 === 0) {
        const before = JSON.stringify(run.state.game.extra);
        assert.equal(renderFlightBoss(context, run.state), true);
        assert.equal(JSON.stringify(run.state.game.extra), before); finiteTree(run.state.game.extra);
      }
    }
    assert.equal(run.state.result, 'success');
  }
});
