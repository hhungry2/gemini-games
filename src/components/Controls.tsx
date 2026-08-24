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
}

export const MobileControls: React.FC<ControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotate,
  onHold,
  disabled = false,
}) => {
  return (
    <div className="w-full max-w-md mx-auto pt-4 flex flex-col gap-3 select-none touch-manipulation">
      {/* 上段アクション: HOLD, ROTATE, HARD DROP */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onHold}
          disabled={disabled}
          className="flex-1 max-w-[90px] py-3 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-200 active:scale-95 transition shadow-md disabled:opacity-40"
          aria-label="ホールド"
        >
          <RefreshCw className="w-5 h-5 text-indigo-400 mb-1" />
          <span className="text-[10px] font-bold tracking-wider">HOLD</span>
        </button>

        <button
          onClick={onRotate}
          disabled={disabled}
          className="flex-1 max-w-[110px] py-4 bg-indigo-600 active:bg-indigo-500 rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 transition shadow-lg shadow-indigo-500/25 disabled:opacity-40"
          aria-label="回転"
        >
          <RotateCw className="w-6 h-6 mb-1" />
          <span className="text-[11px] font-black tracking-wider">ROTATE</span>
        </button>

        <button
          onClick={onHardDrop}
          disabled={disabled}
          className="flex-1 max-w-[90px] py-3 bg-rose-600 active:bg-rose-500 rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 transition shadow-md shadow-rose-600/20 disabled:opacity-40"
          aria-label="ハードドロップ"
        >
          <Zap className="w-5 h-5 text-amber-300 mb-1" />
          <span className="text-[10px] font-bold tracking-wider">DROP</span>
        </button>
      </div>

      {/* 下段ナビゲーション: 左, 下 (ソフトドロップ), 右 */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onMoveLeft}
          disabled={disabled}
          className="flex-1 max-w-[100px] py-3.5 bg-slate-900 active:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-center text-white active:scale-95 transition shadow-md disabled:opacity-40"
          aria-label="左移動"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          onClick={onSoftDrop}
          disabled={disabled}
          className="flex-1 max-w-[100px] py-3.5 bg-slate-900 active:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-center text-white active:scale-95 transition shadow-md disabled:opacity-40"
          aria-label="ソフトドロップ"
        >
          <ArrowDown className="w-6 h-6 text-indigo-400" />
        </button>

        <button
          onClick={onMoveRight}
          disabled={disabled}
          className="flex-1 max-w-[100px] py-3.5 bg-slate-900 active:bg-slate-800 border border-slate-700/80 rounded-2xl flex items-center justify-center text-white active:scale-95 transition shadow-md disabled:opacity-40"
          aria-label="右移動"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
