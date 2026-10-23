import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/wario-harness.mjs';

const { RUSH_GAMES, RUSH_BOSSES, isRushBoss, rushDefinition, createRushSession, emptyRushInput, startRush, stepRush, pauseRush, selectRushBoss, selectRushGame } = load('engine');
const dt = 1 / 60;
const ids = RUSH_BOSSES.map(boss => boss.id);
function ready(id, variation = 0) {
  const state = createRushSession(47), input = emptyRushInput();
  startRush(state, input, id, variation);
  while (state.phase === 'brief') stepRush(state, input, dt);
  assert.equal(state.phase, 'play');
  return { state, input };
}
function nextRound(state, input) {
  for (let frame = 0; frame < 400 && ['result', 'speedup'].includes(state.phase); frame++) stepRush(state, input, dt);
}

test('The five distinct bosses stay outside the forty regular game catalog', () => {
  assert.equal(RUSH_GAMES.length, 40); assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5);
  assert.deepEqual(ids, ['boss', 'boss-dragon', 'boss-slime', 'boss-golem', 'boss-kraken']);
  for (const definition of RUSH_BOSSES) {
    assert.equal(isRushBoss(definition.id), true); assert.equal(rushDefinition(definition.id), definition);
    assert.equal(definition.variations.length, 3);
    assert.equal(RUSH_GAMES.some(game => game.id === definition.id), false);
  }
  for (const id of [null, undefined, ...RUSH_GAMES.map(game => game.id)]) assert.equal(isRushBoss(id), false);
});

test('Boss shuffle uses every boss once and avoids repeats at roster boundaries', () => {
  for (const seed of [1, 27, 584, 8773, 4294967295]) {
    const state = createRushSession(seed), regular = structuredClone(state.bag);
    let last = null;
    for (let group = 0; group < 20; group++) {
      const seen = [];
      for (let index = 0; index < 5; index++) {
        const boss = selectRushBoss(state); assert.notEqual(boss, last); last = boss; seen.push(boss);
      }
      assert.deepEqual(seen.sort(), [...ids].sort());
    }
    assert.deepEqual(state.bag, regular);
    const second = createRushSession(seed), first = createRushSession(seed);
    assert.deepEqual(Array.from({ length: 30 }, () => selectRushBoss(first)), Array.from({ length: 30 }, () => selectRushBoss(second)));
  }
});

test('Boss practice pins its boss without consuming the normal or boss roster', () => {
  for (const id of ids) {
    const { state, input } = ready(id, 2);
    const before = structuredClone(state.bossBag);
    for (let round = 0; round < 10; round++) assert.equal(selectRushBoss(state), id);
    assert.deepEqual(state.bossBag, before); assert.deepEqual(state.bag, []); assert.equal(state.lastBoss, null);
    state.game.extra.hp = 0; stepRush(state, input, dt); nextRound(state, input);
    assert.equal(state.game.id, id); assert.equal(state.game.variation, 2); assert.equal(state.duration, 20);
  }
  const state = createRushSession(9); selectRushBoss(state);
  const bossBag = structuredClone(state.bossBag), lastBoss = state.lastBoss;
  for (let index = 0; index < 80; index++) assert.equal(isRushBoss(selectRushGame(state)), false);
  assert.deepEqual(state.bossBag, bossBag); assert.equal(state.lastBoss, lastBoss);
});

test('Every boss is scheduled after ten regular clears and leaves the regular deck intact', () => {
  for (const id of ids) {
    const { state, input } = ready('inflate');
    state.practice = null; state.clearsSinceBoss = 9; state.bag = ['jump', 'catch']; state.bossBag = [id];
    state.game.count = state.game.needed; stepRush(state, input, dt);
    assert.equal(state.result, 'success'); assert.equal(state.clearsSinceBoss, 10);
    nextRound(state, input);
    assert.equal(state.game.id, id); assert.equal(state.duration, 20); assert.equal(state.phaseTime, 2.6);
    assert.equal(state.bossEncounters, 1); assert.equal(state.clearsSinceBoss, 0);
    assert.deepEqual(state.bag, ['jump', 'catch']); assert.equal(state.game.extra.id, id);
  }
});

test('All fifteen boss patterns keep real time, freeze on pause, and reset cleanly', () => {
  for (const id of ids) for (const variation of [0, 1, 2]) {
    const { state, input } = ready(id, variation); state.level = 14;
    assert.ok(state.game.extra); assert.equal(state.game.extra.armor, 3); assert.equal(state.game.extra.phase, 1);
    for (let frame = 0; frame < 30; frame++) stepRush(state, input, dt);
    assert.ok(Math.abs(state.game.time - 0.5) < 1e-9); assert.ok(Math.abs(state.elapsed - 0.5) < 1e-9);
    input.pointerDown = true; input.actionHeld = true; pauseRush(state, input, true);
    const before = structuredClone(state);
    for (let frame = 0; frame < 120; frame++) stepRush(state, input, dt);
    assert.deepEqual(state, before); assert.deepEqual(input, emptyRushInput());
    pauseRush(state, input, false); startRush(state, input, id, variation);
    assert.equal(state.game.time, 0); assert.equal(state.game.extra.armor, 3); assert.equal(state.game.extra.hp, state.game.extra.maxHp);
    assert.equal(state.practiceVariation, variation); assert.equal(state.bossEncounters, 0); assert.equal(state.bossesDefeated, 0);
    assert.deepEqual(state.bossBag, []); assert.equal(state.lastBoss, null);
  }
});

test('Each boss victory grants one capped life only in a run and defeat spends exactly one life', () => {
  for (const id of ids) for (const practice of [false, true]) for (const lives of [1, 3, 4]) {
    const { state, input } = ready(id);
    if (!practice) state.practice = null;
    state.lives = lives; state.game.extra.hp = 0; stepRush(state, input, dt);
    assert.equal(state.result, 'success'); assert.equal(state.score, 1); assert.equal(state.clearsSinceBoss, 0);
    assert.equal(state.bossesDefeated, practice ? 0 : 1); assert.equal(state.lives, practice ? lives : Math.min(4, lives + 1));
    for (let frame = 0; frame < 30; frame++) stepRush(state, input, dt);
    assert.equal(state.score, 1); assert.equal(state.bossesDefeated, practice ? 0 : 1);
  }
  for (const id of ids) for (const lives of [1, 3]) {
    const { state, input } = ready(id); state.practice = null; state.lives = lives;
    state.game.extra.armor = 0; stepRush(state, input, dt);
    assert.equal(state.result, 'failure'); assert.equal(state.lives, lives - 1); assert.equal(state.score, 0);
    nextRound(state, input); assert.equal(state.phase, lives === 1 ? 'over' : 'brief');
    if (lives > 1) assert.equal(isRushBoss(state.game.id), false);
  }
});
