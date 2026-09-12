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
} from 'lucide-react';
import {
  CircusStageId,
  GameDifficulty,
  GamePlayMode,
  GameLoopState,
  InputState,
  PlayerState,
  Particle,
  FloatingText,
} from './circus/types';
import { circusAudio } from './circus/audio';
import { createStageWorld, STAGE_CONFIGS } from './circus/stages';
import {
  updatePhysics,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
} from './circus/physics';
import { renderCircusGame } from './circus/renderer';

export const CIRCUS_HIGH_SCORE_KEY = 'circus_charlie_high_score_v1';
export const CIRCUS_STAGE_BEST_KEY = 'circus_stage_best_v1';

interface CircusGameProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

export const CircusGame: React.FC<CircusGameProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 画面モード・UIステート
  const [gameMode, setGameMode] = useState<GamePlayMode>('tour');
  const [selectedStage, setSelectedStage] = useState<CircusStageId>('lion');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [loopCount, setLoopCount] = useState<number>(1);

  const [loopState, setLoopState] = useState<GameLoopState>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CIRCUS_HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [lives, setLives] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(() => circusAudio.getMuted());
  const [showHowTo, setShowHowTo] = useState<boolean>(false);

  // ゲーム実行用の参照（毎フレームのクロージャ再生成を防ぐ）
  const stateRef = useRef({
    world: createStageWorld('lion', 'normal', 1),
    player: createInitialPlayer('lion'),
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    inputs: {
      left: false,
      right: false,
      jump: false,
      jumpJustPressed: false,
    } as InputState,
    score: 0,
    lives: 3,
    state: 'title' as GameLoopState,
    stateTimer: 0,
    animId: 0,
    lastTime: 0,
  });

  function createInitialPlayer(stageId: CircusStageId): PlayerState {
    const isLion = stageId === 'lion';
    const isTightrope = stageId === 'tightrope';
    const isBall = stageId === 'ball';
    const isTrapeze = stageId === 'trapeze';

    return {
      x: isBall ? 180 : 120,
      y: isLion ? GROUND_Y : isTightrope ? 290 : isBall ? 330 - 36 - 28 : isTrapeze ? 240 : 260,
      vx: 0,
      vy: 0,
      isGrounded: !isTrapeze,
      isJumping: false,
      facingRight: true,
      animFrame: 0,
      animTimer: 0,
      invincibleTimer: 60,
      jumpCountOnTrampoline: 0,
      attachedToTrapezeId: isTrapeze ? 1 : null,
      attachedOffset: 0,
      ballSpeed: 0,
      currentBallIndex: 0,
    };
  }

  // ハイスコア保存
  const saveHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CIRCUS_HIGH_SCORE_KEY, newScore.toString());
        }
        return newScore;
      }
      return prev;
    });
  }, []);

  // ミュート切り替え
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    circusAudio.setMuted(next);
  };

  // ステージ初期化
  const initStage = useCallback(
    (stageId: CircusStageId, startLives: number, startScore: number, currentLoop: number) => {
      const world = createStageWorld(stageId, difficulty, currentLoop);
      const player = createInitialPlayer(stageId);

      stateRef.current.world = world;
      stateRef.current.player = player;
      stateRef.current.particles = [];
      stateRef.current.floatingTexts = [];
      stateRef.current.score = startScore;
      stateRef.current.lives = startLives;
      stateRef.current.state = 'stage_intro';
      stateRef.current.stateTimer = 90; // 約1.5秒

      setLoopState('stage_intro');
      setScore(startScore);
      setLives(startLives);
      setSelectedStage(stageId);

      circusAudio.stopBgm();
    },
    [difficulty]
  );

  // ゲーム開始
  const startGame = useCallback(
    (mode: GamePlayMode, startStage: CircusStageId = 'lion') => {
      setGameMode(mode);
      setLoopCount(1);
      const initLives = difficulty === 'easy' ? 5 : 3;
      initStage(startStage, initLives, 0, 1);
    },
    [difficulty, initStage]
  );

  // キーボードイベントハンドラ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputs.left = true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputs.right = true;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!inputs.jump) {
          inputs.jumpJustPressed = true;
        }
        inputs.jump = true;
      }

      // ゲームオーバー時にSpaceで再挑戦
      if (stateRef.current.state === 'game_over' && e.code === 'Space') {
        startGame(gameMode, selectedStage);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inputs = stateRef.current.inputs;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputs.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputs.right = false;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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
  }, [gameMode, selectedStage, startGame]);

  // タッチ操作ヘルパー
  const handleTouchControl = (type: 'left' | 'right' | 'jump', active: boolean) => {
    const inputs = stateRef.current.inputs;
    if (type === 'left') inputs.left = active;
    if (type === 'right') inputs.right = active;
    if (type === 'jump') {
      if (active && !inputs.jump) {
        inputs.jumpJustPressed = true;
      }
      inputs.jump = active;
    }
  };

  // メインゲームループ
  useEffect(() => {
    let animId = 0;
    stateRef.current.lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(33, currentTime - stateRef.current.lastTime);
      stateRef.current.lastTime = currentTime;
      const deltaRatio = dt / 16.666;

      const r = stateRef.current;
      const ctx = canvasRef.current?.getContext('2d');

      // 状態別ロジック
      if (r.state === 'stage_intro') {
        r.stateTimer -= deltaRatio;
        if (r.stateTimer <= 0) {
          r.state = 'playing';
          setLoopState('playing');
          circusAudio.startBgm();
        }
      } else if (r.state === 'playing') {
        // 物理・判定更新
        const res = updatePhysics(
          r.world,
          r.player,
          r.inputs,
          r.particles,
          r.floatingTexts,
          difficulty,
          deltaRatio
        );

        if (res.scoreGained > 0) {
          r.score += res.scoreGained;
          setScore(r.score);
          saveHighScore(r.score);
        }

        // ミス発生
        if (res.isMiss) {
          r.state = 'player_miss';
          r.stateTimer = 90;
          r.lives -= 1;
          setLives(r.lives);
          setLoopState('player_miss');
          circusAudio.playMiss();
        }

        // ステージクリア
        if (res.isClear) {
          r.state = 'stage_clear';
          r.stateTimer = 150; // 約2.5秒ファンファーレ
          setLoopState('stage_clear');

          // クリア花火・紙吹雪パーティクル
          for (let i = 0; i < 40; i++) {
            r.particles.push({
              id: Date.now() + Math.random(),
              x: r.player.x + (Math.random() - 0.5) * 80,
              y: r.player.y - 20 + (Math.random() - 0.5) * 60,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 6 - 3,
              color: ['#f43f5e', '#3b82f6', '#10b981', '#fbbf24', '#a855f7'][Math.floor(Math.random() * 5)],
              size: 5 + Math.random() * 4,
              alpha: 1,
              life: 60,
              maxLife: 60,
              shape: 'confetti',
            });
          }
        }
      } else if (r.state === 'player_miss') {
        r.stateTimer -= deltaRatio;
        if (r.stateTimer <= 0) {
          if (r.lives <= 0 && difficulty !== 'easy') {
            r.state = 'game_over';
            setLoopState('game_over');
          } else {
            // ステージ内リスタート
            r.player = createInitialPlayer(r.world.stageId);
            r.state = 'playing';
            setLoopState('playing');
            circusAudio.startBgm();
          }
        }
      } else if (r.state === 'stage_clear') {
        r.stateTimer -= deltaRatio;
        if (r.stateTimer <= 0) {
          // 次のステージへ遷移
          if (gameMode === 'tour') {
            const nextStageIndex = (STAGE_CONFIGS.findIndex((s) => s.id === r.world.stageId) + 1);
            if (nextStageIndex >= STAGE_CONFIGS.length) {
              // 全5ステージ制覇！周回ループへ
              setLoopCount((prev) => prev + 1);
              initStage('lion', r.lives + 1, r.score + 5000, loopCount + 1);
            } else {
              initStage(STAGE_CONFIGS[nextStageIndex].id, r.lives, r.score, loopCount);
            }
          } else {
            // プラクティスモード: 同じステージを再プレイまたはタイトルへ
            initStage(r.world.stageId, r.lives, r.score, loopCount);
          }
        }
      }

      // パーティクル更新
      for (let i = r.particles.length - 1; i >= 0; i--) {
        const p = r.particles[i];
        p.x += p.vx * deltaRatio;
        p.y += p.vy * deltaRatio;
        p.life -= deltaRatio;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) {
          r.particles.splice(i, 1);
        }
      }

      // 浮遊テキスト更新
      for (let i = r.floatingTexts.length - 1; i >= 0; i--) {
        const t = r.floatingTexts[i];
        t.y += t.vy * deltaRatio;
        t.life -= deltaRatio;
        t.alpha = Math.max(0, t.life / 40);
        if (t.life <= 0) {
          r.floatingTexts.splice(i, 1);
        }
      }

      // ジャンプ単発判定リセット
      r.inputs.jumpJustPressed = false;

      // 描画実行
      if (ctx) {
        renderCircusGame(
          ctx,
          r.world,
          r.player,
          r.particles,
          r.floatingTexts,
          r.score,
          highScore,
          r.lives,
          r.state,
          difficulty
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      circusAudio.stopBgm();
    };
  }, [difficulty, gameMode, highScore, initStage, loopCount, saveHighScore]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center justify-center select-none transition-colors duration-300 ${
        isFullscreen ? 'h-screen p-0 bg-black overflow-hidden' : 'p-2 sm:p-4 max-w-5xl mx-auto'
      }`}
    >
      {/* 上部ヘッダー（通常時） */}
      {!isFullscreen && (
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHub}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              <ArrowLeft size={16} />
              ゲーム一覧
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2 text-rose-500">
              🎪 サーカスチャーリー (Circus Charlie)
            </h1>
            {loopState !== 'title' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono">
                <span className="text-slate-400">SCORE:</span>
                <span className="text-white font-bold">{score.toLocaleString()}</span>
                <span className="text-slate-600">|</span>
                <span className="text-sky-400 font-bold">🤡 × {Math.max(0, lives)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHowTo(!showHowTo)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="遊び方"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={() => startGame(gameMode, selectedStage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-colors shadow-lg shadow-rose-600/30"
            >
              <RotateCcw size={16} />
              リスタート
            </button>
          </div>
        </div>
      )}

      {/* ゲームキャンバスコンテナ（フルスクリーン時はアスペクト比を維持し画面最大まで拡大） */}
      <div
        className={`relative flex items-center justify-center rounded-xl overflow-hidden shadow-2xl bg-black border-2 ${
          isFullscreen
            ? 'w-full h-full border-0 rounded-none'
            : 'w-full border-rose-500/30 aspect-[16/9] max-h-[70vh]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain"
        />

        {/* タイトル画面・メニューオーバーレイ */}
        {loopState === 'title' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-200">
            <div className="text-center max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
                <Flame size={14} className="text-rose-400" />
                KONAMI 1984 Arcade Classic
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-300 mb-2">
                CIRCUS CHARLIE
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                栄光のサーカススター「チャーリー」！全5大演目を制覇して大歓声を浴びよう！
              </p>

              {/* プレイモード選択 */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => startGame('tour', 'lion')}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    gameMode === 'tour'
                      ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Play size={20} className="text-amber-300" />
                  <span className="font-bold text-sm">サーカスツアー</span>
                  <span className="text-[10px] opacity-80">全5ステージ通しプレイ</span>
                </button>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 text-left">ステージ選択:</span>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value as CircusStageId)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-medium focus:outline-none focus:border-rose-500"
                  >
                    {STAGE_CONFIGS.map((s) => (
                      <option key={s.id} value={s.id}>
                        STAGE {s.stageNumber}: {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => startGame('practice', selectedStage)}
                    className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors"
                  >
                    このステージをプレイ
                  </button>
                </div>
              </div>

              {/* 難易度設定 */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="text-xs text-slate-400">難易度:</span>
                {(['easy', 'normal', 'hard'] as GameDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      difficulty === d
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* ハイスコア表示 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-amber-400 font-mono text-sm">
                <Trophy size={16} />
                TOP SCORE: {highScore.toString().padStart(6, '0')}
              </div>
            </div>
          </div>
        )}

        {/* スマホ・タッチ操作用バーチャルパッド（プレイ中のみ表示） */}
        {loopState === 'playing' && (
          <div className="absolute inset-x-0 bottom-3 px-4 flex items-center justify-between pointer-events-none opacity-80 sm:opacity-60 hover:opacity-100 transition-opacity">
            {/* 左右ボタン */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onTouchStart={() => handleTouchControl('left', true)}
                onTouchEnd={() => handleTouchControl('left', false)}
                onMouseDown={() => handleTouchControl('left', true)}
                onMouseUp={() => handleTouchControl('left', false)}
                className="w-14 h-14 rounded-full bg-slate-800/80 border-2 border-slate-600 text-white flex items-center justify-center text-xl font-black active:scale-95 active:bg-rose-600 shadow-lg"
              >
                ◀
              </button>
              <button
                onTouchStart={() => handleTouchControl('right', true)}
                onTouchEnd={() => handleTouchControl('right', false)}
                onMouseDown={() => handleTouchControl('right', true)}
                onMouseUp={() => handleTouchControl('right', false)}
                className="w-14 h-14 rounded-full bg-slate-800/80 border-2 border-slate-600 text-white flex items-center justify-center text-xl font-black active:scale-95 active:bg-rose-600 shadow-lg"
              >
                ▶
              </button>
            </div>

            {/* 特大ジャンプボタン */}
            <div className="pointer-events-auto">
              <button
                onTouchStart={() => handleTouchControl('jump', true)}
                onTouchEnd={() => handleTouchControl('jump', false)}
                onMouseDown={() => handleTouchControl('jump', true)}
                onMouseUp={() => handleTouchControl('jump', false)}
                className="w-16 h-16 rounded-full bg-rose-600/90 border-2 border-rose-400 text-white flex items-center justify-center text-base font-black active:scale-95 active:bg-rose-500 shadow-xl shadow-rose-600/40"
              >
                JUMP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 遊び方モーダル */}
      {showHowTo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-200">
            <h3 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
              🎪 サーカスチャーリーの遊び方
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed mb-4">
              <li>
                <strong>操作方法:</strong> 左右キー（A/D）でスピード調整・前進後退。SpaceまたはWキー（上キー）でジャンプ！
              </li>
              <li>
                <strong>STAGE 1 火の輪:</strong> 迫りくる火の輪と火壺をジャンプで跳び越えよう。コイン火の輪くぐりで500点ボーナス！
              </li>
              <li>
                <strong>STAGE 2 綱渡り:</strong> サルをジャンプで跳び越えろ！青サルは手前でジャンプしてくるので要注意。
              </li>
              <li>
                <strong>STAGE 3 トランポリン:</strong> トランポリンで連続バウンドすると高く跳べる！火吹き男を回避して次々渡ろう。
              </li>
              <li>
                <strong>STAGE 4 玉乗り:</strong> 巨大ボールを転がして前進。対向ボールにぶつかる前にジャンプして乗り移れ！
              </li>
              <li>
                <strong>STAGE 5 空中ブランコ:</strong> 振り子のタイミングを見極めてダイブ！次のバーをしっかりキャッチしよう。
              </li>
            </ul>
            <button
              onClick={() => setShowHowTo(false)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
