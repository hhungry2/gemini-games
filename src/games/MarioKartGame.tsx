// Super Mario Kart GP - Main Game Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Volume2, VolumeX, HelpCircle, Trophy, ArrowLeft, Pause, ChevronRight, Zap, Minimize } from 'lucide-react';
import type { GameMode, EngineClass, CharacterId, CourseId, KartState, ActiveItem, Particle, InputState, TrackData } from './mariokart/types';
import { CHARACTERS, CHARACTER_LIST, TRACK_LIST, createTrackInstance } from './mariokart/tracks';
import { updatePlayerKart, updateRivalAI, updateActiveItems, checkKartCollisions, updateRaceProgress, updateParticles, updateTrackPickups } from './mariokart/physics';
import { renderGameView } from './mariokart/renderer';
import { marioKartAudio } from './mariokart/audio';
import { createRaceKarts, getGrandPrixPoints, getGrandPrixStandings, scoreGrandPrixRace, readBestTimes, readTrophies, saveRecord } from './mariokart/race';
import type { GrandPrixResults } from './mariokart/race';
import './mariokart/kart.css';

export const MARIO_KART_BEST_TIMES_KEY = 'mariokart_best_times_v1';
export const MARIO_KART_TROPHIES_KEY = 'mariokart_trophies_v1';
const TIME_TRIAL_RECORDS_KEY = 'mariokart_time_trials_v2';
const STEP = 1 / 60;
type RacePhase = 'countdown' | 'racing';
type GameState = 'title' | 'char_select' | 'track_select' | RacePhase | 'paused' | 'finishing' | 'finished' | 'podium';
const emptyInputs = (): InputState => ({ accelerate: false, brake: false, left: false, right: false, drift: false, useItem: false, rearView: false });
const inputKeys: Record<keyof InputState, string[]> = {
  accelerate: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  drift: ['Space', 'ShiftLeft', 'ShiftRight'], useItem: ['KeyE', 'Enter', 'ControlLeft', 'ControlRight'], rearView: ['KeyC', 'KeyB'],
};

