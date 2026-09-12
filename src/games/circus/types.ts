export type CircusStageId = 'lion' | 'tightrope' | 'trampoline' | 'ball' | 'trapeze';

export type GameDifficulty = 'easy' | 'normal' | 'hard';
export type GamePlayMode = 'tour' | 'practice';

export type GameLoopState =
  | 'title'
  | 'stage_intro'
  | 'playing'
  | 'player_miss'
  | 'stage_clear'
  | 'game_over'
  | 'all_clear';

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJustPressed: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'star' | 'confetti';
  text?: string;
}

// 浮遊スコア表示
export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

// チャーリー基本状態
export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  isJumping: boolean;
  facingRight: boolean;
  animFrame: number;
  animTimer: number;
  invincibleTimer: number;
  jumpCountOnTrampoline: number; // トランポリン専用
  attachedToTrapezeId: number | null; // 空中ブランコ専用
  attachedOffset: number;
  ballSpeed: number; // 玉乗り専用
  currentBallIndex: number;
}

// STAGE 1: 火の輪・火壺
export interface FireHoop {
  id: number;
  x: number;
  y: number;
  size: 'large' | 'small';
  speed: number;
  hasCoin: boolean;
  coinCollected: boolean;
  passed: boolean;
}

export interface FirePot {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

// STAGE 2: 綱渡り・お猿
export interface Monkey {
  id: number;
  x: number;
  y: number;
  vx: number;
  type: 'brown' | 'blue' | 'stacked';
  isJumping: boolean;
  jumpVy: number;
  passed: boolean;
  animFrame: number;
}

// STAGE 3: トランポリン
export interface Trampoline {
  id: number;
  x: number;
  width: number;
}

export interface FireBreather {
  id: number;
  x: number;
  y: number;
  flameCycle: number; // 0..1
  isBlowing: boolean;
}

export interface KnifeThrower {
  id: number;
  x: number;
  y: number;
  knives: { x: number; y: number; vx: number }[];
  throwTimer: number;
}

// STAGE 4: 玉乗り
export interface CircusBall {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  rotation: number;
  color: string;
}

// STAGE 5: 空中ブランコ
export interface TrapezeBar {
  id: number;
  pivotX: number;
  pivotY: number;
  ropeLength: number;
  angle: number;       // ラジアン
  angularVel: number;
  angularAccel: number;
  maxAngle: number;
  period: number;
}

export interface SafetyNet {
  y: number;
}

// 各ステージのワールドデータ
export interface StageWorldState {
  stageId: CircusStageId;
  stageNumber: number; // 1-5
  totalDistance: number; // メートル換算（100mスタートで0mがゴール）
  currentDistance: number;
  cameraX: number;
  goalX: number;
  timeBonus: number;
  
  // ステージ固有エンティティ
  fireHoops: FireHoop[];
  firePots: FirePot[];
  monkeys: Monkey[];
  trampolines: Trampoline[];
  fireBreathers: FireBreather[];
  knifeThrowers: KnifeThrower[];
  balls: CircusBall[];
  trapezes: TrapezeBar[];
}

export interface GameSettings {
  difficulty: GameDifficulty;
  soundEnabled: boolean;
  musicEnabled: boolean;
}
