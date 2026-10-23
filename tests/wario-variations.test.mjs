import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';
const { RUSH_GAMES, createRushSession, emptyRushInput, startRush, stepRush, pauseRush, rushSpeed, rushDefinition, rushRoundDefinition, selectRushVariation, rushObstacleX, rushNeedleAt } = load('engine');
const { BOSS_GAME, createBossState, bossLaneX } = load('bossGame');
const dt = 1 / 60;
function ready(id, variation, level = 1, seed = 4581) {
  const state = createRushSession(seed), input = emptyRushInput();
  startRush(state, input, id, variation);
  state.level = level; state.phase = 'speedup'; state.phaseTime = 0; stepRush(state, input, 0);
  while (state.phase === 'brief') stepRush(state, input, dt);
  return { state, input };
}
function solveCore(state, input, pointer) {
  Object.assign(input, emptyRushInput());
  const g = state.game, nextTime = g.time + dt * rushSpeed(state.level), v = g.variation;
  if (g.id === 'jump') {
    const approaching = g.obstacles.some(obstacle => { const distance = (g.x - rushObstacleX(obstacle, nextTime)) * obstacle.direction; return distance >= 0 && distance <= 110 && !obstacle.passed; });
    input.action = approaching && g.jumpY === 0; input.pointerPressed = pointer && input.action;
  }
  if (g.id === 'catch') {
    const target = g.drops.find(drop => !drop.caught);
    if (pointer) { input.pointerDown = true; input.pointerX = target?.x ?? 320; }
    else { input.left = target && target.x < g.x - 3; input.right = target && target.x > g.x + 3; }
  }
  if (g.id === 'inflate') {
    if (v === 1) { input.actionHeld = !pointer; input.pointerDown = pointer; }
    else if (v === 2) {
      const direction = g.sequence[g.count];
      if (pointer) Object.assign(input, { pointerPressed: true, pointerX: direction < 0 ? 157 : 483, pointerY: 387 });
      else { input.leftPressed = direction < 0; input.rightPressed = direction > 0; }
    } else { input.action = true; input.pointerPressed = pointer; }
  }
  if (g.id === 'stop') {
    const needle = rushNeedleAt(nextTime, v), target = v === 2 ? g.baseTarget + Math.sin(nextTime * 1.5) * 42 : g.target;
    input.action = Math.abs(needle - target) < g.targetWidth * 0.4; input.pointerPressed = pointer && input.action;
  }
  if (g.id === 'match') {
    const correct = g.options.findIndex(value => v === 1 ? value !== g.target : value === g.target);
    if (pointer) Object.assign(input, { pointerPressed: true, action: true, pointerX: 145 + correct * 175, pointerY: 280 });
    else if (g.selected !== correct) input.rightPressed = true; else input.action = true;
  }
  if (g.id === 'dodge') {
    const score = target => {
      let clearance = 150;
      for (let time = 0; time <= 0.8; time += 0.04) {
        const x = pointer ? target : g.x + Math.max(-400 * time, Math.min(400 * time, target - g.x));
        for (const drop of g.drops) {
          const y = -60 + (g.time + time - drop.start) * 285;
          if (y >= 285 && y <= 420) clearance = Math.min(clearance, Math.abs(x - drop.x));
        }
      }
      return clearance - Math.abs(target - g.x) * 0.08;
    };
    const target = [g.x, ...Array.from({ length: 14 }, (_, i) => 50 + i * 40)].sort((a, b) => score(b) - score(a))[0];
    if (pointer) { input.pointerDown = true; input.pointerX = target; }
    else { input.left = target < g.x - 3; input.right = target > g.x + 3; }
  }
  if (g.id === 'react') {
    if (v === 2) {
      if (nextTime < g.target + 0.05) { input.actionHeld = !pointer; input.pointerDown = pointer; }
      else input.actionReleased = true;
    } else if (nextTime >= g.target + 0.05) {
      if (v === 1) {
        if (pointer) Object.assign(input, { pointerPressed: true, pointerX: g.sequence[0] < 0 ? 195 : 445, pointerY: 414 });
        else { input.leftPressed = g.sequence[0] < 0; input.rightPressed = g.sequence[0] > 0; }
      } else { input.action = true; input.pointerPressed = pointer; }
    }
  }
  if (g.id === 'sequence') {
    const index = v === 1 ? g.needed - 1 - g.count : g.count, direction = g.sequence[index] * (v === 2 ? -1 : 1);
    if (pointer) Object.assign(input, { pointerPressed: true, pointerX: direction < 0 ? 200 : 440, pointerY: 330 });
    else { input.leftPressed = direction < 0; input.rightPressed = direction > 0; }
  }
}

