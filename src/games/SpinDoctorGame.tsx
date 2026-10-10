import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  ROD_LENGTH as BASE_ROD_LENGTH, LATCH_RADIUS as LATCH_TOLERANCE,
  pointSegmentDistance, segmentDistance, canReachPin, findLatchTarget,
  advanceEnemy, getStarCount, fitCanvas, normalizeSaveData,
} from './spinDoctorLogic';
import {
  RotateCcw,
  Undo2,
  Compass,
  Volume2,
  VolumeX,
  ChevronRight,
  Star,
  Clock,
  HelpCircle,
  Pause,
  Play,
} from 'lucide-react';

// ==========================================
// 定数・設定
// ==========================================
export const SPIN_DOCTOR_STARS_KEY = 'spindoctor_total_stars_v1';
export const SPIN_DOCTOR_HIGH_SCORE_KEY = 'spindoctor_high_score_v1';
const GAME_STORAGE_KEY = 'spindoctor_save_v1';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 560;
const BASE_SPEED = 0.052; // 基本回転角速度 (rad/frame)
const TURBO_SPEED = 0.11; // ターボ時角速度
const OIL_SPEED = 0.12; // オイルピン角速度
const TAR_SPEED = 0.028; // タールピン角速度

// ピンの種別
export type PinType =
  | 'normal' // 通常の青いピン
  | 'goal' // ゴールピン
  | 'acid' // 酸・危険ピン (触れるとミス)
  | 'switch' // スイッチピン (レーザー壁を開閉)
  | 'decay' // 崩壊ピン (数秒後に消滅)
  | 'speed' // オイルピン (回転急加速)
  | 'slow' // タールピン (回転減速)
  | 'warp'; // ワープピン (別のワープピンへ転送)

export interface Pin {
  id: number;
  x: number;
  y: number;
  type: PinType;
  switchGateId?: number; // switchピンが制御するゲートID
  warpTargetId?: number; // warpピンの転送先ID
  decayTimer?: number; // 崩壊ピンの残り寿命 (秒)
  maxDecayTimer?: number;
  isDecayed?: boolean;
}

export interface LaserGate {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isOpen: boolean;
  color?: string;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GearItem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface BugEnemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  type: 'patrol' | 'orbit';
  // patrol用
  p1?: { x: number; y: number };
  p2?: { x: number; y: number };
  speed?: number;
  progress?: number;
  dir?: number;
  // orbit用
  centerX?: number;
  centerY?: number;
  orbitRadius?: number;
  angle?: number;
  orbitSpeed?: number;
}

