import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Zap,
  Shield,
  Award,
  ChevronRight,
} from 'lucide-react';
import {
  Player,
  LevelData,
  CharacterId,
  InputState,
  Particle,
  ScorePopup,
  Animal,
  GameStats,
} from './sonic/types';
import {
  createInitialPlayer,
  updatePhysics,
} from './sonic/physics';
import { createAct1Level, createAct2Level } from './sonic/levels';
import { updateBoss } from './sonic/boss';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  renderGame,
} from './sonic/renderer';
import { sonicAudio } from './sonic/audio';

export const SONIC_HIGH_SCORE_KEY = 'sonic_high_score_v1';
export const SONIC_BEST_TIME_KEY = 'sonic_best_time_v1';
export const SONIC_MAX_RINGS_KEY = 'sonic_max_rings_v1';

interface SonicGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const SonicGame: React.FC<SonicGameProps> = ({
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game UI States
  const [gameState, setGameState] = useState<
    'title' | 'select' | 'playing' | 'paused' | 'stage_clear' | 'game_over'
  >('title');
  const [character, setCharacter] = useState<CharacterId>('sonic');
  const [currentAct, setCurrentAct] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(() => sonicAudio.getMuted());

  // Records
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SONIC_HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });
  const [bestTime, setBestTime] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SONIC_BEST_TIME_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });

  // Active game loop variables stored in refs
  const stateRef = useRef<{
    player: Player;
    level: LevelData;
    inputs: InputState;
    particles: Particle[];
    scorePopups: ScorePopup[];
    animals: Animal[];
    cameraX: number;
    cameraY: number;
    stats: GameStats;
    lastTime: number;
    act: number;
    isLooping: boolean;
  }>({
    player: createInitialPlayer('sonic'),
    level: createAct1Level(),
    inputs: {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpPressed: false,
      spindash: false,
      action: false,
    },
    particles: [],
    scorePopups: [],
    animals: [],
    cameraX: 0,
    cameraY: 0,
    stats: {
      score: 0,
      rings: 0,
      time: 0,
      lives: 3,
    },
    lastTime: 0,
    act: 1,
    isLooping: false,
  });

  // Sound toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sonicAudio.setMuted(next);
  };

  // Start game with selected character
  const startGame = (char: CharacterId, actNum = 1) => {
    setCharacter(char);
    setCurrentAct(actNum);

    const newLevel = actNum === 1 ? createAct1Level() : createAct2Level();
    const newPlayer = createInitialPlayer(char, newLevel.spawnX, newLevel.spawnY);

    stateRef.current.player = newPlayer;
    stateRef.current.level = newLevel;
    stateRef.current.act = actNum;
    stateRef.current.particles = [];
    stateRef.current.scorePopups = [];
    stateRef.current.animals = [];
    stateRef.current.cameraX = 0;
    stateRef.current.cameraY = 0;
    stateRef.current.stats = {
      score: 0,
      rings: 0,
      time: 0,
      lives: 3,
    };
    stateRef.current.lastTime = performance.now();

    setGameState('playing');

    if (actNum === 1) {
      sonicAudio.startStageBGM();
    } else {
      sonicAudio.startBossBGM();
    }
  };

  // Advance to next ACT or retry
  const advanceToAct2 = () => {
    setCurrentAct(2);
    const newLevel = createAct2Level();
    const curPlayer = stateRef.current.player;
    curPlayer.x = newLevel.spawnX;
    curPlayer.y = newLevel.spawnY;
    curPlayer.vx = 0;
    curPlayer.vy = 0;
    curPlayer.action = 'idle';

    stateRef.current.level = newLevel;
    stateRef.current.act = 2;
    stateRef.current.particles = [];
    stateRef.current.scorePopups = [];
    stateRef.current.animals = [];
    stateRef.current.cameraX = 0;
    stateRef.current.cameraY = 0;
    stateRef.current.lastTime = performance.now();

    setGameState('playing');
    sonicAudio.startBossBGM();
  };

  // Save records
  const updateRecords = useCallback((score: number, time: number, rings: number) => {
    if (typeof window === 'undefined') return;

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(SONIC_HIGH_SCORE_KEY, score.toString());
    }
    if (bestTime === 0 || time < bestTime) {
      setBestTime(time);
      localStorage.setItem(SONIC_BEST_TIME_KEY, time.toString());
    }

    const savedMaxRings = parseInt(localStorage.getItem(SONIC_MAX_RINGS_KEY) || '0', 10);
    if (rings > savedMaxRings) {
      localStorage.setItem(SONIC_MAX_RINGS_KEY, rings.toString());
    }
  }, [highScore, bestTime]);

  // Handle Player Hurt
  const handlePlayerHurt = useCallback(() => {
    const s = stateRef.current;
    const p = s.player;

    if (p.shield !== 'none') {
      p.shield = 'none';
      p.invulnerableTimer = 2.0;
      p.vy = -260;
      p.vx = -p.facing * 180;
      sonicAudio.playHurt();
      return;
    }

    if (s.stats.rings > 0) {
      // Scatter rings!
      sonicAudio.playRingLoss();
      const ringCount = Math.min(24, s.stats.rings);
      for (let i = 0; i < ringCount; i++) {
        const ang = (i / ringCount) * Math.PI * 2;
        const spd = 140 + Math.random() * 180;
        s.level.entities.push({
          id: `scatter_${Date.now()}_${i}`,
          type: 'scatter_ring',
          x: p.x,
          y: p.y - 8,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 120,
          width: 18,
          height: 18,
          active: true,
          collected: false,
          timer: 0,
        });
      }
      s.stats.rings = 0;
      p.invulnerableTimer = 2.5;
      p.vy = -280;
      p.vx = -p.facing * 160;
    } else {
      // Death
      sonicAudio.playHurt();
      s.stats.lives -= 1;
      p.action = 'dead';
      p.vy = -380;
      p.vx = 0;

      setTimeout(() => {
        if (s.stats.lives > 0) {
          // Respawn at checkpoint or start
          p.x = s.level.spawnX;
          p.y = s.level.spawnY;
          p.vx = 0;
          p.vy = 0;
          p.action = 'idle';
          p.invulnerableTimer = 3.0;
        } else {
          setGameState('game_over');
          sonicAudio.stopBGM();
        }
      }, 1500);
    }
  }, []);

  // Handle Stage Clear
  const handleStageClear = useCallback(() => {
    const s = stateRef.current;
    // Calculate bonus
    const ringBonus = s.stats.rings * 100;
    const timeSec = Math.floor(s.stats.time / 1000);
    const timeBonus = Math.max(0, (300 - timeSec) * 50);
    s.stats.score += ringBonus + timeBonus;

    updateRecords(s.stats.score, s.stats.time, s.stats.rings);
    setGameState('stage_clear');
  }, [updateRecords]);

  // Main RAF loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;

    const loop = (currentTime: number) => {
      const s = stateRef.current;
      const dt = (currentTime - (s.lastTime || currentTime)) / 1000;
      s.lastTime = currentTime;

      // Update timer
      s.stats.time += dt * 1000;

      // Update Physics
      updatePhysics(
        s.player,
        s.inputs,
        s.level,
        dt,
        s.particles,
        s.scorePopups,
        s.animals,
        (deltaRing) => {
          s.stats.rings += deltaRing;
        },
        (deltaScore) => {
          s.stats.score += deltaScore;
        },
        () => handlePlayerHurt(),
        () => handleStageClear()
      );

      // Update Boss AI (Act 2)
      if (s.level.boss) {
        updateBoss(
          s.level.boss,
          s.player,
          dt,
          s.particles,
          s.scorePopups,
          () => {
            // Boss defeated! Activate capsule
            const capsule = s.level.entities.find((e) => e.type === 'capsule');
            if (capsule) {
              capsule.active = true;
            }
          },
          () => handlePlayerHurt()
        );
      }

      // Reset single-frame jump pressed
      s.inputs.jumpPressed = false;

      // Smooth Camera tracking with lookahead
      const lookahead = s.player.facing * Math.min(180, Math.abs(s.player.vx) * 0.3);
      const targetCamX = Math.max(
        s.level.cameraMinX,
        Math.min(s.level.cameraMaxX, s.player.x - CANVAS_WIDTH / 2 + lookahead)
      );
      s.cameraX += (targetCamX - s.cameraX) * 0.12;

      const targetCamY = Math.max(0, Math.min(60, s.player.y - CANVAS_HEIGHT / 2));
      s.cameraY += (targetCamY - s.cameraY) * 0.08;

      // Render to Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGame(
            ctx,
            s.player,
            s.level,
            s.particles,
            s.scorePopups,
            s.animals,
            s.cameraX,
            s.cameraY,
            s.stats,
            isDark
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, isDark, handlePlayerHurt, handleStageClear]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrows and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const inputs = stateRef.current.inputs;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          inputs.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          inputs.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
          inputs.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          inputs.down = true;
          break;
        case 'Space':
        case 'KeyZ':
        case 'KeyJ':
          if (!inputs.jump) {
            inputs.jumpPressed = true;
          }
          inputs.jump = true;
          break;
        case 'KeyX':
        case 'KeyK':
          inputs.spindash = true;
          break;
        case 'KeyP':
        case 'Escape':
          setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inputs = stateRef.current.inputs;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          inputs.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          inputs.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
          inputs.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          inputs.down = false;
          break;
        case 'Space':
        case 'KeyZ':
        case 'KeyJ':
          inputs.jump = false;
          inputs.jumpPressed = false;
          break;
        case 'KeyX':
        case 'KeyK':
          inputs.spindash = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Cleanup audio when unmounted
  useEffect(() => {
    return () => {
      sonicAudio.stopBGM();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center select-none ${
        isFullscreen
          ? 'h-[100dvh] w-full p-0 max-w-none overflow-hidden bg-black'
          : 'max-w-5xl mx-auto space-y-3'
      }`}
    >
      {/* Top Header / Nav Bar (Floats on Fullscreen for zero margin) */}
      <div
        className={`flex items-center justify-end px-3 py-1.5 z-30 transition-all ${
          isFullscreen
            ? 'absolute top-2 left-2 right-2 pointer-events-none'
            : 'w-full'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('paused')}
              className="p-2 rounded-xl bg-slate-900/80 text-slate-200 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 shadow-lg"
              title="一時停止 (P)"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {gameState === 'paused' && (
            <button
              onClick={() => setGameState('playing')}
              className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 backdrop-blur-md shadow-lg"
              title="再開"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900/80 text-slate-200 hover:bg-slate-800 backdrop-blur-md border border-slate-700/60 shadow-lg"
            title={isMuted ? 'ミュート解除' : '消音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas & Overlay Viewport */}
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-black ${
          isFullscreen
            ? 'w-full h-full flex-1 max-w-none rounded-none border-none'
            : 'w-full aspect-[16/9] rounded-2xl shadow-2xl border ' +
              (isDark ? 'border-slate-800' : 'border-slate-300')
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* 1. TITLE SCREEN OVERLAY */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/90 via-slate-950/95 to-black/95 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-300 z-20">
            {/* Title Logo */}
            <div className="relative mb-6">
              <div className="text-4xl sm:text-6xl font-black italic tracking-tighter bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(37,99,235,0.6)]">
                SONIC
              </div>
              <div className="text-xl sm:text-3xl font-extrabold tracking-widest text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
                SPEED RUSH
              </div>
              <div className="text-[10px] sm:text-xs font-semibold text-sky-200 mt-1">
                SONIC THE HEDGEHOG CLONE ADVENTURE
              </div>
            </div>

            {/* Records Badges */}
            <div className="flex gap-4 mb-6 text-xs sm:text-sm">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700">
                <span className="text-amber-400 font-bold">BEST SCORE: </span>
                <span>{highScore.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700">
                <span className="text-sky-400 font-bold">BEST TIME: </span>
                <span>
                  {bestTime > 0
                    ? `${Math.floor(bestTime / 60000)}:${Math.floor((bestTime % 60000) / 1000).toString().padStart(2, '0')}`
                    : '--:--'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                onClick={() => setGameState('select')}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>GAME START</span>
              </button>
            </div>

            {/* Controls Guide */}
            <div className="mt-8 text-xs text-slate-400 max-w-md bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div className="font-bold text-slate-300 mb-1">【操作方法】</div>
              <div>移動: <span className="text-sky-300">← → / A D</span> | しゃがみ/ローリング: <span className="text-sky-300">↓ / S</span></div>
              <div>ジャンプ/ホーミング: <span className="text-sky-300">Space / Z</span> | スピンダッシュ: <span className="text-sky-300">↓+Space連打</span></div>
            </div>
          </div>
        )}

        {/* 2. CHARACTER SELECT OVERLAY */}
        {gameState === 'select' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in duration-300 z-20">
            <h2 className="text-2xl sm:text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-amber-300">
              CHOOSE YOUR HERO
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">キャラクターを選択してステージへ出撃！</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
              {/* Sonic */}
              <div
                onClick={() => startGame('sonic', 1)}
                className="group relative p-5 rounded-2xl bg-slate-900/90 border-2 border-blue-600/50 hover:border-blue-400 hover:bg-blue-950/40 cursor-pointer transition transform hover:-translate-y-1 shadow-lg"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="font-black text-lg text-blue-400">SONIC</div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">音速のハリネズミ</div>
                <p className="text-xs text-slate-400">
                  超最高速ダッシュ、スピンダッシュ、空中ロックオン「ホーミングアタック」！
                </p>
              </div>

              {/* Tails */}
              <div
                onClick={() => startGame('tails', 1)}
                className="group relative p-5 rounded-2xl bg-slate-900/90 border-2 border-amber-600/50 hover:border-amber-400 hover:bg-amber-950/40 cursor-pointer transition transform hover:-translate-y-1 shadow-lg"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="font-black text-lg text-amber-400">TAILS</div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">心優しい相棒</div>
                <p className="text-xs text-slate-400">
                  空中でジャンプ連打して尻尾プロペラによる「飛行（Fly）」で高所ルート開拓！
                </p>
              </div>

              {/* Knuckles */}
              <div
                onClick={() => startGame('knuckles', 1)}
                className="group relative p-5 rounded-2xl bg-slate-900/90 border-2 border-red-600/50 hover:border-red-400 hover:bg-red-950/40 cursor-pointer transition transform hover:-translate-y-1 shadow-lg"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/40">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="font-black text-lg text-red-400">KNUCKLES</div>
                <div className="text-[11px] text-slate-300 font-semibold mb-2">怪力の戦士</div>
                <p className="text-xs text-slate-400">
                  空中を長距離「滑空（Glide）」＆壁に激突して自由自在に「壁登り（Climb）」！
                </p>
              </div>
            </div>

            <button
              onClick={() => setGameState('title')}
              className="text-xs text-slate-400 hover:text-white"
            >
              タイトルへ戻る
            </button>
          </div>
        )}

        {/* 3. PAUSED OVERLAY */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 z-30">
            <h2 className="text-3xl font-black mb-4 tracking-widest text-sky-400">PAUSED</h2>
            <div className="flex flex-col gap-3 w-48">
              <button
                onClick={() => setGameState('playing')}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold"
              >
                再開する
              </button>
              <button
                onClick={() => startGame(character, currentAct)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold"
              >
                リトライ
              </button>
              <button
                onClick={() => {
                  sonicAudio.stopBGM();
                  setGameState('title');
                }}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}

        {/* 4. STAGE CLEAR OVERLAY */}
        {gameState === 'stage_clear' && (
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/90 to-slate-950/95 flex flex-col items-center justify-center text-white p-6 z-30 animate-in zoom-in-95 duration-300">
            <div className="text-3xl sm:text-5xl font-black text-amber-400 mb-1 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]">
              STAGE CLEAR!
            </div>
            <div className="text-sm font-bold text-sky-300 mb-6">
              {currentAct === 1 ? 'GREEN HILL COAST - ACT 1' : 'DR. EGGMAN DEFEATED! - ACT 2'}
            </div>

            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 sm:p-6 w-full max-w-sm space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">TIME:</span>
                <span className="font-mono font-bold text-white">
                  {Math.floor(stateRef.current.stats.time / 60000)}:
                  {Math.floor((stateRef.current.stats.time % 60000) / 1000).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RING BONUS:</span>
                <span className="font-mono font-bold text-amber-400">
                  +{(stateRef.current.stats.rings * 100).toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-base">
                <span className="font-bold text-sky-300">TOTAL SCORE:</span>
                <span className="font-mono font-black text-white">
                  {stateRef.current.stats.score.toLocaleString()}
                </span>
              </div>
            </div>

            {currentAct === 1 ? (
              <button
                onClick={advanceToAct2}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-black text-lg shadow-lg shadow-amber-500/30 flex items-center gap-2 transform active:scale-95 transition"
              >
                <span>NEXT: ACT 2 ボス戦へ</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  sonicAudio.stopBGM();
                  setGameState('title');
                }}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-black text-lg shadow-lg shadow-emerald-500/30 transform active:scale-95 transition"
              >
                全クリ！タイトルへ
              </button>
            )}
          </div>
        )}

        {/* 5. GAME OVER OVERLAY */}
        {gameState === 'game_over' && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center text-white p-6 z-30 animate-in fade-in duration-300">
            <h2 className="text-4xl sm:text-6xl font-black tracking-widest text-red-400 mb-2">GAME OVER</h2>
            <p className="text-xs text-slate-300 mb-6">あきらめずに再挑戦しよう！</p>
            <div className="flex gap-4">
              <button
                onClick={() => startGame(character, currentAct)}
                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-2 shadow-lg"
              >
                <RotateCcw className="w-5 h-5" />
                <span>もう一度遊ぶ</span>
              </button>
              <button
                onClick={() => setGameState('title')}
                className="py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}

        {/* Floating Mobile Controls overlay inside canvas container */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between sm:hidden pointer-events-none z-20">
          {/* D-Pad (Left hand) */}
          <div className="grid grid-cols-3 gap-1 w-32 h-32 pointer-events-auto opacity-75 active:opacity-100">
            <div />
            <button
              onTouchStart={() => (stateRef.current.inputs.up = true)}
              onTouchEnd={() => (stateRef.current.inputs.up = false)}
              className="bg-slate-900/80 active:bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow border border-slate-700 touch-none select-none backdrop-blur-sm"
            >
              ▲
            </button>
            <div />

            <button
              onTouchStart={() => (stateRef.current.inputs.left = true)}
              onTouchEnd={() => (stateRef.current.inputs.left = false)}
              className="bg-slate-900/80 active:bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow border border-slate-700 touch-none select-none backdrop-blur-sm"
            >
              ◀
            </button>
            <div className="bg-slate-950/40 rounded-xl" />
            <button
              onTouchStart={() => (stateRef.current.inputs.right = true)}
              onTouchEnd={() => (stateRef.current.inputs.right = false)}
              className="bg-slate-900/80 active:bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow border border-slate-700 touch-none select-none backdrop-blur-sm"
            >
              ▶
            </button>

            <div />
            <button
              onTouchStart={() => (stateRef.current.inputs.down = true)}
              onTouchEnd={() => (stateRef.current.inputs.down = false)}
              className="bg-slate-900/80 active:bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow border border-slate-700 touch-none select-none backdrop-blur-sm"
            >
              ▼
            </button>
            <div />
          </div>

          {/* Action Buttons (Right hand: Jump & Instant Spindash) */}
          <div className="flex items-center gap-2 pointer-events-auto opacity-80 active:opacity-100">
            <button
              onTouchStart={() => {
                // One-tap Spindash charge!
                const inp = stateRef.current.inputs;
                inp.down = true;
                inp.spindash = true;
                inp.jumpPressed = true;
              }}
              onTouchEnd={() => {
                const inp = stateRef.current.inputs;
                inp.down = false;
                inp.spindash = false;
              }}
              className="w-14 h-14 bg-amber-600 active:bg-amber-500 text-white rounded-full font-black text-xs flex flex-col items-center justify-center shadow-lg border-2 border-amber-400 touch-none select-none backdrop-blur-sm"
            >
              <span>SPIN</span>
              <span className="text-[8px] text-amber-200">ダッシュ</span>
            </button>

            <button
              onTouchStart={() => {
                stateRef.current.inputs.jump = true;
                stateRef.current.inputs.jumpPressed = true;
              }}
              onTouchEnd={() => {
                stateRef.current.inputs.jump = false;
                stateRef.current.inputs.jumpPressed = false;
              }}
              className="w-16 h-16 bg-blue-600 active:bg-blue-500 text-white rounded-full font-black text-sm flex flex-col items-center justify-center shadow-xl border-2 border-blue-400 touch-none select-none backdrop-blur-sm"
            >
              <span>JUMP</span>
              <span className="text-[8px] text-blue-200">アタック</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
