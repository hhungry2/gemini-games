import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GameCard } from './components/GameCard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { MysteryDetective } from './games/MysteryDetective';
import { WordChainBattle } from './games/WordChainBattle';
import { InfiniteAdventure } from './games/InfiniteAdventure';
import { GameInfo, GameId } from './types';
import { getStoredApiKey } from './lib/gemini';
import { Sparkles, Bot, Zap, ShieldCheck } from 'lucide-react';

const GAMES: GameInfo[] = [
  {
    id: 'detective',
    title: 'AI 推理探偵ゲーム',
    titleEn: 'AI Mystery Detective',
    description: 'Geminiが生成する本格密室・殺人事件。容疑者たちに事情聴取し、矛盾を暴いて真犯人を告発しよう！',
    badge: '推理・尋問',
    iconName: 'detective',
    color: 'from-amber-500 to-rose-600',
  },
  {
    id: 'wordchain',
    title: 'AI しりとり＆連想バトル',
    titleEn: 'Word Chain Battle',
    description: 'Geminiと知恵比べ！テーマ縛り（IT、ファンタジー、グルメ等）のルールで言葉を繋ぎ続けよう。',
    badge: '知育・対戦',
    iconName: 'wordchain',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'adventure',
    title: '無限インタラクティブノベル',
    titleEn: 'Infinite Adventure RPG',
    description: 'あなたの自由な選択肢によって展開がリアルタイムに分岐する、Geminiがマスターを務めるRPGノベル。',
    badge: 'ストーリーRPG',
    iconName: 'adventure',
    color: 'from-emerald-500 to-teal-600',
  },
];

export function App() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const checkApiKey = () => {
    setHasApiKey(!!getStoredApiKey());
  };

  useEffect(() => {
    checkApiKey();
  }, []);

  const renderActiveGame = () => {
    switch (activeGame) {
      case 'detective':
        return <MysteryDetective onOpenKeyModal={() => setIsKeyModalOpen(true)} />;
      case 'wordchain':
        return <WordChainBattle onOpenKeyModal={() => setIsKeyModalOpen(true)} />;
      case 'adventure':
        return <InfiniteAdventure onOpenKeyModal={() => setIsKeyModalOpen(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        onOpenApiKeyModal={() => setIsKeyModalOpen(true)}
        activeGame={activeGame}
        onGoHome={() => setActiveGame(null)}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {!activeGame ? (
          <div className="space-y-12">
            {/* ヒーローセクション */}
            <div className="relative text-center py-12 px-4 rounded-3xl bg-gradient-to-b from-indigo-950/30 via-slate-900/50 to-slate-950 border border-slate-800/80 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Google Gemini 2.5 連携ゲームハブ
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                  Gemini Games Hub
                </h1>

                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  最先端 AI「Gemini」の推論力・対話力・創造力を活かしたインタラクティブなゲームコレクション。お好きなゲームを選んでプレイしてください。
                </p>

                {!hasApiKey && (
                  <div className="pt-2">
                    <button
                      onClick={() => setIsKeyModalOpen(true)}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition inline-flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      APIキーを設定して今すぐプレイ
                    </button>
                  </div>
                )}
              </div>

              {/* 特徴ハイライト */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-10 pt-8 border-t border-slate-800/80 text-left">
                <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <Bot className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">動的シナリオ生成</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">遊ぶたびに新しい事件や物語をGeminiが創出</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">高速レスポンス</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Gemini 2.5 Flashによる滑らかなゲームプレイ</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">安心のクライアント管理</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">APIキーは端末内のLocalStorageのみに保存</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ゲーム一覧 */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">ゲーム一覧</h2>
                  <p className="text-xs text-slate-400 mt-0.5">プレイしたいゲームを選択してください</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {GAMES.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={(id) => setActiveGame(id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          renderActiveGame()
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <p>Gemini Games Hub &copy; 2026 - Powered by Google Gemini API (@google/genai)</p>
      </footer>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={checkApiKey}
      />
    </div>
  );
}

export default App;
