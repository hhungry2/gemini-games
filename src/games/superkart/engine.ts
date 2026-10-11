import { DRIVERS, TRACKS, at, angleDiff, project, wrap } from './tracks';
import { emptyInput } from './types';
import type { Input, Item, Kart, Mode, Race } from './types';

export const STEP = 1 / 60;
export const POINTS = [9, 6, 3, 1, 0, 0, 0, 0];
export const ITEMS: Record<Item, { icon: string; name: string; help: string }> =
  {
    mushroom: { icon: '🍄', name: 'キノコ', help: '一気にダッシュ' },
    shell: { icon: '🐢', name: 'こうら', help: '前方へ発射' },
    banana: { icon: '🍌', name: 'バナナ', help: '後ろにトラップ' },
    star: { icon: '★', name: 'スター', help: '無敵＆スピードUP' },
    lightning: { icon: 'ϟ', name: 'サンダー', help: 'ライバルを小さく' },
  };
function random(race: Race) {
  race.seed = (Math.imul(race.seed, 1664525) + 1013904223) >>> 0;
  return race.seed / 4294967296;
}
export function createRace(
  trackIndex: number,
  driver: number,
  cc: number,
  mode: Mode,
  seed = 2026,
): Race {
  const track = TRACKS[trackIndex];
  const order = [
    driver,
    ...DRIVERS.map((_, i) => i).filter((i) => i !== driver),
  ];
  const karts: Kart[] = order.slice(0, mode === 'trial' ? 1 : 8).map((d, i) => {
    const grid = i === 0 ? 7 : i - 1;
    const distance = mode === 'trial' ? -16 : -18 - Math.floor(grid / 2) * 21;
    const p = at(
      track,
      distance,
      mode === 'trial' ? 0 : grid % 2 === 0 ? -14 : 14,
    );
    return {
      ...p,
      id: i,
      driver: d,
      speed: 0,
      distance,
      pathS: wrap(distance, track.length),
      lap: 1,
      lapStart: 0,
      lapTimes: [],
      coins: 0,
      driftCharge: 0,
      driftDirection: 0,
      boost: 0,
      spin: 0,
      immune: 0,
      star: 0,
      small: 0,
      rescue: 0,
      item: mode === 'trial' ? 'mushroom' : null,
      roulette: 0,
      itemClock: 5 + i,
      finished: false,
      finishTime: 0,
      rank: mode === 'trial' ? 1 : 8 - i,
      offroad: false,
    };
  });
  const pickups: Race['pickups'] = [];
  for (let n = 1; n <= 4; n++) {
    const s = (track.length * (n - 0.5)) / 4;
    for (const offset of [-22, 0, 22]) {
      if (mode !== 'trial')
        pickups.push({ ...at(track, s, offset), kind: 'box', cooldown: 0 });
    }
    for (let j = 0; j < 4; j++)
      pickups.push({
        ...at(track, s + 95 + j * 22, 13),
        kind: 'coin',
        cooldown: 0,
      });
    if (n % 2 === 0)
      pickups.push({ ...at(track, s - 90, -16), kind: 'boost', cooldown: 0 });
  }
  return {
    track,
    mode,
    cc,
    laps: 3,
    karts,
    pickups,
    hazards: [],
    particles: [],
    time: 0,
    countdown: 3,
    done: false,
    seed,
    message: '',
    messageTime: 0,
    events: [],
    startHeld: false,
    startCharge: false,
  };
}

