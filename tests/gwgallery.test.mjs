import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createManhole, tickManhole, createFire, tickFire, createOctopus, tickOctopus,
  moveDiver, createOil, tickOil, dumpOil, finishTransition,
} from '../src/games/gwgallery/engine.ts';
import { readBest, saveBest } from '../src/games/gwgallery/storage.ts';

function randomGenerator(seed = 42) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test('Manhole: each crossing awards one point and the tick leaves its input untouched', () => {
  const before = { ...createManhole(), playerPos: 0, pedestrians: [{ id: 1, street: 'upper', direction: 'left-to-right', step: 2 }] };
  const snapshot = structuredClone(before);
  assert.equal(tickManhole(before, 'gameA').score, 1);
  assert.equal(tickManhole(before, 'gameA').score, 1);
  assert.deepEqual(before, snapshot);
});

for (const difficulty of ['gameA', 'gameB']) {
  test(`Manhole ${difficulty}: 1,000 ticks never require different holes simultaneously`, () => {
    let state = createManhole();
    const random = randomGenerator();
    for (let i = 0; i < 1000; i++) {
      const demands = state.pedestrians.filter(p => p.step === 2 || p.step === 5).map(p => {
        const left = p.direction === 'left-to-right' ? p.step === 2 : p.step === 5;
        return (left ? 0 : 2) + (p.street === 'lower' ? 1 : 0);
      });
      assert.ok(new Set(demands).size <= 1, `conflicting holes at tick ${i}`);
      state = tickManhole({ ...state, playerPos: demands[0] ?? state.playerPos }, difficulty, random);
      assert.equal(state.misses, 0);
    }
    assert.ok(state.score > 100);
  });

  test(`Fire ${difficulty}: all three bounces and ambulance arrival remain playable`, () => {
    let state = createFire();
    for (let i = 0; i < 300; i++) {
      const demands = state.victims.filter(v => [1, 3, 5].includes(v.step)).map(v => (v.step - 1) / 2);
      assert.ok(new Set(demands).size <= 1);
      state = tickFire({ ...state, playerPos: demands[0] ?? state.playerPos }, difficulty);
      assert.equal(state.misses, 0);
    }
    assert.ok(state.score > 100);
  });
}

test('New pedestrians, victims and drops first appear in segment 0', () => {
  assert.equal(tickManhole({ ...createManhole(), tick: 3 }, 'gameA', () => 0).pedestrians[0].step, 0);
  assert.equal(tickFire({ ...createFire(), tick: 4 }, 'gameA').victims[0].step, 0);
  assert.equal(tickOil({ ...createOil(), tick: 3 }, 'gameA', () => 0).oilDrops[0].step, 0);
});

test('Fire shows the ambulance segment for one tick before removing the rescued person', () => {
  let state = { ...createFire(), playerPos: 2, victims: [{ id: 1, step: 5 }] };
  state = tickFire(state, 'gameA');
  assert.equal(state.score, 1);
  state = tickFire(state, 'gameA');
  assert.equal(state.victims[0].step, 7);
  state = tickFire(state, 'gameA');
  assert.equal(state.score, 2);
  assert.equal(state.victims.length, 0);
});

test('Octopus: both movement into a tentacle and extension onto a diver cause only one miss', () => {
  const before = { ...createOctopus(), diverPos: 1, tentacles: [2, 0, 0, 0], goldInBag: 4 };
  const caught = moveDiver(before, 1);
  assert.equal(caught.misses, 1);
  assert.equal(caught.goldInBag, 0);
  assert.equal(moveDiver(caught, 1), caught);
  const extended = tickOctopus({ ...createOctopus(), diverPos: 2, tentacles: [1, 0, 0, 0] });
  assert.equal(extended.misses, 1);
  const recovered = tickOctopus(caught, 'gameA');
  assert.equal(recovered.diverPos, 0);
  assert.deepEqual(recovered.tentacles, [0, 0, 0, 0]);
  assert.equal(recovered.activeTentacle, 0);
  assert.equal(recovered.tentacleDirection, 1);
});

test('Octopus: arms cycle left to right, extending and retracting one stage at a time', () => {
  let state = createOctopus();
  for (let cycle = 0; cycle < 5; cycle++) {
    for (let arm = 0; arm < 4; arm++) {
      assert.equal(state.activeTentacle, arm);
      for (const expectedLength of [1, 2, 1, 0]) {
        const before = structuredClone(state);
        const next = tickOctopus(state);
        assert.deepEqual(state, before, 'a clock transition must not mutate the previous snapshot');
        assert.equal(next.tentacles[arm], expectedLength);
        assert.ok(next.tentacles.every((length, index) => index === arm || length === 0), 'other arms must stay retracted');
        assert.equal(next.activeTentacle, expectedLength === 0 ? (arm + 1) % 4 : arm);
        assert.equal(next.misses, 0);
        state = next;
      }
    }
  }
});

