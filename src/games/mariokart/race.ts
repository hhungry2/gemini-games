import type { CharacterId, CourseId, GameMode, KartState, TrackData } from './types';
import { CHARACTER_LIST } from './tracks';

export const GRAND_PRIX_POINTS = [9, 6, 3, 1, 0, 0, 0, 0] as const;
export const getGrandPrixPoints = (rank: number) => GRAND_PRIX_POINTS[rank - 1] ?? 0;
export type GrandPrixResults = Partial<Record<CourseId, Record<string, number>>>;

export function createRaceKarts(track: TrackData, playerChar: CharacterId, mode: GameMode): KartState[] {
  const playerGridIndex = mode === 'grand_prix' ? 7 : mode === 'time_trial' ? 0 : 4;
  const rivals = CHARACTER_LIST.filter((character) => character.id !== playerChar);
  let rivalIndex = 0;
  const karts: KartState[] = [];
  for (let i = 0; i < track.gridPositions.length; i++) {
    const isPlayer = i === playerGridIndex;
    if (mode === 'time_trial' && !isPlayer) continue;
    const charId = isPlayer ? playerChar : rivals[rivalIndex++].id;
    const grid = track.gridPositions[i];
    karts.push({
      id: isPlayer ? 'player' : `rival_${charId}`, charId, isPlayer,
      x: grid.x, y: grid.y, previousX: grid.x, previousY: grid.y,
      z: 0, vz: 0, angle: grid.angle, speed: 0, steer: 0,
      driftDir: 0, driftTime: 0, miniTurboLevel: 0,
      boostTimer: 0, starTimer: 0, lightningTimer: 0, spinTimer: 0,
      spinType: 'slip', invulnerableTimer: 0, coins: 0,
      item: 'none', itemRouletteTimer: 0, rouletteDisplayItem: 'none', holdingItem: false,
      lap: 1, checkpointIndex: 0, progress: 0,
      rank: mode === 'time_trial' ? 1 : i + 1,
      finished: false, finishTime: 0, totalDistance: 0, isAirborne: false,
      targetWpIndex: 1, aiAggression: 0.8 + Math.random() * 0.4,
      aiUseItemTimer: 2 + Math.random() * 4,
    });
  }
  return karts;
}

export function scoreGrandPrixRace(karts: KartState[]): Record<string, number> {
  return Object.fromEntries(karts.map((kart) => [kart.charId, getGrandPrixPoints(kart.rank)]));
}

export function getGrandPrixStandings(results: GrandPrixResults) {
  const totals = CHARACTER_LIST.map((character) => ({
    character,
    points: Object.values(results).reduce((sum, race) => sum + (race[character.id] ?? 0), 0),
  })).sort((a, b) => b.points - a.points);
  return totals.map((entry) => ({
    ...entry,
    rank: 1 + totals.filter((other) => other.points > entry.points).length,
  }));
}

// Storage may be disabled, full, or contain data from an older version.
export function readBestTimes(key: string): Record<string, number> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, value]) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0));
  } catch { return {}; }
}

export function readTrophies(key: string): Record<string, boolean> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value === true));
  } catch { return {}; }
}

export function saveRecord(key: string, value: object) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the in-memory record. */ }
}
