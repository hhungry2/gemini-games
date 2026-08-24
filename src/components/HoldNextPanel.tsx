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

interface NextQueuePreviewProps {
  queue: TetrominoType[];
  isDark?: boolean;
  count?: number;
}

export const NextQueuePreview: React.FC<NextQueuePreviewProps> = ({
  queue,
  isDark = true,
  count = 3,
}) => {
  const displayPieces = queue.slice(0, count);

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-5 flex flex-col items-center shadow-lg backdrop-blur-sm min-w-[130px] sm:min-w-[160px] transition-colors space-y-3 ${
        isDark
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <span
        className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        NEXT
      </span>

      <div className="flex flex-col gap-2.5 w-full items-center">
        {displayPieces.map((type, idx) => {
          const shape = TETROMINO_SHAPES[type];
          const color = TETROMINO_COLORS[type];
          const isFirst = idx === 0;

          return (
            <div
              key={idx}
              className={`flex items-center justify-center rounded-xl border transition-all ${
                isFirst
                  ? 'w-24 h-20 sm:w-28 sm:h-22 p-2'
                  : 'w-20 h-14 sm:w-24 sm:h-16 p-1.5 opacity-80 scale-90'
              } ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800/80'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className="grid gap-1 transition-transform"
                style={{
                  gridTemplateColumns: `repeat(${shape[0].length}, minmax(0, 1fr))`,
                }}
              >
                {shape.map((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`${
                        isFirst ? 'w-3.5 h-3.5 sm:w-4.5 sm:h-4.5' : 'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5'
                      } rounded-[3px] transition-all ${
                        cell !== 0
                          ? `${color.main} ${color.glow} border ${color.border}`
                          : 'bg-transparent'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
