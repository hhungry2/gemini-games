import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GameCard } from './components/GameCard';
import { TetrisGame } from './games/TetrisGame';
import { MinesweeperGame } from './games/MinesweeperGame';
import { GameInfo, GameId } from './types';
import { Gamepad2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

const GAMES: GameInfo[] = [
  {
    id: 'tetris',
    title: 'テトリス (Tetris Neon)',
    titleEn: 'Classic Block Puzzle Game',
    description:
      'ネオングローが輝く本格テトリス！HOLD・NEXT・ゴースト表示・壁蹴り回転・Web Audioシンセ効果音・スマホタッチ操作に完全対応。',
    badge: '人気パズル',
    iconName: 'tetris',
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    tags: ['パズル', '定番', 'アクション', 'サウンド対応', 'スマホ操作OK'],
  },
  {
    id: 'minesweeper',
    title: 'マインスイーパー (Minesweeper Cyber)',
    titleEn: 'Neon Cyber Minesweeper',
    description:
      'サイバーパンク調のクールなマインスイーパー！初手安全保証・連鎖オープン・Chording・初級〜上級・ベストタイム記録に対応。',
    badge: '知略パズル',
    iconName: 'minesweeper',
    color: 'from-rose-500 via-amber-500 to-emerald-500',
    tags: ['知略', '初手安全', '連鎖オープン', 'タイムアタック', 'スマホ操作OK'],
  },
];

export function App() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  useEffect(() => {
    if (activeGame === 'tetris') {
      document.title = 'テトリス (Tetris Neon) | Games Hub';
    } else if (activeGame === 'minesweeper') {
      document.title = 'マインスイーパー (Minesweeper Cyber) | Games Hub';
    } else {
      document.title = 'Games Hub - Web Mini Games Collection';
    }
  }, [activeGame]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <Header
        activeGame={activeGame}
        onGoHome={() => setActiveGame(null)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        {!activeGame ? (
          <div className="w-full space-y-12 animate-in fade-in duration-300">
            {/* ヒーローセクション */}
            <div className="relative text-center py-12 px-6 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950 border border-slate-800/80 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Instant Web Games Collection
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-300">
                  Games Hub
                </h1>

                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  登録不要・APIキー不要で、PCやスマホからブラウザを開くだけで即座に遊べるWebゲームコレクションです。
                </p>
              </div>

              {/* 特徴ハイライト */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-10 pt-8 border-t border-slate-800/80 text-left">
                <div className="flex items-start gap-3 p-3.5 bg-slate-900/70 rounded-2xl border border-slate-800">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">インストール・設定不要</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">ブラウザを開くだけで即プレイ</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-900/70 rounded-2xl border border-slate-800">
                  <Gamepad2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">スマホ・PC両対応</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">キーボード ＆ タッチ操作</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-slate-900/70 rounded-2xl border border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">記録の自動保存</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">ベストタイム・ハイスコア保持</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ゲーム一覧 */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-wide">ゲーム一覧</h2>
                  <p className="text-xs text-slate-400 mt-1">プレイしたいゲームを選択してください</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GAMES.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={(id) => setActiveGame(id)}
                  />
                ))}

                {/* 今後のゲーム追加用プレースホルダー */}
                <div className="border border-dashed border-slate-800 bg-slate-900/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
                  <Gamepad2 className="w-10 h-10 text-slate-700 mb-2 animate-pulse" />
                  <div className="text-sm font-bold text-slate-500">More Games Coming Soon...</div>
                  <div className="text-xs text-slate-600 mt-1">新しいゲームを順次追加予定</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in duration-300">
            {activeGame === 'tetris' && (
              <TetrisGame onBackToHub={() => setActiveGame(null)} />
            )}
            {activeGame === 'minesweeper' && (
              <MinesweeperGame onBackToHub={() => setActiveGame(null)} />
            )}
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>Games Hub &copy; 2026 - Instant Play in Browser</p>
      </footer>
    </div>
  );
}

export default App;
