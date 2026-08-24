import React, { useState } from 'react';
import { Gamepad2, Volume2, VolumeX, HelpCircle, X, Home } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeGame: string | null;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeGame, onGoHome }) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showHelp, setShowHelp] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  return (
    <>
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onGoHome}
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-300">
                  Games Hub
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  Play
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeGame && (
              <button
                onClick={onGoHome}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
              >
                <Home className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">ゲーム一覧</span>
              </button>
            )}

            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition ${
                !isMuted
                  ? 'bg-slate-900 border-slate-700 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
              title={isMuted ? 'サウンドをONにする' : 'サウンドをミュートにする'}
              aria-label="サウンド切替"
            >
              {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">操作方法</span>
            </button>
          </div>
        </div>
      </header>

      {/* 操作方法モーダル */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-indigo-400" />
              テトリス操作方法 (Controls)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">左右移動</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">← / →</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">回転</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">↑ / X</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">ソフトドロップ (早落とし)</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">↓</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">ハードドロップ (即時着地)</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">Space</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">ホールド (キープ)</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">C / Shift</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">ポーズ / 再開</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">P</span>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 font-medium">リスタート</span>
                <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">R</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};