interface MarioKartGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MarioKartGame: React.FC<MarioKartGameProps> = ({ onBackToHub, isDark = true, isFullscreen = false, onToggleFullscreen }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('title');
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const pausedPhaseRef = useRef<RacePhase>('racing');
  const [gameMode, setGameMode] = useState<GameMode>('grand_prix');
  const [engineClass, setEngineClass] = useState<EngineClass>('100cc');
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>('mario');
  const [selectedCourseId, setSelectedCourseId] = useState<CourseId>('mario_circuit');
  const [grandPrixIndex, setGrandPrixIndex] = useState(0);
  const [gpResults, setGpResults] = useState<GrandPrixResults>({});
  const standings = getGrandPrixStandings(gpResults);
  const playerStanding = standings.find((entry) => entry.character.id === selectedCharId)!;
  const [isMuted, setIsMuted] = useState(() => marioKartAudio.getMuted());
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [raceResult, setRaceResult] = useState<{ rank: number; time: number; coins: number; isNewBest: boolean } | null>(null);
  const [bestTimes, setBestTimes] = useState(() => readBestTimes(MARIO_KART_BEST_TIMES_KEY));
  const [trialTimes, setTrialTimes] = useState(() => readBestTimes(TIME_TRIAL_RECORDS_KEY));
  const [trophies, setTrophies] = useState(() => readTrophies(MARIO_KART_TROPHIES_KEY));
  const inputsRef = useRef(emptyInputs());
  const keyboardRef = useRef(new Set<string>());
  const pointersRef = useRef(new Map<number, keyof InputState>());
  const previousItemHeldRef = useRef(false);
  const finishHandledRef = useRef(false);
  const loopRef = useRef<{
    track: TrackData | null; player: KartState | null; allKarts: KartState[];
    activeItems: ActiveItem[]; particles: Particle[]; raceTime: number;
    accumulator: number; countdownElapsed: number; finishElapsed: number; rocketStartCharged: boolean;
  }>({ track: null, player: null, allKarts: [], activeItems: [], particles: [], raceTime: 0,
    accumulator: 0, countdownElapsed: 0, finishElapsed: 0, rocketStartCharged: false });

  const clearInputs = useCallback(() => {
    keyboardRef.current.clear();
    pointersRef.current.clear();
    inputsRef.current = emptyInputs();
  }, []);

  const syncInputs = useCallback(() => {
    const previous = inputsRef.current;
    const next = emptyInputs();
    for (const key of Object.keys(inputKeys) as (keyof InputState)[]) {
      next[key] = inputKeys[key].some((code) => keyboardRef.current.has(code)) || [...pointersRef.current.values()].includes(key);
    }
    // Item use is a press event, retained until the next physics step.
    const itemWasHeld = previousItemHeldRef.current;
    previousItemHeldRef.current = next.useItem;
    next.useItem = previous.useItem || (next.useItem && !itemWasHeld);
    if (gameStateRef.current === 'countdown' && next.accelerate !== previous.accelerate) {
      loopRef.current.rocketStartCharged = next.accelerate && loopRef.current.countdownElapsed >= 1.8;
    }
    inputsRef.current = next;
  }, []);

  const pauseRace = useCallback(() => {
    const current = gameStateRef.current;
    if (current !== 'countdown' && current !== 'racing') return;
    pausedPhaseRef.current = current;
    clearInputs();
    gameStateRef.current = 'paused';
    setGameState('paused');
  }, [clearInputs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const phase = gameStateRef.current;
      if (showHowToPlay) {
        if (event.code === 'Escape') setShowHowToPlay(false);
        return;
      }
      if (event.code === 'KeyP' || event.code === 'Escape') {
        if (event.repeat) return;
        if (phase === 'paused') setGameState(pausedPhaseRef.current);
        else pauseRace();
        return;
      }
      if (phase !== 'countdown' && phase !== 'racing') return;
      if (!Object.values(inputKeys).some((codes) => codes.includes(event.code))) return;
      event.preventDefault();
      keyboardRef.current.add(event.code);
      syncInputs();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keyboardRef.current.delete(event.code);
      syncInputs();
    };
    const onVisibility = () => { if (document.hidden) pauseRace(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', pauseRace);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', pauseRace);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pauseRace, syncInputs, showHowToPlay]);

  const renderFrame = useCallback(() => {
    const { track, player, allKarts, activeItems, particles, raceTime } = loopRef.current;
    if (!canvasRef.current || !track || !player) return;
    renderGameView({ canvas: canvasRef.current, track, player, allKarts, activeItems, particles, raceTime,
      countdownState: countdownNum, isRearView: inputsRef.current.rearView });
  }, [countdownNum]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvasHostRef.current;
    if (!canvas || !host) return;
    const resize = () => {
      const width = Math.min(host.clientWidth, host.clientHeight * 16 / 9);
      // Mode 7 rasterization is CPU based; cap pixels while keeping a 16:9 view.
      const backingWidth = Math.round(Math.max(640, Math.min(1280, width * Math.min(window.devicePixelRatio || 1, 1.5))) / 16) * 16;
      const backingHeight = backingWidth * 9 / 16;
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
        renderFrame();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => observer.disconnect();
  }, [isFullscreen, renderFrame]);

  const saveBestTime = useCallback((courseId: CourseId, time: number) => {
    setBestTimes((previous) => {
      if (previous[courseId] !== undefined && previous[courseId] <= time) return previous;
      const next = { ...previous, [courseId]: time };
      saveRecord(MARIO_KART_BEST_TIMES_KEY, next);
      return next;
    });
    const recordKey = `${courseId}_${engineClass}`;
    const isNewBest = gameMode === 'time_trial' && (trialTimes[recordKey] === undefined || time < trialTimes[recordKey]);
    if (isNewBest) setTrialTimes((previous) => {
      const next = { ...previous, [recordKey]: time };
      saveRecord(TIME_TRIAL_RECORDS_KEY, next);
      return next;
    });
    return isNewBest;
  }, [engineClass, gameMode, trialTimes]);

  const startRace = useCallback((courseId: CourseId, playerChar: CharacterId) => {
    clearInputs();
    previousItemHeldRef.current = false;
    marioKartAudio.stopEngine();
    marioKartAudio.stopStarBgm();
    finishHandledRef.current = false;
    const track = createTrackInstance(courseId);
    if (gameMode === 'time_trial') track.itemBoxes = [];
    const karts = createRaceKarts(track, playerChar, gameMode);
    loopRef.current = { track, player: karts.find((kart) => kart.isPlayer)!, allKarts: karts,
      activeItems: [], particles: [], raceTime: 0, accumulator: 0, countdownElapsed: 0, finishElapsed: 0, rocketStartCharged: false };
    if (gameMode === 'grand_prix') setGpResults((previous) => {
      const next = { ...previous };
      delete next[courseId];
      return next;
    });
    setRaceResult(null);
    setShowHowToPlay(false);
    setCountdownNum(3);
    gameStateRef.current = 'countdown';
    setGameState('countdown');
    marioKartAudio.playCountdown(false);
  }, [clearInputs, gameMode]);

  useEffect(() => {
    if (gameState === 'racing' && !isMuted) {
      marioKartAudio.startEngine();
      if ((loopRef.current.player?.starTimer ?? 0) > 0) marioKartAudio.startStarBgm();
    } else {
      marioKartAudio.stopEngine();
      marioKartAudio.stopStarBgm();
    }
    if (gameState !== 'countdown' && gameState !== 'racing') {
      clearInputs();
      previousItemHeldRef.current = false;
    }
    return () => { marioKartAudio.stopEngine(); marioKartAudio.stopStarBgm(); };
  }, [gameState, isMuted, clearInputs]);

  useEffect(() => {
    if (!['countdown', 'racing', 'finishing'].includes(gameState)) return;
    let animationId = 0;
    let lastTime = performance.now();
    const frame = (now: number) => {
      const delta = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
      lastTime = now;
      const loop = loopRef.current;
      const { track, player, allKarts, activeItems, particles } = loop;
      if (!track || !player) return;
      if (gameStateRef.current === 'countdown') {
        loop.countdownElapsed += delta;
        const count = Math.max(0, 3 - Math.floor(loop.countdownElapsed));
        if (count !== countdownNum) {
          setCountdownNum(count);
          marioKartAudio.playCountdown(count === 0);
        }
        if (count === 0) {
          if (loop.rocketStartCharged && inputsRef.current.accelerate) {
            player.boostTimer = 2;
            marioKartAudio.playRocketStart();
          }
          gameStateRef.current = 'racing';
          setGameState('racing');
        }
      } else if (gameStateRef.current === 'racing') {
        if (countdownNum === 0 && loop.raceTime > 0.8) setCountdownNum(-1);
        loop.accumulator += delta;
        while (loop.accumulator >= STEP && !player.finished) {
          loop.raceTime += STEP;
          loop.accumulator -= STEP;
          updatePlayerKart(player, inputsRef.current, track, engineClass, particles, activeItems, allKarts, STEP);
          inputsRef.current.useItem = false;
          for (const kart of allKarts) {
            if (!kart.isPlayer) updateRivalAI(kart, track, engineClass, player, allKarts, activeItems, particles, STEP);
          }
          updateActiveItems(activeItems, allKarts, track, particles, STEP);
          checkKartCollisions(allKarts, particles);
          updateRaceProgress(allKarts, track, loop.raceTime, STEP);
          updateTrackPickups(track, STEP);
          updateParticles(particles, STEP);
        }
        if (player.finished && !finishHandledRef.current) {
          finishHandledRef.current = true;
          loop.raceTime = player.finishTime;
          const isNewBest = saveBestTime(track.id, player.finishTime);
          setRaceResult({ rank: player.rank, time: player.finishTime, coins: player.coins, isNewBest });
          if (gameMode === 'grand_prix') setGpResults((previous) => ({ ...previous, [track.id]: scoreGrandPrixRace(allKarts) }));
          setCountdownNum(-1);
          gameStateRef.current = 'finishing';
          setGameState('finishing');
        }
      } else if (gameStateRef.current === 'finishing') {
        loop.finishElapsed += delta;
        if (loop.finishElapsed >= 2.2) setGameState('finished');
      }
      renderFrame();
      animationId = requestAnimationFrame(frame);
    };
    animationId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, countdownNum, engineClass, gameMode, renderFrame, saveBestTime]);

  const toggleMute = () => {
    const next = !isMuted;
    marioKartAudio.setMuted(next);
    setIsMuted(next);
  };
  const handleNextTrackInGrandPrix = () => {
    const nextIndex = grandPrixIndex + 1;
    if (nextIndex < TRACK_LIST.length) {
      setGrandPrixIndex(nextIndex);
      const course = TRACK_LIST[nextIndex].id;
      setSelectedCourseId(course);
      startRace(course, selectedCharId);
    } else {
      if (playerStanding.rank === 1) setTrophies((previous) => {
        const next = { ...previous, [engineClass]: true };
        saveRecord(MARIO_KART_TROPHIES_KEY, next);
        return next;
      });
      setGameState('podium');
    }
  };
  const handleRestart = () => startRace(selectedCourseId, selectedCharId);
  const touchHandlers = (key: keyof InputState) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, key);
      syncInputs();
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointersRef.current.delete(event.pointerId);
      syncInputs();
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointersRef.current.delete(event.pointerId);
      syncInputs();
    },
    onLostPointerCapture: (event: React.PointerEvent<HTMLButtonElement>) => {
      pointersRef.current.delete(event.pointerId);
      syncInputs();
    },
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });

  const gameContent = (
    <div
      className={`flex flex-col items-center justify-center ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-full h-[100dvh] bg-black overflow-hidden p-0 m-0'
          : 'relative w-full h-[calc(100dvh-4.5rem)] sm:h-[calc(100dvh-5rem)] max-w-5xl min-h-0 shrink-0 py-1'
      }`}
    >
      {/* Game Window Container */}
      <div
        className={`relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border shadow-2xl ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none bg-black'
            : isDark
            ? 'w-full h-full min-h-0 bg-slate-950 border-slate-800'
            : 'w-full h-full min-h-0 bg-slate-100 border-slate-300'
        }`}
      >
        {/* Top Control Bar in Header */}
        <div className="absolute top-3 left-3 right-3 z-[35] flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => {
              clearInputs();
              setShowHowToPlay(false);
              if (gameState === 'title') {
                if (isFullscreen) onToggleFullscreen?.();
                onBackToHub();
              }
              else setGameState('title');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold transition border border-white/10 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {gameState === 'title' ? 'ハブへ' : 'タイトル'}
          </button>

          <div className="flex items-center gap-2">
            {isFullscreen && onToggleFullscreen && (
              <button onClick={onToggleFullscreen} title="フルスクリーンを解除" aria-label="フルスクリーンを解除"
                className="p-2 rounded-full bg-black/60 text-white border border-white/10 cursor-pointer">
                <Minimize className="w-3.5 h-3.5" />
              </button>
            )}
            {['racing', 'countdown'].includes(gameState) && (
              <button
                onClick={pauseRace}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition border border-white/10 cursor-pointer shadow-lg"
                title="ポーズ (P)"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                if (!showHowToPlay) pauseRace();
                setShowHowToPlay(!showHowToPlay);
              }}
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
        <div ref={canvasHostRef} className="mario-kart-canvas absolute inset-x-0 top-12 bottom-28 md:bottom-0 [@media(pointer:coarse)]:bottom-28 bg-black">
          <canvas ref={canvasRef} width={640} height={360}
            aria-label="カートレース画面。矢印キーで運転、Spaceでドリフト、Eでアイテム、Pで一時停止。"
            className={`w-full h-full object-contain ${['racing', 'paused', 'finishing', 'finished', 'countdown'].includes(gameState) ? 'block' : 'hidden'}`} />
        </div>

        {/* --- TITLE SCREEN --- */}
        {gameState === 'title' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start px-4 pt-16 pb-5 overflow-y-auto [&>*]:shrink-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-white select-none">
            {/* Super Mario Kart Logo Banner */}
            <div className="flex flex-col items-center mb-6 animate-pulse">
              <span className="text-xs md:text-sm font-black tracking-widest text-amber-400 uppercase drop-shadow">
                ★ 16-BIT RETRO 3D GRAND PRIX ★
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-6xl text-center font-black italic tracking-tighter bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-2xl">
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
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mb-5">
              <button
                onClick={() => {
                  setGameMode('grand_prix');
                  setGrandPrixIndex(0);
                  setGpResults({});
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start gap-3 px-3 sm:px-6 pt-14 pb-5 [&>*]:shrink-0 bg-gradient-to-b from-slate-900 to-black text-white select-none overflow-y-auto">
            <div className="text-center mt-2">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                DRIVER SELECT
              </span>
              <h2 className="text-2xl md:text-3xl font-black">レーサーを選択</h2>
            </div>

            {/* 8 Racers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full max-w-2xl my-4">
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
                      className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 shadow-inner"
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-start gap-3 px-3 sm:px-6 pt-14 pb-5 [&>*]:shrink-0 bg-gradient-to-b from-slate-900 to-black text-white select-none overflow-y-auto">
            <div className="text-center mt-2">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                COURSE SELECT
              </span>
              <h2 className="text-2xl md:text-3xl font-black">コースを選択</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl my-4">
              {TRACK_LIST.map((t) => {
                const isSelected = selectedCourseId === t.id;
                const bTime = gameMode === 'time_trial' ? trialTimes[`${t.id}_${engineClass}`] : bestTimes[t.id];
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
                      <span>{t.laps}周 · {engineClass}</span>
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
                onClick={() => setGameState(pausedPhaseRef.current)}
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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-start bg-black/85 backdrop-blur-md text-white select-none px-4 pt-14 pb-4 overflow-y-auto [&>*]:shrink-0 animate-in fade-in duration-300">
            <div className="text-center mb-4">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                RACE RESULTS
              </span>
              <h2 className="text-2xl sm:text-4xl font-black italic">
                {gameMode === 'time_trial' ? '🏁 TIME ATTACK COMPLETE!' : raceResult.rank === 1 ? '🏆 VICTORY!! 1ST PLACE!' : `${raceResult.rank}位 フィニッシュ!`}
              </h2>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs p-4 rounded-2xl bg-slate-900/80 border border-slate-700 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">順位:</span>
                <span className="font-bold text-amber-400">{raceResult.rank} / {loopRef.current.allKarts.length} 位</span>
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
                    +{getGrandPrixPoints(raceResult.rank)} pts
                  </span>
                </div>
              )}
            </div>

            {raceResult.isNewBest && <p className="text-emerald-300 font-black text-sm mb-4">✨ {engineClass} ベストタイム更新！</p>}
            {gameMode === 'grand_prix' && <p className="text-amber-300 text-xs mb-4">第{grandPrixIndex + 1}戦 / 全5戦 · 総合 {playerStanding.rank}位 · {playerStanding.points} pts</p>}
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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-start bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-white select-none px-4 pt-14 pb-4 overflow-y-auto [&>*]:shrink-0">
            <Trophy className="w-16 h-16 text-yellow-400 animate-bounce mb-3" />
            <h2 className="text-3xl md:text-5xl font-black italic text-amber-300 mb-2">
              GRAND PRIX 表彰式！
            </h2>
            <p className="text-xs text-slate-300 mb-4">
              全5コース完走！{engineClass} 総合{playerStanding.rank}位{playerStanding.rank === 1 ? '・チャンピオンシップトロフィー獲得！' : ''}
            </p>

            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 mb-6">
              <span className="text-xs text-slate-400">総合獲得ポイント:</span>
              <span className="text-xl font-black text-yellow-400 font-mono">
                {playerStanding.points} pts
              </span>
            </div>

            <div className="w-full max-w-sm mb-4 space-y-1" aria-label="グランプリ総合順位">
              {standings.map((entry) => (
                <div key={entry.character.id} className={`flex justify-between rounded-lg px-3 py-1 text-xs ${entry.character.id === selectedCharId ? 'bg-rose-600/40 text-white font-black' : 'bg-slate-800/60 text-slate-300'}`}>
                  <span>{entry.rank}位 {entry.character.name}</span><span>{entry.points} pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setGameState('title')}
              className="py-3 px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl cursor-pointer transition transform hover:scale-105"
            >
              タイトルに戻る
            </button>
          </div>
        )}

        {/* Pointer capture supports simultaneous touch and releases outside a button. */}
        {['racing', 'countdown'].includes(gameState) && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-between items-end gap-2 p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none select-none md:hidden [@media(pointer:coarse)]:flex" aria-label="タッチコントローラー">
            <div className="mario-kart-steering flex flex-col gap-2">
              <div className="flex gap-2">
                <button {...touchHandlers('useItem')} aria-label="アイテム使用" className="pointer-events-auto touch-none w-12 h-10 rounded-xl bg-amber-500/90 text-white font-black text-[10px] border border-white/30">ITEM</button>
                <button {...touchHandlers('rearView')} aria-label="後方確認" className="pointer-events-auto touch-none w-12 h-10 rounded-xl bg-slate-700/90 text-white font-black text-[10px] border border-white/30">REAR</button>
              </div>
              <div className="flex gap-2">
                <button {...touchHandlers('left')} aria-label="左へ曲がる" className="pointer-events-auto touch-none w-12 sm:w-16 h-12 sm:h-14 rounded-2xl bg-slate-800/90 active:bg-slate-600 text-white font-black text-xl border border-white/30">◀</button>
                <button {...touchHandlers('right')} aria-label="右へ曲がる" className="pointer-events-auto touch-none w-12 sm:w-16 h-12 sm:h-14 rounded-2xl bg-slate-800/90 active:bg-slate-600 text-white font-black text-xl border border-white/30">▶</button>
              </div>
            </div>
            <div className="flex items-end gap-1.5 sm:gap-2">
              <button {...touchHandlers('drift')} aria-label="ホップ・ドリフト" className="pointer-events-auto touch-none w-11 sm:w-14 h-11 sm:h-14 rounded-full bg-sky-600/90 active:bg-sky-500 text-white font-black text-[10px] border border-white/30">HOP</button>
              <button {...touchHandlers('brake')} aria-label="ブレーキ・バック" className="pointer-events-auto touch-none w-11 sm:w-14 h-11 sm:h-14 rounded-full bg-red-600/90 active:bg-red-500 text-white font-black text-[10px] border border-white/30">BRAKE</button>
              <button {...touchHandlers('accelerate')} aria-label="アクセル" className="pointer-events-auto touch-none w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-emerald-600/95 active:bg-emerald-500 text-white font-black text-xs border-2 border-white/50">GO!</button>
            </div>
          </div>
        )}

        {/* How to Play Modal */}
        {showHowToPlay && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 text-white text-xs max-h-full overflow-y-auto">
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
                    <li><strong>P / Esc</strong> : 一時停止 / 再開</li>
                  </ul>
                </div>

                <p>タイムアタックは単独走行・アイテムなし。排気量別にベストタイムを保存します。画面を離れると自動で一時停止します。</p>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">【秘伝のテクニック】</h4>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>ロケットスタート:</strong> 「2」の終わり〜「1」でアクセルを押し始め、そのままGOまで押し続けるとスタートダッシュ！最初から押し続けても発動しません。
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
  // A transformed hub ancestor would otherwise contain position:fixed and
  // leave the header's height above the fullscreen game.
  return isFullscreen ? createPortal(gameContent, document.body) : gameContent;
};
