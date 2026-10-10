import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

import { createGame } from './helpers/spin-doctor-harness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const allUnlocked = { records: Object.fromEntries(Array.from({ length: 15 }, (_, index) => [index + 1,
  { cleared: true, stars: 1, bestTime: 0, highScore: 0 }])) };
const { logic, STAGES } = createGame();
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('all 15 stages have a route through switches, barriers and automatic warps', () => {
  for (const stage of STAGES) {
    const queue = [{ pivot: stage.startPinId, gates: 0 }];
    const visited = new Set();
    const reachedPins = new Set();
    let goalReached = false;
    while (queue.length) {
      const { pivot, gates } = queue.shift();
      const key = `${pivot}:${gates}`;
      if (visited.has(key)) continue;
      visited.add(key);
      reachedPins.add(pivot);
      const current = stage.pins.find((pin) => pin.id === pivot);
      if (current.type === 'goal') goalReached = true;
      for (const pin of stage.pins) {
        if (!logic.canReachPin(current, pin)) continue;
        const blocked = (stage.walls ?? []).some((wall) => logic.segmentDistance(current.x, current.y,
          pin.x, pin.y, wall.x1, wall.y1, wall.x2, wall.y2) <= 7)
          || (stage.laserGates ?? []).some((gate) => !gate.isOpen && !(gates & (1 << gate.id))
            && logic.segmentDistance(current.x, current.y, pin.x, pin.y, gate.x1, gate.y1, gate.x2, gate.y2) <= 6);
        if (blocked) continue;
        reachedPins.add(pin.id);
        queue.push({ pivot: pin.type === 'warp' ? pin.warpTargetId : pin.id,
          gates: pin.type === 'switch' ? gates ^ (1 << pin.switchGateId) : gates });
      }
    }
    assert.ok(goalReached, `Stage ${stage.stageNumber}: goal must be reachable`);
    for (const pin of stage.pins.filter((pin) => pin.type === 'switch')) {
      assert.ok(reachedPins.has(pin.id), `Stage ${stage.stageNumber}: switch ${pin.id} must be reachable`);
    }
    for (const gear of stage.gears ?? []) {
      assert.ok(stage.pins.some((pin) => reachedPins.has(pin.id)
        && Math.hypot(pin.x - gear.x, pin.y - gear.y) < logic.ROD_LENGTH + 26),
      `Stage ${stage.stageNumber}: gear ${gear.id} must be within a reachable rod's range`);
    }
  }
});

test('whole-rod geometry detects crossings, parallel lines and point segments', () => {
  assert.equal(logic.segmentDistance(0, 0, 70, 0, 35, -20, 35, 20), 0);
  assert.equal(logic.segmentDistance(0, 0, 70, 0, 20, 5, 50, 5), 5);
  assert.equal(logic.segmentDistance(0, 0, 70, 0, 20, 0, 50, 0), 0);
  assert.equal(logic.pointSegmentDistance(35, 10, 0, 0, 70, 0), 10);
  assert.equal(logic.pointSegmentDistance(3, 4, 0, 0, 0, 0), 5);
});

test('acid and decayed pins are never offered as latch targets', () => {
  const pivot = { id: 1, x: 0, y: 0, type: 'normal' };
  for (const pin of [{ id: 2, x: 70, y: 0, type: 'acid' },
    { id: 2, x: 70, y: 0, type: 'normal', isDecayed: true }]) {
    assert.equal(logic.findLatchTarget([pivot, pin], pivot, 0), null);
  }
});

test('rotation and timer match at 30, 60 and 144 Hz', () => {
  const states = [30, 60, 144].map((hz) => { const game = createGame(); game.advance(1, hz); return game.state(); });
  states.forEach((state) => { near(state.angle, 0.052 * 60); near(state.timeRemaining, 39); });
});

