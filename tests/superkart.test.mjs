import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers/superkart-harness.mjs';
const {
  createRace,
  stepRace,
  aiInput,
  emptyInput,
  useItem,
  hit,
  updateRanks,
  readRecords,
  formatTime,
  saveRecord,
} = load('engine');
const { TRACKS, at, wrap } = load('tracks');

test('All four courses finish at all three engine classes using real steering and physics', () => {
  for (let track = 0; track < 4; track++)
    for (const cc of [50, 100, 150]) {
      const race = createRace(track, track * 2, cc, 'trial');
      race.countdown = 0;
      for (let i = 0; i < 60 * 200 && !race.done; i++)
        stepRace(race, aiInput(race, race.karts[0]));
      assert.equal(
        race.done,
        true,
        `${TRACKS[track].id} ${cc}cc: d=${race.karts[0].distance.toFixed(0)} t=${race.time}`,
      );
      assert.equal(race.karts[0].lapTimes.length, 3);
      assert.equal(race.karts[0].lap, 4);
      assert.ok(race.karts[0].finishTime > 20);
      assert.equal(race.karts[0].rank, 1);
    }
});

test('Eight racers remain on course and complete every GP course with items enabled', () => {
  for (let track = 0; track < 4; track++) {
    const race = createRace(track, 0, 100, 'gp');
    race.countdown = 0;
    for (let i = 0; i < 60 * 200 && !race.done; i++)
      stepRace(race, aiInput(race, race.karts[0]));
    assert.equal(race.done, true, TRACKS[track].id);
    assert.equal(new Set(race.karts.map((k) => k.rank)).size, 8);
    assert.ok(
      race.karts.every((k) => k.distance > race.track.length),
      `${TRACKS[track].id}: a rival became stuck`,
    );
    assert.equal(new Set(race.karts.map((k) => k.driver)).size, 8);
  }
});

test('Countdown freezes the race and rocket start requires a fresh press near 1', () => {
  const early = createRace(0, 0, 100, 'trial');
  for (let i = 0; i < 180; i++) stepRace(early, { ...emptyInput(), gas: true });
  assert.equal(early.time, 0);
  assert.equal(early.karts[0].speed, 0);
  assert.equal(early.karts[0].boost, 0);
  const race = createRace(0, 0, 100, 'trial');
  race.countdown = 0.8;
  for (let i = 0; i < 49; i++) stepRace(race, { ...emptyInput(), gas: true });
  assert.ok(race.karts[0].boost > 1.5);
});

test('Standing still at the start, reversing, or teleporting across a lap cannot finish', () => {
  const race = createRace(0, 0, 100, 'trial');
  race.countdown = 0;
  const k = race.karts[0];
  for (let i = 0; i < 120; i++) stepRace(race, emptyInput());
  assert.equal(k.lap, 1);
  assert.equal(k.lapTimes.length, 0);
  for (let i = 1; i < 100; i++) {
    const p = at(race.track, (i * race.track.length) / 8);
    k.x = p.x;
    k.y = p.y;
    stepRace(race, emptyInput());
  }
  assert.equal(k.finished, false);
  assert.equal(k.lapTimes.length, 0);
  const reverse = createRace(0, 0, 100, 'trial');
  reverse.countdown = 0;
  Object.assign(reverse.karts[0], at(reverse.track, 5), {
    distance: 5,
    pathS: 5,
    speed: 60,
  });
  reverse.karts[0].angle += Math.PI;
  for (let i = 0; i < 30; i++)
    stepRace(reverse, { ...emptyInput(), gas: true });
  assert.ok(reverse.karts[0].distance < 0);
  assert.equal(reverse.karts[0].lap, 1);
});

test('Track rescue restores the last earned distance instead of awarding forward progress', () => {
  const race = createRace(3, 0, 100, 'trial');
  race.countdown = 0;
  const k = race.karts[0],
    earned = k.distance;
  k.x = -500;
  k.y = -500;
  stepRace(race, emptyInput());
  assert.equal(k.distance, earned);
  assert.ok(k.rescue > 1);
  assert.equal(k.speed, 0);
  const p = at(race.track, earned);
  assert.equal(k.x, p.x);
  assert.equal(k.y, p.y);
});

