import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DifficultyId,
  DIFFICULTIES,
  Cell,
  MinesweeperStatus,
  NUMBER_COLORS,
} from '../types/minesweeper';
import {
  createInitialGrid,
  populateMines,
  revealCell,
  chordCell,
  checkWinCondition,
} from '../utils/minesweeperLogic';
import { sound } from '../utils/audio';
import {
  ArrowLeft,
  Bomb,
  Flag,
  RotateCcw,
  Timer,
  Trophy,
  Smile,
  Frown,
  Sparkles,
  Shovel,
} from 'lucide-react';

interface MinesweeperGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const MinesweeperGame: React.FC<MinesweeperGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyId>('easy');
  const config = DIFFICULTIES[difficulty];

  const [grid, setGrid] = useState<Cell[][]>(() =>
    createInitialGrid(config.rows, config.cols)
  );
  const [status, setStatus] = useState<MinesweeperStatus>('idle');
  const [flagsCount, setFlagsCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [mobileMode, setMobileMode] = useState<'dig' | 'flag'>('dig');
  const [bestTimes, setBestTimes] = useState<Record<DifficultyId, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  const timerRef = useRef<number | null>(null);

  // ベストタイムの読み込み
  useEffect(() => {
    const loaded: Record<DifficultyId, number | null> = {
      easy: null,
      medium: null,
      hard: null,
    };
    (['easy', 'medium', 'hard'] as DifficultyId[]).forEach((d) => {
      const saved = localStorage.getItem(`minesweeper_best_${d}`);
      if (saved) {
        loaded[d] = parseInt(saved, 10);
      }
    });
    setBestTimes(loaded);
  }, []);

  // ゲームリセット
  const resetGame = useCallback(
    (diff = difficulty) => {
      const cfg = DIFFICULTIES[diff];
      if (timerRef.current) clearInterval(timerRef.current);
      setGrid(createInitialGrid(cfg.rows, cfg.cols));
      setStatus('idle');
      setFlagsCount(0);
      setElapsedTime(0);
      setIsFirstClick(true);
    },
    [difficulty]
  );

  // 難易度変更
  const handleDifficultyChange = (diff: DifficultyId) => {
    setDifficulty(diff);
    resetGame(diff);
  };

  // タイマー管理
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => Math.min(999, prev + 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // ベストタイムの更新
  const updateBestTime = useCallback(
    (time: number) => {
      const currentBest = bestTimes[difficulty];
      if (currentBest === null || time < currentBest) {
        localStorage.setItem(`minesweeper_best_${difficulty}`, time.toString());
        setBestTimes((prev) => ({ ...prev, [difficulty]: time }));
      }
    },
    [difficulty, bestTimes]
  );

  // セル開封アクション
  const handleCellClick = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;

    if (mobileMode === 'flag') {
      handleCellRightClick(r, c);
      return;
    }

    let workingGrid = grid;

    if (isFirstClick) {
      workingGrid = populateMines(grid, config.rows, config.cols, config.mines, r, c);
      setIsFirstClick(false);
      setStatus('playing');
    }

    const cell = workingGrid[r][c];
    if (cell.isFlagged) return;

    if (cell.isRevealed) {
      if (cell.neighborMines > 0) {
        const chordRes = chordCell(workingGrid, r, c, config.rows, config.cols);
        setGrid(chordRes.newGrid);
        if (chordRes.hitMine) {
          sound.playExplosion();
          setStatus('lost');
        } else if (chordRes.revealedCount > 0) {
          sound.playCellClick();
          if (checkWinCondition(chordRes.newGrid, config.rows, config.cols)) {
            sound.playWin();
            setStatus('won');
            updateBestTime(elapsedTime);
          }
        }
      }
      return;
    }

    const { newGrid, hitMine, revealedCount } = revealCell(
      workingGrid,
      r,
      c,
      config.rows,
      config.cols
    );
    setGrid(newGrid);

    if (hitMine) {
      sound.playExplosion();
      setStatus('lost');
    } else {
      if (revealedCount > 1) {
        sound.playCascade();
      } else {
        sound.playCellClick();
      }

      if (checkWinCondition(newGrid, config.rows, config.cols)) {
        sound.playWin();
        setStatus('won');
        updateBestTime(elapsedTime);
      }
    }
  };

  // フラグ切り替えアクション
  const handleCellRightClick = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (status === 'won' || status === 'lost') return;

    const cell = grid[r][c];
    if (cell.isRevealed) return;

    sound.playFlag();
    const newGrid = grid.map((row) => row.map((item) => ({ ...item })));
    const target = newGrid[r][c];

    target.isFlagged = !target.isFlagged;
    setFlagsCount((prev) => (target.isFlagged ? prev + 1 : prev - 1));
    setGrid(newGrid);

    if (isFirstClick) {
      setStatus('playing');
    }
  };

  const remainingMines = Math.max(0, config.mines - flagsCount);

  // 難易度に応じたセルサイズとテキストサイズ
  const getCellSizeClass = () => {
    switch (difficulty) {
      case 'easy':
        return 'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-xl sm:text-2xl rounded-xl';
      case 'medium':
        return 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-base sm:text-lg rounded-lg';
      case 'hard':
        return 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 text-sm sm:text-base rounded-md';
      default:
        return 'w-8 h-8 sm:w-10 sm:h-10 text-base rounded-lg';
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 上部ナビゲーション */}
      <div
        className={`w-full flex items-center justify-between mb-4 transition-all ${
          isFullscreen ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        <button
          onClick={onBackToHub}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition ${
            isDark
              ? 'text-slate-300 hover:text-white bg-slate-900 border-slate-800 hover:bg-slate-800'
              : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          ゲーム一覧に戻る
        </button>

        <div
          className={`text-xs font-bold tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          MINESWEEPER CYBER
        </div>
      </div>

      <div
        className={`w-full flex flex-col items-center space-y-4 transition-all duration-300 ${
          isFullscreen ? 'max-w-6xl scale-100 lg:scale-105 my-2' : 'max-w-4xl'
        }`}
      >
        {/* 難易度セレクター ＆ ベストタイム */}
        <div
          className={`w-full flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-sm ${
            isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2">
            {(['easy', 'medium', 'hard'] as DifficultyId[]).map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : isDark
                    ? 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {DIFFICULTIES[d].name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-500 font-mono font-bold">
            <Trophy className="w-4 h-4" />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              BEST:
            </span>
            <span>
              {bestTimes[difficulty] !== null ? `${bestTimes[difficulty]}s` : '--'}
            </span>
          </div>
        </div>

        {/* マインスイーパー本体コンテナ */}
        <div
          className={`border-2 rounded-3xl p-5 sm:p-8 flex flex-col items-center w-full overflow-hidden transition-all duration-200 ${
            isDark
              ? 'bg-slate-950 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.15)]'
              : 'bg-white border-indigo-200 shadow-2xl'
          }`}
        >
          {/* コントロールヘッダー (サイズアップ) */}
          <div
            className={`w-full max-w-lg rounded-2xl p-4 mb-6 flex items-center justify-between border shadow-inner transition-colors ${
              isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            {/* 残り地雷カウンター */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-rose-400'
                  : 'bg-white border-slate-200 text-rose-600 shadow-xs'
              }`}
            >
              <Bomb className="w-5 h-5 text-rose-500" />
              <span className="font-mono font-black text-xl sm:text-2xl tracking-wider">
                {String(remainingMines).padStart(3, '0')}
              </span>
            </div>

            {/* リセットボタン */}
            <button
              onClick={() => resetGame()}
              className={`p-3 rounded-2xl border shadow-md active:scale-95 transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
              }`}
              title="リセット"
            >
              {status === 'won' ? (
                <Sparkles className="w-7 h-7 text-amber-500 animate-spin" />
              ) : status === 'lost' ? (
                <Frown className="w-7 h-7 text-rose-500" />
              ) : (
                <Smile className="w-7 h-7 text-indigo-500" />
              )}
            </button>

            {/* タイマー */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-cyan-400'
                  : 'bg-white border-slate-200 text-indigo-600 shadow-xs'
              }`}
            >
              <Timer className="w-5 h-5 text-indigo-500" />
              <span className="font-mono font-black text-xl sm:text-2xl tracking-wider">
                {String(elapsedTime).padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* モバイル向けモード切替ボタン */}
          <div className="flex items-center gap-3 mb-5 sm:hidden">
            <button
              onClick={() => setMobileMode('dig')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                mobileMode === 'dig'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400'
                  : 'bg-white border border-slate-200 text-slate-600 shadow-xs'
              }`}
            >
              <Shovel className="w-4 h-4" />
              掘るモード
            </button>

            <button
              onClick={() => setMobileMode('flag')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                mobileMode === 'flag'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                  : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400'
                  : 'bg-white border border-slate-200 text-slate-600 shadow-xs'
              }`}
            >
              <Flag className="w-4 h-4" />
              旗立てモード
            </button>
          </div>

          {/* ボード (セルサイズ拡張) */}
          <div
            className={`max-w-full overflow-auto p-3 sm:p-4 rounded-2xl border transition-colors ${
              isDark
                ? 'bg-slate-900/60 border-slate-800/80'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div
              className="grid gap-[3px] sm:gap-1.5 select-none"
              style={{
                gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {grid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  let content = null;
                  let cellStyle = isDark
                    ? 'bg-slate-800 hover:bg-slate-700/90 border border-slate-700/70 shadow-xs cursor-pointer active:scale-95'
                    : 'bg-white hover:bg-indigo-50/80 border border-slate-300/80 shadow-xs cursor-pointer active:scale-95';

                  if (cell.isRevealed) {
                    if (cell.isMine) {
                      cellStyle = cell.isExploded
                        ? 'bg-rose-600/90 border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                        : isDark
                        ? 'bg-rose-950/60 border border-rose-800/60'
                        : 'bg-rose-100 border border-rose-300';
                      content = <Bomb className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 fill-rose-500/30" />;
                    } else {
                      cellStyle = isDark
                        ? 'bg-slate-950/90 border border-slate-900 cursor-default'
                        : 'bg-slate-50/90 border border-slate-200/90 cursor-default';
                      if (cell.neighborMines > 0) {
                        const numColor = NUMBER_COLORS[cell.neighborMines];
                        content = (
                          <span
                            className={`font-black font-mono ${numColor.text} ${
                              isDark ? numColor.glow : ''
                            }`}
                          >
                            {cell.neighborMines}
                          </span>
                        );
                      }
                    }
                  } else if (cell.isFlagged) {
                    cellStyle = isDark
                      ? 'bg-slate-800 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'bg-amber-50 border border-amber-300 shadow-xs';
                    content = <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />;
                  }

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      onContextMenu={(e) => handleCellRightClick(rIdx, cIdx, e)}
                      className={`${getCellSizeClass()} flex items-center justify-center font-bold transition-all duration-100 ${cellStyle}`}
                    >
                      {content}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 勝敗オーバーレイ */}
          {status === 'won' && (
            <div
              className={`mt-6 p-5 rounded-2xl text-center animate-in zoom-in-95 space-y-2 border w-full max-w-md ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-100'
                  : 'bg-emerald-50 border-emerald-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xl">
                <Sparkles className="w-6 h-6" />
                MISSION COMPLETE!
              </div>
              <p
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                全ての地雷を回避してクリアしました！（クリアタイム: {elapsedTime}秒）
              </p>
              <button
                onClick={() => resetGame()}
                className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition shadow-md"
              >
                次のミッションへ挑む
              </button>
            </div>
          )}

          {status === 'lost' && (
            <div
              className={`mt-6 p-5 rounded-2xl text-center animate-in zoom-in-95 space-y-2 border w-full max-w-md ${
                isDark
                  ? 'bg-rose-500/10 border-rose-500/30 text-slate-100'
                  : 'bg-rose-50 border-rose-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-xl">
                <Bomb className="w-6 h-6" />
                MISSION FAILED
              </div>
              <p
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                地雷が爆発してしまいました。
              </p>
              <button
                onClick={() => resetGame()}
                className="mt-3 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 mx-auto shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                リトライ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
