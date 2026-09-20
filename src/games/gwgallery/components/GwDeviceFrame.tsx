import React from 'react';
import { GameDifficulty, ScreenMode } from '../types';
import { Volume2, VolumeX, Palette, ArrowLeft, RotateCcw, Pause, Play } from 'lucide-react';
import { gwSound } from '../sound';

interface GwDeviceFrameProps {
  title: string;
  series: 'GOLD' | 'WIDE SCREEN' | 'MULTI SCREEN' | 'NEW WIDE';
  plateColor?: 'gold' | 'silver' | 'burgundy';
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
  children: React.ReactNode;
  controls?: React.ReactNode;
}

export const GwDeviceFrame: React.FC<GwDeviceFrameProps> = ({
  title,
  series,
  plateColor = 'gold',
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
  children,
  controls,
}) => {
  const plateBgClass =
    plateColor === 'gold'
      ? 'bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-300 border-amber-400'
      : plateColor === 'burgundy'
      ? 'bg-gradient-to-b from-red-950 via-rose-900 to-red-950 border-rose-800 text-amber-200'
      : 'bg-gradient-to-b from-slate-200 via-zinc-100 to-slate-300 border-slate-400';

  const bodyBorderClass =
    plateColor === 'burgundy' ? 'border-amber-700/80 bg-red-950' : 'border-amber-900/60 bg-[#7c2824]';

  return (
    <div
      className={`w-full flex flex-col items-center justify-center select-none transition-all duration-300 ${
        isFullscreen
          ? 'h-screen w-screen max-w-none p-1 sm:p-2 bg-neutral-950 overflow-hidden'
          : 'max-w-4xl p-2 sm:p-4'
      }`}
    >
      {/* 筐体本体 (Nintendo Game & Watch 筐体オマージュ) */}
      <div
        className={`relative w-full rounded-2xl sm:rounded-3xl shadow-2xl border-4 ${bodyBorderClass} transition-all duration-300 ${
          isFullscreen
            ? 'h-full max-h-[98vh] flex flex-col justify-between p-2 sm:p-4 max-w-[min(100vw,calc(98vh*1.55))]'
            : 'max-w-[760px] p-3 sm:p-5'
        }`}
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.4)',
        }}
      >
        {/* ネジ (四隅) */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-neutral-700"></div>
        </div>
        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-neutral-700 rotate-45"></div>
        </div>
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-neutral-700 -rotate-30"></div>
        </div>
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-neutral-400 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-0.5 bg-neutral-700 rotate-90"></div>
        </div>

        {/* アルミ金属プレート調フェイスパネル */}
        <div
          className={`relative w-full rounded-xl sm:rounded-2xl border-2 ${plateBgClass} p-2 sm:p-3.5 shadow-md flex flex-col ${
            isFullscreen ? 'flex-1 justify-between min-h-0' : ''
          }`}
        >
          {/* ヘッダーブランドバー */}
          <div className="flex items-center justify-between border-b border-black/15 pb-1 sm:pb-2 mb-1 sm:mb-2 px-1">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  gwSound.click();
                  onBackToMenu();
                }}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-black/80 hover:bg-black text-amber-300 text-xs font-bold shadow active:scale-95 transition-transform"
                title="ギャラリーメニューへ戻る"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MENU</span>
              </button>
              <span className="text-[10px] sm:text-xs font-extrabold tracking-widest text-red-700 bg-amber-100 px-1.5 py-0.5 rounded border border-red-700/30">
                {series}
              </span>
            </div>

            {/* タイトルロゴ */}
            <div className="text-center">
              <div className="text-xs sm:text-sm font-black tracking-wider text-neutral-900 font-mono drop-shadow-sm">
                GAME &amp; WATCH
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-red-800 tracking-widest uppercase">
                {title}
              </div>
            </div>

            {/* 右上ユーティリティボタン */}
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <button
                onClick={() => {
                  gwSound.click();
                  onToggleScreenMode();
                }}
                className={`p-1 rounded text-xs border font-mono flex items-center space-x-1 ${
                  screenMode === 'modern'
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-amber-100 text-neutral-800 border-amber-300'
                }`}
                title={screenMode === 'classic' ? 'カラーモードに変更' : 'クラシックLCDに変更'}
              >
                <Palette className="w-3 h-3" />
                <span className="text-[9px] font-bold hidden sm:inline">
                  {screenMode === 'classic' ? 'LCD' : 'COLOR'}
                </span>
              </button>

              <button
                onClick={() => {
                  onToggleMute();
                  if (isMuted) gwSound.click();
                }}
                className={`p-1 rounded text-xs border ${
                  isMuted
                    ? 'bg-red-200 text-red-800 border-red-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title={isMuted ? 'ミュート解除' : 'ミュート'}
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 小型ファンクションボタン（GAME A, GAME B, TIME, ACL, PAUSE） */}
          <div className="flex items-center justify-end space-x-2 sm:space-x-3 mb-1 sm:mb-2 text-[10px] font-mono px-2">
            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-neutral-700 uppercase">GAME A</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onChangeDifficulty('gameA');
                }}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border shadow-inner flex items-center justify-center font-bold text-[9px] transition-transform active:scale-90 ${
                  difficulty === 'gameA'
                    ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-400'
                    : 'bg-neutral-300 text-neutral-700 border-neutral-400 hover:bg-neutral-200'
                }`}
              >
                A
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-neutral-700 uppercase">GAME B</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onChangeDifficulty('gameB');
                }}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border shadow-inner flex items-center justify-center font-bold text-[9px] transition-transform active:scale-90 ${
                  difficulty === 'gameB'
                    ? 'bg-red-600 text-white border-red-800 ring-2 ring-red-400'
                    : 'bg-neutral-300 text-neutral-700 border-neutral-400 hover:bg-neutral-200'
                }`}
              >
                B
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-neutral-700 uppercase">PAUSE</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onTogglePause();
                }}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border shadow-inner flex items-center justify-center font-bold text-[8px] transition-transform active:scale-90 ${
                  isPaused
                    ? 'bg-amber-500 text-black border-amber-700 ring-2 ring-amber-300'
                    : 'bg-neutral-300 text-neutral-700 border-neutral-400 hover:bg-neutral-200'
                }`}
                title="一時停止"
              >
                {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-bold text-neutral-700 uppercase">RESET</span>
              <button
                onClick={() => {
                  gwSound.click();
                  onRestart();
                }}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-neutral-300 hover:bg-neutral-200 text-neutral-700 border border-neutral-400 shadow-inner flex items-center justify-center font-bold text-[8px] transition-transform active:scale-90"
                title="ゲームリセット"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* スクリーンベゼル＆LCD画面（メインコンテンツ） */}
          <div
            className={`relative w-full rounded-lg border-4 border-neutral-800 bg-[#9fb393] overflow-hidden shadow-inner flex items-center justify-center ${
              isFullscreen ? 'flex-1 min-h-0' : 'aspect-[4/3] sm:aspect-[16/11]'
            }`}
            style={{
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.4)',
            }}
          >
            {/* ガラス表面反射エフェクト */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-white/20 z-20" />

            {/* 画面コンテンツ */}
            <div className="w-full h-full relative z-10">{children}</div>
          </div>

          {/* コントローラ操作部（十字キー/アクションボタン群） */}
          {controls && (
            <div className={`w-full mt-2 sm:mt-3 ${isFullscreen ? 'shrink-0' : ''}`}>
              {controls}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
