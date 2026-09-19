import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  ArrowLeft,
  HelpCircle,
  Pause,
} from 'lucide-react';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_SIZE,
  VEGETABLES,
} from './digdug/constants';
import {
  GameState,
  BonusItem,
  Particle,
  FloatingScore,
  FireTile,
} from './digdug/types';
import { digDugAudio } from './digdug/audio';
import { initStageWorld, updateDigDugPhysics } from './digdug/physics';
import { renderDigDugWorld } from './digdug/renderer';

export const DIGDUG_HIGH_SCORE_KEY = 'digdug_high_score_v1';
export const DIGDUG_MAX_ROUND_KEY = 'digdug_max_round_v1';
export const DIGDUG_TOTAL_KILLS_KEY = 'digdug_total_kills_v1';

interface DigDugGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const DigDugGame: React.FC<DigDugGameProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 画面UI状態
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DIGDUG_HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [lives, setLives] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => digDugAudio.getMuted());
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showHowTo, setShowHowTo] = useState<boolean>(false);

  // 内部ゲームステートRef（再レンダリング不要な毎フレームの物理データ）
  const stateRef = useRef({
    grid: [] as number[][],
    player: null as any,
    enemies: [] as any[],
    rocks: [] as any[],
    bonusItem: null as BonusItem | null,
    particles: [] as Particle[],
    floatingScores: [] as FloatingScore[],
    fireTiles: [] as FireTile[],
    rocksDropped: 0,
    inputs: {
      up: false,
      down: false,
      left: false,
      right: false,
      pump: false,
      pumpJustPressed: false,
    },
    readyTimer: 0,
    respawnTimer: 0,
    roundClearTimer: 0,
  });

  // 音声ミュートトグル
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    digDugAudio.setMuted(next);
  };

  // スコア加算
  const handleAddScore = useCallback((pts: number) => {
    setScore((prev) => {
      const next = prev + pts;
      setHighScore((curHigh) => {
        if (next > curHigh) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(DIGDUG_HIGH_SCORE_KEY, next.toString());
          }
          return next;
        }
        return curHigh;
      });
      return next;
    });
  }, []);

  // ボーナスアイテム（野菜・フルーツ）の出現判定（岩が2個落ちると出現）
  const handleSpawnBonus = useCallback(() => {
    stateRef.current.rocksDropped++;
    if (stateRef.current.rocksDropped === 2 && !stateRef.current.bonusItem?.active) {
      const vegIdx = Math.min(VEGETABLES.length - 1, round - 1);
      const veg = VEGETABLES[vegIdx];
      stateRef.current.bonusItem = {
        name: veg.name,
        points: veg.points,
        color: veg.color,
        x: 6 * TILE_SIZE,
        y: 8 * TILE_SIZE,
        active: true,
        timer: 0,
      };
    }
  }, [round]);

  // プレイヤーミス時のコールバック
  const handlePlayerDeath = useCallback(() => {
    stateRef.current.respawnTimer = 90; // 約1.5秒後にリスポーンまたはゲームオーバー
  }, []);

  // ステージ（ラウンド）開始
  const startRound = useCallback((r: number, keepScore = false) => {
    const { grid, player, enemies, rocks } = initStageWorld(r);
    stateRef.current.grid = grid;
    stateRef.current.player = player;
    stateRef.current.enemies = enemies;
    stateRef.current.rocks = rocks;
    stateRef.current.bonusItem = null;
    stateRef.current.particles = [];
    stateRef.current.floatingScores = [];
    stateRef.current.fireTiles = [];
    stateRef.current.rocksDropped = 0;
    stateRef.current.readyTimer = 75; // 「READY!」表示時間
    stateRef.current.respawnTimer = 0;
    stateRef.current.roundClearTimer = 0;
    digDugAudio.setSpeedUp(false);

    setRound(r);
    if (!keepScore) {
      setScore(0);
      setLives(3);
    }
    setGameState('READY');
    setIsPaused(false);
  }, []);

  // ゲーム新規スタート
  const handleStartGame = (startRoundNum = 1) => {
    startRound(startRoundNum, false);
  };

  // キーボードイベント処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ページスクロールの防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'KeyP') {
        setIsPaused((prev) => !prev);
        return;
      }

      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputs.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputs.down = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputs.right = true;

      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'KeyK') {
        if (!inputs.pump) {
          inputs.pumpJustPressed = true;
        }
        inputs.pump = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputs.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputs.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputs.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputs.right = false;

      if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'KeyK') {
        inputs.pump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // タッチ操作ハンドラー
  const handleTouchDir = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE', active: boolean) => {
    const inputs = stateRef.current.inputs;
    if (dir === 'UP') inputs.up = active;
    if (dir === 'DOWN') inputs.down = active;
    if (dir === 'LEFT') inputs.left = active;
    if (dir === 'RIGHT') inputs.right = active;
    if (dir === 'NONE') {
      inputs.up = false;
      inputs.down = false;
      inputs.left = false;
      inputs.right = false;
    }
  };

  const handleTouchPump = (active: boolean) => {
    const inputs = stateRef.current.inputs;
    if (active && !inputs.pump) {
      inputs.pumpJustPressed = true;
    }
    inputs.pump = active;
  };

  // ゲームループ
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const s = stateRef.current;

      // 1. READY状態
      if (gameState === 'READY') {
        s.readyTimer--;
        if (s.readyTimer <= 0) {
          setGameState('PLAYING');
        }
      }

      // 2. PLAYING状態の物理更新
      if (gameState === 'PLAYING' && !isPaused) {
        // プレイヤーミス後のリスポーン待機
        if (s.player?.isDead) {
          digDugAudio.updateWalking(false);
          s.respawnTimer--;
          if (s.respawnTimer <= 0) {
            if (lives > 1) {
              setLives((l) => l - 1);
              // 残機を減らして同一ステージ再開
              const { grid, player, enemies, rocks } = initStageWorld(round);
              s.grid = grid;
              s.player = player;
              s.enemies = enemies;
              s.rocks = rocks;
              s.readyTimer = 60;
              setGameState('READY');
            } else {
              // ゲームオーバー
              setGameState('GAMEOVER');
              // 最高到達ラウンド保存
              if (typeof window !== 'undefined') {
                const maxR = parseInt(localStorage.getItem(DIGDUG_MAX_ROUND_KEY) || '1', 10);
                if (round > maxR) {
                  localStorage.setItem(DIGDUG_MAX_ROUND_KEY, round.toString());
                }
              }
            }
          }
        } else {
          // 通常プレイの物理計算
          const { isRoundClear } = updateDigDugPhysics(
            s.grid,
            s.player,
            s.enemies,
            s.rocks,
            s.bonusItem,
            s.particles,
            s.floatingScores,
            s.fireTiles,
            s.inputs,
            handleAddScore,
            handlePlayerDeath,
            handleSpawnBonus,
            round
          );

          if (isRoundClear) {
            digDugAudio.updateWalking(false);
            setGameState('ROUND_CLEAR');
            digDugAudio.playRoundClear();
            s.roundClearTimer = 120; // 2秒間ファンファーレ
          }
        }

        // JustPressed は1フレームで消費
        s.inputs.pumpJustPressed = false;
      } else {
        // ポーズ中またはタイトル/クリア時は歩行音停止
        digDugAudio.updateWalking(false);
      }

      // 3. ラウンドクリア後の次ラウンド遷移
      if (gameState === 'ROUND_CLEAR') {
        s.roundClearTimer--;
        if (s.roundClearTimer <= 0) {
          startRound(round + 1, true);
        }
      }

      // 4. 画面レンダリング（Canvasピクセルアート描画）
      if (s.grid.length > 0 && s.player) {
        renderDigDugWorld(
          ctx,
          s.grid,
          s.player,
          s.enemies,
          s.rocks,
          s.bonusItem,
          s.particles,
          s.floatingScores,
          s.fireTiles,
          round,
          isDark
        );
      }

      // READY! / ROUND CLEAR / PAUSED オーバーレイ描画
      if (gameState === 'READY') {
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 22px monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.textAlign = 'center';
        ctx.fillText(`ROUND ${round}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
        ctx.restore();
      } else if (gameState === 'ROUND_CLEAR') {
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText('ROUND CLEAR!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.restore();
      } else if (isPaused) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, round, lives, isPaused, isDark, handleAddScore, handlePlayerDeath, handleSpawnBonus, startRound]);

  return (
    <div
      className={`relative flex flex-col items-center justify-between select-none ${
        isFullscreen
          ? 'w-full h-full p-1 sm:p-2'
          : 'w-full max-w-4xl mx-auto p-3 sm:p-4'
      }`}
    >
      {/* 画面上部ヘッダーバー */}
      <div className={`w-full flex items-center justify-between mb-1.5 ${isFullscreen ? 'max-w-[640px]' : 'max-w-[440px]'}`}>
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>一覧へ</span>
        </button>

        <div className="flex items-center gap-2">
          {/* ミュート切り替え */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition shadow-sm cursor-pointer"
            title={isMuted ? 'ミュート解除' : 'ミュート'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* ポーズボタン */}
          {gameState === 'PLAYING' && (
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition shadow-sm cursor-pointer"
              title="ポーズ (P)"
            >
              <Pause size={15} />
            </button>
          )}

          {/* 遊び方ボタン */}
          <button
            onClick={() => setShowHowTo(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition shadow-sm cursor-pointer"
            title="遊び方"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* スコア・残機・ラウンド HUD */}
      <div className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs font-mono mb-2 shadow-md ${isFullscreen ? 'max-w-[640px]' : 'max-w-[440px]'}`}>
        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-400 block text-[10px]">1UP</span>
            <span className="text-amber-400 font-bold text-sm">{score.toString().padStart(6, '0')}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">HIGH</span>
            <span className="text-emerald-400 font-bold text-sm">{highScore.toString().padStart(6, '0')}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400 block text-[10px]">ROUND</span>
            <span className="text-sky-400 font-bold text-sm">#{round}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">LIVES</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                <span key={i} className="text-sm">
                  ⛏️
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ゲームメインエリア (Canvas + オーバーレイ)
          ルール1遵守: フルスクリーン時は固定幅制限を解除しビューポート限界までダイナミック拡大 */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-700/80 shadow-2xl bg-[#09090b] ${
          isFullscreen
            ? 'flex-1 w-full max-w-[850px] min-h-0 my-1'
            : 'w-full max-w-[440px] aspect-[14/16]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`object-contain block ${
            isFullscreen ? 'w-full h-full max-h-[calc(100vh-170px)]' : 'w-full h-full'
          }`}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* タイトル画面オーバーレイ */}
        {gameState === 'TITLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl mb-3 shadow-lg animate-bounce">
              ⛏️
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-yellow-400 mb-1 tracking-wider">
              DIG DUG
            </h1>
            <p className="text-xs text-slate-300 font-medium mb-4">
              ディグダグ・アーケードクラシック
            </p>

            <p className="text-[11px] text-slate-400 max-w-xs mb-6 leading-relaxed">
              地面を掘り進み、モリと空気ポンプでモンスターを膨らませて撃破！
              巨大な岩を落として敵を一網打尽にせよ！
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-[220px]">
              <button
                onClick={() => handleStartGame(1)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm transition-transform active:scale-95 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={16} fill="white" />
                <span>GAME START</span>
              </button>

              {/* ラウンドセレクト練習 */}
              <div className="flex items-center justify-between gap-1 mt-2">
                {[1, 2, 3].map((rNum) => (
                  <button
                    key={rNum}
                    onClick={() => handleStartGame(rNum)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700 cursor-pointer"
                  >
                    R{rNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-amber-400/90">
              <Trophy size={14} />
              <span>HIGH SCORE: {highScore.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* ゲームオーバー画面オーバーレイ */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-rose-500 mb-2 tracking-wider">
              GAME OVER
            </h2>
            <div className="text-sm font-mono text-slate-300 mb-1">
              SCORE: <span className="text-amber-400 font-bold">{score.toLocaleString()}</span>
            </div>
            <div className="text-xs font-mono text-slate-400 mb-6">
              REACHED: <span className="text-sky-400 font-bold">ROUND {round}</span>
            </div>

            <button
              onClick={() => handleStartGame(1)}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>もう一度プレイ</span>
            </button>
          </div>
        )}
      </div>

      {/* スマホ・タッチ操作用バーチャルパッド（プレイ中のみ表示） */}
      {gameState === 'PLAYING' && (
        <div className={`w-full flex items-center justify-between px-2 pt-1 pb-1 z-10 touch-none ${isFullscreen ? 'max-w-[500px]' : 'max-w-[440px]'}`}>
          {/* 十字キー（D-Pad） */}
          <div className="grid grid-cols-3 gap-1.5 w-32 h-32 touch-none">
            <div />
            <button
              onTouchStart={() => handleTouchDir('UP', true)}
              onTouchEnd={() => handleTouchDir('UP', false)}
              onMouseDown={() => handleTouchDir('UP', true)}
              onMouseUp={() => handleTouchDir('UP', false)}
              className="rounded-xl bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center text-lg active:bg-amber-600 shadow-md select-none touch-none cursor-pointer"
            >
              ▲
            </button>
            <div />

            <button
              onTouchStart={() => handleTouchDir('LEFT', true)}
              onTouchEnd={() => handleTouchDir('LEFT', false)}
              onMouseDown={() => handleTouchDir('LEFT', true)}
              onMouseUp={() => handleTouchDir('LEFT', false)}
              className="rounded-xl bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center text-lg active:bg-amber-600 shadow-md select-none touch-none cursor-pointer"
            >
              ◀
            </button>
            <div className="rounded-xl bg-slate-900/60 border border-slate-800" />
            <button
              onTouchStart={() => handleTouchDir('RIGHT', true)}
              onTouchEnd={() => handleTouchDir('RIGHT', false)}
              onMouseDown={() => handleTouchDir('RIGHT', true)}
              onMouseUp={() => handleTouchDir('RIGHT', false)}
              className="rounded-xl bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center text-lg active:bg-amber-600 shadow-md select-none touch-none cursor-pointer"
            >
              ▶
            </button>

            <div />
            <button
              onTouchStart={() => handleTouchDir('DOWN', true)}
              onTouchEnd={() => handleTouchDir('DOWN', false)}
              onMouseDown={() => handleTouchDir('DOWN', true)}
              onMouseUp={() => handleTouchDir('DOWN', false)}
              className="rounded-xl bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center text-lg active:bg-amber-600 shadow-md select-none touch-none cursor-pointer"
            >
              ▼
            </button>
            <div />
          </div>

          {/* 特大空気注入ボタン (PUMP) */}
          <button
            onTouchStart={() => handleTouchPump(true)}
            onTouchEnd={() => handleTouchPump(false)}
            onMouseDown={() => handleTouchPump(true)}
            onMouseUp={() => handleTouchPump(false)}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 border-2 border-rose-400 text-white font-black text-sm flex flex-col items-center justify-center gap-1 active:scale-95 active:from-rose-700 active:to-amber-600 shadow-xl shadow-rose-600/30 select-none touch-none cursor-pointer"
          >
            <span className="text-xl">💨</span>
            <span>PUMP</span>
          </button>
        </div>
      )}

      {/* 遊び方モーダル */}
      {showHowTo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              ⛏️ ディグダグの遊び方
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed mb-5">
              <li>
                <strong>操作方法:</strong> 矢印キー（WASD）で移動＆土掘り。Spaceキー / J / Z または「PUMP」ボタンでモリ発射・空気注入！
              </li>
              <li>
                <strong>空気ポンプで破裂:</strong> モリを敵に刺したらボタンを連打！空気を送り込み、4段階でパンパンに膨らませて破裂させろ！
              </li>
              <li>
                <strong>落石クラッシュ:</strong> 岩の下を掘るとグラグラ揺れて落下！敵を巻き込んで潰せば数千点の大量ボーナス！
              </li>
              <li>
                <strong>ゴースト化に注意:</strong> プーカァやファイガーは目玉状態になって土の中をすり抜けて迫ってきます。
              </li>
              <li>
                <strong>ファイガーの火炎:</strong> 緑のドラゴン「ファイガー」は点滅後に強力な火炎を吐く！横から撃破すれば高得点！
              </li>
              <li>
                <strong>歩行時サウンド:</strong> ディグダグが歩いている時だけ軽快なBGMが鳴り、立ち止まると音が止まります。
              </li>
            </ul>
            <button
              onClick={() => setShowHowTo(false)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
