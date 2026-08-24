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
  onStart,
  onRestart,
  onResume,
}) => {
  // 表示用グリッドの合成（固定ブロック + ゴースト + 現在のピース）
  const renderGrid = () => {
    // ディープコピー
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

    // 1. ゴーストの描画 (半透明)
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

    // 2. 現在操作中のピース描画
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
    <div className="relative bg-slate-950/90 border-2 border-indigo-500/40 rounded-3xl p-3 sm:p-4 shadow-[0_0_40px_rgba(99,102,241,0.15)] backdrop-blur-md">
      {/* TETRIS 4列消去の祝賀バナー */}
      {isTetrisClear && (
        <div className="absolute top-1/3 left-0 right-0 z-30 flex justify-center pointer-events-none animate-bounce">
          <span className="px-6 py-2 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white font-black text-2xl tracking-widest rounded-full shadow-[0_0_25px_rgba(244,63,94,0.9)] uppercase border-2 border-white/80 scale-110">
            ★ TETRIS! ★
          </span>
        </div>
      )}

      {/* 20x10 グリッド */}
      <div className="grid grid-cols-10 gap-[1.5px] sm:gap-1 bg-slate-900/90 p-2 rounded-2xl border border-slate-800">
        {grid.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            let cellStyle = 'bg-slate-950/60 border border-slate-900';
            if (cell.type) {
              const color = TETROMINO_COLORS[cell.type as keyof typeof TETROMINO_COLORS];
              if (color) {
                if (cell.isGhost) {
                  cellStyle = `border ${color.ghost}`;
                } else {
                  cellStyle = `${color.main} ${color.glow} border ${color.border}`;
                }
              }
            }

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[4px] transition-colors duration-75 ${cellStyle}`}
              />
            );
          })
        )}
      </div>

      {/* スタート画面オーバーレイ */}
      {!isPlaying && !isGameOver && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            TETRIS
          </h2>
          <p className="text-xs text-slate-400 max-w-[200px] mb-6">
            矢印キーまたはタッチ操作でブロックを揃えて消去しよう！
          </p>

          <button
            onClick={onStart}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white rounded-2xl font-black text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            ゲームスタート
          </button>
        </div>
      )}

      {/* ポーズ画面オーバーレイ */}
      {isPaused && !isGameOver && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <h3 className="text-2xl font-black text-white mb-2 tracking-wider">PAUSED</h3>
          <p className="text-xs text-slate-400 mb-6">一時停止中</p>

          <button
            onClick={onResume}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            再開する (P)
          </button>
        </div>
      )}

      {/* ゲームオーバー画面オーバーレイ */}
      {isGameOver && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="text-rose-400 text-xs font-bold tracking-widest uppercase mb-1">
            Result
          </div>
          <h3 className="text-3xl font-black text-white mb-4">GAME OVER</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-[220px] mb-6 space-y-2">
            <div>
              <div className="text-[11px] text-slate-400">最終スコア</div>
              <div className="text-2xl font-mono font-black text-white">{score}</div>
            </div>

            {score >= highScore && score > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                <Trophy className="w-3 h-3 text-amber-400" />
                NEW HIGH SCORE!
              </div>
            )}
          </div>

          <button
            onClick={onRestart}
            className="px-7 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            もう一度プレイ (R)
          </button>
        </div>
      )}
    </div>
  );
};
