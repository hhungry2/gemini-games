// Sonic Speed Rush - Type Definitions

export type CharacterId = 'sonic' | 'tails' | 'knuckles';

export type ActionState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'roll'
  | 'spindash'
  | 'jump'
  | 'homing'
  | 'hurt'
  | 'dead'
  | 'win'
  | 'fly' // Tails
  | 'glide' // Knuckles
  | 'climb'; // Knuckles

export type ShieldType = 'none' | 'basic' | 'magnet';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  grounded: boolean;
  angle: number; // 0 to 2*PI, ground surface angle
  facing: 1 | -1; // 1 = right, -1 = left
  action: ActionState;
  character: CharacterId;

  // Jump / Roll
  isRolling: boolean;
  isJumping: boolean;

  // Spindash
  spindashCharge: number; // 0 to 10+
  spindashTimer: number;

  // Homing attack (Sonic)
  homingTarget: Entity | null;
  homingCooldown: number;

  // Tails Flight
  flightTimer: number;
  flightAscend: boolean;

  // Knuckles Glide / Climb
  glideSpeed: number;
  climbWallX: number;

  // Shields & Powerups
  shield: ShieldType;
  invincibleTimer: number;
  speedShoesTimer: number;
  invulnerableTimer: number; // After getting hit

  // State timers & animations
  animFrame: number;
  animTimer: number;
  trailHistory: { x: number; y: number; facing: 1 | -1; action: ActionState; angle: number }[];
}

export type EntityType =
  | 'ring'
  | 'scatter_ring'
  | 'spring_yellow_up'
  | 'spring_red_up'
  | 'spring_yellow_right'
  | 'spring_yellow_left'
  | 'dash_pad_right'
  | 'dash_pad_left'
  | 'item_box'
  | 'spikes'
  | 'crumble_platform'
  | 'moving_platform'
  | 'breakable_wall'
  | 'starpost'
  | 'goal_plate'
  | 'capsule'
  | 'enemy_motobug'
  | 'enemy_chopper'
  | 'enemy_buzzbomber'
  | 'bullet';

export type ItemBoxType = 'ring10' | 'shield' | 'magnet' | 'shoes' | 'invincible' | 'life';

export interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  width: number;
  height: number;
  collected?: boolean;
  active?: boolean;
  itemType?: ItemBoxType;
  facing?: 1 | -1;
  state?: number; // custom state
  timer?: number;
  originX?: number;
  originY?: number;
  range?: number;
  passed?: boolean; // for starpost, goal_plate
  angle?: number;
}

export interface Animal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'rabbit' | 'bird' | 'seal';
  groundY: number;
  timer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type?: 'smoke' | 'spark' | 'ring_sparkle' | 'explosion';
}

export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface LoopGimmick {
  x: number; // center x
  y: number; // center y
  radius: number; // radius of loop
  entryLeftY: number;
  entryRightY: number;
}

export interface LevelData {
  act: number;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  entities: Entity[];
  loops: LoopGimmick[];
  slopes: { x1: number; y1: number; x2: number; y2: number }[];
  platforms: { x: number; y: number; w: number; h: number }[];
  cameraMinX: number;
  cameraMaxX: number;
  boss?: BossState;
}

export type BossPhase = 'intro' | 'attack_swing' | 'attack_laser' | 'hit' | 'retreat' | 'defeated';

export interface BossState {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  phase: BossPhase;
  phaseTimer: number;
  ballAngle: number;
  ballAngleVel: number;
  ballRadius: number;
  invulnerableTimer: number;
  active: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean; // Just pressed this frame
  spindash: boolean;
  action: boolean; // Character specific
}

export interface GameStats {
  score: number;
  rings: number;
  time: number; // milliseconds
  lives: number;
}
