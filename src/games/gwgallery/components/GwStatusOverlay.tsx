import React from 'react';

export const GwStatusOverlay: React.FC<{
  isPaused: boolean;
  isGameOver: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
}> = ({ isPaused, isGameOver, onTogglePause, onRestart }) => {
  if (!isPaused && !isGameOver) return null;
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-neutral-950/75 p-2 text-center text-amber-100 backdrop-blur-sm">
      <div role="status" className="font-mono text-lg sm:text-2xl font-black tracking-wider">
        {isGameOver ? 'GAME OVER' : 'PAUSED'}
      </div>
      <button
        onClick={isGameOver ? onRestart : onTogglePause}
        className="min-h-10 rounded-xl border border-amber-200 bg-amber-400 px-5 py-2 text-sm font-bold text-neutral-950 shadow-lg active:scale-95"
      >
        {isGameOver ? 'もう一度プレイ' : 'プレイを再開'}
      </button>
      {!isGameOver && <span className="text-[10px] font-mono">P キーでも再開できます</span>}
    </div>
  );
};