test('patrol speed and orbit speed are independent of frame rate', () => {
  for (const type of ['patrol', 'orbit']) {
    const enemies = [30, 60, 144].map((hz) => {
      const enemy = { id: 1, x: 0, y: 0, radius: 12, type,
        p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 }, speed: 1.8, progress: 0.9, dir: 1,
        centerX: 0, centerY: 0, orbitRadius: 46, orbitSpeed: -0.04, angle: 0 };
      for (let i = 0; i < hz; i++) logic.advanceEnemy(enemy, 1 / hz);
      return enemy;
    });
    enemies.forEach((enemy) => { near(enemy.x, enemies[0].x); near(enemy.y, enemies[0].y); });
  }
  const slow = { ...STAGES[8].enemies[0] };
  const fast = { ...slow, speed: slow.speed * 2 };
  logic.advanceEnemy(slow, 0.1);
  logic.advanceEnemy(fast, 0.1);
  near(fast.progress, slow.progress * 2);
});

test('Undo restores combo, enemies, gears, timer and score, and releases turbo', () => {
  const game = createGame(allUnlocked);
  game.selectStage(9);
  const before = plain(game.state());
  game.key('Space');
  assert.equal(game.state().pivotPinId, 2);
  game.advance(0.1);
  game.key('KeyW');
  assert.equal(game.state().isTurbo, true);
  game.key('KeyZ');
  for (const field of ['pivotPinId', 'angle', 'direction', 'score', 'combo', 'timeRemaining',
    'lastLatchTime', 'elapsedTime', 'enemies', 'gears', 'pins', 'laserGates']) {
    assert.deepEqual(plain(game.state()[field]), before[field], `Undo restores ${field}`);
  }
  assert.equal(game.state().isTurbo, false);
  assert.equal(game.state().nearTargetPin, null);
  assert.equal(game.state().status, 'playing');
});

test('first latch starts at combo 1, and held Space/flip keys do not repeat', () => {
  const game = createGame();
  game.key('Space');
  assert.equal(game.state().combo, 1);
  const direction = game.state().direction;
  game.key('ArrowDown', { repeat: true });
  assert.equal(game.state().direction, direction);
  const score = game.state().score;
  game.key('Space', { repeat: true });
  assert.equal(game.state().score, score);
});

test('timeout ends the frame immediately and initial Undo recovers safely', () => {
  const game = createGame();
  game.state().timeRemaining = 0.001;
  const angle = game.state().angle;
  game.advance(1 / 60);
  assert.equal(game.state().status, 'miss');
  assert.equal(game.state().angle, angle);
  game.key('KeyZ');
  assert.equal(game.state().status, 'playing');
  assert.equal(game.state().timeRemaining, 40);
});

test('help, stage selection and manual pause freeze time and reject game input', () => {
  const game = createGame();
  for (const open of [() => game.click('スピンドクターの遊び方'), () => game.click('STAGE 1')]) {
    open();
    const before = plain(game.state());
    game.advance(2);
    game.key('Space'); game.key('KeyR'); game.key('KeyZ');
    assert.equal(game.state().timeRemaining, before.timeRemaining);
    assert.equal(game.state().pivotPinId, before.pivotPinId);
    assert.equal(game.state().angle, before.angle);
    game.key('Escape');
  }
  game.key('KeyP');
  game.advance(2);
  assert.equal(game.state().timeRemaining, 40);
  game.key('KeyP');
  game.advance(1);
  near(game.state().timeRemaining, 39);
});

test('turbo releases on cancellation or focus loss and handles simultaneous keys', () => {
  const game = createGame();
  game.key('KeyW'); game.key('ArrowUp');
  game.emit('keyup', { code: 'KeyW' });
  assert.equal(game.state().isTurbo, true);
  game.emit('keyup', { code: 'ArrowUp' });
  assert.equal(game.state().isTurbo, false);
  game.button('TURBO').props.onPointerDown({ button: 0, pointerId: 1, preventDefault() {}, currentTarget: { setPointerCapture() {} } });
  assert.equal(game.state().isTurbo, true);
  game.button('TURBO').props.onPointerCancel();
  assert.equal(game.state().isTurbo, false);
  game.key('KeyW');
  game.emit('blur');
  assert.equal(game.state().isTurbo, false);
  const before = game.state().timeRemaining;
  game.advance(1);
  assert.equal(game.state().timeRemaining, before);
  game.emit('focus');
  game.advance(1);
  assert.equal(game.state().timeRemaining, before, 'focus alone does not restart the timer');
});

