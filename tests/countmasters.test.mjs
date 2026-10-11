import test from 'node:test';
import assert from 'node:assert/strict';
import { createCountGame } from './helpers/countmasters-harness.mjs';

const prefix = 'countmasters_';
const upgraded = { [prefix + 'upgrades_v1']: { startCrowdLevel: 10, attackPowerLevel: 1, coinBonusLevel: 2 } };
const start = (game) => { game.click('バトル開始'); game.advance(1 / 60); };
const stripCourse = (game) => {
  const scene = game.snapshot();
  scene.gates.length = 0; scene.obstacles.length = 0; scene.mobs.length = 0; scene.coins.length = 0;
  return scene;
};

test('30, 60, 120 and 144 Hz displays advance the same distance and steering', () => {
  const runs = [30, 60, 120, 144].map((hz) => {
    const game = createCountGame(); start(game); stripCourse(game);
    game.emit('keydown', { key: 'ArrowLeft' }); game.advance(1, hz);
    return game.snapshot().stickmen[0];
  });
  for (const run of runs) {
    assert.ok(Math.abs(run.z - runs[0].z) < 1e-7);
    assert.ok(Math.abs(run.x - runs[0].x) < 1e-7);
  }
});

test('HUD progresses while running, shows current coins and population', () => {
  const game = createCountGame(); start(game);
  game.advance(0.4);
  assert.match(game.text(), /\(\+\d+\)/);
  assert.match(game.text(), /仲間 1 人/);
  assert.doesNotMatch(game.text(), /START0%/);
});

test('inactive spikes are safe and active spikes use their full rectangle', () => {
  const game = createCountGame();
  const obstacle = { type: 'spikes', x: 0, z: 0, width: 70, length: 80, radius: 10, active: false, phase: 0 };
  assert.equal(game.logic.obstacleHits(obstacle, 0, 0), false);
  obstacle.active = true;
  assert.equal(game.logic.obstacleHits(obstacle, 30, 30), true);
  assert.equal(game.logic.obstacleHits(obstacle, 50, 0), false);
  start(game); const scene = stripCourse(game);
  scene.obstacles.push({ ...obstacle, z: 130, phase: Math.PI * 1.5, speed: 0 });
  game.advance(0.2);
  assert.equal(game.snapshot().crowdCount, 1);
  assert.ok(!game.text().includes('GAME OVER'));
});

test('a lethal gate ends the frame before boss entry; retry resets all state', () => {
  const game = createCountGame(); start(game);
  const scene = stripCourse(game); scene.boss.z = 320;
  scene.gates.push({ id: 1, z: 140, width: 220,
    leftOption: { op: '-', val: 10, passed: false }, rightOption: { op: '-', val: 10, passed: false } });
  game.advance(0.2);
  assert.match(game.text(), /GAME OVER/);
  assert.equal(scene.boss.state, 'idle');
  game.click('リトライ'); game.advance(1 / 60);
  assert.equal(game.snapshot().crowdCount, 1);
  assert.equal(game.snapshot().gates[0].leftOption.passed, false);
});

test('the population record never decreases after a loss and another positive gate', () => {
  const game = createCountGame(); start(game); const scene = stripCourse(game);
  for (const [z, op, val] of [[140, '+', 100], [160, '-', 90], [180, '+', 20]]) scene.gates.push({ id: z, z, width: 220,
    leftOption: { op, val, passed: false }, rightOption: { op, val, passed: false } });
  game.advance(0.4);
  assert.equal(game.snapshot().crowdCount, 31);
  assert.equal(JSON.parse(game.storage.get(prefix + 'max_crowd_v1')), 101);
});

test('pause and automatic pause freeze movement and BGM; returning to title clears pause', () => {
  const game = createCountGame(); start(game); stripCourse(game);
  game.emit('keydown', { code: 'KeyP' });
  const z = game.snapshot().stickmen[0].z;
  game.advance(1);
  assert.equal(game.snapshot().stickmen[0].z, z);
  assert.match(game.text(), /一時停止中/);
  game.click('タイトルへ');
  assert.doesNotMatch(game.text(), /一時停止中/);
  start(game); game.hidden(); game.advance(0.2);
  assert.match(game.text(), /一時停止中/);
  assert.ok(game.sounds.includes('stopBgm'));
  assert.ok(!game.sounds.includes('startBgm'));
});

test('boss stays in front of the camera and cannot retaliate after lethal damage', () => {
  const game = createCountGame(); start(game); const scene = stripCourse(game);
  scene.boss.z = 285; game.advance(1 / 60);
  scene.boss.hp = 0.01; game.setRandom(0);
  game.advance(1 / 60);
  assert.equal(game.snapshot().crowdCount, 1);
  assert.equal(scene.boss.state, 'defeated');
  assert.match(game.text(), /ボーナスタワー/);
  const longFight = createCountGame(); start(longFight);
  const fightScene = stripCourse(longFight); fightScene.boss.z = 285; fightScene.boss.hp = 10000;
  longFight.advance(10);
  assert.ok(longFight.snapshot().camZ <= fightScene.boss.z - 245);
  assert.ok(!longFight.text().includes('VICTORY'));
});

test('stairs respect required crowd counts, including fewer than six survivors', () => {
  const game = createCountGame(); const stairs = game.stages.createStairSteps(1000);
  for (const [count, expected] of [[1, -1], [5, -1], [6, 0], [11, 0], [12, 1], [90, 14]]) {
    assert.equal(game.logic.highestAffordableStep(stairs, count), expected);
  }
});

