import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, Play, RotateCcw, Heart, Sparkles } from 'lucide-react';

const HIGH_SCORE_KEY = 'breakout_high_score';

interface BreakoutGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type ItemType = 'expand' | 'multiball' | 'laser' | 'slow' | 'barrier' | 'life';

interface Item {
  x: number;
  y: number;
  type: ItemType;
  vy: number;
  radius: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
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

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 750;
const PADDLE_HEIGHT = 14;
const DEFAULT_PADDLE_WIDTH = 100;
const EXPANDED_PADDLE_WIDTH = 150;
const BALL_RADIUS = 7;
const INITIAL_BALL_SPEED = 7;

export const BreakoutGame: React.FC<BreakoutGameProps> = ({
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

  const stateRef = useRef({
    paddleX: CANVAS_WIDTH / 2 - DEFAULT_PADDLE_WIDTH / 2,
    paddleW: DEFAULT_PADDLE_WIDTH,
    paddleSpeed: 9,
    balls: [] as Ball[],
    bricks: [] as Brick[],
    items: [] as Item[],
    lasers: [] as Laser[],
    particles: [] as Particle[],
    hasBarrier: false,
    hasLaserGun: false,
    laserTimer: 0,
    expandTimer: 0,
    keys: { left: false, right: false, fire: false },
    score: 0,
    lives: 3,
    stage: 1,
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

  const createStageBricks = (stg: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = 5 + Math.min(stg - 1, 3);
    const cols = 8;
    const padding = 6;
    const offsetTop = 80;
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

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (stg === 2 && (r + c) % 2 === 1 && r > 2) continue;
        if (stg === 3 && r % 2 === 1 && (c === 0 || c === cols - 1 || c === 3 || c === 4)) continue;

        const x = offsetLeft + c * (brickWidth + padding);
        const y = offsetTop + r * (brickHeight + padding);
        const cInfo = colors[r % colors.length];

        const isDurable = stg >= 2 && r === 0 && (c % 2 === 0);
        const isBomb = (r === 2 && (c === 2 || c === 5));

        bricks.push({
          x,
          y,
          w: brickWidth,
          h: brickHeight,
          color: isDurable ? '#64748b' : isBomb ? '#f59e0b' : cInfo.color,
          score: isDurable ? 100 : cInfo.score,
          maxHp: isDurable ? 2 : 1,
          hp: isDurable ? 2 : 1,
          isBomb,
        });
      }
    }
    return bricks;
  };

  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  const maybeDropItem = (x: number, y: number) => {
    if (Math.random() > 0.28) return;

    const rand = Math.random();
    let type: ItemType = 'expand';
    if (rand < 0.25) type = 'expand';
    else if (rand < 0.5) type = 'multiball';
    else if (rand < 0.7) type = 'laser';
    else if (rand < 0.85) type = 'slow';
    else if (rand < 0.95) type = 'barrier';
    else type = 'life';

    stateRef.current.items.push({
      x,
      y,
      type,
      vy: 2.5,
      radius: 12,
    });
  };

  const initGame = (targetStage = 1, keepScore = false) => {
    const s = stateRef.current;
    s.stage = targetStage;
    if (!keepScore) {
      s.score = 0;
      s.lives = 3;
    }
    s.paddleW = DEFAULT_PADDLE_WIDTH;
    s.paddleX = CANVAS_WIDTH / 2 - s.paddleW / 2;
    s.hasBarrier = false;
    s.hasLaserGun = false;
    s.laserTimer = 0;
    s.expandTimer = 0;
    s.items = [];
    s.lasers = [];
    s.particles = [];
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
      },
    ];

    setScore(s.score);
    setLives(s.lives);
    setStage(s.stage);
  };

