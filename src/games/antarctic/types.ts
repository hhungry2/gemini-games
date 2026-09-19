// 『けっきょく南極大冒険 (Antarctic Adventure)』型定義

export type GamePlayMode = 'tour' | 'practice';
export type GameDifficulty = 'easy' | 'normal' | 'hard';
export type GameLoopState =
  | 'title'
  | 'ready'
  | 'playing'
  | 'stage_clear'
  | 'game_over'
  | 'all_clear';

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type WeatherType = 'day' | 'sunset' | 'aurora' | 'blizzard';

export interface StageConfig {
  id: StageId;
  name: string;
  nameEn: string;
  countryName: string;
  flagEmoji: string;
  flagColor: string;
  totalDistanceKm: number;
  timeLimitSec: number;
  obstacleFrequency: number; // 障害物の出現間隔係数
  weather: WeatherType;
  stationColor: string;
}

export type PlayerHitState = 'none' | 'hole' | 'trip' | 'seal';

export interface PlayerState {
  x: number; // 道路横位置 (-1.0: 左端, 0: 中央, 1.0: 右端)
  speed: number; // 現在速度 (km/h)
  distanceTraveledKm: number; // 現ステージで進んだ距離
  y: number; // ジャンプ高さ (0: 地面)
  vy: number; // ジャンプ速度
  isJumping: boolean;
  isPropellerActive: boolean; // プロペラ飛行中か
  propellerTimer: number; // プロペラ残り時間 (秒)
  propellerHover: boolean; // 空中ホバリング中か
  hitState: PlayerHitState;
  hitTimer: number; // ヒット時の硬直タイマー
  struggles: number; // 穴脱出連打カウント
  animTick: number; // アニメーション用
  facing: 'straight' | 'left' | 'right';
}

export type ObstacleType = 'hole' | 'crevasse_small' | 'crevasse_large' | 'puddle';

export type FishColor = 'green' | 'yellow' | 'red';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number; // -0.85 〜 0.85
  z: number; // プレイヤーからの相対距離 (前方 0〜300m)
  width: number;
  // アザラシ情報（穴の場合）
  hasSeal?: boolean;
  sealPhase?: number; // アザラシのひょっこり頭出しアニメーション位相
  sealOut?: boolean; // 完全に顔を出しているか
  // 飛び出す魚情報
  hasFish?: boolean;
  fishColor?: FishColor;
  fishY?: number;
  fishVy?: number;
  fishState?: 'waiting' | 'jumping' | 'collected';
}

export type FlagType = 'flag_blue' | 'flag_yellow' | 'flag_propeller';

export interface ItemFlag {
  id: number;
  type: FlagType;
  x: number;
  z: number;
  collected: boolean;
  points: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean; // アクセル
  down: boolean; // ブレーキ
  jump: boolean;
  jumpJustPressed: boolean;
}

export interface AntarcticWorldState {
  stage: StageConfig;
  remainingDistanceKm: number;
  remainingTimeSec: number;
  obstacles: Obstacle[];
  flags: ItemFlag[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  curveOffset: number; // 道路の緩やかな左右カーブ値
  targetCurve: number;
  curveTimer: number;
  nextObstacleDistance: number;
  nextFlagDistance: number;
  idCounter: number;
  stationVisible: boolean; // ゴール基地が遠くに見え始めているか
  stationZ: number; // 基地のZ位置
}