test('clear pays once, applies fractional coin bonus in total, unlocks the next stage', () => {
  const game = createCountGame({ save: upgraded }); start(game);
  const scene = stripCourse(game); scene.boss.z = 285; scene.boss.hp = 0.01;
  for (let i = 0; i < 4; i++) scene.coins.push({ x: 0, z: 120, y: 6, rot: 0, collected: false });
  game.advance(12);
  assert.match(game.text(), /VICTORY/);
  assert.equal(JSON.parse(game.storage.get(prefix + 'cleared_stage_v1')), 2);
  const payments = game.writes.filter((write) => write.key === prefix + 'total_coins_v1');
  assert.equal(payments.length, 1);
  // 28 survivors afford step 4 (×2.5); four coins at +25% become five, then ×2.5 + 50.
  assert.equal(Number(payments[0].value), 100 + Math.round(5 * 2.5) + 50);
  const bank = payments[0].value; game.advance(3);
  assert.equal(game.storage.get(prefix + 'total_coins_v1'), bank);
  assert.ok(!game.text().includes('(+'));
});

test('invalid saves and disabled storage remain playable, with valid level bounds', () => {
  for (const options of [
    { blockedStorage: true },
    { save: { [prefix + 'upgrades_v1']: null, [prefix + 'cleared_stage_v1']: 99, [prefix + 'total_coins_v1']: -500,
      [prefix + 'skins_v1']: {}, [prefix + 'high_score_v1']: 'NaN' } },
    { save: { [prefix + 'upgrades_v1']: { startCrowdLevel: -2, attackPowerLevel: 50, coinBonusLevel: '3' } } },
  ]) {
    const game = createCountGame(options); start(game); game.advance(0.2);
    assert.equal(game.snapshot().crowdCount, 1);
    assert.ok(!game.text().includes('NaN'));
  }
});

test('skin and mute selection persist and stay reachable on the title screen', () => {
  const game = createCountGame({ save: { [prefix + 'total_coins_v1']: 1000 } });
  assert.equal(game.button('サウンドをオンにする').props['aria-pressed'], true);
  game.click('ショップ・強化'); game.click('ゴールデン・キングを購入（300コイン）');
  assert.equal(JSON.parse(game.storage.get(prefix + 'selected_skin_v1')), 'gold_king');
  game.click('タイトルへ戻る'); start(game);
  assert.equal(game.snapshot().skin.id, 'gold_king');
});

test('large crowds are bounded and fullscreen scene scales proportionally', () => {
  const game = createCountGame({ fullscreen: true, width: 1920, height: 1016 });
  assert.equal(game.logic.applyGate(1500, '×', 5), 2000);
  assert.equal(game.logic.applyGate(5, '÷', 3), 1);
  assert.equal(game.logic.applyGate(5, '-', 10), 0);
  assert.ok(game.logic.getSceneScale(1920, 1016) > game.logic.getSceneScale(800, 650));
  assert.ok(game.snapshot().height >= 600);
  assert.equal(game.canvas.width, 2400);
  assert.match(game.tree().props.className, /max-w-none/);
  assert.equal(game.logic.advanceClock(0, 5000).steps, 6);
});

test('global header and game mute controls stay in sync', () => {
  const game = createCountGame(); start(game);
  game.sound.setMuted(false); game.advance(1 / 60);
  assert.equal(game.audio.isMuted, false);
  assert.equal(game.button('サウンドをミュートにする').props['aria-pressed'], false);
  game.sound.setMuted(true); game.advance(1 / 60);
  assert.equal(game.audio.isMuted, true);
  assert.equal(game.button('サウンドをオンにする').props['aria-pressed'], true);
  assert.equal(game.storage.get(prefix + 'muted_v1'), 'true');
});

test('all five real courses reach a clear with steering; stage 1 also clears without upgrades', () => {
  for (const [stageId, level] of [[1, 1], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10]]) {
    const game = createCountGame({ save: {
      [prefix + 'cleared_stage_v1']: stageId,
      [prefix + 'upgrades_v1']: { startCrowdLevel: level, attackPowerLevel: 1, coinBonusLevel: 1 },
    } });
    start(game);
    for (let i = 0; i < 3000 && !/VICTORY|GAME OVER/.test(game.text()); i++) {
      const scene = game.snapshot();
      const gate = scene.gates.find((item) => !item.leftOption.passed && !item.rightOption.passed);
      let target = 0;
      if (gate && !scene.isBossBattle && !scene.isStairsClimb) {
        const left = game.logic.applyGate(scene.crowdCount, gate.leftOption.op, gate.leftOption.val);
        const right = game.logic.applyGate(scene.crowdCount, gate.rightOption.op, gate.rightOption.val);
        target = (gate.offsetX ?? 0) + (left >= right ? -70 : 70);
        target = Math.max(-92, Math.min(92, target));
        const z = scene.camZ + 180;
        const hazards = [...scene.obstacles, ...scene.mobs.filter((mob) => mob.currentCount > 0)]
          .filter((item) => item.z < gate.z - 120 && item.z >= z - 55 && item.z <= z + 270);
        if (hazards.length) {
          const safety = (lane) => Math.min(...hazards.map((item) => Math.abs(lane - item.x)));
          target = [-92, 0, 92].sort((a, b) => safety(b) - safety(a))[0];
        }
      }
      const x = scene.camX / 0.35;
      for (const [key, pressed] of [['ArrowLeft', x > target + 5], ['ArrowRight', x < target - 5]]) {
        game.emit(pressed ? 'keydown' : 'keyup', { key });
      }
      game.advance(1 / 60);
    }
    assert.match(game.text(), /VICTORY/, `Stage ${stageId}, starting level ${level}`);
    assert.ok(Number(game.storage.get(prefix + 'high_score_v1')) > 0);
    game.destroy();
  }
});
