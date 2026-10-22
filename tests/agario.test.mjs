import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/games/agario/engine.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compiled)(module, module.exports);
const { createArena, stepArena, splitPlayer, ejectPlayer, totalMass, radius, leaderboard, WORLD_SIZE, ROUND_SECONDS } = module.exports;
const rng = (seed = 42) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
function isolated(mode = 'ffa') {
  const arena = createArena(mode, 'test', '#55def3', rng());
  arena.cells = arena.cells.filter(cell => cell.owner === 0);
  arena.owners = arena.owners.slice(0, 1);
  arena.pellets = [];
  return arena;
}
function opponent(arena, mass, position = {}) {
  const id = arena.owners.length;
  arena.owners.push({ id, name: `bot${id}`, color: '#ffad65', targetX: 0, targetY: 0, thinkAt: Infinity, respawnAt: Infinity });
  const cell = { ...arena.cells[0], id: arena.nextId++, owner: id, mass, shieldUntil: 0, ...position };
  arena.cells.push(cell);
  return cell;
}
const zero = { x: 0, y: 0 };

test('Spawn has 15 distinct owners, 950 pellets and a protected, clear opening', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const arena = createArena('ffa', '  little cell  ', '#55def3', rng(seed));
    assert.equal(arena.cells.length, 15);
    assert.equal(arena.pellets.length, 950);
    assert.equal(arena.owners[0].name, 'little cell');
    assert.equal(arena.cells[0].shieldUntil, 4);
    for (let i = 0; i < arena.cells.length; i++) for (let j = i + 1; j < arena.cells.length; j++) {
      const a = arena.cells[i], b = arena.cells[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > radius(a.mass) + radius(b.mass), `overlap seed=${seed}`);
    }
  }
});

test('Pellets grow the cell and replenish; diagonal movement has the same speed', () => {
  const a = isolated(), b = isolated();
  a.pellets.push({ x: a.cells[0].x, y: a.cells[0].y, mass: 3, color: '#fff', vx: 0, vy: 0, collectibleAt: 0, expires: Infinity });
  stepArena(a, zero);
  assert.equal(totalMass(a), 88);
  assert.equal(a.pellets.length, 950);
  const origin = { x: b.cells[0].x, y: b.cells[0].y };
  const c = isolated();
  stepArena(b, { x: 1, y: 0 }); stepArena(c, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(b.cells[0].x - origin.x, b.cells[0].y - origin.y) - Math.hypot(c.cells[0].x - origin.x, c.cells[0].y - origin.y)) < 0.000001);
});

test('Splitting conserves mass, respects the eight-cell cap and rejects undersized cells', () => {
  const arena = isolated();
  assert.equal(splitPlayer(arena, { x: 1, y: 0 }), true);
  assert.equal(arena.cells.length, 2);
  assert.equal(totalMass(arena), 85);
  assert.equal(arena.cells[0].mergeAt, 12);
  assert.ok(arena.cells[1].vx > 0);
  assert.equal(splitPlayer(arena, zero), false);
  arena.cells[0].mass = 2000; arena.cells[1].mass = 2000;
  while (splitPlayer(arena, zero)) { /* until cap */ }
  assert.equal(arena.cells.length, 8);
  assert.equal(totalMass(arena), 4000);
});

test('Cells stay separate during the cooldown and merge naturally afterward', () => {
  const arena = isolated();
  splitPlayer(arena, { x: 1, y: 0 });
  for (const cell of arena.cells) { cell.vx = 0; cell.x = 1200; cell.y = 1200; }
  stepArena(arena, zero);
  assert.equal(arena.cells.length, 2);
  arena.time = 12;
  arena.pellets = [];
  for (const cell of arena.cells) { cell.x = 1200; cell.y = 1200; }
  stepArena(arena, zero);
  assert.equal(arena.cells.length, 1);
  assert.equal(totalMass(arena), 85);
  assert.ok(arena.events.some(event => event.type === 'merge'));
});

test('Ejection transfers eight mass to a delayed pellet and has a real rate limit', () => {
  const arena = isolated();
  assert.equal(ejectPlayer(arena, { x: -1, y: 0 }), true);
  assert.equal(totalMass(arena), 77);
  assert.equal(arena.pellets[0].mass, 8);
  assert.equal(arena.pellets[0].collectibleAt, 1.3);
  assert.ok(arena.pellets[0].vx < 0);
  assert.equal(ejectPlayer(arena, zero), false);
  arena.time = 0.3;
  assert.equal(ejectPlayer(arena, zero), true);
  assert.equal(totalMass(arena), 69);
});

test('Spawn protection, size margin and full absorption determine kills', () => {
  const arena = isolated();
  arena.cells[0].mass = 100;
  const prey = opponent(arena, 50);
  stepArena(arena, zero);
  assert.equal(arena.cells.length, 2, 'spawn shield blocks absorption');
  arena.time = 5;
  prey.x = arena.cells[0].x; prey.y = arena.cells[0].y;
  arena.pellets = [];
  stepArena(arena, zero);
  assert.equal(arena.cells.length, 1);
  assert.equal(totalMass(arena), 150);
  assert.equal(arena.kills, 1);
  const equal = isolated(); equal.time = 5;
  opponent(equal, 80); stepArena(equal, zero);
  assert.equal(equal.cells.length, 2, 'almost equal cells cannot absorb each other');
});

