import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';

const HIGH_SCORE_KEY = 'doteater_high_score';

interface DotEaterGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';
type GhostHouseState = 'OUT' | 'WAITING' | 'EXITING';
type GhostMode = 'CHASE' | 'FRIGHTENED' | 'EATEN';

interface Ghost {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  dir: Direction;
  mode: GhostMode;
  speed: number;
  houseState: GhostHouseState;
  houseTimer: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  opacity: number;
  color: string;
}

// 迷路マップ (19x19)
// 0: 通路(ドットなし/ワープ), 1: 壁, 2: 通常ドット, 3: パワードット, 4: ゴーストハウス/ゲート
const INITIAL_MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const TILE_SIZE = 24;
const MAP_ROWS = INITIAL_MAP.length;
const MAP_COLS = INITIAL_MAP[0].length;
const CANVAS_WIDTH = MAP_COLS * TILE_SIZE;
const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE;

// ゴーストハウス基準座標
const HOUSE_CENTER_X = 9 * TILE_SIZE + TILE_SIZE / 2; // 228
const HOUSE_CENTER_Y = 10 * TILE_SIZE + TILE_SIZE / 2; // 252
const HOUSE_EXIT_Y = 7 * TILE_SIZE + TILE_SIZE / 2; // 180 (ゲート上の通路)

