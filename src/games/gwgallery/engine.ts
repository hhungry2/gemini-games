import type { GameDifficulty } from './types';

export type SoundEvent = 'tick' | 'catch' | 'score' | 'miss' | 'bonus' | 'octoStep' | 'drop' | 'dump';
export interface SessionState {
  score: number;
  misses: number;
  tick: number;
  recoveryMs: number;
  bonusUsed: boolean;
  sounds: SoundEvent[];
}

const initialSession = (): SessionState => ({
  score: 0, misses: 0, tick: 0, recoveryMs: 0, bonusUsed: false, sounds: [],
});
export const canPlay = (state: SessionState) => state.misses < 3 && state.recoveryMs === 0;

/** Apply the score bonus once, without reviving a finished game. */
export function finishTransition<S extends SessionState>(state: S): S {
  if (state.score >= 300 && !state.bonusUsed && state.misses < 3) {
    return { ...state, misses: 0, bonusUsed: true, sounds: [...state.sounds, 'bonus'] };
  }
  return state;
}

export type ManholePosition = 0 | 1 | 2 | 3;
interface Pedestrian {
  id: number;
  street: 'upper' | 'lower';
  direction: 'left-to-right' | 'right-to-left';
  step: number;
}
export interface ManholeState extends SessionState {
  playerPos: ManholePosition;
  pedestrians: Pedestrian[];
  nextId: number;
  missAnimation: ManholePosition | null;
}
export const createManhole = (): ManholeState => ({
  ...initialSession(), playerPos: 1, pedestrians: [], nextId: 1, missAnimation: null,
});

function holeAt(p: Pedestrian, step: number): ManholePosition | null {
  if (step !== 3 && step !== 6) return null;
  const left = p.direction === 'left-to-right' ? step === 3 : step === 6;
  return ((left ? 0 : 2) + (p.street === 'lower' ? 1 : 0)) as ManholePosition;
}

/** Never ask the player to cover two different holes on the same tick. */
export function canSpawnPedestrian(candidate: Pedestrian, pedestrians: Pedestrian[]) {
  return pedestrians.every(p => [3, 6].every(step => {
    if (step <= p.step) return true;
    const arrival = step - p.step;
    const newHole = holeAt(candidate, arrival);
    return newHole === null || newHole === holeAt(p, step);
  }));
}

export function tickManhole(state: ManholeState, difficulty: GameDifficulty, random = Math.random): ManholeState {
  if (state.misses >= 3) return state;
  if (state.recoveryMs) return { ...state, recoveryMs: 0, missAnimation: null, tick: 0, sounds: [] };
  const next: ManholeState = { ...state, tick: state.tick + 1, pedestrians: [], sounds: [] };
  for (const p of state.pedestrians) {
    const step = p.step + 1;
    const hole = holeAt(p, step);
    if (hole !== null && hole !== state.playerPos) {
      return { ...next, pedestrians: [], misses: state.misses + 1, missAnimation: hole, recoveryMs: 1100, sounds: ['miss'] };
    }
    if (hole !== null) next.score += 1;
    if (step === 10) next.score += 2;
    else next.pedestrians.push({ ...p, step });
  }
  if (next.tick % (difficulty === 'gameA' ? 4 : 3) === 0) {
    const candidates: Pedestrian[] = [];
    for (const street of ['upper', 'lower'] as const) {
      for (const direction of ['left-to-right', 'right-to-left'] as const) {
        const candidate = { id: next.nextId, street, direction, step: 0 };
        if (!next.pedestrians.some(p => p.street === street && p.direction === direction && p.step <= 2)
          && canSpawnPedestrian(candidate, next.pedestrians)) candidates.push(candidate);
      }
    }
    if (candidates.length) {
      next.pedestrians.push(candidates[Math.floor(random() * candidates.length)]);
      next.nextId++;
    }
  }
  next.sounds = next.score > state.score ? ['score'] : next.pedestrians.length ? ['tick'] : [];
  return next;
}

