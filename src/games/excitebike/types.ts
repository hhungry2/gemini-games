export type SegmentType =
  | 'flat'
  | 'small_ramp'
  | 'big_ramp'
  | 'table_top'
  | 'whoops'
  | 'mud'
  | 'hurdle'
  | 'cooler'
  | 'finish';

export interface TrackSegment {
  id: string;
  type: SegmentType;
  x: number; // コース上の開始X座標 (px)
  width: number; // セグメントの長さ (px)
  laneMask?: number; // 特定レーンのみに配置する場合 (ビットマスク 1=0, 2=1, 4=2, 8=3、省略時は全レーン)
}

export interface TrackData {
  id: string;
  name: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER' | 'CUSTOM';
  targetTime: number; // 秒単位
  segments: TrackSegment[];
  totalLength: number;
}

export type GameMode = 'mode_a' | 'mode_b' | 'editor';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface BikeState {
  id: string;
  isPlayer: boolean;
  color: string;
  number: number;
  x: number;
  lane: number; // 0, 1, 2, 3 (小数を許容して滑らかにレーン移動)
  targetLane: number;
  y: number; // 基準Y座標
  z: number; // 地上からの浮遊高さ (>= 0)
  vz: number; // 浮遊速度 (垂直ジャンプ速度)
  speed: number; // 水平速度
  pitch: number; // 傾き (度数法: -45〜+45。正: ウイリー/前輪上げ、負: 前傾/前輪下げ)
  targetPitch: number;
  temp: number; // 0〜100 (水温/エンジン温度)
  isOverheated: boolean;
  overheatCooldown: number; // 残り秒数
  crashed: boolean;
  crashTimer: number; // クラッシュ経過時間
  crashEndo: boolean; // 前転(true)か後転(false)か
  riderX: number; // 吹き飛んだライダーのX
  riderY: number; // 吹き飛んだライダーのY
  isReturning: boolean; // ライダーがバイクへ走っているか
  grounded: boolean;
  wheelie: boolean;
  lap: number;
  finished: boolean;
  finishTime: number | null;
  // 統計・演出用
  airTime: number;
  jumpStartX: number;
  niceLandingTimer: number;
  mudTimer: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean; // ウイリー
  right: boolean; // 前傾
  accelA: boolean; // 通常アクセル
  accelB: boolean; // ターボアクセル
}
