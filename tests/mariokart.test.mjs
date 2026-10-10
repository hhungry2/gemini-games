import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Compile the actual engine using the project's existing TypeScript dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src/games/mariokart');
const modules = new Map();
function load(name) {
  const path = resolve(root, `${name}.ts`);
  if (modules.has(path)) return modules.get(path);
  const module = { exports: {} };
  modules.set(path, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function('require', 'module', 'exports', outputText)(
    (specifier) => load(specifier.replace('./', '')), module, module.exports);
  return module.exports;
}
const { createRaceKarts, scoreGrandPrixRace, getGrandPrixStandings, readBestTimes, readTrophies, saveRecord } = load('race');
const { updateRaceProgress, updatePlayerKart, updateRivalAI, checkKartCollisions, triggerCrash, useKartItem } = load('physics');
load('audio').marioKartAudio.setMuted(true);
const inputs = () => ({ accelerate: false, brake: false, left: false, right: false, drift: false, useItem: false, rearView: false });
function track(theme = 'circuit') {
  const waypoints = [{ x: 500, y: 800 }, { x: 800, y: 800 }, { x: 800, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 800 }];
  return {
    id: 'mario_circuit', worldSize: 1024, laps: 3, theme,
    startPos: { ...waypoints[0], angle: 0 }, waypoints,
    checkpoints: waypoints.map((point) => ({ ...point, radius: 75 })),
    gridPositions: Array.from({ length: 8 }, (_, i) => ({ x: 460 - Math.floor(i / 2) * 38, y: 782 + i % 2 * 36, angle: 0 })),
    itemBoxes: [], coins: [], boostPads: [], oilSlicks: [], jumpPads: [],
  };
}
const player = (course = track()) => createRaceKarts(course, 'mario', 'time_trial')[0];

test('Time trial runs alone; VS and GP have eight distinct drivers with correct grid ranks', () => {
  for (const mode of ['time_trial', 'vs_race', 'grand_prix']) {
    const karts = createRaceKarts(track(), 'mario', mode);
    assert.equal(karts.length, mode === 'time_trial' ? 1 : 8);
    assert.equal(new Set(karts.map(kart => kart.charId)).size, karts.length);
    assert.equal(karts.find(kart => kart.isPlayer).rank, mode === 'time_trial' ? 1 : mode === 'grand_prix' ? 8 : 5);
  }
});

test('A lap requires sequential checkpoints and a forward crossing of the finish line', () => {
  const course = track(); const kart = player(course);
  kart.x = 510; updateRaceProgress([kart], course, 1); assert.equal(kart.lap, 1);
  for (const waypoint of course.waypoints.slice(1)) {
    kart.x = waypoint.x; kart.y = waypoint.y; updateRaceProgress([kart], course, 2);
  }
  kart.x = 490; kart.y = 800; updateRaceProgress([kart], course, 3);
  assert.equal(kart.lap, 1, 'being inside the finish radius is not a completed lap');
  kart.x = 510; updateRaceProgress([kart], course, 4);
  assert.equal(kart.lap, 2);
  kart.checkpointIndex = course.checkpoints.length - 1;
  kart.x = 490; updateRaceProgress([kart], course, 5);
  assert.equal(kart.lap, 2, 'reverse crossing does not count');
});

test('Rivals finish too; exact finish order and finish times stay fixed', () => {
  const course = track(); const karts = createRaceKarts(course, 'mario', 'vs_race');
  const first = karts.find(kart => !kart.isPlayer); const second = karts.find(kart => kart.isPlayer);
  for (const kart of [first, second]) { kart.lap = 3; kart.checkpointIndex = 4; kart.y = 800; kart.previousX = 490; kart.previousY = 800; kart.x = 510; }
  updateRaceProgress([first], course, 10); assert.equal(first.finished, true);
  updateRaceProgress([first, second], course, 11);
  assert.equal(first.rank, 1); assert.equal(second.rank, 2);
  const time = first.finishTime;
  updateRaceProgress([first, second], course, 50);
  assert.equal(first.finishTime, time); assert.equal(first.lap, 4); assert.equal(first.rank, 1);
  const snapshot = structuredClone(first);
  updatePlayerKart(first, { ...inputs(), accelerate: true }, course, '150cc', [], [], karts, 1 / 60);
  triggerCrash(first, 'crash', []);
  assert.deepEqual(first, snapshot);
});

test('GP scores include all eight racers and replacing a retried course cannot double points', () => {
  const karts = createRaceKarts(track(), 'mario', 'grand_prix');
  const results = { mario_circuit: scoreGrandPrixRace(karts) };
  assert.deepEqual(Object.values(results.mario_circuit), [9, 6, 3, 1, 0, 0, 0, 0]);
  karts.find(kart => kart.isPlayer).rank = 1; karts[0].rank = 8;
  results.mario_circuit = scoreGrandPrixRace(karts);
  const standings = getGrandPrixStandings(results);
  assert.equal(standings.find(entry => entry.character.id === 'mario').points, 9);
  assert.equal(standings[0].character.id, 'mario');
  assert.equal(Object.keys(results).length, 1);
});

test('Braking wins over acceleration, including simultaneous mobile button presses', () => {
  const course = track(); const kart = player(course); kart.speed = 5;
  updatePlayerKart(kart, { ...inputs(), accelerate: true, brake: true }, course, '100cc', [], [], [kart], 1 / 60);
  assert.ok(kart.speed < 5);
});

test('A boost or star cannot let the player escape Rainbow Road recovery', () => {
  for (const bonus of ['boostTimer', 'starTimer']) {
    const course = track('rainbow'); const kart = player(course);
    kart.x = -100; kart.y = -100; kart[bonus] = 5;
    updatePlayerKart(kart, inputs(), course, '100cc', [], [], [kart], 1 / 60);
    assert.equal(kart.x, course.waypoints[0].x); assert.equal(kart.y, course.waypoints[0].y);
    assert.equal(kart.speed, 0); assert.ok(kart.spinTimer > 0);
  }
});

test('Non-rainbow tracks keep karts inside the world boundary', () => {
  const course = track(); const kart = player(course); kart.x = 1020; kart.speed = 9;
  updatePlayerKart(kart, { ...inputs(), accelerate: true }, course, '100cc', [], [], [kart], 1 / 60);
  assert.equal(kart.x, 1012); assert.equal(kart.speed, 0);
});

test('Kart collisions resolve the complete overlap and ignore finished racers', () => {
  const course = track(); const a = player(course); const b = { ...a, id: 'other', x: a.x + 10 };
  checkKartCollisions([a, b], []);
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 24) < 1e-8);
  a.finished = true; b.x = a.x + 5;
  const before = structuredClone([a, b]); checkKartCollisions([a, b], []);
  assert.deepEqual([a, b], before);
});

