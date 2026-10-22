export const WORLD_SIZE = 2640;
export const ROAD_STEP = 440;
export const ROAD_START = 220;
export const INITIAL_RADIUS = 24;
export const HOLE_COLORS = ['#15c5d3', '#f57985', '#f2ae47', '#9279dd', '#4daa8b', '#5093d4'];
export const TIER_NAMES = ['人・小物', '街路樹', 'クルマ', 'バス', '家', 'ビル', 'タワー'];
export const TIER_RADII = [0, 27, 37, 50, 65, 88, 118];

export type CityKind = 'person' | 'cone' | 'tree' | 'car' | 'bus' | 'house' | 'office' | 'tower';
export interface CityObject {
  id: number;
  kind: CityKind;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  required: number;
  value: number;
  color: string;
  angle: number;
  swallowed: boolean;
  eater: number;
  fall: number;
}
export interface Hole {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  score: number;
  mass: number;
  kills: number;
  eaten: number;
  color: string;
  stamina: number;
  respawn: number;
  shield: number;
  target: number;
  rethink: number;
  combo: number;
  comboTime: number;
  peakRadius: number;
}
export interface FloatingScore { x: number; y: number; text: string; color: string; life: number }
export interface HoleInput { x: number; y: number; boost: boolean }
export interface HoleWorld {
  objects: CityObject[];
  holes: Hole[];
  elapsed: number;
  duration: number;
  ended: boolean;
  seed: number;
  floaters: FloatingScore[];
  message: string;
  messageTime: number;
  tier: number;
  swallowSerial: number;
  killSerial: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export const radiusForScore = (score: number) => Math.min(184, Math.sqrt(INITIAL_RADIUS ** 2 + Math.max(0, score) * 6.4));
export const tierForRadius = (radius: number) => TIER_RADII.reduce((tier, required, index) => radius >= required ? index : tier, 0);
export const canEatObject = (hole: Hole, object: CityObject) => hole.respawn <= 0 && !object.swallowed && object.eater < 0 && hole.radius >= object.required;
export const canEatHole = (hunter: Hole, prey: Hole) => hunter.id !== prey.id && hunter.respawn <= 0 && prey.respawn <= 0 && hunter.shield <= 0 && prey.shield <= 0 && hunter.radius > prey.radius * 1.32;
export const ranking = (world: HoleWorld) => [...world.holes].sort((a, b) => b.score - a.score || b.radius - a.radius || a.id - b.id);

function randomGenerator(seed: number) {
  let value = seed | 0;
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

/** Fixed city blocks give players a readable route from sidewalks to skyscrapers. */
export function createHoleWorld(duration = 120, seed = Date.now(), color = HOLE_COLORS[0]): HoleWorld {
  const random = randomGenerator(seed);
  const objects: CityObject[] = [];
  const add = (kind: CityKind, x: number, y: number, angle = 0) => {
    const spec: Record<CityKind, [number, number, number, number, number, string[]]> = {
      person: [9, 9, 14, 13, 5, ['#e78b79', '#5f8ca5', '#a18cbd', '#ddb45c']],
      cone: [13, 13, 16, 17, 7, ['#ed945b']],
      tree: [34, 30, 36, 27, 15, ['#66a786', '#83b67e', '#409f91']],
      car: [27, 47, 16, 37, 29, ['#f0c76b', '#83adca', '#eaa49c', '#eee9d9', '#a99ac6']],
      bus: [32, 79, 24, 50, 63, ['#deaf65', '#89b5a5']],
      house: [78, 70, 43, 65, 140, ['#e9b4a4', '#a6c4c4', '#d0c3a7', '#a3b8cb']],
      office: [102, 88, 78, 88, 300, ['#9fb4c0', '#adc7c8', '#c9bdaf']],
      tower: [120, 108, 133, 118, 620, ['#92a9b7', '#a7bfc7', '#c1b2b3']],
    };
    const [width, depth, height, required, value, colors] = spec[kind];
    objects.push({ id: objects.length, kind, x, y, width, depth, height, required, value, color: colors[Math.floor(random() * colors.length)], angle, swallowed: false, eater: -1, fall: 0 });
  };

  for (let bx = 0; bx < 5; bx++) for (let by = 0; by < 5; by++) {
    const x = 440 + bx * ROAD_STEP;
    const y = 440 + by * ROAD_STEP;
    const park = (bx + by * 2) % 5 === 0;
    if (park) {
      for (let i = 0; i < 13; i++) add('tree', x + (random() - 0.5) * 270, y + (random() - 0.5) * 260);
      for (let i = 0; i < 10; i++) add('person', x + (random() - 0.5) * 250, y + (random() - 0.5) * 250);
    } else {
      for (let dx = -1; dx <= 1; dx += 2) for (let dy = -1; dy <= 1; dy += 2) {
        const kind = (bx + by + (dx === dy ? 1 : 0)) % 4;
        add(kind === 0 ? 'tower' : kind === 1 ? 'office' : 'house', x + dx * 78, y + dy * 78);
      }
    }
    for (let i = 0; i < 7; i++) {
      const p = -145 + i * 48;
      add(i % 3 === 0 ? 'tree' : 'person', x + p, y - 158);
      add(i % 3 === 1 ? 'tree' : 'person', x + 158, y + p);
      add(i % 4 === 0 ? 'cone' : 'person', x + p, y + 158);
      add(i % 3 === 0 ? 'tree' : 'person', x - 158, y + p);
    }
    add('car', x - 47, y - 205, Math.PI / 2);
    add('car', x + 68, y + 207, Math.PI / 2);
    add((bx + by) % 3 === 0 ? 'bus' : 'car', x - 206, y + 62);
    add('car', x + 206, y - 67);
  }
  // A generous starting corner teaches the first growth step within seconds.
  for (let i = 0; i < 19; i++) {
    const angle = i * 2.399;
    const r = 38 + (i % 4) * 20;
    add(i % 5 === 0 ? 'cone' : 'person', 1100 + Math.cos(angle) * r, 1100 + Math.sin(angle) * r);
  }
  const spawns = [[1100, 1100], [220, 660], [1980, 220], [660, 1980], [2420, 1540], [1540, 2420]];
  const names = ['YOU', 'モモ', 'ライム', 'スミレ', 'ミント', 'ソラ'];
  const holes = spawns.map(([x, y], id): Hole => ({ id, name: names[id], x, y, vx: 0, vy: 0, radius: INITIAL_RADIUS, score: 0, mass: 0, kills: 0, eaten: 0, color: id === 0 ? color : HOLE_COLORS[id], stamina: 100, respawn: 0, shield: 4, target: -1, rethink: id * 0.1, combo: 0, comboTime: 0, peakRadius: INITIAL_RADIUS }));
  return { objects, holes, elapsed: 0, duration: duration === 90 ? 90 : 120, ended: false, seed, floaters: [], message: '小さなものから、いただきます！', messageTime: 4, tier: 0, swallowSerial: 0, killSerial: 0 };
}

function chooseBotDirection(world: HoleWorld, hole: Hole, dt: number): HoleInput {
  // Escape a nearby larger hole, and pursue weaker opponents only at close range.
  let flee: Hole | undefined;
  let prey: Hole | undefined;
  for (const other of world.holes) {
    const d = distance(hole, other);
    if (canEatHole(other, hole) && d < other.radius + 165) flee = other;
    else if (canEatHole(hole, other) && d < hole.radius + 160) prey = other;
  }
  if (flee) return { x: hole.x - flee.x, y: hole.y - flee.y, boost: true };
  if (prey) return { x: prey.x - hole.x, y: prey.y - hole.y, boost: false };
  hole.rethink -= dt;
  let target = world.objects[hole.target];
  if (hole.rethink <= 0 || !target || !canEatObject(hole, target)) {
    let best = Infinity;
    let bestId = -1;
    for (const object of world.objects) {
      if (!canEatObject(hole, object)) continue;
      const d = distance(hole, object);
      const cost = d / Math.pow(object.value, 0.32);
      if (cost < best) { best = cost; bestId = object.id; }
    }
    hole.target = bestId;
    hole.rethink = 0.6 + hole.id * 0.08;
    target = world.objects[bestId];
  }
  return target ? { x: target.x - hole.x, y: target.y - hole.y, boost: false } : { x: Math.sin(world.elapsed + hole.id), y: Math.cos(world.elapsed * 0.7 + hole.id), boost: false };
}

function finishSwallow(world: HoleWorld, object: CityObject) {
  const hole = world.holes[object.eater];
  object.swallowed = true;
  if (!hole || hole.respawn > 0) return;
  hole.combo = hole.comboTime > 0 ? hole.combo + 1 : 1;
  hole.comboTime = 1.25;
  const score = Math.round(object.value * (1 + Math.min(hole.combo - 1, 10) * 0.025));
  hole.score += score;
  hole.mass += score;
  hole.eaten++;
  hole.radius = radiusForScore(hole.mass);
  hole.peakRadius = Math.max(hole.radius, hole.peakRadius);
  if (hole.id === 0) {
    world.swallowSerial++;
    if (world.floaters.length < 18) world.floaters.push({ x: hole.x, y: hole.y - hole.radius, text: `+${score}`, color: '#087d79', life: 1.0 });
    const tier = tierForRadius(hole.radius);
    if (tier > world.tier) {
      world.tier = tier;
      world.message = `SIZE UP! ${TIER_NAMES[tier]}を飲み込める！`;
      world.messageTime = 3;
      world.floaters.push({ x: hole.x, y: hole.y, text: 'SIZE UP!', color: '#ef8a35', life: 1.8 });
    }
  }
}

/** Simulation is frame-rate independent; callers may use a fixed 1/60 second step. */
export function stepHoleWorld(world: HoleWorld, input: HoleInput, rawDt: number): void {
  if (world.ended || !Number.isFinite(rawDt) || rawDt <= 0) return;
  const dt = Math.min(rawDt, 0.05, world.duration - world.elapsed);
  world.elapsed = Math.min(world.duration, world.elapsed + dt);
  world.messageTime = Math.max(0, world.messageTime - dt);
  for (const floater of world.floaters) { floater.life -= dt; floater.y -= dt * 23; }
  world.floaters = world.floaters.filter(floater => floater.life > 0);
  for (const hole of world.holes) {
    hole.comboTime = Math.max(0, hole.comboTime - dt);
    if (hole.comboTime === 0) hole.combo = 0;
    hole.shield = Math.max(0, hole.shield - dt);
    if (hole.respawn > 0) {
      hole.respawn = Math.max(0, hole.respawn - dt);
      if (hole.respawn === 0) {
        // Spawn away from hunters. Scores are kept for a fair timed ranking.
        const points = [[220, 220], [2420, 220], [220, 2420], [2420, 2420], [1320, 1320]];
        const point = points.sort((a, b) => {
          const safety = (p: number[]) => Math.min(...world.holes.filter(h => h.id !== hole.id && h.respawn <= 0).map(h => Math.hypot(h.x - p[0], h.y - p[1])));
          return safety(b) - safety(a);
        })[0];
        hole.x = point[0]; hole.y = point[1]; hole.shield = 4;
        hole.mass *= 0.48;
        hole.radius = radiusForScore(hole.mass);
        hole.stamina = 100;
      }
      continue;
    }
    const movement = hole.id === 0 ? input : chooseBotDirection(world, hole, dt);
    const len = Math.hypot(movement.x, movement.y);
    const moving = Number.isFinite(len) && len > 0.02;
    const boosting = moving && movement.boost && hole.stamina > 1;
    hole.stamina = clamp(hole.stamina + dt * (boosting ? -31 : 19), 0, 100);
    const speed = (hole.id === 0 ? 205 : 160 + hole.id * 4) * (1 - Math.min(0.33, (hole.radius - INITIAL_RADIUS) / 450)) * (boosting ? 1.65 : 1);
    const factor = 1 - Math.exp(-dt * 12);
    const amplitude = Math.min(1, len);
    hole.vx += ((moving ? movement.x / len * speed * amplitude : 0) - hole.vx) * factor;
    hole.vy += ((moving ? movement.y / len * speed * amplitude : 0) - hole.vy) * factor;
    hole.x = clamp(hole.x + hole.vx * dt, hole.radius, WORLD_SIZE - hole.radius);
    hole.y = clamp(hole.y + hole.vy * dt, hole.radius, WORLD_SIZE - hole.radius);
  }
  for (const object of world.objects) {
    if (object.swallowed) continue;
    if (object.eater >= 0) {
      object.fall += dt / (object.kind === 'tower' || object.kind === 'office' ? 0.6 : 0.38);
      if (object.fall >= 1) finishSwallow(world, object);
      continue;
    }
    for (const hole of world.holes) {
      if (canEatObject(hole, object) && distance(hole, object) < hole.radius * 0.84) {
        object.eater = hole.id;
        object.fall = 0;
        break;
      }
    }
  }
  for (const hunter of world.holes) for (const prey of world.holes) {
    if (!canEatHole(hunter, prey) || distance(hunter, prey) > hunter.radius - prey.radius * 0.35) continue;
    hunter.kills++;
    const bonus = Math.round(65 + prey.radius * 2);
    hunter.score += bonus;
    hunter.mass += bonus;
    hunter.radius = radiusForScore(hunter.mass);
    hunter.peakRadius = Math.max(hunter.peakRadius, hunter.radius);
    prey.respawn = 3;
    prey.vx = 0; prey.vy = 0;
    for (const object of world.objects) {
      if (object.eater === prey.id && !object.swallowed) { object.eater = -1; object.fall = 0; }
    }
    if (hunter.id === 0 || prey.id === 0) {
      world.message = hunter.id === 0 ? `${prey.name}を飲み込んだ！ +${bonus}` : `${hunter.name}に飲み込まれた！ 3秒で復活`;
      world.messageTime = 3;
      world.killSerial++;
    }
  }
  if (world.elapsed >= world.duration - 1e-8) { world.elapsed = world.duration; world.ended = true; }
}

export function getGrowthProgress(hole: Hole): { next: string; progress: number } {
  const tier = tierForRadius(hole.radius);
  if (tier >= TIER_RADII.length - 1) return { next: '街をまるごと、いただきます', progress: 1 };
  const start = Math.max(INITIAL_RADIUS, TIER_RADII[tier]);
  return { next: `次は${TIER_NAMES[tier + 1]}`, progress: clamp((hole.radius - start) / (TIER_RADII[tier + 1] - start), 0, 1) };
}
