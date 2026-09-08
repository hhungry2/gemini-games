// Super Mario Kart GP - Main Game Component

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Volume2,
  VolumeX,
  HelpCircle,
  Trophy,
  ArrowLeft,
  Pause,
  ChevronRight,
  Zap,
} from 'lucide-react';
import {
  GameMode,
  EngineClass,
  CharacterId,
  CourseId,
  KartState,
  ActiveItem,
  Particle,
  InputState,
  TrackData,
} from './mariokart/types';
import {
  CHARACTERS,
  CHARACTER_LIST,
  TRACK_LIST,
  createTrackInstance,
} from './mariokart/tracks';
import {
  updatePlayerKart,
  updateRivalAI,
  updateActiveItems,
  checkKartCollisions,
  updateRaceProgress,
  updateParticles,
  updateTrackPickups,
} from './mariokart/physics';
import { renderGameView } from './mariokart/renderer';
import { marioKartAudio } from './mariokart/audio';

export const MARIO_KART_BEST_TIMES_KEY = 'mariokart_best_times_v1';
export const MARIO_KART_TROPHIES_KEY = 'mariokart_trophies_v1';

interface MarioKartGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const MarioKartGame: React.FC<MarioKartGameProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [gameState, setGameState] = useState<
    'title' | 'mode_select' | 'char_select' | 'track_select' | 'countdown' | 'racing' | 'paused' | 'finished' | 'podium'
  >('title');

  const [gameMode, setGameMode] = useState<GameMode>('grand_prix');
  const [engineClass, setEngineClass] = useState<EngineClass>('100cc');
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>('mario');
  const [selectedCourseId, setSelectedCourseId] = useState<CourseId>('mario_circuit');
  const [grandPrixIndex, setGrandPrixIndex] = useState<number>(0);
  const [gpScores, setGpScores] = useState<Record<string, number>>({});

  const [isMuted, setIsMuted] = useState<boolean>(() => marioKartAudio.getMuted());
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [raceResult, setRaceResult] = useState<{
    rank: number;
    time: number;
    coins: number;
  } | null>(null);

  // Best Records
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
  const [trophies, setTrophies] = useState<Record<string, boolean>>({});

  // Input states ref
  const inputsRef = useRef<InputState>({
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
    useItem: false,
    rearView: false,
  });

  // Mutable Game Loop State
  const countdownIntervalRef = useRef<number>(0);
  const finishTimeoutRef = useRef<number>(0);
  const finishHandledRef = useRef<boolean>(false);
  const loopRef = useRef<{
    track: TrackData | null;
    player: KartState | null;
    allKarts: KartState[];
    activeItems: ActiveItem[];
    particles: Particle[];
    raceTime: number;
    animFrameId: number;
    lastTime: number;
    isLooping: boolean;
    rocketStartCharged: boolean;
  }>({
    track: null,
    player: null,
    allKarts: [],
    activeItems: [],
    particles: [],
    raceTime: 0,
    animFrameId: 0,
    lastTime: 0,
    isLooping: false,
    rocketStartCharged: false,
  });

  // Fullscreen: canvas backing-storeをviewportに合わせて高解像度化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isFullscreen) {
      canvas.width = 640;
      canvas.height = 360;
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = Math.max(640, w);
    canvas.height = Math.max(360, h);
    const onResize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(640, Math.floor(window.innerWidth * d));
      canvas.height = Math.max(360, Math.floor(window.innerHeight * d));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isFullscreen, gameState]);

  // Load Saved Records
  useEffect(() => {
    try {
      const savedTimes = localStorage.getItem(MARIO_KART_BEST_TIMES_KEY);
      if (savedTimes) setBestTimes(JSON.parse(savedTimes));
      const savedTrophies = localStorage.getItem(MARIO_KART_TROPHIES_KEY);
      if (savedTrophies) setTrophies(JSON.parse(savedTrophies));
    } catch {}
  }, []);

  const saveBestTime = useCallback((courseId: string, time: number) => {
    setBestTimes((prev) => {
      const cur = prev[courseId];
      if (cur === undefined || time < cur) {
        const next = { ...prev, [courseId]: time };
        localStorage.setItem(MARIO_KART_BEST_TIMES_KEY, JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      // Prevent scroll on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }

      if (code === 'ArrowUp' || key === 'w') inputsRef.current.accelerate = true;
      if (code === 'ArrowDown' || key === 's') inputsRef.current.brake = true;
      if (code === 'ArrowLeft' || key === 'a') inputsRef.current.left = true;
      if (code === 'ArrowRight' || key === 'd') inputsRef.current.right = true;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') inputsRef.current.drift = true;
      if (key === 'e' || code === 'Enter' || code === 'ControlLeft') inputsRef.current.useItem = true;
      if (key === 'c' || key === 'b') inputsRef.current.rearView = true;

      if (key === 'p' || code === 'Escape') {
        setGameState((prev) => (prev === 'racing' ? 'paused' : prev === 'paused' ? 'racing' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      if (code === 'ArrowUp' || key === 'w') inputsRef.current.accelerate = false;
      if (code === 'ArrowDown' || key === 's') inputsRef.current.brake = false;
      if (code === 'ArrowLeft' || key === 'a') inputsRef.current.left = false;
      if (code === 'ArrowRight' || key === 'd') inputsRef.current.right = false;
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') inputsRef.current.drift = false;
      if (key === 'e' || code === 'Enter' || code === 'ControlLeft') inputsRef.current.useItem = false;
      if (key === 'c' || key === 'b') inputsRef.current.rearView = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Race
  const startRace = useCallback((courseId: CourseId, playerChar: CharacterId) => {
    // 既存のカウントダウン/フィニッシュタイマーを確実に破棄 (リーク防止)
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = 0;
    }
    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = 0;
    }
    finishHandledRef.current = false;
    const track = createTrackInstance(courseId);

    // Pick 7 rivals (all distinct from player)
    const rivalsList = CHARACTER_LIST.filter((c) => c.id !== playerChar);

    // 8 Karts on Grid
    const karts: KartState[] = [];

    // Player Kart at Grid Pos 7 (8th) or 0 (1st) depending on mode
    const playerGridIndex = gameMode === 'grand_prix' ? 7 : 4;
    const pGrid = track.gridPositions[playerGridIndex];

    const playerKart: KartState = {
      id: 'player',
      charId: playerChar,
      isPlayer: true,
      x: pGrid.x,
      y: pGrid.y,
      z: 0,
      vz: 0,
      angle: pGrid.angle,
      speed: 0,
      steer: 0,
      driftDir: 0,
      driftTime: 0,
      miniTurboLevel: 0,
      boostTimer: 0,
      starTimer: 0,
      lightningTimer: 0,
      spinTimer: 0,
      spinType: 'slip',
      invulnerableTimer: 0,
      coins: 0,
      item: 'none',
      itemRouletteTimer: 0,
      rouletteDisplayItem: 'none',
      holdingItem: false,
      lap: 1,
      checkpointIndex: 0,
      progress: 0,
      rank: 8,
      finished: false,
      finishTime: 0,
      totalDistance: 0,
      isAirborne: false,
      targetWpIndex: 1,
      aiAggression: 1.0,
      aiUseItemTimer: 0,
    };
    karts.push(playerKart);

    // Rivals
    let rivalIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (i === playerGridIndex) continue;
      const rGrid = track.gridPositions[i];
      const rivalChar = rivalsList[rivalIndex % rivalsList.length];
      rivalIndex++;

      karts.push({
        id: `rival_${rivalChar.id}`,
        charId: rivalChar.id,
        isPlayer: false,
        x: rGrid.x,
        y: rGrid.y,
        z: 0,
        vz: 0,
        angle: rGrid.angle,
        speed: 0,
        steer: 0,
        driftDir: 0,
        driftTime: 0,
        miniTurboLevel: 0,
        boostTimer: 0,
        starTimer: 0,
        lightningTimer: 0,
        spinTimer: 0,
        spinType: 'slip',
        invulnerableTimer: 0,
        coins: 0,
        item: 'none',
        itemRouletteTimer: 0,
        rouletteDisplayItem: 'none',
        holdingItem: false,
        lap: 1,
        checkpointIndex: 0,
        progress: 0,
        rank: i + 1,
        finished: false,
        finishTime: 0,
        totalDistance: 0,
        isAirborne: false,
        targetWpIndex: 1,
        aiAggression: 0.8 + Math.random() * 0.4,
        aiUseItemTimer: 2.0 + Math.random() * 4.0,
      });
    }

    loopRef.current.track = track;
    loopRef.current.player = playerKart;
    loopRef.current.allKarts = karts;
    loopRef.current.activeItems = [];
    loopRef.current.particles = [];
    loopRef.current.raceTime = 0;
    loopRef.current.rocketStartCharged = false;

    setGameState('countdown');
    setCountdownNum(3);
    marioKartAudio.playCountdown(false);

    // Countdown sequence (3 -> 2 -> 1 -> GO)
    let count = 3;
    const interval = window.setInterval(() => {
      count--;
      if (count === 2) {
        setCountdownNum(2);
        marioKartAudio.playCountdown(false);
      } else if (count === 1) {
        setCountdownNum(1);
        marioKartAudio.playCountdown(false);
        // Rocket start window begins
        if (inputsRef.current.accelerate) {
          loopRef.current.rocketStartCharged = true;
        }
      } else if (count === 0) {
        setCountdownNum(0);
        marioKartAudio.playCountdown(true);
        marioKartAudio.startEngine();

        // Rocket Startはタイミング良く溜めた場合のみ (GO時点で踏みっぱなしでは付与しない)
        if (loopRef.current.rocketStartCharged) {
          playerKart.boostTimer = 2.0;
          marioKartAudio.playRocketStart();
        }

        setGameState('racing');
        loopRef.current.lastTime = performance.now();
        loopRef.current.isLooping = true;
      } else {
        window.clearInterval(interval);
        if (countdownIntervalRef.current === interval) countdownIntervalRef.current = 0;
        setCountdownNum(-1); // Finished countdown display
      }
    }, 1000);
    countdownIntervalRef.current = interval;
  }, [gameMode]);

  // Main 60FPS Game Loop
  useEffect(() => {
    if (!['countdown', 'racing', 'finished'].includes(gameState)) {
      if (gameState !== 'paused') {
        marioKartAudio.stopEngine();
      }
      return;
    }

    let animId = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - loopRef.current.lastTime) / 1000, 0.05);
      loopRef.current.lastTime = currentTime;

      const { track, player, allKarts, activeItems, particles } = loopRef.current;
      if (!track || !player) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      if (gameState === 'racing') {
        loopRef.current.raceTime += dt;

        // 1. Update Player Physics
        updatePlayerKart(
          player,
          inputsRef.current,
          track,
          engineClass,
          particles,
          activeItems,
          allKarts,
          dt
        );

        // 2. Update Rivals AI
        for (const k of allKarts) {
          if (!k.isPlayer) {
            updateRivalAI(k, track, engineClass, player, allKarts, activeItems, particles, dt);
          }
        }

        // 3. Update Projectiles & Pickups
        updateActiveItems(activeItems, allKarts, track, particles, dt);

        // 4. Kart Collisions
        checkKartCollisions(allKarts, particles);

        // 5. Track Laps & Progress
        updateRaceProgress(allKarts, track);

        // 6. Track Pickups Respawn
        updateTrackPickups(track, dt);
      } else if (gameState === 'countdown') {
        // Rocket start check during countdown
        if (countdownNum === 1 && inputsRef.current.accelerate) {
          loopRef.current.rocketStartCharged = true;
        }
      }

      // 6. Particles
      updateParticles(particles, dt);

      // Check Race Finish (多重発火ガード付き)
      if (player.finished && !finishHandledRef.current) {
        finishHandledRef.current = true;
        const finalRank = player.rank;
        const finalTime = loopRef.current.raceTime;
        const finalCoins = player.coins;
        setRaceResult({
          rank: finalRank,
          time: finalTime,
          coins: finalCoins,
        });
        saveBestTime(track.id, finalTime);

        // Update Grand Prix points if applicable
        if (gameMode === 'grand_prix') {
          const ptsMap: Record<number, number> = { 1: 9, 2: 6, 3: 3, 4: 1 };
          const earnedPts = ptsMap[player.rank] || 0;
          setGpScores((prev) => ({
            ...prev,
            [player.charId]: (prev[player.charId] || 0) + earnedPts,
          }));
        }

        if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = window.setTimeout(() => {
          setGameState('finished');
        }, 2200);
      }

      // 7. Render 3D Canvas
      if (canvasRef.current) {
        renderGameView({
          canvas: canvasRef.current,
          track,
          player,
          allKarts,
          activeItems,
          particles,
          raceTime: loopRef.current.raceTime,
          countdownState: countdownNum,
          isRearView: inputsRef.current.rearView,
        });
      }

      animId = requestAnimationFrame(gameLoop);
    };

    loopRef.current.lastTime = performance.now();
    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      marioKartAudio.stopEngine();
    };
  }, [gameState, engineClass, countdownNum, gameMode, saveBestTime]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    marioKartAudio.setMuted(next);
  };

  // アンマウント時にタイマーを確実に破棄
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
      marioKartAudio.stopEngine();
      marioKartAudio.stopStarBgm();
    };
  }, []);

  const handleNextTrackInGrandPrix = () => {
    const nextIdx = grandPrixIndex + 1;
    if (nextIdx < TRACK_LIST.length) {
      setGrandPrixIndex(nextIdx);
      const nextCourse = TRACK_LIST[nextIdx].id;
      setSelectedCourseId(nextCourse);
      setRaceResult(null);
      startRace(nextCourse, selectedCharId);
    } else {
      // Completed all 5 tracks -> Go to Podium!
      setTrophies((prev) => {
        const next = { ...prev, [engineClass]: true };
        try {
          localStorage.setItem(MARIO_KART_TROPHIES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      setGameState('podium');
    }
  };

  const handleRestart = () => {
    setRaceResult(null);
    startRace(selectedCourseId, selectedCharId);
  };

  // Touch Controller handlers for Mobile
  const setTouchInput = (key: keyof InputState, value: boolean) => {
    inputsRef.current[key] = value;
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden p-0 m-0'
          : 'w-full max-w-5xl my-4 px-2'
      }`}
    >
      {/* Game Window Container */}
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border shadow-2xl transition-all ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none bg-black'
            : isDark
            ? 'w-full aspect-[16/10] max-h-[85vh] bg-slate-950 border-slate-800'
            : 'w-full aspect-[16/10] max-h-[85vh] bg-slate-100 border-slate-300'
        }`}
      >
        {/* Top Control Bar in Header */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => {
              marioKartAudio.stopEngine();
              marioKartAudio.stopStarBgm();
              if (countdownIntervalRef.current) {
                window.clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = 0;
              }
              if (finishTimeoutRef.current) {
                window.clearTimeout(finishTimeoutRef.current);
                finishTimeoutRef.current = 0;
              }
              if (gameState === 'racing' || gameState === 'paused' || gameState === 'finished') {
                setGameState('title');
              } else {
                onBackToHub();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold transition border border-white/10 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {gameState === 'title' ? 'ハブへ' : 'タイトル'}
          </button>

          <div className="flex items-center gap-2">
            {gameState === 'racing' && (
              <button
                onClick={() => setGameState('paused')}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition border border-white/10 cursor-pointer shadow-lg"
                title="ポーズ (P)"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowHowToPlay(!showHowToPlay)}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition border border-white/10 cursor-pointer shadow-lg"
              title="あそびかた"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition border border-white/10 cursor-pointer shadow-lg"
              title="ミュート切替"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3D Canvas (Active during Racing / Paused / Finished / Countdown) */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className={`${isFullscreen ? 'w-screen h-screen object-contain bg-black' : 'w-full h-full object-contain'} ${
            ['racing', 'paused', 'finished', 'countdown'].includes(gameState)
              ? 'block'
              : 'hidden'
          }`}
        />

        {/* --- TITLE SCREEN --- */}
        {gameState === 'title' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-white select-none">
            {/* Super Mario Kart Logo Banner */}
            <div className="flex flex-col items-center mb-6 animate-pulse">
              <span className="text-xs md:text-sm font-black tracking-widest text-amber-400 uppercase drop-shadow">
                ★ 16-BIT RETRO 3D GRAND PRIX ★
              </span>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-2xl">
                SUPER MARIO KART
              </h1>
              <span className="text-sm font-bold text-sky-300 tracking-wider">
                Mode 7 擬似3D完全再現エディション
              </span>
            </div>

            {/* Engine Class Selection */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-bold text-slate-400">クラス排気量:</span>
              {(['50cc', '100cc', '150cc'] as EngineClass[]).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setEngineClass(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    engineClass === cls
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {trophies[cls] && <Trophy className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  <span>{cls}</span>
                </button>
              ))}
            </div>

            {/* Mode Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-8">
              <button
                onClick={() => {
                  setGameMode('grand_prix');
                  setGrandPrixIndex(0);
                  setGpScores({});
                  setGameState('char_select');
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 cursor-pointer transition transform hover:scale-102 active:scale-98"
              >
                <Trophy className="w-4 h-4" />
                グランプリ (全5戦)
              </button>

              <button
                onClick={() => {
                  setGameMode('vs_race');
                  setGameState('char_select');
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 cursor-pointer transition transform hover:scale-102 active:scale-98"
              >
                <Play className="w-4 h-4" />
                VS レース (1戦)
              </button>

              <button
                onClick={() => {
                  setGameMode('time_trial');
                  setGameState('char_select');
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 cursor-pointer transition transform hover:scale-102 active:scale-98"
              >
                <Zap className="w-4 h-4" />
                タイムアタック
              </button>
            </div>

            {/* Features Tags */}
            <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                🏎️ 8台フル出走AI
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                ⚡ ドリフト＆火花ミニターボ
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                🐢 ミドリ/アカ/トゲゾーこうら
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50">
                🚀 ロケットスタート完備
              </span>
            </div>
          </div>
        )}

        {/* --- CHARACTER SELECT SCREEN --- */}
        {gameState === 'char_select' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-slate-900 to-black text-white select-none overflow-y-auto">
            <div className="text-center mt-6">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                DRIVER SELECT
              </span>
              <h2 className="text-2xl md:text-3xl font-black">レーサーを選択</h2>
            </div>

            {/* 8 Racers Grid */}
            <div className="grid grid-cols-4 gap-3 w-full max-w-2xl my-4">
              {CHARACTER_LIST.map((c) => {
                const isSelected = selectedCharId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCharId(c.id)}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-rose-950/70 border-rose-500 shadow-lg shadow-rose-500/20 scale-105'
                        : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/80 hover:border-slate-500'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-inner"
                      style={{ backgroundColor: c.kartColor }}
                    >
                      <span className="text-xl font-black text-white">
                        {c.name.slice(0, 1)}
                      </span>
                    </div>
                    <span className="text-xs font-black">{c.name}</span>
                    <span className="text-[10px] text-slate-400">{c.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Racer Stats Detail */}
            {selectedCharId && (
              <div className="w-full max-w-md p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-amber-300">
                    {CHARACTERS[selectedCharId].name} - {CHARACTERS[selectedCharId].title}
                  </span>
                  <span className="text-xs text-slate-400">{CHARACTERS[selectedCharId].nameEn}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {CHARACTERS[selectedCharId].description}
                </p>

                {/* Stats Bars */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>最高速度</span>
                      <span>{CHARACTERS[selectedCharId].speed}/5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${(CHARACTERS[selectedCharId].speed / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>加速力</span>
                      <span>{CHARACTERS[selectedCharId].accel}/5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${(CHARACTERS[selectedCharId].accel / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>車体重量</span>
                      <span>{CHARACTERS[selectedCharId].weight}/5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(CHARACTERS[selectedCharId].weight / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>旋回ハンドリング</span>
                      <span>{CHARACTERS[selectedCharId].handling}/5</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${(CHARACTERS[selectedCharId].handling / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Button */}
            <div className="flex gap-4 w-full max-w-md mt-4">
              <button
                onClick={() => setGameState('title')}
                className="py-2.5 px-5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                戻る
              </button>
              <button
                onClick={() => {
                  if (gameMode === 'grand_prix') {
                    // GP always starts at Track 1
                    setSelectedCourseId('mario_circuit');
                    setRaceResult(null);
                    startRace('mario_circuit', selectedCharId);
                  } else {
                    setGameState('track_select');
                  }
                }}
                className="flex-1 py-2.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                {gameMode === 'grand_prix' ? 'グランプリ開幕！' : 'コース選択へ'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- TRACK SELECT SCREEN --- */}
        {gameState === 'track_select' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-slate-900 to-black text-white select-none overflow-y-auto">
            <div className="text-center mt-6">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                COURSE SELECT
              </span>
              <h2 className="text-2xl md:text-3xl font-black">コースを選択</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl my-4">
              {TRACK_LIST.map((t) => {
                const isSelected = selectedCourseId === t.id;
                const bTime = bestTimes[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedCourseId(t.id)}
                    className={`flex flex-col p-4 rounded-2xl border transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-xl shadow-indigo-500/20 scale-102'
                        : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black">{t.name}</span>
                      <span className="text-[10px] text-slate-400">{t.nameEn}</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                      {t.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400">
                      <span>3周 (3 Laps)</span>
                      {bTime ? (
                        <span className="text-amber-400 font-mono font-bold">
                          BEST: {bTime.toFixed(2)}s
                        </span>
                      ) : (
                        <span>未記録</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 w-full max-w-md mt-4">
              <button
                onClick={() => setGameState('char_select')}
                className="py-2.5 px-5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                戻る
              </button>
              <button
                onClick={() => {
                  setRaceResult(null);
                  startRace(selectedCourseId, selectedCharId);
                }}
                className="flex-1 py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                レース開始！
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- PAUSE MENU --- */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white select-none">
            <h2 className="text-3xl font-black italic tracking-wider mb-6 text-amber-400">
              PAUSED
            </h2>
            <div className="flex flex-col gap-3 w-56">
              <button
                onClick={() => setGameState('racing')}
                className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer"
              >
                レース再開
              </button>
              <button
                onClick={handleRestart}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition cursor-pointer"
              >
                リスタート
              </button>
              <button
                onClick={() => setGameState('title')}
                className="py-2.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer"
              >
                タイトルに戻る
              </button>
            </div>
          </div>
        )}

        {/* --- RACE FINISHED / RESULT SCREEN --- */}
        {gameState === 'finished' && raceResult && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md text-white select-none p-6 animate-in fade-in duration-300">
            <div className="text-center mb-4">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                RACE RESULTS
              </span>
              <h2 className="text-4xl font-black italic">
                {raceResult.rank === 1 ? '🏆 VICTORY!! 1ST PLACE!' : `${raceResult.rank}位 フィニッシュ!`}
              </h2>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs p-4 rounded-2xl bg-slate-900/80 border border-slate-700 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">順位:</span>
                <span className="font-bold text-amber-400">{raceResult.rank} / 8 位</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">タイム:</span>
                <span className="font-mono font-bold text-white">{raceResult.time.toFixed(2)} 秒</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">獲得コイン:</span>
                <span className="font-bold text-yellow-400">🪙 {raceResult.coins} 枚</span>
              </div>
              {gameMode === 'grand_prix' && (
                <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
                  <span className="text-slate-400">獲得GPポイント:</span>
                  <span className="font-bold text-emerald-400">
                    +{raceResult.rank === 1 ? 9 : raceResult.rank === 2 ? 6 : raceResult.rank === 3 ? 3 : 1} pts
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition cursor-pointer"
              >
                再挑戦
              </button>
              {gameMode === 'grand_prix' ? (
                <button
                  onClick={handleNextTrackInGrandPrix}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition cursor-pointer"
                >
                  {grandPrixIndex < TRACK_LIST.length - 1 ? '次のコースへ' : '表彰式へ！'}
                </button>
              ) : (
                <button
                  onClick={() => setGameState('track_select')}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer"
                >
                  コース選択
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- GRAND PRIX PODIUM CEREMONY --- */}
        {gameState === 'podium' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-white select-none p-6">
            <Trophy className="w-16 h-16 text-yellow-400 animate-bounce mb-3" />
            <h2 className="text-3xl md:text-5xl font-black italic text-amber-300 mb-2">
              GRAND PRIX 表彰式！
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              全5コース完走！{engineClass} チャンピオンシップトロフィー獲得！
            </p>

            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 mb-6">
              <span className="text-xs text-slate-400">総合獲得ポイント:</span>
              <span className="text-xl font-black text-yellow-400 font-mono">
                {gpScores[selectedCharId] || 0} pts
              </span>
            </div>

            <button
              onClick={() => setGameState('title')}
              className="py-3 px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl cursor-pointer transition transform hover:scale-105"
            >
              タイトルに戻る
            </button>
          </div>
        )}

        {/* Mobile On-Screen Touch Controls (Shown during Racing/Countdown) */}
        {['racing', 'countdown'].includes(gameState) && (
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:hidden">
            {/* Top touch actions (Item & Rear-view) */}
            <div className="flex justify-between pointer-events-auto">
              <button
                onTouchStart={() => setTouchInput('useItem', true)}
                onTouchEnd={() => setTouchInput('useItem', false)}
                className="w-14 h-14 rounded-full bg-amber-500/80 active:bg-amber-400 text-white font-black text-xs shadow-lg flex items-center justify-center border-2 border-white/40"
              >
                ITEM
              </button>
              <button
                onTouchStart={() => setTouchInput('rearView', true)}
                onTouchEnd={() => setTouchInput('rearView', false)}
                className="w-12 h-12 rounded-full bg-slate-800/80 active:bg-slate-700 text-white font-black text-[10px] shadow-lg flex items-center justify-center border border-white/20"
              >
                REAR
              </button>
            </div>

            {/* Bottom Touch controls (Steering & Accel/Brake/Drift) */}
            <div className="flex justify-between items-end pointer-events-auto">
              {/* Steering D-Pad */}
              <div className="flex gap-2">
                <button
                  onTouchStart={() => setTouchInput('left', true)}
                  onTouchEnd={() => setTouchInput('left', false)}
                  className="w-16 h-16 rounded-2xl bg-slate-800/80 active:bg-slate-700 text-white font-black text-xl flex items-center justify-center border border-white/20 shadow-lg"
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => setTouchInput('right', true)}
                  onTouchEnd={() => setTouchInput('right', false)}
                  className="w-16 h-16 rounded-2xl bg-slate-800/80 active:bg-slate-700 text-white font-black text-xl flex items-center justify-center border border-white/20 shadow-lg"
                >
                  ▶
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onTouchStart={() => setTouchInput('drift', true)}
                  onTouchEnd={() => setTouchInput('drift', false)}
                  className="w-14 h-14 rounded-full bg-sky-600/80 active:bg-sky-500 text-white font-black text-xs flex items-center justify-center border-2 border-white/30 shadow-lg"
                >
                  HOP
                </button>
                <button
                  onTouchStart={() => setTouchInput('brake', true)}
                  onTouchEnd={() => setTouchInput('brake', false)}
                  className="w-14 h-14 rounded-full bg-red-600/80 active:bg-red-500 text-white font-black text-xs flex items-center justify-center border-2 border-white/30 shadow-lg"
                >
                  BRAKE
                </button>
                <button
                  onTouchStart={() => setTouchInput('accelerate', true)}
                  onTouchEnd={() => setTouchInput('accelerate', false)}
                  className="w-16 h-16 rounded-full bg-emerald-600/90 active:bg-emerald-500 text-white font-black text-sm flex items-center justify-center border-2 border-white/50 shadow-xl"
                >
                  GO!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 text-white text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-amber-400">
                  🏁 あそびかた・テクニックガイド
                </h3>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-slate-300">
                <div>
                  <h4 className="font-bold text-white mb-1">【PCキーボード操作】</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong className="text-emerald-400">↑ / W</strong> : アクセル（前進）</li>
                    <li><strong className="text-rose-400">↓ / S</strong> : ブレーキ / バック</li>
                    <li><strong className="text-sky-400">← → / A D</strong> : ステアリング（旋回）</li>
                    <li><strong className="text-amber-400">Space / Shift</strong> : ホップ ＆ ドリフト</li>
                    <li><strong className="text-yellow-400">E / Enter / Ctrl</strong> : アイテム使用（↓＋で後方投擲）</li>
                    <li><strong className="text-indigo-400">C / B</strong> : バックミラー（後方確認）</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-amber-300 mb-1">【秘伝のテクニック】</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>ロケットスタート:</strong> カウントダウン「2」の終わり〜「1」のタイミングでアクセルを踏み込むとスタートダッシュ！
                    </li>
                    <li>
                      <strong>ドリフト＆ミニターボ:</strong> カーブ中にジャンプ（ホップ）ボタンを押し続けるとドリフト突入！カウンターステアで火花（青→橙）をチャージし、ボタンを離すと猛烈ブースト！
                    </li>
                    <li>
                      <strong>コイン収集:</strong> コース上のコインを集めると最高速度が上昇（最大10枚で+15%）！
                    </li>
                    <li>
                      <strong>アイテム逆噴射:</strong> ↓キーを押しながらミドリこうらやバナナを使うと後方に発射・設置可能！
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full mt-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
