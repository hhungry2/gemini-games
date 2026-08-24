import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  RotateCcw,
  Zap,
  Bomb,
  Shield,
  MousePointer,
  Crosshair,
  Award,
} from 'lucide-react';
import { sound } from '../utils/audio';

const HIGH_SCORE_KEY = 'star_striker_high_score';

interface SpaceShooterGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// 難易度
type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
// ゲームモード
type GameMode = 'CAMPAIGN' | 'ENDLESS' | 'BOSS_RUSH';
// ゲーム状態
type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

// 基本エンティティ型
interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  alpha: number;
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
  alpha: number;
  shape?: 'circle' | 'spark' | 'ring';
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
  fontSize: number;
}

interface PlayerBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  isHoming?: boolean;
  targetEnemyId?: number | null;
  glow?: string;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
}

interface DropItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'power' | 'shield' | 'bomb' | 'gem';
  radius: number;
  collected: boolean;
}

interface Enemy {
  id: number;
  type: 'scout' | 'fighter' | 'cruiser' | 'spinner';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  shootTimer: number;
  shootInterval: number;
  patternStep: number;
  hitFlash: number;
  color: string;
  glowColor: string;
  behaviorTimer: number;
  sineOffset?: number;
}

interface BossPart {
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  name: string;
}

interface Boss {
  name: string;
  title: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  stage: number;
  phase: number;
  maxPhases: number;
  shootTimer: number;
  specialTimer: number;
  hitFlash: number;
  parts: BossPart[];
  color: string;
  glowColor: string;
  patternAngle: number;
}

