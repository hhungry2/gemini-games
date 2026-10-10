import type { BugEnemy, LaserGate, Pin, SpinDoctorSaveData, StageRecord, Wall } from './SpinDoctorGame';

export const ROD_LENGTH = 70;
export const LATCH_RADIUS = 24;
const TAU = Math.PI * 2;

export function pointSegmentDistance(
  x: number, y: number, x1: number, y1: number, x2: number, y2: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0
    : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
}

export function segmentDistance(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
) {
  const cross = (x1: number, y1: number, x2: number, y2: number) => x1 * y2 - y1 * x2;
  const denominator = cross(bx - ax, by - ay, dx - cx, dy - cy);
  if (Math.abs(denominator) > 1e-9) {
    const t = cross(cx - ax, cy - ay, dx - cx, dy - cy) / denominator;
    const u = cross(cx - ax, cy - ay, bx - ax, by - ay) / denominator;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(
    pointSegmentDistance(ax, ay, cx, cy, dx, dy),
    pointSegmentDistance(bx, by, cx, cy, dx, dy),
    pointSegmentDistance(cx, cy, ax, ay, bx, by),
    pointSegmentDistance(dx, dy, ax, ay, bx, by),
  );
}

export function canReachPin(a: Pin, b: Pin) {
  return a.id !== b.id && !a.isDecayed && !b.isDecayed
    && a.type !== 'acid' && b.type !== 'acid'
    && Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - ROD_LENGTH) < LATCH_RADIUS;
}

export function findLatchTarget(pins: Pin[], pivot: Pin, angle: number,
  obstacles: { walls?: Wall[]; laserGates?: LaserGate[]; enemies?: BugEnemy[] } = {},
): Pin | null {
  const x = pivot.x + Math.cos(angle) * ROD_LENGTH;
  const y = pivot.y + Math.sin(angle) * ROD_LENGTH;
  let best: Pin | null = null;
  let distance = LATCH_RADIUS;
  for (const pin of pins) {
    if (!canReachPin(pivot, pin)) continue;
    const nextDistance = Math.hypot(x - pin.x, y - pin.y);
    if (nextDistance <= distance) {
      const newAngle = Math.atan2(pivot.y - pin.y, pivot.x - pin.x);
      const endX = pin.x + Math.cos(newAngle) * ROD_LENGTH;
      const endY = pin.y + Math.sin(newAngle) * ROD_LENGTH;
      // Check both the gap being snapped across and the resulting rod pose.
      const blocked = (obstacles.walls ?? []).some((wall) =>
        segmentDistance(pivot.x, pivot.y, pin.x, pin.y, wall.x1, wall.y1, wall.x2, wall.y2) <= 7
        || segmentDistance(pin.x, pin.y, endX, endY, wall.x1, wall.y1, wall.x2, wall.y2) <= 7
        || pointSegmentDistance(endX, endY, wall.x1, wall.y1, wall.x2, wall.y2) <= 14)
        || (obstacles.laserGates ?? []).some((gate) => !gate.isOpen && (
          segmentDistance(pivot.x, pivot.y, pin.x, pin.y, gate.x1, gate.y1, gate.x2, gate.y2) <= 6
          || segmentDistance(pin.x, pin.y, endX, endY, gate.x1, gate.y1, gate.x2, gate.y2) <= 6
          || pointSegmentDistance(endX, endY, gate.x1, gate.y1, gate.x2, gate.y2) <= 13));
      const hazardous = pins.some((acid) => acid.type === 'acid' && (
        pointSegmentDistance(acid.x, acid.y, pin.x, pin.y, endX, endY) < 18
        || Math.hypot(endX - acid.x, endY - acid.y) < 22))
        || (obstacles.enemies ?? []).some((enemy) =>
          pointSegmentDistance(enemy.x, enemy.y, pin.x, pin.y, endX, endY) < enemy.radius + 3
          || Math.hypot(pin.x - enemy.x, pin.y - enemy.y) < enemy.radius + 6
          || Math.hypot(endX - enemy.x, endY - enemy.y) < enemy.radius + 8);
      if (blocked || hazardous) continue;
      best = pin;
      distance = nextDistance;
    }
  }
  return best;
}

// Stage speeds are expressed as pixels/radians per frame at the original 60 Hz.
export function advanceEnemy(enemy: BugEnemy, dt: number) {
  if (enemy.type === 'patrol' && enemy.p1 && enemy.p2) {
    const distance = Math.hypot(enemy.p2.x - enemy.p1.x, enemy.p2.y - enemy.p1.y);
    let progress = (enemy.progress ?? 0)
      + (distance === 0 ? 0 : (enemy.speed ?? 1.8) * 60 * dt / distance) * (enemy.dir ?? 1);
    while (progress > 1 || progress < 0) {
      if (progress > 1) { progress = 2 - progress; enemy.dir = -1; }
      if (progress < 0) { progress = -progress; enemy.dir = 1; }
    }
    enemy.progress = progress;
    enemy.x = enemy.p1.x + (enemy.p2.x - enemy.p1.x) * progress;
    enemy.y = enemy.p1.y + (enemy.p2.y - enemy.p1.y) * progress;
  } else if (enemy.type === 'orbit') {
    enemy.angle = ((enemy.angle ?? 0) + (enemy.orbitSpeed ?? 0.04) * 60 * dt) % TAU;
    enemy.x = (enemy.centerX ?? 0) + Math.cos(enemy.angle) * (enemy.orbitRadius ?? 40);
    enemy.y = (enemy.centerY ?? 0) + Math.sin(enemy.angle) * (enemy.orbitRadius ?? 40);
  }
}

export function getStarCount(gears: number, timeLeft: number, timeLimit: number) {
  if (gears >= 3 && timeLeft >= timeLimit * 0.25) return 3;
  return gears >= 2 ? 2 : 1;
}

export function fitCanvas(width: number, height: number, fullscreen: boolean) {
  const scale = Math.max(0, Math.min(width / 800, height / 560, fullscreen ? Infinity : 1));
  return { width: 800 * scale, height: 560 * scale };
}

// Ignore malformed/obsolete fields and rebuild totals from valid stage records.
export function normalizeSaveData(value: unknown, stageCount: number): SpinDoctorSaveData {
  const records: Record<number, StageRecord> = {};
  if (value && typeof value === 'object' && 'records' in value
    && value.records && typeof value.records === 'object') {
    for (let stage = 1; stage <= stageCount; stage++) {
      const record = (value.records as Record<string, unknown>)[stage];
      if (!record || typeof record !== 'object') continue;
      const r = record as Partial<StageRecord>;
      if (r.cleared !== true) continue;
      const validNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
      records[stage] = {
        cleared: true,
        stars: validNumber(r.stars) ? Math.min(3, Math.max(1, Math.floor(r.stars!))) : 1,
        bestTime: validNumber(r.bestTime) ? r.bestTime! : 0,
        highScore: validNumber(r.highScore) ? Math.floor(r.highScore!) : 0,
      };
    }
  }
  return {
    records,
    totalScore: Object.values(records).reduce((total, record) => total + record.highScore, 0),
    totalStars: Object.values(records).reduce((total, record) => total + record.stars, 0),
  };
}