test('Releasing a charged drift produces a turbo, while losing grip clears the charge', () => {
  const race = createRace(0, 0, 100, 'trial');
  race.countdown = 0;
  const k = race.karts[0];
  Object.assign(k, at(race.track, 0), {
    pathS: 0,
    distance: 0,
    speed: 100,
    driftCharge: 1.8,
    driftDirection: 1,
  });
  stepRace(race, { ...emptyInput(), gas: true });
  assert.ok(k.boost > 1.2);
  assert.equal(k.driftCharge, 0);
  const p = at(race.track, k.pathS, race.track.width * 0.7);
  k.x = p.x;
  k.y = p.y;
  k.driftCharge = 1.8;
  k.driftDirection = 1;
  k.boost = 0;
  stepRace(race, emptyInput());
  assert.equal(k.boost, 0);
  assert.equal(k.driftCharge, 0);
});

test('All five items have effects, protection blocks hits, and projectiles collide', () => {
  const race = createRace(0, 0, 100, 'race');
  race.countdown = 0;
  const k = race.karts[0],
    rival = race.karts[1];
  k.item = 'mushroom';
  useItem(race, k);
  assert.equal(k.item, null);
  assert.equal(k.boost, 2);
  k.item = 'banana';
  useItem(race, k);
  assert.equal(race.hazards[0].kind, 'banana');
  k.item = 'shell';
  useItem(race, k);
  assert.equal(race.hazards[1].kind, 'shell');
  k.item = 'star';
  useItem(race, k);
  hit(race, k);
  assert.equal(k.spin, 0);
  assert.equal(k.star, 6);
  k.item = 'lightning';
  useItem(race, k);
  assert.equal(rival.small, 5);
  assert.ok(rival.spin > 0);
  assert.equal(k.small, 0);
  const h = race.hazards[1];
  Object.assign(rival, {
    x: h.x + Math.cos(h.angle) * 4,
    y: h.y + Math.sin(h.angle) * 4,
    spin: 0,
    immune: 0,
    speed: 0,
  });
  stepRace(race, emptyInput());
  assert.ok(rival.spin > 0);
  assert.equal(
    race.hazards.some((x) => x === h),
    false,
  );
});

test('Finished order is stable and a completed race stops changing', () => {
  const race = createRace(0, 0, 100, 'race'),
    [a, b] = race.karts;
  a.finished = true;
  a.finishTime = 10;
  b.finished = true;
  b.finishTime = 9;
  a.distance = 99999;
  updateRanks(race);
  assert.equal(b.rank, 1);
  assert.equal(a.rank, 2);
  race.done = true;
  const before = structuredClone(race);
  stepRace(race, { ...emptyInput(), gas: true });
  assert.deepEqual(race, before);
});

test('Restart is independent, time trials have no opponents or item boxes, coin pickups cap at 10', () => {
  const a = createRace(0, 0, 100, 'trial'),
    b = createRace(0, 0, 100, 'trial');
  a.karts[0].coins = 9;
  a.pickups[0].cooldown = 10;
  assert.equal(b.karts[0].coins, 0);
  assert.equal(b.pickups[0].cooldown, 0);
  assert.equal(b.karts.length, 1);
  assert.equal(
    b.pickups.some((p) => p.kind === 'box'),
    false,
  );
  a.countdown = 0;
  const k = a.karts[0];
  const p = at(a.track, 100);
  Object.assign(k, p, { distance: 100, pathS: wrap(100, a.track.length) });
  a.pickups = [
    { ...p, kind: 'coin', cooldown: 0 },
    { ...p, kind: 'coin', cooldown: 0 },
    { ...p, kind: 'coin', cooldown: 0 },
  ];
  stepRace(a, emptyInput());
  assert.equal(k.coins, 10);
});

test('Record loading rejects corrupt values, format carries milliseconds, and blocked storage is handled', () => {
  assert.deepEqual(readRecords({ getItem: () => '{broken' }), {});
  assert.deepEqual(
    readRecords({
      getItem: () =>
        JSON.stringify({
          circuit_100_trial: 85,
          rainbow_150_gp: -2,
          ghost_50_race: 'fast',
          anything: 12,
        }),
    }),
    { circuit_100_trial: 85 },
  );
  assert.equal(formatTime(59.9998), '01:00.000');
  assert.equal(formatTime(NaN), '--:--.---');
  const race = createRace(0, 0, 100, 'trial');
  race.done = true;
  race.karts[0].finishTime = 90;
  const result = saveRecord(race, {});
  assert.equal(result.best, true);
  assert.equal(result.persisted, false);
  assert.equal(result.records.circuit_100_trial, 90);
  assert.equal(saveRecord(race, { circuit_100_trial: 80 }).best, false);
});