export type RescuePosition = 0 | 1 | 2;
export interface FireState extends SessionState {
  playerPos: RescuePosition;
  victims: { id: number; step: number }[];
  nextId: number;
  missAnimation: number | null;
}
export const createFire = (): FireState => ({
  ...initialSession(), playerPos: 1, victims: [], nextId: 1, missAnimation: null,
});
export function tickFire(state: FireState, difficulty: GameDifficulty): FireState {
  if (state.misses >= 3) return state;
  if (state.recoveryMs) return { ...state, recoveryMs: 0, missAnimation: null, tick: 0, sounds: [] };
  const next: FireState = { ...state, tick: state.tick + 1, victims: [], sounds: [] };
  for (const victim of state.victims) {
    const step = victim.step + 1;
    if (step === 2 || step === 4 || step === 6) {
      const required = step / 2 - 1;
      if (state.playerPos !== required) {
        return { ...next, victims: [], misses: state.misses + 1, missAnimation: [140, 250, 360][required], recoveryMs: 1100, sounds: ['miss'] };
      }
      next.score++;
    }
    if (step === 8) next.score++;
    else next.victims.push({ ...victim, step });
  }
  if (next.tick % (difficulty === 'gameA' ? 5 : 3) === 0) {
    next.victims.push({ id: next.nextId++, step: 0 });
  }
  next.sounds = next.score > state.score ? ['score'] : next.victims.length ? ['tick'] : [];
  return next;
}

export type DiverPosition = 0 | 1 | 2 | 3 | 4 | 5;
type TentacleLength = 0 | 1 | 2;
type Tentacles = [TentacleLength, TentacleLength, TentacleLength, TentacleLength];
type TentacleDirections = [-1 | 1, -1 | 1, -1 | 1, -1 | 1];
type TentacleTimers = [number, number, number, number];
const restingTentacles = () => ({
  tentacles: [0, 0, 0, 0] as Tentacles,
  tentacleDirections: [1, 1, 1, 1] as TentacleDirections,
  tentacleTimers: [1, 2, 3, 4] as TentacleTimers,
});
export interface OctopusState extends SessionState {
  diverPos: DiverPosition;
  tentacles: Tentacles;
  tentacleDirections: TentacleDirections;
  tentacleTimers: TentacleTimers;
  goldInBag: number;
}
export const createOctopus = (): OctopusState => ({
  ...initialSession(), ...restingTentacles(), diverPos: 0, goldInBag: 0,
});
function catchDiver(state: OctopusState): OctopusState {
  return { ...state, misses: state.misses + 1, goldInBag: 0, recoveryMs: 1200, sounds: ['miss'] };
}
export function moveDiver(state: OctopusState, direction: -1 | 1): OctopusState {
  if (!canPlay(state)) return state;
  const diverPos = Math.max(0, Math.min(5, state.diverPos + direction)) as DiverPosition;
  const next = { ...state, diverPos, sounds: [] as SoundEvent[] };
  if (diverPos >= 2 && state.tentacles[diverPos - 2] === 2) return catchDiver(next);
  if (direction === 1 && state.diverPos === 5) {
    return { ...next, goldInBag: state.goldInBag + 1, score: state.score + 1, sounds: ['score'] };
  }
  if (diverPos === state.diverPos) return state;
  if (diverPos === 0 && state.goldInBag > 0) {
    return { ...next, goldInBag: 0, score: state.score + state.goldInBag * 3, sounds: ['bonus'] };
  }
  return { ...next, sounds: ['tick'] };
}
export function tickOctopus(state: OctopusState): OctopusState {
  if (state.misses >= 3) return state;
  if (state.recoveryMs) return {
    ...state, ...restingTentacles(), diverPos: 0,
    recoveryMs: 0, tick: 0, sounds: [],
  };
  const tentacles = [...state.tentacles] as Tentacles;
  const tentacleDirections = [...state.tentacleDirections] as TentacleDirections;
  const tentacleTimers = [...state.tentacleTimers] as TentacleTimers;
  let changed = false;
  // Independent clocks overlap the arms' motion. Every arm still traverses adjacent stages.
  for (let arm = 0; arm < 4; arm++) {
    tentacleTimers[arm]--;
    if (tentacleTimers[arm] > 0) continue;
    const length = (tentacles[arm] + tentacleDirections[arm]) as TentacleLength;
    tentacles[arm] = length;
    if (length === 2) tentacleDirections[arm] = -1;
    else if (length === 0) tentacleDirections[arm] = 1;
    tentacleTimers[arm] = arm % 2 === 0 ? 2 : 3;
    changed = true;
  }
  const next: OctopusState = {
    ...state, tick: state.tick + 1, tentacles, tentacleDirections, tentacleTimers,
    sounds: changed ? ['octoStep'] : [],
  };
  return next.diverPos >= 2 && tentacles[next.diverPos - 2] === 2 ? catchDiver(next) : next;
}

