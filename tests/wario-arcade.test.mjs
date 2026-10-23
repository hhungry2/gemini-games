import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, rushSpeed, pauseRush } = load('engine');
const { ARCADE_GAMES, createArcadeState, towerMovingX, molePosition, racerLaneX } = load('arcadeGames');
const dt = 1 / 120;
function random(seed) {
  let n = seed || 1;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}
function ready(id, seed = 4581, level = 1) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id);
  state.level = level; state.duration = 5 / rushSpeed(level);
  state.game.extra = createArcadeState(id, level, random(seed));
  for (let i = 0; i < 200 && state.phase === 'brief'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input, waypoint: 0 };
}
function direction(input, dx, dy = 0, threshold = 3) {
  input.right = dx > threshold; input.left = dx < -threshold;
  input.down = dy > threshold; input.up = dy < -threshold;
}
function solve(run, pointer) {
  const { state, input } = run, g = state.game, a = g.extra;
  Object.assign(input, emptyRushInput());
  if (a.id === 'lander') {
    const thrust = a.vy > (a.y > 325 ? 45 : 70);
    if (pointer) Object.assign(input, { pointerX: a.pad, pointerDown: thrust });
    else { direction(input, a.pad - a.x); input.actionHeld = thrust; }
    // Touch steers only while thrusting; short controlled bursts supply both axes.
  }
  if (a.id === 'tower' && !a.dropping) {
    const nextX = towerMovingX(g.time + dt * rushSpeed(state.level), a.phase), top = a.stack.at(-1);
    input.action = Math.abs(nextX - top.x) < 13;
    if (pointer) input.pointerPressed = input.action;
  }
  if (a.id === 'mole') {
    const slot = Math.floor((g.time + dt * rushSpeed(state.level) - 0.25) / 0.65);
    if (slot >= 0 && !a.hitSlots.includes(slot)) {
      const cell = a.targets[slot], point = molePosition(cell);
      if (pointer) Object.assign(input, { pointerX: point.x, pointerY: point.y, pointerPressed: true });
      else {
        input.leftPressed = a.selected % 3 > cell % 3; input.rightPressed = a.selected % 3 < cell % 3;
        input.upPressed = Math.floor(a.selected / 3) > Math.floor(cell / 3); input.downPressed = Math.floor(a.selected / 3) < Math.floor(cell / 3);
        input.action = a.selected === cell;
      }
    }
  }
  if (a.id === 'racer') {
    const row = a.rows.find(r => !r.passed);
    if (row) {
      if (pointer) Object.assign(input, { pointerX: racerLaneX(row.safe), pointerY: 370, pointerPressed: true });
      else { input.leftPressed = a.lane > row.safe; input.rightPressed = a.lane < row.safe; }
    }
  }
  if (a.id === 'pour' && a.cup < 2) {
    if (a.fills[a.cup] < a.targets[a.cup]) {
      if (pointer) input.pointerDown = true; else input.actionHeld = true;
    } else input.actionReleased = true;
  }
  if (a.id === 'puck') {
    const points = [[212, 220], [307, 220], [365, 330], [463, 330], [550, 205]];
    let point = points[Math.min(run.waypoint, points.length - 1)];
    if (Math.hypot(point[0] - a.x, point[1] - a.y) < 22 && run.waypoint < points.length - 1) point = points[++run.waypoint];
    const dx = point[0] - a.x - a.vx * 0.14, dy = point[1] - a.y - a.vy * 0.14;
    if (pointer) Object.assign(input, { pointerDown: true, pointerX: a.x + dx, pointerY: a.y + dy });
    else direction(input, dx, dy, 4);
    if (run.waypoint === points.length - 1 && Math.hypot(a.x - 550, a.y - 205) < 32) input.actionHeld = true;
  }
  if (a.id === 'fire') {
    const flame = a.flames.find(f => f.heat > 0);
    if (flame) {
      if (pointer) Object.assign(input, { pointerDown: true, pointerX: flame.x, pointerY: flame.y });
      else { direction(input, flame.x - a.x, flame.y - a.y); input.actionHeld = Math.hypot(a.x - flame.x, a.y - flame.y) < 34; }
    }
  }
  if (a.id === 'tug' && g.time - a.lastPull > 0.09) {
    if (pointer) Object.assign(input, { pointerPressed: true, pointerY: 370, pointerX: a.next < 0 ? 186 : 454 });
    else { input.leftPressed = a.next === -1; input.rightPressed = a.next === 1; }
  }
}

for (const definition of ARCADE_GAMES) {
  for (const pointer of [false, true]) {
    test(`${definition.id}: ${pointer ? 'touch' : 'keyboard'} wins real rounds across seeds and speeds`, () => {
      for (const level of [1, 7]) for (let seed = 1; seed <= 12; seed++) {
        const run = ready(definition.id, seed * 7919, level);
        for (let frame = 0; frame < 750 && run.state.phase === 'play'; frame++) { solve(run, pointer); stepRush(run.state, run.input, dt); }
        assert.equal(run.state.result, 'success', `${definition.id}, ${pointer ? 'touch' : 'keyboard'}, seed ${seed}, level ${level}: ${run.state.game.reason} ${JSON.stringify(run.state.game.extra)}`);
        assert.equal(run.state.score, 1);
      }
    });
  }
}

