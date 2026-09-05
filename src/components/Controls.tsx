import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  RotateCw,
  Zap,
  RefreshCw,
} from 'lucide-react';

interface ControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotate: () => void;
  onHold: () => void;
  disabled?: boolean;
  isDark?: boolean;
}

export const MobileControls: React.FC<ControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotate,
  onHold,
  disabled = false,
  isDark = true,
}) => {
  return (
    <div className="w-full max-w-sm mx-auto pt-1 sm:pt-4 flex flex-col gap-1.5 sm:gap-3 select-none touch-manipulation">
      {/* 上段アクション: HOLD, ROTATE, HARD DROP */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          onClick={onHold}
          disabled={disabled}
          className={`flex-1 max-w-[80px] sm:max-w-[90px] py-2 sm:py-3 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center active:scale-95 transition shadow-md disabled:opacity-40 border ${
            isDark
              ? 'bg-slate-800 active:bg-slate-700 border-slate-700 text-slate-200'
              : 'bg-white active:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
          }`}
          aria-label="ホールド"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 mb-0.5 sm:mb-1" />
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider">HOLD</span>
        </button>

        <button
          onClick={onRotate}
          disabled={disabled}
          className="flex-1 max-w-[100px] sm:max-w-[110px] py-2.5 sm:py-4 bg-indigo-600 active:bg-indigo-500 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 transition shadow-lg shadow-indigo-500/25 disabled:opacity-40"
          aria-label="回転"
        >
          <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1" />
          <span className="text-[10px] sm:text-[11px] font-black tracking-wider">ROTATE</span>
        </button>

        <button
          onClick={onHardDrop}
          disabled={disabled}
          className="flex-1 max-w-[80px] sm:max-w-[90px] py-2 sm:py-3 bg-rose-600 active:bg-rose-500 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 transition shadow-md shadow-rose-600/20 disabled:opacity-40"
          aria-label="ハードドロップ"
        >
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 mb-0.5 sm:mb-1" />
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider">DROP</span>
        </button>
      </div>

      {/* 下段ナビゲーション: 左, 下 (ソフトドロップ), 右 */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          onClick={onMoveLeft}
          disabled={disabled}
          className={`flex-1 max-w-[90px] sm:max-w-[100px] py-2 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center active:scale-95 transition shadow-md disabled:opacity-40 border ${
            isDark
              ? 'bg-slate-900 active:bg-slate-800 border-slate-700/80 text-white'
              : 'bg-white active:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
          }`}
          aria-label="左移動"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={onSoftDrop}
          disabled={disabled}
          className={`flex-1 max-w-[90px] sm:max-w-[100px] py-2 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center active:scale-95 transition shadow-md disabled:opacity-40 border ${
            isDark
              ? 'bg-slate-900 active:bg-slate-800 border-slate-700/80 text-white'
              : 'bg-white active:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
          }`}
          aria-label="ソフトドロップ"
        >
          <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
        </button>

        <button
          onClick={onMoveRight}
          disabled={disabled}
          className={`flex-1 max-w-[90px] sm:max-w-[100px] py-2 sm:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center active:scale-95 transition shadow-md disabled:opacity-40 border ${
            isDark
              ? 'bg-slate-900 active:bg-slate-800 border-slate-700/80 text-white'
              : 'bg-white active:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
          }`}
          aria-label="右移動"
        >
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
};
