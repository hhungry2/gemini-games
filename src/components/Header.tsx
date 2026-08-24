import React, { useState } from 'react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  Home,
  Bomb,
  MousePointer,
  Smartphone,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeGame: string | null;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeGame, onGoHome }) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'tetris' | 'minesweeper'>('tetris');

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
  };

  const handleOpenHelp = () => {
    if (activeGame === 'minesweeper') {
      setHelpTab('minesweeper');
    } else {
      setHelpTab('tetris');
    }
    setShowHelp(true);
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
              onClick={handleOpenHelp}
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-indigo-400" />
              ゲーム操作ガイド
            </h3>

            {/* ゲーム切替タブ */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-4">
              <button
                onClick={() => setHelpTab('tetris')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  helpTab === 'tetris'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                テトリス
              </button>

              <button
                onClick={() => setHelpTab('minesweeper')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  helpTab === 'minesweeper'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bomb className="w-3.5 h-3.5" />
                マインスイーパー
              </button>
            </div>

            {/* テトリス操作方法 */}
            {helpTab === 'tetris' && (
              <div className="space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">左右移動</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">← / →</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">回転</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">↑ / X</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">ソフトドロップ (早落とし)</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">↓</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">ハードドロップ (即時着地)</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">Space</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">ホールド (キープ)</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">C / Shift</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">ポーズ / 再開</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">P</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">リスタート</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">R</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>スマホ時は画面下のタッチコントローラーで全操作可能です。</span>
                </div>
              </div>
            )}

            {/* マインスイーパー操作方法 */}
            {helpTab === 'minesweeper' && (
              <div className="space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>マスを開く (掘る)</span>
                  </div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">左クリック</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Bomb className="w-3.5 h-3.5 text-rose-400" />
                    <span>旗（フラグ）を立てる / 解除</span>
                  </div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">右クリック</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>一括開封 (Chording)</span>
                  </div>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">数字マスをクリック</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">リセット / リトライ</span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white font-bold">中央の顔ボタン</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>スマホ時は「掘るモード」と「旗立てモード」を切り替えてタップします。</span>
                </div>
              </div>
            )}

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
