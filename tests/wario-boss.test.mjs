import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush } = load('engine');
const { createBossState, bossLaneX, BOSS_DURATION, BOSS_GAME } = load('bossGame');
const dt = 1 / 120;

function ready(level = 1) {
  const state = createRushSession(7919), input = emptyRushInput();
  startRush(state, input, 'boss', 0);
  state.game.extra = createBossState(level);
  state.level = level;
  for (let frame = 0; frame < 400 && state.phase === 'brief'; frame++) stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input };
}

function steerAndShoot({ state, input }, pointer) {
  const boss = state.game.extra, target = bossLaneX(boss.targetLane);
  Object.assign(input, emptyRushInput());
  if (pointer) Object.assign(input, { pointerDown: true, pointerX: target, pointerY: boss.playerY });
  else {
    input.left = boss.playerX > target + 2;
    input.right = boss.playerX < target - 2;
    input.actionHeld = true;
  }
}

test('Boss has an independent definition and a capped, fresh three-phase state', () => {
  assert.equal(BOSS_GAME.id, 'boss'); assert.equal(BOSS_GAME.number, 'B'); assert.equal(BOSS_DURATION, 20);
  for (const level of [-10, 1, 2, 3, 7, Infinity, NaN]) {
    const boss = createBossState(level);
    assert.ok(boss.tier >= 1 && boss.tier <= 3);
    assert.equal(boss.hp, 18); assert.equal(boss.armor, 3);
    assert.equal(boss.phase, 1); assert.equal(boss.stage, 'warning');
    assert.ok(boss.stageDuration >= 1.1);
  }
  const first = createBossState(1), second = createBossState(1);
  first.shots.push({ x: 300, y: 300 }); first.dangerLanes.push(2);
  assert.equal(second.shots.length, 0); assert.deepEqual(second.dangerLanes, [1]);
});

for (const pointer of [false, true]) for (const level of [1, 7]) {
  test(`Boss can be defeated with ${pointer ? 'touch drag and hold' : 'arrows and held Space'} at tier ${level}`, () => {
    const run = ready(level), { state, input } = run, seenPhases = new Set(), stages = new Set();
    let maxOpeningDamage = 0, maxShots = 0;
    for (let frame = 0; frame < BOSS_DURATION / dt + 1 && state.phase === 'play'; frame++) {
      steerAndShoot(run, pointer); stepRush(state, input, dt);
      const boss = state.game.extra;
      seenPhases.add(boss.phase); stages.add(boss.stage);
      maxOpeningDamage = Math.max(maxOpeningDamage, boss.damageThisOpening);
      maxShots = Math.max(maxShots, boss.shots.length);
    }
    assert.equal(state.result, 'success', JSON.stringify(state.game.extra));
    assert.equal(state.game.extra.hp, 0); assert.equal(state.game.extra.armor, 3);
    assert.deepEqual([...seenPhases].sort(), [1, 2, 3]);
    assert.deepEqual([...stages].sort(), ['open', 'strike', 'warning']);
    assert.equal(maxOpeningDamage, 5); assert.ok(maxShots <= 4);
    assert.ok(state.elapsed < BOSS_DURATION && state.elapsed > 10);
  });
}

test('Waiting cannot damage the boss or award a free win', () => {
  const { state, input } = ready();
  for (let frame = 0; frame < BOSS_DURATION / dt + 1 && state.phase === 'play'; frame++) stepRush(state, input, dt);
  assert.equal(state.result, 'failure'); assert.equal(state.game.extra.hp, 18); assert.equal(state.score, 0);
});

test('Boss timing and projectile collisions remain playable at 30, 60, and 144 fps', () => {
  for (const fps of [30, 60, 144]) {
    const run = ready(7), { state, input } = run;
    for (let frame = 0; frame < BOSS_DURATION * fps + 1 && state.phase === 'play'; frame++) {
      steerAndShoot(run, true); stepRush(state, input, 1 / fps);
    }
    assert.equal(state.result, 'success', `${fps} fps`);
    assert.equal(state.game.extra.armor, 3, `${fps} fps`);
    assert.ok(state.elapsed < BOSS_DURATION);
  }
});

