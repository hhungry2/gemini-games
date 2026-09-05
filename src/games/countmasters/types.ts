// Count Masters 型定義

export type GameState =
  | 'TITLE'
  | 'STAGE_SELECT'
  | 'SHOP'
  | 'RUNNING'
  | 'BOSS_BATTLE'
  | 'STAIRS_CLIMB'
  | 'STAGE_CLEAR'
  | 'GAME_OVER';

export type GateOp = '+' | '-' | '×' | '÷';

export interface GateOption {
  op: GateOp;
  val: number;
  label: string;
  passed: boolean;
}

export interface Gate {
  id: number;
  z: number;
  width: number;
  leftOption: GateOption;
  rightOption: GateOption;
  isMoving?: boolean;
  moveSpeed?: number;
  moveRange?: number;
  offsetX?: number;
  isRoulette?: boolean;
  rouletteTimer?: number;
}

export type ObstacleType = 'saw' | 'pendulum' | 'spikes' | 'smasher';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  z: number;
  width: number;
  length: number;
  radius: number;
  phase: number;
  speed: number;
  active: boolean;
}

export interface EnemyMob {
  id: number;
  z: number;
  x: number;
  initialCount: number;
  currentCount: number;
  color: string;
  stickmen: {
    offsetX: number;
    offsetZ: number;
    isAlive: boolean;
  }[];
}

export interface Boss {
  z: number;
  name: string;
  maxHp: number;
  hp: number;
  scale: number;
  color: string;
  state: 'idle' | 'roaring' | 'fighting' | 'defeated';
  defeatTimer: number;
  animTimer: number;
}

export interface StairStep {
  stepIndex: number;
  z: number;
  y: number;
  multiplier: number;
  requiredStickmen: number;
  color: string;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  rot: number;
}

export interface Stickman {
  id: number;
  x: number;
  y: number;
  z: number;
  targetOffsetX: number;
  targetOffsetZ: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  isAlive: boolean;
  state: 'running' | 'flying' | 'climbing' | 'fighting';
  animOffset: number;
  scale: number;
  climbStep?: number;
  fightTargetZ?: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'confetti' | 'smoke' | 'gateRing' | 'text';
  text?: string;
}

export interface Skin {
  id: string;
  name: string;
  color: string;
  headColor: string;
  glowColor: string;
  accessory: 'none' | 'crown' | 'ninja' | 'helmet' | 'cat' | 'fire';
  cost: number;
  unlocked: boolean;
}

export interface Upgrades {
  startCrowdLevel: number;
  attackPowerLevel: number;
  coinBonusLevel: number;
}

export type StageTheme = 'city' | 'neon' | 'beach' | 'volcano' | 'cyber';

export interface StageData {
  id: number;
  name: string;
  courseLength: number;
  theme: StageTheme;
  gates: Gate[];
  obstacles: Obstacle[];
  mobs: EnemyMob[];
  boss: Boss;
  coins: Coin[];
}
