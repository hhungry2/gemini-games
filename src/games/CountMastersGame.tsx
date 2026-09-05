// Count Masters (カウントマスターズ) メインコンポーネント

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { countAudio } from './countmasters/audio';
import {
  GameState,
  Stickman,
  StageData,
  Particle,
  Skin,
  Upgrades,
  StairStep,
} from './countmasters/types';
import { getStageData, ROAD_WIDTH, createStairSteps } from './countmasters/stages';
import { CountMastersRenderer } from './countmasters/renderer';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Trophy,
  Users,
  Coins,
  Sparkles,
  ShoppingBag,
  Zap,
  ShieldAlert,
  Swords,
  ChevronRight,
  Pause,
} from 'lucide-react';

export const COUNT_MASTERS_HIGH_SCORE_KEY = 'countmasters_high_score_v1';
export const COUNT_MASTERS_MAX_CROWD_KEY = 'countmasters_max_crowd_v1';
export const COUNT_MASTERS_TOTAL_COINS_KEY = 'countmasters_total_coins_v1';
export const COUNT_MASTERS_STAGE_KEY = 'countmasters_cleared_stage_v1';
export const COUNT_MASTERS_UPGRADES_KEY = 'countmasters_upgrades_v1';
export const COUNT_MASTERS_SKINS_KEY = 'countmasters_skins_v1';

const SKINS: Skin[] = [
  {
    id: 'classic_blue',
    name: 'クラシック・ブルー',
    color: '#3b82f6',
    headColor: '#60a5fa',
    glowColor: '#93c5fd',
    accessory: 'crown',
    cost: 0,
    unlocked: true,
  },
  {
    id: 'gold_king',
    name: 'ゴールデン・キング',
    color: '#eab308',
    headColor: '#fde047',
    glowColor: '#fef08a',
    accessory: 'crown',
    cost: 300,
    unlocked: false,
  },
  {
    id: 'ninja_red',
    name: '真紅のシノビ',
    color: '#ef4444',
    headColor: '#f87171',
    glowColor: '#fca5a5',
    accessory: 'ninja',
    cost: 500,
    unlocked: false,
  },
  {
    id: 'cyber_cyan',
    name: 'ネオン・サイバー',
    color: '#06b6d4',
    headColor: '#22d3ee',
    glowColor: '#67e8f9',
    accessory: 'helmet',
    cost: 800,
    unlocked: false,
  },
  {
    id: 'cat_pink',
    name: 'にゃんこ隊長',
    color: '#ec4899',
    headColor: '#f472b6',
    glowColor: '#fbcfe8',
    accessory: 'cat',
    cost: 1200,
    unlocked: false,
  },
];