test('middle of the rod collects gears and collides with lasers and enemies', () => {
  const gearGame = createGame();
  gearGame.state().gears = [{ id: 1, x: 285, y: 280, collected: false }];
  gearGame.advance(1 / 60);
  assert.equal(gearGame.state().gears[0].collected, true);
  const laserGame = createGame();
  laserGame.state().laserGates = [{ id: 1, x1: 285, y1: 270, x2: 285, y2: 290, isOpen: false }];
  laserGame.advance(1 / 60);
  assert.equal(laserGame.state().status, 'miss');
  const enemyGame = createGame();
  enemyGame.state().enemies = [{ id: 1, x: 285, y: 280, radius: 8, type: 'patrol' }];
  enemyGame.advance(1 / 60);
  assert.equal(enemyGame.state().status, 'miss');
});

test('latch cannot jump through a wall or a closed laser', () => {
  for (const field of ['walls', 'laserGates']) {
    const game = createGame();
    game.state()[field] = [{ id: 1, x1: 285, y1: 270, x2: 285, y2: 290, isOpen: false }];
    game.key('Space');
    assert.equal(game.state().pivotPinId, 1);
    assert.equal(game.state().score, 0);
  }
});

test('switches, warps and decaying pins restore their pre-latch state on Undo', () => {
  const switchGame = createGame(allUnlocked);
  switchGame.selectStage(5);
  switchGame.key('Space');
  switchGame.state().angle = -Math.PI / 2;
  switchGame.key('Space');
  assert.equal(switchGame.state().pivotPinId, 3);
  assert.equal(switchGame.state().laserGates[0].isOpen, true);
  switchGame.key('KeyZ');
  assert.equal(switchGame.state().pivotPinId, 2);
  assert.equal(switchGame.state().laserGates[0].isOpen, false);

  const warpGame = createGame(allUnlocked);
  warpGame.selectStage(7);
  warpGame.key('Space');
  warpGame.state().angle = 0;
  warpGame.key('Space');
  assert.equal(warpGame.state().pivotPinId, 4);
  warpGame.key('KeyZ');
  assert.equal(warpGame.state().pivotPinId, 2);
  assert.equal(warpGame.state().angle, 0);

  const decayGame = createGame(allUnlocked);
  decayGame.selectStage(6);
  decayGame.key('Space');
  decayGame.advance(0.1);
  assert.ok(decayGame.state().pins[1].decayTimer < 2.2);
  decayGame.key('KeyZ');
  assert.equal(decayGame.state().pins[1].decayTimer, 2.2);
  assert.equal(decayGame.state().pivotPinId, 1);
});

test('wall bounce rolls back out of the wall instead of oscillating inside it', () => {
  const game = createGame();
  const state = game.state();
  state.angle = -0.25;
  state.walls = [{ x1: 285, y1: 280, x2: 285, y2: 310 }];
  game.advance(0.2);
  assert.equal(state.direction, -1);
  assert.ok(state.angle < -0.25);
  assert.equal(state.status, 'playing');
});

test('green latch target uses the same barrier and hazard checks as the action', () => {
  const pivot = { id: 1, x: 0, y: 0, type: 'normal' };
  const goal = { id: 2, x: 70, y: 0, type: 'goal' };
  assert.equal(logic.findLatchTarget([pivot, goal], pivot, 0)?.id, 2);
  assert.equal(logic.findLatchTarget([pivot, goal], pivot, 0,
    { walls: [{ x1: 35, y1: -20, x2: 35, y2: 20 }] }), null);
  assert.equal(logic.findLatchTarget([pivot, goal, { id: 3, x: 35, y: 0, type: 'acid' }], pivot, 0), null);
  assert.equal(logic.findLatchTarget([pivot, goal], pivot, 0,
    { enemies: [{ id: 1, type: 'patrol', x: 35, y: 0, radius: 8 }] }), null);
});

