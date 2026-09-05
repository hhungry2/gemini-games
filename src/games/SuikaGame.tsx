import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { FRUITS, getRandomDropLevel } from './suika/fruitData';
import { Particle, FloatingText, FruitBodyData, SuikaGameProps } from './suika/types';
import { suikaAudio } from './suika/SuikaAudio';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'suika_high_score';
const WATERMELONS_KEY = 'suika_watermelons_count';

// 仮想キャンバスサイズ
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 680;
const DEADLINE_Y = 135;
const DROP_Y = 70;
const WALL_THICKNESS = 40;
const BOX_LEFT = 20;
const BOX_RIGHT = CANVAS_WIDTH - 20;
const BOX_BOTTOM = CANVAS_HEIGHT - 15;

export const SuikaGame: React.FC<SuikaGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  // Matter.js 関連 Ref
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const fruitBodiesRef = useRef<Map<number, { body: Matter.Body; data: FruitBodyData }>>(new Map());
  const bodyIdCounter = useRef<number>(1);

  // ゲームステート
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [watermelonsCreated, setWatermelonsCreated] = useState<number>(0);
  const [shakesLeft, setShakesLeft] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState<boolean>(false);
  const [maxFruitLevel, setMaxFruitLevel] = useState<number>(0);

  // ドロップ関連
  const [currentFruitLevel, setCurrentFruitLevel] = useState<number>(() => getRandomDropLevel());
  const [nextFruitLevel, setNextFruitLevel] = useState<number>(() => getRandomDropLevel());
  const [nextFruitLevel2, setNextFruitLevel2] = useState<number>(() => getRandomDropLevel());
  const [dropperX, setDropperX] = useState<number>(CANVAS_WIDTH / 2);
  const [canDrop, setCanDrop] = useState<boolean>(true);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  // レンダリング・演出関連 Ref
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const dangerTimerRef = useRef<number | null>(null);
  const shakeOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shakeTimeRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const lastMergeTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // ハイスコア読み込み
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
      if (savedScore) setHighScore(parseInt(savedScore, 10));
      const savedMelons = localStorage.getItem(WATERMELONS_KEY);
      if (savedMelons) setWatermelonsCreated(parseInt(savedMelons, 10));
    } catch {
      // ignore
    }
  }, []);

  // ハイスコア更新保存
  const checkAndUpdateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        } catch {
          // ignore
        }
        return newScore;
      }
      return prev;
    });
  }, []);

  // パーティクル生成
  const spawnMergeParticles = (x: number, y: number, color: string, isBig: boolean = false) => {
    const count = isBig ? 35 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = (Math.random() * 4 + 2) * (isBig ? 1.8 : 1);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBig ? 3 : 1),
        radius: Math.random() * (isBig ? 7 : 4) + 2,
        color: isBig ? (Math.random() > 0.5 ? '#facc15' : color) : color,
        alpha: 1,
        life: 0,
        maxLife: isBig ? 45 : 28,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        type: Math.random() > 0.4 ? 'star' : 'sparkle',
      });
    }
  };

  // 浮遊テキスト追加
  const addFloatingText = (x: number, y: number, text: string, color: string = '#facc15') => {
    floatingTextsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 0,
      scale: 1.2,
    });
  };

  // 新しいフルーツ剛体の作成
  const createFruitBody = useCallback((x: number, y: number, level: number, isNewDrop: boolean = false) => {
    if (!engineRef.current) return null;
    const def = FRUITS[level];
    const id = bodyIdCounter.current++;

    const body = Matter.Bodies.circle(x, y, def.radius, {
      restitution: def.restitution,
      friction: def.friction,
      density: def.density,
      label: 'fruit',
      collisionFilter: {
        category: 0x0002,
        mask: 0x0001 | 0x0002, // 壁(0x0001)および他のフルーツ(0x0002)と衝突
      },
    });

    const data: FruitBodyData = {
      id,
      level,
      createdAt: Date.now(),
      isMerged: false,
      blinkTimer: Math.random() * 180 + 60,
      isBlinking: false,
      isHappy: !isNewDrop,
      happyTimer: isNewDrop ? 0 : 40,
      isScared: false,
    };

    (body as unknown as { fruitData: FruitBodyData }).fruitData = data;
    fruitBodiesRef.current.set(id, { body, data });
    Matter.Composite.add(engineRef.current.world, body);

    setMaxFruitLevel((prev) => Math.max(prev, level));
    return { body, data };
  }, []);

  // 物理エンジンとワールドの初期化
  useEffect(() => {
    // Engine作成
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
    });
    engineRef.current = engine;

    // Runner作成
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // 静的壁の作成（左、右、底）
    const leftWall = Matter.Bodies.rectangle(
      BOX_LEFT - WALL_THICKNESS / 2,
      CANVAS_HEIGHT / 2 + 50,
      WALL_THICKNESS,
      CANVAS_HEIGHT,
      {
        isStatic: true,
        label: 'wall',
        friction: 0.2,
        collisionFilter: { category: 0x0001 },
      }
    );

    const rightWall = Matter.Bodies.rectangle(
      BOX_RIGHT + WALL_THICKNESS / 2,
      CANVAS_HEIGHT / 2 + 50,
      WALL_THICKNESS,
      CANVAS_HEIGHT,
      {
        isStatic: true,
        label: 'wall',
        friction: 0.2,
        collisionFilter: { category: 0x0001 },
      }
    );

    const bottomWall = Matter.Bodies.rectangle(
      CANVAS_WIDTH / 2,
      BOX_BOTTOM + WALL_THICKNESS / 2,
      CANVAS_WIDTH + 100,
      WALL_THICKNESS,
      {
        isStatic: true,
        label: 'wall',
        friction: 0.5,
        collisionFilter: { category: 0x0001 },
      }
    );

    Matter.Composite.add(engine.world, [leftWall, rightWall, bottomWall]);

    // 衝突イベント（合体ロジック）
    Matter.Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      const now = Date.now();

      for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];
        const dataA = (bodyA as unknown as { fruitData?: FruitBodyData }).fruitData;
        const dataB = (bodyB as unknown as { fruitData?: FruitBodyData }).fruitData;

        // フルーツと壁、またはフルーツ同士の接触音
        if (dataA && !dataB) {
          suikaAudio.playImpact(dataA.level);
        } else if (!dataA && dataB) {
          suikaAudio.playImpact(dataB.level);
        }

        // 両方フルーツであり、未合体かつ同じレベルの場合
        if (dataA && dataB && !dataA.isMerged && !dataB.isMerged && dataA.level === dataB.level) {
          dataA.isMerged = true;
          dataB.isMerged = true;

          const level = dataA.level;
          const midX = (bodyA.position.x + bodyB.position.x) / 2;
          const midY = (bodyA.position.y + bodyB.position.y) / 2;

          // コンボ判定 (1.2秒以内の連続合体でコンボ加算)
          if (now - lastMergeTimeRef.current < 1200) {
            comboRef.current++;
          } else {
            comboRef.current = 1;
          }
          lastMergeTimeRef.current = now;

          // ワールドから古いフルーツを削除
          fruitBodiesRef.current.delete(dataA.id);
          fruitBodiesRef.current.delete(dataB.id);
          Matter.Composite.remove(engine.world, [bodyA, bodyB]);

          // スイカ同士の合体（レベル10）の場合：消滅＋メガボーナス！
          if (level === 10) {
            const bonus = 4096 * comboRef.current;
            setScore((s) => {
              const newScore = s + bonus;
              checkAndUpdateHighScore(newScore);
              return newScore;
            });
            setWatermelonsCreated((w) => {
              const nextCount = w + 1;
              try {
                localStorage.setItem(WATERMELONS_KEY, nextCount.toString());
              } catch {
                // ignore
              }
              return nextCount;
            });
            spawnMergeParticles(midX, midY, '#ef4444', true);
            addFloatingText(midX, midY - 20, `MEGA BONUS! +${bonus}`, '#f43f5e');
            suikaAudio.playDoubleWatermelon();
          } else {
            // 次のレベルのフルーツを生成
            const nextLevel = level + 1;
            const defNext = FRUITS[nextLevel];
            const addedScore = defNext.score * comboRef.current;

            setScore((s) => {
              const newScore = s + addedScore;
              checkAndUpdateHighScore(newScore);
              return newScore;
            });

            // 新フルーツ生成
            const newFruit = createFruitBody(midX, midY, nextLevel);
            if (newFruit) {
              // わずかな弾けインパルス（飛び跳ねる演出）
              Matter.Body.setVelocity(newFruit.body, {
                x: (Math.random() - 0.5) * 2,
                y: -3,
              });
            }

            // エフェクト＆サウンド
            spawnMergeParticles(midX, midY, defNext.color, nextLevel >= 8);
            addFloatingText(
              midX,
              midY - 15,
              comboRef.current > 1 ? `+${addedScore} (${comboRef.current}x Combo!)` : `+${addedScore}`,
              defNext.color
            );

            if (nextLevel === 10) {
              // スイカ初完成！
              setWatermelonsCreated((w) => {
                const nextCount = w + 1;
                try {
                  localStorage.setItem(WATERMELONS_KEY, nextCount.toString());
                } catch {
                  // ignore
                }
                return nextCount;
              });
              suikaAudio.playWatermelonFanfare();
            } else {
              suikaAudio.playMerge(nextLevel, comboRef.current);
            }
          }
        }
      }
    });

    return () => {
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, [createFruitBody, checkAndUpdateHighScore]);

  // BGMの自動再生開始
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!isMuted) {
        suikaAudio.startBgm();
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      suikaAudio.stopBgm();
    };
  }, [isMuted]);

  // フルーツ投下処理
  const handleDrop = useCallback(() => {
    if (!canDrop || isGameOver || !engineRef.current) return;

    const currentDef = FRUITS[currentFruitLevel];
    // 左右の壁の内側に収まるようクランプ
    const minX = BOX_LEFT + currentDef.radius + 5;
    const maxX = BOX_RIGHT - currentDef.radius - 5;
    const dropX = Math.max(minX, Math.min(maxX, dropperX));

    // フルーツを投下位置に生成
    const created = createFruitBody(dropX, DROP_Y, currentFruitLevel, true);
    if (created) {
      suikaAudio.playDrop();
      setCanDrop(false);

      // NEXTフルーツのシフト
      setCurrentFruitLevel(nextFruitLevel);
      setNextFruitLevel(nextFruitLevel2);
      setNextFruitLevel2(getRandomDropLevel());

      // 装填クールダウン
      setTimeout(() => {
        setCanDrop(true);
      }, 550);
    }
  }, [canDrop, isGameOver, currentFruitLevel, dropperX, createFruitBody, nextFruitLevel, nextFruitLevel2]);

  // フルーツシェイク機能（ルール3：便利アシスト）
  const handleShake = useCallback(() => {
    if (shakesLeft <= 0 || isGameOver || !engineRef.current) return;

    setShakesLeft((prev) => prev - 1);
    suikaAudio.playShake();
    shakeTimeRef.current = 24; // 24フレーム間シェイク

    // すべてのフルーツにランダムな微小速度インパルス
    fruitBodiesRef.current.forEach(({ body }) => {
      Matter.Body.setVelocity(body, {
        x: body.velocity.x + (Math.random() - 0.5) * 7,
        y: body.velocity.y - Math.random() * 5 - 2,
      });
    });

    addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'SHAKE!!', '#38bdf8');
  }, [shakesLeft, isGameOver]);

  // マウス＆タッチ移動ハンドラー
  const handlePointerMove = useCallback((clientX: number) => {
    if (!canvasRef.current || !canDrop || isGameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_WIDTH;
    const relativeX = (clientX - rect.left) / scale;

    const currentDef = FRUITS[currentFruitLevel];
    const minX = BOX_LEFT + currentDef.radius + 5;
    const maxX = BOX_RIGHT - currentDef.radius - 5;
    setDropperX(Math.max(minX, Math.min(maxX, relativeX)));
  }, [canDrop, isGameOver, currentFruitLevel]);

  // キーボード操作ハンドラー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      const step = 20;
      const currentDef = FRUITS[currentFruitLevel];
      const minX = BOX_LEFT + currentDef.radius + 5;
      const maxX = BOX_RIGHT - currentDef.radius - 5;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setDropperX((prev) => Math.max(minX, prev - step));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setDropperX((prev) => Math.min(maxX, prev + step));
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        handleDrop();
      } else if (e.key === 's' || e.key === 'S') {
        handleShake();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, currentFruitLevel, handleDrop, handleShake]);

  // リスタート処理
  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;

    // すべてのフルーツ剛体をクリア
    fruitBodiesRef.current.forEach(({ body }) => {
      Matter.Composite.remove(engineRef.current!.world, body);
    });
    fruitBodiesRef.current.clear();
    particlesRef.current = [];
    floatingTextsRef.current = [];

    setScore(0);
    setShakesLeft(3);
    setIsGameOver(false);
    setIsWarning(false);
    setCanDrop(true);
    setCurrentFruitLevel(getRandomDropLevel());
    setNextFruitLevel(getRandomDropLevel());
    setNextFruitLevel2(getRandomDropLevel());
    setDropperX(CANVAS_WIDTH / 2);
    setMaxFruitLevel(0);

    if (dangerTimerRef.current) {
      clearTimeout(dangerTimerRef.current);
      dangerTimerRef.current = null;
    }
  }, []);

  // メイン Canvas レンダリングループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let warningCountdown = 0;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // シェイク演出の適用
      if (shakeTimeRef.current > 0) {
        shakeTimeRef.current--;
        const intensity = shakeTimeRef.current * 0.4;
        shakeOffsetRef.current = {
          x: (Math.random() - 0.5) * intensity * 2,
          y: (Math.random() - 0.5) * intensity * 2,
        };
      } else {
        shakeOffsetRef.current = { x: 0, y: 0 };
      }

      ctx.save();
      ctx.translate(shakeOffsetRef.current.x, shakeOffsetRef.current.y);

      // 1. ボックス背景の描画
      ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
      ctx.fillRect(BOX_LEFT, DEADLINE_Y - 20, BOX_RIGHT - BOX_LEFT, BOX_BOTTOM - (DEADLINE_Y - 20));

      // ボックスの内側グリッド・微かな光彩
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
      ctx.lineWidth = 1;
      for (let y = DEADLINE_Y; y < BOX_BOTTOM; y += 40) {
        ctx.beginPath();
        ctx.moveTo(BOX_LEFT, y);
        ctx.lineTo(BOX_RIGHT, y);
        ctx.stroke();
      }

      // 2. デッドライン（警告境界線）の描画
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2.5;
      if (isWarning) {
        ctx.strokeStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.5)' : 'rgba(244, 63, 94, 0.4)';
      }
      ctx.beginPath();
      ctx.moveTo(BOX_LEFT, DEADLINE_Y);
      ctx.lineTo(BOX_RIGHT, DEADLINE_Y);
      ctx.stroke();
      ctx.restore();

      // デッドライン警告テキスト
      if (isWarning) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('⚠️ DANGER!', BOX_RIGHT - 10, DEADLINE_Y - 8);
      }

      // 3. ボックスの壁（左右・底）の描画
      ctx.fillStyle = isDark ? '#334155' : '#cbd5e1';
      // 左壁
      ctx.fillRect(BOX_LEFT - 10, DEADLINE_Y - 20, 10, BOX_BOTTOM - DEADLINE_Y + 30);
      // 右壁
      ctx.fillRect(BOX_RIGHT, DEADLINE_Y - 20, 10, BOX_BOTTOM - DEADLINE_Y + 30);
      // 底壁
      ctx.fillRect(BOX_LEFT - 10, BOX_BOTTOM, BOX_RIGHT - BOX_LEFT + 20, 10);

      // 4. 落下予測ガイドライン
      if (canDrop && !isGameOver) {
        const curDef = FRUITS[currentFruitLevel];
        const minX = BOX_LEFT + curDef.radius + 5;
        const maxX = BOX_RIGHT - curDef.radius - 5;
        const targetX = Math.max(minX, Math.min(maxX, dropperX));

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(targetX, DROP_Y + curDef.radius);
        ctx.lineTo(targetX, BOX_BOTTOM);
        ctx.stroke();
        ctx.restore();
      }

      // 5. フルーツ剛体の描画
      let dangerFruitDetected = false;
      const now = Date.now();

      fruitBodiesRef.current.forEach(({ body, data }) => {
        const { x, y } = body.position;
        const angle = body.angle;
        const def = FRUITS[data.level];
        const radius = def.radius;

        // 表情タイマー更新
        data.blinkTimer--;
        if (data.blinkTimer <= 0) {
          data.isBlinking = true;
          if (data.blinkTimer < -8) {
            data.isBlinking = false;
            data.blinkTimer = Math.random() * 200 + 100;
          }
        }
        if (data.isHappy) {
          data.happyTimer--;
          if (data.happyTimer <= 0) data.isHappy = false;
        }

        // デッドライン判定（落下直後約1.2秒以上経過し、速度が小さく、ラインより上にある場合）
        const isSettled = Math.abs(body.velocity.y) < 0.6 && Math.abs(body.velocity.x) < 0.6;
        const isPastDeadline = y - radius < DEADLINE_Y;
        const isOldEnough = now - data.createdAt > 1200;

        if (isSettled && isPastDeadline && isOldEnough) {
          dangerFruitDetected = true;
          data.isScared = true;
        } else {
          data.isScared = false;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // フルーツ本体（円形グラデーション）
        const grad = ctx.createRadialGradient(
          -radius * 0.3,
          -radius * 0.3,
          radius * 0.1,
          0,
          0,
          radius
        );
        grad.addColorStop(0, def.secondaryColor);
        grad.addColorStop(0.8, def.color);
        grad.addColorStop(1, def.color);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 外周枠線
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = Math.max(1.5, radius * 0.04);
        ctx.stroke();

        // 各フルーツ特有の柄
        if (data.level === 10) {
          // スイカ：緑地に黒のカーブした波縞模様
          ctx.save();
          ctx.clip(); // 円内にクリップ
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = radius * 0.12;
          ctx.lineCap = 'round';
          for (let s = -2; s <= 2; s++) {
            ctx.beginPath();
            const sx = s * (radius * 0.4);
            ctx.moveTo(sx - 10, -radius);
            ctx.quadraticCurveTo(sx + 15, 0, sx - 10, radius);
            ctx.stroke();
          }
          ctx.restore();
        } else if (data.level === 9) {
          // メロン：メッシュネット模様
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          for (let m = -radius; m <= radius; m += 18) {
            ctx.beginPath();
            ctx.arc(m, 0, radius * 0.8, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-m, 0, radius * 0.8, Math.PI / 2, (3 * Math.PI) / 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (data.level === 8) {
          // パイナップル：格子模様
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
          ctx.lineWidth = 2;
          for (let p = -radius; p <= radius; p += 16) {
            ctx.beginPath();
            ctx.moveTo(p, -radius);
            ctx.lineTo(p + radius * 0.8, radius);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p, -radius);
            ctx.lineTo(p - radius * 0.8, radius);
            ctx.stroke();
          }
          ctx.restore();
        } else if (data.level === 7) {
          // もも：うっすら中央の割れ目ライン
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -radius * 0.8);
          ctx.quadraticCurveTo(radius * 0.2, 0, 0, radius * 0.8);
          ctx.stroke();
        } else if (data.level === 1) {
          // いちご：小さな種（ドット）
          ctx.fillStyle = '#fef08a';
          const seedPoints = [
            { x: -radius * 0.4, y: -radius * 0.3 },
            { x: radius * 0.4, y: -radius * 0.3 },
            { x: -radius * 0.3, y: radius * 0.2 },
            { x: radius * 0.3, y: radius * 0.2 },
            { x: 0, y: radius * 0.45 },
          ];
          seedPoints.forEach((sp) => {
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 光沢ハイライト
        ctx.beginPath();
        ctx.ellipse(-radius * 0.45, -radius * 0.45, radius * 0.22, radius * 0.12, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();

        // ヘタ / 葉っぱの描画
        if (data.level === 0) {
          // さくらんぼの軸
          ctx.strokeStyle = def.accentColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, -radius * 0.8);
          ctx.quadraticCurveTo(radius * 0.5, -radius * 1.5, radius * 0.8, -radius * 1.6);
          ctx.stroke();
        } else if (data.level === 1 || data.level === 3 || data.level === 5 || data.level === 6) {
          // 頭の小さな葉っぱ
          ctx.fillStyle = def.accentColor;
          ctx.beginPath();
          ctx.ellipse(0, -radius * 0.9, radius * 0.2, radius * 0.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- 可愛い表情の描画 ---
        const eyeOffsetX = radius * 0.28;
        const eyeOffsetY = -radius * 0.05;
        const eyeRadius = Math.max(1.8, radius * 0.09);

        // チーク（ピンクのほっぺ）
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX * 1.25, eyeOffsetY + eyeRadius * 1.8, eyeRadius * 1.2, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX * 1.25, eyeOffsetY + eyeRadius * 1.8, eyeRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();

        if (data.isScared) {
          // 焦り顔：涙目＋波打つ口
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius * 1.2, 0, Math.PI * 2);
          ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius * 1.2, 0, Math.PI * 2);
          ctx.fill();

          // 涙
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(eyeOffsetX + eyeRadius * 1.2, eyeOffsetY + eyeRadius * 1.5, eyeRadius * 0.8, 0, Math.PI * 2);
          ctx.fill();

          // 波打つ口
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-eyeOffsetX * 0.6, eyeOffsetY + eyeRadius * 2.2);
          ctx.quadraticCurveTo(0, eyeOffsetY + eyeRadius * 1.6, eyeOffsetX * 0.6, eyeOffsetY + eyeRadius * 2.2);
          ctx.stroke();
        } else if (data.isHappy) {
          // にっこり笑顔：目の形が三日月「^^」
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = Math.max(1.8, radius * 0.06);
          ctx.lineCap = 'round';
          // 左目
          ctx.beginPath();
          ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius * 1.1, Math.PI, 0);
          ctx.stroke();
          // 右目
          ctx.beginPath();
          ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius * 1.1, Math.PI, 0);
          ctx.stroke();

          // 大きな笑顔の口
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(0, eyeOffsetY + eyeRadius * 1.5, eyeRadius * 1.3, 0, Math.PI);
          ctx.fill();
        } else if (data.isBlinking) {
          // 瞬き：一本線
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = Math.max(1.5, radius * 0.05);
          ctx.beginPath();
          ctx.moveTo(-eyeOffsetX - eyeRadius, eyeOffsetY);
          ctx.lineTo(-eyeOffsetX + eyeRadius, eyeOffsetY);
          ctx.moveTo(eyeOffsetX - eyeRadius, eyeOffsetY);
          ctx.lineTo(eyeOffsetX + eyeRadius, eyeOffsetY);
          ctx.stroke();

          // 普通の口
          ctx.beginPath();
          ctx.arc(0, eyeOffsetY + eyeRadius * 1.4, eyeRadius * 0.7, 0, Math.PI);
          ctx.stroke();
        } else {
          // 通常のつぶらな瞳
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(-eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
          ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
          ctx.fill();

          // 瞳の白いハイライト
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-eyeOffsetX - eyeRadius * 0.3, eyeOffsetY - eyeRadius * 0.3, eyeRadius * 0.4, 0, Math.PI * 2);
          ctx.arc(eyeOffsetX - eyeRadius * 0.3, eyeOffsetY - eyeRadius * 0.3, eyeRadius * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // 微笑み口
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = Math.max(1.5, radius * 0.04);
          ctx.beginPath();
          ctx.arc(0, eyeOffsetY + eyeRadius * 1.2, eyeRadius * 0.8, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }

        ctx.restore();
      });

      // 警告ステート＆ゲームオーバー判定の更新
      if (dangerFruitDetected && !isGameOver) {
        setIsWarning(true);
        warningCountdown++;
        if (warningCountdown % 45 === 0) {
          suikaAudio.playDanger();
        }
        // 約2.5秒（150フレーム）危険ラインを超え続けたらゲームオーバー
        if (warningCountdown > 150) {
          setIsGameOver(true);
          suikaAudio.playGameOver();
        }
      } else {
        warningCountdown = Math.max(0, warningCountdown - 2);
        if (warningCountdown === 0) {
          setIsWarning(false);
        }
      }

      // 6. ドロッパー（雲と待機中のフルーツ）の描画
      if (canDrop && !isGameOver) {
        const curDef = FRUITS[currentFruitLevel];
        const minX = BOX_LEFT + curDef.radius + 5;
        const maxX = BOX_RIGHT - curDef.radius - 5;
        const targetX = Math.max(minX, Math.min(maxX, dropperX));

        ctx.save();
        // 雲の描画
        ctx.fillStyle = isDark ? '#475569' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(targetX, DROP_Y - curDef.radius - 12, 14, 0, Math.PI * 2);
        ctx.arc(targetX - 16, DROP_Y - curDef.radius - 8, 11, 0, Math.PI * 2);
        ctx.arc(targetX + 16, DROP_Y - curDef.radius - 8, 11, 0, Math.PI * 2);
        ctx.fill();

        // 雲の可愛いお顔
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.beginPath();
        ctx.arc(targetX - 6, DROP_Y - curDef.radius - 11, 2, 0, Math.PI * 2);
        ctx.arc(targetX + 6, DROP_Y - curDef.radius - 11, 2, 0, Math.PI * 2);
        ctx.fill();

        // ドロッパー内の待機フルーツ
        ctx.translate(targetX, DROP_Y);
        const grad = ctx.createRadialGradient(
          -curDef.radius * 0.3,
          -curDef.radius * 0.3,
          curDef.radius * 0.1,
          0,
          0,
          curDef.radius
        );
        grad.addColorStop(0, curDef.secondaryColor);
        grad.addColorStop(1, curDef.color);

        ctx.beginPath();
        ctx.arc(0, 0, curDef.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 待機フルーツのお顔
        const eRadius = Math.max(1.8, curDef.radius * 0.09);
        const eOffsetX = curDef.radius * 0.28;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-eOffsetX, -curDef.radius * 0.05, eRadius, 0, Math.PI * 2);
        ctx.arc(eOffsetX, -curDef.radius * 0.05, eRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-eOffsetX - eRadius * 0.3, -curDef.radius * 0.05 - eRadius * 0.3, eRadius * 0.4, 0, Math.PI * 2);
        ctx.arc(eOffsetX - eRadius * 0.3, -curDef.radius * 0.05 - eRadius * 0.3, eRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, curDef.radius * 0.1, eRadius * 0.7, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // 7. パーティクルの更新と描画
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // 重力
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        p.rotation += p.vRot;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.type === 'star') {
          // 4点星
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(p.radius, 0);
            ctx.lineTo(p.radius * 0.3, p.radius * 0.3);
          }
          ctx.fill();
        } else {
          // 円形スパークル
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 8. 浮遊スコアテキストの更新と描画
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 1.4;
        ft.life++;
        ft.alpha = Math.max(0, 1 - ft.life / 36);

        if (ft.life >= 36) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [currentFruitLevel, dropperX, canDrop, isGameOver, isDark, isWarning]);

  // ミュート切り替え
  const handleToggleMute = () => {
    const nextMuted = suikaAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col justify-between items-center select-none overflow-hidden transition-colors duration-300 ${
        isFullscreen
          ? 'h-[calc(100dvh-4.25rem)] p-1 sm:p-2'
          : 'h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto py-2 px-3'
      } ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
    >
      {/* トップバー（戻る、スコア、NEXT、コントロール） */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-2 px-2 py-1 shrink-0 mb-1">
        {/* 左: 戻る & ミュート & 進化ツリー案内 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onBackToHub}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
            title="ゲーム一覧へ戻る"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
            title={isMuted ? 'サウンドON' : 'ミュート'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          <button
            onClick={() => setShowEvolutionModal(true)}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-semibold ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-amber-300'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-amber-600 shadow-sm'
            }`}
            title="進化チャート"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">進化表</span>
          </button>
        </div>

        {/* 中央: 現在スコア & ベストスコア */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center min-w-[85px] ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">SCORE</span>
            <span className="text-base sm:text-lg font-black text-amber-500">{score}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center min-w-[85px] ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] tracking-wider uppercase font-bold text-slate-400">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span>BEST</span>
            </div>
            <span className="text-base sm:text-lg font-black text-yellow-500">{highScore}</span>
          </div>
        </div>

        {/* 右: NEXT & シェイク & リセット */}
        <div className="flex items-center gap-2">
          {/* NEXTプレビュー */}
          <div
            className={`px-2.5 py-1 rounded-2xl border flex items-center gap-1.5 ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
            title="次に出るフルーツ"
          >
            <span className="text-[10px] font-bold text-slate-400">NEXT</span>
            <div className="flex items-center gap-1">
              <span className="text-lg" title={FRUITS[nextFruitLevel].name}>
                {FRUITS[nextFruitLevel].emoji}
              </span>
              <span className="text-xs opacity-60" title={FRUITS[nextFruitLevel2].name}>
                {FRUITS[nextFruitLevel2].emoji}
              </span>
            </div>
          </div>

          {/* シェイクアシストボタン */}
          <button
            onClick={handleShake}
            disabled={shakesLeft <= 0 || isGameOver}
            className={`px-2.5 py-1.5 rounded-2xl border flex items-center gap-1 font-bold text-xs transition-all ${
              shakesLeft > 0 && !isGameOver
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white shadow-md shadow-sky-500/20 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-700 text-slate-400 border-slate-600'
            }`}
            title="フルーツを揺らして隙間を解消！(1プレイ3回)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>揺らす</span>
            <span className="text-[10px] px-1 rounded-full bg-white/20">{shakesLeft}</span>
          </button>

          {/* リセット */}
          <button
            onClick={handleRestart}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
            title="最初からやり直す"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ゲームメイン領域（Canvas & スケーリングラッパー） */}
      <div
        ref={gameAreaRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden py-1"
      >
        <div
          className={`relative flex items-center justify-center transition-all duration-150 ${
            isFullscreen
              ? 'h-full max-h-full max-w-full'
              : 'h-full max-h-[680px] max-w-[480px]'
          }`}
          style={{
            aspectRatio: '480 / 680',
            height: '100%',
            maxHeight: '100%',
            maxWidth: '100%',
            width: 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerDown={(e) => {
              try {
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              } catch {
                // ignore
              }
              handlePointerMove(e.clientX);
              if (e.pointerType === 'mouse') {
                handleDrop();
              }
            }}
            onPointerMove={(e) => {
              handlePointerMove(e.clientX);
            }}
            onPointerUp={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              } catch {
                // ignore
              }
              if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                handleDrop();
              }
            }}
            onPointerCancel={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              } catch {
                // ignore
              }
            }}
            className="w-full h-full rounded-3xl touch-none cursor-pointer shadow-2xl transition-shadow block"
            style={{
              backgroundColor: isDark ? '#090d16' : '#f1f5f9',
              boxShadow: isWarning
                ? '0 0 35px rgba(239, 68, 68, 0.4)'
                : isDark
                ? '0 10px 30px rgba(0,0,0,0.5)'
                : '0 10px 30px rgba(0,0,0,0.1)',
            }}
          />

          {/* ゲームオーバーオーバーレイ */}
          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <span className="text-5xl mb-2 animate-bounce">🍉</span>
              <h2 className="text-3xl font-black text-rose-500 mb-1 tracking-wide">GAME OVER</h2>
              <p className="text-xs text-slate-400 mb-4">フルーツが箱からあふれてしまいました！</p>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 w-full max-w-[260px] mb-5 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">最終スコア</span>
                  <span className="text-xl font-black text-amber-400">{score}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">ベストスコア</span>
                  <span className="text-base font-bold text-yellow-500">{highScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">到達最高フルーツ</span>
                  <span className="text-lg">
                    {FRUITS[maxFruitLevel]?.emoji} {FRUITS[maxFruitLevel]?.name}
                  </span>
                </div>
              </div>

              {score >= highScore && score > 0 && (
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm mb-4 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>NEW RECORD 達成！</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <button
                onClick={handleRestart}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>もう一度遊ぶ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* フッター操作ガイド */}
      <div className="w-full max-w-2xl flex items-center justify-between text-[11px] text-slate-400 px-2 py-1 shrink-0">
        <div className="flex items-center gap-2">
          <span>💡 左右移動: マウス / タッチ / [←][→]</span>
          <span>投下: クリック / [Space]</span>
        </div>
        <div className="flex items-center gap-2 font-semibold">
          <span>🍉 スイカ作成数: <span className="text-emerald-400 font-bold">{watermelonsCreated}</span></span>
        </div>
      </div>

      {/* 進化チャートモーダル */}
      {showEvolutionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative animate-in fade-in zoom-in-95 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <button
              onClick={() => setShowEvolutionModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800/30 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌱</span>
              <h3 className="text-lg font-bold">フルーツ進化ツリー</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              同じフルーツ同士がくっつくと、1つ大きなフルーツに進化します。目指せ大きなスイカ！
            </p>

            {/* フルーツ一覧フロー */}
            <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {FRUITS.map((fruit, idx) => (
                <div
                  key={fruit.level}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                    maxFruitLevel >= fruit.level
                      ? isDark
                        ? 'bg-slate-800/90 border-amber-500/40 text-slate-100'
                        : 'bg-amber-50/70 border-amber-300 text-slate-800'
                      : isDark
                      ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="text-xl">{fruit.emoji}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold flex items-center gap-1">
                      {idx + 1}. {fruit.name}
                      {maxFruitLevel >= fruit.level && (
                        <span className="text-[10px] text-amber-500 font-semibold">達成!</span>
                      )}
                    </span>
                    <span className="text-[10px] opacity-70">得点 +{fruit.score}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowEvolutionModal(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
            >
              とじる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