export const SpaceShooterGame: React.FC<SpaceShooterGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ステート
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      if (saved) return parseInt(saved, 10) || 0;
    }
    return 0;
  });

  const [lives, setLives] = useState<number>(3);
  const [shield, setShield] = useState<number>(100);
  const [bombs, setBombs] = useState<number>(3);
  const [, setPowerLevel] = useState<number>(1);
  const [, setCombo] = useState<number>(0);
  const [, setCurrentStage] = useState<number>(1);
  const [enemiesKilled, setEnemiesKilled] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [autoFire, setAutoFire] = useState<boolean>(true);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(sound.getMuted());
  const [controlMode, setControlMode] = useState<'keyboard' | 'mouse' | 'touch'>('keyboard');

  // サウンドのトグル
  const toggleSound = () => {
    const next = !isSoundMuted;
    sound.setMuted(next);
    setIsSoundMuted(next);
  };

  // 内部ゲームロジック用 Ref
  const gameRef = useRef({
    state: 'MENU' as GameState,
    difficulty: 'NORMAL' as Difficulty,
    gameMode: 'CAMPAIGN' as GameMode,
    score: 0,
    highScore: 0,
    lives: 3,
    shield: 100,
    maxShield: 100,
    bombs: 3,
    powerLevel: 1,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    stage: 1,
    stageTimer: 0,
    enemiesKilled: 0,
    autoFire: true,
    
    // 自機
    player: {
      x: 270,
      y: 680,
      width: 38,
      height: 46,
      hitboxRadius: 4, // 精密コア判定
      speed: 6.5,
      focusSpeed: 3.2,
      invulnerableTimer: 0,
      shootCooldown: 0,
      bombCooldown: 0,
      roll: 0, // 傾きアニメーション (-1 to 1)
      optionAngle: 0,
    },

    // 入力
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      shoot: false,
      bomb: false,
      focus: false,
    },
    mousePos: { x: 270, y: 680, active: false, down: false },
    touchPos: { x: 270, y: 680, active: false, isDragging: false },

    // 配列
    stars: [] as Star[],
    nebulae: [] as NebulaCloud[],
    playerBullets: [] as PlayerBullet[],
    enemyBullets: [] as EnemyBullet[],
    enemies: [] as Enemy[],
    items: [] as DropItem[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    boss: null as Boss | null,

    // 演出状態
    warningTimer: 0,
    screenShake: 0,
    screenFlash: 0,
    bombShockwave: 0,
    bombActive: false,
    slowMotionTimer: 0,

    // 生成カウンター
    nextEnemyId: 1,
    nextItemId: 1,
    enemySpawnTimer: 0,
    waveIndex: 0,

    // 音声
    audioCtx: null as AudioContext | null,
    bgmTimer: null as number | null,
    bgmStep: 0,
  });

  // ハイスコア更新
  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        return newScore;
      }
      return prev;
    });
  }, []);

  // Web Audio シンセサイザー効果音 & BGM
  const playSoundEffect = useCallback((type: 'laser' | 'laser_heavy' | 'hit' | 'explosion' | 'boss_explosion' | 'item' | 'powerup' | 'bomb' | 'warning' | 'shield_loss' | 'combo') => {
    if (sound.getMuted()) return;
    const g = gameRef.current;
    if (!g.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        g.audioCtx = new AudioCtxClass();
      }
    }
    if (!g.audioCtx) return;
    if (g.audioCtx.state === 'suspended') {
      g.audioCtx.resume().catch(() => {});
    }

    const ctx = g.audioCtx;
    const now = ctx.currentTime;

    try {
      if (type === 'laser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'laser_heavy') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'hit') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'explosion') {
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        oscGain.gain.setValueAtTime(0.15, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'boss_explosion') {
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.15;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120 - i * 15, t);
          osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.4);
        }
      } else if (type === 'item') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(990, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'powerup') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.05);
          gain.gain.setValueAtTime(0.12, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.12);
        });
      } else if (type === 'bomb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'warning') {
        for (let i = 0; i < 2; i++) {
          const t = now + i * 0.25;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, t);
          osc.frequency.setValueAtTime(660, t + 0.12);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.22);
        }
      } else if (type === 'shield_loss') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'combo') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const baseFreq = 440 + Math.min(gameRef.current.combo, 20) * 40;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {}
  }, []);

  // BGM シーケンサー (シンセウェーブ / スペースシューティング用)
  const tickBgm = useCallback(() => {
    const g = gameRef.current;
    if (sound.getMuted() || g.state !== 'PLAYING' || !g.audioCtx) {
      g.bgmStep++;
      return;
    }
    const ctx = g.audioCtx;
    const now = ctx.currentTime;
    const step = g.bgmStep;

    const isBoss = g.boss !== null;

    const scaleStage1 = [110, 130.81, 146.83, 164.81, 196.0, 220, 261.63];
    const scaleBoss = [98.0, 116.54, 130.81, 146.83, 155.56, 196.0, 233.08];

    const currentScale = isBoss ? scaleBoss : scaleStage1;
    const root = currentScale[0];
    const fifth = currentScale[3] || root * 1.5;

    const bassNote = step % 4 === 0 ? root : step % 4 === 2 ? fifth : 0;
    const arpIndex = (step * (isBoss ? 3 : 2)) % currentScale.length;
    const leadFreq = currentScale[arpIndex] * (isBoss ? 2 : 2.5);

    try {
      if (bassNote > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassNote, now);
        gain.gain.setValueAtTime(isBoss ? 0.08 : 0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      if (step % 2 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isBoss ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(leadFreq, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }

      if (step % 4 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.09);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (step % 4 === 2) {
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        noise.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      }
    } catch {}

    g.bgmStep++;
  }, []);

  const startBgm = useCallback(() => {
    const g = gameRef.current;
    if (g.bgmTimer) clearInterval(g.bgmTimer);
    const bpm = g.boss ? 150 : 135;
    const intervalMs = (60 / bpm / 4) * 1000;
    g.bgmTimer = window.setInterval(tickBgm, intervalMs);
  }, [tickBgm]);

  const stopBgm = useCallback(() => {
    const g = gameRef.current;
    if (g.bgmTimer) {
      clearInterval(g.bgmTimer);
      g.bgmTimer = null;
    }
  }, []);

  const initBackground = useCallback(() => {
    const g = gameRef.current;
    g.stars = [];
    for (let i = 0; i < 90; i++) {
      g.stars.push({
        x: Math.random() * 540,
        y: Math.random() * 800,
        speed: 0.5 + Math.random() * 3.5,
        size: 0.8 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.8,
        color: ['#ffffff', '#a5f3fc', '#c4b5fd', '#fde047', '#f472b6'][Math.floor(Math.random() * 5)],
      });
    }

    g.nebulae = [];
    for (let i = 0; i < 4; i++) {
      g.nebulae.push({
        x: Math.random() * 540,
        y: Math.random() * 800,
        radius: 120 + Math.random() * 100,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][i % 4],
        speed: 0.3 + Math.random() * 0.4,
        alpha: 0.08 + Math.random() * 0.08,
      });
    }
  }, []);

  const startGame = useCallback((mode: GameMode = 'CAMPAIGN', diff: Difficulty = 'NORMAL') => {
    const g = gameRef.current;
    g.state = 'PLAYING';
    g.gameMode = mode;
    g.difficulty = diff;
    g.score = 0;
    g.lives = diff === 'EASY' ? 4 : diff === 'NORMAL' ? 3 : 2;
    g.shield = 100;
    g.maxShield = 100;
    g.bombs = diff === 'EASY' ? 4 : 3;
    g.powerLevel = 1;
    g.combo = 0;
    g.comboTimer = 0;
    g.maxCombo = 0;
    g.stage = 1;
    g.stageTimer = 0;
    g.enemiesKilled = 0;
    
    g.player.x = 270;
    g.player.y = 680;
    g.player.invulnerableTimer = 120;
    g.player.shootCooldown = 0;
    g.player.bombCooldown = 0;

    g.playerBullets = [];
    g.enemyBullets = [];
    g.enemies = [];
    g.items = [];
    g.particles = [];
    g.floatingTexts = [];
    g.boss = null;
    g.warningTimer = 0;
    g.screenShake = 0;
    g.screenFlash = 0;
    g.bombShockwave = 0;
    g.bombActive = false;
    g.waveIndex = 0;
    g.enemySpawnTimer = 0;

    setGameState('PLAYING');
    setScore(0);
    setLives(g.lives);
    setShield(100);
    setBombs(g.bombs);
    setPowerLevel(1);
    setCombo(0);
    setMaxCombo(0);
    setCurrentStage(1);
    setEnemiesKilled(0);

    initBackground();
    startBgm();

    g.floatingTexts.push({
      x: 270,
      y: 400,
      text: mode === 'BOSS_RUSH' ? 'BOSS RUSH START!' : 'MISSION START',
      color: '#38bdf8',
      alpha: 1,
      life: 90,
      maxLife: 90,
      vy: -0.5,
      fontSize: 28,
    });
  }, [initBackground, startBgm]);

  const triggerBomb = useCallback(() => {
    const g = gameRef.current;
    if (g.state !== 'PLAYING' || g.bombs <= 0 || g.player.bombCooldown > 0) return;

    g.bombs--;
    setBombs(g.bombs);
    g.player.bombCooldown = 90;
    g.bombActive = true;
    g.bombShockwave = 1;
    g.screenShake = 25;
    g.screenFlash = 0.8;

    playSoundEffect('bomb');

    g.enemyBullets = [];

    g.enemies.forEach((enemy) => {
      enemy.hp -= 200;
      enemy.hitFlash = 10;
    });

    if (g.boss) {
      g.boss.hp -= 350;
      g.boss.hitFlash = 15;
    }

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      g.particles.push({
        x: g.player.x,
        y: g.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 30,
        maxLife: 70,
        color: ['#38bdf8', '#818cf8', '#f43f5e', '#fbbf24'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 5,
        alpha: 1,
        shape: 'spark',
      });
    }

    g.floatingTexts.push({
      x: g.player.x,
      y: g.player.y - 40,
      text: 'HYPER BOMB!!',
      color: '#f43f5e',
      alpha: 1,
      life: 60,
      maxLife: 60,
      vy: -1,
      fontSize: 22,
    });
  }, [playSoundEffect]);

  const spawnBoss = useCallback((stage: number) => {
    const g = gameRef.current;
    g.warningTimer = 180;
    playSoundEffect('warning');

    let bossName = 'GALAXY TITAN';
    let bossTitle = 'Stage 1 Flagship Heavy Cruiser';
    let bossHp = 2200;
    let parts: BossPart[] = [
      { xOffset: -65, yOffset: -10, width: 34, height: 44, hp: 400, maxHp: 400, destroyed: false, name: 'Left Wing Cannon' },
      { xOffset: 65, yOffset: -10, width: 34, height: 44, hp: 400, maxHp: 400, destroyed: false, name: 'Right Wing Cannon' },
    ];
    let color = '#3b82f6';
    let glowColor = '#60a5fa';

    if (stage === 2) {
      bossName = 'VOID DREADNOUGHT';
      bossTitle = 'Stage 2 Cyber Fortress Engine';
      bossHp = 3800;
      parts = [
        { xOffset: -75, yOffset: -20, width: 38, height: 50, hp: 600, maxHp: 600, destroyed: false, name: 'Plasma Array L' },
        { xOffset: 75, yOffset: -20, width: 38, height: 50, hp: 600, maxHp: 600, destroyed: false, name: 'Plasma Array R' },
        { xOffset: 0, yOffset: 45, width: 44, height: 35, hp: 800, maxHp: 800, destroyed: false, name: 'Sub-Core Gate' },
      ];
      color = '#8b5cf6';
      glowColor = '#c084fc';
    } else if (stage >= 3) {
      bossName = 'OMEGA CHRONOS';
      bossTitle = 'Final Weapon: The Matrix Core';
      bossHp = 6000;
      parts = [
        { xOffset: -85, yOffset: 0, width: 40, height: 55, hp: 900, maxHp: 900, destroyed: false, name: 'Chronos Wing Alpha' },
        { xOffset: 85, yOffset: 0, width: 40, height: 55, hp: 900, maxHp: 900, destroyed: false, name: 'Chronos Wing Beta' },
        { xOffset: -40, yOffset: 50, width: 30, height: 35, hp: 700, maxHp: 700, destroyed: false, name: 'Laser Turret A' },
        { xOffset: 40, yOffset: 50, width: 30, height: 35, hp: 700, maxHp: 700, destroyed: false, name: 'Laser Turret B' },
      ];
      color = '#ef4444';
      glowColor = '#f87171';
    }

    if (g.difficulty === 'EASY') bossHp *= 0.7;
    if (g.difficulty === 'HARD') bossHp *= 1.35;

    g.boss = {
      name: bossName,
      title: bossTitle,
      x: 270,
      y: -120,
      targetX: 270,
      targetY: 160,
      width: 170,
      height: 120,
      hp: bossHp,
      maxHp: bossHp,
      stage,
      phase: 1,
      maxPhases: stage >= 3 ? 3 : 2,
      shootTimer: 0,
      specialTimer: 0,
      hitFlash: 0,
      parts,
      color,
      glowColor,
      patternAngle: 0,
    };
  }, [playSoundEffect]);

  const firePlayerBullets = useCallback(() => {
    const g = gameRef.current;
    const { x, y } = g.player;
    const lvl = g.powerLevel;

    playSoundEffect(lvl >= 4 ? 'laser_heavy' : 'laser');

    const createBullet = (bx: number, by: number, vx: number, vy: number, dmg: number, col: string, isHoming = false) => {
      g.playerBullets.push({
        x: bx,
        y: by,
        vx,
        vy,
        damage: dmg,
        radius: isHoming ? 4.5 : 3.5,
        color: col,
        isHoming,
        glow: col,
      });
    };

    if (lvl === 1) {
      createBullet(x, y - 18, 0, -14, 25, '#38bdf8');
    } else if (lvl === 2) {
      createBullet(x - 8, y - 16, 0, -14, 22, '#38bdf8');
      createBullet(x + 8, y - 16, 0, -14, 22, '#38bdf8');
    } else if (lvl === 3) {
      createBullet(x, y - 18, 0, -15, 24, '#38bdf8');
      createBullet(x - 12, y - 14, -2.5, -14, 18, '#818cf8');
      createBullet(x + 12, y - 14, 2.5, -14, 18, '#818cf8');
    } else if (lvl === 4) {
      createBullet(x, y - 18, 0, -15, 26, '#38bdf8');
      createBullet(x - 10, y - 16, -1.8, -14.5, 20, '#818cf8');
      createBullet(x + 10, y - 16, 1.8, -14.5, 20, '#818cf8');
      createBullet(x - 18, y - 12, -4.2, -13, 16, '#c084fc');
      createBullet(x + 18, y - 12, 4.2, -13, 16, '#c084fc');

      if (Math.random() < 0.6) {
        createBullet(x - 22, y, -4, -6, 28, '#fbbf24', true);
        createBullet(x + 22, y, 4, -6, 28, '#fbbf24', true);
      }
    } else {
      createBullet(x, y - 20, 0, -16, 30, '#38bdf8');
      createBullet(x - 10, y - 18, -2, -15, 24, '#818cf8');
      createBullet(x + 10, y - 18, 2, -15, 24, '#818cf8');
      createBullet(x - 20, y - 14, -4.5, -14, 18, '#c084fc');
      createBullet(x + 20, y - 14, 4.5, -14, 18, '#c084fc');

      createBullet(x - 24, y, -5, -7, 32, '#fbbf24', true);
      createBullet(x + 24, y, 5, -7, 32, '#fbbf24', true);

      const optDist = 36;
      const optAngle = g.player.optionAngle;
      const opt1X = x + Math.cos(optAngle) * optDist;
      const opt1Y = y + Math.sin(optAngle) * optDist * 0.5;
      const opt2X = x + Math.cos(optAngle + Math.PI) * optDist;
      const opt2Y = y + Math.sin(optAngle + Math.PI) * optDist * 0.5;

      createBullet(opt1X, opt1Y - 10, 0, -16, 20, '#4ade80');
      createBullet(opt2X, opt2Y - 10, 0, -16, 20, '#4ade80');
    }

    for (let i = 0; i < 3; i++) {
      g.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y - 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 3,
        life: 8,
        maxLife: 8,
        color: '#67e8f9',
        size: 2 + Math.random() * 2,
        alpha: 0.9,
      });
    }
  }, [playSoundEffect]);

  const dropItem = useCallback((x: number, y: number, chance = 1.0) => {
    const g = gameRef.current;
    if (Math.random() > chance) return;

    const rand = Math.random();
    let type: 'power' | 'shield' | 'bomb' | 'gem' = 'gem';

    if (rand < 0.28) {
      type = 'power';
    } else if (rand < 0.42) {
      type = 'shield';
    } else if (rand < 0.52) {
      type = 'bomb';
    } else {
      type = 'gem';
    }

    g.items.push({
      id: g.nextItemId++,
      x,
      y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -2 - Math.random() * 2,
      type,
      radius: 12,
      collected: false,
    });
  }, []);

  const createExplosion = useCallback((x: number, y: number, size = 1, isBoss = false) => {
    const g = gameRef.current;
    g.screenShake = Math.max(g.screenShake, isBoss ? 18 : size * 4);

    playSoundEffect(isBoss ? 'boss_explosion' : 'explosion');

    const count = isBoss ? 80 : 16 * size;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1 + Math.random() * 6) * (isBoss ? 1.8 : size);
      g.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 25,
        maxLife: 45,
        color: ['#fbbf24', '#f97316', '#ef4444', '#ffffff', '#a855f7'][Math.floor(Math.random() * 5)],
        size: 2 + Math.random() * (isBoss ? 6 : 4),
        alpha: 1,
        shape: Math.random() < 0.3 ? 'ring' : 'circle',
      });
    }
  }, [playSoundEffect]);

  // メインゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      const g = gameRef.current;

      if (g.slowMotionTimer > 0) {
        g.slowMotionTimer--;
      }

      g.stars.forEach((star) => {
        star.y += star.speed * (g.boss ? 0.6 : 1);
        if (star.y > 800) {
          star.y = 0;
          star.x = Math.random() * 540;
        }
      });

      g.nebulae.forEach((neb) => {
        neb.y += neb.speed;
        if (neb.y - neb.radius > 800) {
          neb.y = -neb.radius;
          neb.x = Math.random() * 540;
        }
      });

      if (g.screenShake > 0) {
        g.screenShake *= 0.88;
        if (g.screenShake < 0.2) g.screenShake = 0;
      }
      if (g.screenFlash > 0) {
        g.screenFlash *= 0.85;
      }
      if (g.bombShockwave > 0) {
        g.bombShockwave += 18;
        if (g.bombShockwave > 900) {
          g.bombShockwave = 0;
          g.bombActive = false;
        }
      }

      if (g.state === 'PLAYING') {
        g.stageTimer++;
        g.player.optionAngle += 0.05;

        if (g.comboTimer > 0) {
          g.comboTimer--;
          if (g.comboTimer === 0) {
            g.combo = 0;
            setCombo(0);
          }
        }

        if (g.player.invulnerableTimer > 0) {
          g.player.invulnerableTimer--;
        }
        if (g.player.bombCooldown > 0) {
          g.player.bombCooldown--;
        }

        if (g.warningTimer > 0) {
          g.warningTimer--;
        }

        let moveX = 0;
        let moveY = 0;
        const currentSpeed = g.keys.focus ? g.player.focusSpeed : g.player.speed;

        if (g.keys.left) moveX -= 1;
        if (g.keys.right) moveX += 1;
        if (g.keys.up) moveY -= 1;
        if (g.keys.down) moveY += 1;

        if (moveX !== 0 && moveY !== 0) {
          moveX *= 0.7071;
          moveY *= 0.7071;
        }

        g.player.x += moveX * currentSpeed;
        g.player.y += moveY * currentSpeed;

        if (g.mousePos.active) {
          const dx = g.mousePos.x - g.player.x;
          const dy = g.mousePos.y - g.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 3) {
            g.player.x += (dx / dist) * Math.min(dist * 0.15, g.player.speed * 1.5);
            g.player.y += (dy / dist) * Math.min(dist * 0.15, g.player.speed * 1.5);
          }
        }

        if (g.touchPos.active && g.touchPos.isDragging) {
          const dx = g.touchPos.x - g.player.x;
          const dy = g.touchPos.y - g.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 2) {
            g.player.x += dx * 0.25;
            g.player.y += dy * 0.25;
          }
        }

        g.player.x = Math.max(24, Math.min(516, g.player.x));
        g.player.y = Math.max(30, Math.min(760, g.player.y));

        const isItemMagnetLine = g.player.y < 220;
        if (isItemMagnetLine) {
          g.items.forEach((item) => {
            const dx = g.player.x - item.x;
            const dy = g.player.y - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
              item.x += (dx / dist) * 12;
              item.y += (dy / dist) * 12;
            }
          });
        }

        if (moveX < 0 || (g.mousePos.active && g.mousePos.x < g.player.x - 5)) {
          g.player.roll = Math.max(-1, g.player.roll - 0.2);
        } else if (moveX > 0 || (g.mousePos.active && g.mousePos.x > g.player.x + 5)) {
          g.player.roll = Math.min(1, g.player.roll + 0.2);
        } else {
          g.player.roll *= 0.75;
        }

        const wantsToShoot = g.autoFire || g.keys.shoot || g.mousePos.down;
        if (g.player.shootCooldown > 0) {
          g.player.shootCooldown--;
        } else if (wantsToShoot) {
          firePlayerBullets();
          g.player.shootCooldown = 7;
        }

        for (let i = g.playerBullets.length - 1; i >= 0; i--) {
          const b = g.playerBullets[i];

          if (b.isHoming) {
            let target: { x: number; y: number } | null = null;
            if (g.boss && g.boss.hp > 0) {
              target = g.boss;
            } else if (g.enemies.length > 0) {
              let minDist = 9999;
              g.enemies.forEach((e) => {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if (dist < minDist) {
                  minDist = dist;
                  target = e;
                }
              });
            }

            if (target) {
              const tx: number = (target as { x: number; y: number }).x;
              const ty: number = (target as { x: number; y: number }).y;
              const angle = Math.atan2(ty - b.y, tx - b.x);
              b.vx += Math.cos(angle) * 1.2;
              b.vy += Math.sin(angle) * 1.2;
              const curSpeed = Math.hypot(b.vx, b.vy);
              if (curSpeed > 14) {
                b.vx = (b.vx / curSpeed) * 14;
                b.vy = (b.vy / curSpeed) * 14;
              }
            }
          }

          b.x += b.vx;
          b.y += b.vy;

          if (b.y < -30 || b.y > 830 || b.x < -30 || b.x > 570) {
            g.playerBullets.splice(i, 1);
            continue;
          }

          let bulletHit = false;

          for (let j = g.enemies.length - 1; j >= 0; j--) {
            const enemy = g.enemies[j];
            if (
              Math.abs(b.x - enemy.x) < enemy.width * 0.5 + b.radius &&
              Math.abs(b.y - enemy.y) < enemy.height * 0.5 + b.radius
            ) {
              enemy.hp -= b.damage;
              enemy.hitFlash = 5;
              bulletHit = true;
              playSoundEffect('hit');

              g.particles.push({
                x: b.x,
                y: b.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 10,
                maxLife: 10,
                color: b.color,
                size: 2.5,
                alpha: 0.9,
              });

              if (enemy.hp <= 0) {
                const addScore = enemy.scoreValue * (1 + g.combo * 0.1);
                g.score += Math.round(addScore);
                g.enemiesKilled++;
                g.combo++;
                g.comboTimer = 160;
                if (g.combo > g.maxCombo) g.maxCombo = g.combo;

                setScore(g.score);
                setCombo(g.combo);
                setMaxCombo(g.maxCombo);
                setEnemiesKilled(g.enemiesKilled);

                createExplosion(enemy.x, enemy.y, enemy.type === 'cruiser' ? 2.2 : 1.2);
                dropItem(enemy.x, enemy.y, enemy.type === 'cruiser' ? 0.9 : 0.4);

                g.floatingTexts.push({
                  x: enemy.x,
                  y: enemy.y,
                  text: `+${Math.round(addScore)}`,
                  color: '#fbbf24',
                  alpha: 1,
                  life: 40,
                  maxLife: 40,
                  vy: -1.2,
                  fontSize: 13,
                });

                if (g.combo > 0 && g.combo % 5 === 0) {
                  playSoundEffect('combo');
                  g.floatingTexts.push({
                    x: 270,
                    y: 320,
                    text: `${g.combo}x COMBO!`,
                    color: '#f43f5e',
                    alpha: 1,
                    life: 50,
                    maxLife: 50,
                    vy: -0.8,
                    fontSize: 20,
                  });
                }

                g.enemies.splice(j, 1);
              }
              break;
            }
          }

          if (!bulletHit && g.boss && g.boss.hp > 0 && g.warningTimer === 0) {
            const boss = g.boss;

            let hitPart = false;
            for (const part of boss.parts) {
              if (!part.destroyed) {
                const px = boss.x + part.xOffset;
                const py = boss.y + part.yOffset;
                if (
                  Math.abs(b.x - px) < part.width * 0.5 + b.radius &&
                  Math.abs(b.y - py) < part.height * 0.5 + b.radius
                ) {
                  part.hp -= b.damage;
                  boss.hitFlash = 5;
                  hitPart = true;
                  bulletHit = true;
                  playSoundEffect('hit');

                  if (part.hp <= 0) {
                    part.destroyed = true;
                    createExplosion(px, py, 2.0);
                    dropItem(px, py, 1.0);
                    g.score += 2500;
                    setScore(g.score);
                    g.floatingTexts.push({
                      x: px,
                      y: py,
                      text: `${part.name} DESTROYED!`,
                      color: '#38bdf8',
                      alpha: 1,
                      life: 60,
                      maxLife: 60,
                      vy: -1,
                      fontSize: 14,
                    });
                  }
                  break;
                }
              }
            }

            if (!hitPart && Math.abs(b.x - boss.x) < boss.width * 0.5 && Math.abs(b.y - boss.y) < boss.height * 0.5) {
              boss.hp -= b.damage;
              boss.hitFlash = 5;
              bulletHit = true;
              playSoundEffect('hit');

              if (boss.hp <= 0) {
                boss.hp = 0;
                createExplosion(boss.x, boss.y, 4.0, true);
                dropItem(boss.x - 30, boss.y, 1.0);
                dropItem(boss.x + 30, boss.y, 1.0);
                dropItem(boss.x, boss.y - 20, 1.0);

                const bossClearScore = 20000 * boss.stage;
                g.score += bossClearScore;
                setScore(g.score);
                updateHighScore(g.score);

                g.floatingTexts.push({
                  x: 270,
                  y: 360,
                  text: 'BOSS DESTROYED!!',
                  color: '#fbbf24',
                  alpha: 1,
                  life: 120,
                  maxLife: 120,
                  vy: -0.5,
                  fontSize: 26,
                });

                if (g.gameMode === 'BOSS_RUSH' || g.stage >= 3) {
                  g.state = 'VICTORY';
                  setGameState('VICTORY');
                  stopBgm();
                  sound.playWin();
                } else {
                  g.stage++;
                  setCurrentStage(g.stage);
                  g.stageTimer = 0;
                  g.waveIndex = 0;
                  g.boss = null;
                  g.enemyBullets = [];
                  g.floatingTexts.push({
                    x: 270,
                    y: 420,
                    text: `STAGE ${g.stage} START`,
                    color: '#38bdf8',
                    alpha: 1,
                    life: 90,
                    maxLife: 90,
                    vy: -0.5,
                    fontSize: 24,
                  });
                }
              }
            }
          }

          if (bulletHit) {
            g.playerBullets.splice(i, 1);
          }
        }

        if (!g.boss) {
          g.enemySpawnTimer++;

          const bossSpawnThreshold = g.gameMode === 'ENDLESS' ? 999999 : g.gameMode === 'BOSS_RUSH' ? 120 : 1800;
          if (g.stageTimer > bossSpawnThreshold && g.enemies.length === 0) {
            spawnBoss(g.stage);
          } else {
            const spawnRate = g.difficulty === 'EASY' ? 85 : g.difficulty === 'NORMAL' ? 65 : 45;
            if (g.enemySpawnTimer > spawnRate) {
              g.enemySpawnTimer = 0;
              g.waveIndex++;

              const randType = Math.random();
              const spawnX = 40 + Math.random() * 460;

              if (randType < 0.45) {
                for (let k = 0; k < 3; k++) {
                  g.enemies.push({
                    id: g.nextEnemyId++,
                    type: 'scout',
                    x: spawnX + (k - 1) * 35,
                    y: -30 - k * 30,
                    vx: 0,
                    vy: 3.2,
                    width: 28,
                    height: 28,
                    hp: 40 + g.stage * 15,
                    maxHp: 40 + g.stage * 15,
                    scoreValue: 200,
                    shootTimer: 30 + k * 15,
                    shootInterval: 70,
                    patternStep: 0,
                    hitFlash: 0,
                    color: '#38bdf8',
                    glowColor: '#0284c7',
                    behaviorTimer: 0,
                    sineOffset: Math.random() * Math.PI * 2,
                  });
                }
              } else if (randType < 0.75) {
                g.enemies.push({
                  id: g.nextEnemyId++,
                  type: 'fighter',
                  x: spawnX,
                  y: -40,
                  vx: (Math.random() - 0.5) * 3,
                  vy: 2.2,
                  width: 38,
                  height: 38,
                  hp: 120 + g.stage * 40,
                  maxHp: 120 + g.stage * 40,
                  scoreValue: 500,
                  shootTimer: 40,
                  shootInterval: 60,
                  patternStep: 0,
                  hitFlash: 0,
                  color: '#ec4899',
                  glowColor: '#db2777',
                  behaviorTimer: 0,
                });
              } else if (randType < 0.9) {
                g.enemies.push({
                  id: g.nextEnemyId++,
                  type: 'spinner',
                  x: spawnX,
                  y: -35,
                  vx: (Math.random() - 0.5) * 2,
                  vy: 3.8,
                  width: 32,
                  height: 32,
                  hp: 70 + g.stage * 25,
                  maxHp: 70 + g.stage * 25,
                  scoreValue: 350,
                  shootTimer: 999,
                  shootInterval: 999,
                  patternStep: 0,
                  hitFlash: 0,
                  color: '#eab308',
                  glowColor: '#ca8a04',
                  behaviorTimer: 0,
                });
              } else {
                g.enemies.push({
                  id: g.nextEnemyId++,
                  type: 'cruiser',
                  x: spawnX,
                  y: -60,
                  vx: 0,
                  vy: 1.1,
                  width: 64,
                  height: 56,
                  hp: 450 + g.stage * 150,
                  maxHp: 450 + g.stage * 150,
                  scoreValue: 1200,
                  shootTimer: 50,
                  shootInterval: 80,
                  patternStep: 0,
                  hitFlash: 0,
                  color: '#a855f7',
                  glowColor: '#9333ea',
                  behaviorTimer: 0,
                });
              }
            }
          }
        }

        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i];
          e.behaviorTimer++;
          if (e.hitFlash > 0) e.hitFlash--;

          if (e.type === 'scout') {
            e.y += e.vy;
            if (e.sineOffset !== undefined) {
              e.x += Math.sin(e.behaviorTimer * 0.08 + e.sineOffset) * 2.2;
            }
          } else if (e.type === 'fighter') {
            e.y += e.vy;
            e.x += e.vx;
            if (e.x < 40 || e.x > 500) e.vx *= -1;
          } else if (e.type === 'spinner') {
            e.y += e.vy;
            e.x += e.vx;
          } else if (e.type === 'cruiser') {
            e.y += e.vy;
            if (e.y > 180 && e.behaviorTimer < 300) {
              e.vy = 0.2;
            } else if (e.behaviorTimer >= 300) {
              e.vy = 2.0;
            }
          }

          if (e.y > 850 || e.x < -60 || e.x > 600) {
            g.enemies.splice(i, 1);
            continue;
          }

          e.shootTimer--;
          if (e.shootTimer <= 0 && e.y > 20 && e.y < 650) {
            e.shootTimer = e.shootInterval;

            const angleToPlayer = Math.atan2(g.player.y - e.y, g.player.x - e.x);
            const bulletSpeed = g.difficulty === 'EASY' ? 3.5 : g.difficulty === 'NORMAL' ? 4.8 : 6.0;

            if (e.type === 'scout') {
              g.enemyBullets.push({
                x: e.x,
                y: e.y + e.height * 0.4,
                vx: Math.cos(angleToPlayer) * bulletSpeed,
                vy: Math.sin(angleToPlayer) * bulletSpeed,
                radius: 4,
                color: '#f87171',
                glowColor: '#ef4444',
              });
            } else if (e.type === 'fighter') {
              [-0.25, 0, 0.25].forEach((offset) => {
                g.enemyBullets.push({
                  x: e.x,
                  y: e.y + e.height * 0.4,
                  vx: Math.cos(angleToPlayer + offset) * bulletSpeed,
                  vy: Math.sin(angleToPlayer + offset) * bulletSpeed,
                  radius: 4.5,
                  color: '#fb7185',
                  glowColor: '#f43f5e',
                });
              });
            } else if (e.type === 'cruiser') {
              for (let k = 0; k < 8; k++) {
                const ringAngle = (k / 8) * Math.PI * 2 + e.behaviorTimer * 0.1;
                g.enemyBullets.push({
                  x: e.x,
                  y: e.y + 10,
                  vx: Math.cos(ringAngle) * (bulletSpeed * 0.85),
                  vy: Math.sin(ringAngle) * (bulletSpeed * 0.85),
                  radius: 5,
                  color: '#c084fc',
                  glowColor: '#a855f7',
                });
              }
            }
          }
        }

        if (g.boss && g.boss.hp > 0 && g.warningTimer === 0) {
          const boss = g.boss;
          if (boss.hitFlash > 0) boss.hitFlash--;

          boss.x += (boss.targetX - boss.x) * 0.04;
          boss.y += (boss.targetY - boss.y) * 0.04;

          boss.patternAngle += 0.03;
          boss.targetX = 270 + Math.sin(boss.patternAngle) * 160;

          boss.shootTimer++;
          boss.specialTimer++;

          const bulletSpeed = g.difficulty === 'EASY' ? 3.8 : g.difficulty === 'NORMAL' ? 5.2 : 6.5;

          if (boss.shootTimer % (g.difficulty === 'HARD' ? 18 : 28) === 0) {
            const angleOffset = boss.patternAngle * 3;
            for (let k = 0; k < (boss.stage >= 2 ? 6 : 4); k++) {
              const a = angleOffset + (k / (boss.stage >= 2 ? 6 : 4)) * Math.PI * 2;
              g.enemyBullets.push({
                x: boss.x,
                y: boss.y + 20,
                vx: Math.cos(a) * bulletSpeed,
                vy: Math.sin(a) * bulletSpeed,
                radius: 5,
                color: '#f43f5e',
                glowColor: '#e11d48',
              });
            }
          }

          if (boss.specialTimer > 120) {
            boss.specialTimer = 0;
            const targetAngle = Math.atan2(g.player.y - boss.y, g.player.x - boss.x);

            for (let b = 0; b < 5; b++) {
              setTimeout(() => {
                if (g.state === 'PLAYING' && g.boss) {
                  g.enemyBullets.push({
                    x: boss.x,
                    y: boss.y + 30,
                    vx: Math.cos(targetAngle) * (bulletSpeed * 1.3),
                    vy: Math.sin(targetAngle) * (bulletSpeed * 1.3),
                    radius: 6,
                    color: '#fbbf24',
                    glowColor: '#f59e0b',
                  });
                }
              }, b * 90);
            }
          }
        }

        for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
          const eb = g.enemyBullets[i];
          eb.x += eb.vx;
          eb.y += eb.vy;

          if (eb.y < -30 || eb.y > 830 || eb.x < -30 || eb.x > 570) {
            g.enemyBullets.splice(i, 1);
            continue;
          }

          if (g.player.invulnerableTimer <= 0) {
            const dist = Math.hypot(eb.x - g.player.x, eb.y - g.player.y);
            if (dist < eb.radius + g.player.hitboxRadius) {
              g.enemyBullets.splice(i, 1);
              g.screenShake = 15;
              g.screenFlash = 0.5;

              const shieldDamage = g.difficulty === 'HARD' ? 45 : 35;
              g.shield -= shieldDamage;
              playSoundEffect('shield_loss');

              if (g.shield <= 0) {
                g.lives--;
                setLives(g.lives);
                createExplosion(g.player.x, g.player.y, 2.5);

                if (g.lives <= 0) {
                  g.state = 'GAMEOVER';
                  setGameState('GAMEOVER');
                  stopBgm();
                  sound.playGameOver();
                  updateHighScore(g.score);
                } else {
                  g.shield = 100;
                  g.player.invulnerableTimer = 180;
                  g.player.x = 270;
                  g.player.y = 680;
                  g.powerLevel = Math.max(1, g.powerLevel - 1);
                  setPowerLevel(g.powerLevel);
                }
              } else {
                g.player.invulnerableTimer = 45;
              }

              setShield(Math.max(0, g.shield));
              continue;
            }
          }
        }

        for (let i = g.items.length - 1; i >= 0; i--) {
          const item = g.items[i];
          item.x += item.vx;
          item.y += item.vy;
          item.vy += 0.08;

          const distToPlayer = Math.hypot(g.player.x - item.x, g.player.y - item.y);
          if (distToPlayer < 90) {
            const dx = g.player.x - item.x;
            const dy = g.player.y - item.y;
            item.x += (dx / distToPlayer) * 8.5;
            item.y += (dy / distToPlayer) * 8.5;
          }

          if (item.y > 820) {
            g.items.splice(i, 1);
            continue;
          }

          if (distToPlayer < item.radius + 18) {
            if (item.type === 'power') {
              g.powerLevel = Math.min(5, g.powerLevel + 1);
              setPowerLevel(g.powerLevel);
              playSoundEffect('powerup');
              g.score += 500;
              g.floatingTexts.push({
                x: item.x,
                y: item.y,
                text: g.powerLevel === 5 ? 'MAX POWER!!' : 'POWER UP!',
                color: '#38bdf8',
                alpha: 1,
                life: 45,
                maxLife: 45,
                vy: -1.2,
                fontSize: 14,
              });
            } else if (item.type === 'shield') {
              g.shield = Math.min(100, g.shield + 35);
              setShield(g.shield);
              playSoundEffect('item');
              g.score += 300;
              g.floatingTexts.push({
                x: item.x,
                y: item.y,
                text: 'SHIELD +35%',
                color: '#4ade80',
                alpha: 1,
                life: 45,
                maxLife: 45,
                vy: -1.2,
                fontSize: 14,
              });
            } else if (item.type === 'bomb') {
              g.bombs = Math.min(5, g.bombs + 1);
              setBombs(g.bombs);
              playSoundEffect('item');
              g.score += 800;
              g.floatingTexts.push({
                x: item.x,
                y: item.y,
                text: 'BOMB +1',
                color: '#f43f5e',
                alpha: 1,
                life: 45,
                maxLife: 45,
                vy: -1.2,
                fontSize: 14,
              });
            } else if (item.type === 'gem') {
              playSoundEffect('item');
              const gemScore = 200 * (1 + g.combo * 0.1);
              g.score += Math.round(gemScore);
              g.floatingTexts.push({
                x: item.x,
                y: item.y,
                text: `+${Math.round(gemScore)}`,
                color: '#fbbf24',
                alpha: 1,
                life: 30,
                maxLife: 30,
                vy: -1,
                fontSize: 12,
              });
            }

            setScore(g.score);
            g.items.splice(i, 1);
          }
        }
      }

      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
          g.particles.splice(i, 1);
        }
      }

      for (let i = g.floatingTexts.length - 1; i >= 0; i--) {
        const ft = g.floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        ft.alpha = Math.max(0, ft.life / ft.maxLife);
        if (ft.life <= 0) {
          g.floatingTexts.splice(i, 1);
        }
      }

      ctx.save();

      if (g.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * g.screenShake;
        const shakeY = (Math.random() - 0.5) * g.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      ctx.fillStyle = '#060814';
      ctx.fillRect(-20, -20, 580, 840);

      g.nebulae.forEach((neb) => {
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
        grad.addColorStop(0, neb.color);
        grad.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalAlpha = neb.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      g.stars.forEach((star) => {
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (g.state === 'PLAYING') {
        ctx.save();
        ctx.strokeStyle = g.player.y < 220 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 220);
        ctx.lineTo(540, 220);
        ctx.stroke();
        ctx.restore();
      }

      g.items.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y);

        let iconColor = '#38bdf8';
        let label = 'P';
        if (item.type === 'power') {
          iconColor = '#38bdf8';
          label = 'P';
        } else if (item.type === 'shield') {
          iconColor = '#4ade80';
          label = 'S';
        } else if (item.type === 'bomb') {
          iconColor = '#f43f5e';
          label = 'B';
        } else if (item.type === 'gem') {
          iconColor = '#fbbf24';
          label = '◆';
        }

        ctx.shadowColor = iconColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = iconColor;
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, item.radius - 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0.5);

        ctx.restore();
      });

      g.enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        if (enemy.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = enemy.color;
          ctx.shadowColor = enemy.glowColor;
          ctx.shadowBlur = 8;
        }

        const hw = enemy.width * 0.5;
        const hh = enemy.height * 0.5;

        ctx.beginPath();
        if (enemy.type === 'scout') {
          ctx.moveTo(0, hh);
          ctx.lineTo(-hw, -hh);
          ctx.lineTo(0, -hh * 0.4);
          ctx.lineTo(hw, -hh);
          ctx.closePath();
        } else if (enemy.type === 'fighter') {
          ctx.moveTo(0, hh);
          ctx.lineTo(-hw, 0);
          ctx.lineTo(-hw * 0.7, -hh);
          ctx.lineTo(hw * 0.7, -hh);
          ctx.lineTo(hw, 0);
          ctx.closePath();
        } else if (enemy.type === 'spinner') {
          const rot = enemy.behaviorTimer * 0.15;
          ctx.rotate(rot);
          ctx.rect(-hw * 0.7, -hh * 0.7, enemy.width * 0.7, enemy.height * 0.7);
        } else if (enemy.type === 'cruiser') {
          ctx.moveTo(0, hh);
          ctx.lineTo(-hw, -hh * 0.3);
          ctx.lineTo(-hw * 0.6, -hh);
          ctx.lineTo(hw * 0.6, -hh);
          ctx.lineTo(hw, -hh * 0.3);
          ctx.closePath();
        }
        ctx.fill();

        if (enemy.hp < enemy.maxHp) {
          const barW = enemy.width;
          const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-barW * 0.5, -hh - 8, barW, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-barW * 0.5, -hh - 8, barW * hpPct, 4);
        }

        ctx.restore();
      });

      if (g.boss && g.boss.hp > 0 && g.warningTimer === 0) {
        const boss = g.boss;
        ctx.save();
        ctx.translate(boss.x, boss.y);

        if (boss.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 20;
        } else {
          ctx.fillStyle = boss.color;
          ctx.shadowColor = boss.glowColor;
          ctx.shadowBlur = 15;
        }

        const hw = boss.width * 0.5;
        const hh = boss.height * 0.5;

        ctx.beginPath();
        ctx.moveTo(0, hh + 20);
        ctx.lineTo(-hw, -hh * 0.4);
        ctx.lineTo(-hw * 0.5, -hh);
        ctx.lineTo(hw * 0.5, -hh);
        ctx.lineTo(hw, -hh * 0.4);
        ctx.closePath();
        ctx.fill();

        const corePulse = Math.sin(Date.now() * 0.008) * 4;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, 10, 18 + corePulse, 0, Math.PI * 2);
        ctx.fill();

        boss.parts.forEach((part) => {
          if (!part.destroyed) {
            ctx.save();
            ctx.fillStyle = '#64748b';
            ctx.strokeStyle = boss.glowColor;
            ctx.lineWidth = 2;
            ctx.fillRect(part.xOffset - part.width * 0.5, part.yOffset - part.height * 0.5, part.width, part.height);
            ctx.strokeRect(part.xOffset - part.width * 0.5, part.yOffset - part.height * 0.5, part.width, part.height);
            ctx.restore();
          }
        });

        ctx.restore();

        const bossHpPct = Math.max(0, boss.hp / boss.maxHp);
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(40, 20, 460, 14);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(40, 20, 460, 14);

        const hpGrad = ctx.createLinearGradient(40, 0, 500, 0);
        hpGrad.addColorStop(0, '#ef4444');
        hpGrad.addColorStop(0.5, '#f59e0b');
        hpGrad.addColorStop(1, '#10b981');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(42, 22, 456 * bossHpPct, 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${boss.name} - ${Math.round(bossHpPct * 100)}%`, 270, 31);
        ctx.restore();
      }

      g.playerBullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.glow || b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        if (b.isHoming) {
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        } else {
          ctx.ellipse(b.x, b.y, b.radius, b.radius * 2.2, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      });

      g.enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.fillStyle = eb.color;
        ctx.shadowColor = eb.glowColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (g.state === 'PLAYING' || g.state === 'VICTORY') {
        const { x, y, roll, invulnerableTimer } = g.player;

        if (invulnerableTimer <= 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
          ctx.save();
          ctx.translate(x, y);

          const flameH = 14 + Math.random() * 8;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(-6, 20);
          ctx.lineTo(0, 20 + flameH);
          ctx.lineTo(6, 20);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;

          const wingScale = 1 - Math.abs(roll) * 0.3;

          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(18 * wingScale + roll * 4, 16);
          ctx.lineTo(8, 12);
          ctx.lineTo(0, 18);
          ctx.lineTo(-8, 12);
          ctx.lineTo(-18 * wingScale + roll * 4, 16);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.ellipse(0, -6, 4, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, g.player.hitboxRadius, 0, Math.PI * 2);
          ctx.fill();

          if (g.powerLevel >= 5) {
            const optDist = 36;
            const optAngle = g.player.optionAngle;
            [-1, 1].forEach((dir) => {
              const optX = Math.cos(optAngle + (dir > 0 ? 0 : Math.PI)) * optDist;
              const optY = Math.sin(optAngle + (dir > 0 ? 0 : Math.PI)) * optDist * 0.5;

              ctx.save();
              ctx.translate(optX, optY);
              ctx.fillStyle = '#4ade80';
              ctx.shadowColor = '#22c55e';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(0, 0, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            });
          }

          if (g.shield > 0) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 + (g.shield / 100) * 0.25})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      if (g.bombShockwave > 0) {
        ctx.save();
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(g.player.x, g.player.y, g.bombShockwave, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.fill();
        ctx.restore();
      }

      g.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        if (p.shape === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      g.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.font = `bold ${ft.fontSize}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      if (g.warningTimer > 0) {
        const blink = Math.floor(g.warningTimer / 12) % 2 === 0;
        if (blink) {
          ctx.save();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fillRect(0, 0, 540, 800);

          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f87171';
          ctx.shadowBlur = 18;
          ctx.font = "900 32px 'Outfit', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText('WARNING!!', 270, 360);

          ctx.font = "bold 14px 'Outfit', sans-serif";
          ctx.fillStyle = '#ffffff';
          ctx.fillText('A HUGE BATTLESHIP IS APPROACHING', 270, 395);
          ctx.restore();
        }
      }

      if (g.screenFlash > 0) {
        ctx.save();
        ctx.globalAlpha = g.screenFlash;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 540, 800);
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      stopBgm();
    };
  }, [firePlayerBullets, createExplosion, dropItem, spawnBoss, playSoundEffect, stopBgm, updateHighScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') g.keys.left = true;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') g.keys.right = true;
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') g.keys.up = true;
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') g.keys.down = true;
      if (e.code === 'Space' || e.key === 'z' || e.key === 'Z') g.keys.shoot = true;
      if (e.key === 'x' || e.key === 'X' || e.key === 'k' || e.key === 'K') {
        triggerBomb();
      }
      if (e.key === 'Shift' || e.key === 'c' || e.key === 'C') g.keys.focus = true;

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (g.state === 'PLAYING') {
          g.state = 'PAUSED';
          setGameState('PAUSED');
          stopBgm();
        } else if (g.state === 'PAUSED') {
          g.state = 'PLAYING';
          setGameState('PLAYING');
          startBgm();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') g.keys.left = false;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') g.keys.right = false;
      if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') g.keys.up = false;
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') g.keys.down = false;
      if (e.code === 'Space' || e.key === 'z' || e.key === 'Z') g.keys.shoot = false;
      if (e.key === 'Shift' || e.key === 'c' || e.key === 'C') g.keys.focus = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerBomb, startBgm, stopBgm]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 270, y: 680 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-4xl mx-auto flex flex-col items-center select-none ${
        isFullscreen ? 'h-[calc(100vh-5rem)]' : ''
      }`}
    >
      {/* 上部コントロールバー */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 px-2">
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          <span>ゲーム一覧へ戻る</span>
        </button>

        <div className="flex items-center gap-2">
          {/* 操作モード切り替え */}
          <button
            onClick={() => setControlMode(controlMode === 'keyboard' ? 'mouse' : 'keyboard')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
              controlMode === 'mouse'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-400'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="マウス追従操作切替"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>{controlMode === 'mouse' ? 'マウス操作中' : 'キーボード操作'}</span>
          </button>

          {/* 自動連射切り替え */}
          <button
            onClick={() => {
              const next = !autoFire;
              setAutoFire(next);
              gameRef.current.autoFire = next;
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition ${
              autoFire
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 font-bold'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-500'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>連射: {autoFire ? 'AUTO' : 'MANUAL'}</span>
          </button>

          {/* サウンド切り替え */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? !isSoundMuted
                  ? 'bg-slate-900 border-slate-700 text-indigo-400'
                  : 'bg-slate-950 border-slate-800 text-slate-600'
                : !isSoundMuted
                ? 'bg-white border-slate-200 text-indigo-600'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title="サウンド切替"
          >
            {!isSoundMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* メインゲームエリア & HUD */}
      <div className="relative flex flex-col items-center">
        {/* サイバーHUD (上部ステータスバー) */}
        <div
          className={`w-full max-w-[540px] px-4 py-2.5 rounded-t-2xl border-t border-x flex items-center justify-between gap-2 text-xs font-mono backdrop-blur-md ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {/* スコア & ハイスコア */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">SCORE</span>
            <span className="text-base font-black text-amber-400 tracking-wider">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" /> HIGH
            </span>
            <span className="text-xs font-bold text-slate-300">
              {Math.max(score, highScore).toLocaleString()}
            </span>
          </div>

          {/* シールド & 残機 */}
          <div className="flex items-center gap-3">
            {/* シールドバー */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-[10px] text-slate-300">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>{shield}%</span>
              </div>
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-0.5">
                <div
                  className={`h-full transition-all duration-200 ${
                    shield > 50 ? 'bg-emerald-500' : shield > 25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${shield}%` }}
                />
              </div>
            </div>

            {/* 残機アイコン */}
            <div className="flex items-center gap-1 text-indigo-400">
              {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                <Crosshair key={i} className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
              ))}
            </div>

            {/* ボムストック */}
            <div className="flex items-center gap-0.5 text-rose-400">
              {Array.from({ length: Math.max(0, bombs) }).map((_, i) => (
                <Bomb key={i} className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              ))}
            </div>
          </div>
        </div>

        {/* Canvas 表示部 */}
        <div className="relative overflow-hidden rounded-b-2xl border border-slate-800 shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={540}
            height={800}
            className="w-full max-w-[540px] max-h-[75vh] h-auto object-contain cursor-crosshair block"
            onMouseMove={(e) => {
              if (controlMode === 'mouse') {
                const coords = getCanvasCoords(e.clientX, e.clientY);
                gameRef.current.mousePos.x = coords.x;
                gameRef.current.mousePos.y = coords.y;
                gameRef.current.mousePos.active = true;
              }
            }}
            onMouseDown={(e) => {
              if (e.button === 0) gameRef.current.mousePos.down = true;
              if (e.button === 2) {
                e.preventDefault();
                triggerBomb();
              }
            }}
            onMouseUp={() => {
              gameRef.current.mousePos.down = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const coords = getCanvasCoords(touch.clientX, touch.clientY);
              gameRef.current.touchPos.x = coords.x;
              gameRef.current.touchPos.y = coords.y;
              gameRef.current.touchPos.active = true;
              gameRef.current.touchPos.isDragging = true;
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const coords = getCanvasCoords(touch.clientX, touch.clientY);
              gameRef.current.touchPos.x = coords.x;
              gameRef.current.touchPos.y = coords.y;
            }}
            onTouchEnd={() => {
              gameRef.current.touchPos.isDragging = false;
            }}
          />

          {/* --- スタートメニュー オーバーレイ --- */}
          {gameState === 'MENU' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in">
              <div className="p-3 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-3xl shadow-xl shadow-indigo-500/20 mb-4 animate-bounce">
                <Crosshair className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-rose-400 mb-1">
                STAR STRIKER
              </h2>
              <p className="text-xs font-mono text-cyan-300/80 mb-6">CYBER SPACE VERTICAL SHOOTER</p>

              {/* 難易度選択 */}
              <div className="w-full max-w-xs mb-4">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">難易度 (DIFFICULTY)</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition ${
                        difficulty === d
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* ゲームモード選択 */}
              <div className="w-full max-w-xs mb-6">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">モード (GAME MODE)</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setGameMode('CAMPAIGN')}
                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition ${
                      gameMode === 'CAMPAIGN'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ステージ制覇
                  </button>
                  <button
                    onClick={() => setGameMode('ENDLESS')}
                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition ${
                      gameMode === 'ENDLESS'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    エンドレス
                  </button>
                  <button
                    onClick={() => setGameMode('BOSS_RUSH')}
                    className={`py-1.5 text-[11px] font-bold rounded-xl border transition ${
                      gameMode === 'BOSS_RUSH'
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    ボスラッシュ
                  </button>
                </div>
              </div>

              <button
                onClick={() => startGame(gameMode, difficulty)}
                className="w-full max-w-xs py-3.5 bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black rounded-2xl text-base shadow-xl shadow-indigo-600/30 transition transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>MISSION START</span>
              </button>

              <div className="mt-6 text-[11px] text-slate-400 space-y-1">
                <p>PC: 矢印/WASD移動 • Space/Z射撃 • Xボム • Shift低速</p>
                <p>スマホ: 画面ドラッグ移動 • オート連射</p>
              </div>
            </div>
          )}

          {/* --- ポーズ オーバーレイ --- */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in">
              <h3 className="text-3xl font-black tracking-widest text-indigo-400 mb-6">PAUSED</h3>
              <div className="space-y-3 w-full max-w-xs">
                <button
                  onClick={() => {
                    gameRef.current.state = 'PLAYING';
                    setGameState('PLAYING');
                    startBgm();
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition"
                >
                  ゲームを再開
                </button>
                <button
                  onClick={() => startGame(gameMode, difficulty)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition"
                >
                  最初からやり直す
                </button>
                <button
                  onClick={() => {
                    setGameState('MENU');
                    stopBgm();
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-2xl transition"
                >
                  タイトルへ戻る
                </button>
              </div>
            </div>
          )}

          {/* --- ゲームオーバー オーバーレイ --- */}
          {gameState === 'GAMEOVER' && (
            <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white animate-in zoom-in-95">
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-full mb-3 text-rose-400">
                <Bomb className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-rose-500 tracking-wider mb-2">MISSION FAILED</h3>
              <p className="text-xs text-rose-300/80 mb-6 font-mono">CRITICAL HULL INTEGRITY FAILURE</p>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 w-full max-w-xs mb-6 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">FINAL SCORE:</span>
                  <span className="text-amber-400 font-bold">{score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">HIGH SCORE:</span>
                  <span className="text-slate-200 font-bold">{Math.max(score, highScore).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ENEMIES DESTROYED:</span>
                  <span className="text-cyan-400 font-bold">{enemiesKilled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MAX COMBO:</span>
                  <span className="text-indigo-400 font-bold">{maxCombo}x</span>
                </div>
              </div>

              <div className="space-y-3 w-full max-w-xs">
                <button
                  onClick={() => startGame(gameMode, difficulty)}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RETRY MISSION</span>
                </button>
                <button
                  onClick={() => setGameState('MENU')}
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition"
                >
                  タイトルへ戻る
                </button>
              </div>
            </div>
          )}

          {/* --- クリア勝利 オーバーレイ --- */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white animate-in zoom-in-95">
              <div className="p-3.5 bg-gradient-to-tr from-amber-500 to-indigo-500 rounded-full mb-3 text-white shadow-xl shadow-amber-500/30 animate-pulse">
                <Award className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-indigo-300 to-cyan-400 tracking-wider mb-1">
                MISSION ACCOMPLISHED!!
              </h3>
              <p className="text-xs text-amber-300 font-mono mb-6">ALL HOSTILE ARRAYS NEUTRALIZED</p>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 w-full max-w-xs mb-6 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">TOTAL SCORE:</span>
                  <span className="text-amber-400 font-black text-sm">{score.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ENEMIES DESTROYED:</span>
                  <span className="text-cyan-400 font-bold">{enemiesKilled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MAX COMBO:</span>
                  <span className="text-indigo-400 font-bold">{maxCombo}x</span>
                </div>
              </div>

              <div className="space-y-3 w-full max-w-xs">
                <button
                  onClick={() => startGame(gameMode, difficulty)}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold rounded-2xl shadow-lg transition"
                >
                  もう一度プレイ
                </button>
                <button
                  onClick={() => setGameState('MENU')}
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition"
                >
                  タイトルへ戻る
                </button>
              </div>
            </div>
          )}
        </div>

        {/* スマホ / タッチ専用下部アクションバー */}
        <div className="w-full max-w-[540px] mt-2 flex items-center justify-between gap-3 sm:hidden">
          <button
            onClick={triggerBomb}
            disabled={bombs <= 0}
            className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition ${
              bombs > 0
                ? 'bg-rose-600/90 hover:bg-rose-500 text-white border-rose-500/50 shadow-lg shadow-rose-600/20 active:scale-95'
                : 'bg-slate-900/60 border-slate-800 text-slate-600'
            }`}
          >
            <Bomb className="w-4 h-4 fill-white" />
            <span>BOMB ({bombs})</span>
          </button>

          <button
            onClick={() => {
              if (gameState === 'PLAYING') {
                gameRef.current.state = 'PAUSED';
                setGameState('PAUSED');
                stopBgm();
              }
            }}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl text-xs font-bold active:scale-95"
          >
            PAUSE
          </button>
        </div>
      </div>
    </div>
  );
};