test('clear score/bonus/stars match the saved record and clear cannot be undone', () => {
  const game = createGame();
  const state = game.state();
  state.pivotPinId = 4;
  state.angle = 0;
  state.timeRemaining = 10.12345;
  state.score = 300;
  game.key('Space');
  assert.equal(state.status, 'cleared');
  const record = JSON.parse(game.storage.get('spindoctor_save_v1')).records[1];
  assert.equal(record.highScore, 400 + Math.round(10.12345 * 50));
  assert.equal(state.score, record.highScore);
  assert.equal(record.stars, 1);
  assert.equal(game.nodes().filter((node) => node.type === 'div' && node.props.children === '★').length, 3);
  assert.equal(game.nodes().filter((node) => node.type === 'div' && node.props.children === '★'
    && node.props.className.includes('text-amber-400')).length, 1);
  game.key('KeyZ'); game.key('Space');
  assert.equal(state.status, 'cleared');
  assert.equal(game.writes.filter((key) => key === 'spindoctor_save_v1').length, 1);
  game.key('KeyR');
  assert.equal(state.status, 'playing');
  assert.equal(state.pivotPinId, 1);
  assert.equal(state.score, 0);
});

test('star thresholds and fullscreen scaling preserve expected limits', () => {
  assert.equal(logic.getStarCount(0, 40, 40), 1);
  assert.equal(logic.getStarCount(2, 40, 40), 2);
  assert.equal(logic.getStarCount(3, 9.99, 40), 2);
  assert.equal(logic.getStarCount(3, 10, 40), 3);
  for (const [width, height] of [[320, 400], [844, 160], [1920, 900], [2560, 1300]]) {
    const size = logic.fitCanvas(width, height, true);
    assert.ok(size.width <= width + 1e-9 && size.height <= height + 1e-9);
    near(size.width / size.height, 800 / 560);
  }
  assert.equal(logic.fitCanvas(1920, 1200, false).width, 800);
  assert.ok(logic.fitCanvas(1920, 1200, true).width > 800);
});

test('malformed saved games cannot crash or unlock stages with invalid totals', () => {
  for (const save of [null, [], { records: null }, { records: 'broken' }, { totalStars: 1000 }]) {
    assert.deepEqual(plain(logic.normalizeSaveData(save, 15)), { records: {}, totalStars: 0, totalScore: 0 });
  }
  const loaded = logic.normalizeSaveData({ records: {
    1: { cleared: true, stars: 90, highScore: 1500, bestTime: -4 },
    2: { cleared: 'yes', stars: 3 }, 99: { cleared: true, stars: 3 },
  } }, 15);
  assert.equal(loaded.totalStars, 3);
  assert.equal(loaded.totalScore, 1500);
  assert.equal(loaded.records[1].bestTime, 0);
});

test('mute preference persists and notifies both controls until unsubscribed', () => {
  const storage = new Map();
  const code = ts.transpileModule(readFileSync(resolve(root, 'src/utils/audio.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const load = () => {
    const exports = {};
    vm.runInNewContext(code, { exports, localStorage });
    return exports.sound;
  };
  const sound = load();
  const header = [];
  const game = [];
  const unsubscribe = sound.subscribeMute((value) => header.push(value));
  sound.subscribeMute((value) => game.push(value));
  assert.equal(sound.toggleMute(), true);
  assert.equal(load().getMuted(), true, 'reload keeps the test silent');
  assert.deepEqual(header, [false, true]);
  assert.deepEqual(game, [false, true]);
  unsubscribe();
  sound.setMuted(false);
  assert.deepEqual(header, [false, true]);
  assert.deepEqual(game, [false, true, false]);
});
