import React, { useState } from 'react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  ArrowLeft,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Share2,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  activeGame: string | null;
  onGoHome: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onCopyUrl?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeGame,
  onGoHome,
  isDark,
  onToggleTheme,
  isFullscreen,
  onToggleFullscreen,
  onCopyUrl,
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3.5 shrink min-w-0">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
              onClick={onGoHome}
            >
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white group-hover:scale-105 transition-transform">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`font-black text-lg sm:text-xl tracking-wider ${
                    isDark
                      ? 'bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-300'
                      : 'bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700'
                  }`}
                >
                  Games Hub
                </span>
                {!activeGame && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${
                      isDark
                        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}
                  >
                    Play
                  </span>
                )}
              </div>
            </div>

            {/* Games Hub Play の横に「ゲーム一覧に戻る」ボタンを配置 */}
            {activeGame && (
              <button
                onClick={onGoHome}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl border transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-800 border-slate-700 hover:border-indigo-500/50'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300 hover:border-slate-400 shadow-xs'
                }`}
                title="ゲーム一覧に戻る"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                <span>ゲーム一覧に戻る</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* フルスクリーン切り替えボタン */}
            <button
              onClick={onToggleFullscreen}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
              }`}
              title={isFullscreen ? 'フルスクリーンを解除' : 'フルスクリーン表示'}
              aria-label="フルスクリーン切替"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

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
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
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
              {!isMuted ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* ゲームURL共有ボタン */}
            {activeGame && onCopyUrl && (
              <button
                onClick={onCopyUrl}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                  isDark
                    ? 'text-indigo-400 bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-indigo-500/50 hover:text-indigo-300'
                    : 'text-indigo-600 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-indigo-300'
                }`}
                title="このゲームのURLをコピー"
                aria-label="URLコピー"
              >
                <Share2 className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">共有</span>
              </button>
            )}

            {/* 操作方法ボタン (ゲームプレイ時に表示) */}
            {activeGame && (
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

      {/* 操作方法モーダル */}
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

            {activeGame === 'shooter' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  Star Striker 操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>自機の移動</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>矢印 / WASD / マウス</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ショット (連射トグル有)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>Space / Z / 左クリック</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ハイパーボム</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>X / K / 右クリック</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'bros' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  Gemini 3.7 Bros. 操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>左右移動</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>← / → または A / D</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ジャンプ</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>Space / W / ↑</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ダッシュ / ビーム</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>Shift / J</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'tetris' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  テトリス操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>左右移動 / 回転</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>← → / ↑ または X</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>早落とし / 即時着地</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>↓ / Space</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ホールド</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>C / Shift</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'minesweeper' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  マインスイーパー操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>マスを開く</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>左クリック (スマホ: タップ)</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>旗を立てる / 解除</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>右クリック (スマホ: 旗モード)</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>一括オープン (Chording)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>数字マスをクリック</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'breakout' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  ブロック崩し操作方法 ＆ アイテム
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>パドル移動</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>マウス / ← → / A D</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ボール発射 / レーザー</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>Space / クリック / タップ</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>アイテム効果</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>🔥貫通球 / 🧲キャッチ / ⚡レーザー / 🛡️バリア / 3x分裂</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ステージ</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>全5ステージ (Stage 5 ボスコア戦)</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ポーズ / 再開</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>P / Esc</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'game2048' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  2048 操作方法 ＆ スキル
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>タイル移動 (4方向)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>矢印キー / WASD / スワイプ</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>1手戻す (Undo)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>Ctrl+Z / 戻すボタン (最大10手)</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>💣 ボムスキル</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>最小タイルを1つ爆破消去</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>🔄 シャッフルスキル</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>盤面タイルをランダム再配置</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>⚡ 2倍化スキル</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>最小タイルを2倍に昇格</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>サイズ切替</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>3x3 / 4x4 / 5x5</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'doteater' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  ドットイーター操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>移動 (4方向)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>矢印キー / WASD / スワイプ</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>パワードット (反撃)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>大きなドットを食べるとゴースト捕食可能</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ポーズ / 再開</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>P / Esc</span>
                  </div>
                </div>
              </>
            )}

            {activeGame === 'pong' && (
              <>
                <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-indigo-500" />
                  ポン (Pong) 操作方法
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>1P パドル (左)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>W / S または マウス / 左側ドラッグ</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>2P パドル (右)</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>↑ / ↓ または 右側ドラッグ</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>ポーズ / 再開</span>
                    <span className={`font-mono px-2 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'}`}>P / Esc</span>
                  </div>
                </div>
              </>
            )}

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