  const launchBall = () => {
    const s = stateRef.current;
    if (s.isSticky && s.balls.length > 0) {
      s.isSticky = false;
      const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
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
        vy: -11,
      });
      s.lasers.push({
        x: s.paddleX + s.paddleW - 12,
        y: CANVAS_HEIGHT - 45,
        vy: -11,
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
    initGame(nextStg, true);
    setGameState('playing');
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

  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const s = stateRef.current;

      if (ctx && canvas) {
        if (gameState === 'playing') {
          if (s.keys.left) {
            s.paddleX = Math.max(0, s.paddleX - s.paddleSpeed);
          }
          if (s.keys.right) {
            s.paddleX = Math.min(CANVAS_WIDTH - s.paddleW, s.paddleX + s.paddleSpeed);
          }

          if (s.expandTimer > 0) {
            s.expandTimer--;
            if (s.expandTimer === 0) {
              s.paddleW = DEFAULT_PADDLE_WIDTH;
            }
          }
          if (s.laserTimer > 0) {
            s.laserTimer--;
            if (s.laserTimer === 0) {
              s.hasLaserGun = false;
            }
          }

          if (s.isSticky && s.balls.length > 0) {
            s.balls[0].x = s.paddleX + s.paddleW / 2;
            s.balls[0].y = CANVAS_HEIGHT - 45 - s.balls[0].radius;
          }

          if (!s.isSticky) {
            for (let i = s.balls.length - 1; i >= 0; i--) {
              const b = s.balls[i];
              b.x += b.vx;
              b.y += b.vy;

              if (b.x - b.radius <= 0) {
                b.x = b.radius;
                b.vx = Math.abs(b.vx);
                sound.playPaddleHit();
              } else if (b.x + b.radius >= CANVAS_WIDTH) {
                b.x = CANVAS_WIDTH - b.radius;
                b.vx = -Math.abs(b.vx);
                sound.playPaddleHit();
              }

              if (b.y - b.radius <= 0) {
                b.y = b.radius;
                b.vy = Math.abs(b.vy);
                sound.playPaddleHit();
              }

              const paddleY = CANVAS_HEIGHT - 45;
              if (
                b.y + b.radius >= paddleY &&
                b.y - b.radius <= paddleY + PADDLE_HEIGHT &&
                b.x >= s.paddleX &&
                b.x <= s.paddleX + s.paddleW &&
                b.vy > 0
              ) {
                sound.playPaddleHit();
                const hitPos = (b.x - (s.paddleX + s.paddleW / 2)) / (s.paddleW / 2);
                const maxAngle = Math.PI / 3;
                const angle = hitPos * maxAngle;

                b.speed = Math.min(13, b.speed + 0.08);
                b.vx = Math.sin(angle) * b.speed;
                b.vy = -Math.cos(angle) * b.speed;
                b.y = paddleY - b.radius;
              }

              if (s.hasBarrier && b.y + b.radius >= CANVAS_HEIGHT - 10) {
                b.vy = -Math.abs(b.vy);
                s.hasBarrier = false;
                sound.playPaddleHit();
                spawnParticles(b.x, CANVAS_HEIGHT - 10, '#3b82f6', 15);
              }

              for (let j = s.bricks.length - 1; j >= 0; j--) {
                const br = s.bricks[j];
                if (
                  b.x + b.radius >= br.x &&
                  b.x - b.radius <= br.x + br.w &&
                  b.y + b.radius >= br.y &&
                  b.y - b.radius <= br.y + br.h
                ) {
                  const prevX = b.x - b.vx;
                  if (prevX < br.x || prevX > br.x + br.w) {
                    b.vx = -b.vx;
                  } else {
                    b.vy = -b.vy;
                  }

                  br.hp--;
                  if (br.hp <= 0) {
                    sound.playBrickBreak();
                    spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 12);
                    maybeDropItem(br.x + br.w / 2, br.y + br.h / 2);

                    s.score += br.score;
                    setScore(s.score);
                    updateHighScore(s.score);

                    if (br.isBomb) {
                      sound.playExplosion();
                      spawnParticles(br.x + br.w / 2, br.y + br.h / 2, '#f59e0b', 25);
                      for (let k = s.bricks.length - 1; k >= 0; k--) {
                        if (k === j) continue;
                        const target = s.bricks[k];
                        const dist = Math.hypot(
                          target.x + target.w / 2 - (br.x + br.w / 2),
                          target.y + target.h / 2 - (br.y + br.h / 2)
                        );
                        if (dist < 90) {
                          s.score += target.score;
                          spawnParticles(target.x + target.w / 2, target.y + target.h / 2, target.color, 10);
                          s.bricks.splice(k, 1);
                          if (k < j) j--;
                        }
                      }
                    }

                    s.bricks.splice(j, 1);

                    if (s.bricks.length === 0) {
                      sound.playStageClear();
                      setGameState('cleared');
                    }
                  } else {
                    sound.playBrickHit();
                  }
                  break;
                }
              }

              if (b.y - b.radius > CANVAS_HEIGHT) {
                s.balls.splice(i, 1);
              }
            }

            if (s.balls.length === 0) {
              s.lives--;
              setLives(s.lives);
              sound.playGameOver();

              if (s.lives <= 0) {
                setGameState('gameover');
              } else {
                s.paddleW = DEFAULT_PADDLE_WIDTH;
                s.paddleX = CANVAS_WIDTH / 2 - s.paddleW / 2;
                s.hasLaserGun = false;
                s.isSticky = true;
                s.balls = [
                  {
                    x: s.paddleX + s.paddleW / 2,
                    y: CANVAS_HEIGHT - 45 - BALL_RADIUS,
                    vx: 0,
                    vy: -INITIAL_BALL_SPEED,
                    radius: BALL_RADIUS,
                    speed: INITIAL_BALL_SPEED,
                  },
                ];
              }
            }
          }

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
                  spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 10);
                  s.score += br.score;
                  setScore(s.score);
                  updateHighScore(s.score);
                  s.bricks.splice(j, 1);
                  if (s.bricks.length === 0) {
                    sound.playStageClear();
                    setGameState('cleared');
                  }
                } else {
                  sound.playBrickHit();
                }
                break;
              }
            }
          }

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
              spawnParticles(it.x, it.y, '#fbbf24', 15);

              if (it.type === 'expand') {
                s.paddleW = EXPANDED_PADDLE_WIDTH;
                s.expandTimer = 600;
              } else if (it.type === 'multiball') {
                if (s.balls.length > 0) {
                  const base = s.balls[0];
                  s.balls.push(
                    { ...base, vx: -base.speed * 0.7, vy: -base.speed * 0.7 },
                    { ...base, vx: base.speed * 0.7, vy: -base.speed * 0.7 }
                  );
                }
              } else if (it.type === 'laser') {
                s.hasLaserGun = true;
                s.laserTimer = 600;
              } else if (it.type === 'slow') {
                s.balls.forEach((b) => {
                  b.speed = Math.max(5, b.speed * 0.75);
                  const angle = Math.atan2(b.vx, -b.vy);
                  b.vx = Math.sin(angle) * b.speed;
                  b.vy = -Math.cos(angle) * b.speed;
                });
              } else if (it.type === 'barrier') {
                s.hasBarrier = true;
              } else if (it.type === 'life') {
                s.lives = Math.min(5, s.lives + 1);
                setLives(s.lives);
              }

              s.items.splice(i, 1);
              continue;
            }

            if (it.y - it.radius > CANVAS_HEIGHT) {
              s.items.splice(i, 1);
            }
          }

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
        }

        ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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

        if (s.hasBarrier) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, CANVAS_HEIGHT - 6);
          ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 6);
          ctx.stroke();
        }

        s.bricks.forEach((br) => {
          ctx.fillStyle = br.color;
          const radius = 4;
          ctx.beginPath();
          ctx.roundRect(br.x, br.y, br.w, br.h, radius);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);

          if (br.maxHp > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${br.hp}`, br.x + br.w / 2, br.y + br.h / 2);
          } else if (br.isBomb) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', br.x + br.w / 2, br.y + br.h / 2);
          }
        });

        const paddleY = CANVAS_HEIGHT - 45;
        ctx.fillStyle = s.hasLaserGun ? '#ef4444' : isDark ? '#38bdf8' : '#0284c7';
        ctx.beginPath();
        ctx.roundRect(s.paddleX, paddleY, s.paddleW, PADDLE_HEIGHT, 7);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(s.paddleX + 6, paddleY + 3, s.paddleW - 12, 3, 2);
        ctx.fill();

        if (s.hasLaserGun) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(s.paddleX + 8, paddleY - 4, 6, 5);
          ctx.fillRect(s.paddleX + s.paddleW - 14, paddleY - 4, 6, 5);
        }

        s.balls.forEach((b) => {
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        s.lasers.forEach((l) => {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(l.x - 2, l.y, 4, 12);
        });

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

        s.particles.forEach((p) => {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.restore();
        });

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
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'w-[min(96vw,calc((100vh-110px)*600/750))]' : 'w-full max-w-[480px]'
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
          <div className="flex items-center gap-1 text-rose-500">
            <Heart className="w-4 h-4 fill-rose-500" />
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

      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-300 bg-slate-100 shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(96vw,calc((100vh-110px)*600/750))] aspect-[4/5] my-auto'
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

        {gameState === 'title' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-5 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg">
              <Sparkles className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">ブロック崩し</h2>
              <p className="text-xs text-slate-300 mt-1 font-mono">BLOCK BREAKER CLASSIC</p>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
              パドルでボールを打ち返し、全てのブロックを壊そう！アイテムでパワーアップ！
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

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-rose-500 text-4xl font-black">GAME OVER</div>
            <div className="text-sm text-slate-300 font-mono space-y-1">
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