test('Each of forty games and the boss exposes three distinct, described gameplay patterns', () => {
  assert.equal(RUSH_GAMES.length, 40);
  for (const definition of [...RUSH_GAMES, BOSS_GAME]) {
    assert.equal(definition.variations?.length, 3, definition.id);
    assert.equal(new Set(definition.variations.map(variation => variation.name)).size, 3, definition.id);
    for (let variation = 0; variation < 3; variation++) {
      const resolved = rushRoundDefinition({ id: definition.id, variation });
      assert.equal(resolved.name, definition.name); assert.ok(resolved.command.length > 2); assert.ok(resolved.shortHint.length > 5);
    }
  }
});

test('Per-game pattern decks use all three before repeating and never repeat across deck boundaries', () => {
  for (const definition of [...RUSH_GAMES, BOSS_GAME]) for (const seed of [1, 28, 959]) {
    const state = createRushSession(seed); let previous;
    for (let round = 0; round < 12; round++) {
      const group = [];
      for (let i = 0; i < 3; i++) { const variation = selectRushVariation(state, definition.id); assert.notEqual(variation, previous, definition.id); previous = variation; group.push(variation); }
      assert.deepEqual(group.sort(), [0, 1, 2], definition.id);
    }
  }
});

test('Explicit practice selection is stable, automatic practice rotates, and restarting clears pattern history', () => {
  const state = createRushSession(7), input = emptyRushInput();
  startRush(state, input, 'inflate', 2);
  for (let index = 0; index < 6; index++) assert.equal(selectRushVariation(state, 'inflate'), 2);
  assert.equal(state.practiceVariation, 2);
  startRush(state, input, 'inflate');
  const selected = [state.game.variation];
  for (let index = 0; index < 2; index++) selected.push(selectRushVariation(state, 'inflate'));
  assert.deepEqual(selected.sort(), [0, 1, 2]);
  const history = JSON.stringify(state.variationBags);
  pauseRush(state, input, true); for (let i = 0; i < 120; i++) stepRush(state, input, dt);
  assert.equal(JSON.stringify(state.variationBags), history);
  startRush(state, input, 'inflate', 1);
  assert.deepEqual(state.variationBags, {}); assert.deepEqual(state.lastVariations, {}); assert.equal(state.game.variation, 1);
});

test('The same seed and pattern inputs reproduce the same boards and motion parameters', () => {
  for (const definition of [...RUSH_GAMES, BOSS_GAME]) {
    const a = createRushSession(742), b = createRushSession(742), inputA = emptyRushInput(), inputB = emptyRushInput();
    for (let variation = 0; variation < 3; variation++) {
      startRush(a, inputA, definition.id, variation); startRush(b, inputB, definition.id, variation);
      assert.deepEqual(a.game, b.game, `${definition.id}/${variation}`);
    }
  }
});

for (const { id } of RUSH_GAMES.slice(0, 8)) test(`${id}: all three patterns can be cleared with both controls at low and high speed`, () => {
  for (const variation of [0, 1, 2]) for (const pointer of [false, true]) for (const level of [1, 7]) for (const seed of [12, 55, 812]) {
    const { state, input } = ready(id, variation, level, seed);
    for (let frame = 0; frame < 500 && state.phase === 'play'; frame++) { solveCore(state, input, pointer); stepRush(state, input, dt); }
    assert.equal(state.result, 'success', `${id}/${variation} pointer=${pointer} level=${level} seed=${seed} ${state.game.reason}`);
  }
});

