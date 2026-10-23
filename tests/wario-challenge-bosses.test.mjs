import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { createRushSession, emptyRushInput, startRush, stepRush, pauseRush } = load('engine');
const { CHALLENGE_BOSSES, createChallengeBossState, rotateGolemPanels, golemPanelX, krakenLaneX, updateChallengeBossGame } = load('challengeBosses');
const { renderChallengeBoss } = load('challengeBossRender');
const ids = ['boss-golem', 'boss-kraken'];

function ready(id, variation, level = 1, seed = 7771) {
  const session = createRushSession(seed), input = emptyRushInput();
  startRush(session, input, id, variation); session.level = level;
  // The actual constructor receives the requested difficulty as well as the session.
  let number = seed;
  session.game.extra = createChallengeBossState(id, level, variation, () => { number = (Math.imul(number, 1664525) + 1013904223) >>> 0; return number / 4294967296; });
  for (let frame = 0; frame < 400 && session.phase === 'brief'; frame++) stepRush(session, input, 1 / 120);
  assert.equal(session.phase, 'play'); assert.equal(session.duration, 20);
  return { session, input };
}

function solvePanels(panels, target, variation) {
  const queue = [{ values: [...panels], path: [] }], seen = new Set([panels.join(',')]);
  for (let index = 0; index < queue.length; index++) {
    const entry = queue[index];
    if (entry.values.every((value, panel) => value === target[panel])) return entry.path;
    for (let panel = 0; panel < 4; panel++) {
      const next = [...entry.values]; rotateGolemPanels(next, panel, variation);
      if (seen.has(next.join(','))) continue;
      seen.add(next.join(',')); queue.push({ values: next, path: [...entry.path, panel] });
    }
  }
  assert.fail('Generated seal has no solution');
}

function play(id, variation, level, touch, seed, fps = 60) {
  const run = ready(id, variation, level, seed), { session, input } = run;
  const phases = new Set(), armor = [], dt = 1 / fps;
  let nextGolemAction = 0.6, previousBoard = -1;
  for (let frame = 0; frame <= fps * 20 && session.phase === 'play'; frame++) {
    Object.assign(input, emptyRushInput());
    const state = session.game.extra;
    phases.add(state.phase); armor.push(state.armor);
    if (id === 'boss-golem') {
      if (state.boardIndex !== previousBoard) { previousBoard = state.boardIndex; nextGolemAction = session.game.time + 0.6; }
      if (state.transition === 0 && session.game.time >= nextGolemAction) {
        const moves = solvePanels(state.panels, state.boards[state.boardIndex].target, variation);
        const panel = moves[0]; assert.notEqual(panel, undefined);
        if (touch) Object.assign(input, { pointerPressed: true, pointerDown: true, pointerX: golemPanelX(panel), pointerY: 333, action: true });
        else if (state.selected !== panel) {
          const right = (panel - state.selected + 4) % 4;
          input[right <= 2 ? 'rightPressed' : 'leftPressed'] = true;
        } else input.action = true;
        nextGolemAction = session.game.time + 0.16;
      }
    } else {
      const note = state.notes.find(candidate => candidate.result === null);
      if (note && Math.abs(note.at - session.game.time) <= dt * 0.55) {
        if (touch) Object.assign(input, { pointerPressed: true, pointerDown: true, pointerX: krakenLaneX(note.lane), pointerY: 383, action: true });
        else input[['leftPressed', 'downPressed', 'rightPressed'][note.lane]] = true;
      }
    }
    stepRush(session, input, dt);
  }
  assert.equal(session.result, 'success', JSON.stringify({ id, variation, level, touch, seed, fps, state: session.game.extra }));
  assert.equal(session.game.extra.hp, 0); assert.equal(Math.min(...armor), 3);
  assert.deepEqual([...phases].sort(), [1, 2, 3]); assert.ok(session.elapsed < 20);
  return run;
}

