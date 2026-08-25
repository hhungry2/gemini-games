import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sound } from '../utils/audio';
import { ArrowLeft, RotateCcw, Undo2, Trophy, Zap, Award } from 'lucide-react';

const HIGH_SCORE_KEY = '2048_high_score';
const GRID_SIZE = 4;

interface Game2048Props {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

type Board = number[][];

export const Game2048: React.FC<Game2048Props> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const [board, setBoard] = useState<Board>(() => getInitialBoard());
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [history, setHistory] = useState<{ board: Board; score: number } | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [keepPlaying, setKeepPlaying] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ハイスコア読み込み
  useEffect(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }
  }, []);

  const updateHighScore = useCallback((newScore: number) => {
    setHighScore((prev) => {
      if (newScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, newScore.toString());
        return newScore;
      }
      return prev;
    });
  }, []);

  function getEmptyCells(b: Board): [number, number][] {
    const empty: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (b[r][c] === 0) empty.push([r, c]);
      }
    }
    return empty;
  }

  function addRandomTile(b: Board): Board {
    const empty = getEmptyCells(b);
    if (empty.length === 0) return b;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = b.map((row) => [...row]);
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  function getInitialBoard(): Board {
    let b = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    b = addRandomTile(b);
    b = addRandomTile(b);
    return b;
  }

  const restartGame = useCallback(() => {
    const b = getInitialBoard();
    setBoard(b);
    setScore(0);
    setHistory(null);
    setIsGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
  }, []);

  const undo = () => {
    if (!history || isGameOver) return;
    setBoard(history.board);
    setScore(history.score);
    setHistory(null);
    sound.playTileMove();
  };

  // 移動・合体ロジック
  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isGameOver) return;
      if (hasWon && !keepPlaying) return;

      let rotatedBoard = board.map((row) => [...row]);
      let rotations = 0;

      if (direction === 'up') rotations = 3;
      else if (direction === 'right') rotations = 2;
      else if (direction === 'down') rotations = 1;

      // 時計回りに回転させて全て左移動に正規化
      for (let i = 0; i < rotations; i++) {
        rotatedBoard = rotateLeft(rotatedBoard);
      }

      let moved = false;
      let addedScore = 0;
      let maxMergedVal = 0;
      const newBoard: Board = [];

      for (let r = 0; r < GRID_SIZE; r++) {
        const row = rotatedBoard[r].filter((v) => v !== 0);
        const mergedRow: number[] = [];

        for (let c = 0; c < row.length; c++) {
          if (c < row.length - 1 && row[c] === row[c + 1]) {
            const mergedVal = row[c] * 2;
            mergedRow.push(mergedVal);
            addedScore += mergedVal;
            if (mergedVal > maxMergedVal) maxMergedVal = mergedVal;
            if (mergedVal === 2048 && !hasWon && !keepPlaying) {
              setHasWon(true);
              sound.playWin();
            }
            c++; // 次のタイルをスキップ
            moved = true;
          } else {
            mergedRow.push(row[c]);
          }
        }

        while (mergedRow.length < GRID_SIZE) {
          mergedRow.push(0);
        }

        if (mergedRow.some((v, idx) => v !== rotatedBoard[r][idx])) {
          moved = true;
        }
        newBoard.push(mergedRow);
      }

      if (!moved) return;

      // 元の向きに逆回転
      let finalBoard = newBoard;
      for (let i = 0; i < (4 - rotations) % 4; i++) {
        finalBoard = rotateLeft(finalBoard);
      }

      // 履歴保存
      setHistory({ board: board.map((r) => [...r]), score });

      // 新しいタイルを追加
      const boardWithNew = addRandomTile(finalBoard);
      setBoard(boardWithNew);

      const updatedScore = score + addedScore;
      setScore(updatedScore);
      updateHighScore(updatedScore);

      if (maxMergedVal > 0) {
        sound.playTileMerge(maxMergedVal);
      } else {
        sound.playTileMove();
      }

      // ゲームオーバー判定
      if (checkGameOver(boardWithNew)) {
        setIsGameOver(true);
        sound.playGameOver();
      }
    },
    [board, score, isGameOver, hasWon, keepPlaying, updateHighScore]
  );

  function rotateLeft(matrix: Board): Board {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const res: Board = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        res[cols - 1 - c][r] = matrix[r][c];
      }
    }
    return res;
  }

  function checkGameOver(b: Board): boolean {
    if (getEmptyCells(b).length > 0) return false;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = b[r][c];
        if (r < GRID_SIZE - 1 && b[r + 1][c] === val) return false;
        if (c < GRID_SIZE - 1 && b[r][c + 1] === val) return false;
      }
    }
    return true;
  }

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          move('up');
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          move('down');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          move('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          move('right');
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undo();
          }
          break;
        case 'KeyR':
          e.preventDefault();
          restartGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, restartGame]);

  // タッチスワイプハンドラ
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipe = 30;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) move('right');
        else move('left');
      }
    } else {
      if (Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) move('down');
        else move('up');
      }
    }
  };

  // タイルのスタイル
  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-[#eee4da] text-[#776e65]';
      case 4:
        return 'bg-[#ede0c8] text-[#776e65]';
      case 8:
        return 'bg-[#f2b179] text-[#f9f6f2]';
      case 16:
        return 'bg-[#f59563] text-[#f9f6f2]';
      case 32:
        return 'bg-[#f67c5f] text-[#f9f6f2]';
      case 64:
        return 'bg-[#f65e3b] text-[#f9f6f2]';
      case 128:
        return 'bg-[#edcf72] text-[#f9f6f2] text-2xl sm:text-3xl';
      case 256:
        return 'bg-[#edcc61] text-[#f9f6f2] text-2xl sm:text-3xl';
      case 512:
        return 'bg-[#edc850] text-[#f9f6f2] text-2xl sm:text-3xl';
      case 1024:
        return 'bg-[#edc53f] text-[#f9f6f2] text-xl sm:text-2xl';
      case 2048:
        return 'bg-[#edc22e] text-[#f9f6f2] text-xl sm:text-2xl font-black shadow-md';
      default:
        return val > 2048
          ? 'bg-[#3c3a32] text-[#f9f6f2] text-lg sm:text-xl font-black'
          : isDark
          ? 'bg-slate-800/80 text-transparent'
          : 'bg-slate-200/80 text-transparent';
    }
  };

  return (
    <div
      className="w-full flex flex-col items-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 上部ヘッダーナビゲーション */}
      <div
        className={`w-full flex items-center justify-between mb-3 transition-all ${
          isFullscreen ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!history || isGameOver}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
              !history || isGameOver
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
                : isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
            title="1手戻す"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">戻す</span>
          </button>

          <button
            onClick={restartGame}
            className={`p-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
            }`}
            title="リスタート"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* スコア・ベスト表示 */}
      <div
        className={`w-full flex items-center justify-between mb-4 transition-all ${
          isFullscreen ? 'max-w-xl' : 'max-w-md'
        }`}
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">2048</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">タイルを合体させて2048を目指そう</p>
        </div>

        <div className="flex gap-2.5">
          <div
            className={`px-4 py-2 rounded-2xl border text-center min-w-[75px] ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              SCORE
            </div>
            <div className="text-lg sm:text-xl font-mono font-black mt-0.5">{score}</div>
          </div>

          <div
            className={`px-4 py-2 rounded-2xl border text-center min-w-[75px] ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              BEST
            </div>
            <div className="text-lg sm:text-xl font-mono font-bold text-amber-500 mt-0.5">{highScore}</div>
          </div>
        </div>
      </div>

      {/* 2048 ボード (フルスクリーン時は大きく拡大) */}
      <div
        className={`relative rounded-3xl p-3 sm:p-4 border shadow-xl transition-all duration-300 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-300 border-slate-300/80 shadow-md'
        } ${
          isFullscreen
            ? 'w-[min(92vw,calc(100vh-180px))] max-w-[560px] aspect-square my-auto'
            : 'w-full max-w-[420px] aspect-square'
        }`}
      >
        <div className="w-full h-full grid grid-cols-4 gap-2.5 sm:gap-3.5">
          {board.map((row, rIdx) =>
            row.map((val, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`w-full h-full rounded-2xl flex items-center justify-center font-mono font-bold text-3xl sm:text-4xl transition-all duration-100 ${getTileStyle(
                  val
                )}`}
              >
                {val > 0 ? val : ''}
              </div>
            ))
          )}
        </div>

        {/* 勝利モーダル */}
        {hasWon && !keepPlaying && (
          <div className="absolute inset-0 bg-amber-500/85 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-white text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="p-3 bg-white/20 rounded-full">
              <Award className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-black">2048 達成！</h2>
            <p className="text-sm font-medium">おめでとうございます！さらに先を目指しますか？</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setKeepPlaying(true)}
                className="px-5 py-2.5 bg-white text-amber-600 font-bold rounded-xl shadow-lg hover:bg-slate-100 transition cursor-pointer"
              >
                プレイを続ける
              </button>
              <button
                onClick={restartGame}
                className="px-5 py-2.5 bg-amber-700/60 hover:bg-amber-700 text-white font-bold rounded-xl border border-white/30 transition cursor-pointer"
              >
                やり直す
              </button>
            </div>
          </div>
        )}

        {/* ゲームオーバーモーダル */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 text-white text-center space-y-4 animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl sm:text-4xl font-black text-rose-500">GAME OVER</h2>
            <div className="text-xs text-slate-300 font-mono space-y-1">
              <div>SCORE: <span className="text-lg font-bold text-white">{score}</span></div>
              <div>BEST: <span className="font-bold text-amber-400">{highScore}</span></div>
            </div>
            <button
              onClick={restartGame}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer mt-2"
            >
              <RotateCcw className="w-4 h-4" />
              もう一度挑戦
            </button>
          </div>
        )}
      </div>

      {/* スマホ用操作補助 D-Pad */}
      <div className="w-full max-w-[320px] grid grid-cols-3 gap-2 mt-4 sm:hidden">
        <div />
        <button
          onClick={() => move('up')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => move('left')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ◀
        </button>
        <button
          onClick={() => move('down')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▼
        </button>
        <button
          onClick={() => move('right')}
          className="py-3 bg-slate-800 active:bg-indigo-600 text-white font-bold rounded-xl border border-slate-700"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
