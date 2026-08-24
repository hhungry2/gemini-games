import React from 'react';
import { TetrominoType, TETROMINO_SHAPES, TETROMINO_COLORS } from '../types/tetris';

interface PiecePreviewProps {
  type: TetrominoType | null;
  label: string;
  canHold?: boolean;
  isDark?: boolean;
}

export const PiecePreview: React.FC<PiecePreviewProps> = ({
  type,
  label,
  canHold = true,
  isDark = true,
}) => {
  const shape = type ? TETROMINO_SHAPES[type] : null;
  const color = type ? TETROMINO_COLORS[type] : null;

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-between shadow-lg backdrop-blur-sm min-w-[130px] sm:min-w-[160px] transition-colors ${
        isDark
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <span
        className={`text-xs sm:text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {label}
      </span>

      <div
        className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-2xl border p-2 sm:p-3 ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {shape && color ? (
          <div
            className="grid gap-1 sm:gap-1.5 transition-transform duration-200"
            style={{
              gridTemplateColumns: `repeat(${shape[0].length}, minmax(0, 1fr))`,
            }}
          >
            {shape.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] transition-all ${
                    cell !== 0
                      ? `${color.main} ${color.glow} border ${color.border} ${!canHold ? 'opacity-50' : ''}`
                      : 'bg-transparent'
                  }`}
                />
              ))
            )}
          </div>
        ) : (
          <span
            className={`text-xs font-mono ${
              isDark ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            - EMPTY -
          </span>
        )}
      </div>
    </div>
  );
};