test('Two separate challenge bosses have three named patterns and capped independent armor', () => {
  assert.deepEqual(CHALLENGE_BOSSES.map(definition => definition.id), ids);
  for (const definition of CHALLENGE_BOSSES) {
    assert.equal(definition.variations.length, 3); assert.ok(definition.variations.every(pattern => pattern.name && pattern.shortHint));
    for (const level of [-4, 1, 7, Infinity, NaN]) for (const variation of [-1, 0, 1, 2, 7, NaN]) {
      const state = createChallengeBossState(definition.id, level, variation);
      assert.equal(state.armor, 3); assert.equal(state.maxArmor, 3); assert.equal(state.phase, 1);
      assert.ok(state.variation >= 0 && state.variation <= 2); assert.ok(state.hp > 0);
    }
  }
  assert.equal(createChallengeBossState('jump', 1), undefined);
  const first = createChallengeBossState('boss-kraken', 1), second = createChallengeBossState('boss-kraken', 1);
  first.notes[0].result = 'hit'; first.padFlash[0] = 1;
  assert.equal(second.notes[0].result, null); assert.equal(second.padFlash[0], 0);
});

for (const id of ids) for (const variation of [0, 1, 2]) for (const level of [1, 7]) for (const touch of [false, true]) {
  test(`${id} pattern ${variation + 1} wins all three phases with ${touch ? 'touch' : 'keyboard'} at level ${level}`, () => {
    for (const seed of [1, 7771, 982451653]) play(id, variation, level, touch, seed);
  });
}

test('Every seal is unsolved, solvable, and needs no more than five rotations', () => {
  for (const variation of [0, 1, 2]) for (let seed = 1; seed <= 100; seed++) {
    let number = seed;
    const state = createChallengeBossState('boss-golem', 7, variation, () => { number = (Math.imul(number, 1664525) + 1013904223) >>> 0; return number / 4294967296; });
    for (const board of state.boards) {
      const path = solvePanels(board.initial, board.target, variation);
      assert.ok(path.length > 0 && path.length <= 5, JSON.stringify({ variation, path }));
      assert.ok(board.initial.every(direction => direction >= 0 && direction <= 3));
    }
  }
});

test('Clockwise, counterclockwise, and linked rules apply the same rotation as generation', () => {
  for (const variation of [0, 1, 2]) for (let selected = 0; selected < 4; selected++) {
    const panels = [0, 1, 2, 3], original = [...panels]; rotateGolemPanels(panels, selected, variation);
    assert.equal(panels[selected], (original[selected] + (variation === 1 ? 3 : 1)) % 4);
    if (variation === 2) assert.equal(panels[(selected + 1) % 4], (original[(selected + 1) % 4] + 1) % 4);
    rotateGolemPanels(panels, selected, variation, true); assert.deepEqual(panels, original);
  }
});

test('Waiting causes defeat without boss damage in all patterns and difficulties', () => {
  for (const id of ids) for (const variation of [0, 1, 2]) for (const level of [1, 7]) {
    const { session, input } = ready(id, variation, level), maxHp = session.game.extra.maxHp;
    for (let frame = 0; frame < 2401 && session.phase === 'play'; frame++) stepRush(session, input, 1 / 120);
    assert.equal(session.result, 'failure', `${id}/${variation}/${level}`);
    assert.equal(session.game.extra.hp, maxHp); assert.equal(session.score, 0); assert.equal(session.game.extra.armor, 0);
  }
});

test('Both challenge bosses remain beatable at 30 and 144 fps', () => {
  for (const id of ids) for (const fps of [30, 144]) for (const variation of [0, 1, 2]) play(id, variation, 7, true, 7919, fps);
});

test('Kraken tolerates two missed beats and still awards victory with ten hits', () => {
  const { session, input } = ready('boss-kraken', 2, 7);
  for (let frame = 0; frame < 2400 && session.phase === 'play'; frame++) {
    Object.assign(input, emptyRushInput());
    const state = session.game.extra, note = state.notes.find(candidate => candidate.result === null);
    if (note && state.notes.indexOf(note) >= 2 && Math.abs(note.at - session.game.time) <= 1 / 120) input[['leftPressed', 'downPressed', 'rightPressed'][note.lane]] = true;
    stepRush(session, input, 1 / 120);
  }
  assert.equal(session.result, 'success'); assert.equal(session.game.extra.hits, 10); assert.equal(session.game.extra.armor, 1);
});