function message(race: Race, value: string) {
  race.message = value;
  race.messageTime = 1.6;
}
function spark(race: Race, kart: Kart, color: string, count = 6) {
  for (let i = 0; i < count; i++)
    race.particles.push({
      x: kart.x,
      y: kart.y,
      vx: (random(race) - 0.5) * 65,
      vy: (random(race) - 0.5) * 65,
      life: 0.3 + random(race) * 0.4,
      color,
    });
}
export function hit(race: Race, kart: Kart) {
  if (kart.finished || kart.immune > 0 || kart.star > 0 || kart.rescue > 0)
    return;
  kart.spin = 1.05;
  kart.immune = 2.2;
  kart.speed *= 0.28;
  kart.coins = Math.max(0, kart.coins - 2);
  kart.driftCharge = 0;
  kart.driftDirection = 0;
  spark(race, kart, '#ffd267', 14);
  if (kart.id === 0) {
    race.events.push('hit');
    message(race, 'スピン！ すぐに立て直そう');
  }
}
function rollItem(race: Race, kart: Kart): Item {
  const pool: Item[] =
    kart.rank <= 2
      ? ['banana', 'shell', 'mushroom', 'banana']
      : kart.rank <= 5
        ? ['shell', 'mushroom', 'star', 'shell']
        : ['star', 'lightning', 'mushroom', 'shell'];
  return pool[Math.floor(random(race) * pool.length)];
}
export function useItem(race: Race, kart: Kart) {
  if (!kart.item || kart.finished || kart.rescue > 0 || kart.spin > 0) return;
  const item = kart.item;
  kart.item = null;
  if (kart.id === 0) {
    race.events.push(item);
    message(race, `${ITEMS[item].name}！`);
  }
  if (item === 'mushroom') kart.boost = 2;
  if (item === 'star') {
    kart.star = 6;
    kart.spin = 0;
    kart.small = 0;
  }
  if (item === 'lightning') {
    for (const rival of race.karts)
      if (rival.id !== kart.id && !rival.finished && rival.star <= 0) {
        hit(race, rival);
        rival.small = 5;
      }
  }
  if (item === 'shell' || item === 'banana') {
    const distance = item === 'shell' ? 18 : -18;
    race.hazards.push({
      kind: item,
      x: kart.x + Math.cos(kart.angle) * distance,
      y: kart.y + Math.sin(kart.angle) * distance,
      angle: kart.angle,
      owner: kart.id,
      age: 0,
      life: item === 'shell' ? 6 : 20,
    });
  }
}

export function aiInput(race: Race, kart: Kart): Input {
  const look = 32 + kart.speed * 0.27;
  const target = at(
    race.track,
    kart.pathS + look,
    Math.sin(kart.driver * 8.1) * 10,
  );
  const diff = angleDiff(
    Math.atan2(target.y - kart.y, target.x - kart.x),
    kart.angle,
  );
  return {
    gas: true,
    brake: Math.abs(diff) > 0.95 && kart.speed > 95,
    left: diff < -0.035,
    right: diff > 0.035,
    drift: false,
    item: kart.itemClock <= 0 && !!kart.item,
  };
}

