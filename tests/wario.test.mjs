import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';
const { RUSH_GAMES, createRushSession, emptyRushInput, startRush, stepRush, pauseRush, selectRushGame, rushSpeed, readRushRecord } = load('engine');
const dt = 1 / 60;

function ready(id, seed = 4581) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id);
  for (let i = 0; i < 90 && state.phase === 'brief'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input };
}

function solve(state, input) {
  const g = state.game;
  if (g.id === 'jump' && g.time >= 1.66 && g.time < 1.71) input.action = true;
  if (g.id === 'catch') {
    const drop = g.drops.find(value => !value.caught);
    input.pointerDown = true; input.pointerX = drop?.x ?? 320;
  }
  if (g.id === 'inflate') input.action = true;
  if (g.id === 'stop') {
    const needle = 120 + (0.5 + Math.sin((g.time + dt * rushSpeed(state.level)) * 3.5) * 0.5) * 400;
    input.action = Math.abs(needle - g.target) < g.targetWidth * 0.4;
  }
  if (g.id === 'match') {
    if (g.options[g.selected] === g.target) input.action = true;
    else input.rightPressed = true;
  }
  if (g.id === 'dodge') {
    const near = g.drops.filter(drop => {
      const y = -60 + (g.time - drop.start) * 285;
      return y >= 245 && y < 412;
    });
    input.pointerDown = true;
    input.pointerX = [50, 140, 230, 320, 410, 500, 590].sort((a, b) => {
      const safe = x => Math.min(...near.map(drop => Math.abs(x - drop.x)), 999);
      return safe(b) - safe(a);
    })[0];
  }
  if (g.id === 'react' && g.time > g.target) input.action = true;
  if (g.id === 'sequence') {
    if (g.sequence[g.count] === -1) input.leftPressed = true;
    else input.rightPressed = true;
  }
}

for (const definition of RUSH_GAMES.slice(0, 8)) {
  test(`${definition.id}: a player can win across multiple seeded variations and speeds`, () => {
    for (let seed = 1; seed <= 12; seed++) {
      const { state, input } = ready(definition.id, seed);
      state.level = seed % 3 === 0 ? 7 : 1;
      state.duration = 5 / rushSpeed(state.level);
      for (let frame = 0; frame < 400 && state.phase === 'play'; frame++) {
        solve(state, input);
        stepRush(state, input, dt);
      }
      assert.equal(state.result, 'success', `${definition.id}, seed ${seed}: ${state.game.reason}`);
      assert.equal(state.score, 1);
    }
  });
}

test('Every shuffled deck contains all 40 games, and deck boundaries never repeat', () => {
  assert.equal(RUSH_GAMES.length, 40);
  for (let seed = 1; seed <= 30; seed++) {
    const state = createRushSession(seed);
    let previous = null;
    for (let deck = 0; deck < 12; deck++) {
      const selected = [];
      for (let i = 0; i < RUSH_GAMES.length; i++) {
        const id = selectRushGame(state);
        assert.notEqual(id, previous);
        previous = id; selected.push(id);
      }
      assert.equal(new Set(selected).size, RUSH_GAMES.length);
    }
  }
});

test('A new run discards old scores, level, practice, timers and held inputs', () => {
  const { state, input } = ready('catch');
  state.score = 70; state.level = 9; state.lives = 1; state.paused = true;
  input.left = true; input.action = true; input.pointerDown = true;
  startRush(state, input);
  assert.equal(state.score, 0); assert.equal(state.level, 1); assert.equal(state.lives, 4);
  assert.equal(state.practice, null); assert.equal(state.phase, 'brief'); assert.equal(state.paused, false);
  assert.equal(state.elapsed, 0); assert.equal(state.duration, 5); assert.equal(state.round, 1);
  assert.deepEqual(input, emptyRushInput());
});