test('An AI star does not start an endless player star-music loop', () => {
  const rival = { ...player(), isPlayer: false, item: 'star' };
  const audio = load('audio').marioKartAudio;
  const original = audio.startStarBgm; let starts = 0;
  audio.startStarBgm = () => starts++;
  try { useKartItem(rival, [], [rival], [], false); assert.equal(starts, 0); assert.equal(rival.starTimer, 8); }
  finally { audio.startStarBgm = original; }
});

test('All seven rivals complete every real course in all three engine classes', () => {
  const original = globalThis.document;
  // Track artwork is irrelevant to navigation; retain the real course geometry.
  const context = new Proxy({}, { get: (_, key) => {
    if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(1024 * 1024 * 4) });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  } });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  try {
    const { TRACK_LIST, createTrackInstance } = load('tracks');
    for (const engine of ['50cc', '100cc', '150cc']) {
      for (const config of TRACK_LIST) {
        const course = createTrackInstance(config.id);
        course.itemBoxes = [];
        const karts = createRaceKarts(course, 'mario', 'grand_prix');
        const human = karts.find(kart => kart.isPlayer);
        const rivals = karts.filter(kart => !kart.isPlayer);
        for (let frame = 1; frame <= 60 * 120 && rivals.some(kart => !kart.finished); frame++) {
          for (const rival of rivals) updateRivalAI(rival, course, engine, human, karts, [], [], 1 / 60);
          updateRaceProgress(karts, course, frame / 60);
        }
        for (const rival of rivals) assert.equal(rival.finished, true,
          `${config.id}/${engine}/${rival.charId}: lap ${rival.lap}, checkpoint ${rival.checkpointIndex}`);
        assert.equal(new Set(rivals.map(kart => kart.rank)).size, 7);
      }
    }
  } finally { globalThis.document = original; }
});

test('Corrupt, unavailable, or full storage never interrupts a race', () => {
  const original = globalThis.localStorage;
  try {
    for (const json of ['null', '[]', '{broken', '{"mario_circuit":"bad","rainbow_road":12.5,"negative":-2}']) {
      globalThis.localStorage = { getItem: () => json };
      assert.deepEqual(readBestTimes('key'), json.includes('12.5') ? { rainbow_road: 12.5 } : {});
    }
    globalThis.localStorage = { getItem: () => '{"50cc":true,"100cc":"yes"}' };
    assert.deepEqual(readTrophies('key'), { '50cc': true });
    globalThis.localStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('full'); } };
    assert.deepEqual(readBestTimes('key'), {}); assert.doesNotThrow(() => saveRecord('key', {}));
  } finally { globalThis.localStorage = original; }
});
