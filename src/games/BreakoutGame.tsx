import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Play, RotateCcw, Heart, Sparkles } from 'lucide-react';

const HIGH_SCORE_KEY = 'breakout_high_score';

interface BreakoutGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type ItemType = 'expand' | 'multiball' | 'laser' | 'slow' | 'barrier' | 'life' | 'fireball' | 'magnet';

interface Item {
  x: number;
  y: number;
  type: ItemType;
  vy: number;
  radius: number;
}

interface BallTrail {
  x: number;
  y: number;
  alpha: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  isFireball?: boolean;
  trail: BallTrail[];
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  score: number;
  maxHp: number;
  hp: number;
  isBomb?: boolean;
  isBoss?: boolean;
}

interface Laser {
  x: number;
  y: number;
  vy: number;
}

interface Particle {
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

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 750;
const PADDLE_HEIGHT = 14;
const DEFAULT_PADDLE_WIDTH = 100;
const EXPANDED_PADDLE_WIDTH = 155;
const BALL_RADIUS = 7;
const INITIAL_BALL_SPEED = 7;
const MAX_STAGES = 5;

export const BreakoutGame: React.FC<BreakoutGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover' | 'cleared' | 'allcleared'>('title');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [stage, setStage] = useState(1);
  const [combo, setCombo] = useState(0);

  const stateRef = useRef({
    paddleX: CANVAS_WIDTH / 2 - DEFAULT_PADDLE_WIDTH / 2,
    paddleW: DEFAULT_PADDLE_WIDTH,
    paddleSpeed: 9.5,
    balls: [] as Ball[],
    bricks: [] as Brick[],
    items: [] as Item[],
    lasers: [] as Laser[],
    particles: [] as Particle[],
    floatingScores: [] as FloatingScore[],
    hasBarrier: false,
    hasLaserGun: false,
    hasMagnet: false,
    fireballTimer: 0,
    laserTimer: 0,
    expandTimer: 0,
    magnetTimer: 0,
    keys: { left: false, right: false },
    score: 0,
    lives: 3,
    stage: 1,
    combo: 0,
    isSticky: true,
  });

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