test('The shield blocks held fire until the telegraph and attack finish', () => {
  const run = ready(), { state, input } = run;
  while (state.game.time < 1.65) { steerAndShoot(run, true); stepRush(state, input, dt); }
  assert.equal(state.game.extra.stage, 'strike'); assert.equal(state.game.extra.hp, 18);
  while (state.game.time < 2.5) { steerAndShoot(run, true); stepRush(state, input, dt); }
  assert.equal(state.game.extra.stage, 'open'); assert.ok(state.game.extra.hp < 18);
});

test('The last phase speeds up warnings and openings while leaving a full second to dodge', () => {
  const run = ready(7), { state, input } = run, boss = state.game.extra;
  boss.hp = 6; boss.phase = 3; boss.stage = 'open'; boss.stageTime = 1.695; boss.stageDuration = 1.7;
  stepRush(state, input, dt);
  assert.equal(boss.stage, 'warning'); assert.equal(boss.stageDuration, 1);
  assert.equal(boss.dangerLanes.length, 2);
  while (boss.stage !== 'open') { steerAndShoot(run, true); stepRush(state, input, dt); }
  assert.equal(boss.stageDuration, 1.5); assert.equal(boss.armor, 3);
});

test('Each beam strike costs one armor and the third hit ends the encounter', () => {
  const { state, input } = ready(), boss = state.game.extra;
  for (let hit = 0; hit < 3; hit++) {
    boss.stage = 'strike'; boss.stageTime = 0; boss.stageDuration = 0.5;
    boss.invulnerable = 0; boss.playerX = bossLaneX(boss.dangerLanes[0]);
    stepRush(state, input, dt);
    assert.equal(boss.armor, 2 - hit);
    if (hit < 2) {
      for (let frame = 0; frame < 40; frame++) stepRush(state, input, dt);
      assert.equal(boss.armor, 2 - hit, 'sustained contact cannot cost repeated armor');
    }
  }
  assert.equal(state.result, 'failure');
});

test('Safe lanes avoid strike damage and movement stays inside the arena', () => {
  const { state, input } = ready(), boss = state.game.extra;
  boss.stage = 'strike'; boss.stageTime = 0; boss.stageDuration = 0.5;
  boss.playerX = bossLaneX(boss.targetLane);
  for (let frame = 0; frame < 50; frame++) stepRush(state, input, dt);
  assert.equal(boss.armor, 3);
  input.left = true;
  for (let frame = 0; frame < 200; frame++) stepRush(state, input, dt);
  assert.equal(boss.playerX, 58);
  input.left = false; input.pointerDown = true; input.pointerX = 9999;
  for (let frame = 0; frame < 200; frame++) stepRush(state, input, dt);
  assert.equal(boss.playerX, 582);
  assert.ok(boss.shots.every(shot => Number.isFinite(shot.x) && shot.y >= 122));
  assert.ok(boss.particles.every(particle => particle.life > 0));
});

test('Pause freezes all boss systems, clears shooting, and restart discards combat state', () => {
  const run = ready(7), { state, input } = run;
  for (let frame = 0; frame < 100; frame++) { steerAndShoot(run, true); stepRush(state, input, dt); }
  pauseRush(state, input, true);
  const frozen = JSON.stringify(state.game.extra), elapsed = state.elapsed;
  for (let frame = 0; frame < 300; frame++) stepRush(state, input, dt);
  assert.equal(JSON.stringify(state.game.extra), frozen); assert.equal(state.elapsed, elapsed);
  assert.equal(input.pointerDown, false); assert.equal(input.actionHeld, false);
  pauseRush(state, input, false); stepRush(state, input, dt);
  assert.equal(state.game.extra.shooting, false);
  const old = state.game.extra;
  startRush(state, input, 'boss');
  assert.notEqual(state.game.extra, old); assert.equal(state.game.extra.hp, 18);
  assert.equal(state.game.extra.armor, 3); assert.equal(state.game.extra.shots.length, 0);
  assert.equal(state.game.extra.stageTime, 0); assert.equal(state.elapsed, 0);
});
