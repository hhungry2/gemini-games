// Super Mario Kart GP - Core Types

export type GameMode = 'grand_prix' | 'vs_race' | 'time_trial';
export type EngineClass = '50cc' | '100cc' | '150cc';

export type CharacterId =
  | 'mario'
  | 'luigi'
  | 'peach'
  | 'yoshi'
  | 'toad'
  | 'koopa'
  | 'bowser'
  | 'dk_jr';

export interface CharacterStats {
  id: CharacterId;
  name: string;
  nameEn: string;
  title: string;
  speed: number; // 1 to 5
  accel: number; // 1 to 5
  weight: number; // 1 to 5
  handling: number; // 1 to 5
  kartColor: string;
  accentColor: string;
  capColor: string;
  skinColor: string;
  description: string;
}

export type ItemType =
  | 'none'
  | 'green_shell'
  | 'red_shell'
  | 'blue_shell'
  | 'banana'
  | 'mushroom'
  | 'star'
  | 'lightning'
  | 'bobomb'
  | 'coin'
  | 'boo';

export type SurfaceType =
  | 'road'
  | 'offroad'
  | 'boost'
  | 'oil'
  | 'wall'
  | 'void'
  | 'jump'
  | 'finish';

export interface KartState {
  id: string;
  charId: CharacterId;
  isPlayer: boolean;
  x: number; // World coord (0 to 1024)
  y: number; // World coord (0 to 1024)
  z: number; // Altitude (0 is ground)
  vz: number;
  angle: number; // Radians, 0 is right, Math.PI/2 is down
  speed: number;
  steer: number;
  driftDir: -1 | 0 | 1;
  driftTime: number;
  miniTurboLevel: 0 | 1 | 2; // 1: blue, 2: orange
  boostTimer: number;
  starTimer: number;
  lightningTimer: number;
  spinTimer: number;
  spinType: 'slip' | 'crash' | 'tumble';
  invulnerableTimer: number;
  coins: number;
  item: ItemType;
  itemRouletteTimer: number; // If > 0, roulette is rolling
  rouletteDisplayItem: ItemType;
  holdingItem: boolean;
  lap: number; // 1, 2, 3
  checkpointIndex: number;
  progress: number;
  rank: number;
  finished: boolean;
  finishTime: number;
  totalDistance: number;
  isAirborne: boolean;
  // AI specific
  targetWpIndex: number;
  aiAggression: number;
  aiUseItemTimer: number;
}

export interface ActiveItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  angle: number;
  ownerId: string;
  life: number;
  bounces: number;
  targetKartId?: string;
}

export interface ItemBox {
  id: number;
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
  angle: number;
}

export interface TrackCoin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  respawnTimer: number;
  angle: number;
}

export type CourseId =
  | 'mario_circuit'
  | 'donut_plains'
  | 'choco_island'
  | 'bowser_castle'
  | 'rainbow_road';

export interface Checkpoint {
  x: number;
  y: number;
  radius: number;
}

export interface TrackData {
  id: CourseId;
  name: string;
  nameEn: string;
  description: string;
  laps: number;
  skyTopColor: string;
  skyBottomColor: string;
  horizonColor: string;
  theme: 'circuit' | 'plains' | 'choco' | 'castle' | 'rainbow';
  worldSize: number; // typically 1024
  startPos: { x: number; y: number; angle: number };
  gridPositions: { x: number; y: number; angle: number }[];
  waypoints: { x: number; y: number }[];
  boostPads: { x: number; y: number }[];
  oilSlicks: { x: number; y: number }[];
  jumpPads: { x: number; y: number }[];
  itemBoxes: ItemBox[];
  coins: TrackCoin[];
  checkpoints: Checkpoint[];
  // Wall collision segments [x1, y1, x2, y2]
  walls: [number, number, number, number][];
  // Generated on load
  textureCanvas?: HTMLCanvasElement;
  minimapCanvas?: HTMLCanvasElement;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'smoke' | 'spark_blue' | 'spark_orange' | 'star' | 'explosion' | 'mud' | 'dust';
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  useItem: boolean;
  rearView: boolean;
}
