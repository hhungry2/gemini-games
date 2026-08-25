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

interface Ghost {
  id: number;
  x: number;
  y: number;
  dir: Direction;
  targetDir: Direction;
  color: string;
  name: string;
  mode: 'CHASE' | 'FRIGHTENED' | 'EATEN';
  speed: number;
  spawnX: number;
  spawnY: number;
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

export const DotEaterGame: React.FC<DotEaterGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover' | 'cleared'>('title');
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
    },
    ghosts: [] as Ghost[],
    frightenedTimer: 0,
    frightenedCombo: 0,
    fruit: null as { x: number; y: number; active: boolean; timer: number } | null,
    totalDots: 0,
    dotsEaten: 0,
    score: 0,
    lives: 3,
    stage: 1,
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

  // 初期化
  const initGame = (targetStage = 1, keepScore = false) => {
    const s = stateRef.current;
    s.stage = targetStage;
    if (!keepScore) {
      s.score = 0;
      s.lives = 3;
    }

    s.map = INITIAL_MAP.map((r) => [...r]);
    s.frightenedTimer = 0;
    s.frightenedCombo = 0;
    s.fruit = null;

    let dotCount = 0;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (s.map[r][c] === 2 || s.map[r][c] === 3) dotCount++;
      }
    }
    s.totalDots = dotCount;
    s.dotsEaten = 0;

    // プレイヤー初期位置
    s.player = {
      x: 9 * TILE_SIZE + TILE_SIZE / 2,
      y: 14 * TILE_SIZE + TILE_SIZE / 2,
      dir: 'NONE',
      nextDir: 'NONE',
      speed: 2.4,
      mouthAngle: 0.2,
      mouthDir: 0.04,
    };

    // ゴースト初期化
    const baseSpeed = 1.8 + Math.min(targetStage * 0.2, 1.0);
    s.ghosts = [
      {
        id: 0,
        name: 'Blinky',
        color: '#ef4444', // 赤
        x: 9 * TILE_SIZE + TILE_SIZE / 2,
        y: 7 * TILE_SIZE + TILE_SIZE / 2,
        spawnX: 9 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: 7 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'LEFT',
        targetDir: 'LEFT',
        mode: 'CHASE',
        speed: baseSpeed,
      },
      {
        id: 1,
        name: 'Pinky',
        color: '#ec4899', // ピンク
        x: 9 * TILE_SIZE + TILE_SIZE / 2,
        y: 10 * TILE_SIZE + TILE_SIZE / 2,
        spawnX: 9 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: 10 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'UP',
        targetDir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.95,
      },
      {
        id: 2,
        name: 'Inky',
        color: '#06b6d4', // シアン
        x: 8 * TILE_SIZE + TILE_SIZE / 2,
        y: 10 * TILE_SIZE + TILE_SIZE / 2,
        spawnX: 8 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: 10 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'UP',
        targetDir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.9,
      },
      {
        id: 3,
        name: 'Clyde',
        color: '#f97316', // オレンジ
        x: 10 * TILE_SIZE + TILE_SIZE / 2,
        y: 10 * TILE_SIZE + TILE_SIZE / 2,
        spawnX: 10 * TILE_SIZE + TILE_SIZE / 2,
        spawnY: 10 * TILE_SIZE + TILE_SIZE / 2,
        dir: 'UP',
        targetDir: 'UP',
        mode: 'CHASE',
        speed: baseSpeed * 0.85,
      },
    ];

    setScore(s.score);
    setLives(s.lives);
    setStage(s.stage);
  };

  const handleStart = () => {
    initGame(1, false);
    setGameState('playing');
  };

  const handleRestart = () => {
    initGame(1, false);
    setGameState('playing');
  };

  const handleNextStage = () => {
    initGame(stage + 1, true);
    setGameState('playing');
  };

  // 衝突判定ヘルパー (指定位置が通行可能か)
  const canMove = (x: number, y: number, dir: Direction, isGhost = false): boolean => {
    const s = stateRef.current;
    let nextX = x;
    let nextY = y;
    const offset = TILE_SIZE / 2 - 1;

    if (dir === 'UP') nextY -= 2;
    else if (dir === 'DOWN') nextY += 2;
    else if (dir === 'LEFT') nextX -= 2;
    else if (dir === 'RIGHT') nextX += 2;

    // ワープ通路 (左右)
    if (nextX < 0 || nextX >= CANVAS_WIDTH) return true;

    // 四隅のセルチェック
    const points = [
      { x: nextX - offset, y: nextY - offset },
      { x: nextX + offset, y: nextY - offset },
      { x: nextX - offset, y: nextY + offset },
      { x: nextX + offset, y: nextY + offset },
    ];

    for (const p of points) {
      const col = Math.floor(p.x / TILE_SIZE);
      const row = Math.floor(p.y / TILE_SIZE);

      if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) continue;
      const cell = s.map[row][col];
      if (cell === 1) return false;
      if (cell === 4 && !isGhost) return false; // ゴーストハウスゲート
    }
    return true;
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

    const minSwipe = 25;
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
        if (gameState === 'playing') {
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

          // プレイヤー方向転換試行 (交差点でのスムーズな転回)
          if (s.player.nextDir !== 'NONE') {
            if (canMove(s.player.x, s.player.y, s.player.nextDir)) {
              s.player.dir = s.player.nextDir;
            }
          }

          // プレイヤー移動
          if (canMove(s.player.x, s.player.y, s.player.dir)) {
            if (s.player.dir === 'UP') s.player.y -= s.player.speed;
            else if (s.player.dir === 'DOWN') s.player.y += s.player.speed;
            else if (s.player.dir === 'LEFT') s.player.x -= s.player.speed;
            else if (s.player.dir === 'RIGHT') s.player.x += s.player.speed;
          }

          // ワープトンネル処理
          if (s.player.x < -TILE_SIZE / 2) s.player.x = CANVAS_WIDTH + TILE_SIZE / 2;
          else if (s.player.x > CANVAS_WIDTH + TILE_SIZE / 2) s.player.x = -TILE_SIZE / 2;

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
              if (s.dotsEaten === 70 || s.dotsEaten === 140) {
                s.fruit = {
                  x: 9 * TILE_SIZE + TILE_SIZE / 2,
                  y: 10 * TILE_SIZE + TILE_SIZE / 2,
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
              s.frightenedTimer = 450; // 約7.5秒
              s.frightenedCombo = 0;
              sound.playPowerPellet();

              s.ghosts.forEach((g) => {
                if (g.mode !== 'EATEN') {
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

          // フルーツ取得
          if (s.fruit && s.fruit.active) {
            s.fruit.timer--;
            if (s.fruit.timer <= 0) {
              s.fruit.active = false;
            } else {
              const dist = Math.hypot(s.player.x - s.fruit.x, s.player.y - s.fruit.y);
              if (dist < TILE_SIZE) {
                sound.playFruitEat();
                s.score += 300;
                s.fruit.active = false;
                setScore(s.score);
                updateHighScore(s.score);
              }
            }
          }

          // ゴーストAI更新
          s.ghosts.forEach((g) => {
            // 移動
            const speed = g.mode === 'FRIGHTENED' ? g.speed * 0.6 : g.mode === 'EATEN' ? g.speed * 2 : g.speed;

            // タイル交差点にいるかチェック
            const alignX = Math.abs((g.x % TILE_SIZE) - TILE_SIZE / 2) < speed;
            const alignY = Math.abs((g.y % TILE_SIZE) - TILE_SIZE / 2) < speed;

            if (alignX && alignY) {
              // 目標タイルの設定
              let targetX = s.player.x;
              let targetY = s.player.y;

              if (g.mode === 'FRIGHTENED') {
                // ランダム方向
                targetX = Math.random() * CANVAS_WIDTH;
                targetY = Math.random() * CANVAS_HEIGHT;
              } else if (g.mode === 'EATEN') {
                // 巣に戻る
                targetX = g.spawnX;
                targetY = g.spawnY;
                if (Math.hypot(g.x - g.spawnX, g.y - g.spawnY) < 10) {
                  g.mode = 'CHASE';
                }
              } else {
                // 各ゴーストの個性
                if (g.id === 1) {
                  // Pinky: プレイヤーの先
                  if (s.player.dir === 'UP') targetY -= TILE_SIZE * 4;
                  else if (s.player.dir === 'DOWN') targetY += TILE_SIZE * 4;
                  else if (s.player.dir === 'LEFT') targetX -= TILE_SIZE * 4;
                  else if (s.player.dir === 'RIGHT') targetX += TILE_SIZE * 4;
                } else if (g.id === 3) {
                  // Clyde: 近づくと逃げる
                  const dist = Math.hypot(g.x - s.player.x, g.y - s.player.y);
                  if (dist < TILE_SIZE * 6) {
                    targetX = 1 * TILE_SIZE;
                    targetY = 17 * TILE_SIZE;
                  }
                }
              }

              // 有効な方向を選択（180度Uターンは避ける）
              const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
              const opposite: Record<Direction, Direction> = {
                UP: 'DOWN',
                DOWN: 'UP',
                LEFT: 'RIGHT',
                RIGHT: 'LEFT',
                NONE: 'NONE',
              };

              let bestDir = g.dir;
              let bestDist = Infinity;

              dirs.forEach((d) => {
                if (d === opposite[g.dir] && g.mode !== 'FRIGHTENED') return;
                if (canMove(g.x, g.y, d, true)) {
                  let testX = g.x;
                  let testY = g.y;
                  if (d === 'UP') testY -= TILE_SIZE;
                  else if (d === 'DOWN') testY += TILE_SIZE;
                  else if (d === 'LEFT') testX -= TILE_SIZE;
                  else if (d === 'RIGHT') testX += TILE_SIZE;

                  const dDist = Math.hypot(testX - targetX, testY - targetY);
                  if (dDist < bestDist) {
                    bestDist = dDist;
                    bestDir = d;
                  }
                }
              });

              g.dir = bestDir;
            }

            if (canMove(g.x, g.y, g.dir, true)) {
              if (g.dir === 'UP') g.y -= speed;
              else if (g.dir === 'DOWN') g.y += speed;
              else if (g.dir === 'LEFT') g.x -= speed;
              else if (g.dir === 'RIGHT') g.x += speed;
            }

            // ワープ
            if (g.x < -TILE_SIZE / 2) g.x = CANVAS_WIDTH + TILE_SIZE / 2;
            else if (g.x > CANVAS_WIDTH + TILE_SIZE / 2) g.x = -TILE_SIZE / 2;

            // プレイヤーとゴーストの衝突判定
            const distToPlayer = Math.hypot(s.player.x - g.x, s.player.y - g.y);
            if (distToPlayer < TILE_SIZE * 0.75) {
              if (g.mode === 'FRIGHTENED') {
                // ゴースト捕食
                sound.playEatGhost();
                g.mode = 'EATEN';
                s.frightenedCombo++;
                const bonus = 200 * Math.pow(2, s.frightenedCombo - 1);
                s.score += bonus;
                setScore(s.score);
                updateHighScore(s.score);
              } else if (g.mode === 'CHASE') {
                // プレイヤー死亡
                sound.playPacDeath();
                s.lives--;
                setLives(s.lives);

                if (s.lives <= 0) {
                  setGameState('gameover');
                } else {
                  // リスポーン
                  s.player.x = 9 * TILE_SIZE + TILE_SIZE / 2;
                  s.player.y = 14 * TILE_SIZE + TILE_SIZE / 2;
                  s.player.dir = 'NONE';
                  s.player.nextDir = 'NONE';
                  s.ghosts.forEach((gh) => {
                    gh.x = gh.spawnX;
                    gh.y = gh.spawnY;
                    gh.mode = 'CHASE';
                  });
                }
              }
            }
          });
        }

        // --- 2. 描画処理 (クリーン・フラットレトロ) ---
        ctx.fillStyle = isDark ? '#020617' : '#f1f5f9';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 迷路の描画
        for (let r = 0; r < MAP_ROWS; r++) {
          for (let c = 0; c < MAP_COLS; c++) {
            const cell = s.map[r][c];
            const px = c * TILE_SIZE;
            const py = r * TILE_SIZE;

            if (cell === 1) {
              // 壁 (角丸フラット)
              ctx.fillStyle = isDark ? '#1e293b' : '#94a3b8';
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
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
              const pulse = Math.sin(Date.now() * 0.008) * 1.5 + 6;
              ctx.fillStyle = isDark ? '#fef08a' : '#ca8a04';
              ctx.beginPath();
              ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, pulse, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // フルーツ描画
        if (s.fruit && s.fruit.active) {
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🍒', s.fruit.x, s.fruit.y);
        }

        // プレイヤー描画 (Pac)
        ctx.save();
        ctx.translate(s.player.x, s.player.y);

        let rotation = 0;
        if (s.player.dir === 'DOWN') rotation = Math.PI / 2;
        else if (s.player.dir === 'LEFT') rotation = Math.PI;
        else if (s.player.dir === 'UP') rotation = -Math.PI / 2;
        ctx.rotate(rotation);

        ctx.fillStyle = '#facc15'; // イエロー
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 0.45, s.player.mouthAngle * Math.PI, (2 - s.player.mouthAngle) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();

        // ゴースト描画
        s.ghosts.forEach((g) => {
          ctx.save();
          ctx.translate(g.x, g.y);

          if (g.mode === 'EATEN') {
            // 目玉のみ
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-4, -2, 4, 0, Math.PI * 2);
            ctx.arc(4, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(-4, -2, 2, 0, Math.PI * 2);
            ctx.arc(4, -2, 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // ゴースト本体
            const isFlashing = s.frightenedTimer < 120 && Math.floor(s.frightenedTimer / 10) % 2 === 0;
            const ghostColor = g.mode === 'FRIGHTENED' ? (isFlashing ? '#ffffff' : '#2563eb') : g.color;

            ctx.fillStyle = ghostColor;
            const r = TILE_SIZE * 0.45;
            ctx.beginPath();
            ctx.arc(0, -2, r, Math.PI, 0, false);
            ctx.lineTo(r, r);
            // 足の波
            ctx.lineTo(r * 0.5, r * 0.7);
            ctx.lineTo(0, r);
            ctx.lineTo(-r * 0.5, r * 0.7);
            ctx.lineTo(-r, r);
            ctx.closePath();
            ctx.fill();

            // ゴーストの目
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-3.5, -3, 3, 0, Math.PI * 2);
            ctx.arc(3.5, -3, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = g.mode === 'FRIGHTENED' ? '#ef4444' : '#1e3a8a';
            ctx.beginPath();
            ctx.arc(-3.5, -3, 1.5, 0, Math.PI * 2);
            ctx.arc(3.5, -3, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isDark]);

  return (
    <div
      className="w-full flex flex-col items-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 上部ヘッダーナビゲーション */}
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div className="flex items-center gap-4 text-xs font-bold font-mono">
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

      {/* ゲームCanvasコンテナ (フルスクリーン時は最大化) */}
      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100 shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(94vw,calc(100vh-120px))] aspect-square my-auto'
            : 'w-full max-w-[460px] aspect-square'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block touch-none"
        />

        {/* タイトルオーバーレイ */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500 flex items-center justify-center text-3xl shadow-lg">
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-rose-500 text-4xl font-black">GAME OVER</div>
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-emerald-400 text-4xl font-black">STAGE CLEAR!</div>
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
      <div className="w-full max-w-[300px] grid grid-cols-3 gap-2 mt-3 sm:hidden">
        <div />
        <button
          onClick={() => setDirection('UP')}
          className="py-3.5 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-2xl border border-slate-700"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => setDirection('LEFT')}
          className="py-3.5 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-2xl border border-slate-700"
        >
          ◀
        </button>
        <button
          onClick={() => setDirection('DOWN')}
          className="py-3.5 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-2xl border border-slate-700"
        >
          ▼
        </button>
        <button
          onClick={() => setDirection('RIGHT')}
          className="py-3.5 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-2xl border border-slate-700"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