export const DotEaterGame: React.FC<DotEaterGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'title' | 'ready' | 'playing' | 'dying' | 'paused' | 'gameover' | 'cleared'>('title');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [stage, setStage] = useState(1);

  // ゲーム内部の可変状態
  const stateRef = useRef({
    map: INITIAL_MAP.map((r) => [...r]),
    player: {
      x: 9 * TILE_SIZE + TILE_SIZE / 2,
      y: 14 * TILE_SIZE + TILE_SIZE / 2,
      dir: 'NONE' as Direction,
      nextDir: 'NONE' as Direction,
      speed: 2.4,
      mouthAngle: 0.2,
      mouthDir: 0.04,
      deathProgress: 0,
    },
    ghosts: [] as Ghost[],
    frightenedTimer: 0,
    frightenedCombo: 0,
    fruit: null as { x: number; y: number; active: boolean; timer: number } | null,
    floatingScores: [] as FloatingScore[],
    nextScoreId: 1,
    totalDots: 0,
    dotsEaten: 0,
    score: 0,
    lives: 3,
    stage: 1,
    readyTimer: 0,
    dyingTimer: 0,
  });

  // ハイスコア読み込み
  useEffect(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }
  }, []);

  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        return newScore;
      }
      return prev;
    });
  }, []);

  // 浮動スコア追加
  const addFloatingScore = (x: number, y: number, text: string, color = '#38bdf8') => {
    const s = stateRef.current;
    s.floatingScores.push({
      id: s.nextScoreId++,
      x,
      y,
      text,
      opacity: 1,
      color,
    });
  };

  // キャラクター位置リセット
  const resetEntitiesPositions = (resetTimers = false) => {
    const s = stateRef.current;
    // プレイヤー初期位置
    s.player.x = 9 * TILE_SIZE + TILE_SIZE / 2;
    s.player.y = 14 * TILE_SIZE + TILE_SIZE / 2;
    s.player.dir = 'NONE';
    s.player.nextDir = 'NONE';
    s.player.mouthAngle = 0.2;
    s.player.deathProgress = 0;

    // ゴースト初期化
    const baseSpeed = 1.8 + Math.min(s.stage * 0.18, 0.9);
    s.ghosts = [
      {
        id: 0,
        name: 'Blinky',
        color: '#ef4444', // 赤
        x: 9 * TILE_SIZE + TILE_SIZE / 2,
        y: HOUSE_EXIT_Y,
        spawnX: 9 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: HOUSE_EXIT_Y,
        dir: 'LEFT',
        mode: 'CHASE',
        speed: baseSpeed,
        houseState: 'OUT',
        houseTimer: 0,
      },
      {
        id: 1,
        name: 'Pinky',
        color: '#ec4899', // ピンク
        x: HOUSE_CENTER_X,
        y: HOUSE_CENTER_Y,
        spawnX: HOUSE_CENTER_X,
        spawnY: HOUSE_CENTER_Y,
        dir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.95,
        houseState: resetTimers ? 'WAITING' : 'EXITING',
        houseTimer: resetTimers ? 40 : 0,
      },
      {
        id: 2,
        name: 'Inky',
        color: '#06b6d4', // シアン
        x: 8 * TILE_SIZE + TILE_SIZE / 2,
        y: HOUSE_CENTER_Y,
        spawnX: 8 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: HOUSE_CENTER_Y,
        dir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.9,
        houseState: resetTimers ? 'WAITING' : 'EXITING',
        houseTimer: resetTimers ? 180 : 30,
      },
      {
        id: 3,
        name: 'Clyde',
        color: '#f97316', // オレンジ
        x: 10 * TILE_SIZE + TILE_SIZE / 2,
        y: HOUSE_CENTER_Y,
        spawnX: 10 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: HOUSE_CENTER_Y,
        dir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.85,
        houseState: resetTimers ? 'WAITING' : 'EXITING',
        houseTimer: resetTimers ? 320 : 60,
      },
    ];

    s.frightenedTimer = 0;
    s.frightenedCombo = 0;
  };

  // 初期化
  const initGame = (targetStage = 1, keepScore = false) => {
    const s = stateRef.current;
    s.stage = targetStage;
    if (!keepScore) {
      s.score = 0;
      s.lives = 3;
    }

    s.map = INITIAL_MAP.map((r) => [...r]);
    s.fruit = null;
    s.floatingScores = [];

    let dotCount = 0;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (s.map[r][c] === 2 || s.map[r][c] === 3) dotCount++;
      }
    }
    s.totalDots = dotCount;
    s.dotsEaten = 0;

    resetEntitiesPositions(true);

    setScore(s.score);
    setLives(s.lives);
    setStage(s.stage);

    // READY演出へ
    s.readyTimer = 80;
    setGameState('ready');
    sound.playPacStart();
  };

  const handleStart = () => {
    initGame(1, false);
  };

  const handleRestart = () => {
    initGame(1, false);
  };

  const handleNextStage = () => {
    initGame(stage + 1, true);
  };

  // タイル単位の通行可能判定
  const isTileWalkable = (col: number, row: number, isGhost = false, canPassGate = false): boolean => {
    const s = stateRef.current;
    // ワープ通路 (行10の画面外)
    if (row === 10 && (col < 0 || col >= MAP_COLS)) return true;
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;

    const cell = s.map[row][col];
    if (cell === 1) return false; // 壁
    if (cell === 4) {
      // ゴーストゲート: ゴーストかつ通過許可時のみ通れる
      return isGhost && canPassGate;
    }
    return true;
  };

  // プレイヤーのスムーズな移動＆コーナリング処理
  const updatePlayerMovement = () => {
    const s = stateRef.current;
    const p = s.player;

    const opposite: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
      NONE: 'NONE',
    };

    // 1. 真逆（Uターン）の入力は即座に受け付ける
    if (p.nextDir !== 'NONE' && p.nextDir === opposite[p.dir]) {
      p.dir = p.nextDir;
    }

    // 2. 直角方向の入力がある場合、最寄り交差点スナップ（コーナリングスライド）をチェック
    if (p.nextDir !== 'NONE' && p.nextDir !== p.dir && p.nextDir !== opposite[p.dir]) {
      const nearestCol = Math.round((p.x - TILE_SIZE / 2) / TILE_SIZE);
      const nearestRow = Math.round((p.y - TILE_SIZE / 2) / TILE_SIZE);
      const nearestTileX = nearestCol * TILE_SIZE + TILE_SIZE / 2;
      const nearestTileY = nearestRow * TILE_SIZE + TILE_SIZE / 2;

      const distToNearestX = p.x - nearestTileX;
      const distToNearestY = p.y - nearestTileY;
      const SNAP_THRESHOLD = 10.0; // ±10px以内なら先行コーナリング可能

      if (p.nextDir === 'UP' || p.nextDir === 'DOWN') {
        // 横移動中または停止中に上下へ曲がる場合、X軸が最寄り交差点に近いか判定
        if (Math.abs(distToNearestX) <= SNAP_THRESHOLD) {
          const targetRow = p.nextDir === 'UP' ? nearestRow - 1 : nearestRow + 1;
          if (isTileWalkable(nearestCol, targetRow, false, false)) {
            p.x = nearestTileX;
            p.dir = p.nextDir;
          }
        }
      } else if (p.nextDir === 'LEFT' || p.nextDir === 'RIGHT') {
        // 縦移動中または停止中に左右へ曲がる場合、Y軸が最寄り交差点に近いか判定
        if (Math.abs(distToNearestY) <= SNAP_THRESHOLD) {
          const targetCol = p.nextDir === 'LEFT' ? nearestCol - 1 : nearestCol + 1;
          if (isTileWalkable(targetCol, nearestRow, false, false)) {
            p.y = nearestTileY;
            p.dir = p.nextDir;
          }
        }
      }
    }

    // 3. 現在の進行方向への移動処理
    if (p.dir !== 'NONE') {
      const curCol = Math.floor(p.x / TILE_SIZE);
      const curRow = Math.floor(p.y / TILE_SIZE);
      const centerTileX = curCol * TILE_SIZE + TILE_SIZE / 2;
      const centerTileY = curRow * TILE_SIZE + TILE_SIZE / 2;

      let canProceed = true;

      // 前方に壁がある場合の移動制限（マスの中心を越えて壁に突っ込まない）
      if (p.dir === 'UP') {
        if (!isTileWalkable(curCol, curRow - 1, false, false) && p.y <= centerTileY) {
          p.y = centerTileY;
          canProceed = false;
        }
      } else if (p.dir === 'DOWN') {
        if (!isTileWalkable(curCol, curRow + 1, false, false) && p.y >= centerTileY) {
          p.y = centerTileY;
          canProceed = false;
        }
      } else if (p.dir === 'LEFT') {
        if (curRow !== 10 && !isTileWalkable(curCol - 1, curRow, false, false) && p.x <= centerTileX) {
          p.x = centerTileX;
          canProceed = false;
        }
      } else if (p.dir === 'RIGHT') {
        if (curRow !== 10 && !isTileWalkable(curCol + 1, curRow, false, false) && p.x >= centerTileX) {
          p.x = centerTileX;
          canProceed = false;
        }
      }

      if (canProceed) {
        if (p.dir === 'UP') {
          p.y -= p.speed;
          p.x += (centerTileX - p.x) * 0.35;
        } else if (p.dir === 'DOWN') {
          p.y += p.speed;
          p.x += (centerTileX - p.x) * 0.35;
        } else if (p.dir === 'LEFT') {
          p.x -= p.speed;
          p.y += (centerTileY - p.y) * 0.35;
        } else if (p.dir === 'RIGHT') {
          p.x += p.speed;
          p.y += (centerTileY - p.y) * 0.35;
        }
      } else {
        // 壁にぶつかって止まった際、nextDirが有効ならそちらへ曲がる
        if (p.nextDir !== p.dir && p.nextDir !== 'NONE') {
          const nextTargetCol = p.nextDir === 'LEFT' ? curCol - 1 : p.nextDir === 'RIGHT' ? curCol + 1 : curCol;
          const nextTargetRow = p.nextDir === 'UP' ? curRow - 1 : p.nextDir === 'DOWN' ? curRow + 1 : curRow;
          if (isTileWalkable(nextTargetCol, nextTargetRow, false, false)) {
            p.x = centerTileX;
            p.y = centerTileY;
            p.dir = p.nextDir;
          }
        }
      }
    }

    // 4. 左右ワープトンネル (row: 10)
    const curRow = Math.floor(p.y / TILE_SIZE);
    if (curRow === 10) {
      if (p.x < -TILE_SIZE / 2) {
        p.x = CANVAS_WIDTH + TILE_SIZE / 2;
      } else if (p.x > CANVAS_WIDTH + TILE_SIZE / 2) {
        p.x = -TILE_SIZE / 2;
      }
    }
  };

  // ゴーストAIの更新
  const updateGhosts = () => {
    const s = stateRef.current;

    s.ghosts.forEach((g) => {
      // 1. ハウス内待機状態の処理
      if (g.houseState === 'WAITING') {
        if (g.houseTimer > 0) {
          g.houseTimer--;
          g.y = g.spawnY + Math.sin(Date.now() * 0.006 + g.id) * 3;
          return;
        } else {
          g.houseState = 'EXITING';
        }
      }

      // 2. ハウス脱出シーケンス
      if (g.houseState === 'EXITING') {
        const exitSpeed = 1.4;
        // ハウス中央のX座標（HOUSE_CENTER_X）へ寄せる
        if (Math.abs(g.x - HOUSE_CENTER_X) > 1.0) {
          g.dir = g.x < HOUSE_CENTER_X ? 'RIGHT' : 'LEFT';
          g.x += g.dir === 'RIGHT' ? exitSpeed : -exitSpeed;
        } else {
          g.x = HOUSE_CENTER_X;
          g.dir = 'UP';
          g.y -= exitSpeed;
          // ゲートを抜けて外の通路に到達したら脱出完了
          if (g.y <= HOUSE_EXIT_Y) {
            g.y = HOUSE_EXIT_Y;
            g.houseState = 'OUT';
            g.dir = 'LEFT';
          }
        }
        return;
      }

      // 3. 通常移動（CHASE / FRIGHTENED / EATEN）
      let currentSpeed = g.speed;
      if (g.mode === 'FRIGHTENED') currentSpeed = g.speed * 0.55;
      else if (g.mode === 'EATEN') currentSpeed = g.speed * 1.9;

      // EATENモードでハウス上部に帰還した場合
      if (g.mode === 'EATEN') {
        if (Math.abs(g.x - HOUSE_CENTER_X) < 6 && Math.abs(g.y - HOUSE_EXIT_Y) < 6) {
          g.x = HOUSE_CENTER_X;
          g.y += currentSpeed;
          g.dir = 'DOWN';
          if (g.y >= HOUSE_CENTER_Y) {
            g.y = HOUSE_CENTER_Y;
            g.mode = 'CHASE';
            g.houseState = 'EXITING';
          }
          return;
        }
      }

      // タイル交差点にいるか判定
      const curCol = Math.floor(g.x / TILE_SIZE);
      const curRow = Math.floor(g.y / TILE_SIZE);
      const centerTileX = curCol * TILE_SIZE + TILE_SIZE / 2;
      const centerTileY = curRow * TILE_SIZE + TILE_SIZE / 2;

      const isAtIntersection =
        Math.abs(g.x - centerTileX) < currentSpeed * 0.8 &&
        Math.abs(g.y - centerTileY) < currentSpeed * 0.8;

      if (isAtIntersection) {
        g.x = centerTileX;
        g.y = centerTileY;

        // ターゲット座標の決定
        let targetX = s.player.x;
        let targetY = s.player.y;

        if (g.mode === 'FRIGHTENED') {
          targetX = Math.floor(Math.random() * CANVAS_WIDTH);
          targetY = Math.floor(Math.random() * CANVAS_HEIGHT);
        } else if (g.mode === 'EATEN') {
          targetX = HOUSE_CENTER_X;
          targetY = HOUSE_EXIT_Y;
        } else {
          if (g.id === 1) {
            // Pinky
            if (s.player.dir === 'UP') targetY -= TILE_SIZE * 4;
            else if (s.player.dir === 'DOWN') targetY += TILE_SIZE * 4;
            else if (s.player.dir === 'LEFT') targetX -= TILE_SIZE * 4;
            else if (s.player.dir === 'RIGHT') targetX += TILE_SIZE * 4;
          } else if (g.id === 2) {
            // Inky
            const blinky = s.ghosts[0];
            if (blinky) {
              targetX = s.player.x * 2 - blinky.x;
              targetY = s.player.y * 2 - blinky.y;
            }
          } else if (g.id === 3) {
            // Clyde
            const dist = Math.hypot(g.x - s.player.x, g.y - s.player.y);
            if (dist < TILE_SIZE * 5) {
              targetX = 1 * TILE_SIZE;
              targetY = 17 * TILE_SIZE;
            }
          }
        }

        const opposite: Record<Direction, Direction> = {
          UP: 'DOWN',
          DOWN: 'UP',
          LEFT: 'RIGHT',
          RIGHT: 'LEFT',
          NONE: 'NONE',
        };

        const dirs: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
        let bestDir = g.dir;
        let bestDist = Infinity;
        const availableDirs: Direction[] = [];

        dirs.forEach((d) => {
          if (d === opposite[g.dir] && g.mode !== 'FRIGHTENED') return;

          const nCol = d === 'LEFT' ? curCol - 1 : d === 'RIGHT' ? curCol + 1 : curCol;
          const nRow = d === 'UP' ? curRow - 1 : d === 'DOWN' ? curRow + 1 : curRow;

          if (isTileWalkable(nCol, nRow, true, g.mode === 'EATEN')) {
            availableDirs.push(d);
            const testX = nCol * TILE_SIZE + TILE_SIZE / 2;
            const testY = nRow * TILE_SIZE + TILE_SIZE / 2;
            const dist = Math.hypot(testX - targetX, testY - targetY);
            if (dist < bestDist) {
              bestDist = dist;
              bestDir = d;
            }
          }
        });

        if (availableDirs.length > 0) {
          g.dir = bestDir;
        } else {
          g.dir = opposite[g.dir];
        }
      }

      // ゴースト移動
      if (g.dir === 'UP') g.y -= currentSpeed;
      else if (g.dir === 'DOWN') g.y += currentSpeed;
      else if (g.dir === 'LEFT') g.x -= currentSpeed;
      else if (g.dir === 'RIGHT') g.x += currentSpeed;

      // ワープ
      if (curRow === 10) {
        if (g.x < -TILE_SIZE / 2) g.x = CANVAS_WIDTH + TILE_SIZE / 2;
        else if (g.x > CANVAS_WIDTH + TILE_SIZE / 2) g.x = -TILE_SIZE / 2;
      }
    });
  };

  // 方向入力
  const setDirection = (dir: Direction) => {
    stateRef.current.player.nextDir = dir;
  };

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          setDirection('UP');
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          setDirection('RIGHT');
          break;
        case 'KeyP':
        case 'Escape':
          if (gameState === 'playing') setGameState('paused');
          else if (gameState === 'paused') setGameState('playing');
          break;
        case 'KeyR':
          if (gameState === 'gameover') handleRestart();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // タッチスワイプ
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipe = 20;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) setDirection('RIGHT');
        else setDirection('LEFT');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) setDirection('DOWN');
        else setDirection('UP');
      }
    }
  };

  // メインループ
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const s = stateRef.current;

      if (ctx && canvas) {
        // --- 1. 更新処理 ---
        if (gameState === 'ready') {
          s.readyTimer--;
          if (s.readyTimer <= 0) {
            setGameState('playing');
          }
        } else if (gameState === 'dying') {
          s.dyingTimer--;
          s.player.deathProgress = Math.min(1, (65 - s.dyingTimer) / 50);

          if (s.dyingTimer <= 0) {
            if (s.lives <= 0) {
              setGameState('gameover');
            } else {
              resetEntitiesPositions(false);
              s.readyTimer = 70;
              setGameState('ready');
            }
          }
        } else if (gameState === 'playing') {
          // フライトタイマー
          if (s.frightenedTimer > 0) {
            s.frightenedTimer--;
            if (s.frightenedTimer === 0) {
              s.ghosts.forEach((g) => {
                if (g.mode === 'FRIGHTENED') g.mode = 'CHASE';
              });
            }
          }

          // プレイヤー口パク
          s.player.mouthAngle += s.player.mouthDir;
          if (s.player.mouthAngle > 0.45 || s.player.mouthAngle < 0.02) {
            s.player.mouthDir = -s.player.mouthDir;
          }

          // プレイヤー移動更新 (コーナリングスライド)
          updatePlayerMovement();

          // ドットイート判定
          const curCol = Math.floor(s.player.x / TILE_SIZE);
          const curRow = Math.floor(s.player.y / TILE_SIZE);

          if (curRow >= 0 && curRow < MAP_ROWS && curCol >= 0 && curCol < MAP_COLS) {
            const cell = s.map[curRow][curCol];
            if (cell === 2) {
              // 通常ドット
              s.map[curRow][curCol] = 0;
              s.score += 10;
              s.dotsEaten++;
              sound.playDotEat(s.dotsEaten % 2 === 0);
              setScore(s.score);
              updateHighScore(s.score);

              // フルーツ出現 (70ドット、140ドット)
              // ゴーストハウスの下側通路 (row: 13, col: 9) に出現させる
              if (s.dotsEaten === 70 || s.dotsEaten === 140) {
                s.fruit = {
                  x: 9 * TILE_SIZE + TILE_SIZE / 2,
                  y: 13 * TILE_SIZE + TILE_SIZE / 2,
                  active: true,
                  timer: 600, // 10秒
                };
              }

              if (s.dotsEaten >= s.totalDots) {
                sound.playStageClear();
                setGameState('cleared');
              }
            } else if (cell === 3) {
              // パワードット
              s.map[curRow][curCol] = 0;
              s.score += 50;
              s.dotsEaten++;
              s.frightenedTimer = 480; // 約8秒
              s.frightenedCombo = 0;
              sound.playPowerPellet();

              s.ghosts.forEach((g) => {
                if (g.mode !== 'EATEN' && g.houseState === 'OUT') {
                  g.mode = 'FRIGHTENED';
                }
              });

              setScore(s.score);
              updateHighScore(s.score);

              if (s.dotsEaten >= s.totalDots) {
                sound.playStageClear();
                setGameState('cleared');
              }
            }
          }

          // フルーツ取得判定
          if (s.fruit && s.fruit.active) {
            s.fruit.timer--;
            if (s.fruit.timer <= 0) {
              s.fruit.active = false;
            } else {
              const dist = Math.hypot(s.player.x - s.fruit.x, s.player.y - s.fruit.y);
              if (dist < TILE_SIZE * 0.9) {
                sound.playFruitEat();
                const fruitBonus = 300 * s.stage;
                s.score += fruitBonus;
                s.fruit.active = false;
                addFloatingScore(s.fruit.x, s.fruit.y, `+${fruitBonus}`, '#f43f5e');
                setScore(s.score);
                updateHighScore(s.score);
              }
            }
          }

          // ゴーストAI更新
          updateGhosts();

          // プレイヤーとゴーストの接触判定
          let playerHit = false;
          for (const g of s.ghosts) {
            if (g.houseState !== 'OUT') continue;

            const distToPlayer = Math.hypot(s.player.x - g.x, s.player.y - g.y);
            if (distToPlayer < TILE_SIZE * 0.75) {
              if (g.mode === 'FRIGHTENED') {
                // ゴースト捕食
                sound.playEatGhost();
                g.mode = 'EATEN';
                s.frightenedCombo++;
                const bonus = 200 * Math.pow(2, s.frightenedCombo - 1);
                s.score += bonus;
                addFloatingScore(g.x, g.y, `+${bonus}`, '#38bdf8');
                setScore(s.score);
                updateHighScore(s.score);
              } else if (g.mode === 'CHASE') {
                // プレイヤー死亡
                playerHit = true;
                break;
              }
            }
          }

          if (playerHit) {
            sound.playPacDeath();
            s.lives--;
            setLives(s.lives);
            s.dyingTimer = 65; // 約1.1秒の死亡アニメーション
            setGameState('dying');
          }

          // 浮動スコア更新
          s.floatingScores.forEach((fs) => {
            fs.y -= 0.6;
            fs.opacity -= 0.022;
          });
          s.floatingScores = s.floatingScores.filter((fs) => fs.opacity > 0);
        }

        // --- 2. 描画処理 ---
        ctx.fillStyle = isDark ? '#020617' : '#f8fafc';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 迷路の描画
        for (let r = 0; r < MAP_ROWS; r++) {
          for (let c = 0; c < MAP_COLS; c++) {
            const cell = s.map[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (cell === 1) {
              // 壁 (モダン＆クリーンな角丸)
              ctx.fillStyle = isDark ? '#1e293b' : '#cbd5e1';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
            } else if (cell === 4) {
              // ゴーストゲート
              ctx.strokeStyle = '#ec4899';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(px, py + TILE_SIZE / 2);
              ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE / 2);
              ctx.stroke();
            } else if (cell === 2) {
              // 通常ドット
              ctx.fillStyle = isDark ? '#fde047' : '#eab308';
              ctx.beginPath();
              ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (cell === 3) {
              // パワードット (脈動)
              const pulse = Math.sin(Date.now() * 0.009) * 1.6 + 6;
              ctx.fillStyle = isDark ? '#fef08a' : '#ca8a04';
              ctx.beginPath();
              ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, Math.max(3, pulse), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // フルーツ描画
        if (s.fruit && s.fruit.active) {
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🍒', s.fruit.x, s.fruit.y);
        }

        // プレイヤー描画
        if (gameState !== 'gameover') {
          ctx.save();
          ctx.translate(s.player.x, s.player.y);

          if (gameState === 'dying') {
            // 死亡アニメーション (口が全開になって消滅)
            const progress = s.player.deathProgress;
            const startAngle = progress * Math.PI;
            const endAngle = (2 - progress) * Math.PI;

            if (progress < 0.95) {
              ctx.fillStyle = '#facc15';
              ctx.beginPath();
              ctx.arc(0, 0, TILE_SIZE * 0.45 * (1 - progress * 0.5), startAngle, endAngle);
              ctx.lineTo(0, 0);
              ctx.fill();
            }
          } else {
            // 通常描画
            let rotation = 0;
            if (s.player.dir === 'DOWN') rotation = Math.PI / 2;
            else if (s.player.dir === 'LEFT') rotation = Math.PI;
            else if (s.player.dir === 'UP') rotation = -Math.PI / 2;
            ctx.rotate(rotation);

            const mouth = s.player.dir === 'NONE' ? 0.15 : s.player.mouthAngle;
            ctx.fillStyle = '#facc15'; // イエロー
            ctx.beginPath();
            ctx.arc(0, 0, TILE_SIZE * 0.45, mouth * Math.PI, (2 - mouth) * Math.PI);
            ctx.lineTo(0, 0);
            ctx.fill();
          }

          ctx.restore();
        }

        // ゴースト描画
        s.ghosts.forEach((g) => {
          ctx.save();
          ctx.translate(g.x, g.y);

          // 瞳の視線方向オフセット
          let eyeOffsetX = 0;
          let eyeOffsetY = 0;
          if (g.dir === 'LEFT') eyeOffsetX = -1.5;
          else if (g.dir === 'RIGHT') eyeOffsetX = 1.5;
          else if (g.dir === 'UP') eyeOffsetY = -1.5;
          else if (g.dir === 'DOWN') eyeOffsetY = 1.5;

          if (g.mode === 'EATEN') {
            // 目玉のみ
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-4, -2, 4, 0, Math.PI * 2);
            ctx.arc(4, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(-4 + eyeOffsetX * 1.5, -2 + eyeOffsetY * 1.5, 2, 0, Math.PI * 2);
            ctx.arc(4 + eyeOffsetX * 1.5, -2 + eyeOffsetY * 1.5, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // ゴースト本体
            const isFlashing = s.frightenedTimer < 140 && Math.floor(s.frightenedTimer / 12) % 2 === 0;
            const ghostColor = g.mode === 'FRIGHTENED' ? (isFlashing ? '#ffffff' : '#2563eb') : g.color;

            ctx.fillStyle = ghostColor;
            const r = TILE_SIZE * 0.45;
            ctx.beginPath();
            ctx.arc(0, -2, r, Math.PI, 0, false);
            ctx.lineTo(r, r);
            // 足の波打つアニメーション
            const wave = Math.sin(Date.now() * 0.015 + g.id) * 1.5;
            ctx.lineTo(r * 0.5, r * 0.7 + wave);
            ctx.lineTo(0, r);
            ctx.lineTo(-r * 0.5, r * 0.7 - wave);
            ctx.lineTo(-r, r);
            ctx.closePath();
            ctx.fill();

            // ゴーストの目
            if (g.mode === 'FRIGHTENED') {
              // 怖がり顔
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(-3.5, -3, 2, 0, Math.PI * 2);
              ctx.arc(3.5, -3, 2, 0, Math.PI * 2);
              ctx.fill();

              // 波打つ口
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(-4, 3);
              ctx.lineTo(-2, 1);
              ctx.lineTo(0, 3);
              ctx.lineTo(2, 1);
              ctx.lineTo(4, 3);
              ctx.stroke();
            } else {
              // 白目
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(-3.5, -3, 3.5, 0, Math.PI * 2);
              ctx.arc(3.5, -3, 3.5, 0, Math.PI * 2);
              ctx.fill();

              // 黒目（進行方向を向く）
              ctx.fillStyle = '#1e3a8a';
              ctx.beginPath();
              ctx.arc(-3.5 + eyeOffsetX, -3 + eyeOffsetY, 1.8, 0, Math.PI * 2);
              ctx.arc(3.5 + eyeOffsetX, -3 + eyeOffsetY, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
        });

        // 浮動スコア描画
        s.floatingScores.forEach((fs) => {
          ctx.save();
          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = fs.color;
          ctx.globalAlpha = Math.max(0, fs.opacity);
          ctx.textAlign = 'center';
          ctx.fillText(fs.text, fs.x, fs.y);
          ctx.restore();
        });

        // READY表示
        if (gameState === 'ready') {
          ctx.save();
          ctx.font = '900 20px monospace';
          ctx.fillStyle = '#facc15';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText('READY!', HOUSE_CENTER_X, 12 * TILE_SIZE + TILE_SIZE / 2);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isDark]);

  return (
    <div
      className={`w-full flex flex-col items-center select-none ${
        isFullscreen ? 'h-full justify-between py-1' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 上部ヘッダーナビゲーション */}
      <div
        className={`flex items-center justify-between mb-2 transition-all ${
          isFullscreen
            ? 'w-[min(96vw,calc(100vh-100px))] px-1'
            : 'w-full max-w-[460px]'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold font-mono">
          <div className="flex items-center gap-1 text-yellow-500">
            <span>●</span>
            <span>×{lives}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>STAGE</span>
            <span className="text-indigo-500 font-black">{stage}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>SCORE</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>{score}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-amber-500">
            <span>HIGH</span>
            <span>{highScore}</span>
          </div>
        </div>
      </div>

      {/* ゲームCanvasコンテナ (AGENTS.md ルール1: フルスクリーン時はダイナミック拡大) */}
      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100 shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(96vw,calc(100vh-110px))] h-[min(96vw,calc(100vh-110px))] aspect-square my-auto'
            : 'w-full max-w-[460px] aspect-square'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block touch-none image-rendering-pixelated"
        />

        {/* タイトルオーバーレイ */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500 flex items-center justify-center text-3xl shadow-lg animate-bounce">
              🟡
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">ドットイーター</h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">DOT EATER MAZE ACTION</p>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
              ゴーストから逃げながら迷路のドットを全回収！パワードットでゴーストを撃退！
            </p>
            <button
              onClick={handleStart}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition transform hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              ゲームスタート
            </button>
          </div>
        )}

        {/* ポーズオーバーレイ */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in fade-in duration-150">
            <h3 className="text-2xl font-black">一時停止中</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setGameState('playing')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition cursor-pointer"
              >
                再開する
              </button>
              <button
                onClick={handleRestart}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                やり直す
              </button>
            </div>
          </div>
        )}

        {/* ゲームオーバーオーバーレイ */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-rose-500 text-4xl font-black tracking-wider">GAME OVER</div>
            <div className="text-sm text-slate-300 font-mono space-y-1">
              <div>SCORE: <span className="font-bold text-white text-lg">{score}</span></div>
              <div>HIGH: <span className="font-bold text-amber-400">{highScore}</span></div>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              もう一度挑戦
            </button>
          </div>
        )}

        {/* ステージクリアオーバーレイ */}
        {gameState === 'cleared' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-emerald-400 text-4xl font-black tracking-wider">STAGE CLEAR!</div>
            <p className="text-sm text-slate-300 font-mono">
              STAGE {stage} クリア！ スコア: <span className="font-bold text-white">{score}</span>
            </p>
            <button
              onClick={handleNextStage}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              次のステージへ
            </button>
          </div>
        )}
      </div>

      {/* スマホ用操作十字キー (D-Pad) */}
      <div className={`w-full max-w-[280px] grid grid-cols-3 gap-1.5 mt-2 sm:hidden ${isFullscreen ? 'mb-1' : ''}`}>
        <div />
        <button
          onClick={() => setDirection('UP')}
          className="py-3 bg-slate-800/90 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700 shadow flex items-center justify-center"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => setDirection('LEFT')}
          className="py-3 bg-slate-800/90 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700 shadow flex items-center justify-center"
        >
          ◀
        </button>
        <button
          onClick={() => setDirection('DOWN')}
          className="py-3 bg-slate-800/90 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700 shadow flex items-center justify-center"
        >
          ▼
        </button>
        <button
          onClick={() => setDirection('RIGHT')}
          className="py-3 bg-slate-800/90 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700 shadow flex items-center justify-center"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
