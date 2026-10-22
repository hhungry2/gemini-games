import { build } from 'esbuild';
import assert from 'node:assert/strict';
import test from 'node:test';

const bundle = await build({
  stdin: { contents: "export * from './src/games/holeio/engine.ts'; export { updateHoleCamera } from './src/games/holeio/render.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { createHoleWorld, stepHoleWorld, canEatObject, canEatHole, radiusForScore, tierForRadius, ranking, getGrowthProgress, updateHoleCamera, WORLD_SIZE } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const still = { x: 0, y: 0, boost: false };
const advance = (world, seconds, input = still) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) stepHoleWorld(world, input, 1 / 60); };
const isolated = () => {
  const world = createHoleWorld(90, 42);
  world.holes = [world.holes[0]];
  world.objects = [];
  return world;
};
const objectAt = (hole, required = 13, value = 5) => ({ id: 0, kind: 'person', x: hole.x, y: hole.y, width: 9, depth: 9, height: 14, required, value, color: '#fff', angle: 0, swallowed: false, eater: -1, fall: 0 });

test('seeded city is deterministic and contains a complete growth ladder', () => {
  const a = createHoleWorld(120, 999), b = createHoleWorld(120, 999);
  assert.deepEqual(a.objects, b.objects);
  assert.equal(a.holes.length, 6);
  for (const kind of ['person', 'cone', 'tree', 'car', 'bus', 'house', 'office', 'tower']) assert.ok(a.objects.some(o => o.kind === kind), kind);
  assert.ok(a.objects.length > 900);
  assert.ok(a.objects.filter(o => o.required <= 24).length > 400);
});

test('objects require sufficient hole size and finish falling before awarding points exactly once', () => {
  const world = isolated(), hole = world.holes[0], object = objectAt(hole);
  world.objects = [object];
  assert.equal(canEatObject(hole, object), true);
  stepHoleWorld(world, still, 1 / 60);
  assert.equal(object.eater, 0);
  assert.equal(hole.score, 0);
  advance(world, 0.5);
  assert.equal(object.swallowed, true);
  assert.equal(hole.score, 5);
  assert.equal(hole.eaten, 1);
  advance(world, 2);
  assert.equal(hole.score, 5);
  assert.ok(hole.radius > 24);
});

test('ineligible buildings cannot be swallowed by parking underneath', () => {
  const world = isolated(), hole = world.holes[0], object = objectAt(hole, 65, 140);
  world.objects = [object];
  advance(world, 2);
  assert.equal(canEatObject(hole, object), false);
  assert.equal(object.eater, -1);
  assert.equal(hole.score, 0);
});

test('growth ladder thresholds are exact and large scores stay finite', () => {
  assert.equal(tierForRadius(26.99), 0);
  assert.equal(tierForRadius(27), 1);
  assert.equal(tierForRadius(118), 6);
  assert.equal(radiusForScore(-100), 24);
  assert.equal(radiusForScore(1e12), 184);
  const world = isolated();
  assert.equal(getGrowthProgress(world.holes[0]).progress, 0);
  world.holes[0].radius = 184;
  assert.equal(getGrowthProgress(world.holes[0]).progress, 1);
});

test('diagonal movement is normalized and map edges clamp the whole hole', () => {
  const axial = isolated(), diagonal = isolated();
  const origin = { x: axial.holes[0].x, y: axial.holes[0].y };
  advance(axial, 1, { x: 1, y: 0, boost: false });
  advance(diagonal, 1, { x: 1, y: 1, boost: false });
  assert.ok(Math.abs(Math.hypot(diagonal.holes[0].x - origin.x, diagonal.holes[0].y - origin.y) - (axial.holes[0].x - origin.x)) < 0.01);
  advance(axial, 15, { x: 1, y: 1, boost: false });
  assert.ok(axial.holes[0].x <= WORLD_SIZE - axial.holes[0].radius);
  assert.ok(axial.holes[0].y <= WORLD_SIZE - axial.holes[0].radius);
});

test('boost consumes stamina, recovers on release, and releases movement safely', () => {
  const fast = isolated(), slow = isolated();
  advance(fast, 1, { x: 1, y: 0, boost: true });
  advance(slow, 1, { x: 1, y: 0, boost: false });
  assert.ok(fast.holes[0].x > slow.holes[0].x + 80);
  assert.ok(fast.holes[0].stamina < 75);
  const depleted = fast.holes[0].stamina;
  advance(fast, 1);
  assert.ok(fast.holes[0].stamina > depleted);
  assert.ok(Math.abs(fast.holes[0].vx) < 0.01);
});

test('spawn shields and size ratio protect peers; a kill scores once and respawns with persistent setback', () => {
  const world = createHoleWorld(90, 42); world.objects = []; world.holes = world.holes.slice(0, 2);
  const [hunter, prey] = world.holes;
  hunter.score = hunter.mass = 1500; hunter.radius = radiusForScore(hunter.mass);
  prey.score = prey.mass = 200; prey.radius = radiusForScore(prey.mass);
  prey.x = hunter.x; prey.y = hunter.y;
  assert.equal(canEatHole(hunter, prey), false);
  hunter.shield = 0; prey.shield = 0;
  assert.equal(canEatHole(hunter, prey), true);
  stepHoleWorld(world, still, 1 / 60);
  assert.equal(hunter.kills, 1);
  assert.ok(prey.respawn > 0);
  advance(world, 1);
  assert.equal(hunter.kills, 1);
  advance(world, 2.1);
  assert.equal(prey.respawn, 0);
  assert.ok(prey.shield > 3);
  assert.equal(prey.score, 200);
  assert.equal(prey.mass, 96);
  assert.ok(prey.radius < radiusForScore(prey.score));
  assert.ok(Math.hypot(prey.x - hunter.x, prey.y - hunter.y) > 300);
});

test('rankings use earned score and do not mutate entity order', () => {
  const world = createHoleWorld(90, 1);
  world.holes[3].score = 500; world.holes[0].score = 350;
  assert.equal(ranking(world)[0].id, 3);
  assert.equal(ranking(world)[1].id, 0);
  assert.deepEqual(world.holes.map(h => h.id), [0, 1, 2, 3, 4, 5]);
});

test('timer ends both round lengths exactly and ended worlds remain immutable', () => {
  for (const duration of [90, 120]) {
    const world = isolated(); world.duration = duration; world.elapsed = duration - 0.01;
    stepHoleWorld(world, { x: 1, y: 0, boost: false }, 1 / 60);
    assert.equal(world.elapsed, duration);
    assert.equal(world.ended, true);
    const snapshot = JSON.stringify(world);
    advance(world, 1, { x: -1, y: 1, boost: true });
    assert.equal(JSON.stringify(world), snapshot);
  }
});

test('restart creates independent scores, timers, objects and opponents', () => {
  const old = createHoleWorld(120, 2); advance(old, 15);
  const fresh = createHoleWorld(90, 3);
  assert.equal(fresh.elapsed, 0);
  assert.equal(fresh.duration, 90);
  assert.equal(fresh.holes[0].score, 0);
  assert.equal(fresh.objects.every(o => !o.swallowed && o.eater === -1), true);
  assert.notEqual(fresh.objects[0], old.objects[0]);
});

test('responsive camera keeps finite coordinates and zooms out with growth', () => {
  const hole = isolated().holes[0];
  for (const [width, height] of [[360, 640], [1280, 720], [1920, 1080], [844, 330]]) {
    const camera = { x: hole.x, y: hole.y, zoom: 1 };
    for (let i = 0; i < 180; i++) updateHoleCamera(camera, hole, width, height, 1 / 60);
    const smallZoom = camera.zoom;
    hole.radius = 140;
    for (let i = 0; i < 180; i++) updateHoleCamera(camera, hole, width, height, 1 / 60);
    assert.ok(camera.zoom <= smallZoom);
    assert.ok(Number.isFinite(camera.x) && Number.isFinite(camera.y));
    hole.radius = 24;
  }
});

test('a complete seeded round has active bots and reachable tower progression', () => {
  const world = createHoleWorld(120, 531);
  for (let tick = 0; tick < 7202 && !world.ended; tick++) {
    const player = world.holes[0];
    let target, cost = Infinity;
    if (tick % 12 === 0 || !world.objects[player.target] || !canEatObject(player, world.objects[player.target])) {
      for (const object of world.objects) {
        if (!canEatObject(player, object)) continue;
        const nextCost = Math.hypot(object.x - player.x, object.y - player.y) / Math.pow(object.value, 0.35);
        if (nextCost < cost) { target = object; cost = nextCost; }
      }
      player.target = target?.id ?? -1;
    }
    target = world.objects[player.target];
    const dx = target ? target.x - player.x : 0, dy = target ? target.y - player.y : 0, len = Math.hypot(dx, dy);
    stepHoleWorld(world, { x: len > 2 ? dx / Math.max(12, len) : 0, y: len > 2 ? dy / Math.max(12, len) : 0, boost: false }, 1 / 60);
  }
  assert.equal(world.ended, true);
  assert.ok(world.holes.slice(1).every(h => h.score > 100), 'opponents must actually eat city objects');
  assert.ok(world.holes[0].eaten > 80, 'first growth steps must not stall');
  assert.ok(world.holes[0].peakRadius >= 118, `tower progression should be reachable; radius ${world.holes[0].peakRadius}`);
  assert.ok(world.objects.some(o => o.kind === 'tower' && o.swallowed), 'the late-game city must be edible');
});