test('The last life reaches game over exactly once and cannot be changed by old result timers', () => {
  const { state, input } = ready('inflate');
  state.practice = null; state.lives = 1;
  for (let i = 0; i < 310 && state.phase === 'play'; i++) stepRush(state, input, dt);
  assert.equal(state.lives, 0); assert.equal(state.result, 'failure'); assert.equal(state.phase, 'result');
  for (let i = 0; i < 120; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'over'); assert.equal(state.lives, 0);
  startRush(state, input);
  for (let i = 0; i < 72; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play'); assert.equal(state.lives, 4);
});

test('Five successful clears advance speed before constructing the next round', () => {
  const { state, input } = ready('inflate');
  state.practice = null; state.score = 4;
  for (let i = 0; i < 12 && state.phase === 'play'; i++) { input.action = true; stepRush(state, input, dt); }
  assert.equal(state.score, 5);
  for (let i = 0; i < 65 && state.phase === 'result'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'speedup'); assert.equal(state.level, 2);
  for (let i = 0; i < 90 && state.phase === 'speedup'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'brief'); assert.equal(state.level, 2);
  assert.equal(state.duration, 5 / rushSpeed(2));
});

test('Pause freezes play, instruction and result clocks, and clears all pending controls', () => {
  for (const phase of ['brief', 'play', 'result', 'speedup']) {
    const { state, input } = ready('inflate');
    state.phase = phase; state.phaseTime = 0.8;
    const before = { elapsed: state.elapsed, gameTime: state.game.time, phaseTime: state.phaseTime, score: state.score };
    input.action = true; input.left = true; input.pointerDown = true;
    pauseRush(state, input, true);
    for (let i = 0; i < 400; i++) stepRush(state, input, dt);
    assert.equal(state.elapsed, before.elapsed); assert.equal(state.game.time, before.gameTime);
    assert.equal(state.phaseTime, before.phaseTime); assert.equal(state.score, before.score);
    assert.deepEqual(input, emptyRushInput());
    pauseRush(state, input, false);
    stepRush(state, input, dt);
    assert.equal(state.paused, false);
    assert.equal(state.game.count, 0);
  }
});

test('Held action and direction inputs from instructions cannot trigger the next game', () => {
  const state = createRushSession(91), input = emptyRushInput();
  startRush(state, input, 'react');
  input.action = true; input.pointerDown = true; input.left = true;
  for (let i = 0; i < 90 && state.phase === 'brief'; i++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play'); assert.deepEqual(input, emptyRushInput());
  stepRush(state, input, dt); assert.equal(state.result, null);
});

test('Training repeats the chosen game, preserves lives on a mistake, and never increases speed', () => {
  const { state, input } = ready('react');
  input.action = true; stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.equal(state.lives, 4);
  for (let i = 0; i < 90 && state.phase === 'result'; i++) stepRush(state, input, dt);
  assert.equal(state.game.id, 'react'); assert.equal(state.phase, 'brief'); assert.equal(state.level, 1);
});

test('Wrong shape, early reaction and wrong code fail with useful feedback', () => {
  const match = ready('match');
  match.state.game.selected = match.state.game.options.findIndex(shape => shape !== match.state.game.target);
  match.input.action = true; stepRush(match.state, match.input, dt);
  assert.equal(match.state.result, 'failure'); assert.match(match.state.game.reason, /お手本/);
  const react = ready('react'); react.input.action = true; stepRush(react.state, react.input, dt);
  assert.equal(react.state.result, 'failure'); assert.match(react.state.game.reason, /まだ赤/);
  const code = ready('sequence');
  code.input[code.state.game.sequence[0] === 1 ? 'leftPressed' : 'rightPressed'] = true;
  stepRush(code.state, code.input, dt);
  assert.equal(code.state.result, 'failure'); assert.match(code.state.game.reason, /左から/);
});

test('Touch selects all shapes and enters both left/right arrow sequences', () => {
  for (let seed = 1; seed < 15; seed++) {
    const { state, input } = ready('match', seed);
    const index = state.game.options.indexOf(state.game.target);
    Object.assign(input, { pointerPressed: true, action: true, pointerX: 145 + index * 175, pointerY: 280 });
    stepRush(state, input, dt); assert.equal(state.result, 'success');
    const code = ready('sequence', seed);
    while (code.state.phase === 'play') {
      Object.assign(code.input, { pointerPressed: true, action: true, pointerX: code.state.game.sequence[code.state.game.count] === -1 ? 200 : 440, pointerY: 330 });
      stepRush(code.state, code.input, dt);
    }
    assert.equal(code.state.result, 'success');
  }
});

test('A tap outside the shape cards does not guess a shape or spend a life', () => {
  const { state, input } = ready('match');
  Object.assign(input, { pointerPressed: true, action: true, pointerX: 10, pointerY: 30 });
  stepRush(state, input, dt);
  assert.equal(state.result, null); assert.equal(state.phase, 'play');
});

test('Corrupt or unbounded saved records use safe defaults', () => {
  for (const value of [null, '', 'NaN', '-2', '1.3', 'Infinity', '5bad', '99999999999999999', '1000001']) assert.equal(readRushRecord(value, 1), 1);
  assert.equal(readRushRecord('0', 0), 0); assert.equal(readRushRecord('42', 0), 42);
});

test('All 40 catalog entries have unique IDs, numbers, readable commands and supported categories', () => {
  assert.equal(new Set(RUSH_GAMES.map(game => game.id)).size, 40);
  assert.equal(new Set(RUSH_GAMES.map(game => game.number)).size, 40);
  assert.deepEqual(RUSH_GAMES.map(game => game.number), Array.from({ length: 40 }, (_, i) => String(i + 1).padStart(2, '0')));
  for (const game of RUSH_GAMES) {
    assert.ok(['action', 'timing', 'puzzle', 'memory'].includes(game.category));
    assert.ok(game.name.length > 2 && game.command.length > 2 && game.hint.length > 10);
  }
});

test('Every renderer survives a complete round with finite geometry and no negative radii', () => {
  const { renderRush } = load('render');
  const context = new Proxy({}, {
    get(_target, method) {
      if (method === 'measureText') return value => ({ width: String(value).length * 12 });
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(method)} has a non-finite coordinate`);
        if (method === 'arc') assert.ok(args[2] >= 0, 'negative circle radius');
        if (method === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0, 'negative ellipse radius');
        if (method === 'fillText') assert.equal(typeof args[0], 'string');
        if (String(method).includes('Gradient')) return { addColorStop() {} };
      };
    },
    set() { return true; },
  });
  for (const definition of RUSH_GAMES) {
    const { state, input } = ready(definition.id);
    for (let frame = 0; frame < 360; frame++) {
      stepRush(state, input, dt);
      if (frame % 6 === 0) renderRush(context, state, frame / 60);
    }
  }
});