export type UpperPosition = -1 | 0 | 1 | 2 | 3;
export interface OilState extends SessionState {
  playerPos: UpperPosition;
  bucketAmount: number;
  helperPos: RescuePosition;
  helperDirection: -1 | 1;
  oilDrops: { id: number; lane: 0 | 1 | 2; step: number }[];
  fallingOil: { id: number; side: 'left' | 'right'; step: number; amount: number }[];
  nextId: number;
  missEffect: { screen: 'top' | 'bottom'; x: number } | null;
}
export const createOil = (): OilState => ({
  ...initialSession(), playerPos: 1, bucketAmount: 0, helperPos: 1, helperDirection: -1,
  oilDrops: [], fallingOil: [], nextId: 1, missEffect: null,
});
export function dumpOil(state: OilState): OilState {
  if (!canPlay(state) || !state.bucketAmount || (state.playerPos !== -1 && state.playerPos !== 3)) return state;
  return {
    ...state, bucketAmount: 0, nextId: state.nextId + 1, sounds: ['dump'],
    fallingOil: [...state.fallingOil, { id: state.nextId, side: state.playerPos === -1 ? 'left' : 'right', step: 0, amount: state.bucketAmount }],
  };
}
export function tickOil(state: OilState, difficulty: GameDifficulty, random = Math.random): OilState {
  if (state.misses >= 3) return state;
  if (state.recoveryMs) return { ...state, recoveryMs: 0, missEffect: null, tick: 0, sounds: [] };
  const next: OilState = { ...state, tick: state.tick + 1, oilDrops: [], fallingOil: [], sounds: [] };
  // A visible, predictable patrol gives the player a timing strategy for dumping oil.
  if (next.tick % 2 === 0) {
    next.helperPos = (state.helperPos + state.helperDirection) as RescuePosition;
    if (next.helperPos === 0) next.helperDirection = 1;
    if (next.helperPos === 2) next.helperDirection = -1;
  }
  for (const drop of state.oilDrops) {
    const step = drop.step + 1;
    if (step === 3) {
      if (state.playerPos !== drop.lane || next.bucketAmount >= 3) {
        next.missEffect = { screen: 'top', x: [120, 250, 380][drop.lane] };
        break;
      }
      next.bucketAmount++;
      next.score++;
    } else next.oilDrops.push({ ...drop, step });
  }
  for (const oil of state.fallingOil) {
    if (next.missEffect) break;
    const step = oil.step + 1;
    if (step === 3) {
      if (next.helperPos !== (oil.side === 'left' ? 0 : 2)) {
        next.missEffect = { screen: 'bottom', x: oil.side === 'left' ? 75 : 425 };
        break;
      }
      next.score += oil.amount * 2 + 1;
    } else next.fallingOil.push({ ...oil, step });
  }
  if (next.missEffect) {
    return { ...next, misses: state.misses + 1, bucketAmount: 0, oilDrops: [], fallingOil: [], recoveryMs: 1100, sounds: ['miss'] };
  }
  if (next.tick % (difficulty === 'gameA' ? 4 : 3) === 0) {
    const lanes = ([0, 1, 2] as const).filter(lane => !next.oilDrops.some(d => d.lane === lane && d.step <= 1));
    if (lanes.length) next.oilDrops.push({ id: next.nextId++, lane: lanes[Math.floor(random() * lanes.length)], step: 0 });
  }
  next.sounds = next.score > state.score ? ['score'] : next.oilDrops.length ? ['drop'] : [];
  return next;
}