test('Boss patterns change attack routes and stay beatable through every phase', () => {
  for (const variation of [0, 1, 2]) for (const tier of [1, 7]) for (const pointer of [false, true]) {
    const { state, input } = ready('boss', variation); state.game.extra = createBossState(tier, variation);
    const seen = new Set();
    while (state.phase === 'play') {
      const boss = state.game.extra, target = bossLaneX(boss.targetLane); Object.assign(input, emptyRushInput());
      if (pointer) { input.pointerDown = true; input.pointerX = target; }
      else { input.left = boss.playerX > target + 3; input.right = boss.playerX < target - 3; input.actionHeld = true; }
      stepRush(state, input, dt); seen.add(boss.phase);
    }
    assert.equal(state.result, 'success', `${variation}/${tier}/${pointer}`); assert.deepEqual([...seen].sort(), [1, 2, 3]);
    assert.equal(state.game.extra.armor, 3);
  }
});

test('Wrong rule inputs fail and releasing a paused hold does not submit a reaction', () => {
  for (const id of ['match', 'react', 'sequence']) for (const variation of [1, 2]) {
    const { state, input } = ready(id, variation), game = state.game;
    if (id === 'match') { game.selected = game.options.findIndex(value => variation === 1 ? value === game.target : value !== game.target); input.action = true; }
    if (id === 'sequence') { const index = variation === 1 ? game.needed - 1 : 0, wrong = game.sequence[index] * (variation === 2 ? 1 : -1); input.leftPressed = wrong < 0; input.rightPressed = wrong > 0; }
    if (id === 'react' && variation === 1) input.leftPressed = true;
    if (id === 'react' && variation === 2) { input.actionHeld = true; stepRush(state, input, dt); input.actionHeld = false; input.actionReleased = true; }
    stepRush(state, input, dt); assert.equal(state.result, 'failure', `${id}/${variation}`);
  }
  const { state, input } = ready('react', 2); input.actionHeld = true; stepRush(state, input, dt);
  pauseRush(state, input, true); pauseRush(state, input, false); stepRush(state, input, dt);
  assert.equal(state.result, null); assert.equal(input.actionReleased, false);
  const late = ready('react', 2);
  while (late.state.game.time <= late.state.game.target) stepRush(late.state, late.input, dt);
  late.input.actionHeld = true; stepRush(late.state, late.input, dt);
  late.input.actionHeld = false; late.input.actionReleased = true; stepRush(late.state, late.input, dt);
  assert.equal(late.state.game.armed, false); assert.equal(late.state.result, null, 'a late press cannot replace holding from red');
});

test('All 123 gameplay patterns render with finite, non-negative geometry and preserve simulation state', () => {
  const { renderRush } = load('render');
  const context = new Proxy({}, {
    get(_target, method) {
      if (method === 'measureText') return text => ({ width: String(text).length * 12 });
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(method)} must be finite`);
        if (method === 'arc') assert.ok(args[2] >= 0, 'circle radius');
        if (method === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0, 'ellipse radii');
        if (method === 'roundRect') assert.ok(args[2] >= 0 && args[3] >= 0, 'rectangle dimensions');
        if (method === 'fillText') assert.equal(typeof args[0], 'string');
        if (String(method).includes('Gradient')) return { addColorStop() {} };
      };
    },
    set(_target, _key, value) { if (typeof value === 'number') assert.ok(Number.isFinite(value)); return true; },
  });
  for (const definition of [...RUSH_GAMES, BOSS_GAME]) for (const variation of [0, 1, 2]) {
    const { state, input } = ready(definition.id, variation, 7, 5841);
    for (let frame = 0; state.phase === 'play' && frame < 1300; frame++) {
      if (RUSH_GAMES.slice(0, 8).some(game => game.id === definition.id)) solveCore(state, input, true);
      if (definition.id === 'boss') { input.pointerDown = true; input.pointerX = bossLaneX(state.game.extra.targetLane); }
      stepRush(state, input, dt);
      if (frame % 12 === 0 || state.phase !== 'play') {
        const before = structuredClone(state);
        renderRush(context, state, frame / 60);
        assert.deepEqual(state, before, `${definition.id}/${variation} rendering must be read-only`);
      }
    }
  }
});
