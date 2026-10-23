import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createBossState, bossLaneX, BOSS_DURATION } = load('bossGame');
const { renderBossGame } = load('bossRender');
const { renderRush } = load('render');
const { createRushSession, emptyRushInput, startRush, stepRush } = load('engine');

function strictContext(labels = []) {
  return new Proxy({}, {
    get(_target, method) {
      if (method === 'measureText') return value => ({ width: String(value).length * 12 });
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(method)} received non-finite geometry`);
        if (method === 'arc') assert.ok(args[2] >= 0, 'negative circle radius');
        if (method === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0, 'negative ellipse radius');
        if (method === 'roundRect' || method === 'fillRect' || method === 'strokeRect') assert.ok(args[2] >= 0 && args[3] >= 0, 'negative rectangle dimensions');
        if (method === 'fillText') { assert.equal(typeof args[0], 'string'); labels.push(args[0]); }
        if (String(method).includes('Gradient')) return { addColorStop() {} };
      };
    },
    set(_target, property, value) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(property)} must be finite`);
      return true;
    },
  });
}

test('Boss rendering ignores unrelated games without drawing', () => {
  const context = new Proxy({}, { get() { assert.fail('unrelated games must not draw'); } });
  assert.equal(renderBossGame(context, { game: null }), false);
  assert.equal(renderBossGame(context, { game: { extra: { pack: 'arcade' } } }), false);
});

test('Boss warning, strike, opening, recharge, damage and defeat views preserve state and valid geometry', () => {
  const scenarios = [
    { stage: 'warning', stageTime: 0.6, dangerLanes: [1], targetLane: 0, bossX: 160, label: 'よけろ！ 1' },
    { stage: 'strike', stageTime: 0.2, phase: 2, hp: 12, dangerLanes: [0, 1], targetLane: 2, bossX: 480, playerX: 480, label: 'レーザー！' },
    { stage: 'open', stageTime: 0.4, phase: 3, hp: 6, bossX: 320, targetLane: 1, playerX: 320, shooting: true, shots: [{ x: 320, y: 290 }], label: 'コア OPEN！' },
    { stage: 'open', stageTime: 1.5, phase: 3, hp: 2, damageThisOpening: 5, targetLane: 1, shooting: true, label: 'コア 再充電' },
    { stage: 'warning', stageTime: 0.8, armor: 1, invulnerable: 0.5, phase: 3, hp: 4, dangerLanes: [1, 2], targetLane: 0, playerX: 160, label: 'よけろ！ 1' },
    { stage: 'open', hp: 0, phase: 3, bossHit: 0.12, targetLane: 0, bossX: 160, playerX: 160, label: 'BREAK!' },
  ];
  for (const { label, ...patch } of scenarios) {
    const labels = [], session = { game: { time: 3.3, extra: { ...createBossState(1), ...patch } } };
    const before = structuredClone(session);
    assert.equal(renderBossGame(strictContext(labels), session), true);
    assert.deepEqual(session, before, `${label} renderer changed the simulation`);
    assert.ok(labels.includes(label), `${label} status must identify the current combat state`);
    if (patch.hp === 0) assert.ok(!labels.includes('ここへ よける'), 'defeated bosses must not show active dodge instructions');
  }
});

test('The full boss renderer remains finite and read-only through a real three-phase victory', () => {
  const session = createRushSession(8701), input = emptyRushInput(), context = strictContext();
  startRush(session, input, 'boss');
  while (session.phase === 'brief') stepRush(session, input, 1 / 60);
  const seen = new Set();
  for (let frame = 0; frame < BOSS_DURATION * 60 && session.phase === 'play'; frame++) {
    const boss = session.game.extra;
    input.pointerDown = true; input.pointerX = bossLaneX(boss.targetLane);
    stepRush(session, input, 1 / 60);
    seen.add(`${boss.phase}:${boss.stage}`);
    if (frame % 6 === 0 || session.result) {
      const before = structuredClone(session);
      renderRush(context, session, frame / 60);
      assert.deepEqual(session, before, 'drawing a frame must not change boss progress or timing');
    }
  }
  assert.equal(session.result, 'success'); assert.equal(session.game.extra.hp, 0);
  for (const phase of [1, 2, 3]) assert.ok([...seen].some(value => value.startsWith(`${phase}:`)), `phase ${phase} was rendered`);
  for (const stage of ['warning', 'strike', 'open']) assert.ok([...seen].some(value => value.endsWith(`:${stage}`)), `${stage} was rendered`);
});