test('Octopus: the longest stage catches the matching diver position on each of the four arms', () => {
  for (let arm = 0; arm < 4; arm++) {
    const initial = { ...createOctopus(), diverPos: arm + 2, activeTentacle: arm, goldInBag: 2 };
    const middle = tickOctopus(initial);
    assert.equal(middle.misses, 0, 'the middle stage must leave room to pass');
    const longest = tickOctopus(middle);
    assert.equal(longest.misses, 1);
    assert.equal(longest.diverPos, arm + 2);
    assert.equal(longest.goldInBag, 0);
    assert.equal(moveDiver(longest, -1), longest, 'inputs must be blocked during the catch');
    const recovered = tickOctopus(longest);
    assert.equal(recovered.activeTentacle, 0);
    assert.equal(recovered.diverPos, 0);
    assert.deepEqual(recovered.tentacles, [0, 0, 0, 0]);
    assert.equal(tickOctopus(recovered).tentacles[0], 1);
  }
});

test('Octopus: treasure collection and return bonus are credited once', () => {
  let state = moveDiver({ ...createOctopus(), diverPos: 5 }, 1);
  assert.equal(state.score, 1);
  assert.equal(state.goldInBag, 1);
  for (let i = 0; i < 5; i++) state = moveDiver(state, -1);
  assert.equal(state.score, 4);
  assert.equal(state.goldInBag, 0);
  assert.equal(moveDiver(state, -1), state);
});

test('Oil: consecutive dump inputs cannot pour the same bucket twice', () => {
  const dumped = dumpOil({ ...createOil(), playerPos: -1, bucketAmount: 3 });
  assert.equal(dumped.bucketAmount, 0);
  assert.equal(dumped.fallingOil.length, 1);
  assert.equal(dumped.fallingOil[0].amount, 3);
  assert.equal(dumpOil(dumped), dumped);
});

test('Oil uses the helper position displayed on the current tick for catches', () => {
  const state = { ...createOil(), tick: 1, fallingOil: [{ id: 1, side: 'left', amount: 3, step: 2 }] };
  const next = tickOil(state, 'gameA');
  assert.equal(next.helperPos, 0);
  assert.equal(next.score, 7);
  assert.equal(next.misses, 0);
});

test('Oil patrol follows adjacent positions instead of teleporting randomly', () => {
  let state = createOil();
  const positions = [];
  for (let i = 0; i < 8; i++) {
    state = tickOil({ ...state, oilDrops: [] }, 'gameA');
    if (state.tick % 2 === 0) positions.push(state.helperPos);
  }
  assert.deepEqual(positions, [0, 1, 2, 1]);
});

test('Oil counts simultaneous upper/lower failures as one miss and empties the bucket', () => {
  const state = { ...createOil(), bucketAmount: 3, oilDrops: [{ id: 1, lane: 1, step: 2 }],
    fallingOil: [{ id: 2, side: 'right', step: 2, amount: 2 }] };
  const next = tickOil(state, 'gameA');
  assert.equal(next.misses, 1);
  assert.equal(next.bucketAmount, 0);
  assert.equal(next.oilDrops.length, 0);
  assert.equal(next.fallingOil.length, 0);
  assert.deepEqual(next.sounds, ['miss']);
});

test('Oil checks capacity for every catch within a tick', () => {
  const state = { ...createOil(), bucketAmount: 2, oilDrops: [{ id: 1, lane: 1, step: 2 }, { id: 2, lane: 1, step: 2 }] };
  const next = tickOil(state, 'gameA');
  assert.equal(next.misses, 1);
  assert.equal(next.bucketAmount, 0);
});

test('300 point bonus clears misses once, and never revives a game over', () => {
  const bonus = finishTransition({ ...createFire(), score: 301, misses: 2 });
  assert.equal(bonus.misses, 0);
  assert.equal(bonus.bonusUsed, true);
  assert.equal(finishTransition({ ...bonus, misses: 1, score: 302 }).misses, 1);
  assert.equal(finishTransition({ ...createFire(), score: 301, misses: 3 }).misses, 3);
});

test('Finished games stay frozen and restart factories return clean state', () => {
  for (const [create, tick] of [[createManhole, tickManhole], [createFire, tickFire], [createOctopus, tickOctopus], [createOil, tickOil]]) {
    const ended = { ...create(), misses: 3, score: 99 };
    assert.equal(tick(ended, 'gameB'), ended);
    const restarted = create();
    assert.equal(restarted.score, 0);
    assert.equal(restarted.misses, 0);
    assert.equal(restarted.recoveryMs, 0);
  }
});

test('Best scores validate corrupt values, preserve larger records and tolerate denied storage', () => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  for (const value of ['bad', '-1', 'Infinity', '3.5']) {
    data.set('gw_fire_gameA', value);
    assert.equal(readBest('fire', 'gameA'), 0);
  }
  saveBest('fire', 'gameA', 42);
  saveBest('fire', 'gameA', 12);
  assert.equal(readBest('fire', 'gameA'), 42);
  assert.equal(readBest('fire', 'gameB'), 0);
  globalThis.localStorage = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); } };
  assert.equal(readBest('fire', 'gameA'), 0);
  assert.doesNotThrow(() => saveBest('fire', 'gameA', 1));
  delete globalThis.localStorage;
});
