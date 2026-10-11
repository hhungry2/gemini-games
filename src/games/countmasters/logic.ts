import type { GateOp, Obstacle, StairStep } from './types';

export const FIXED_STEP_MS = 1000 / 60;
export const MAX_CROWD = 2000;

// Bound catch-up after a stalled frame; hidden tabs are paused separately.
export const advanceClock = (accumulator: number, elapsed: number) => {
  const total = accumulator + Math.min(100, Math.max(0, elapsed));
  const steps = Math.min(6, Math.floor((total + 1e-7) / FIXED_STEP_MS));
  return { steps, remainder: Math.max(0, total - steps * FIXED_STEP_MS) };
};

export const applyGate = (count: number, op: GateOp, value: number): number => {
  let next = count;
  if (op === '+') next += value;
  if (op === '-') next -= value;
  if (op === '×') next *= value;
  if (op === '÷') next = Math.max(1, Math.floor(count / Math.max(1, value)));
  return Math.max(0, Math.min(MAX_CROWD, next));
};

export const obstacleHits = (obs: Obstacle, x: number, z: number): boolean => {
  if (!obs.active) return false;
  if (obs.type === 'spikes' || obs.type === 'smasher') {
    const extension = obs.type === 'smasher' ? 0.35 + 0.65 * (Math.sin(obs.phase) + 1) / 2 : 1;
    return Math.abs(x - obs.x) < obs.width * extension / 2 + 4
      && Math.abs(z - obs.z) < obs.length / 2 + 4;
  }
  const bladeX = obs.type === 'pendulum' ? obs.x + Math.sin(Math.sin(obs.phase) * 0.8) * 28 : obs.x;
  const radius = obs.type === 'pendulum' ? 11 : obs.radius;
  return Math.hypot(x - bladeX, z - obs.z) < radius + 5;
};

export const highestAffordableStep = (stairs: StairStep[], count: number): number =>
  stairs.reduce((highest, step, index) => count >= step.requiredStickmen ? index : highest, -1);

export const getSceneScale = (width: number, height: number): number =>
  Math.max(0.1, Math.min(width / 420, height / 600));
