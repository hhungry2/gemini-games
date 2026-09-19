export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export type GameState = 'TITLE' | 'READY' | 'PLAYING' | 'DYING' | 'ROUND_CLEAR' | 'GAMEOVER';

export type EnemyType = 'POOKA' | 'FYGAR';

export type EnemyState = 'NORMAL' | 'GHOST' | 'INFLATING' | 'CRUSHED' | 'ESCAPING';

export type DeathType = 'MONSTER' | 'ROCK' | 'FIRE';

export interface Position {
  x: number;
  y: number;
}

export interface GridCoord {
  col: number;
  row: number;
}

export interface Player {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  isMoving: boolean;
  isDigging: boolean;
  animFrame: number;
  animTimer: number;
  isDead: boolean;
  deathTimer: number;
  deathType: DeathType;
  // ポンプ / モリ状態
  harpoonActive: boolean;
  harpoonLength: number; // 0 から 最大長 (ドット)
  harpoonDir: Direction;
  targetEnemyId: number | null;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  dir: Direction;
  speed: number;
  state: EnemyState;
  ghostTimer: number; // ゴースト化までの時間
  ghostDuration: number; // ゴースト継続時間
  inflateLevel: number; // 0: 通常, 1: 弱膨張, 2: 中膨張, 3: 限界膨張, 4: 破裂
  deflateTimer: number; // 空気抜けタイマー
  // ファイガー専用
  breathState: 'IDLE' | 'CHARGING' | 'BREATHING';
  breathTimer: number;
  breathDir: Direction;
  // 描画・アニメーション
  animFrame: number;
  animTimer: number;
  isDead: boolean;
}

export type RockState = 'STABLE' | 'WOBBLING' | 'FALLING' | 'CRACKED' | 'BROKEN';

export interface Rock {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  state: RockState;
  wobbleTimer: number;
  fallSpeed: number;
  crushedCount: number;
}

export interface BonusItem {
  name: string;
  points: number;
  color: string;
  x: number;
  y: number;
  active: boolean;
  timer: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'DIRT' | 'POP' | 'ROCK' | 'FIRE' | 'STAR';
}

export interface FloatingScore {
  id: number;
  x: number;
  y: number;
  score: number;
  color: string;
  life: number;
}

export interface FireTile {
  col: number;
  row: number;
  x: number;
  y: number;
  intensity: number;
}
