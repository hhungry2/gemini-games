export const COLS = 14;
export const ROWS = 16;
export const TILE_SIZE = 28;

export const CANVAS_WIDTH = COLS * TILE_SIZE; // 392
export const CANVAS_HEIGHT = ROWS * TILE_SIZE; // 448

// タイル定数
export const TILE_SKY = 0; // 地上空・地表
export const TILE_DIRT = 1; // 未掘削の土
export const TILE_TUNNEL = 2; // トンネル（掘削済み）

// 地上領域の行数（上部2行が地上）
export const SURFACE_ROWS = 2;

// 地層の境界行
export const LAYER_BOUNDARIES = [
  { startRow: 2, endRow: 4, name: 'layer1', color: '#b45309', darkColor: '#92400e', lightColor: '#d97706' },
  { startRow: 5, endRow: 7, name: 'layer2', color: '#b91c1c', darkColor: '#991b1b', lightColor: '#dc2626' },
  { startRow: 8, endRow: 11, name: 'layer3', color: '#7c2d12', darkColor: '#63210d', lightColor: '#9a3412' },
  { startRow: 12, endRow: 15, name: 'layer4', color: '#451a03', darkColor: '#341402', lightColor: '#5a2204' },
];

// プレイヤー設定
export const PLAYER_SPEED = 2.4;
export const HARPOON_MAX_LENGTH = 3.5 * TILE_SIZE; // モリ最大射程
export const HARPOON_SPEED = 7.0; // モリ射出速度

// 敵設定
export const POOKA_BASE_SPEED = 1.35;
export const FYGAR_BASE_SPEED = 1.25;
export const GHOST_SPEED = 1.1;
export const ESCAPE_SPEED = 1.7;

// 空気注入設定
export const MAX_INFLATE_LEVEL = 4; // 4で破裂
export const DEFLATE_DELAY = 60; // 注入停止から縮み始めるフレーム数
export const DEFLATE_INTERVAL = 35; // 段階が下がるフレーム間隔

// 落石設定
export const ROCK_WOBBLE_FRAMES = 50; // グラグラ揺れる時間
export const ROCK_FALL_ACCEL = 0.4; // 落下加速度
export const ROCK_MAX_FALL_SPEED = 7.5; // 最大落下速度

// スコア定数
export const SCORE_DIG = 10;
export const SCORES_DEEP = [200, 300, 400, 500]; // 深度ごとの撃破スコア
export const SCORES_FYGAR_HORIZONTAL = [400, 600, 800, 1000]; // ファイガー横倒し
export const SCORES_ROCK_CRUSH = [1000, 2500, 4000, 6000]; // 岩押し潰しスコア

// 野菜・フルーツボーナス
export const VEGETABLES = [
  { name: 'ニンジン (Carrot)', points: 400, color: '#f97316' },
  { name: 'カブ (Turnip)', points: 600, color: '#f8fafc' },
  { name: 'キノコ (Mushroom)', points: 800, color: '#ef4444' },
  { name: 'ピーマン (Bell Pepper)', points: 1000, color: '#22c55e' },
  { name: 'トマト (Tomato)', points: 2000, color: '#dc2626' },
  { name: 'スイカ (Watermelon)', points: 3000, color: '#16a34a' },
];

// 初期トンネル＆敵配置（ラウンドごとの設計データ）
export interface StageLayout {
  round: number;
  initialTunnels: { col: number; row: number; w: number; h: number }[];
  rocks: { col: number; row: number }[];
  enemies: { type: 'POOKA' | 'FYGAR'; col: number; row: number; dir: 'LEFT' | 'RIGHT' }[];
}

export const STAGE_CONFIGS: StageLayout[] = [
  {
    round: 1,
    initialTunnels: [
      // プレイヤースタート用中央縦トンネル
      { col: 6, row: 1, w: 2, h: 4 },
      // 敵の小部屋
      { col: 2, row: 4, w: 3, h: 1 },
      { col: 9, row: 5, w: 3, h: 1 },
      { col: 3, row: 10, w: 3, h: 1 },
      { col: 8, row: 12, w: 3, h: 1 },
    ],
    rocks: [
      { col: 3, row: 3 },
      { col: 10, row: 4 },
      { col: 5, row: 9 },
    ],
    enemies: [
      { type: 'POOKA', col: 3, row: 4, dir: 'RIGHT' },
      { type: 'POOKA', col: 10, row: 5, dir: 'LEFT' },
      { type: 'FYGAR', col: 4, row: 10, dir: 'RIGHT' },
      { type: 'FYGAR', col: 9, row: 12, dir: 'LEFT' },
    ],
  },
  {
    round: 2,
    initialTunnels: [
      { col: 6, row: 1, w: 2, h: 4 },
      { col: 1, row: 3, w: 3, h: 1 },
      { col: 10, row: 3, w: 3, h: 1 },
      { col: 2, row: 8, w: 4, h: 1 },
      { col: 8, row: 9, w: 4, h: 1 },
      { col: 4, row: 13, w: 4, h: 1 },
    ],
    rocks: [
      { col: 2, row: 2 },
      { col: 11, row: 2 },
      { col: 5, row: 7 },
      { col: 8, row: 11 },
    ],
    enemies: [
      { type: 'POOKA', col: 2, row: 3, dir: 'RIGHT' },
      { type: 'POOKA', col: 11, row: 3, dir: 'LEFT' },
      { type: 'FYGAR', col: 3, row: 8, dir: 'RIGHT' },
      { type: 'POOKA', col: 9, row: 9, dir: 'LEFT' },
      { type: 'FYGAR', col: 6, row: 13, dir: 'RIGHT' },
    ],
  },
  {
    round: 3,
    initialTunnels: [
      { col: 6, row: 1, w: 2, h: 4 },
      { col: 2, row: 4, w: 3, h: 1 },
      { col: 9, row: 4, w: 3, h: 1 },
      { col: 1, row: 9, w: 4, h: 1 },
      { col: 9, row: 9, w: 4, h: 1 },
      { col: 3, row: 13, w: 3, h: 1 },
      { col: 8, row: 13, w: 3, h: 1 },
    ],
    rocks: [
      { col: 3, row: 2 },
      { col: 10, row: 2 },
      { col: 2, row: 7 },
      { col: 11, row: 7 },
    ],
    enemies: [
      { type: 'POOKA', col: 3, row: 4, dir: 'RIGHT' },
      { type: 'FYGAR', col: 10, row: 4, dir: 'LEFT' },
      { type: 'POOKA', col: 2, row: 9, dir: 'RIGHT' },
      { type: 'FYGAR', col: 10, row: 9, dir: 'LEFT' },
      { type: 'POOKA', col: 4, row: 13, dir: 'RIGHT' },
      { type: 'FYGAR', col: 9, row: 13, dir: 'LEFT' },
    ],
  },
];
