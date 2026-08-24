import React from 'react';
import {
  BoardMatrix,
  Piece,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINO_COLORS,
} from '../types/tetris';
import { Play, RotateCcw, Trophy } from 'lucide-react';

interface TetrisBoardProps {
  board: BoardMatrix;
  currentPiece: Piece | null;
  ghostY: number | null;
  isGameOver: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  score: number;
  highScore: number;
  isTetrisClear: boolean;
  isDark?: boolean;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({
  board,
  currentPiece,
  ghostY,
  isGameOver,
  isPaused,
  isPlaying,
  score,
  highScore,
  isTetrisClear,
  isDark = true,
  onStart,
  onRestart,
  onResume,
}) => {
  const renderGrid = () => {
    const display: {
      type: string | null;
      isCurrent?: boolean;
      isGhost?: boolean;
    }[][] = board.map((row) =>
      row.map((cell) => ({
        type: cell,
        isCurrent: false,
        isGhost: false,
      }))
    );

    // 1. ゴースト
    if (currentPiece && ghostY !== null && ghostY !== currentPiece.y) {
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const y = ghostY + r;
            const x = currentPiece.x + c;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
              if (!display[y][x].type) {
                display[y][x] = {
                  type: currentPiece.type,
                  isGhost: true,
                };
              }
            }
          }
        }
      }
    }

    // 2. 現在のピース
    if (currentPiece) {
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c] !== 0) {
            const y = currentPiece.y + r;
            const x = currentPiece.x + c;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
              display[y][x] = {
                type: currentPiece.type,
                isCurrent: true,
              };
            }
          }
        }
      }
    }

    return display;
  };

  const grid = renderGrid();

  return (
    <div
      className={`relative border-2 rounded-3xl p-3 sm:p-5 transition-all duration-200 ${
        isDark
          ? 'bg-slate-950/90 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.15)]'
          : 'bg-white border-indigo-200 shadow-2xl'
      }`}
    >
      {/* TETRIS 4列消去の祝賀バナー */}
      {isTetrisClear && (
        <div className="absolute top-1/3 left-0 right-0 z-30 flex justify-center pointer-events-none animate-bounce">
          <span className="px-8 py-3 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white font-black text-2xl sm:text-3xl tracking-widest rounded-full shadow-[0_0_30px_rgba(244,63,94,0.9)] uppercase border-2 border-white/90 scale-110">
            ★ TETRIS! ★
          </span>
        </div>
      )}

      {/* 20x10 グリッド (大幅にサイズアップ: w-7〜w-10) */}
      <div
        className={`grid grid-cols-10 gap-[2px] sm:gap-1.5 p-2 sm:p-3 rounded-2xl border transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-slate-100 border-slate-200'
        }`}
      >
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            let cellStyle = isDark
              ? 'bg-slate-950/60 border border-slate-900'
              : 'bg-white/90 border border-slate-200/80';

            if (cell.type) {
              const color = TETROMINO_COLORS[cell.type as keyof typeof TETROMINO_COLORS];
              if (color) {
                if (cell.isGhost) {
                  cellStyle = isDark
                    ? `border ${color.ghost}`
                    : `border-2 border-dashed border-indigo-400 bg-indigo-50/60`;
                } else {
                  cellStyle = `${color.main} ${color.glow} border ${color.border}`;
                }
              }
            }

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-[5px] sm:rounded-md transition-colors duration-75 ${cellStyle}`}
              />
            );
          })
        )}
      </div>

      {/* スタート画面オーバーレイ */}
      {!isPlaying && !isGameOver && (
        <div
          className={`absolute inset-0 z-20 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in ${
            isDark ? 'bg-slate-950/85 text-white' : 'bg-white/90 text-slate-900'
          }`}
        >
          <h2
            className={`text-4xl sm:text-5xl font-black tracking-tight mb-3 ${
              isDark
                ? 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400'
                : 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
            }`}
          >
            TETRIS
          </h2>
          <p
            className={`text-sm max-w-[240px] mb-8 leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            矢印キーまたはタッチ操作でブロックを揃えて消去しよう！
          </p>

          <button
            onClick={onStart}
            className="px-10 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-2xl font-black text-base tracking-wider uppercase shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 transition flex items-center gap-2.5"
          >
            <Play className="w-5 h-5 fill-white" />
            ゲームスタート
          </button>
        </div>
      )}

      {/* ポーズ画面オーバーレイ */}
      {isPaused && !isGameOver && (
        <div
          className={`absolute inset-0 z-20 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in ${
            isDark ? 'bg-slate-950/80 text-white' : 'bg-white/90 text-slate-900'
          }`}
        >
          <h3 className="text-3xl font-black mb-2 tracking-wider">PAUSED</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            一時停止中
          </p>

          <button
            onClick={onResume}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            再開する (P)
          </button>
        </div>
      )}

      {/* ゲームオーバー画面オーバーレイ */}
      {isGameOver && (
        <div
          className={`absolute inset-0 z-20 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-950/90 text-white' : 'bg-white/95 text-slate-900'
          }`}
        >
          <div className="text-rose-500 text-xs font-bold tracking-widest uppercase mb-1">
            Result
          </div>
          <h3 className="text-3xl sm:text-4xl font-black mb-4">GAME OVER</h3>

          <div
            className={`border rounded-2xl p-5 w-full max-w-[260px] mb-6 space-y-2 ${
              isDark
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div>
              <div
                className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                最終スコア
              </div>
              <div className="text-3xl font-mono font-black mt-0.5">{score}</div>
            </div>

            {score >= highScore && score > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-600 text-xs font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                NEW HIGH SCORE!
              </div>
            )}
          </div>

          <button
            onClick={onRestart}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            もう一度プレイ (R)
          </button>
        </div>
      )}
    </div>
  );
};
