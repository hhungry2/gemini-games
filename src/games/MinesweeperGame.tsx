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
}

export const MinesweeperGame: React.FC<MinesweeperGameProps> = ({ onBackToHub }) => {
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

    // モバイルのフラグモードの場合
    if (mobileMode === 'flag') {
      handleCellRightClick(r, c);
      return;
    }

    let workingGrid = grid;

    // 初手安全保証
    if (isFirstClick) {
      workingGrid = populateMines(grid, config.rows, config.cols, config.mines, r, c);
      setIsFirstClick(false);
      setStatus('playing');
    }

    const cell = workingGrid[r][c];
    if (cell.isFlagged) return;

    // すでに開いている数字セルをクリックした場合は Chording
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

    // 通常の開封
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

  // フラグ切り替えアクション（右クリックまたはスマホフラグモード）
  const handleCellRightClick = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (status === 'won' || status === 'lost') return;

    const cell = grid[r][c];
    if (cell.isRevealed) return;

    sound.playFlag();
    const newGrid = grid.map((row) => row.map((item) => ({ ...item })));
    const target = newGrid[r][c];

    if (!target.isFlagged && flagsCount >= config.mines) {
      // 旗の数が地雷数を超える場合は立てない（または立ててもOKだが制限）
    }

    target.isFlagged = !target.isFlagged;
    setFlagsCount((prev) => (target.isFlagged ? prev + 1 : prev - 1));
    setGrid(newGrid);

    if (isFirstClick) {
      setStatus('playing');
    }
  };

  const remainingMines = Math.max(0, config.mines - flagsCount);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 上部ナビゲーション */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          ゲーム一覧に戻る
        </button>

        <div className="text-xs font-bold text-slate-400 tracking-wider">
          MINESWEEPER CYBER
        </div>
      </div>

      <div className="w-full max-w-3xl flex flex-col items-center space-y-4">
        {/* 難易度セレクター ＆ ベストタイム */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            {(['easy', 'medium', 'hard'] as DifficultyId[]).map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {DIFFICULTIES[d].name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-slate-400">BEST:</span>
            <span>
              {bestTimes[difficulty] !== null ? `${bestTimes[difficulty]}s` : '--'}
            </span>
          </div>
        </div>

        {/* マインスイーパー本体コンテナ */}
        <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(99,102,241,0.15)] flex flex-col items-center w-full overflow-hidden">
          {/* コントロールヘッダー (地雷カウンター、顔アイコン、タイマー) */}
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-5 flex items-center justify-between shadow-inner">
            {/* 残り地雷カウンター */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Bomb className="w-4 h-4 text-rose-500" />
              <span className="font-mono font-black text-lg text-rose-400 tracking-wider">
                {String(remainingMines).padStart(3, '0')}
              </span>
            </div>

            {/* リセット / ステータス顔ボタン */}
            <button
              onClick={() => resetGame()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-2xl text-white shadow-lg transition"
              title="リセット"
            >
              {status === 'won' ? (
                <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              ) : status === 'lost' ? (
                <Frown className="w-6 h-6 text-rose-400" />
              ) : (
                <Smile className="w-6 h-6 text-indigo-400" />
              )}
            </button>

            {/* タイマー */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-black text-lg text-cyan-400 tracking-wider">
                {String(elapsedTime).padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* モバイル向けモード切替ボタン */}
          <div className="flex items-center gap-2 mb-4 sm:hidden">
            <button
              onClick={() => setMobileMode('dig')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mobileMode === 'dig'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              <Shovel className="w-3.5 h-3.5" />
              掘るモード
            </button>

            <button
              onClick={() => setMobileMode('flag')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                mobileMode === 'flag'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              旗立てモード
            </button>
          </div>

          {/* ボードスクローラー */}
          <div className="max-w-full overflow-auto p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div
              className="grid gap-[2px] sm:gap-1 select-none"
              style={{
                gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {grid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  let content = null;
                  let cellStyle =
                    'bg-slate-800 hover:bg-slate-700/80 border border-slate-700/70 shadow-sm cursor-pointer active:scale-95';

                  if (cell.isRevealed) {
                    if (cell.isMine) {
                      cellStyle = cell.isExploded
                        ? 'bg-rose-600/90 border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                        : 'bg-rose-950/60 border border-rose-800/60';
                      content = <Bomb className="w-4 h-4 text-rose-300 fill-rose-500/30" />;
                    } else {
                      cellStyle = 'bg-slate-950/80 border border-slate-900/80 cursor-default';
                      if (cell.neighborMines > 0) {
                        const numColor = NUMBER_COLORS[cell.neighborMines];
                        content = (
                          <span
                            className={`font-black font-mono text-sm sm:text-base ${numColor.text} ${numColor.glow}`}
                          >
                            {cell.neighborMines}
                          </span>
                        );
                      }
                    }
                  } else if (cell.isFlagged) {
                    cellStyle =
                      'bg-slate-800 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
                    content = <Flag className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />;
                  }

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                      onContextMenu={(e) => handleCellRightClick(rIdx, cIdx, e)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold transition-all duration-100 ${cellStyle}`}
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
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center animate-in zoom-in-95 space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-lg">
                <Sparkles className="w-5 h-5" />
                MISSION COMPLETE!
              </div>
              <p className="text-xs text-slate-300">
                全ての地雷を回避してクリアしました！（クリアタイム: {elapsedTime}秒）
              </p>
              <button
                onClick={() => resetGame()}
                className="mt-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                次のミッションへ挑む
              </button>
            </div>
          )}

          {status === 'lost' && (
            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center animate-in zoom-in-95 space-y-2">
              <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-lg">
                <Bomb className="w-5 h-5" />
                MISSION FAILED
              </div>
              <p className="text-xs text-slate-300">地雷が爆発してしまいました。</p>
              <button
                onClick={() => resetGame()}
                className="mt-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                リトライ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