test('Losing one split cell continues; losing the final cell freezes the result', () => {
  const arena = isolated(); arena.time = 5;
  splitPlayer(arena, { x: 1, y: 0 });
  const other = arena.cells[1]; other.x += 400; other.vx = 0;
  opponent(arena, 150);
  stepArena(arena, zero);
  assert.equal(arena.cells.filter(cell => cell.owner === 0).length, 1);
  assert.equal(arena.status, 'playing');
  const enemy = arena.cells.find(cell => cell.owner !== 0);
  enemy.x = other.x; enemy.y = other.y; arena.pellets = [];
  stepArena(arena, zero);
  assert.equal(arena.status, 'over');
  const time = arena.time;
  stepArena(arena, { x: 1, y: 1 });
  assert.equal(arena.time, time);
  assert.equal(splitPlayer(arena, zero), false);
  assert.equal(ejectPlayer(arena, zero), false);
});

test('90-second rounds finish exactly; restarting creates clean state', () => {
  const arena = isolated('timeattack');
  arena.time = ROUND_SECONDS - 0.01;
  stepArena(arena, zero);
  assert.equal(arena.time, 90);
  assert.equal(arena.status, 'over');
  const fresh = createArena('ffa', 'again', '#ff81ae', rng());
  assert.equal(fresh.time, 0); assert.equal(fresh.kills, 0); assert.equal(fresh.status, 'playing');
  assert.equal(fresh.cells.filter(cell => cell.owner === 0).length, 1);
  assert.equal(totalMass(fresh), 85);
});

test('Bot steering flees larger cells and hunts smaller cells', () => {
  const arena = isolated(); arena.time = 5;
  arena.cells[0].mass = 150;
  const bot = opponent(arena, 40, { x: 1280, y: 1200 });
  arena.owners[1].thinkAt = 0;
  const initialX = bot.x;
  stepArena(arena, zero);
  assert.ok(bot.x > initialX, 'small bot moves away from player');
  bot.mass = 220; bot.x = 1350; arena.cells[0].mass = 50; arena.owners[1].thinkAt = 0; arena.pellets = [];
  stepArena(arena, zero);
  assert.ok(bot.x < 1350, 'large bot moves toward player');
});

test('Long arena runs keep finite positions, bounds, rankings and pellet supply', () => {
  for (const seed of [1, 23, 77]) {
    const arena = createArena('ffa', 'test', '#55def3', rng(seed));
    for (let frame = 0; frame < 900 && arena.status === 'playing'; frame++) {
      const angle = frame / 170;
      stepArena(arena, { x: Math.cos(angle), y: Math.sin(angle) });
      for (const cell of arena.cells) {
        assert.ok(Number.isFinite(cell.mass) && cell.mass > 0);
        assert.ok(cell.x >= radius(cell.mass) - 0.001 && cell.x <= WORLD_SIZE - radius(cell.mass) + 0.001);
        assert.ok(cell.y >= radius(cell.mass) - 0.001 && cell.y <= WORLD_SIZE - radius(cell.mass) + 0.001);
      }
      assert.ok(arena.pellets.length >= 950 || arena.status === 'over');
      const leaders = leaderboard(arena);
      assert.ok(leaders.every((owner, index) => index === 0 || leaders[index - 1].mass >= owner.mass));
    }
  }
});

test('Renderer retires every particle before its radius turns negative, including after resize', () => {
  const rendererSource = readFileSync(new URL('../src/games/agario/renderer.ts', import.meta.url), 'utf8');
  const rendererCompiled = ts.transpileModule(rendererSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const rendererModule = { exports: {} };
  new Function('require', 'module', 'exports', rendererCompiled)(() => module.exports, rendererModule, rendererModule.exports);
  const { createView, renderArena, captureEvents } = rendererModule.exports;
  let circles = 0;
  const context = new Proxy({}, {
    get(_target, property) {
      if (property === 'arc') return (x, y, r) => {
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(r) && r >= 0, `invalid arc radius ${r}`);
        circles++;
      };
      if (property === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    },
    set() { return true; },
  });
  const arena = isolated();
  const view = createView();
  captureEvents(view, ['pellet', 'eat', 'split', 'merge', 'eject'].map(type => ({ type, x: 1200, y: 1200, color: '#55def3', value: 50 })));
  for (let frame = 0; frame < 100; frame++) {
    const size = frame < 10 ? [800, 600] : frame < 20 ? [0, 0] : frame < 30 ? [320, 640] : [1920, 1080];
    renderArena(context, arena, view, ...size, 0.017);
    assert.ok(Number.isFinite(view.zoom) && view.zoom > 0);
  }
  assert.equal(view.particles.length, 0);
  assert.ok(circles > 100);
});
