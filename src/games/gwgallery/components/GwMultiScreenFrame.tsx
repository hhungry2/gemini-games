import React from 'react';
import { GameDifficulty, ScreenMode } from '../types';
import { Volume2, VolumeX, Palette, ArrowLeft, RotateCcw, Pause, Play } from 'lucide-react';
import { gwSound } from '../sound';

interface GwMultiScreenFrameProps {
  title: string;
  screenMode: ScreenMode;
  onToggleScreenMode: () => void;
  difficulty: GameDifficulty;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  isFullscreen: boolean;
  topScreen: React.ReactNode;
  bottomScreen: React.ReactNode;
  controls?: React.ReactNode;
}

export const GwMultiScreenFrame: React.FC<GwMultiScreenFrameProps> = ({
  title,
  screenMode,
  onToggleScreenMode,
  difficulty,
  onChangeDifficulty,
  isMuted,
  onToggleMute,
  isPaused,
  onTogglePause,
  onRestart,
  onBackToMenu,
  isFullscreen,
  topScreen,
  bottomScreen,
  controls,
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center select-none transition-all duration-300 ${
        isFullscreen
          ? 'h-screen w-screen max-w-none p-1 sm:p-2 bg-neutral-950 overflow-hidden'
          : 'max-w-4xl p-2 sm:p-4'
      }`}
    >
      {/* 折りたたみマルチスクリーン筐体 (バーガンディカラー) */}
      <div
        className={`relative w-full rounded-2xl sm:rounded-3xl border-4 border-amber-950 bg-[#6d1a24] shadow-2xl transition-all duration-300 flex flex-col ${
          isFullscreen
            ? 'h-full max-h-[98vh] p-1.5 sm:p-3 max-w-[min(100vw,calc(98vh*0.88))] justify-between'
            : 'max-w-[540px] p-3 sm:p-4'
        }`}
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.3)',
        }}
      >
        {/* ネジ (四隅) */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner" />

        {/* 上部ヒンジ部・ブランドバー */}
        <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                gwSound.click();
                onBackToMenu();
              }}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-black/80 hover:bg-black text-amber-300 text-[11px] font-bold shadow active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>MENU</span>
            </button>
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-amber-400 font-mono">
              MULTI SCREEN
            </span>
          </div>

          <div className="text-center font-mono">
            <div className="text-[11px] sm:text-xs font-black text-amber-200 uppercase tracking-wider">
              {title}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                gwSound.click();
                onToggleScreenMode();
              }}
              className={`p-1 rounded text-[10px] border font-mono ${
                screenMode === 'modern'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-amber-100 text-neutral-800 border-amber-300'
              }`}
            >
              <Palette className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                onToggleMute();
                if (isMuted) gwSound.click();
              }}
              className={`p-1 rounded text-[10px] border ${
                isMuted
                  ? 'bg-red-200 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* 上画面ユニット */}
        <div
          className={`relative w-full rounded-xl bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200 border-2 border-amber-300/80 p-1.5 sm:p-2 shadow-inner flex flex-col ${
            isFullscreen ? 'flex-1 min-h-0' : 'h-[190px] sm:h-[230px]'
          }`}
        >
          {/* 小型操作ボタン群 */}
          <div className="flex items-center justify-between mb-1 text-[9px] font-mono px-1">
            <span className="text-neutral-600 font-bold tracking-wider">UPPER SCREEN</span>
            <div className="flex items-center space-x-2">
              <span className="text-neutral-700 font-bold">GAME A</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onChangeDifficulty('gameA');
                }}
                className={`w-4 h-4 rounded-full border shadow flex items-center justify-center text-[8px] font-bold ${
                  difficulty === 'gameA' ? 'bg-red-600 text-white ring-1 ring-red-300' : 'bg-neutral-300 text-neutral-700'
                }`}
              >
                A
              </button>
              <span className="text-neutral-700 font-bold">GAME B</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onChangeDifficulty('gameB');
                }}
                className={`w-4 h-4 rounded-full border shadow flex items-center justify-center text-[8px] font-bold ${
                  difficulty === 'gameB' ? 'bg-red-600 text-white ring-1 ring-red-300' : 'bg-neutral-300 text-neutral-700'
                }`}
              >
                B
              </button>
              <button
                onClick={() => {
                  gwSound.click();
                  onTogglePause();
                }}
                className={`w-4 h-4 rounded-full border shadow flex items-center justify-center text-[8px] ${
                  isPaused ? 'bg-amber-500 text-black' : 'bg-neutral-300 text-neutral-700'
                }`}
                title="PAUSE"
              >
                {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
              </button>
              <button
                onClick={() => {
                  gwSound.click();
                  onRestart();
                }}
                className="w-4 h-4 rounded-full bg-neutral-300 hover:bg-neutral-200 border shadow flex items-center justify-center text-[8px] text-neutral-700"
                title="RESET"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* 上部LCD液晶 */}
          <div
            className="relative w-full flex-1 rounded-lg border-2 border-neutral-800 bg-[#9fb393] overflow-hidden shadow-inner flex items-center justify-center"
            style={{
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent to-white/15 z-20" />
            <div className="w-full h-full relative z-10">{topScreen}</div>
          </div>
        </div>

        {/* 中央ヒンジ（蝶番）機構 */}
        <div className="relative w-full h-3 sm:h-4 my-1 bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-900 rounded border border-neutral-800 shadow flex items-center justify-center">
          <div className="w-16 h-1 bg-neutral-500 rounded-full" />
          <div className="absolute left-6 w-3 h-2 bg-neutral-800 rounded border border-neutral-600" />
          <div className="absolute right-6 w-3 h-2 bg-neutral-800 rounded border border-neutral-600" />
        </div>

        {/* 下画面ユニット */}
        <div
          className={`relative w-full rounded-xl bg-gradient-to-b from-amber-100 via-amber-50 to-amber-200 border-2 border-amber-300/80 p-1.5 sm:p-2 shadow-inner flex flex-col ${
            isFullscreen ? 'flex-1 min-h-0' : 'h-[190px] sm:h-[230px]'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-[9px] font-mono px-1">
            <span className="text-neutral-600 font-bold tracking-wider">LOWER SCREEN</span>
            <span className="text-[9px] text-neutral-500 font-bold">GAME &amp; WATCH</span>
          </div>

          {/* 下部LCD液晶 */}
          <div
            className="relative w-full flex-1 rounded-lg border-2 border-neutral-800 bg-[#9fb393] overflow-hidden shadow-inner flex items-center justify-center"
            style={{
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent to-white/15 z-20" />
            <div className="w-full h-full relative z-10">{bottomScreen}</div>
          </div>
        </div>

        {/* 操作部コントローラ */}
        {controls && (
          <div className={`w-full mt-1.5 sm:mt-2 ${isFullscreen ? 'shrink-0' : ''}`}>
            {controls}
          </div>
        )}
      </div>
    </div>
  );
};
