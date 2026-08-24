import React, { useState } from 'react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  Home,
  Smartphone,
  Sun,
  Moon,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeGame: string | null;
  onGoHome: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeGame,
  onGoHome,
  isDark,
  onToggleTheme,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showHelp, setShowHelp] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  return (
    <>
      <header
        className={`w-full border-b backdrop-blur-md sticky top-0 z-40 transition-colors duration-200 ${
          isDark
            ? 'border-slate-800/80 bg-slate-950/80 text-slate-100'
            : 'border-slate-200 bg-white/80 text-slate-800 shadow-xs'
        }`}
      >
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
                <span
                  className={`font-black text-xl tracking-wider ${
                    isDark
                      ? 'bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-300'
                      : 'bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700'
                  }`}
                >
                  Games Hub
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}
                >
                  Play
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {activeGame && (
              <button
                onClick={onGoHome}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-700'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <Home className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">ゲーム一覧</span>
              </button>
            )}

            {/* ダーク/ライトモード切り替えボタン */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                  : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
              }`}
              title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              aria-label="テーマ切替"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* サウンドON/OFF */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? !isMuted
                    ? 'bg-slate-900 border-slate-700 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                  : !isMuted
                  ? 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={isMuted ? 'サウンドをONにする' : 'サウンドをミュートにする'}
              aria-label="サウンド切替"
            >
              {!isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* テトリス操作方法ボタン (テトリスプレイ時のみ表示) */}
            {activeGame === 'tetris' && (
              <button
                onClick={() => setShowHelp(true)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                  isDark
                    ? 'text-slate-300 bg-slate-900 hover:bg-slate-800 border-slate-700'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">操作方法</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* テトリス操作方法モーダル */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <button
              onClick={() => setShowHelp(false)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-indigo-500" />
              テトリス操作方法 (Controls)
            </h3>

            <div className="space-y-3 text-xs">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  左右移動
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  ← / →
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  回転
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  ↑ / X
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  ソフトドロップ (早落とし)
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  ↓
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  ハードドロップ (即時着地)
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  Space
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  ホールド (キープ)
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  C / Shift
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  ポーズ / 再開
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  P
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  リスタート
                </span>
                <span
                  className={`font-mono px-2 py-1 rounded font-bold ${
                    isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  R
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-indigo-50/70 border-indigo-100 text-indigo-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>スマホ時は画面下のタッチコントローラーで全操作可能です。</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};
