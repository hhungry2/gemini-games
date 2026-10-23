import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush, RUSH_GAMES, rushDefinition } = load('engine');
const { bossLaneX, BOSS_DURATION } = load('bossGame');
const dt = 1 / 60;
function advance(state, input, phase) {
  for (let frame = 0; frame < 400 && state.phase === phase; frame++) stepRush(state, input, dt);
  assert.notEqual(state.phase, phase, `phase ${phase} should finish`);
}
function nextPlay(state, input) {
  for (let frame = 0; frame < 600 && state.phase !== 'play'; frame++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
}
function bossRun(lives = 3) {
  const state = createRushSession(91), input = emptyRushInput();
  startRush(state, input, 'boss', 0); state.practice = null; state.lives = lives; state.bossEncounters = 1;
  nextPlay(state, input); return { state, input };
}
function beatBoss(state, input) {
  for (let frame = 0; frame < 1300 && state.phase === 'play'; frame++) {
    const boss = state.game.extra;
    input.pointerDown = true; input.pointerX = bossLaneX(boss.targetLane);
    stepRush(state, input, dt);
  }
  assert.equal(state.result, 'success', state.game.reason);
}

test('Ten real regular clears schedule the boss after speedup without consuming the regular deck', () => {
  const state = createRushSession(94), input = emptyRushInput();
  startRush(state, input, 'inflate'); state.practice = null; state.bag = Array(12).fill('inflate'); state.bossBag = ['boss'];
  for (let clear = 1; clear <= 10; clear++) {
    nextPlay(state, input); assert.equal(state.game.id, 'inflate');
    while (state.phase === 'play') {
      input.action = true; input.actionHeld = true;
      input.leftPressed = state.game.sequence[state.game.count] === -1;
      input.rightPressed = state.game.sequence[state.game.count] === 1;
      stepRush(state, input, dt);
    }
    assert.equal(state.score, clear); assert.equal(state.clearsSinceBoss, clear);
    advance(state, input, 'result');
    if (state.phase === 'speedup') advance(state, input, 'speedup');
    assert.equal(state.game.id, clear === 10 ? 'boss' : 'inflate');
  }
  assert.equal(state.bag.length, 3); assert.equal(state.bossEncounters, 1);
  assert.equal(state.clearsSinceBoss, 0); assert.equal(state.level, 3);
  assert.equal(state.phaseTime, 2.6); assert.equal(state.duration, BOSS_DURATION);
  nextPlay(state, input); beatBoss(state, input);
  assert.equal(state.score, 11); assert.equal(state.bossesDefeated, 1); assert.equal(state.clearsSinceBoss, 0);
  advance(state, input, 'result'); assert.equal(state.game.id, 'inflate'); assert.equal(state.bag.length, 2);
});

test('Failed regular rounds preserve the remaining clear count and do not trigger a boss early', () => {
  const state = createRushSession(1), input = emptyRushInput();
  startRush(state, input, 'inflate'); state.practice = null; state.clearsSinceBoss = 9;
  nextPlay(state, input); advance(state, input, 'play');
  assert.equal(state.result, 'failure'); assert.equal(state.clearsSinceBoss, 9);
  advance(state, input, 'result'); assert.notEqual(state.game.id, 'boss'); assert.equal(state.bossEncounters, 0);
});

test('Boss victories recover exactly one run life, respect the four life cap, and award one clear', () => {
  for (const lives of [1, 3, 4]) {
    const { state, input } = bossRun(lives); beatBoss(state, input);
    assert.equal(state.lives, Math.min(4, lives + 1)); assert.equal(state.score, 1); assert.equal(state.bossesDefeated, 1);
    assert.match(state.game.reason, lives === 4 ? /満タン/ : /ライフ＋1/);
    for (let frame = 0; frame < 30; frame++) stepRush(state, input, dt);
    assert.equal(state.lives, Math.min(4, lives + 1)); assert.equal(state.score, 1); assert.equal(state.bossesDefeated, 1);
  }
});

test('A boss defeat spends one run life and the final life ends the run', () => {
  for (const lives of [1, 3]) {
    const { state, input } = bossRun(lives);
    while (state.phase === 'play') {
      const boss = state.game.extra;
      input.pointerDown = true; input.pointerX = bossLaneX(boss.dangerLanes[0]);
      stepRush(state, input, dt);
    }
    assert.equal(state.result, 'failure'); assert.equal(state.lives, lives - 1);
    assert.equal(state.score, 0); assert.equal(state.bossesDefeated, 0);
    advance(state, input, 'result');
    assert.equal(state.phase, lives === 1 ? 'over' : 'brief');
    if (lives > 1) assert.notEqual(state.game.id, 'boss');
  }
});

test('Boss practice uses a full twenty seconds, repeats at the same tier, and never gives run rewards', () => {
  const state = createRushSession(6), input = emptyRushInput(); startRush(state, input, 'boss');
  state.lives = 2; nextPlay(state, input); beatBoss(state, input);
  assert.equal(state.lives, 2); assert.equal(state.bossesDefeated, 0); assert.equal(state.bossEncounters, 0);
  assert.equal(state.clearsSinceBoss, 0); assert.doesNotMatch(state.game.reason, /回復|満タン|ライフ/);
  advance(state, input, 'result');
  assert.equal(state.game.id, 'boss'); assert.equal(state.game.extra.tier, 1); assert.equal(state.game.extra.hp, 18);
  assert.equal(state.duration, 20); assert.equal(state.level, 1);
});

test('Boss clock remains real time at high rush speed and freezes during intro, combat, and result pauses', () => {
  const { state, input } = bossRun(); state.level = 12;
  for (let frame = 0; frame < 60; frame++) stepRush(state, input, dt);
  assert.ok(Math.abs(state.game.time - 1) < 1e-9); assert.ok(Math.abs(state.elapsed - 1) < 1e-9);
  assert.equal(state.duration, 20);
  for (const phase of ['brief', 'play', 'result']) {
    state.phase = phase; state.phaseTime = 1.4;
    const before = JSON.stringify(state.game), elapsed = state.elapsed;
    input.actionHeld = true; input.pointerDown = true; pauseRush(state, input, true);
    for (let frame = 0; frame < 100; frame++) stepRush(state, input, dt);
    assert.equal(JSON.stringify(state.game), before); assert.equal(state.elapsed, elapsed); assert.equal(state.phaseTime, 1.4);
    assert.deepEqual(input, emptyRushInput()); pauseRush(state, input, false);
  }
});

test('Restart resets boss scheduling and records, and the boss stays outside the forty game catalog', () => {
  const { state, input } = bossRun(); beatBoss(state, input);
  state.clearsSinceBoss = 9; state.bossEncounters = 4; input.actionHeld = true; input.pointerDown = true;
  startRush(state, input);
  assert.equal(state.clearsSinceBoss, 0); assert.equal(state.bossEncounters, 0); assert.equal(state.bossesDefeated, 0);
  assert.equal(state.score, 0); assert.equal(state.duration, 5); assert.deepEqual(input, emptyRushInput());
  assert.equal(RUSH_GAMES.length, 40); assert.equal(RUSH_GAMES.some(game => game.id === 'boss'), false);
  assert.equal(rushDefinition('boss').name, 'ギアキング'); assert.notEqual(state.game.id, 'boss');
});
