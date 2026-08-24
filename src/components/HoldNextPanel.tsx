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
      className={`border rounded-2xl p-4 flex flex-col items-center justify-between shadow-lg backdrop-blur-sm min-w-[110px] transition-colors ${
        isDark
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <span
        className={`text-xs font-bold uppercase tracking-widest mb-3 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {label}
      </span>

      <div
        className={`w-20 h-20 flex items-center justify-center rounded-xl border p-2 ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {shape && color ? (
          <div
            className="grid gap-1 transition-transform duration-200"
            style={{
              gridTemplateColumns: `repeat(${shape[0].length}, minmax(0, 1fr))`,
            }}
          >
            {shape.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-all ${
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
            className={`text-[11px] font-mono ${
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