function drive(race: Race, kart: Kart, input: Input, dt: number) {
  const track = race.track,
    driver = DRIVERS[kart.driver];
  for (const key of [
    'boost',
    'spin',
    'immune',
    'star',
    'small',
    'rescue',
  ] as const)
    kart[key] = Math.max(0, kart[key] - dt);
  if (kart.rescue > 0) return;
  if (kart.roulette > 0) {
    kart.roulette -= dt;
    if (kart.roulette <= 0) {
      kart.item = rollItem(race, kart);
      if (kart.id === 0) race.events.push('pickup');
    }
  }
  kart.itemClock -= dt;
  if (input.item) {
    useItem(race, kart);
    kart.itemClock = 2.4 + random(race) * 3;
  }
  const before = project(track, kart);
  kart.offroad = before.distance > track.width * 0.51;
  const charged = kart.boost > 0 || kart.star > 0;
  const ccScale = race.cc === 50 ? 0.82 : race.cc === 150 ? 1.2 : 1;
  const rivalPace = kart.id === 0 ? 1 : 0.89 + (kart.driver % 4) * 0.018;
  const top =
    170 *
    ccScale *
    driver.speed *
    rivalPace *
    (1 + kart.coins * 0.009) *
    (charged ? 1.45 : 1) *
    (kart.small > 0 ? 0.65 : 1) *
    (kart.offroad && !charged ? 0.46 : 1);
  if (kart.spin <= 0) {
    const accel = 90 / driver.weight;
    kart.speed += (input.gas ? accel : -50) * dt;
    if (input.brake) kart.speed -= 160 * dt;
  } else kart.speed *= Math.exp(-dt * 4);
  if (kart.speed > top) kart.speed += (top - kart.speed) * Math.min(1, dt * 4);
  kart.speed = Math.max(0, Math.min(kart.speed, top * 1.1));
  const steer = Number(input.right) - Number(input.left);
  const canDrift =
    input.drift && kart.speed > 60 && !kart.offroad && kart.spin <= 0;
  if (canDrift && steer !== 0 && kart.driftDirection === 0)
    kart.driftDirection = steer;
  if (canDrift && kart.driftDirection !== 0) {
    kart.driftCharge = Math.min(2.5, kart.driftCharge + dt);
    if (random(race) < dt * 24)
      spark(race, kart, kart.driftCharge > 1.5 ? '#ffae4d' : '#61dcff', 1);
  } else if (kart.driftDirection !== 0) {
    if (kart.driftCharge > 0.65 && !kart.offroad && kart.spin <= 0) {
      kart.boost = kart.driftCharge > 1.5 ? 1.3 : 0.7;
      if (kart.id === 0) {
        race.events.push('boost');
        message(
          race,
          kart.driftCharge > 1.5 ? 'SUPER MINI-TURBO!' : 'MINI-TURBO!',
        );
      }
    }
    kart.driftCharge = 0;
    kart.driftDirection = 0;
  }
  if (kart.spin <= 0)
    kart.angle +=
      (steer * (canDrift ? 1.12 : 1) + kart.driftDirection * 0.2) *
      driver.turn *
      2.15 *
      Math.min(1, kart.speed / 65) *
      dt;
  const movementAngle = kart.angle - kart.driftDirection * 0.21;
  kart.x += Math.cos(movementAngle) * kart.speed * dt;
  kart.y += Math.sin(movementAngle) * kart.speed * dt;
  const nearest = project(track, kart);
  let delta = nearest.s - kart.pathS;
  if (delta > track.length / 2) delta -= track.length;
  if (delta < -track.length / 2) delta += track.length;
  // Projection must agree with real travel; jumping to another road section cannot award a lap.
  if (
    Math.abs(delta) < Math.max(12, kart.speed * dt * 3) &&
    nearest.distance < track.width * 1.2
  )
    kart.distance += delta;
  kart.pathS = nearest.s;
  if (
    nearest.distance >
    track.width *
      (track.theme === 'rainbow' || track.theme === 'haunted' ? 0.87 : 1.65)
  ) {
    const p = at(track, kart.distance);
    kart.x = p.x;
    kart.y = p.y;
    kart.angle = p.angle;
    kart.pathS = wrap(kart.distance, track.length);
    kart.speed = 0;
    kart.rescue = 1.25;
    kart.immune = 2.5;
    kart.driftDirection = 0;
    kart.driftCharge = 0;
    if (kart.id === 0) {
      message(race, 'ジュゲムがコースへ戻してくれた！');
      race.events.push('hit');
    }
    return;
  }
  const lap = Math.min(
    race.laps + 1,
    Math.max(1, Math.floor(kart.distance / track.length) + 1),
  );
  if (lap > kart.lap) {
    kart.lapTimes.push(race.time - kart.lapStart);
    kart.lapStart = race.time;
    kart.lap = lap;
    if (kart.id === 0 && lap <= race.laps) {
      message(
        race,
        lap === race.laps ? 'FINAL LAP!' : `LAP ${lap} / ${race.laps}`,
      );
      race.events.push('lap');
    }
  }
  if (kart.distance >= race.laps * track.length) {
    kart.finished = true;
    kart.finishTime = race.time;
    return;
  }
  for (const pickup of race.pickups) {
    if (
      pickup.cooldown > 0 ||
      Math.hypot(kart.x - pickup.x, kart.y - pickup.y) >
        (pickup.kind === 'boost' ? 18 : 13)
    )
      continue;
    if (pickup.kind === 'coin') {
      kart.coins = Math.min(10, kart.coins + 1);
      pickup.cooldown = 5;
      if (kart.id === 0) race.events.push('coin');
    }
    if (pickup.kind === 'box' && !kart.item && kart.roulette <= 0) {
      kart.roulette = 0.7;
      pickup.cooldown = 2.5;
    }
    if (pickup.kind === 'boost') {
      kart.boost = Math.max(kart.boost, 0.85);
    }
  }
}

export function updateRanks(race: Race) {
  const ranked = [...race.karts].sort((a, b) =>
    a.finished && b.finished
      ? a.finishTime - b.finishTime
      : a.finished
        ? -1
        : b.finished
          ? 1
          : b.distance - a.distance,
  );
  ranked.forEach((kart, i) => {
    kart.rank = i + 1;
  });
}