test('Every arcade game requires intentional input; waiting awards no free wins', () => {
  for (const { id } of ARCADE_GAMES) {
    const { state, input } = ready(id);
    for (let frame = 0; frame < 650 && state.phase === 'play'; frame++) stepRush(state, input, dt);
    assert.equal(state.result, 'failure', id); assert.equal(state.score, 0, id);
  }
});

test('Lander cannot land safely at full falling speed even when aligned', () => {
  const { state, input } = ready('lander'); const a = state.game.extra;
  a.x = a.pad;
  for (let i = 0; i < 400 && state.phase === 'play'; i++) stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.ok(a.vy > 76);
});

test('Tower clips overhangs and rejects a completely unaligned block', () => {
  const { state, input } = ready('tower'); const a = state.game.extra;
  a.dropping = true; a.x = 350; a.y = 347;
  stepRush(state, input, dt); assert.equal(a.stack.length, 2); assert.equal(a.stack[1].width, 126); assert.equal(a.stack[1].x, 335);
  a.dropping = true; a.x = 550; a.y = 300;
  stepRush(state, input, dt); assert.equal(state.result, 'failure');
});

test('Bomb clicks fail and repeated hits on one mole cannot win', () => {
  const bomb = ready('mole');
  for (let i = 0; bomb.state.game.time < 0.3; i++) stepRush(bomb.state, bomb.input, dt);
  const point = molePosition(bomb.state.game.extra.bombs[0]);
  Object.assign(bomb.input, { pointerPressed: true, pointerX: point.x, pointerY: point.y }); stepRush(bomb.state, bomb.input, dt);
  assert.equal(bomb.state.result, 'failure');
  const repeat = ready('mole');
  for (let i = 0; repeat.state.game.time < 0.3; i++) stepRush(repeat.state, repeat.input, dt);
  const mole = molePosition(repeat.state.game.extra.targets[0]);
  for (let i = 0; i < 10; i++) { Object.assign(repeat.input, { pointerPressed: true, pointerX: mole.x, pointerY: mole.y }); stepRush(repeat.state, repeat.input, dt); }
  assert.equal(repeat.state.game.extra.count, 1); assert.equal(repeat.state.result, null);
});

test('Pour needs a real release, preserves fill through pause, and rejects overfill', () => {
  const { state, input } = ready('pour'); input.actionHeld = true;
  for (let i = 0; i < 40; i++) stepRush(state, input, dt);
  const fill = state.game.extra.fills[0]; pauseRush(state, input, true);
  for (let i = 0; i < 100; i++) stepRush(state, input, dt);
  assert.equal(state.game.extra.fills[0], fill);
  pauseRush(state, input, false); stepRush(state, input, dt);
  assert.equal(state.game.extra.cup, 0); assert.equal(state.game.extra.fills[0], fill);
  input.actionHeld = true;
  for (let i = 0; i < 250 && state.phase === 'play'; i++) stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.match(state.game.reason, /あふれ/);
});

test('Puck keeps momentum, walls stop crossings, and the brake slows it', () => {
  const { state, input } = ready('puck'), a = state.game.extra;
  input.right = true;
  for (let i = 0; i < 70; i++) stepRush(state, input, dt);
  assert.ok(a.x <= 236); assert.ok(a.bumps > 0);
  a.x = 236; a.vx = -90; input.right = false; stepRush(state, input, dt);
  assert.ok(a.x < 236, 'a puck bouncing away must not be glued to the wall');
  Object.assign(input, emptyRushInput()); a.x = 150; a.y = 220; a.vx = 150; a.vy = 0;
  stepRush(state, input, dt); assert.ok(a.x > 150); assert.ok(a.vx > 0);
  const speed = a.vx; input.actionHeld = true; stepRush(state, input, dt); assert.ok(a.vx < speed * 0.9);
});

test('Fire consumes water for wasted sprays and tug rejects repeated same-side pulls', () => {
  const spray = ready('fire'); spray.input.actionHeld = true;
  for (let i = 0; i < 500 && spray.state.phase === 'play'; i++) stepRush(spray.state, spray.input, dt);
  assert.equal(spray.state.result, 'failure'); assert.equal(spray.state.game.extra.water, 0);
  const tug = ready('tug'), side = tug.state.game.extra.next;
  for (let i = 0; i < 30; i++) { tug.input.leftPressed = side < 0; tug.input.rightPressed = side > 0; stepRush(tug.state, tug.input, dt); }
  assert.equal(tug.state.game.extra.pulls, 1); assert.ok(tug.state.game.extra.progress < 0); assert.equal(tug.state.result, null);
});

test('Restart clears arcade progress, held controls, and stale pointer or release events', () => {
  for (const { id } of ARCADE_GAMES) {
    const run = ready(id);
    for (let i = 0; i < 25 && run.state.phase === 'play'; i++) { solve(run, true); stepRush(run.state, run.input, dt); }
    Object.assign(run.input, { actionHeld: true, actionReleased: true, pointerDown: true, pointerPressed: true, leftPressed: true });
    startRush(run.state, run.input, id);
    assert.equal(run.state.game.time, 0); assert.equal(run.state.score, 0); assert.equal(run.state.game.result, null);
    assert.deepEqual(run.input, emptyRushInput()); assert.equal(run.state.game.extra.pack, 'arcade');
  }
});