test('Wrong-lane input costs one armor for one beat, while early spam cannot win', () => {
  const { session, input } = ready('boss-kraken', 0);
  const state = session.game.extra, note = state.notes[0];
  while (session.game.time < note.at - 0.02) stepRush(session, input, 1 / 120);
  input[['leftPressed', 'downPressed', 'rightPressed'][(note.lane + 1) % 3]] = true;
  stepRush(session, input, 1 / 120); assert.equal(state.armor, 2); assert.equal(note.result, 'miss');
  for (let frame = 0; frame < 50; frame++) stepRush(session, input, 1 / 120);
  assert.equal(state.armor, 2, 'wrong lane is not followed by a second late miss');
  const spam = ready('boss-kraken', 1);
  for (let frame = 0; frame < 240 && spam.session.phase === 'play'; frame++) {
    spam.input.leftPressed = true; stepRush(spam.session, spam.input, 1 / 120);
  }
  assert.equal(spam.session.result, 'failure'); assert.equal(spam.session.game.extra.hits, 0);
});

test('Pausing freezes every countdown and restart discards board and rhythm progress', () => {
  for (const id of ids) {
    const { session, input } = ready(id, 2, 7);
    for (let frame = 0; frame < 48; frame++) stepRush(session, input, 1 / 120);
    input.actionHeld = true; input.pointerDown = true; input.action = true;
    pauseRush(session, input, true);
    const frozen = JSON.stringify(session.game), elapsed = session.elapsed;
    for (let frame = 0; frame < 500; frame++) stepRush(session, input, 1 / 120);
    assert.equal(JSON.stringify(session.game), frozen); assert.equal(session.elapsed, elapsed);
    assert.equal(input.pointerDown, false); assert.equal(input.actionHeld, false);
    pauseRush(session, input, false); stepRush(session, input, 1 / 120); assert.ok(session.elapsed > elapsed);
    const previous = session.game.extra; startRush(session, input, id, 2);
    assert.notEqual(session.game.extra, previous); assert.equal(session.game.extra.hp, session.game.extra.maxHp);
    assert.equal(session.game.extra.armor, 3); assert.equal(session.game.time, 0); assert.equal(session.elapsed, 0);
    assert.equal(session.game.variation, 2);
  }
});

test('Finished challenge state always produces a stable outcome without changing armor', () => {
  for (const id of ids) for (const success of [false, true]) {
    const { session, input } = ready(id, 0);
    const state = session.game.extra;
    if (success) state.hp = 0; else state.armor = 0;
    const frozen = JSON.stringify(state);
    assert.equal(updateChallengeBossGame(session, input, 1 / 60).result, success ? 'success' : 'failure');
    assert.equal(JSON.stringify(state), frozen);
  }
});

test('The renderer draws all six patterns without mutating simulation or emitting invalid geometry', () => {
  const operations = [], context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return value => ({ width: String(value).length * 9 });
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(key)}: ${args}`);
        if (key === 'arc') assert.ok(args[2] >= 0);
        if (key === 'ellipse') assert.ok(args[2] >= 0 && args[3] >= 0);
        if (key === 'fillText') assert.equal(typeof args[0], 'string');
        operations.push(key);
      };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  for (const id of ids) for (const variation of [0, 1, 2]) {
    const { session, input } = ready(id, variation);
    for (let frame = 0; frame < 1200 && session.phase === 'play'; frame++) {
      const before = JSON.stringify(session.game);
      if (frame % 5 === 0) { assert.equal(renderChallengeBoss(context, session), true); assert.equal(JSON.stringify(session.game), before); }
      stepRush(session, input, 1 / 60);
    }
    assert.equal(renderChallengeBoss(context, session), true);
  }
  assert.ok(operations.includes('fillText') && operations.includes('arc') && operations.includes('roundRect'));
});