export interface StageData {
  stageNumber: number;
  name: string;
  subtitle: string;
  hint: string;
  timeLimit: number; // 制限時間 (秒)
  startPinId: number;
  pins: Pin[];
  laserGates?: LaserGate[];
  walls?: Wall[];
  gears?: GearItem[];
  enemies?: BugEnemy[];
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

// 履歴スタック (Undo用)
interface HistorySnapshot {
  pivotPinId: number;
  angle: number;
  direction: number;
  score: number;
  combo: number;
  lastLatchTime: number | null;
  elapsedTime: number;
  timeRemaining: number;
  tickCounter: number;
  enemies: BugEnemy[];
  pinsState: { id: number; isDecayed?: boolean; decayTimer?: number }[];
  laserGatesState: { id: number; isOpen: boolean }[];
  gearsState: { id: number; collected: boolean }[];
}

export interface StageRecord {
  cleared: boolean;
  stars: number; // 0..3
  bestTime: number; // 残り秒数 or クリア秒数
  highScore: number;
}

export interface SpinDoctorSaveData {
  records: Record<number, StageRecord>;
  totalScore: number;
  totalStars: number;
}

// ==========================================
// 全15ステージのマスターデータ
// ==========================================
export const STAGES: StageData[] = [
  {
    stageNumber: 1,
    name: 'First Rotation',
    subtitle: '針の回転とジャンプの基本',
    hint: '針の先がピンに重なった瞬間に【SPACE】キーまたは画面タップ！',
    timeLimit: 40,
    startPinId: 1,
    pins: [
      { id: 1, x: 250, y: 280, type: 'normal' },
      { id: 2, x: 320, y: 280, type: 'normal' },
      { id: 3, x: 390, y: 280, type: 'normal' },
      { id: 4, x: 460, y: 280, type: 'normal' },
      { id: 5, x: 530, y: 280, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 285, y: 240, collected: false },
      { id: 2, x: 355, y: 320, collected: false },
      { id: 3, x: 425, y: 240, collected: false },
    ],
  },
  {
    stageNumber: 2,
    name: 'Direction Flip',
    subtitle: '回転方向の反転を使いこなせ',
    hint: '【↓】キーまたは【S】キーで時計回り・反時計回りを瞬時に反転できます。',
    timeLimit: 45,
    startPinId: 1,
    pins: [
      { id: 1, x: 260, y: 350, type: 'normal' },
      { id: 2, x: 330, y: 350, type: 'normal' },
      { id: 3, x: 400, y: 350, type: 'normal' },
      { id: 4, x: 400, y: 280, type: 'normal' },
      { id: 5, x: 400, y: 210, type: 'normal' },
      { id: 6, x: 470, y: 210, type: 'normal' },
      { id: 7, x: 540, y: 210, type: 'goal' },
    ],
    walls: [
      // Keep the vertical route's full rotation clear; the left wall still
      // teaches reversing at the approach pin without trapping the next pivot.
      { x1: 290, y1: 290, x2: 310, y2: 290 },
      { x1: 490, y1: 290, x2: 530, y2: 290 },
    ],
    gears: [
      { id: 1, x: 365, y: 390, collected: false },
      { id: 2, x: 440, y: 280, collected: false },
      { id: 3, x: 470, y: 170, collected: false },
    ],
  },
  {
    stageNumber: 3,
    name: 'Turbo Boost',
    subtitle: '加速で素早くピンを渡り歩け',
    hint: '【↑】キーまたは【W】キーを押している間、針が高速回転します！',
    timeLimit: 35,
    startPinId: 1,
    pins: [
      { id: 1, x: 200, y: 280, type: 'normal' },
      { id: 2, x: 270, y: 280, type: 'normal' },
      { id: 3, x: 340, y: 280, type: 'normal' },
      { id: 4, x: 410, y: 280, type: 'normal' },
      { id: 5, x: 480, y: 280, type: 'normal' },
      { id: 6, x: 550, y: 280, type: 'normal' },
      { id: 7, x: 620, y: 280, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 235, y: 230, collected: false },
      { id: 2, x: 410, y: 330, collected: false },
      { id: 3, x: 585, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 4,
    name: 'Danger: Acid Pins',
    subtitle: '触れてはならない赤いトゲピン',
    hint: '赤いトゲピンに針が触れるとミスになります！軌道を計算して回避しましょう。',
    timeLimit: 45,
    startPinId: 1,
    pins: [
      { id: 1, x: 200, y: 280, type: 'normal' },
      { id: 2, x: 270, y: 280, type: 'normal' },
      { id: 3, x: 340, y: 230, type: 'acid' }, // トゲ
      { id: 4, x: 340, y: 330, type: 'normal' }, // 回避ルート
      { id: 5, x: 410, y: 330, type: 'normal' },
      { id: 6, x: 480, y: 280, type: 'normal' },
      { id: 7, x: 550, y: 280, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 270, y: 230, collected: false },
      { id: 2, x: 410, y: 380, collected: false },
      { id: 3, x: 515, y: 240, collected: false },
    ],
  },
  {
    stageNumber: 5,
    name: 'Laser Gate & Switch',
    subtitle: 'スイッチピンで道を切り開け',
    hint: '黄色のスイッチピンを掴むとレーザーゲートが解除されます！',
    timeLimit: 50,
    startPinId: 1,
    pins: [
      { id: 1, x: 220, y: 350, type: 'normal' },
      { id: 2, x: 290, y: 350, type: 'normal' },
      { id: 3, x: 290, y: 280, type: 'switch', switchGateId: 1 }, // 70px上のスイッチ
      { id: 4, x: 360, y: 350, type: 'normal' },
      { id: 5, x: 430, y: 350, type: 'normal' },
      { id: 6, x: 500, y: 350, type: 'normal' },
      { id: 7, x: 570, y: 350, type: 'goal' },
    ],
    laserGates: [
      { id: 1, x1: 395, y1: 290, x2: 395, y2: 410, isOpen: false, color: '#ef4444' },
    ],
    gears: [
      { id: 1, x: 290, y: 230, collected: false },
      { id: 2, x: 360, y: 395, collected: false },
      { id: 3, x: 535, y: 310, collected: false },
    ],
  },
  {
    stageNumber: 6,
    name: 'Crumbling Pillars',
    subtitle: '崩れ落ちるピンの連続渡り',
    hint: 'オレンジの崩壊ピンは掴むと数秒で崩れます！素早く次のピンへ！',
    timeLimit: 45,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 280, type: 'normal' },
      { id: 2, x: 250, y: 280, type: 'decay', decayTimer: 2.2, maxDecayTimer: 2.2 },
      { id: 3, x: 320, y: 280, type: 'decay', decayTimer: 2.0, maxDecayTimer: 2.0 },
      { id: 4, x: 390, y: 280, type: 'normal' },
      { id: 5, x: 460, y: 280, type: 'decay', decayTimer: 1.8, maxDecayTimer: 1.8 },
      { id: 6, x: 530, y: 280, type: 'decay', decayTimer: 1.8, maxDecayTimer: 1.8 },
      { id: 7, x: 600, y: 280, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 250, y: 230, collected: false },
      { id: 2, x: 390, y: 330, collected: false },
      { id: 3, x: 530, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 7,
    name: 'Warp Dimensions',
    subtitle: '時空を跳躍するワープホール',
    hint: '紫のワープピンを掴むと、瞬時にもう一方のワープピンへ空間移動！',
    timeLimit: 45,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 200, type: 'normal' },
      { id: 2, x: 250, y: 200, type: 'normal' },
      { id: 3, x: 320, y: 200, type: 'warp', warpTargetId: 4 }, // 入口
      { id: 4, x: 480, y: 360, type: 'warp', warpTargetId: 3 }, // 出口
      { id: 5, x: 550, y: 360, type: 'normal' },
      { id: 6, x: 620, y: 360, type: 'goal' },
    ],
    walls: [
      { x1: 390, y1: 100, x2: 390, y2: 460 }, // 中央を遮断する壁
    ],
    gears: [
      { id: 1, x: 215, y: 155, collected: false },
      { id: 2, x: 320, y: 150, collected: false },
      { id: 3, x: 585, y: 405, collected: false },
    ],
  },
  {
    stageNumber: 8,
    name: 'Oil & Tar',
    subtitle: '加速オイルと減速タール',
    hint: '緑のピンは超高速回転、茶色のピンはゆったり減速回転になります。',
    timeLimit: 50,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 280, type: 'normal' },
      { id: 2, x: 250, y: 280, type: 'speed' }, // オイル
      { id: 3, x: 320, y: 280, type: 'normal' },
      { id: 4, x: 390, y: 280, type: 'slow' }, // タール
      { id: 5, x: 460, y: 280, type: 'normal' },
      { id: 6, x: 530, y: 230, type: 'acid' },
      { id: 7, x: 530, y: 330, type: 'normal' },
      { id: 8, x: 600, y: 330, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 250, y: 230, collected: false },
      { id: 2, x: 390, y: 330, collected: false },
      { id: 3, x: 565, y: 375, collected: false },
    ],
  },
  {
    stageNumber: 9,
    name: 'The Clock Beetle',
    subtitle: 'パトロールする敵虫の脅威',
    hint: 'ピン間を行き来する敵虫に針が触れるとミスになります！通過を見届けて跳べ！',
    timeLimit: 50,
    startPinId: 1,
    pins: [
      { id: 1, x: 200, y: 280, type: 'normal' },
      { id: 2, x: 270, y: 280, type: 'normal' },
      { id: 3, x: 340, y: 280, type: 'normal' },
      { id: 4, x: 410, y: 280, type: 'normal' },
      { id: 5, x: 480, y: 280, type: 'normal' },
      { id: 6, x: 550, y: 280, type: 'goal' },
    ],
    enemies: [
      {
        id: 1,
        x: 410,
        y: 280,
        radius: 12,
        type: 'patrol',
        p1: { x: 340, y: 200 },
        p2: { x: 340, y: 360 },
        speed: 1.8,
        progress: 0,
        dir: 1,
      },
      {
        id: 2,
        x: 480,
        y: 280,
        radius: 12,
        type: 'patrol',
        p1: { x: 480, y: 360 },
        p2: { x: 480, y: 200 },
        speed: 2.2,
        progress: 0.5,
        dir: 1,
      },
    ],
    gears: [
      { id: 1, x: 270, y: 230, collected: false },
      { id: 2, x: 410, y: 330, collected: false },
      { id: 3, x: 515, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 10,
    name: 'Dual Switches',
    subtitle: '2重レーザーバリアを解除せよ',
    hint: '2箇所のスイッチを順に踏んで、2本のレーザー壁を解除しましょう。',
    timeLimit: 55,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 280, type: 'normal' },
      { id: 2, x: 250, y: 230, type: 'switch', switchGateId: 1 },
      { id: 3, x: 250, y: 330, type: 'normal' },
      { id: 4, x: 320, y: 350, type: 'normal' },
      { id: 5, x: 390, y: 350, type: 'switch', switchGateId: 2 },
      { id: 6, x: 460, y: 350, type: 'normal' },
      { id: 7, x: 530, y: 300, type: 'normal' },
      { id: 8, x: 600, y: 280, type: 'goal' },
    ],
    laserGates: [
      { id: 1, x1: 285, y1: 290, x2: 285, y2: 410, isOpen: false, color: '#ef4444' },
      { id: 2, x1: 425, y1: 290, x2: 425, y2: 410, isOpen: false, color: '#f59e0b' },
    ],
    gears: [
      { id: 1, x: 250, y: 160, collected: false },
      { id: 2, x: 355, y: 395, collected: false },
      { id: 3, x: 530, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 11,
    name: 'Orbiting Spiders',
    subtitle: '旋回する蜘蛛と細氷回廊',
    hint: 'ピボットの周囲を旋回する蜘蛛の隙間を縫って跳躍せよ！',
    timeLimit: 55,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 280, type: 'normal' },
      { id: 2, x: 260, y: 280, type: 'normal' },
      { id: 3, x: 340, y: 280, type: 'normal' },
      { id: 4, x: 420, y: 280, type: 'normal' },
      { id: 5, x: 500, y: 280, type: 'normal' },
      { id: 6, x: 580, y: 280, type: 'goal' },
    ],
    enemies: [
      {
        id: 1,
        x: 340,
        y: 280,
        radius: 13,
        type: 'orbit',
        centerX: 340,
        centerY: 280,
        orbitRadius: 46,
        angle: 0,
        orbitSpeed: 0.04,
      },
      {
        id: 2,
        x: 500,
        y: 280,
        radius: 13,
        type: 'orbit',
        centerX: 500,
        centerY: 280,
        orbitRadius: 46,
        angle: Math.PI,
        orbitSpeed: -0.045,
      },
    ],
    gears: [
      { id: 1, x: 260, y: 220, collected: false },
      { id: 2, x: 420, y: 340, collected: false },
      { id: 3, x: 540, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 12,
    name: 'Minefield Corridor',
    subtitle: '酸ピントラップの網の目',
    hint: '安全なピンを見極めてジグザグに進め。迷ったら【Z】キーでUndo！',
    timeLimit: 60,
    startPinId: 1,
    pins: [
      { id: 1, x: 160, y: 280, type: 'normal' },
      { id: 2, x: 230, y: 230, type: 'normal' },
      { id: 3, x: 230, y: 350, type: 'acid' },
      { id: 4, x: 300, y: 280, type: 'normal' },
      { id: 5, x: 370, y: 210, type: 'acid' },
      { id: 6, x: 370, y: 330, type: 'normal' },
      { id: 7, x: 440, y: 280, type: 'normal' },
      { id: 8, x: 510, y: 230, type: 'normal' },
      { id: 9, x: 510, y: 350, type: 'acid' },
      { id: 10, x: 580, y: 280, type: 'goal' },
    ],
    gears: [
      { id: 1, x: 230, y: 160, collected: false },
      { id: 2, x: 370, y: 400, collected: false },
      { id: 3, x: 510, y: 160, collected: false },
    ],
  },
  {
    stageNumber: 13,
    name: 'Double Warp Express',
    subtitle: '連続ワープと崩壊のパズル',
    hint: 'ワープした先は崩壊ピン！着地と同時に次へ跳ぶ準備を！',
    timeLimit: 55,
    startPinId: 1,
    pins: [
      { id: 1, x: 180, y: 180, type: 'normal' },
      { id: 2, x: 250, y: 180, type: 'warp', warpTargetId: 3 },
      { id: 3, x: 250, y: 380, type: 'warp', warpTargetId: 2 },
      { id: 4, x: 320, y: 380, type: 'decay', decayTimer: 1.8, maxDecayTimer: 1.8 },
      { id: 5, x: 390, y: 380, type: 'warp', warpTargetId: 6 },
      { id: 6, x: 460, y: 180, type: 'warp', warpTargetId: 5 },
      { id: 7, x: 530, y: 180, type: 'normal' },
      { id: 8, x: 600, y: 180, type: 'goal' },
    ],
    walls: [
      { x1: 290, y1: 120, x2: 290, y2: 240 },
      { x1: 420, y1: 320, x2: 420, y2: 440 },
    ],
    gears: [
      { id: 1, x: 180, y: 230, collected: false },
      { id: 2, x: 320, y: 430, collected: false },
      { id: 3, x: 565, y: 135, collected: false },
    ],
  },
  {
    stageNumber: 14,
    name: 'The Gauntlet',
    subtitle: 'パトロールとレーザー壁の連鎖',
    hint: 'スイッチでレーザーを消し、敵の周期に合わせて通り抜けろ！',
    timeLimit: 65,
    startPinId: 1,
    pins: [
      { id: 1, x: 150, y: 280, type: 'normal' },
      { id: 2, x: 220, y: 280, type: 'speed' },
      { id: 3, x: 290, y: 230, type: 'switch', switchGateId: 1 },
      { id: 4, x: 290, y: 330, type: 'normal' },
      { id: 5, x: 360, y: 280, type: 'decay', decayTimer: 2.2, maxDecayTimer: 2.2 },
      { id: 6, x: 430, y: 280, type: 'normal' },
      { id: 7, x: 500, y: 280, type: 'slow' },
      { id: 8, x: 570, y: 280, type: 'goal' },
    ],
    laserGates: [
      { id: 1, x1: 395, y1: 220, x2: 395, y2: 340, isOpen: false, color: '#ef4444' },
    ],
    enemies: [
      {
        id: 1,
        x: 430,
        y: 280,
        radius: 12,
        type: 'patrol',
        p1: { x: 430, y: 190 },
        p2: { x: 430, y: 370 },
        speed: 2.6,
        progress: 0,
        dir: 1,
      },
    ],
    gears: [
      { id: 1, x: 290, y: 160, collected: false },
      { id: 2, x: 360, y: 330, collected: false },
      { id: 3, x: 535, y: 230, collected: false },
    ],
  },
  {
    stageNumber: 15,
    name: 'Clock Tower Climax',
    subtitle: '時計塔の最上階・全ギミック総集結',
    hint: '全ギミックを駆使して最奥のグランドクロック・コアに到達せよ！',
    timeLimit: 75,
    startPinId: 1,
    pins: [
      { id: 1, x: 140, y: 280, type: 'normal' },
      { id: 2, x: 210, y: 230, type: 'speed' },
      { id: 3, x: 210, y: 330, type: 'switch', switchGateId: 1 },
      { id: 4, x: 280, y: 280, type: 'decay', decayTimer: 2.0, maxDecayTimer: 2.0 },
      { id: 5, x: 350, y: 280, type: 'warp', warpTargetId: 6 },
      { id: 6, x: 420, y: 180, type: 'warp', warpTargetId: 5 },
      { id: 7, x: 490, y: 180, type: 'slow' },
      { id: 8, x: 490, y: 250, type: 'normal' },
      { id: 9, x: 560, y: 280, type: 'normal' },
      { id: 10, x: 630, y: 280, type: 'goal' },
    ],
    laserGates: [
      { id: 1, x1: 525, y1: 220, x2: 525, y2: 340, isOpen: false, color: '#f43f5e' },
    ],
    enemies: [
      {
        id: 1,
        x: 280,
        y: 280,
        radius: 12,
        type: 'patrol',
        p1: { x: 280, y: 190 },
        p2: { x: 280, y: 370 },
        speed: 2.4,
        progress: 0.2,
        dir: 1,
      },
      {
        id: 2,
        x: 490,
        y: 280,
        radius: 14,
        type: 'orbit',
        centerX: 490,
        centerY: 280,
        orbitRadius: 52,
        angle: 0,
        orbitSpeed: 0.05,
      },
    ],
    gears: [
      { id: 1, x: 210, y: 160, collected: false },
      { id: 2, x: 420, y: 130, collected: false },
      { id: 3, x: 595, y: 230, collected: false },
    ],
  },
];

// ==========================================
// コンポーネント本体
// ==========================================
interface SpinDoctorGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const SpinDoctorGame: React.FC<SpinDoctorGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const turboInputsRef = useRef(new Set<string>());
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  // 画面・UI状態
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isCleared, setIsCleared] = useState<boolean>(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isPageActive, setIsPageActive] = useState(!document.hidden);
  const [showStageSelect, setShowStageSelect] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const isPaused = isManuallyPaused || !isPageActive || showStageSelect || showHelp;
  const controlsBlockedRef = useRef(isPaused);
  controlsBlockedRef.current = isPaused;

  // ステータス表示
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(40);
  const [gearsCollected, setGearsCollected] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [clearStars, setClearStars] = useState(0);
  const [clearTimeBonus, setClearTimeBonus] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [missReason, setMissReason] = useState('');
  useEffect(() => sound.subscribeMute(setIsMuted), []);

  // セーブデータ
  const [saveData, setSaveData] = useState<SpinDoctorSaveData>(() => {
    try {
      const stored = localStorage.getItem(GAME_STORAGE_KEY);
      if (stored) return normalizeSaveData(JSON.parse(stored), STAGES.length);
    } catch (e) {
      console.warn('Failed to load save data:', e);
    }
    return { records: {}, totalScore: 0, totalStars: 0 };
  });

  // セーブデータ保存
  const updateSaveData = useCallback(
    (stageNum: number, stars: number, timeLeft: number, stageScore: number) => {
      setSaveData((prev) => {
        const prevRec = prev.records[stageNum] || {
          cleared: false,
          stars: 0,
          bestTime: 0,
          highScore: 0,
        };
        const newRecord: StageRecord = {
          cleared: true,
          stars: Math.max(prevRec.stars, stars),
          bestTime: Math.max(prevRec.bestTime, timeLeft),
          highScore: Math.max(prevRec.highScore, stageScore),
        };
        const updatedRecords = { ...prev.records, [stageNum]: newRecord };
        const totalStars = Object.values(updatedRecords).reduce(
          (sum, r) => sum + r.stars,
          0
        );
        const totalScore = Object.values(updatedRecords).reduce(
          (sum, r) => sum + r.highScore,
          0
        );
        const updated = { records: updatedRecords, totalScore, totalStars };
        try {
          localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(updated));
          localStorage.setItem(SPIN_DOCTOR_STARS_KEY, String(totalStars));
          localStorage.setItem(SPIN_DOCTOR_HIGH_SCORE_KEY, String(totalScore));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
        return updated;
      });
    },
    []
  );

  // ==========================================
  // ゲーム内部可変ステート (Ref)
  // ==========================================
  const gameStateRef = useRef({
    status: 'playing' as 'playing' | 'miss' | 'cleared',
    stage: STAGES[0],
    pivotPinId: 1,
    angle: 0,
    direction: 1, // 1: CW, -1: CCW
    isTurbo: false,
    score: 0,
    combo: 0,
    lastLatchTime: null as number | null,
    elapsedTime: 0,
    timeRemaining: 40,
    pins: [] as Pin[],
    laserGates: [] as LaserGate[],
    walls: [] as Wall[],
    gears: [] as GearItem[],
    enemies: [] as BugEnemy[],
    floatingTexts: [] as FloatingText[],
    particles: [] as Particle[],
    shockwaves: [] as Shockwave[],
    trail: [] as TrailPoint[],
    history: [] as HistorySnapshot[],
    nearTargetPin: null as Pin | null,
    tickCounter: 0,
  });

  // スナップショット保存 (Undo用)
  const pushHistorySnapshot = useCallback(() => {
    const s = gameStateRef.current;
    if (s.history.length >= 25) s.history.shift(); // 最大25手
    s.history.push({
      pivotPinId: s.pivotPinId,
      angle: s.angle,
      direction: s.direction,
      score: s.score,
      combo: s.combo,
      lastLatchTime: s.lastLatchTime,
      elapsedTime: s.elapsedTime,
      timeRemaining: s.timeRemaining,
      tickCounter: s.tickCounter,
      enemies: s.enemies.map((enemy) => ({ ...enemy })),
      pinsState: s.pins.map((p) => ({
        id: p.id,
        isDecayed: p.isDecayed,
        decayTimer: p.decayTimer,
      })),
      laserGatesState: s.laserGates.map((g) => ({ id: g.id, isOpen: g.isOpen })),
      gearsState: s.gears.map((g) => ({ id: g.id, collected: g.collected })),
    });
    setUndoCount(s.history.length);
  }, []);

  // Undo (1手戻し)
  const handleUndo = useCallback(() => {
    const s = gameStateRef.current;
    if (controlsBlockedRef.current || s.status === 'cleared' || s.history.length === 0) return;
    const snap = s.history.pop()!;
    s.pivotPinId = snap.pivotPinId;
    s.angle = snap.angle;
    s.direction = snap.direction;
    s.score = snap.score;
    s.combo = snap.combo;
    s.lastLatchTime = snap.lastLatchTime;
    s.elapsedTime = snap.elapsedTime;
    s.timeRemaining = snap.timeRemaining;
    s.tickCounter = snap.tickCounter;
    s.enemies = snap.enemies.map((enemy) => ({ ...enemy }));
    s.status = 'playing';
    s.isTurbo = false;
    turboInputsRef.current.clear();
    s.nearTargetPin = null;
    s.trail = [];
    s.particles = [];
    s.shockwaves = [];
    s.floatingTexts = [];

    // ギミック状態の復元
    snap.pinsState.forEach((ps) => {
      const pin = s.pins.find((p) => p.id === ps.id);
      if (pin) {
        pin.isDecayed = ps.isDecayed;
        pin.decayTimer = ps.decayTimer;
      }
    });
    snap.laserGatesState.forEach((gs) => {
      const gate = s.laserGates.find((g) => g.id === gs.id);
      if (gate) gate.isOpen = gs.isOpen;
    });
    snap.gearsState.forEach((gs) => {
      const gear = s.gears.find((g) => g.id === gs.id);
      if (gear) gear.collected = gs.collected;
    });

    sound.playSpinFlip();
    setScore(s.score);
    setCombo(s.combo);
    setUndoCount(s.history.length);
    setTimeRemaining(Math.ceil(s.timeRemaining));
    setGearsCollected(s.gears.filter((g) => g.collected).length);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsCleared(false);
    setIsManuallyPaused(false);

    s.floatingTexts.push({
      id: Date.now(),
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2 - 30,
      text: 'UNDO! ↺',
      color: '#38bdf8',
      opacity: 1,
      vy: -1.5,
    });
  }, []);

  // ステージ初期化
  const initStage = useCallback(
    (stageIdx: number) => {
      const stage = STAGES[stageIdx] || STAGES[0];
      const s = gameStateRef.current;
      s.status = 'playing';
      s.stage = stage;
      s.pivotPinId = stage.startPinId;
      s.angle = 0;
      s.direction = 1;
      s.isTurbo = false;
      turboInputsRef.current.clear();
      s.score = 0;
      s.combo = 0;
      s.lastLatchTime = null;
      s.elapsedTime = 0;
      s.timeRemaining = stage.timeLimit;
      s.pins = stage.pins.map((p) => ({ ...p, isDecayed: false }));
      s.laserGates = (stage.laserGates || []).map((g) => ({ ...g }));
      s.walls = stage.walls || [];
      s.gears = (stage.gears || []).map((g) => ({ ...g, collected: false }));
      s.enemies = (stage.enemies || []).map((e) => ({ ...e }));
      s.enemies.forEach((enemy) => advanceEnemy(enemy, 0));
      s.floatingTexts = [];
      s.particles = [];
      s.shockwaves = [];
      s.trail = [];
      s.history = [];
      s.nearTargetPin = null;
      s.tickCounter = 0;

      setScore(0);
      setCombo(0);
      setTimeRemaining(stage.timeLimit);
      setGearsCollected(0);
      setIsGameOver(false);
      setIsCleared(false);
      setIsPlaying(true);
      setIsManuallyPaused(false);
      setClearStars(0);
      setClearTimeBonus(0);
      setShowStageSelect(false);

      // 初手でもUndoで初期状態に戻れるよう初期スナップショットを記録
      pushHistorySnapshot();
    },
    [pushHistorySnapshot]
  );

  // 反転操作 (Flip)
  const handleFlip = useCallback(() => {
    const s = gameStateRef.current;
    if (s.status !== 'playing' || controlsBlockedRef.current) return;
    s.direction *= -1;
    sound.playSpinFlip();

    // 視覚エフェクト
    const currentPin = s.pins.find((p) => p.id === s.pivotPinId);
    if (currentPin) {
      s.shockwaves.push({
        x: currentPin.x,
        y: currentPin.y,
        radius: 8,
        maxRadius: 36,
        opacity: 0.8,
        color: '#38bdf8',
      });
    }
  }, []);

  // ターボトグル
  const setTurbo = useCallback((turbo: boolean, source = 'pointer') => {
    const s = gameStateRef.current;
    if (turbo && (s.status !== 'playing' || controlsBlockedRef.current)) return;
    if (turbo) turboInputsRef.current.add(source);
    else turboInputsRef.current.delete(source);
    const active = turboInputsRef.current.size > 0;
    if (s.isTurbo !== active) {
      s.isTurbo = active;
      if (active) sound.playSpinTurbo();
    }
  }, []);

  // ラッチ（ピン吸着・飛び移り）実行
  const handleLatch = useCallback(() => {
    const s = gameStateRef.current;
    if (s.status !== 'playing' || controlsBlockedRef.current) return;
    const currentPin = s.pins.find((p) => p.id === s.pivotPinId);
    if (!currentPin) return;

    const bestPin = findLatchTarget(s.pins, currentPin, s.angle, s);

    if (bestPin) {
      // 履歴を保存 (Undo用)
      pushHistorySnapshot();

      // コンボ計算 (1.2秒以内の連続ラッチでコンボボーナス)
      const now = s.elapsedTime;
      let nextCombo = 1;
      if (s.lastLatchTime !== null && now - s.lastLatchTime < 1.4) {
        nextCombo = s.combo + 1;
      }
      s.combo = nextCombo;
      s.lastLatchTime = now;
      setCombo(nextCombo);

      // ピボット切り替え
      const oldPin = currentPin;
      s.pivotPinId = bestPin.id;

      // 新しい角度: 新ピボットから見た旧先端（または元ピボットの逆）
      s.angle = Math.atan2(oldPin.y - bestPin.y, oldPin.x - bestPin.x);
      s.nearTargetPin = null;
      s.trail = [];

      // スコア加算
      const point = 100 * nextCombo;
      s.score += point;
      setScore(s.score);

      sound.playSpinLatch(nextCombo);

      // 衝撃波 & パーティクル
      s.shockwaves.push({
        x: bestPin.x,
        y: bestPin.y,
        radius: 10,
        maxRadius: 42,
        opacity: 1,
        color: '#f59e0b',
      });

      s.floatingTexts.push({
        id: Date.now(),
        x: bestPin.x,
        y: bestPin.y - 20,
        text: nextCombo > 1 ? `+${point} (${nextCombo}x COMBO!)` : `+${point}`,
        color: nextCombo > 2 ? '#fcd34d' : '#ffffff',
        opacity: 1,
        vy: -1.8,
      });

      // ギミック判定
      if (bestPin.type === 'goal') {
        s.status = 'cleared';
        s.isTurbo = false;
        turboInputsRef.current.clear();
        // ステージクリア！
        setIsCleared(true);
        setIsPlaying(false);
        sound.playSpinClear();

        // 残り時間ボーナス
        const timeBonus = Math.round(s.timeRemaining * 50);
        const finalScore = s.score + timeBonus;
        s.score = finalScore;
        setScore(finalScore);
        setTimeRemaining(Math.ceil(s.timeRemaining));
        setClearTimeBonus(timeBonus);

        // 星評価 (ギア収集数基準 + タイム)
        const collectedGears = s.gears.filter((g) => g.collected).length;
        const starCount = getStarCount(collectedGears, s.timeRemaining, s.stage.timeLimit);
        setClearStars(starCount);

        updateSaveData(
          s.stage.stageNumber,
          starCount,
          Math.ceil(s.timeRemaining),
          finalScore
        );
        return;
      }

      if (bestPin.type === 'switch' && bestPin.switchGateId) {
        // スイッチピン: レーザー壁開閉
        const gate = s.laserGates.find((g) => g.id === bestPin.switchGateId);
        if (gate) {
          gate.isOpen = !gate.isOpen;
          sound.playSpinSwitch();
          s.floatingTexts.push({
            id: Date.now() + 1,
            x: bestPin.x,
            y: bestPin.y - 35,
            text: gate.isOpen ? 'GATE OPENED! 🔓' : 'GATE CLOSED! 🔒',
            color: '#10b981',
            opacity: 1,
            vy: -1.5,
          });
        }
      }

      if (bestPin.type === 'warp' && bestPin.warpTargetId) {
        // ワープピン: 瞬時に転送
        const targetPin = s.pins.find((p) => p.id === bestPin.warpTargetId);
        if (targetPin) {
          s.pivotPinId = targetPin.id;
          sound.playSpinWarp();
          s.shockwaves.push({
            x: targetPin.x,
            y: targetPin.y,
            radius: 12,
            maxRadius: 50,
            opacity: 1,
            color: '#a855f7',
          });
          s.floatingTexts.push({
            id: Date.now() + 2,
            x: targetPin.x,
            y: targetPin.y - 30,
            text: 'WARP! 🌀',
            color: '#c084fc',
            opacity: 1,
            vy: -2,
          });
        }
      }
    }
  }, [pushHistorySnapshot, updateSaveData]);

  // キーボードイベント処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey
        || (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (showStageSelect || showHelp) {
        if (e.code === 'Escape') { setShowStageSelect(false); setShowHelp(false); }
        return;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (!e.repeat && gameStateRef.current.status === 'playing') setIsManuallyPaused((paused) => !paused);
        return;
      }
      if (controlsBlockedRef.current) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.repeat && e.code !== 'ArrowUp' && e.code !== 'KeyW') return;

      if (e.code === 'Space') {
        handleLatch();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        handleFlip();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setTurbo(true, e.code);
      } else if (e.code === 'KeyZ') {
        handleUndo();
      } else if (e.code === 'KeyR') {
        initStage(currentStageIdx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setTurbo(false, e.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLatch, handleFlip, setTurbo, handleUndo, initStage, currentStageIdx, showStageSelect, showHelp]);

  useEffect(() => {
    const openHelp = () => setShowHelp(true);
    window.addEventListener('spindoctor:help', openHelp);
    return () => window.removeEventListener('spindoctor:help', openHelp);
  }, []);

  useEffect(() => {
    if (isPaused) {
      gameStateRef.current.isTurbo = false;
      turboInputsRef.current.clear();
    }
  }, [isPaused]);

  useEffect(() => {
    const suspend = () => {
      gameStateRef.current.isTurbo = false;
      turboInputsRef.current.clear();
      setIsManuallyPaused(true);
      setIsPageActive(false);
    };
    const focus = () => { setIsPageActive(!document.hidden); setIsMuted(sound.getMuted()); };
    const visibility = () => { if (document.hidden) suspend(); else focus(); };
    window.addEventListener('blur', suspend);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', suspend);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area) return;
    const resize = () => {
      const next = fitCanvas(area.clientWidth, area.clientHeight, isFullscreen);
      setCanvasSize((previous) => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(area);
    resize();
    return () => observer.disconnect();
  }, [isFullscreen]);

  // ステージ切り替え時の開始
  useEffect(() => {
    initStage(currentStageIdx);
  }, [currentStageIdx, initStage]);

  // ==========================================
  // メインゲームループ (requestAnimationFrame)
  // ==========================================
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const elapsed = Math.max(0, Math.min((time - lastTime) / 1000, 0.25));
      lastTime = time;

      const s = gameStateRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx && canvas) {
        ctx.setTransform(canvas.width / CANVAS_WIDTH, 0, 0, canvas.height / CANVAS_HEIGHT, 0, 0);
        // Substeps keep collision checks reliable even at low frame rates or in turbo.
        let remaining = elapsed;
        while (remaining > 0 && s.status === 'playing' && !isPaused) {
          const dt = Math.min(remaining, 1 / 120);
          remaining -= dt;
          const miss = (reason: string) => {
            if (s.status !== 'playing') return;
            s.status = 'miss';
            s.isTurbo = false;
            turboInputsRef.current.clear();
            setMissReason(reason);
            setIsGameOver(true);
            setIsPlaying(false);
            sound.playSpinHit();
          };
          // タイマー進行
          s.timeRemaining -= dt;
          s.elapsedTime += dt;
          s.tickCounter += dt;
          if (s.tickCounter >= 1.0) {
            s.tickCounter -= 1.0;
            sound.playSpinTick(Math.floor(s.timeRemaining) % 2 === 0);
          }

          if (s.timeRemaining <= 0) {
            s.timeRemaining = 0;
            miss('時間切れです。Undoで巻き戻すか、もう一度挑戦しましょう。');
            setTimeRemaining(0);
            break;
          }
          setTimeRemaining(Math.ceil(s.timeRemaining));

          // 現在のピボットピン
          const currentPin = s.pins.find((p) => p.id === s.pivotPinId);

          if (currentPin) {
            // 回転速度決定
            let speed = BASE_SPEED;
            if (currentPin.type === 'speed') speed = OIL_SPEED;
            else if (currentPin.type === 'slow') speed = TAR_SPEED;
            if (s.isTurbo) speed = TURBO_SPEED;

            const previousAngle = s.angle;
            s.angle = (s.angle + speed * s.direction * dt * 60) % (Math.PI * 2);

            // 先端座標
            let freeX = currentPin.x + Math.cos(s.angle) * BASE_ROD_LENGTH;
            let freeY = currentPin.y + Math.sin(s.angle) * BASE_ROD_LENGTH;

            // Resolve walls before item/hazard checks, rolling back to a safe pose.
            const wallHit = s.walls.some((wall) => segmentDistance(currentPin.x, currentPin.y,
              freeX, freeY, wall.x1, wall.y1, wall.x2, wall.y2) <= 7
              || pointSegmentDistance(freeX, freeY, wall.x1, wall.y1, wall.x2, wall.y2) <= 14);
            if (wallHit) {
              s.angle = previousAngle;
              s.direction *= -1;
              freeX = currentPin.x + Math.cos(s.angle) * BASE_ROD_LENGTH;
              freeY = currentPin.y + Math.sin(s.angle) * BASE_ROD_LENGTH;
              sound.playSpinFlip();
            }

            // トレイル追加
            s.trail.push({ x: freeX, y: freeY, alpha: 0.7 });
            if (s.trail.length > 14) s.trail.shift();

            // 崩壊ピンのタイマー処理
            if (currentPin.type === 'decay' && !currentPin.isDecayed) {
              if (currentPin.decayTimer === undefined) {
                currentPin.decayTimer = currentPin.maxDecayTimer || 2.0;
              }
              currentPin.decayTimer -= dt;
              if (currentPin.decayTimer <= 0) {
                currentPin.isDecayed = true;
                sound.playSpinDecay();
                // ピボットが消滅したのでミス！
                miss('支点のピンが崩れました。次のピンへ早めに飛び移りましょう。');
                break;
              }
            }

            // 吸着可能候補ピンの検出 (Lock-on 表示用)
            s.nearTargetPin = findLatchTarget(s.pins, currentPin, s.angle, s);

            // ギア（星）の収集判定
            s.gears.forEach((gear) => {
              if (!gear.collected) {
                // ロッド線分とギア中心の距離を判定
                const distFree = Math.hypot(freeX - gear.x, freeY - gear.y);
                const rodDist = pointSegmentDistance(gear.x, gear.y, currentPin.x, currentPin.y, freeX, freeY);
                if (rodDist < 20 || distFree < 26) {
                  gear.collected = true;
                  sound.playSpinGear();
                  s.score += 500;
                  setScore(s.score);
                  setGearsCollected(s.gears.filter((g) => g.collected).length);

                  // キラキラパーティクル
                  for (let i = 0; i < 10; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const sp = 1.5 + Math.random() * 2.5;
                    s.particles.push({
                      x: gear.x,
                      y: gear.y,
                      vx: Math.cos(ang) * sp,
                      vy: Math.sin(ang) * sp,
                      life: 1,
                      maxLife: 1,
                      color: '#fbbf24',
                      size: 3 + Math.random() * 3,
                    });
                  }

                  s.floatingTexts.push({
                    id: Date.now(),
                    x: gear.x,
                    y: gear.y - 15,
                    text: '+500 ⚙️',
                    color: '#facc15',
                    opacity: 1,
                    vy: -1.8,
                  });
                }
              }
            });

            // 酸ピンとの接触判定 (ロッド先端が酸ピンに近接、または酸ピンのトゲに触れる)
            for (const pin of s.pins) {
              if (pin.type === 'acid') {
                const distToAcid = Math.hypot(freeX - pin.x, freeY - pin.y);
                if (distToAcid < 22 || pointSegmentDistance(pin.x, pin.y, currentPin.x, currentPin.y, freeX, freeY) < 18) {
                  miss('赤い酸ピンに触れました。反転やUndoで軌道を変えましょう。');
                  break;
                }
              }
            }

            // レーザーゲートとの接触判定
            for (const gate of s.laserGates) {
              if (!gate.isOpen) {
                // 針全体と、先端の球を判定する
                const isHit = segmentDistance(currentPin.x, currentPin.y, freeX, freeY,
                  gate.x1, gate.y1, gate.x2, gate.y2) <= 6
                  || pointSegmentDistance(freeX, freeY, gate.x1, gate.y1, gate.x2, gate.y2) <= 13;
                if (isHit) {
                  miss('レーザーに触れました。黄色いスイッチでゲートを開けましょう。');
                  break;
                }
              }
            }

            // 敵キャラクターの更新＆当たり判定
            for (const enemy of s.enemies) {
              advanceEnemy(enemy, dt);

              // プレイヤーの先端または中心との当たり判定
              const distFree = Math.hypot(freeX - enemy.x, freeY - enemy.y);
              const distPivot = Math.hypot(
                currentPin.x - enemy.x,
                currentPin.y - enemy.y
              );
              if (distFree < enemy.radius + 8 || distPivot < enemy.radius + 6
                || pointSegmentDistance(enemy.x, enemy.y, currentPin.x, currentPin.y, freeX, freeY) < enemy.radius + 3) {
                miss('敵に針が触れました。敵の動きを見てタイミングを変えましょう。');
                break;
              }
            }
          }

          // 衝撃波の更新
          s.shockwaves.forEach((sw) => {
            sw.radius += 40 * dt;
            sw.opacity -= 1.8 * dt;
          });
          s.shockwaves = s.shockwaves.filter((sw) => sw.opacity > 0);

          // パーティクルの更新
          s.particles.forEach((p) => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= dt;
          });
          s.particles = s.particles.filter((p) => p.life > 0);

          // 浮遊テキストの更新
          s.floatingTexts.forEach((ft) => {
            ft.y += ft.vy * dt * 60;
            ft.opacity -= 1.2 * dt;
          });
          s.floatingTexts = s.floatingTexts.filter((ft) => ft.opacity > 0);
        }

        // ==========================================
        // 2. 描画処理 (Canvas)
        // ==========================================
        renderGameCanvas(ctx, s, isDark);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, isDark]);

  // ==========================================
  // Canvas レンダリング本体
  // ==========================================
  const renderGameCanvas = (
    ctx: CanvasRenderingContext2D,
    s: typeof gameStateRef.current,
    dark: boolean
  ) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 背景描画: クラシックMac風ブループリント / ネオン幾何学グリッド
    ctx.fillStyle = dark ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 微細なグリッド線
    ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(14, 165, 233, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 35) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 35) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // 背景の大時計・ギア透かし装飾
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 205, Math.sin(ang) * 205);
      ctx.lineTo(Math.cos(ang) * 220, Math.sin(ang) * 220);
      ctx.stroke();
    }
    ctx.restore();

    // 壁の描画
    s.walls.forEach((wall) => {
      ctx.save();
      ctx.strokeStyle = dark ? '#64748b' : '#94a3b8';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();

      // 内側のメタリックライン
      ctx.strokeStyle = dark ? '#cbd5e1' : '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.restore();
    });

    // レーザーゲートの描画
    s.laserGates.forEach((gate) => {
      ctx.save();
      if (gate.isOpen) {
        // 開放中: 点線で安全表示
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(gate.x1, gate.y1);
        ctx.lineTo(gate.x2, gate.y2);
        ctx.stroke();
      } else {
        // 遮断中: 危険な赤いレーザービーム & 発光
        const laserColor = gate.color || '#ef4444';
        ctx.shadowColor = laserColor;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(gate.x1, gate.y1);
        ctx.lineTo(gate.x2, gate.y2);
        ctx.stroke();

        // コアホワイト
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });

    // ピン同士をつなぐ細い点線ガイド（移動可能経路の目安）
    ctx.strokeStyle = dark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 4]);
    for (let i = 0; i < s.pins.length; i++) {
      for (let j = i + 1; j < s.pins.length; j++) {
        if (canReachPin(s.pins[i], s.pins[j])) {
          ctx.beginPath();
          ctx.moveTo(s.pins[i].x, s.pins[i].y);
          ctx.lineTo(s.pins[j].x, s.pins[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);

    // ギア（収集アイテム）の描画
    s.gears.forEach((gear) => {
      if (gear.collected) return;
      ctx.save();
      ctx.translate(gear.x, gear.y);
      const rot = performance.now() * 0.002;
      ctx.rotate(rot);

      // 外周の歯車
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        ctx.rect(Math.cos(ang) * 9 - 3, Math.sin(ang) * 9 - 3, 6, 6);
      }
      ctx.fill();

      // 内円
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 穴
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = dark ? '#090d16' : '#f8fafc';
      ctx.fill();
      ctx.restore();
    });

    // 敵キャラクターの描画
    s.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // 影・グロー
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 10;

      // 胴体 (メカニカルスパイダー/ビートル)
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 目・針
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.arc(-3, -2, 1.2, 0, Math.PI * 2);
      ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 脚
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1.8;
      const legWave = Math.sin(performance.now() * 0.015) * 4;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * 9, -4);
        ctx.lineTo(i * 17, -8 + legWave * i);
        ctx.moveTo(i * 10, 0);
        ctx.lineTo(i * 19, 0 - legWave * i);
        ctx.moveTo(i * 9, 4);
        ctx.lineTo(i * 17, 8 + legWave * i);
        ctx.stroke();
      }

      ctx.restore();
    });

    // ピン（ドット）の描画
    s.pins.forEach((pin) => {
      if (pin.isDecayed) return;
      ctx.save();
      const isCurrentPivot = pin.id === s.pivotPinId;
      const isTargetCandidate = s.nearTargetPin?.id === pin.id;

      // ターゲットロックオン時のパルスエフェクト
      if (isTargetCandidate) {
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        const pulse = Math.sin(performance.now() * 0.02) * 3;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, LATCH_TOLERANCE + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LATCH!', pin.x, pin.y - LATCH_TOLERANCE - 8);
        ctx.restore();
      }

      // ピンの種類別カラーと描画
      let pinColor = '#0284c7';
      let outerColor = '#38bdf8';
      let radius = 9;

      switch (pin.type) {
        case 'goal':
          pinColor = '#f59e0b';
          outerColor = '#fde047';
          radius = 13;
          break;
        case 'acid':
          pinColor = '#dc2626';
          outerColor = '#f87171';
          radius = 10;
          break;
        case 'switch':
          pinColor = '#eab308';
          outerColor = '#fef08a';
          radius = 10;
          break;
        case 'decay':
          pinColor = '#f97316';
          outerColor = '#fdba74';
          radius = 9;
          break;
        case 'speed':
          pinColor = '#16a34a';
          outerColor = '#86efac';
          radius = 9;
          break;
        case 'slow':
          pinColor = '#92400e';
          outerColor = '#d6a66d';
          radius = 9;
          break;
        case 'warp':
          pinColor = '#c026d3';
          outerColor = '#f0abfc';
          radius = 11;
          break;
        default:
          break;
      }

      // 崩壊ピンの点滅・ヒビ割れ
      if (pin.type === 'decay' && pin.decayTimer !== undefined) {
        const ratio = pin.decayTimer / (pin.maxDecayTimer || 2);
        if (ratio < 0.4 && Math.floor(performance.now() / 80) % 2 === 0) {
          pinColor = '#ffffff';
        }
      }

      // 外周リング
      ctx.shadowColor = outerColor;
      ctx.shadowBlur = isCurrentPivot ? 16 : 8;
      ctx.fillStyle = pinColor;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outerColor;
      ctx.lineWidth = isCurrentPivot ? 3.5 : 2;
      ctx.stroke();

      // ゴールピンの特別キラキラ
      if (pin.type === 'goal') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const t = performance.now() * 0.004;
        ctx.arc(
          pin.x + Math.cos(t) * 5,
          pin.y + Math.sin(t) * 5,
          2.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // トゲピンのトゲ装飾
      if (pin.type === 'acid') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
          ctx.beginPath();
          ctx.moveTo(pin.x + Math.cos(a) * 9, pin.y + Math.sin(a) * 9);
          ctx.lineTo(pin.x + Math.cos(a) * 16, pin.y + Math.sin(a) * 16);
          ctx.stroke();
        }
      }

      // 中心コア
      ctx.fillStyle = isCurrentPivot ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, isCurrentPivot ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 針（Spin Doctor ニードル）の描画
    const currentPin = s.pins.find((p) => p.id === s.pivotPinId);
    if (currentPin) {
      const freeX = currentPin.x + Math.cos(s.angle) * BASE_ROD_LENGTH;
      const freeY = currentPin.y + Math.sin(s.angle) * BASE_ROD_LENGTH;

      // 回転の残像トレイル
      ctx.save();
      ctx.strokeStyle = s.isTurbo ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      s.trail.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7 * pt.alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${pt.alpha * 0.4})`;
        ctx.fill();
      });
      ctx.restore();

      // 針の本体シャフト (コネクタバー)
      ctx.save();
      ctx.shadowColor = s.isTurbo ? '#f59e0b' : '#38bdf8';
      ctx.shadowBlur = s.isTurbo ? 14 : 8;

      // 外側太ライン (金属質感)
      ctx.strokeStyle = dark ? '#0284c7' : '#0369a1';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPin.x, currentPin.y);
      ctx.lineTo(freeX, freeY);
      ctx.stroke();

      // 内側ハイライト
      ctx.strokeStyle = s.isTurbo ? '#fef08a' : '#e0f2fe';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // フリーエンド（回転先端の球体）
      ctx.fillStyle = s.nearTargetPin ? '#22c55e' : s.isTurbo ? '#f59e0b' : '#38bdf8';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(freeX, freeY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // ピボット側の接続リング
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(currentPin.x, currentPin.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 衝撃波エフェクトの描画
    s.shockwaves.forEach((sw) => {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = Math.max(0, sw.opacity);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // パーティクルの描画
    s.particles.forEach((p) => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 浮遊スコアテキストの描画
    s.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, ft.opacity);
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  };

  // サウンドミュート切り替え
  const toggleMute = () => {
    setIsMuted(sound.toggleMute());
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-0 flex flex-col items-center select-none overflow-hidden transition-colors duration-200 ${
        isFullscreen
          ? 'p-0 max-w-none'
          : 'max-w-5xl mx-auto p-2 sm:p-4'
      }`}
    >
      {/* 画面上部ヘッダー (HUD) */}
      <div
        className={`w-full flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:px-5 sm:py-2.5 rounded-2xl border backdrop-blur-md z-10 shrink-0 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 text-slate-100 shadow-lg shadow-black/40'
            : 'bg-white/90 border-slate-200 text-slate-800 shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStageSelect(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 text-xs font-black transition cursor-pointer border border-indigo-500/20"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>STAGE {STAGES[currentStageIdx].stageNumber}</span>
          </button>
          <div className="hidden sm:block text-xs font-bold text-slate-400">
            {STAGES[currentStageIdx].name}
          </div>
        </div>

        {/* タイム・スコア・ギアHUD */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-4">
          {/* タイム */}
          <div className="flex items-center gap-1.5">
            <Clock
              className={`w-4 h-4 ${
                timeRemaining <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-500'
              }`}
            />
            <span
              className={`font-mono text-sm sm:text-base font-black ${
                timeRemaining <= 10 ? 'text-rose-500' : ''
              }`}
            >
              {timeRemaining}s
            </span>
          </div>

          {/* ギア (星) */}
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={`text-sm transition-transform ${
                  idx < gearsCollected
                    ? 'text-amber-400 scale-110 drop-shadow-md'
                    : 'text-slate-600 opacity-40'
                }`}
              >
                ⚙️
              </span>
            ))}
          </div>

          {/* スコア & コンボ */}
          <div className="text-right">
            <div className="font-mono text-sm sm:text-base font-black text-sky-400">
              {score.toLocaleString()}
            </div>
            {combo > 1 && (
              <div className="text-[10px] font-bold text-amber-400 animate-bounce">
                {combo}x COMBO
              </div>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => setIsManuallyPaused((paused) => !paused)}
              aria-label={isManuallyPaused ? '再開 (P)' : '一時停止 (P)'}
              title="一時停止・再開 (P / Esc)"
              disabled={!isPlaying}
              className="p-2 rounded-lg bg-slate-700/40 text-sky-400 cursor-pointer disabled:opacity-40"
            >
              {isManuallyPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleUndo()}
              title="1手戻す (Zキー)"
              disabled={undoCount === 0 || isCleared || isPaused}
              className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 transition cursor-pointer border border-slate-700/40 disabled:opacity-30 disabled:cursor-default"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => initStage(currentStageIdx)}
              title="リトライ (Rキー)"
              className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 transition cursor-pointer border border-slate-700/40"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'サウンドをONにする' : 'サウンドをミュートにする'}
              className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 transition cursor-pointer border border-slate-700/40"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              aria-label="スピンドクターの遊び方"
              className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700/50 text-slate-300 transition cursor-pointer border border-slate-700/40"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ゲームCanvasエリア (フルスクリーン時は最大化スケーリング) */}
      <div
        ref={canvasAreaRef}
        className={`relative flex-1 w-full flex items-center justify-center min-h-0 my-1 sm:my-2 ${
          isFullscreen ? 'h-full w-full' : ''
        }`}
      >
        <canvas
          ref={canvasRef}
          width={Math.max(1, Math.round(canvasSize.width * Math.min(window.devicePixelRatio || 1, 2)))}
          height={Math.max(1, Math.round(canvasSize.height * Math.min(window.devicePixelRatio || 1, 2)))}
          tabIndex={0}
          aria-label="スピンドクターのゲーム盤。スペースで飛び移り、上下キーで加速・反転、Pで一時停止。"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            handleLatch();
          }}
          className={`rounded-2xl border shadow-2xl cursor-crosshair touch-none shrink-0 ${
            isDark
              ? 'border-slate-800/80 shadow-sky-950/20'
              : 'border-slate-200 shadow-slate-300'
          }`}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          }}
        />

        {/* ヒントバー (画面下部オーバーレイ) */}
        {isPlaying && !isPaused && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] text-center px-3 py-1.5 rounded-xl bg-slate-900/80 text-white text-[10px] sm:text-xs font-semibold backdrop-blur-md border border-slate-700/60 pointer-events-none shadow-lg">
            💡 {STAGES[currentStageIdx].hint}
          </div>
        )}

        {isPlaying && isPaused && !showHelp && !showStageSelect && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-2xl">
            <button onClick={() => { setIsManuallyPaused(false); setIsPageActive(!document.hidden); }}
              className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-xl cursor-pointer">
              ▶ 再開する <span className="text-xs opacity-70">[P / Esc]</span>
            </button>
          </div>
        )}

        {/* ゲームオーバー・モーダル */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center rounded-2xl z-30 animate-in fade-in duration-200">
            <div
              className={`max-w-xs w-full max-h-full overflow-y-auto mx-4 p-5 rounded-3xl border text-center shadow-2xl ${
                isDark ? 'bg-slate-900 border-rose-500/40' : 'bg-white border-rose-300'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-3 text-2xl">
                💥
              </div>
              <h3 className="text-xl font-black text-rose-500 mb-1">MISS!</h3>
              <p className="text-xs text-slate-400 mb-5">
                {missReason}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={undoCount === 0 || isPaused}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 disabled:opacity-30 disabled:cursor-default"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  onClick={() => initStage(currentStageIdx)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  リトライ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ステージクリア・モーダル */}
        {isCleared && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center rounded-2xl z-30 animate-in zoom-in-95 duration-200">
            <div
              className={`max-w-sm w-full max-h-full overflow-y-auto mx-4 p-5 rounded-3xl border text-center shadow-2xl ${
                isDark
                  ? 'bg-slate-900 border-amber-500/40'
                  : 'bg-white border-amber-300'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 text-3xl">
                🏆
              </div>
              <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 mb-1">
                STAGE CLEAR!
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                見事なタイミングでコアへ到達しました！
              </p>

              {/* 星評価 */}
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3].map((starIdx) => {
                  const collected = clearStars >= starIdx;
                  return (
                    <div
                      key={starIdx}
                      className={`text-3xl transition-transform ${
                        collected
                          ? 'text-amber-400 scale-110 drop-shadow-lg animate-bounce'
                          : 'text-slate-600 opacity-40'
                      }`}
                    >
                      ★
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-950/40 rounded-2xl p-3 mb-5 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>残り時間ボーナス</span>
                  <span className="font-mono text-white">
                    +{clearTimeBonus}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ギア収集数</span>
                  <span className="font-mono text-amber-400">
                    {gearsCollected} / 3 ⚙️
                  </span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-white text-sm">
                  <span>最終スコア</span>
                  <span className="font-mono text-sky-400">
                    {score.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => initStage(currentStageIdx)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  もう一度
                </button>
                {currentStageIdx < STAGES.length - 1 ? (
                  <button
                    onClick={() => setCurrentStageIdx((prev) => prev + 1)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    次のステージ
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStageSelect(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    全ステージ制覇！
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 画面下部: タッチ・モバイル向けオンスクリーンコントローラー */}
      <div
        className={`w-full grid grid-cols-4 gap-2 sm:gap-3 px-2 py-1.5 sm:px-4 sm:py-2 rounded-2xl border backdrop-blur-md shrink-0 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 shadow-lg'
            : 'bg-white/90 border-slate-200 shadow-md'
        }`}
      >
        <button
          onPointerDown={(event) => { if (event.button === 0) { event.preventDefault(); handleLatch(); } }}
          onClick={(event) => { if (event.detail === 0) handleLatch(); }}
          disabled={!isPlaying || isPaused}
          className="py-2 sm:py-3 px-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-sky-600/30 transition flex flex-col items-center justify-center cursor-pointer touch-none disabled:opacity-40"
        >
          <span>LATCH</span>
          <span className="text-[9px] opacity-75 font-normal">[SPACE / TAP]</span>
        </button>

        <button
          onClick={handleFlip}
          disabled={!isPlaying || isPaused}
          className="py-2.5 sm:py-3 px-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-600/30 transition flex flex-col items-center justify-center cursor-pointer"
        >
          <span>FLIP</span>
          <span className="text-[9px] opacity-75 font-normal">[↓ / S]</span>
        </button>

        <button
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setTurbo(true);
          }}
          onPointerUp={() => setTurbo(false)}
          onPointerCancel={() => setTurbo(false)}
          onLostPointerCapture={() => setTurbo(false)}
          disabled={!isPlaying || isPaused}
          className="py-2.5 sm:py-3 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-600/30 transition flex flex-col items-center justify-center cursor-pointer touch-none disabled:opacity-40"
        >
          <span>TURBO</span>
          <span className="text-[9px] opacity-75 font-normal">[↑ / W]</span>
        </button>

        <button
          onClick={handleUndo}
          disabled={undoCount === 0 || isCleared || isPaused}
          className="py-2.5 sm:py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs sm:text-sm shadow-md transition flex flex-col items-center justify-center cursor-pointer border border-slate-700 disabled:opacity-30 disabled:cursor-default"
        >
          <div className="flex items-center gap-1">
            <Undo2 className="w-3.5 h-3.5" />
            <span>UNDO</span>
          </div>
          <span className="text-[9px] opacity-75 font-normal">[Z]</span>
        </button>
      </div>

      {/* ステージセレクトモーダル */}
      {showStageSelect && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowStageSelect(false)}
        >
          <div
            className={`max-w-2xl w-full p-6 rounded-3xl border shadow-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-black tracking-tight">ステージ選択</h3>
                <p className="text-xs text-slate-400">
                  全15ステージ・星を集めて時計塔を攻略しよう
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {saveData.totalStars} / 45
                </span>
                <button
                  onClick={() => setShowStageSelect(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {STAGES.map((stg, idx) => {
                const rec = saveData.records[stg.stageNumber];
                const isCurrent = idx === currentStageIdx;
                const isUnlocked = idx === 0 || !!saveData.records[idx]?.cleared;

                return (
                  <button
                    key={stg.stageNumber}
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (idx === currentStageIdx) initStage(idx);
                      else setCurrentStageIdx(idx);
                      setShowStageSelect(false);
                    }}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-sky-600/20 border-sky-500 shadow-md shadow-sky-500/20'
                        : isUnlocked
                        ? isDark
                          ? 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                        : 'opacity-40 bg-slate-900/30 border-dashed border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-xs font-black mb-1">#{stg.stageNumber}</div>
                    <div className="text-[10px] text-slate-400 truncate w-full mb-2">
                      {stg.name}
                    </div>
                    <div className="flex gap-0.5 text-xs text-amber-400">
                      {[1, 2, 3].map((sIdx) => (
                        <span key={sIdx}>
                          {rec && rec.stars >= sIdx ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ヘルプ / 遊び方モーダル */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowHelp(false)}
        >
          <div
            className={`max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 rounded-3xl border shadow-2xl space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-sky-400" />
              スピンドクターの遊び方
            </h3>

            <div className={`text-xs space-y-2.5 leading-relaxed ${isDark ? 'text-slate-300 [&_strong]:text-white' : 'text-slate-600 [&_strong]:text-slate-900'}`}>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-black shrink-0">
                  1
                </span>
                <div>
                  <strong>ピン飛び移り (LATCH)</strong>:
                  針の先が次のピンに重なった瞬間に【SPACE】キーまたは画面タップ。支点が移り変わります。
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                  2
                </span>
                <div>
                  <strong>方向反転 (FLIP)</strong>:
                  【↓】または【S】キーで時計回り・反時計回りを瞬時に切り替えます。
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center font-black shrink-0">
                  3
                </span>
                <div>
                  <strong>加速 (TURBO)</strong>:
                  【↑】または【W】キーで針が高速回転。一気に遠くへ渡り歩く時に有効です。
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
                  4
                </span>
                <div>
                  <strong>巻き戻し (UNDO)</strong>:
                  【Z】キーで1手前のピン状態に安全に戻せます。
                </div>
              </div>

              <p>【P / Esc】で一時停止・再開。ヘルプやステージ選択を開いている間も時間は止まります。</p>
              <p>クリアで★1、ギア2個で★2、ギア3個＋制限時間の25%以上を残してクリアで★3。</p>

              <div className="border-t border-slate-800 pt-3">
                <div className="font-bold text-white mb-1.5">ピンの種類:</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                  <div>🔵 青: 通常ピン</div>
                  <div>🟡 黄金: ゴールピン</div>
                  <div>🔴 赤: 酸ピン (接触ミス)</div>
                  <div>🟨 黄: スイッチ (ゲート開閉)</div>
                  <div>🟠 橙: 崩壊ピン (数秒で消滅)</div>
                  <div>🟢 緑: オイル (超高速回転)</div>
                  <div>🟣 紫: ワープ (転送)</div>
                  <div>⚙️ 歯車: 収集で星評価</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
