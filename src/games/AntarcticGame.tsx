import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  ArrowLeft,
  Flame,
  HelpCircle,
  Pause,
  Compass,
} from 'lucide-react';
import {
  StageId,
  GameDifficulty,
  GamePlayMode,
  GameLoopState,
  InputState,
} from './antarctic/types';
import { antarcticAudio } from './antarctic/audio';
import { createAntarcticWorld, STAGE_CONFIGS } from './antarctic/stages';
import {
  updateAntarcticPhysics,
  createInitialPlayer,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './antarctic/physics';
import { renderAntarcticGame } from './antarctic/renderer';

export const ANTARCTIC_HIGH_SCORE_KEY = 'antarctic_adventure_high_score_v1';
export const ANTARCTIC_BEST_STAGE_KEY = 'antarctic_adventure_best_stage_v1';

interface AntarcticGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const AntarcticGame: React.FC<AntarcticGameProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 画面モード・UIステート
  const [gameMode, setGameMode] = useState<GamePlayMode>('tour');
  const [selectedStage, setSelectedStage] = useState<StageId>(1);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [loopState, setLoopState] = useState<GameLoopState>('title');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ANTARCTIC_HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [bestStage, setBestStage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ANTARCTIC_BEST_STAGE_KEY);
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  const [currentStageId, setCurrentStageId] = useState<StageId>(1);
  const [isMuted, setIsMuted] = useState<boolean>(() => antarcticAudio.getMuted());
  const [showHowTo, setShowHowTo] = useState<boolean>(false);

  // ゲーム実行用の参照
  const stateRef = useRef({
    world: createAntarcticWorld(1, 'normal'),
    player: createInitialPlayer(),
    inputs: {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpJustPressed: false,
    } as InputState,
    score: 0,
    state: 'title' as GameLoopState,
    stateTimer: 0,
    animId: 0,
    lastTime: 0,
    isPaused: false,
  });

  // スコア加算
  const addScore = useCallback((pts: number) => {
    stateRef.current.score += pts;
    setScore(stateRef.current.score);
    if (stateRef.current.score > highScore) {
      setHighScore(stateRef.current.score);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ANTARCTIC_HIGH_SCORE_KEY, stateRef.current.score.toString());
      }
    }
  }, [highScore]);

  // ミュート切り替え
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    antarcticAudio.setMuted(next);
  }, [isMuted]);

  // ステージ開始
  const startStage = useCallback(
    (stageId: StageId, initialScore: number = 0) => {
      const newWorld = createAntarcticWorld(stageId, difficulty);
      const newPlayer = createInitialPlayer();

      stateRef.current.world = newWorld;
      stateRef.current.player = newPlayer;
      stateRef.current.score = initialScore;
      stateRef.current.state = 'playing';
      stateRef.current.stateTimer = 0;

      setCurrentStageId(stageId);
      setScore(initialScore);
      setLoopState('playing');
      setIsPaused(false);
      stateRef.current.isPaused = false;

      antarcticAudio.startBgm();
    },
    [difficulty]
  );

  // ゲーム新規スタート
  const handleStartGame = useCallback(
    (mode: GamePlayMode, startStageId: StageId = 1) => {
      setGameMode(mode);
      startStage(startStageId, 0);
    },
    [startStage]
  );

  // ポーズ切り替え
  const togglePause = useCallback(() => {
    if (stateRef.current.state !== 'playing') return;
    const next = !stateRef.current.isPaused;
    stateRef.current.isPaused = next;
    setIsPaused(next);
    if (next) {
      antarcticAudio.stopBgm();
    } else {
      antarcticAudio.startBgm();
    }
  }, []);

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ページスクロールの防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyP') {
        togglePause();
        return;
      }
      if (e.code === 'KeyM') {
        toggleMute();
        return;
      }

      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputs.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputs.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputs.down = true;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!inputs.jump) {
          inputs.jumpJustPressed = true;
        }
        inputs.jump = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputs.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputs.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputs.down = false;
      if (e.code === 'Space' || e.code === 'Enter') {
        inputs.jump = false;
        inputs.jumpJustPressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [togglePause, toggleMute]);

  // メインループ
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const s = stateRef.current;
      const ctx = canvasRef.current?.getContext('2d');

      if (!s.isPaused && ctx) {
        if (s.state === 'playing') {
          const { isStageClear, isTimeUp } = updateAntarcticPhysics(
            s.player,
            s.world,
            s.inputs,
            dt,
            addScore
          );

          if (isStageClear) {
            s.state = 'stage_clear';
            s.stateTimer = 0;
            setLoopState('stage_clear');

            // 残り時間ボーナス加算
            const timeBonus = Math.ceil(s.world.remainingTimeSec) * 100;
            addScore(timeBonus);

            // 最高到達ステージ更新
            if (currentStageId >= bestStage) {
              const nextBest = Math.min(8, currentStageId + 1);
              setBestStage(nextBest);
              localStorage.setItem(ANTARCTIC_BEST_STAGE_KEY, nextBest.toString());
            }
          } else if (isTimeUp) {
            s.state = 'game_over';
            setLoopState('game_over');
          }
        } else if (s.state === 'stage_clear') {
          s.stateTimer += dt;
          // 約3.5秒ファンファーレ後、次ステージへ
          if (s.stateTimer >= 3.8) {
            if (currentStageId < 8) {
              const nextStage = (currentStageId + 1) as StageId;
              startStage(nextStage, s.score);
            } else {
              s.state = 'all_clear';
              setLoopState('all_clear');
            }
          }
        }

        // 描画
        renderAntarcticGame(
          ctx,
          s.player,
          s.world,
          s.score,
          highScore,
          s.state
        );
      }

      // 単発入力フラグのリセット
      s.inputs.jumpJustPressed = false;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      antarcticAudio.stopBgm();
    };
  }, [addScore, bestStage, currentStageId, highScore, startStage]);

  const currentStageConfig = STAGE_CONFIGS[currentStageId] || STAGE_CONFIGS[1];

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center justify-center select-none ${
        isFullscreen
          ? 'h-full min-h-screen p-0 bg-slate-950'
          : `max-w-4xl mx-auto p-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`
      }`}
    >
      {/* 上部ヘッダー（通常モード時） */}
      {!isFullscreen && (
        <div
          className={`w-full flex items-center justify-between mb-3 backdrop-blur-md px-5 py-3 rounded-2xl border shadow-lg ${
            isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white/95 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHub}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ハブへ戻る</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐧</span>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  けっきょく南極大冒険
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-normal border border-cyan-500/30">
                    Antarctic Adventure
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  BGM: スケーターズ・ワルツ (8-bit PSG sound)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHowTo(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="遊び方"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={togglePause}
              className={`p-2 rounded-xl transition ${
                isPaused
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isPaused ? '再開 (P)' : '一時停止 (P)'}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title={isMuted ? 'ミュート解除 (M)' : 'ミュート (M)'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* ゲーム Canvas コンテナ */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-slate-800 bg-slate-950 ${
          isFullscreen
            ? 'w-full h-full flex-1 max-w-none rounded-none border-none'
            : 'w-full aspect-[4/3] max-h-[640px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
        />

        {/* --- タイトル画面オーバーレイ --- */}
        {loopState === 'title' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in">
            <div className="max-w-md w-full flex flex-col items-center">
              <div className="text-5xl mb-2 animate-bounce">🐧</div>
              <h2 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 drop-shadow-md">
                けっきょく南極大冒険
              </h2>
              <p className="text-sm font-semibold text-cyan-400 mt-1 tracking-widest uppercase">
                Antarctic Adventure
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                ♪ スケーターズ・ワルツ (The Skater's Waltz)
              </p>

              {/* モード・ステージ選択 */}
              <div className="w-full mt-6 space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    ゲームモード
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGameMode('tour')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        gameMode === 'tour'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      南極横断ツアー (全8基地)
                    </button>
                    <button
                      onClick={() => setGameMode('practice')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        gameMode === 'practice'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      ステージ指定練習
                    </button>
                  </div>
                </div>

                {gameMode === 'practice' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      スタートステージ
                    </label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(Number(e.target.value) as StageId)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                    >
                      {Object.values(STAGE_CONFIGS).map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.flagEmoji} Stage {st.id}: {st.name} ({st.totalDistanceKm}km / {st.timeLimitSec}s)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    難易度
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'normal', 'hard'] as GameDifficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                          difficulty === d
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {d === 'easy' ? 'かんたん' : d === 'normal' ? 'ふつう' : 'むずかしい'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* スタートボタン */}
              <button
                onClick={() => handleStartGame(gameMode, gameMode === 'tour' ? 1 : selectedStage)}
                className="w-full mt-5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                南極大冒険に出発する！
              </button>

              {/* ハイスコア表示 */}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  ハイスコア: <strong className="text-yellow-300 font-mono">{highScore.toLocaleString()}</strong>
                </span>
                <span>
                  最高到達: <strong className="text-cyan-300">Stage {bestStage}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- ステージクリア表示 --- */}
        {loopState === 'stage_clear' && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10 animate-fade-in">
            <div className="text-6xl mb-2 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400 drop-shadow-lg">
              STAGE CLEAR!!
            </h2>
            <p className="text-lg text-white font-bold mt-1">
              {currentStageConfig.flagEmoji} {currentStageConfig.name} 到着！
            </p>
            <div className="mt-4 bg-slate-900/90 border border-amber-500/40 px-6 py-3 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400">残り時間ボーナス加算！</p>
              <p className="text-2xl font-black font-mono text-cyan-300 mt-0.5">
                TOTAL: {score.toLocaleString()} pts
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-4 animate-pulse">
              次の観測基地へ向かって出発中...
            </p>
          </div>
        )}

        {/* --- 全クリ表示 (ALL CLEAR) --- */}
        {loopState === 'all_clear' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10 animate-fade-in">
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-emerald-200 to-cyan-400 drop-shadow-lg">
              CONGRATULATIONS!!
            </h2>
            <p className="text-lg font-bold text-white mt-1">
              🇯🇵 日本・昭和基地へ無事到達！南極一周完全制覇！
            </p>
            <div className="mt-4 bg-slate-900/90 border border-emerald-500/40 px-6 py-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400">最終ハイスコア</p>
              <p className="text-3xl font-black font-mono text-yellow-300 mt-1">
                {score.toLocaleString()} pts
              </p>
            </div>
            <button
              onClick={() => setLoopState('title')}
              className="mt-6 py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              タイトルへ戻る
            </button>
          </div>
        )}

        {/* --- ゲームオーバー表示 --- */}
        {loopState === 'game_over' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10 animate-fade-in">
            <div className="text-6xl mb-2 animate-pulse">⏰</div>
            <h2 className="text-3xl font-black text-rose-500 drop-shadow-lg">
              TIME UP!!
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              制限時間内に観測基地へ到達できませんでした...
            </p>
            <div className="mt-4 bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-xl">
              <p className="text-xs text-slate-400">獲得スコア</p>
              <p className="text-2xl font-black font-mono text-white mt-0.5">
                {score.toLocaleString()} pts
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => startStage(currentStageId, 0)}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度挑戦
              </button>
              <button
                onClick={() => setLoopState('title')}
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}

        {/* --- ポーズオーバーレイ --- */}
        {isPaused && loopState === 'playing' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="bg-slate-900/90 border border-slate-700 px-8 py-6 rounded-2xl text-center shadow-2xl">
              <Pause className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">PAUSED</h3>
              <p className="text-xs text-slate-400 mt-1">一時停止中</p>
              <button
                onClick={togglePause}
                className="mt-4 py-2 px-5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
              >
                ゲームを再開
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- スマホ・タッチ用オンスクリーンコントローラー --- */}
      <div className="w-full mt-3 grid grid-cols-2 gap-3 max-w-2xl px-2">
        {/* 左右ステアリング */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => {
              stateRef.current.inputs.left = true;
            }}
            onPointerUp={() => {
              stateRef.current.inputs.left = false;
            }}
            onPointerLeave={() => {
              stateRef.current.inputs.left = false;
            }}
            className="flex-1 py-3.5 bg-slate-800/80 active:bg-cyan-500 active:text-slate-950 rounded-xl text-white font-black text-base border border-slate-700 shadow-md flex items-center justify-center transition"
          >
            ◀ LEFT
          </button>
          <button
            onPointerDown={() => {
              stateRef.current.inputs.right = true;
            }}
            onPointerUp={() => {
              stateRef.current.inputs.right = false;
            }}
            onPointerLeave={() => {
              stateRef.current.inputs.right = false;
            }}
            className="flex-1 py-3.5 bg-slate-800/80 active:bg-cyan-500 active:text-slate-950 rounded-xl text-white font-black text-base border border-slate-700 shadow-md flex items-center justify-center transition"
          >
            RIGHT ▶
          </button>
        </div>

        {/* アクションボタン (アクセル、ブレーキ、ジャンプ) */}
        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => {
              stateRef.current.inputs.up = true;
            }}
            onPointerUp={() => {
              stateRef.current.inputs.up = false;
            }}
            onPointerLeave={() => {
              stateRef.current.inputs.up = false;
            }}
            className="flex-1 py-3.5 bg-emerald-700/80 active:bg-emerald-500 text-white rounded-xl font-black text-xs border border-emerald-600 shadow-md flex items-center justify-center transition"
          >
            ▲ ACCEL
          </button>
          <button
            onPointerDown={() => {
              stateRef.current.inputs.down = true;
            }}
            onPointerUp={() => {
              stateRef.current.inputs.down = false;
            }}
            onPointerLeave={() => {
              stateRef.current.inputs.down = false;
            }}
            className="flex-1 py-3.5 bg-rose-800/80 active:bg-rose-500 text-white rounded-xl font-black text-xs border border-rose-700 shadow-md flex items-center justify-center transition"
          >
            ▼ BRAKE
          </button>
          <button
            onPointerDown={() => {
              if (!stateRef.current.inputs.jump) {
                stateRef.current.inputs.jumpJustPressed = true;
              }
              stateRef.current.inputs.jump = true;
            }}
            onPointerUp={() => {
              stateRef.current.inputs.jump = false;
              stateRef.current.inputs.jumpJustPressed = false;
            }}
            onPointerLeave={() => {
              stateRef.current.inputs.jump = false;
              stateRef.current.inputs.jumpJustPressed = false;
            }}
            className="flex-1 py-3.5 bg-cyan-600 active:bg-cyan-400 text-slate-950 rounded-xl font-black text-xs border border-cyan-400 shadow-md flex items-center justify-center transition"
          >
            JUMP 🦘
          </button>
        </div>
      </div>

      {/* --- あそびかたモーダル --- */}
      {showHowTo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 text-slate-200 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-3">
              <span>🐧</span> けっきょく南極大冒険のあそびかた
            </h3>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <strong className="text-cyan-300 block mb-1">🎯 目的</strong>
                制限時間内に氷原を駆け抜け、南極各国の観測基地を目指しましょう！オーストラリア基地を出発し、最終目的地「昭和基地」到達を目指します。
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <strong className="text-cyan-300 block mb-1">🕹️ 操作方法</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>左右キー / A・D</strong>: 左右にステアリング移動</li>
                  <li><strong>上キー / W</strong>: アクセル（最高105〜120km/hへ加速）</li>
                  <li><strong>下キー / S</strong>: ブレーキ（減速）</li>
                  <li><strong>スペース / エンター</strong>: ジャンプ</li>
                  <li><strong>Pキー</strong>: 一時停止 / <strong>Mキー</strong>: ミュート</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                <strong className="text-yellow-300 block mb-1">⚠️ 障害物とアイテム</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>氷の丸穴</strong>: 落ちると足が埋まります（左右キー連打で脱出！）。</li>
                  <li><strong>アザラシ</strong>: 穴から頭を出している時に当たると大激突！</li>
                  <li><strong>クレバス</strong>: 氷の裂け目はジャンプで跳び越えましょう。</li>
                  <li><strong>飛び出す魚</strong>: 穴から跳ねる魚（緑500点/黄1000点/赤1500点）をキャッチ！</li>
                  <li><strong>プロペラ旗</strong>: 獲得するとタケコプターが装着され空中ホバリングが可能！</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHowTo(false)}
              className="w-full mt-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
