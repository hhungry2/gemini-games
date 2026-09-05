import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import { RotateCcw, Users, Bot, Zap, Trophy } from 'lucide-react';

const RALLY_BEST_KEY = 'pong_rally_best';

interface PongGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type GameMode = 'cpu' | '2p' | 'rally';
type Difficulty = 'easy' | 'normal' | 'hard';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 12;
const WINNING_SCORE = 7;

export const PongGame: React.FC<PongGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [mode, setMode] = useState<GameMode>('cpu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [rallyScore, setRallyScore] = useState(0);
  const [rallyBest, setRallyBest] = useState(0);
  const [winner, setWinner] = useState<'1P' | '2P' | 'CPU' | null>(null);

  // ゲーム内部可変ステート
  const stateRef = useRef({
    p1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    p2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    p1Vy: 0,
    p2Vy: 0,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballVx: 5,
    ballVy: 3,
    ballSpeed: 6,
    score1: 0,
    score2: 0,
    rallyCount: 0,
    mode: 'cpu' as GameMode,
    difficulty: 'normal' as Difficulty,
    keys: {
      w: false,
      s: false,
      up: false,
      down: false,
    },
  });

  // ラリーベストの読み込み
  useEffect(() => {
    const saved = localStorage.getItem(RALLY_BEST_KEY);
    if (saved) {
      setRallyBest(parseInt(saved, 10) || 0);
    }
  }, []);

  const updateRallyBest = useCallback((newBest: number) => {
    setRallyBest((prev) => {
      if (newBest > prev) {
        localStorage.setItem(RALLY_BEST_KEY, newBest.toString());
        return newBest;
      }
      return prev;
    });
  }, []);

  // ボールリセット
  const resetBall = (direction: 'left' | 'right' = 'left') => {
    const s = stateRef.current;
    s.ballX = CANVAS_WIDTH / 2;
    s.ballY = CANVAS_HEIGHT / 2;
    s.ballSpeed = 6;
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    const dirSign = direction === 'left' ? -1 : 1;
    s.ballVx = Math.cos(angle) * s.ballSpeed * dirSign;
    s.ballVy = Math.sin(angle) * s.ballSpeed;
  };

  // ゲーム開始
  const startGame = (selectedMode: GameMode, diff: Difficulty = difficulty) => {
    const s = stateRef.current;
    s.mode = selectedMode;
    s.difficulty = diff;
    s.score1 = 0;
    s.score2 = 0;
    s.rallyCount = 0;
    s.p1Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    s.p2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;

    setMode(selectedMode);
    setDifficulty(diff);
    setScore1(0);
    setScore2(0);
    setRallyScore(0);
    setWinner(null);
    resetBall('left');
    setGameState('playing');
  };

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyW') stateRef.current.keys.w = true;
      if (e.code === 'KeyS') stateRef.current.keys.s = true;
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        stateRef.current.keys.up = true;
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        stateRef.current.keys.down = true;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') stateRef.current.keys.w = false;
      if (e.code === 'KeyS') stateRef.current.keys.s = false;
      if (e.code === 'ArrowUp') stateRef.current.keys.up = false;
      if (e.code === 'ArrowDown') stateRef.current.keys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // マウス/タッチ操作
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    const clientY = e.clientY - rect.top;
    const targetY = clientY * scaleY - PADDLE_HEIGHT / 2;
    stateRef.current.p1Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, targetY));
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = (touch.clientX - rect.left) * scaleX;
      const touchY = (touch.clientY - rect.top) * scaleY - PADDLE_HEIGHT / 2;
      const boundedY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, touchY));

      if (touchX < CANVAS_WIDTH / 2) {
        stateRef.current.p1Y = boundedY;
      } else if (stateRef.current.mode === '2p') {
        stateRef.current.p2Y = boundedY;
      }
    }
  };

  // メインループ
  useEffect(() => {
    let animId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const s = stateRef.current;

      if (ctx && canvas) {
        // --- 1. 更新処理 ---
        if (gameState === 'playing') {
          const paddleSpeed = 8;

          // 1P キーボード移動
          if (s.keys.w) s.p1Y = Math.max(0, s.p1Y - paddleSpeed);
          if (s.keys.s) s.p1Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, s.p1Y + paddleSpeed);

          // 2P / CPU 移動
          if (s.mode === '2p') {
            if (s.keys.up) s.p2Y = Math.max(0, s.p2Y - paddleSpeed);
            if (s.keys.down) s.p2Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, s.p2Y + paddleSpeed);
          } else if (s.mode === 'cpu') {
            // CPU AI
            const cpuCenter = s.p2Y + PADDLE_HEIGHT / 2;
            const diffFactor = s.difficulty === 'easy' ? 0.05 : s.difficulty === 'normal' ? 0.09 : 0.14;
            const cpuMaxSpeed = s.difficulty === 'easy' ? 4 : s.difficulty === 'normal' ? 6 : 8.5;

            let targetY = s.ballY;
            // 難易度によるミス誘発
            if (s.difficulty === 'easy' && Math.random() < 0.2) {
              targetY += (Math.random() - 0.5) * 80;
            }

            const dy = (targetY - cpuCenter) * diffFactor;
            const clampedDy = Math.max(-cpuMaxSpeed, Math.min(cpuMaxSpeed, dy));
            s.p2Y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, s.p2Y + clampedDy));
          }

          // ボール移動
          s.ballX += s.ballVx;
          s.ballY += s.ballVy;

          // 上下壁の反射
          if (s.ballY - BALL_SIZE / 2 <= 0) {
            s.ballY = BALL_SIZE / 2;
            s.ballVy = Math.abs(s.ballVy);
            sound.playPongWall();
          } else if (s.ballY + BALL_SIZE / 2 >= CANVAS_HEIGHT) {
            s.ballY = CANVAS_HEIGHT - BALL_SIZE / 2;
            s.ballVy = -Math.abs(s.ballVy);
            sound.playPongWall();
          }

          // ラリーモード時の右壁反射
          if (s.mode === 'rally') {
            if (s.ballX + BALL_SIZE / 2 >= CANVAS_WIDTH - 15) {
              s.ballX = CANVAS_WIDTH - 15 - BALL_SIZE / 2;
              s.ballVx = -Math.abs(s.ballVx);
              sound.playPongWall();
            }
          }

          // 1Pパドル反射 (左)
          const p1Left = 30;
          const p1Right = p1Left + PADDLE_WIDTH;
          if (
            s.ballX - BALL_SIZE / 2 <= p1Right &&
            s.ballX + BALL_SIZE / 2 >= p1Left &&
            s.ballY >= s.p1Y &&
            s.ballY <= s.p1Y + PADDLE_HEIGHT &&
            s.ballVx < 0
          ) {
            sound.playPongPaddle();
            // ヒット位置に応じた角度計算
            const hitOffset = (s.ballY - (s.p1Y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
            const maxAngle = Math.PI / 3;
            const angle = hitOffset * maxAngle;

            s.ballSpeed = Math.min(14, s.ballSpeed + 0.3);
            s.ballVx = Math.cos(angle) * s.ballSpeed;
            s.ballVy = Math.sin(angle) * s.ballSpeed;
            s.ballX = p1Right + BALL_SIZE / 2;

            if (s.mode === 'rally') {
              s.rallyCount++;
              setRallyScore(s.rallyCount);
              updateRallyBest(s.rallyCount);
            }
          }

          // 2P/CPUパドル反射 (右)
          if (s.mode !== 'rally') {
            const p2Right = CANVAS_WIDTH - 30;
            const p2Left = p2Right - PADDLE_WIDTH;
            if (
              s.ballX + BALL_SIZE / 2 >= p2Left &&
              s.ballX - BALL_SIZE / 2 <= p2Right &&
              s.ballY >= s.p2Y &&
              s.ballY <= s.p2Y + PADDLE_HEIGHT &&
              s.ballVx > 0
            ) {
              sound.playPongPaddle();
              const hitOffset = (s.ballY - (s.p2Y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
              const maxAngle = Math.PI / 3;
              const angle = hitOffset * maxAngle;

              s.ballSpeed = Math.min(14, s.ballSpeed + 0.3);
              s.ballVx = -Math.cos(angle) * s.ballSpeed;
              s.ballVy = Math.sin(angle) * s.ballSpeed;
              s.ballX = p2Left - BALL_SIZE / 2;
            }
          }

          // 得点判定
          if (s.mode === 'rally') {
            if (s.ballX < 0) {
              // ラリー失敗
              sound.playGameOver();
              setGameState('gameover');
            }
          } else {
            // 2P or VS CPU
            if (s.ballX < 0) {
              // 2P / CPU 得点
              sound.playPongScore();
              s.score2++;
              setScore2(s.score2);
              if (s.score2 >= WINNING_SCORE) {
                sound.playGameOver();
                setWinner(s.mode === 'cpu' ? 'CPU' : '2P');
                setGameState('gameover');
              } else {
                resetBall('left');
              }
            } else if (s.ballX > CANVAS_WIDTH) {
              // 1P 得点
              sound.playPongScore();
              s.score1++;
              setScore1(s.score1);
              if (s.score1 >= WINNING_SCORE) {
                sound.playWin();
                setWinner('1P');
                setGameState('gameover');
              } else {
                resetBall('right');
              }
            }
          }
        }

        // --- 2. 描画処理 (クリーン・ミニマル・フラット) ---
        ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // センターネット (破線)
        if (s.mode !== 'rally') {
          ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
          ctx.lineWidth = 4;
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.moveTo(CANVAS_WIDTH / 2, 0);
          ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // ラリーモードの右壁
          ctx.fillStyle = '#64748b';
          ctx.fillRect(CANVAS_WIDTH - 15, 0, 15, CANVAS_HEIGHT);
        }

        // 1Pパドル (左)
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.beginPath();
        ctx.roundRect(30, s.p1Y, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
        ctx.fill();

        // 2Pパドル (右)
        if (s.mode !== 'rally') {
          ctx.fillStyle = s.mode === 'cpu' ? '#ef4444' : '#10b981';
          ctx.beginPath();
          ctx.roundRect(CANVAS_WIDTH - 30 - PADDLE_WIDTH, s.p2Y, PADDLE_WIDTH, PADDLE_HEIGHT, 6);
          ctx.fill();
        }

        // ボール
        ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.beginPath();
        ctx.roundRect(s.ballX - BALL_SIZE / 2, s.ballY - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE, 3);
        ctx.fill();

        // 大型スコア表示 (背景に透過で描画)
        if (s.mode !== 'rally') {
          ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          ctx.font = 'bold 72px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`${s.score1}`, CANVAS_WIDTH / 4, 30);
          ctx.fillText(`${s.score2}`, (CANVAS_WIDTH * 3) / 4, 30);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, isDark]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 上部ヘッダーナビゲーション */}
      <div
        className={`w-full flex items-center justify-end mb-3 transition-all ${
          isFullscreen ? 'w-[min(96vw,calc((100vh-110px)*800/500))]' : 'w-full max-w-[620px]'
        }`}
      >

        {mode === 'rally' ? (
          <div className="flex items-center gap-4 text-xs font-mono font-bold">
            <div className="flex items-center gap-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>RALLY</span>
              <span className="text-indigo-500 text-base">{rallyScore}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <Trophy className="w-3.5 h-3.5" />
              <span>BEST: {rallyBest}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs font-mono font-bold">
            <span className="text-indigo-400">1P: {score1}</span>
            <span className="text-slate-500">-</span>
            <span className={mode === 'cpu' ? 'text-rose-400' : 'text-emerald-400'}>
              {mode === 'cpu' ? 'CPU' : '2P'}: {score2}
            </span>
            <span className="text-slate-500 text-[10px]">({WINNING_SCORE}点先取)</span>
          </div>
        )}
      </div>

      {/* ゲームコートCanvasコンテナ (フルスクリーン時はワイド最大化) */}
      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${
          isDark ? 'border-slate-800 bg-[#090d16]' : 'border-slate-300 bg-slate-100 shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(96vw,calc((100vh-110px)*800/500))] aspect-[16/10] my-auto'
            : 'w-full max-w-[620px] aspect-[16/10]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleCanvasMouseMove}
          onTouchMove={handleCanvasTouchMove}
          className="w-full h-full block touch-none cursor-none"
        />

        {/* メニュー選択オーバーレイ */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-4 animate-in fade-in duration-200">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">ポン (Pong)</h2>
            <p className="text-xs text-slate-300 max-w-xs">
              ボールを打ち合うクラシック卓球アクション！モードを選択してください。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md pt-2">
              <button
                onClick={() => startGame('cpu', 'normal')}
                className="p-4 bg-slate-900/90 hover:bg-indigo-600 rounded-2xl border border-slate-700 hover:border-indigo-400 transition flex flex-col items-center gap-2 cursor-pointer shadow-md"
              >
                <Bot className="w-6 h-6 text-indigo-400" />
                <div className="text-sm font-bold">VS CPU</div>
                <div className="text-[10px] text-slate-400">1人プレイ</div>
              </button>

              <button
                onClick={() => startGame('2p')}
                className="p-4 bg-slate-900/90 hover:bg-emerald-600 rounded-2xl border border-slate-700 hover:border-emerald-400 transition flex flex-col items-center gap-2 cursor-pointer shadow-md"
              >
                <Users className="w-6 h-6 text-emerald-400" />
                <div className="text-sm font-bold">2P 対戦</div>
                <div className="text-[10px] text-slate-400">1台で2人対戦</div>
              </button>

              <button
                onClick={() => startGame('rally')}
                className="p-4 bg-slate-900/90 hover:bg-amber-600 rounded-2xl border border-slate-700 hover:border-amber-400 transition flex flex-col items-center gap-2 cursor-pointer shadow-md"
              >
                <Zap className="w-6 h-6 text-amber-400" />
                <div className="text-sm font-bold">ラリー</div>
                <div className="text-[10px] text-slate-400">壁打ちスコアアタック</div>
              </button>
            </div>
          </div>
        )}

        {/* ポーズオーバーレイ */}
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
                onClick={() => setGameState('menu')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                メニューに戻る
              </button>
            </div>
          </div>
        )}

        {/* ゲームオーバー / 勝者発表オーバーレイ */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white space-y-4 animate-in zoom-in-95 duration-200">
            {mode === 'rally' ? (
              <>
                <div className="text-3xl font-black text-rose-500">RALLY END</div>
                <div className="text-sm font-mono text-slate-300">
                  連続ラリー数: <span className="font-bold text-white text-xl">{rallyScore}</span>
                </div>
                <div className="text-xs font-mono text-amber-400">BEST: {rallyBest}</div>
              </>
            ) : (
              <>
                <div className="text-4xl font-black text-indigo-400">
                  {winner === '1P' ? '🎉 1P WIN!' : winner === '2P' ? '🎉 2P WIN!' : '🤖 CPU WIN!'}
                </div>
                <div className="text-sm font-mono text-slate-300">
                  スコア: {score1} - {score2}
                </div>
              </>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => startGame(mode)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度プレイ
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                モード変更
              </button>
            </div>
          </div>
        )}
      </div>

      {/* スマホ操作ガイド */}
      <div className="w-full max-w-[620px] text-center text-[11px] text-slate-500 mt-2 sm:hidden">
        {mode === '2p'
          ? '左画面タッチドラッグ: 1P操作 / 右画面タッチドラッグ: 2P操作'
          : '画面タッチドラッグ または マウス移動でパドル操作'}
      </div>
    </div>
  );
};
