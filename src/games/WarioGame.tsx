import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MICROGAMES, createMicrogameInstance } from './wario/microgames';
import { MicrogameDef, MicrogameInstance, InputState, MicrogameResult, WarioGameProps } from './wario/types';
import { warioAudio } from './wario/WarioAudio';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Play,
  BookOpen,
  Zap,
  Sparkles,
  Flame,
  X,
} from 'lucide-react';

const HIGH_SCORE_KEY = 'wario_high_score_v1';
const MAX_SPEED_KEY = 'wario_max_speed_v1';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

type GameScreen = 'title' | 'instruction' | 'playing' | 'result' | 'speedup' | 'gameover' | 'practice';

export const WarioGame: React.FC<WarioGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  // ゲーム状態
  const [screen, setScreen] = useState<GameScreen>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [maxSpeedLevel, setMaxSpeedLevel] = useState<number>(1);
  const [lives, setLives] = useState<number>(4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [speedLevel, setSpeedLevel] = useState<number>(1);

  // 現在のプチゲーム
  const [currentDef, setCurrentDef] = useState<MicrogameDef>(MICROGAMES[0]);
  const activeInstanceRef = useRef<MicrogameInstance | null>(null);
  const [lastResult, setLastResult] = useState<'success' | 'failure'>('success');
  const [practiceSelectedId, setPracticeSelectedId] = useState<string>(MICROGAMES[0].id);
  const isPracticeModeRef = useRef<boolean>(false);

  // タイマー＆アニメーション Ref
  const animFrameIdRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number>(0);
  const maxGameDurationRef = useRef<number>(4000); // 4秒
  const screenTimerRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // 入力状態
  const inputStateRef = useRef<InputState>({
    keys: {},
    pointer: {
      x: 0,
      y: 0,
      isDown: false,
      justPressed: false,
      justReleased: false,
    },
  });


  // ハイスコア読み込み
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
      if (savedScore) setHighScore(parseInt(savedScore, 10));
      const savedSpeed = localStorage.getItem(MAX_SPEED_KEY);
      if (savedSpeed) setMaxSpeedLevel(parseInt(savedSpeed, 10));
    } catch {
      // ignore
    }
  }, []);

  // ハイスコア保存
  const updateHighScore = useCallback((newScore: number, curSpeed: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        } catch {}
        return newScore;
      }
      return prev;
    });
    setMaxSpeedLevel((prev) => {
      if (curSpeed > prev) {
        try {
          localStorage.setItem(MAX_SPEED_KEY, curSpeed.toString());
        } catch {}
        return curSpeed;
      }
      return prev;
    });
  }, []);



  // プチゲームの開始
  const startNextMicrogame = useCallback((isPractice = false) => {
    let nextDef: MicrogameDef;
    if (isPractice) {
      nextDef = MICROGAMES.find((m) => m.id === practiceSelectedId) || MICROGAMES[0];
    } else {
      const randomIndex = Math.floor(Math.random() * MICROGAMES.length);
      nextDef = MICROGAMES[randomIndex];
    }
    setCurrentDef(nextDef);

    // 難易度Lv (1: 初級, 2: 中級, 3: 上級)
    const microgameLevel = Math.min(3, Math.floor(speedLevel / 2) + 1);
    const instance = createMicrogameInstance(nextDef.id, microgameLevel, CANVAS_WIDTH, CANVAS_HEIGHT);
    activeInstanceRef.current = instance;

    // 制限時間（スピードレベルに応じて短縮）
    maxGameDurationRef.current = Math.max(2200, 4200 / speedMultiplier);
    gameTimerRef.current = 0;

    // 指令画面へ
    setScreen('instruction');
    warioAudio.playInstruction();
    screenTimerRef.current = 1100; // 1.1秒指令表示
  }, [practiceSelectedId, speedLevel, speedMultiplier]);

  // 新規ゲーム開始
  const handleStartGame = () => {
    isPracticeModeRef.current = false;
    setScore(0);
    setLives(4);
    setSpeedMultiplier(1.0);
    setSpeedLevel(1);
    startNextMicrogame(false);
  };

  // 練習モード開始
  const handleStartPractice = () => {
    isPracticeModeRef.current = true;
    setSpeedMultiplier(1.0);
    setSpeedLevel(1);
    startNextMicrogame(true);
  };

  // メインループ
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const deltaMs = Math.min(60, time - lastTimeRef.current);
      lastTimeRef.current = time;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // --- 画面状態別の更新＆描画 ---
        if (screen === 'instruction') {
          screenTimerRef.current -= deltaMs;

          // 背景
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          // ドカンと指令表示
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 10;
          ctx.font = 'black 54px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentDef.instruction, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 25);

          ctx.font = 'bold 24px sans-serif';
          ctx.fillStyle = '#1e293b';
          ctx.fillText(currentDef.instructionEn, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);

          ctx.font = '48px sans-serif';
          ctx.fillText(currentDef.icon, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 95);
          ctx.restore();

          if (screenTimerRef.current <= 0) {
            setScreen('playing');
            warioAudio.startMicrogameBgm(speedMultiplier);
          }
        } else if (screen === 'playing' && activeInstanceRef.current) {
          gameTimerRef.current += deltaMs;
          const progress = Math.min(1.0, gameTimerRef.current / maxGameDurationRef.current);

          // プチゲーム更新
          const result: MicrogameResult = activeInstanceRef.current.update(
            progress,
            inputStateRef.current,
            deltaMs
          );

          // プチゲーム描画
          activeInstanceRef.current.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT - 35, progress, isDark);

          // 導火線ボムタイマー（画面下部）の描画
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, CANVAS_HEIGHT - 35, CANVAS_WIDTH, 35);

          // 導火線
          const fuseStartX = 30;
          const fuseEndX = CANVAS_WIDTH - 60;
          const currentFuseX = fuseStartX + (fuseEndX - fuseStartX) * progress;

          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(currentFuseX, CANVAS_HEIGHT - 17);
          ctx.lineTo(fuseEndX, CANVAS_HEIGHT - 17);
          ctx.stroke();

          // 導火線の火花パチパチ
          ctx.fillStyle = Math.random() > 0.5 ? '#ef4444' : '#facc15';
          ctx.beginPath();
          ctx.arc(currentFuseX, CANVAS_HEIGHT - 17 + (Math.random() - 0.5) * 6, 6, 0, Math.PI * 2);
          ctx.fill();

          // 爆弾アイコン
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', fuseEndX + 20, CANVAS_HEIGHT - 17);

          // クリア判定または時間切れ判定
          if (result === 'success') {
            warioAudio.stopBgm();
            setLastResult('success');
            setScore((s) => {
              const newScore = s + 1;
              updateHighScore(newScore, speedLevel);
              return newScore;
            });
            setScreen('result');
            screenTimerRef.current = 1000;
          } else if (result === 'failure' || progress >= 1.0) {
            warioAudio.stopBgm();
            warioAudio.playExplosion();
            setLastResult('failure');
            setLives((l) => {
              const nextLives = l - 1;
              if (nextLives <= 0) {
                setTimeout(() => {
                  setScreen('gameover');
                  warioAudio.playGameOver();
                }, 900);
              }
              return nextLives;
            });
            setScreen('result');
            screenTimerRef.current = 1100;
          }
        } else if (screen === 'result') {
          screenTimerRef.current -= deltaMs;

          // 結果スタンプ
          ctx.fillStyle = lastResult === 'success' ? '#10b981' : '#f43f5e';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.font = 'black 54px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            lastResult === 'success' ? 'せいこう！' : 'しっぱい…',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 - 20
          );

          ctx.font = 'bold 24px sans-serif';
          ctx.fillText(
            lastResult === 'success' ? 'SUCCESS!!' : 'FAILED...',
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 + 40
          );

          if (screenTimerRef.current <= 0 && lives > 0) {
            // 5問ごとにスピードアップ！
            const nextScore = score;
            if (nextScore > 0 && nextScore % 5 === 0 && lastResult === 'success' && !isPracticeModeRef.current) {
              setScreen('speedup');
              warioAudio.playSpeedUp();
              screenTimerRef.current = 1400;
            } else {
              startNextMicrogame(isPracticeModeRef.current);
            }
          }
        } else if (screen === 'speedup') {
          screenTimerRef.current -= deltaMs;

          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.font = 'black 48px sans-serif';
          ctx.fillStyle = '#fde047';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SPEED UP!!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);

          ctx.font = 'bold 20px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('ドンドン はやくなるぞ！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

          if (screenTimerRef.current <= 0) {
            setSpeedMultiplier((m) => Math.min(1.8, m + 0.15));
            setSpeedLevel((l) => l + 1);
            startNextMicrogame(false);
          }
        }
      }

      // 入力のリセット
      inputStateRef.current.pointer.justPressed = false;
      inputStateRef.current.pointer.justReleased = false;

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      warioAudio.stopBgm();
    };
  }, [screen, currentDef, speedMultiplier, speedLevel, score, lives, lastResult, startNextMicrogame, updateHighScore, isDark]);

  // 入力イベントハンドラー
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_WIDTH;
    const px = (clientX - rect.left) / scale;
    const py = (clientY - rect.top) / scale;

    inputStateRef.current.pointer.x = px;
    inputStateRef.current.pointer.y = py;
    inputStateRef.current.pointer.isDown = true;
    inputStateRef.current.pointer.justPressed = true;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = rect.width / CANVAS_WIDTH;
    const px = (clientX - rect.left) / scale;
    const py = (clientY - rect.top) / scale;

    inputStateRef.current.pointer.x = px;
    inputStateRef.current.pointer.y = py;
  };

  const handlePointerUp = () => {
    inputStateRef.current.pointer.isDown = false;
    inputStateRef.current.pointer.justReleased = true;
  };

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      inputStateRef.current.keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Enter') {
        inputStateRef.current.pointer.justPressed = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      inputStateRef.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col justify-between items-center select-none overflow-hidden transition-colors duration-300 ${
        isFullscreen
          ? 'h-[calc(100dvh-4.25rem)] p-1 sm:p-2'
          : 'h-[calc(100dvh-5.5rem)] max-w-4xl mx-auto py-2 px-3'
      } ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
    >
      {/* トップバー */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-2 px-2 py-1 shrink-0 mb-1">
        {/* 左: ミュート & 図鑑 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(warioAudio.toggleMute())}
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
            onClick={() => setScreen('practice')}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-xs font-bold ${
              screen === 'practice'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : isDark
                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-indigo-300'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-indigo-600 shadow-sm'
            }`}
            title="プチゲーム図鑑・練習モード"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">図鑑・練習</span>
          </button>
        </div>

        {/* 中央: スコア & スピードレベル */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center min-w-[75px] ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-400">SCORE</span>
            <span className="text-base sm:text-lg font-black text-amber-500">{score}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center min-w-[75px] ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] tracking-wider uppercase font-bold text-slate-400">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span>BEST</span>
            </div>
            <span className="text-base sm:text-lg font-black text-yellow-500">{highScore}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center min-w-[70px] ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-0.5 text-[10px] tracking-wider uppercase font-bold text-purple-400">
              <Zap className="w-3 h-3" />
              <span>SPEED</span>
            </div>
            <span className="text-base sm:text-lg font-black text-purple-400">Lv.{speedLevel}</span>
          </div>
        </div>

        {/* 右: ライフ（残機） */}
        <div className="flex items-center gap-1 px-3 py-2 rounded-2xl border bg-slate-900/60 border-slate-800">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`text-base transition-transform ${
                idx < lives ? 'scale-100 opacity-100' : 'scale-75 opacity-20 grayscale'
              }`}
              title={`残機 ${lives}`}
            >
              🧄
            </span>
          ))}
        </div>
      </div>

      {/* ゲームメイン領域 */}
      <div
        ref={gameAreaRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden py-1"
      >
        <div
          className={`relative flex items-center justify-center transition-all duration-150 ${
            isFullscreen
              ? 'h-full max-h-full max-w-full'
              : 'h-full max-h-[540px] max-w-[720px]'
          }`}
          style={{
            aspectRatio: '480 / 360',
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
              handlePointerDown(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onPointerUp={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              } catch {
                // ignore
              }
              handlePointerUp();
            }}
            onPointerCancel={(e) => {
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              } catch {
                // ignore
              }
              handlePointerUp();
            }}
            className="w-full h-full rounded-3xl touch-none cursor-pointer shadow-2xl transition-shadow block"
            style={{
              backgroundColor: isDark ? '#090d16' : '#f1f5f9',
            }}
          />

          {/* タイトル画面オーバーレイ */}
          {screen === 'title' && (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500 via-orange-600 to-rose-600 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <span className="text-5xl mb-2 animate-bounce">👃💣</span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 tracking-wider drop-shadow-md">
                メイド イン ワリオ
              </h1>
              <p className="text-xs text-amber-100 font-bold mb-6 tracking-wide drop-shadow">
                WARIOWARE: MICROGAME FRENZY
              </p>

              <div className="flex flex-col gap-3 w-full max-w-[220px]">
                <button
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-2xl bg-white text-orange-600 hover:bg-amber-50 font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START!!</span>
                </button>

                <button
                  onClick={() => setScreen('practice')}
                  className="w-full py-2.5 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/30 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>プチゲームずかん</span>
                </button>
              </div>
            </div>
          )}

          {/* ゲームオーバーオーバーレイ */}
          {screen === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <span className="text-5xl mb-2 animate-pulse">💥</span>
              <h2 className="text-3xl font-black text-rose-500 mb-1 tracking-wide">GAME OVER</h2>
              <p className="text-xs text-slate-400 mb-4">全滅してしまいました！</p>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 w-full max-w-[260px] mb-5 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">クリアゲーム数</span>
                  <span className="text-xl font-black text-amber-400">{score}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">ベストスコア</span>
                  <span className="text-base font-bold text-yellow-500">{highScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">最高スピード</span>
                  <span className="text-base font-bold text-purple-400">Lv.{maxSpeedLevel}</span>
                </div>
              </div>

              {score >= highScore && score > 0 && (
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm mb-4 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>NEW RECORD 達成！</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleStartGame}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>再挑戦！</span>
                </button>
                <button
                  onClick={() => setScreen('title')}
                  className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-all cursor-pointer"
                >
                  タイトルへ
                </button>
              </div>
            </div>
          )}

          {/* プチゲーム図鑑・練習モードモーダル */}
          {screen === 'practice' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl flex flex-col p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-base text-slate-100">プチゲームずかん（練習モード）</h3>
                </div>
                <button
                  onClick={() => setScreen('title')}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400 mb-3">
                練習したいプチゲームを選んで「れんしゅう開始」を押してください！
              </p>

              {/* ゲーム選択グリッド */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 overflow-y-auto mb-4 pr-1">
                {MICROGAMES.map((mg) => (
                  <button
                    key={mg.id}
                    onClick={() => setPracticeSelectedId(mg.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      practiceSelectedId === mg.id
                        ? 'bg-indigo-600/30 border-indigo-500 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl mb-1">{mg.icon}</span>
                    <span className="text-xs font-bold text-slate-200">{mg.name}</span>
                    <span className="text-[10px] text-amber-400 mt-1 font-semibold">{mg.instruction}</span>
                  </button>
                ))}
              </div>

              {/* 選択中のゲーム情報＆開始ボタン */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">
                    操作ヒント: {MICROGAMES.find((m) => m.id === practiceSelectedId)?.hint}
                  </span>
                </div>
                <button
                  onClick={handleStartPractice}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>れんしゅう開始</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター操作ガイド */}
      <div className="w-full max-w-2xl flex items-center justify-between text-[11px] text-slate-400 px-2 py-1 shrink-0">
        <div className="flex items-center gap-3">
          <span>💡 操作: 画面タップ / クリック / [Space] / [←][→]</span>
          <span>制限時間: 約4秒の瞬間アクション！</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-amber-400">
          <Flame className="w-3.5 h-3.5" />
          <span>全8種類プチゲーム収録</span>
        </div>
      </div>
    </div>
  );
};