interface CountMastersGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const CountMastersGame: React.FC<CountMastersGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<CountMastersRenderer>(new CountMastersRenderer());

  // ゲーム状態
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [stageNum, setStageNum] = useState<number>(1);
  const [clearedStage, setClearedStage] = useState<number>(() => {
    const val = localStorage.getItem(COUNT_MASTERS_STAGE_KEY);
    return val ? parseInt(val, 10) : 1;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const val = localStorage.getItem(COUNT_MASTERS_HIGH_SCORE_KEY);
    return val ? parseInt(val, 10) : 0;
  });
  const [maxCrowdRecord, setMaxCrowdRecord] = useState<number>(() => {
    const val = localStorage.getItem(COUNT_MASTERS_MAX_CROWD_KEY);
    return val ? parseInt(val, 10) : 1;
  });
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    const val = localStorage.getItem(COUNT_MASTERS_TOTAL_COINS_KEY);
    return val ? parseInt(val, 10) : 100;
  });

  // アップグレード状態
  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    const saved = localStorage.getItem(COUNT_MASTERS_UPGRADES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return { startCrowdLevel: 1, attackPowerLevel: 1, coinBonusLevel: 1 };
  });

  // スキン状態
  const [skins, setSkins] = useState<Skin[]>(() => {
    const saved = localStorage.getItem(COUNT_MASTERS_SKINS_KEY);
    if (saved) {
      try {
        const unlockedIds: string[] = JSON.parse(saved);
        return SKINS.map((s) => ({ ...s, unlocked: s.cost === 0 || unlockedIds.includes(s.id) }));
      } catch {
        // fallback
      }
    }
    return SKINS;
  });
  const [selectedSkinId, setSelectedSkinId] = useState<string>('classic_blue');

  // サウンドミュート状態
  const [isMuted, setIsMuted] = useState<boolean>(countAudio.isMuted);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // アンマウント時のBGM停止
  useEffect(() => {
    return () => {
      countAudio.stopBgm();
    };
  }, []);

  // リザルト用ステート
  const [stageResult, setStageResult] = useState<{
    stageId: number;
    finalCrowd: number;
    multiplier: number;
    score: number;
    coinsEarned: number;
    isNewRecord: boolean;
  } | null>(null);

  // ゲーム内リアルタイムデータ (Ref管理で高速ループ)
  const currentStageRef = useRef<StageData | null>(null);
  const stairsRef = useRef<StairStep[]>([]);
  const stickmenRef = useRef<Stickman[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const playerXRef = useRef<number>(0);
  const targetPlayerXRef = useRef<number>(0);
  const playerZRef = useRef<number>(0);
  const forwardSpeedRef = useRef<number>(2.6);
  const stageCoinsRef = useRef<number>(0);
  const shakeTimerRef = useRef<number>(0);
  const highestStepRef = useRef<number>(-1);
  const crowdCountRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const lastTouchXRef = useRef<number | null>(null);
  const isStageClearingRef = useRef<boolean>(false);

  // 現在のスキン取得
  const currentSkin = skins.find((s) => s.id === selectedSkinId) || skins[0];

  // アップグレードのコスト計算
  const getUpgradeCost = (level: number) => level * 100;

  // アップグレード実行
  const buyUpgrade = (type: keyof Upgrades) => {
    const cost = getUpgradeCost(upgrades[type]);
    if (totalCoins >= cost && upgrades[type] < 10) {
      const nextTotal = totalCoins - cost;
      const nextUpgrades = { ...upgrades, [type]: upgrades[type] + 1 };
      setTotalCoins(nextTotal);
      setUpgrades(nextUpgrades);
      localStorage.setItem(COUNT_MASTERS_TOTAL_COINS_KEY, nextTotal.toString());
      localStorage.setItem(COUNT_MASTERS_UPGRADES_KEY, JSON.stringify(nextUpgrades));
      countAudio.playCoin();
    }
  };

  // スキン購入・選択
  const selectOrBuySkin = (skin: Skin) => {
    if (skin.unlocked) {
      setSelectedSkinId(skin.id);
      countAudio.playPop(1.5);
    } else if (totalCoins >= skin.cost) {
      const nextTotal = totalCoins - skin.cost;
      const nextSkins = skins.map((s) => (s.id === skin.id ? { ...s, unlocked: true } : s));
      setTotalCoins(nextTotal);
      setSkins(nextSkins);
      setSelectedSkinId(skin.id);
      localStorage.setItem(COUNT_MASTERS_TOTAL_COINS_KEY, nextTotal.toString());
      const unlockedIds = nextSkins.filter((s) => s.unlocked).map((s) => s.id);
      localStorage.setItem(COUNT_MASTERS_SKINS_KEY, JSON.stringify(unlockedIds));
      countAudio.playVictoryFanfare();
    }
  };

  // スティックマン群衆の整列・配置更新（フェルマー螺旋アルゴリズム）
  const updateStickmenPositions = useCallback((leaderX: number, leaderZ: number) => {
    const aliveStickmen = stickmenRef.current.filter((sm) => sm.isAlive);
    const c = 1.25; // 密集係数

    aliveStickmen.forEach((sm, index) => {
      if (index === 0) {
        sm.targetOffsetX = 0;
        sm.targetOffsetZ = 0;
      } else {
        // 黄金角 137.5度 = 2.399963 rad による螺旋配置
        const r = c * Math.sqrt(index);
        const theta = index * 2.399963;
        sm.targetOffsetX = Math.cos(theta) * r;
        sm.targetOffsetZ = -Math.sin(theta) * r * 0.8;
      }

      // スムーズ追従
      const targetWorldX = Math.max(-ROAD_WIDTH / 2 + 1.2, Math.min(ROAD_WIDTH / 2 - 1.2, leaderX + sm.targetOffsetX));
      const targetWorldZ = leaderZ + sm.targetOffsetZ;

      sm.x += (targetWorldX - sm.x) * 0.28;
      sm.z += (targetWorldZ - sm.z) * 0.32;
      sm.animOffset += 0.05;
    });
  }, []);

  // 人数を追加・増殖
  const addStickmen = useCallback(
    (countToAdd: number, originX: number, originZ: number) => {
      const current = stickmenRef.current.filter((sm) => sm.isAlive).length;
      const targetCount = current + countToAdd;
      countAudio.playPop(1.0 + Math.min(1.2, countToAdd * 0.02));

      // パーティクル & テキスト
      particlesRef.current.push({
        x: originX,
        y: 12,
        z: originZ,
        vx: 0,
        vy: 2.5,
        vz: 0,
        color: '#38bdf8',
        size: 2,
        life: 45,
        maxLife: 45,
        type: 'text',
        text: `+${countToAdd}!`,
      });

      // リング衝撃波
      particlesRef.current.push({
        x: originX,
        y: 0,
        z: originZ,
        vx: 0,
        vy: 0,
        vz: 0,
        color: 'rgba(56, 189, 248, 0.8)',
        size: 5,
        life: 25,
        maxLife: 25,
        type: 'gateRing',
      });

      for (let i = 0; i < countToAdd; i++) {
        const id = Math.random();
        stickmenRef.current.push({
          id,
          x: originX + (Math.random() - 0.5) * 4,
          y: 0,
          z: originZ - Math.random() * 8,
          targetOffsetX: 0,
          targetOffsetZ: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          color: currentSkin.color,
          isAlive: true,
          state: 'running',
          animOffset: Math.random() * 10,
          scale: 1,
        });
      }

      crowdCountRef.current = targetCount;
    },
    [currentSkin.color]
  );

  // 人数を減少
  const removeStickmen = useCallback((countToRemove: number, originX: number, originZ: number) => {
    const alive = stickmenRef.current.filter((sm) => sm.isAlive);
    const removeActual = Math.min(alive.length, countToRemove);
    countAudio.playDecrease();

    // テキスト
    particlesRef.current.push({
      x: originX,
      y: 12,
      z: originZ,
      vx: 0,
      vy: 2.5,
      vz: 0,
      color: '#ef4444',
      size: 2,
      life: 45,
      maxLife: 45,
      type: 'text',
      text: `-${removeActual}`,
    });

    for (let i = 0; i < removeActual; i++) {
      const idx = alive.length - 1 - i;
      if (idx >= 0) {
        const sm = alive[idx];
        sm.isAlive = false;
        sm.state = 'flying';
        // 吹き飛びパーティクル
        particlesRef.current.push({
          x: sm.x,
          y: 6,
          z: sm.z,
          vx: (Math.random() - 0.5) * 6,
          vy: 6 + Math.random() * 4,
          vz: -2 + Math.random() * 4,
          color: sm.color,
          size: 4,
          life: 30,
          maxLife: 30,
          type: 'spark',
        });
      }
    }

    crowdCountRef.current = Math.max(0, alive.length - removeActual);
  }, []);

  // ステージ初期化
  const startStage = useCallback(
    (stageId: number) => {
      const stageData = getStageData(stageId);
      currentStageRef.current = stageData;
      stairsRef.current = createStairSteps(stageData.boss.z);

      playerXRef.current = 0;
      targetPlayerXRef.current = 0;
      playerZRef.current = 40;
      stageCoinsRef.current = 0;
      shakeTimerRef.current = 0;
      highestStepRef.current = -1;
      forwardSpeedRef.current = 2.8;
      isStageClearingRef.current = false;

      particlesRef.current = [];

      // 初期群衆
      const initialCount = 1 + (upgrades.startCrowdLevel - 1) * 3;
      crowdCountRef.current = initialCount;

      const initialStickmen: Stickman[] = [];
      for (let i = 0; i < initialCount; i++) {
        initialStickmen.push({
          id: Math.random(),
          x: 0,
          y: 0,
          z: 40 - i * 1.5,
          targetOffsetX: 0,
          targetOffsetZ: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          color: currentSkin.color,
          isAlive: true,
          state: 'running',
          animOffset: Math.random() * 5,
          scale: 1,
        });
      }
      stickmenRef.current = initialStickmen;

      setStageNum(stageId);
      setGameState('RUNNING');
      setIsPaused(false);
      setStageResult(null);

      if (!isMuted) {
        countAudio.startBgm();
      }
    },
    [upgrades.startCrowdLevel, currentSkin.color, isMuted]
  );

  // マウス＆タッチ操作リスナー
  const handlePointerDown = (clientX: number) => {
    if (gameState !== 'RUNNING' && gameState !== 'BOSS_BATTLE') return;
    isDraggingRef.current = true;
    lastTouchXRef.current = clientX;
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDraggingRef.current || lastTouchXRef.current === null) return;
    const dx = clientX - lastTouchXRef.current;
    lastTouchXRef.current = clientX;

    // スケーリング感度
    const sensitivity = 0.055;
    targetPlayerXRef.current = Math.max(
      -ROAD_WIDTH / 2 + 1.5,
      Math.min(ROAD_WIDTH / 2 - 1.5, targetPlayerXRef.current + dx * sensitivity)
    );
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    lastTouchXRef.current = null;
  };

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'RUNNING' && gameState !== 'BOSS_BATTLE') return;
      const step = 1.2;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        targetPlayerXRef.current = Math.max(-ROAD_WIDTH / 2 + 1.5, targetPlayerXRef.current - step);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        targetPlayerXRef.current = Math.min(ROAD_WIDTH / 2 - 1.5, targetPlayerXRef.current + step);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // メインゲームループ (requestAnimationFrame)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const stage = currentStageRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (canvas && container) {
        // キャンバスリサイズ (フルスクリーン時はコンテナの全域に拡大)
        const dpr = window.devicePixelRatio || 1;
        const targetW = container.clientWidth;
        const targetH = container.clientHeight;

        if (canvas.width !== targetW * dpr || canvas.height !== targetH * dpr) {
          canvas.width = targetW * dpr;
          canvas.height = targetH * dpr;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.resetTransform();
          ctx.scale(dpr, dpr);

          // 物理・ロジック更新 (一時停止中でない場合)
          if (!isPaused && stage && gameState !== 'TITLE' && gameState !== 'STAGE_SELECT' && gameState !== 'SHOP') {
            updateGameLogic(stage);
          }

          // 画面振動
          let shakeX = 0;
          let shakeY = 0;
          if (shakeTimerRef.current > 0) {
            shakeTimerRef.current--;
            shakeX = (Math.random() - 0.5) * 8;
            shakeY = (Math.random() - 0.5) * 8;
          }

          // カメラ座標計算 (三人称背後見下ろし)
          const camX = playerXRef.current * 0.45;
          const camY = 38;
          const camZ = playerZRef.current - 65;

          // レンダリング実行
          rendererRef.current.render({
            ctx,
            width: targetW,
            height: targetH,
            camX,
            camY,
            camZ,
            shakeX,
            shakeY,
            theme: stage ? stage.theme : 'city',
            skin: currentSkin,
            stickmen: stickmenRef.current,
            gates: stage ? stage.gates : [],
            obstacles: stage ? stage.obstacles : [],
            mobs: stage ? stage.mobs : [],
            boss: stage ? stage.boss : ({} as any),
            stairs: stairsRef.current,
            coins: stage ? stage.coins : [],
            particles: particlesRef.current,
            crowdCount: crowdCountRef.current,
            courseLength: stage ? stage.courseLength : 2000,
            isGameOver: gameState === 'GAME_OVER',
            isStageClear: gameState === 'STAGE_CLEAR',
            highestStepReached: highestStepRef.current,
            isBossBattle: gameState === 'BOSS_BATTLE',
            isStairsClimb: gameState === 'STAIRS_CLIMB',
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isPaused, currentSkin]);

  // ゲームロジック更新処理
  const updateGameLogic = (stage: StageData) => {
    // 1. プレイヤー位置のスムージング
    playerXRef.current += (targetPlayerXRef.current - playerXRef.current) * 0.25;

    // 2. 状態別進行
    if (gameState === 'RUNNING') {
      playerZRef.current += forwardSpeedRef.current;

      // 群衆スティックマンの更新
      updateStickmenPositions(playerXRef.current, playerZRef.current);

      // コイン収集判定
      stage.coins.forEach((coin) => {
        if (coin.collected) return;
        coin.rot += 0.08;
        const dz = Math.abs(playerZRef.current - coin.z);
        const dx = Math.abs(playerXRef.current - coin.x);
        if (dz < 15 && dx < 3.5) {
          coin.collected = true;
          const coinBonus = 1 + (upgrades.coinBonusLevel - 1) * 0.25;
          const earned = Math.round(1 * coinBonus);
          stageCoinsRef.current += earned;
          countAudio.playCoin();

          particlesRef.current.push({
            x: coin.x,
            y: coin.y,
            z: coin.z,
            vx: (Math.random() - 0.5) * 2,
            vy: 3,
            vz: 0,
            color: '#fbbf24',
            size: 3,
            life: 20,
            maxLife: 20,
            type: 'spark',
          });
        }
      });

      // ゲート判定
      stage.gates.forEach((gate) => {
        // スライドゲートの移動
        if (gate.isMoving) {
          gate.moveSpeed = gate.moveSpeed || 2;
          gate.moveRange = gate.moveRange || 4;
          gate.offsetX = Math.sin(playerZRef.current * 0.015) * gate.moveRange;
        }

        // ルーレットゲートの数値変動
        if (gate.isRoulette) {
          gate.rouletteTimer = (gate.rouletteTimer || 0) + 1;
          if (gate.rouletteTimer % 45 === 0) {
            const ops: ('+' | '×')[] = ['+', '×'];
            const randomOp = ops[Math.floor(Math.random() * ops.length)];
            const randomVal = randomOp === '+' ? Math.floor(Math.random() * 40) + 10 : Math.floor(Math.random() * 3) + 2;
            gate.leftOption.op = randomOp;
            gate.leftOption.val = randomVal;
            gate.leftOption.label = `${randomOp}${randomVal}`;
          }
        }

        // 通過判定
        const distZ = gate.z - playerZRef.current;
        if (distZ <= 0 && distZ > -forwardSpeedRef.current * 1.5) {
          const offsetX = gate.offsetX || 0;
          const isLeft = playerXRef.current < offsetX;
          const chosen = isLeft ? gate.leftOption : gate.rightOption;

          if (!chosen.passed) {
            chosen.passed = true;
            gate.leftOption.passed = true;
            gate.rightOption.passed = true;

            const current = crowdCountRef.current;
            let nextCount = current;

            if (chosen.op === '+') {
              nextCount = current + chosen.val;
              addStickmen(chosen.val, playerXRef.current, playerZRef.current);
              countAudio.playGatePositive();
            } else if (chosen.op === '×') {
              const toAdd = current * (chosen.val - 1);
              nextCount = current * chosen.val;
              addStickmen(toAdd, playerXRef.current, playerZRef.current);
              countAudio.playGatePositive();
            } else if (chosen.op === '-') {
              nextCount = Math.max(0, current - chosen.val);
              removeStickmen(chosen.val, playerXRef.current, playerZRef.current);
              countAudio.playGateNegative();
            } else if (chosen.op === '÷') {
              const toRemove = current - Math.max(1, Math.floor(current / chosen.val));
              nextCount = Math.max(1, Math.floor(current / chosen.val));
              removeStickmen(toRemove, playerXRef.current, playerZRef.current);
              countAudio.playGateNegative();
            }

            if (nextCount > maxCrowdRecord) {
              setMaxCrowdRecord(nextCount);
              localStorage.setItem(COUNT_MASTERS_MAX_CROWD_KEY, nextCount.toString());
            }

            if (nextCount <= 0) {
              handleGameOver();
              return;
            }
          }
        }
      });

      // トラップ障害物判定
      stage.obstacles.forEach((obs) => {
        obs.phase += 0.05 * obs.speed;

        // トゲ床の周期
        if (obs.type === 'spikes') {
          obs.active = Math.sin(obs.phase) > 0.2;
        }

        const dz = Math.abs(playerZRef.current - obs.z);
        if (dz < obs.length + 8) {
          stickmenRef.current.forEach((sm) => {
            if (!sm.isAlive) return;
            const dist = Math.hypot(sm.x - obs.x, sm.z - obs.z);
            if (dist < obs.radius + 1.2) {
              sm.isAlive = false;
              sm.state = 'flying';
              crowdCountRef.current = Math.max(0, crowdCountRef.current - 1);
              shakeTimerRef.current = 6;
              countAudio.playTrapHit();

              particlesRef.current.push({
                x: sm.x,
                y: 5,
                z: sm.z,
                vx: (Math.random() - 0.5) * 8,
                vy: 8,
                vz: (Math.random() - 0.5) * 6,
                color: sm.color,
                size: 3.5,
                life: 30,
                maxLife: 30,
                type: 'spark',
              });
            }
          });

          if (crowdCountRef.current <= 0) {
            handleGameOver();
            return;
          }
        }
      });

      // 敵小隊との相打ちバトル判定
      stage.mobs.forEach((mob) => {
        if (mob.currentCount <= 0) return;
        const dz = Math.abs(playerZRef.current - mob.z);
        if (dz < 22) {
          // プレイヤーの攻撃力レベル (1で1体相打ち、2で1.3倍相打ち...)
          const playerAtkRate = 1 + (upgrades.attackPowerLevel - 1) * 0.4;
          const alivePlayers = stickmenRef.current.filter((sm) => sm.isAlive);

          const clashCount = Math.min(2, alivePlayers.length, mob.currentCount);
          for (let i = 0; i < clashCount; i++) {
            mob.currentCount--;
            countAudio.playMobClash();
            shakeTimerRef.current = 4;

            // 敵スティックマンの撃破
            const enemySm = mob.stickmen.find((s) => s.isAlive);
            if (enemySm) enemySm.isAlive = false;

            // プレイヤーの犠牲 (攻撃力による確率相殺)
            if (Math.random() > playerAtkRate - 1) {
              const pSm = alivePlayers.pop();
              if (pSm) {
                pSm.isAlive = false;
                crowdCountRef.current = Math.max(0, crowdCountRef.current - 1);
              }
            }

            particlesRef.current.push({
              x: mob.x + (Math.random() - 0.5) * 6,
              y: 6,
              z: mob.z + (Math.random() - 0.5) * 6,
              vx: (Math.random() - 0.5) * 6,
              vy: 5,
              vz: (Math.random() - 0.5) * 6,
              color: '#ef4444',
              size: 3,
              life: 25,
              maxLife: 25,
              type: 'spark',
            });
          }

          if (crowdCountRef.current <= 0) {
            handleGameOver();
            return;
          }
        }
      });

      // ボスエリア進入判定
      if (playerZRef.current >= stage.boss.z - 75) {
        setGameState('BOSS_BATTLE');
        stage.boss.state = 'fighting';
        countAudio.playBossRoar();
      }
    } else if (gameState === 'BOSS_BATTLE') {
      const boss = stage.boss;
      boss.animTimer += 0.05;

      // ボスへ向かって群衆が包囲突撃
      playerZRef.current += forwardSpeedRef.current * 0.4;
      updateStickmenPositions(playerXRef.current, playerZRef.current);

      const aliveStickmen = stickmenRef.current.filter((sm) => sm.isAlive);
      if (aliveStickmen.length === 0) {
        handleGameOver();
        return;
      }

      // ボスにダメージ
      const playerDps = (1.8 + (upgrades.attackPowerLevel - 1) * 0.8) * Math.min(15, aliveStickmen.length);
      boss.hp = Math.max(0, boss.hp - playerDps * 0.1);
      countAudio.playMobClash();

      // ボスの反撃（一定確率で仲間が吹っ飛ぶ）
      if (Math.random() < 0.18) {
        const victim = aliveStickmen[Math.floor(Math.random() * aliveStickmen.length)];
        if (victim) {
          victim.isAlive = false;
          victim.state = 'flying';
          crowdCountRef.current = Math.max(0, crowdCountRef.current - 1);
          shakeTimerRef.current = 6;
          countAudio.playTrapHit();
        }
      }

      // ボス撃破！
      if (boss.hp <= 0) {
        boss.state = 'defeated';
        countAudio.playBossExplosion();
        shakeTimerRef.current = 20;

        // 大爆発パーティクル
        for (let i = 0; i < 40; i++) {
          particlesRef.current.push({
            x: (Math.random() - 0.5) * 15,
            y: 10 + Math.random() * 20,
            z: boss.z + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 12,
            vy: 5 + Math.random() * 10,
            vz: (Math.random() - 0.5) * 12,
            color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b',
            size: 5,
            life: 50,
            maxLife: 50,
            type: 'spark',
          });
        }

        // 階段タワー登攀へ移行
        setGameState('STAIRS_CLIMB');
        forwardSpeedRef.current = 3.5;
      }
    } else if (gameState === 'STAIRS_CLIMB') {
      // 階段タワー登攀ロジック
      playerZRef.current += forwardSpeedRef.current;
      updateStickmenPositions(playerXRef.current, playerZRef.current);

      const stairs = stairsRef.current;
      const aliveStickmen = stickmenRef.current.filter((sm) => sm.isAlive);

      // 各段のチェック
      stairs.forEach((step, idx) => {
        if (playerZRef.current >= step.z && idx > highestStepRef.current) {
          highestStepRef.current = idx;
          countAudio.playStairStep(idx);
          shakeTimerRef.current = 4;

          // その段に数人配置してバンザイ
          const stickmenForThisStep = aliveStickmen.slice(idx * 3, idx * 3 + 3);
          stickmenForThisStep.forEach((sm) => {
            sm.state = 'climbing';
            sm.y = step.y + 4;
          });

          // コンフェッティ
          for (let c = 0; c < 8; c++) {
            particlesRef.current.push({
              x: (Math.random() - 0.5) * 12,
              y: step.y + 15,
              z: step.z,
              vx: (Math.random() - 0.5) * 6,
              vy: 4 + Math.random() * 4,
              vz: (Math.random() - 0.5) * 4,
              color: step.color,
              size: 4,
              life: 40,
              maxLife: 40,
              type: 'confetti',
            });
          }
        }
      });

      // 人数に応じた登攀限界に到達、または最後の段を通過
      const maxPossibleStep = Math.min(stairs.length - 1, Math.floor(aliveStickmen.length / 5));
      const reachedEnd =
        highestStepRef.current >= maxPossibleStep ||
        playerZRef.current >= stairs[stairs.length - 1].z + 60;

      if (reachedEnd && !isStageClearingRef.current) {
        isStageClearingRef.current = true;
        handleStageClear();
      }
    }

    // パーティクル更新
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vy -= 0.15; // 重力
      p.life--;
    });
    particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
  };

  // ゲームオーバー処理
  const handleGameOver = () => {
    setGameState('GAME_OVER');
    countAudio.stopBgm();
    countAudio.playGameOver();
  };

  // ステージクリア処理
  const handleStageClear = () => {
    setGameState('STAGE_CLEAR');
    countAudio.stopBgm();
    countAudio.playVictoryFanfare();

    const stairs = stairsRef.current;
    const finalStepIdx = Math.max(0, highestStepRef.current);
    const multiplier = stairs[finalStepIdx] ? stairs[finalStepIdx].multiplier : 1.0;
    const finalCrowd = crowdCountRef.current;
    const rawScore = (finalCrowd * 100 + stageCoinsRef.current * 20);
    const totalScore = Math.round(rawScore * multiplier);
    const earnedCoins = Math.round(stageCoinsRef.current * multiplier) + 50;

    const nextTotalCoins = totalCoins + earnedCoins;
    setTotalCoins(nextTotalCoins);
    localStorage.setItem(COUNT_MASTERS_TOTAL_COINS_KEY, nextTotalCoins.toString());

    let isNewRecord = false;
    if (totalScore > highScore) {
      setHighScore(totalScore);
      localStorage.setItem(COUNT_MASTERS_HIGH_SCORE_KEY, totalScore.toString());
      isNewRecord = true;
    }

    if (stageNum >= clearedStage && stageNum < 5) {
      const nextStage = stageNum + 1;
      setClearedStage(nextStage);
      localStorage.setItem(COUNT_MASTERS_STAGE_KEY, nextStage.toString());
    }

    setStageResult({
      stageId: stageNum,
      finalCrowd,
      multiplier,
      score: totalScore,
      coinsEarned: earnedCoins,
      isNewRecord,
    });
  };

  // ミュート切り替え
  const toggleMute = () => {
    const muted = countAudio.toggleMute();
    setIsMuted(muted);
    if (!muted && (gameState === 'RUNNING' || gameState === 'BOSS_BATTLE')) {
      countAudio.startBgm();
    }
  };

  // 一時停止
  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // 進捗率計算 (0 ~ 100%)
  const getProgress = () => {
    const stage = currentStageRef.current;
    if (!stage) return 0;
    return Math.min(100, Math.max(0, Math.round((playerZRef.current / stage.boss.z) * 100)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none overflow-hidden ${
        isFullscreen
          ? 'w-full h-full max-w-none max-h-none flex-1 p-0 m-0'
          : 'w-full max-w-4xl h-[700px] rounded-2xl shadow-2xl border border-slate-700/50 my-2'
      } ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}
      onMouseDown={(e) => handlePointerDown(e.clientX)}
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseUp={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX);
      }}
      onTouchMove={(e) => {
        if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX);
      }}
      onTouchEnd={handlePointerUp}
    >
      {/* メインゲームCanvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 上部共通ヘッダーHUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        {/* 左: 一時停止 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {(gameState === 'RUNNING' || gameState === 'BOSS_BATTLE') && (
            <button
              onClick={togglePause}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white transition backdrop-blur shadow-md cursor-pointer border border-slate-700/50"
              title="ポーズ"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 中央: 走行中の進捗バー */}
        {(gameState === 'RUNNING' || gameState === 'BOSS_BATTLE' || gameState === 'STAIRS_CLIMB') && (
          <div className="flex-1 max-w-xs mx-4">
            <div className="relative w-full h-3 bg-slate-900/70 rounded-full overflow-hidden border border-slate-700/60 backdrop-blur">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-100"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-300 mt-0.5 px-1 drop-shadow">
              <span>START</span>
              <span>{getProgress()}%</span>
              <span>BOSS 👑</span>
            </div>
          </div>
        )}

        {/* 右: コイン数 & ミュートボタン */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black backdrop-blur shadow-md">
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{totalCoins + stageCoinsRef.current}</span>
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white transition backdrop-blur shadow-md cursor-pointer border border-slate-700/50"
            title="音量切替"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 操作ガイド（走行中の画面下部） */}
      {gameState === 'RUNNING' && (
        <div className="absolute bottom-4 pointer-events-none z-10 text-center animate-pulse">
          <span className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs text-slate-300 font-bold backdrop-blur shadow-lg">
            左右スワイプ / ドラッグ / [A][D]キーで操作
          </span>
        </div>
      )}

      {/* 一時停止オーバーレイ */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in fade-in duration-200">
          <h2 className="text-3xl font-black text-white mb-6">一時停止中</h2>
          <div className="flex gap-4">
            <button
              onClick={togglePause}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>再開する</span>
            </button>
            <button
              onClick={() => {
                countAudio.stopBgm();
                setGameState('TITLE');
              }}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition border border-slate-600 cursor-pointer"
            >
              タイトルへ
            </button>
          </div>
        </div>
      )}

      {/* 1. タイトル画面 */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30">
          <div className="text-center max-w-md">
            {/* タイトルバッジ */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>CROWD RUNNER 3D</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 mb-2 drop-shadow-md">
              Count Masters
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              計算ゲートをくぐって仲間を大増殖！<br />
              トラップを抜け、敵軍団と巨大ボスを撃破せよ！
            </p>

            {/* 実績表示 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-bold">最高スコア</div>
                  <div className="text-base font-black text-white">{highScore.toLocaleString()}</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-bold">歴代最多人数</div>
                  <div className="text-base font-black text-white">{maxCrowdRecord} 人</div>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGameState('STAGE_SELECT')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg transition shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-6 h-6 fill-white" />
                <span>バトル開始</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState('SHOP')}
                  className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>ショップ・強化</span>
                </button>
                <button
                  onClick={() => startStage(clearedStage)}
                  className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>最新ステージ {clearedStage}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ステージ選択画面 */}
      {gameState === 'STAGE_SELECT' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-black text-white text-center mb-1">ステージ選択</h2>
            <p className="text-slate-400 text-xs text-center mb-6">全5つの激闘コースを制覇せよ！</p>

            <div className="flex flex-col gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((sNum) => {
                const isLocked = sNum > clearedStage;
                const stageData = getStageData(sNum);
                return (
                  <button
                    key={sNum}
                    disabled={isLocked}
                    onClick={() => startStage(sNum)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isLocked
                        ? 'bg-slate-900/40 border-slate-800/50 text-slate-600 opacity-60 cursor-not-allowed'
                        : sNum === clearedStage
                        ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-500/50 text-white hover:border-blue-400 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base ${
                          isLocked ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white shadow'
                        }`}
                      >
                        {sNum}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">{stageData.name}</div>
                        <div className="text-[11px] text-slate-400">
                          ボス: {stageData.boss.name} (HP: {stageData.boss.maxHp})
                        </div>
                      </div>
                    </div>

                    <div>
                      {isLocked ? (
                        <span className="text-xs text-slate-600 font-bold">🔒 LOCKED</span>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setGameState('TITLE')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition border border-slate-700 cursor-pointer"
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {/* 3. ショップ & アップグレード画面 */}
      {gameState === 'SHOP' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 overflow-y-auto">
          <div className="w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white">パワーアップ＆スキン</h2>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{totalCoins}</span>
              </div>
            </div>

            {/* パワーアップリスト */}
            <div className="mb-5">
              <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">能力アップグレード</div>
              <div className="space-y-2.5">
                {/* 初期人数 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">初期人数</div>
                      <div className="text-[11px] text-slate-400">
                        スタート時 +{(upgrades.startCrowdLevel - 1) * 3 + 1} 人 (Lv.{upgrades.startCrowdLevel})
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={totalCoins < getUpgradeCost(upgrades.startCrowdLevel) || upgrades.startCrowdLevel >= 10}
                    onClick={() => buyUpgrade('startCrowdLevel')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{upgrades.startCrowdLevel >= 10 ? 'MAX' : `${getUpgradeCost(upgrades.startCrowdLevel)} コイン`}</span>
                  </button>
                </div>

                {/* 攻撃力 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">攻撃力</div>
                      <div className="text-[11px] text-slate-400">
                        相打ち優位率 +{(upgrades.attackPowerLevel - 1) * 40}% (Lv.{upgrades.attackPowerLevel})
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={totalCoins < getUpgradeCost(upgrades.attackPowerLevel) || upgrades.attackPowerLevel >= 10}
                    onClick={() => buyUpgrade('attackPowerLevel')}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{upgrades.attackPowerLevel >= 10 ? 'MAX' : `${getUpgradeCost(upgrades.attackPowerLevel)} コイン`}</span>
                  </button>
                </div>

                {/* コイン倍率 */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">コインボーナス</div>
                      <div className="text-[11px] text-slate-400">
                        獲得コイン +{(upgrades.coinBonusLevel - 1) * 25}% (Lv.{upgrades.coinBonusLevel})
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={totalCoins < getUpgradeCost(upgrades.coinBonusLevel) || upgrades.coinBonusLevel >= 10}
                    onClick={() => buyUpgrade('coinBonusLevel')}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>{upgrades.coinBonusLevel >= 10 ? 'MAX' : `${getUpgradeCost(upgrades.coinBonusLevel)} コイン`}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* スキン選択 */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">スキン選択</div>
              <div className="grid grid-cols-5 gap-2">
                {skins.map((s) => {
                  const isEquipped = s.id === selectedSkinId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectOrBuySkin(s)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer relative ${
                        isEquipped
                          ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/40'
                          : s.unlocked
                          ? 'border-slate-700 bg-slate-900/80 hover:border-slate-600'
                          : 'border-slate-800 bg-slate-900/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full mb-1 flex items-center justify-center shadow"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.accessory === 'crown' && <span className="text-xs">👑</span>}
                        {s.accessory === 'ninja' && <span className="text-xs">🥷</span>}
                        {s.accessory === 'helmet' && <span className="text-xs">⛑️</span>}
                        {s.accessory === 'cat' && <span className="text-xs">🐱</span>}
                      </div>
                      <span className="text-[10px] font-bold truncate max-w-full text-white">{s.name.slice(0, 4)}</span>
                      {!s.unlocked && (
                        <span className="text-[9px] text-amber-400 font-extrabold mt-0.5">{s.cost}C</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setGameState('TITLE')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition border border-slate-700 cursor-pointer"
            >
              タイトルへ戻る
            </button>
          </div>
        </div>
      )}

      {/* 4. ゲームオーバー画面 */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-in zoom-in-95 duration-200">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-3xl font-black text-rose-400 mb-1">全滅... GAME OVER</h2>
            <p className="text-slate-400 text-xs mb-6">仲間が尽きてしまいました！</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => startStage(stageNum)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>リトライ</span>
              </button>
              <button
                onClick={() => setGameState('TITLE')}
                className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition border border-slate-700 cursor-pointer"
              >
                タイトル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ステージクリア画面 */}
      {gameState === 'STAGE_CLEAR' && stageResult && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 animate-in zoom-in-95 duration-300">
          <div className="text-center max-w-md w-full">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>STAGE CLEARED!</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mb-4 drop-shadow">
              VICTORY!
            </h2>

            {/* 結果カード */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-6 space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">生存仲間数</span>
                <span className="font-black text-white text-base">{stageResult.finalCrowd} 人</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">タワー到達倍率</span>
                <span className="font-black text-amber-400 text-base">×{stageResult.multiplier.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">獲得コイン</span>
                <span className="font-black text-amber-300 text-base">+{stageResult.coinsEarned} 🪙</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-300 font-bold">トータルスコア</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-cyan-300">
                    {stageResult.score.toLocaleString()}
                  </span>
                  {stageResult.isNewRecord && (
                    <span className="block text-[10px] text-amber-400 font-black">NEW RECORD! 🔥</span>
                  )}
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 justify-center">
              {stageNum < 5 ? (
                <button
                  onClick={() => startStage(stageNum + 1)}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>次のステージへ</span>
                </button>
              ) : (
                <button
                  onClick={() => startStage(1)}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>最初から挑戦</span>
                </button>
              )}
              <button
                onClick={() => setGameState('TITLE')}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition border border-slate-700 cursor-pointer"
              >
                タイトル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