  // ステージ生成 (全5ステージ)
  const createStageBricks = (stg: number): Brick[] => {
    const bricks: Brick[] = [];
    const cols = 8;
    const padding = 6;
    const offsetTop = 75;
    const offsetLeft = 24;
    const brickWidth = (CANVAS_WIDTH - offsetLeft * 2 - (cols - 1) * padding) / cols;
    const brickHeight = 22;

    const colors = [
      { color: '#ef4444', score: 50 },
      { color: '#f97316', score: 40 },
      { color: '#eab308', score: 30 },
      { color: '#10b981', score: 20 },
      { color: '#3b82f6', score: 15 },
      { color: '#8b5cf6', score: 10 },
      { color: '#ec4899', score: 10 },
      { color: '#06b6d4', score: 10 },
    ];

    if (stg === 1) {
      // Stage 1: ピラミッド・クラシック
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetLeft + c * (brickWidth + padding);
          const y = offsetTop + r * (brickHeight + padding);
          bricks.push({
            x,
            y,
            w: brickWidth,
            h: brickHeight,
            color: colors[r % colors.length].color,
            score: colors[r % colors.length].score,
            maxHp: 1,
            hp: 1,
            isBomb: r === 2 && (c === 2 || c === 5),
          });
        }
      }
    } else if (stg === 2) {
      // Stage 2: チェッカー & 耐久ストーン
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 1 && r >= 3) continue;
          const x = offsetLeft + c * (brickWidth + padding);
          const y = offsetTop + r * (brickHeight + padding);
          const isDurable = r === 0 && c % 2 === 0;
          bricks.push({
            x,
            y,
            w: brickWidth,
            h: brickHeight,
            color: isDurable ? '#64748b' : colors[r % colors.length].color,
            score: isDurable ? 120 : colors[r % colors.length].score,
            maxHp: isDurable ? 2 : 1,
            hp: isDurable ? 2 : 1,
            isBomb: r === 1 && c === 4,
          });
        }
      }
    } else if (stg === 3) {
      // Stage 3: 要塞 (Fortress)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < cols; c++) {
          if (r % 2 === 1 && (c === 0 || c === cols - 1 || c === 3 || c === 4)) continue;
          const x = offsetLeft + c * (brickWidth + padding);
          const y = offsetTop + r * (brickHeight + padding);
          const isHard = r <= 1 && (c % 2 === 1);
          bricks.push({
            x,
            y,
            w: brickWidth,
            h: brickHeight,
            color: isHard ? '#475569' : colors[r % colors.length].color,
            score: isHard ? 180 : colors[r % colors.length].score,
            maxHp: isHard ? 3 : 1,
            hp: isHard ? 3 : 1,
            isBomb: r === 3 && (c === 1 || c === 6),
          });
        }
      }
    } else if (stg === 4) {
      // Stage 4: インベーダー形状
      const pattern = [
        [0, 1, 0, 1, 1, 0, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 0, 0, 1, 1, 1],
        [0, 1, 0, 1, 1, 0, 1, 0],
        [1, 0, 1, 0, 0, 1, 0, 1],
      ];
      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          if (pattern[r][c] === 1) {
            const x = offsetLeft + c * (brickWidth + padding);
            const y = offsetTop + r * (brickHeight + padding);
            bricks.push({
              x,
              y,
              w: brickWidth,
              h: brickHeight,
              color: colors[(r + 2) % colors.length].color,
              score: 80,
              maxHp: r === 1 ? 2 : 1,
              hp: r === 1 ? 2 : 1,
              isBomb: r === 3 && (c === 2 || c === 5),
            });
          }
        }
      }
    } else {
      // Stage 5: 最終決戦 (巨大コアボス + 護衛ブロック)
      // 中央巨大ボスブロック (幅2マス分, 耐久15)
      const bossW = brickWidth * 3 + padding * 2;
      const bossH = brickHeight * 2.5;
      bricks.push({
        x: CANVAS_WIDTH / 2 - bossW / 2,
        y: offsetTop + 20,
        w: bossW,
        h: bossH,
        color: '#dc2626',
        score: 1500,
        maxHp: 18,
        hp: 18,
        isBoss: true,
      });

      // 護衛ブロック
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < cols; c++) {
          if (r < 2 && c >= 2 && c <= 5) continue; // ボス位置は空ける
          const x = offsetLeft + c * (brickWidth + padding);
          const y = offsetTop + r * (brickHeight + padding);
          bricks.push({
            x,
            y,
            w: brickWidth,
            h: brickHeight,
            color: r === 0 ? '#475569' : colors[r % colors.length].color,
            score: 100,
            maxHp: r === 0 ? 2 : 1,
            hp: r === 0 ? 2 : 1,
            isBomb: r === 3 && (c === 0 || c === cols - 1),
          });
        }
      }
    }

    return bricks;
  };

  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3.5 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 15,
      });
    }
  };

  const addFloatingScore = (text: string, x: number, y: number, color = '#fbbf24') => {
    stateRef.current.floatingScores.push({
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
      alpha: 1,
    });
  };

  const maybeDropItem = (x: number, y: number) => {
    if (Math.random() > 0.35) return;

    const rand = Math.random();
    let type: ItemType = 'expand';
    if (rand < 0.20) type = 'expand';
    else if (rand < 0.38) type = 'multiball';
    else if (rand < 0.52) type = 'laser';
    else if (rand < 0.66) type = 'fireball';
    else if (rand < 0.78) type = 'magnet';
    else if (rand < 0.88) type = 'slow';
    else if (rand < 0.95) type = 'barrier';
    else type = 'life';

    stateRef.current.items.push({
      x,
      y,
      type,
      vy: 2.6,
      radius: 13,
    });
  };

  const initGame = (targetStage = 1, keepScore = false) => {
    const s = stateRef.current;
    s.stage = targetStage;
    if (!keepScore) {
      s.score = 0;
      s.lives = 3;
    }
    s.combo = 0;
    s.paddleW = DEFAULT_PADDLE_WIDTH;
    s.paddleX = CANVAS_WIDTH / 2 - s.paddleW / 2;
    s.hasBarrier = false;
    s.hasLaserGun = false;
    s.hasMagnet = false;
    s.fireballTimer = 0;
    s.laserTimer = 0;
    s.expandTimer = 0;
    s.magnetTimer = 0;
    s.items = [];
    s.lasers = [];
    s.particles = [];
    s.floatingScores = [];
    s.bricks = createStageBricks(targetStage);
    s.isSticky = true;

    s.balls = [
      {
        x: s.paddleX + s.paddleW / 2,
        y: CANVAS_HEIGHT - 45 - BALL_RADIUS,
        vx: 0,
        vy: -INITIAL_BALL_SPEED,
        radius: BALL_RADIUS,
        speed: INITIAL_BALL_SPEED,
        trail: [],
      },
    ];

    setScore(s.score);
    setLives(s.lives);
    setStage(s.stage);
    setCombo(0);
  };

  const launchBall = () => {
    const s = stateRef.current;
    if (s.isSticky && s.balls.length > 0) {
      s.isSticky = false;
      const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
      s.balls[0].vx = Math.sin(angle) * INITIAL_BALL_SPEED;
      s.balls[0].vy = -Math.cos(angle) * INITIAL_BALL_SPEED;
      sound.playPaddleHit();
    }
  };

  const fireLaser = () => {
    const s = stateRef.current;
    if (s.hasLaserGun) {
      sound.playLaserShot();
      s.lasers.push({
        x: s.paddleX + 12,
        y: CANVAS_HEIGHT - 45,
        vy: -12,
      });
      s.lasers.push({
        x: s.paddleX + s.paddleW - 12,
        y: CANVAS_HEIGHT - 45,
        vy: -12,
      });
    }
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
    const nextStg = stage + 1;
    if (nextStg > MAX_STAGES) {
      setGameState('allcleared');
      sound.playWin();
    } else {
      initGame(nextStg, true);
      setGameState('playing');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        stateRef.current.keys.left = true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        stateRef.current.keys.right = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          if (stateRef.current.isSticky) {
            launchBall();
          } else if (stateRef.current.hasLaserGun) {
            fireLaser();
          }
        }
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        stateRef.current.keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        stateRef.current.keys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    const targetX = clientX * scaleX - stateRef.current.paddleW / 2;
    stateRef.current.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - stateRef.current.paddleW, targetX));
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = e.touches[0].clientX - rect.left;
    const targetX = clientX * scaleX - stateRef.current.paddleW / 2;
    stateRef.current.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - stateRef.current.paddleW, targetX));
  };

  const handleCanvasClick = () => {
    if (gameState === 'playing') {
      if (stateRef.current.isSticky) {
        launchBall();
      } else if (stateRef.current.hasLaserGun) {
        fireLaser();
      }
    }
  };

  // メインゲームループ (正確な物理・衝突判定・光彩エフェクト)
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const s = stateRef.current;

      if (ctx && canvas) {
        if (gameState === 'playing') {
          // パドル移動
          if (s.keys.left) {
            s.paddleX = Math.max(0, s.paddleX - s.paddleSpeed);
          }
          if (s.keys.right) {
            s.paddleX = Math.min(CANVAS_WIDTH - s.paddleW, s.paddleX + s.paddleSpeed);
          }

          // タイマー減算
          if (s.expandTimer > 0) {
            s.expandTimer--;
            if (s.expandTimer === 0) s.paddleW = DEFAULT_PADDLE_WIDTH;
          }
          if (s.laserTimer > 0) {
            s.laserTimer--;
            if (s.laserTimer === 0) s.hasLaserGun = false;
          }
          if (s.magnetTimer > 0) {
            s.magnetTimer--;
            if (s.magnetTimer === 0) s.hasMagnet = false;
          }
          if (s.fireballTimer > 0) {
            s.fireballTimer--;
          }

          // 発射前スティッキー
          if (s.isSticky && s.balls.length > 0) {
            s.balls[0].x = s.paddleX + s.paddleW / 2;
            s.balls[0].y = CANVAS_HEIGHT - 45 - s.balls[0].radius;
          }

          // ボール更新
          if (!s.isSticky) {
            for (let i = s.balls.length - 1; i >= 0; i--) {
              const b = s.balls[i];
              b.isFireball = s.fireballTimer > 0;

              // トレイル更新
              b.trail.push({ x: b.x, y: b.y, alpha: 0.6 });
              if (b.trail.length > 6) b.trail.shift();

              // サブステップ2分割移動（高速時の貫通・抜け防止）
              const steps = 2;
              const stepVx = b.vx / steps;
              const stepVy = b.vy / steps;

              for (let step = 0; step < steps; step++) {
                b.x += stepVx;
                b.y += stepVy;

                // 左右壁反射
                if (b.x - b.radius <= 0) {
                  b.x = b.radius;
                  b.vx = Math.abs(b.vx);
                  sound.playPaddleHit();
                } else if (b.x + b.radius >= CANVAS_WIDTH) {
                  b.x = CANVAS_WIDTH - b.radius;
                  b.vx = -Math.abs(b.vx);
                  sound.playPaddleHit();
                }

                // 天井反射
                if (b.y - b.radius <= 0) {
                  b.y = b.radius;
                  b.vy = Math.abs(b.vy);
                  sound.playPaddleHit();
                }

                // 水平スタック防止 (真横ループ解消)
                if (Math.abs(b.vy) < 1.2) {
                  b.vy = b.vy >= 0 ? 1.5 : -1.5;
                }

                // パドル衝突判定
                const paddleY = CANVAS_HEIGHT - 45;
                if (
                  b.y + b.radius >= paddleY &&
                  b.y - b.radius <= paddleY + PADDLE_HEIGHT &&
                  b.x >= s.paddleX &&
                  b.x <= s.paddleX + s.paddleW &&
                  b.vy > 0
                ) {
                  sound.playPaddleHit();
                  s.combo = 0;
                  setCombo(0);

                  // マグネットアイテム発動時
                  if (s.hasMagnet) {
                    s.isSticky = true;
                    b.y = paddleY - b.radius;
                    break;
                  }

                  const hitPos = (b.x - (s.paddleX + s.paddleW / 2)) / (s.paddleW / 2);
                  const maxAngle = Math.PI / 2.7;
                  const angle = hitPos * maxAngle;

                  b.speed = Math.min(13, b.speed + 0.08);
                  b.vx = Math.sin(angle) * b.speed;
                  b.vy = -Math.cos(angle) * b.speed;
                  b.y = paddleY - b.radius;
                }

                // バリア反射
                if (s.hasBarrier && b.y + b.radius >= CANVAS_HEIGHT - 10) {
                  b.vy = -Math.abs(b.vy);
                  s.hasBarrier = false;
                  sound.playPaddleHit();
                  spawnParticles(b.x, CANVAS_HEIGHT - 10, '#3b82f6', 15);
                  addFloatingScore('BARRIER BROKEN', b.x, CANVAS_HEIGHT - 20, '#38bdf8');
                }

                // ブロックとの衝突判定
                for (let j = s.bricks.length - 1; j >= 0; j--) {
                  const br = s.bricks[j];
                  if (
                    b.x + b.radius >= br.x &&
                    b.x - b.radius <= br.x + br.w &&
                    b.y + b.radius >= br.y &&
                    b.y - b.radius <= br.y + br.h
                  ) {
                    // ファイアボールでない場合は反射
                    if (!b.isFireball) {
                      const prevX = b.x - stepVx;
                      if (prevX < br.x || prevX > br.x + br.w) {
                        b.vx = -b.vx;
                      } else {
                        b.vy = -b.vy;
                      }
                    }

                    br.hp--;
                    s.combo++;
                    setCombo(s.combo);

                    const comboMultiplier = Math.min(5, 1 + (s.combo - 1) * 0.2);
                    const earnedScore = Math.round(br.score * comboMultiplier);

                    if (br.hp <= 0) {
                      sound.playBrickBreak();
                      spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, br.isBoss ? 40 : 12);
                      maybeDropItem(br.x + br.w / 2, br.y + br.h / 2);

                      s.score += earnedScore;
                      setScore(s.score);
                      updateHighScore(s.score);

                      const comboTxt = s.combo > 1 ? `+${earnedScore} (${s.combo} COMBO!)` : `+${earnedScore}`;
                      addFloatingScore(comboTxt, br.x + br.w / 2, br.y + br.h / 2, s.combo > 2 ? '#f59e0b' : '#38bdf8');

                      // ボムブロック爆発
                      if (br.isBomb) {
                        sound.playExplosion();
                        spawnParticles(br.x + br.w / 2, br.y + br.h / 2, '#f59e0b', 30);
                        for (let k = s.bricks.length - 1; k >= 0; k--) {
                          if (k === j) continue;
                          const target = s.bricks[k];
                          const dist = Math.hypot(
                            target.x + target.w / 2 - (br.x + br.w / 2),
                            target.y + target.h / 2 - (br.y + br.h / 2)
                          );
                          if (dist < 100) {
                            s.score += target.score;
                            spawnParticles(target.x + target.w / 2, target.y + target.h / 2, target.color, 12);
                            s.bricks.splice(k, 1);
                            if (k < j) j--;
                          }
                        }
                      }

                      s.bricks.splice(j, 1);

                      // ステージクリア判定
                      if (s.bricks.length === 0) {
                        sound.playStageClear();
                        if (s.stage >= MAX_STAGES) {
                          setGameState('allcleared');
                          sound.playWin();
                        } else {
                          setGameState('cleared');
                        }
                      }
                    } else {
                      sound.playBrickHit();
                      spawnParticles(b.x, b.y, br.color, 4);
                    }
                    break;
                  }
                }
              }

              // 画面外落下
              if (b.y - b.radius > CANVAS_HEIGHT) {
                s.balls.splice(i, 1);
              }
            }

            // 全ボール落下時の残機減少
            if (s.balls.length === 0) {
              s.lives--;
              setLives(s.lives);
              s.combo = 0;
              setCombo(0);
              sound.playGameOver();

              if (s.lives <= 0) {
                setGameState('gameover');
              } else {
                s.paddleW = DEFAULT_PADDLE_WIDTH;
                s.paddleX = CANVAS_WIDTH / 2 - s.paddleW / 2;
                s.hasLaserGun = false;
                s.hasMagnet = false;
                s.fireballTimer = 0;
                s.isSticky = true;
                s.balls = [
                  {
                    x: s.paddleX + s.paddleW / 2,
                    y: CANVAS_HEIGHT - 45 - BALL_RADIUS,
                    vx: 0,
                    vy: -INITIAL_BALL_SPEED,
                    radius: BALL_RADIUS,
                    speed: INITIAL_BALL_SPEED,
                    trail: [],
                  },
                ];
              }
            }
          }

          // レーザー更新
          for (let i = s.lasers.length - 1; i >= 0; i--) {
            const l = s.lasers[i];
            l.y += l.vy;

            if (l.y < 0) {
              s.lasers.splice(i, 1);
              continue;
            }

            for (let j = s.bricks.length - 1; j >= 0; j--) {
              const br = s.bricks[j];
              if (l.x >= br.x && l.x <= br.x + br.w && l.y >= br.y && l.y <= br.y + br.h) {
                br.hp--;
                s.lasers.splice(i, 1);
                if (br.hp <= 0) {
                  sound.playBrickBreak();
                  spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 12);
                  s.score += br.score;
                  setScore(s.score);
                  updateHighScore(s.score);
                  addFloatingScore(`+${br.score}`, br.x + br.w / 2, br.y + br.h / 2);
                  s.bricks.splice(j, 1);
                  if (s.bricks.length === 0) {
                    sound.playStageClear();
                    if (s.stage >= MAX_STAGES) {
                      setGameState('allcleared');
                      sound.playWin();
                    } else {
                      setGameState('cleared');
                    }
                  }
                } else {
                  sound.playBrickHit();
                }
                break;
              }
            }
          }

          // アイテム更新
          for (let i = s.items.length - 1; i >= 0; i--) {
            const it = s.items[i];
            it.y += it.vy;

            const paddleY = CANVAS_HEIGHT - 45;
            if (
              it.y + it.radius >= paddleY &&
              it.y - it.radius <= paddleY + PADDLE_HEIGHT &&
              it.x >= s.paddleX &&
              it.x <= s.paddleX + s.paddleW
            ) {
              sound.playPowerup();
              spawnParticles(it.x, it.y, '#fbbf24', 18);

              if (it.type === 'expand') {
                s.paddleW = EXPANDED_PADDLE_WIDTH;
                s.expandTimer = 650;
                addFloatingScore('PADDLE EXPAND!', it.x, paddleY - 20, '#38bdf8');
              } else if (it.type === 'multiball') {
                if (s.balls.length > 0) {
                  const base = s.balls[0];
                  s.balls.push(
                    { ...base, vx: -base.speed * 0.7, vy: -base.speed * 0.7, trail: [] },
                    { ...base, vx: base.speed * 0.7, vy: -base.speed * 0.7, trail: [] }
                  );
                }
                addFloatingScore('MULTI BALL x3!', it.x, paddleY - 20, '#34d399');
              } else if (it.type === 'laser') {
                s.hasLaserGun = true;
                s.laserTimer = 650;
                addFloatingScore('LASER GUN!', it.x, paddleY - 20, '#f87171');
              } else if (it.type === 'fireball') {
                s.fireballTimer = 500;
                addFloatingScore('FIREBALL!', it.x, paddleY - 20, '#fb923c');
              } else if (it.type === 'magnet') {
                s.hasMagnet = true;
                s.magnetTimer = 650;
                addFloatingScore('MAGNET CATCH!', it.x, paddleY - 20, '#c084fc');
              } else if (it.type === 'slow') {
                s.balls.forEach((b) => {
                  b.speed = Math.max(5, b.speed * 0.75);
                  const angle = Math.atan2(b.vx, -b.vy);
                  b.vx = Math.sin(angle) * b.speed;
                  b.vy = -Math.cos(angle) * b.speed;
                });
                addFloatingScore('SLOW BALL', it.x, paddleY - 20, '#818cf8');
              } else if (it.type === 'barrier') {
                s.hasBarrier = true;
                addFloatingScore('BOTTOM BARRIER!', it.x, paddleY - 20, '#38bdf8');
              } else if (it.type === 'life') {
                s.lives = Math.min(5, s.lives + 1);
                setLives(s.lives);
                addFloatingScore('1UP +1 LIFE!', it.x, paddleY - 20, '#f472b6');
              }

              s.items.splice(i, 1);
              continue;
            }

            if (it.y - it.radius > CANVAS_HEIGHT) {
              s.items.splice(i, 1);
            }
          }

          // パーティクル更新
          for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.alpha = 1 - p.life / p.maxLife;
            if (p.life >= p.maxLife) {
              s.particles.splice(i, 1);
            }
          }

          // 浮遊スコア更新
          for (let i = s.floatingScores.length - 1; i >= 0; i--) {
            const f = s.floatingScores[i];
            f.y -= 1.2;
            f.alpha -= 0.025;
            if (f.alpha <= 0) {
              s.floatingScores.splice(i, 1);
            }
          }
        }

        // --- 描画処理 (クリーン・フラットモダン) ---
        ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 背景グリッドライン
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CANVAS_WIDTH; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }

        // 最下部バリア
        if (s.hasBarrier) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(0, CANVAS_HEIGHT - 6);
          ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 6);
          ctx.stroke();
        }

        // ブロック描画
        s.bricks.forEach((br) => {
          ctx.fillStyle = br.color;
          const radius = br.isBoss ? 8 : 4;
          ctx.beginPath();
          ctx.roundRect(br.x, br.y, br.w, br.h, radius);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);

          if (br.isBoss) {
            // ボスHPバー
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`👑 BOSS CORE [HP: ${br.hp}/${br.maxHp}]`, br.x + br.w / 2, br.y + br.h / 2);
          } else if (br.maxHp > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${br.hp}`, br.x + br.w / 2, br.y + br.h / 2);
          } else if (br.isBomb) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', br.x + br.w / 2, br.y + br.h / 2);
          }
        });

        // パドル描画
        const paddleY = CANVAS_HEIGHT - 45;
        ctx.fillStyle = s.hasLaserGun
          ? '#ef4444'
          : s.hasMagnet
          ? '#a855f7'
          : isDark
          ? '#38bdf8'
          : '#0284c7';
        ctx.beginPath();
        ctx.roundRect(s.paddleX, paddleY, s.paddleW, PADDLE_HEIGHT, 7);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(s.paddleX + 6, paddleY + 3, s.paddleW - 12, 3, 2);
        ctx.fill();

        if (s.hasLaserGun) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(s.paddleX + 8, paddleY - 5, 6, 6);
          ctx.fillRect(s.paddleX + s.paddleW - 14, paddleY - 5, 6, 6);
        }

        // ボール & トレイル描画
        s.balls.forEach((b) => {
          // 残像トレイル
          b.trail.forEach((t, tIdx) => {
            const ratio = (tIdx + 1) / b.trail.length;
            ctx.fillStyle = b.isFireball
              ? `rgba(249, 115, 22, ${t.alpha * ratio * 0.6})`
              : isDark
              ? `rgba(255, 255, 255, ${t.alpha * ratio * 0.4})`
              : `rgba(15, 23, 42, ${t.alpha * ratio * 0.4})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, b.radius * ratio, 0, Math.PI * 2);
            ctx.fill();
          });

          // ボール本体
          ctx.fillStyle = b.isFireball ? '#f97316' : isDark ? '#ffffff' : '#0f172a';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();

          if (b.isFireball) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // レーザー描画
        s.lasers.forEach((l) => {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(l.x - 2.5, l.y, 5, 14);
        });

        // ドロップアイテム描画
        s.items.forEach((it) => {
          ctx.save();
          ctx.translate(it.x, it.y);

          let badgeColor = '#3b82f6';
          let label = 'E';
          if (it.type === 'expand') {
            badgeColor = '#3b82f6';
            label = '⇔';
          } else if (it.type === 'multiball') {
            badgeColor = '#10b981';
            label = 'x3';
          } else if (it.type === 'laser') {
            badgeColor = '#ef4444';
            label = '⚡';
          } else if (it.type === 'fireball') {
            badgeColor = '#f97316';
            label = '🔥';
          } else if (it.type === 'magnet') {
            badgeColor = '#a855f7';
            label = '🧲';
          } else if (it.type === 'slow') {
            badgeColor = '#8b5cf6';
            label = '▼';
          } else if (it.type === 'barrier') {
            badgeColor = '#06b6d4';
            label = '🛡️';
          } else if (it.type === 'life') {
            badgeColor = '#ec4899';
            label = '❤️';
          }

          ctx.fillStyle = badgeColor;
          ctx.beginPath();
          ctx.arc(0, 0, it.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 0, 1);

          ctx.restore();
        });

        // パーティクル描画
        s.particles.forEach((p) => {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.restore();
        });

        // 浮遊スコアテキスト描画
        s.floatingScores.forEach((f) => {
          ctx.save();
          ctx.globalAlpha = f.alpha;
          ctx.fillStyle = f.color;
          ctx.font = 'bold 13px font-mono, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y);
          ctx.restore();
        });

        // スティッキースタートガイド
        if (s.isSticky && gameState === 'playing') {
          ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SPACE / クリック でボールを発射', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isDark]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 上部ヘッダーバー (枠幅完全統一) */}
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'w-[min(96vw,calc((100vh-100px)*600/750))]' : 'w-full max-w-[480px]'
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

        <div className="flex items-center gap-3 text-xs font-bold font-mono">
          <div className="flex items-center gap-1 text-rose-500">
            <Heart className="w-4 h-4 fill-rose-500" />
            <span>×{lives}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>STAGE</span>
            <span className="text-indigo-500 font-black">{stage}/{MAX_STAGES}</span>
          </div>

          {combo > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-black animate-pulse">
              {combo} COMBO!
            </div>
          )}

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
            ? 'w-[min(96vw,calc((100vh-100px)*600/750))] aspect-[4/5] my-auto'
            : 'w-full max-w-[480px] aspect-[4/5]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          onTouchMove={handleCanvasTouchMove}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-none touch-none"
        />

        {/* タイトルオーバーレイ */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg">
              <Sparkles className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">ブロック崩し</h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">BLOCK BREAKER PRO</p>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
              全5ステージ & ボス戦！ファイアボール・レーザー・マグネットを駆使してブロックを粉砕せよ！
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

        {/* 一時停止オーバーレイ */}
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
            <div className="text-xs text-slate-300 font-mono space-y-1">
              <div>STAGE: <span className="font-bold text-white text-base">{stage}/{MAX_STAGES}</span></div>
              <div>FINAL SCORE: <span className="font-bold text-white text-lg">{score}</span></div>
              <div>HIGH SCORE: <span className="font-bold text-amber-400">{highScore}</span></div>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              もう一度プレイ
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
              STAGE {stage + 1} へ進む
            </button>
          </div>
        )}

        {/* 全ステージ完全制覇オーバーレイ */}
        {gameState === 'allcleared' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-amber-400 text-4xl font-black">ALL STAGES CLEARED!!</div>
            <p className="text-sm text-slate-300 font-mono text-center max-w-xs">
              おめでとうございます！全5ステージを完全制覇しました！<br />
              最終スコア: <span className="font-bold text-amber-300 text-lg">{score}</span>
            </p>
            <button
              onClick={handleRestart}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              最初からプレイ
            </button>
          </div>
        )}
      </div>

      {/* スマホ操作ボタン */}
      <div className="w-full max-w-[480px] flex sm:hidden items-center justify-between gap-3 mt-3 px-2">
        <button
          onTouchStart={() => (stateRef.current.keys.left = true)}
          onTouchEnd={() => (stateRef.current.keys.left = false)}
          onMouseDown={() => (stateRef.current.keys.left = true)}
          onMouseUp={() => (stateRef.current.keys.left = false)}
          className="flex-1 py-3.5 bg-slate-800/90 active:bg-indigo-600 text-white text-sm font-bold rounded-2xl border border-slate-700 flex items-center justify-center touch-none select-none"
        >
          ◀ 左へ
        </button>
        <button
          onClick={handleCanvasClick}
          className="px-5 py-3.5 bg-indigo-600 active:bg-indigo-500 text-white text-sm font-bold rounded-2xl flex items-center justify-center touch-none select-none"
        >
          🚀 発射
        </button>
        <button
          onTouchStart={() => (stateRef.current.keys.right = true)}
          onTouchEnd={() => (stateRef.current.keys.right = false)}
          onMouseDown={() => (stateRef.current.keys.right = true)}
          onMouseUp={() => (stateRef.current.keys.right = false)}
          className="flex-1 py-3.5 bg-slate-800/90 active:bg-indigo-600 text-white text-sm font-bold rounded-2xl border border-slate-700 flex items-center justify-center touch-none select-none"
        >
          右へ ▶
        </button>
      </div>
    </div>
  );
};
