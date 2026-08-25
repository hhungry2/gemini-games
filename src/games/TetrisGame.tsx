import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BoardMatrix,
  Piece,
  TetrominoType,
} from '../types/tetris';
import {
  createEmptyBoard,
  createPiece,
  checkCollision,
  tryRotate,
  getGhostPosition,
  mergePieceToBoard,
  clearFullLines,
  calculateScore,
  calculateComboBonus,
  calculateBackToBackBonus,
  getDropInterval,
  initPieceQueue,
  ensureQueue,
} from '../utils/tetrisLogic';
import { sound } from '../utils/audio';
import { Trophy, Zap, Layers, ArrowLeft, Flame } from 'lucide-react';
import { PiecePreview, NextQueuePreview } from '../components/HoldNextPanel';
import { TetrisBoard } from '../components/TetrisBoard';
import { MobileControls } from '../components/Controls';

const HIGH_SCORE_KEY = 'tetris_high_score_v1';

interface TetrisGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const TetrisGame: React.FC<TetrisGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  // ボードとピースの状態
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [pieceQueue, setPieceQueue] = useState<TetrominoType[]>(() => initPieceQueue());
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);

  // スコアとゲーム進行
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [highScore, setHighScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [isBackToBack, setIsBackToBack] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isTetrisClear, setIsTetrisClear] = useState<boolean>(false);

  const dropIntervalRef = useRef<number | null>(null);

  // ハイスコアの読み込み
  useEffect(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }
  }, []);

  // ハイスコアの保存
  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        return newScore;
      }
      return prev;
    });
  }, []);

  // キューから次のピースを取り出すヘルパー (100% 確実な 7-bag)
  const getNextPieceFromQueue = useCallback((): { nextPiece: Piece; updatedQueue: TetrominoType[] } => {
    let currentQueue = ensureQueue(pieceQueue);
    const nextType = currentQueue[0];
    const updatedQueue = ensureQueue(currentQueue.slice(1));
    const nextPiece = createPiece(nextType);
    return { nextPiece, updatedQueue };
  }, [pieceQueue]);

  // ゲームスタート
  const startGame = useCallback(() => {
    const initialQueue = initPieceQueue();
    const firstType = initialQueue[0];
    const remainingQueue = ensureQueue(initialQueue.slice(1));

    const empty = createEmptyBoard();
    const firstPiece = createPiece(firstType);

    setBoard(empty);
    setCurrentPiece(firstPiece);
    setPieceQueue(remainingQueue);
    setHoldPiece(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(0);
    setIsBackToBack(false);
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
    setIsTetrisClear(false);
    sound.startTetrisBgm();
  }, []);

  // BGM (コロベイニキ) の自動制御
  useEffect(() => {
    if (isPlaying && !isPaused && !isGameOver) {
      sound.resumeTetrisBgm();
    } else if (isPaused) {
      sound.pauseTetrisBgm();
    } else if (isGameOver || !isPlaying) {
      sound.stopTetrisBgm();
    }

    return () => {
      sound.stopTetrisBgm();
    };
  }, [isPlaying, isPaused, isGameOver]);

  // ピースの固定とライン消去の処理
  const lockPiece = useCallback(
    (pieceToLock: Piece) => {
      const merged = mergePieceToBoard(pieceToLock, board);
      const { newBoard, linesCleared } = clearFullLines(merged);

      setBoard(newBoard);

      if (linesCleared > 0) {
        sound.playClear(linesCleared);
        const newCombo = combo + 1;
        setCombo(newCombo);

        let isB2B = false;
        if (linesCleared === 4) {
          setIsTetrisClear(true);
          setTimeout(() => setIsTetrisClear(false), 1400);
          if (isBackToBack) {
            isB2B = true;
          }
          setIsBackToBack(true);
        } else {
          setIsBackToBack(false);
        }

        const newLines = lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        setLines(newLines);
        setLevel(newLevel);

        const baseScore = calculateScore(linesCleared, level);
        const comboScore = calculateComboBonus(newCombo, level);
        const b2bScore = isB2B ? calculateBackToBackBonus(level) : 0;
        const addedScore = baseScore + comboScore + b2bScore;

        setScore((prev) => {
          const updated = prev + addedScore;
          updateHighScore(updated);
          return updated;
        });
      } else {
        setCombo(0);
      }

      // 次のピースを安全にキューから取り出し
      const { nextPiece, updatedQueue } = getNextPieceFromQueue();
      setPieceQueue(updatedQueue);

      // ゲームオーバー判定
      if (checkCollision(nextPiece, newBoard)) {
        setIsGameOver(true);
        setIsPlaying(false);
        sound.playGameOver();
        sound.stopTetrisBgm();
      } else {
        setCurrentPiece(nextPiece);
        setCanHold(true);
      }
    },
    [board, combo, isBackToBack, lines, level, getNextPieceFromQueue, updateHighScore]
  );

  // ピースの1マス落下
  const dropPiece = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;

    if (!checkCollision(currentPiece, board, 0, 1)) {
      setCurrentPiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : null));
    } else {
      lockPiece(currentPiece);
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver, lockPiece]);

  // 左移動
  const moveLeft = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, board, -1, 0)) {
      sound.playMove();
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x - 1 } : null));
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // 右移動
  const moveRight = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    if (!checkCollision(currentPiece, board, 1, 0)) {
      sound.playMove();
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x + 1 } : null));
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // 回転
  const rotate = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    const rotated = tryRotate(currentPiece, board);
    if (rotated) {
      sound.playRotate();
      setCurrentPiece(rotated);
    }
  }, [currentPiece, board, isPlaying, isPaused, isGameOver]);

  // ハードドロップ
  const hardDrop = useCallback(() => {
    if (!currentPiece || !isPlaying || isPaused || isGameOver) return;
    sound.playHardDrop();
    const ghostY = getGhostPosition(currentPiece, board);
    const dropDistance = ghostY - currentPiece.y;
    const droppedPiece = { ...currentPiece, y: ghostY };

    // ハードドロップボーナス (落下マス数 × 2)
    setScore((prev) => {
      const newScore = prev + dropDistance * 2;
      updateHighScore(newScore);
      return newScore;
    });

    lockPiece(droppedPiece);
  }, [currentPiece, board, isPlaying, isPaused, isGameOver, lockPiece, updateHighScore]);

  // ホールド
  const hold = useCallback(() => {
    if (!currentPiece || !canHold || !isPlaying || isPaused || isGameOver) return;
    sound.playHold();

    const currentType = currentPiece.type;

    if (holdPiece === null) {
      setHoldPiece(currentType);
      const { nextPiece, updatedQueue } = getNextPieceFromQueue();
      setPieceQueue(updatedQueue);
      setCurrentPiece(nextPiece);
    } else {
      const nextHold = holdPiece;
      setHoldPiece(currentType);
      setCurrentPiece(createPiece(nextHold));
    }

    setCanHold(false);
  }, [currentPiece, canHold, holdPiece, isPlaying, isPaused, isGameOver, getNextPieceFromQueue]);

  // ポーズ切替
  const togglePause = useCallback(() => {
    if (!isPlaying || isGameOver) return;
    setIsPaused((prev) => !prev);
  }, [isPlaying, isGameOver]);

  // 自動落下タイマー
  useEffect(() => {
    if (!isPlaying || isPaused || isGameOver) {
      if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
      return;
    }

    const interval = getDropInterval(level);
    dropIntervalRef.current = window.setInterval(() => {
      dropPiece();
    }, interval);

    return () => {
      if (dropIntervalRef.current) clearInterval(dropIntervalRef.current);
    };
  }, [isPlaying, isPaused, isGameOver, level, dropPiece]);

  // キーボード操作リスナー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          dropPiece();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          e.preventDefault();
          rotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          hold();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
        case 'KeyR':
          e.preventDefault();
          if (isGameOver || !isPlaying) {
            startGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveLeft, moveRight, dropPiece, rotate, hardDrop, hold, togglePause, isGameOver, isPlaying, startGame]);

  const ghostY = currentPiece ? getGhostPosition(currentPiece, board) : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* 上部ナビゲーション */}
      <div
        className={`w-full flex items-center justify-between mb-3 relative z-30 transition-all ${
          isFullscreen ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer relative z-30 ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div className="flex items-center gap-2">
          {combo > 1 && (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[11px] font-bold animate-pulse">
              COMBO ×{combo}
            </span>
          )}
          {isBackToBack && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              B2B
            </span>
          )}
          <div
            className={`text-xs font-bold tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            TETRIS NEON
          </div>
        </div>
      </div>

      <div
        className={`w-full flex flex-col md:flex-row items-center justify-center gap-6 lg:gap-8 transition-transform duration-300 relative z-10 ${
          isFullscreen ? 'scale-105 sm:scale-115 lg:scale-125 xl:scale-135 my-4 sm:my-6' : ''
        }`}
      >
        {/* 左サイドパネル: HOLD & STATS */}
        <div className="w-full md:w-auto flex md:flex-col justify-between md:justify-start gap-3 order-2 md:order-1">
          <PiecePreview
            type={holdPiece}
            label="HOLD"
            canHold={canHold}
            isDark={isDark}
          />

          <div
            className={`flex-1 md:flex-none border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm min-w-[130px] sm:min-w-[160px] space-y-4 ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
          >
            <div>
              <div
                className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                SCORE
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black mt-1">
                {score}
              </div>
            </div>

            <div
              className={`border-t pt-3 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div
                className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                HIGH
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-amber-500 mt-1">
                {highScore}
              </div>
            </div>
          </div>
        </div>

        {/* 中央: テトリスボード */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          <TetrisBoard
            board={board}
            currentPiece={currentPiece}
            ghostY={ghostY}
            isGameOver={isGameOver}
            isPaused={isPaused}
            isPlaying={isPlaying}
            score={score}
            highScore={highScore}
            isTetrisClear={isTetrisClear}
            comboCount={combo}
            isBackToBack={isBackToBack}
            isDark={isDark}
            onStart={startGame}
            onRestart={startGame}
            onResume={() => setIsPaused(false)}
          />
        </div>

        {/* 右サイドパネル: NEXT (3個連続プレビュー) & LEVEL/LINES */}
        <div className="w-full md:w-auto flex md:flex-col justify-between md:justify-start gap-3 order-3">
          <NextQueuePreview
            queue={pieceQueue}
            isDark={isDark}
            count={3}
          />

          <div
            className={`flex-1 md:flex-none border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm min-w-[130px] sm:min-w-[160px] space-y-4 ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
          >
            <div>
              <div
                className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                LINES
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black mt-1">
                {lines}
              </div>
            </div>

            <div
              className={`border-t pt-3 ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <div
                className={`text-[11px] sm:text-xs font-bold uppercase tracking-widest ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                LEVEL
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-indigo-500 mt-1">
                {level}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* モバイル操作ボタン (スマホ・タッチデバイス用) */}
      <div className="w-full mt-4 md:hidden">
        <MobileControls
          onMoveLeft={moveLeft}
          onMoveRight={moveRight}
          onSoftDrop={dropPiece}
          onHardDrop={hardDrop}
          onRotate={rotate}
          onHold={hold}
          disabled={!isPlaying || isPaused || isGameOver}
          isDark={isDark}
        />
      </div>
    </div>
  );
};