export function stepRace(race: Race, input: Input, dt = STEP) {
  if (race.done) return;
  // Clamp external steps so a long frame cannot skip collisions or finish gates.
  dt = Math.max(0, Math.min(dt, 1 / 30));
  if (race.countdown > 0) {
    if (input.gas && !race.startHeld)
      race.startCharge = race.countdown < 1.2 && race.countdown > 0.2;
    race.startHeld = input.gas;
    const before = Math.ceil(race.countdown);
    race.countdown = Math.max(0, race.countdown - dt);
    if (Math.ceil(race.countdown) !== before)
      race.events.push(race.countdown === 0 ? 'go' : 'count');
    if (race.countdown === 0) {
      message(race, 'GO!');
      if (race.startCharge && input.gas) {
        race.karts[0].boost = 1.7;
        message(race, 'ROCKET START!');
      }
    }
    return;
  }
  race.time += dt;
  race.messageTime = Math.max(0, race.messageTime - dt);
  for (const pickup of race.pickups)
    pickup.cooldown = Math.max(0, pickup.cooldown - dt);
  for (const kart of race.karts)
    if (!kart.finished)
      drive(race, kart, kart.id === 0 ? input : aiInput(race, kart), dt);
  for (let i = 0; i < race.karts.length; i++)
    for (let j = i + 1; j < race.karts.length; j++) {
      const a = race.karts[i],
        b = race.karts[j];
      if (a.finished || b.finished || a.rescue > 0 || b.rescue > 0) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0 && d < 12) {
        const dx = (a.x - b.x) / d,
          dy = (a.y - b.y) / d,
          push = (12 - d) * 0.5;
        a.x += dx * push;
        a.y += dy * push;
        b.x -= dx * push;
        b.y -= dy * push;
        if (a.star > 0) hit(race, b);
        if (b.star > 0) hit(race, a);
      }
    }
  for (const hazard of race.hazards) {
    hazard.life -= dt;
    hazard.age += dt;
    if (hazard.kind === 'shell') {
      hazard.x += Math.cos(hazard.angle) * 275 * dt;
      hazard.y += Math.sin(hazard.angle) * 275 * dt;
      if (project(race.track, hazard).distance > race.track.width * 0.62)
        hazard.life = 0;
    }
    if (hazard.life <= 0) continue;
    for (const kart of race.karts) {
      if (
        (kart.id === hazard.owner && hazard.age < 0.5) ||
        kart.finished ||
        kart.rescue > 0
      )
        continue;
      if (Math.hypot(hazard.x - kart.x, hazard.y - kart.y) < 13) {
        hit(race, kart);
        hazard.life = 0;
        break;
      }
    }
  }
  race.hazards = race.hazards.filter((h) => h.life > 0);
  for (const particle of race.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  race.particles = race.particles.filter((p) => p.life > 0).slice(-160);
  updateRanks(race);
  if (race.karts[0].finished) {
    race.done = true;
    race.events.push('finish');
  }
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--.---';
  const ms = Math.round(seconds * 1000);
  return `${Math.floor(ms / 60000)
    .toString()
    .padStart(2, '0')}:${Math.floor((ms / 1000) % 60)
    .toString()
    .padStart(2, '0')}.${(ms % 1000).toString().padStart(3, '0')}`;
}

export type Records = Record<string, number>;
export const STORAGE_KEY = 'superkart16_records_v1';
export function readRecords(storage?: Pick<Storage, 'getItem'>): Records {
  try {
    const data: unknown = JSON.parse(
      (storage ?? localStorage).getItem(STORAGE_KEY) ?? '{}',
    );
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(
        ([key, value]) =>
          /^(circuit|plains|ghost|rainbow)_(50|100|150)_(gp|race|trial)$/.test(
            key,
          ) &&
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value > 0,
      ),
    );
  } catch {
    return {};
  }
}
export function recordKey(race: Race) {
  return `${race.track.id}_${race.cc}_${race.mode}`;
}
export function saveRecord(
  race: Race,
  records: Records,
): { records: Records; best: boolean; persisted: boolean } {
  const key = recordKey(race),
    time = race.karts[0].finishTime;
  if (
    !race.done ||
    time <= 0 ||
    !Number.isFinite(time) ||
    (records[key] !== undefined && records[key] <= time)
  )
    return { records, best: false, persisted: true };
  const next = { ...records, [key]: time };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return { records: next, best: true, persisted: true };
  } catch {
    return { records: next, best: true, persisted: false };
  }
}
export { emptyInput };
