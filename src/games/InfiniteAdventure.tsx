import React, { useState } from 'react';
import { generateGameContent } from '../lib/gemini';
import { BookOpen, Compass, RotateCcw, AlertCircle, Loader2, Send } from 'lucide-react';

interface StoryScene {
  storyText: string;
  choices: string[];
  hpChange?: number;
  statusText?: string;
  isEnding?: boolean;
}

const GENRES = [
  { id: 'fantasy', name: '王道ダークファンタジー', desc: '古代遺跡と竜の遺産を巡る冒険' },
  { id: 'cyberpunk', name: 'サイバーパンク2099', desc: 'ネオン街と巨大企業AIの陰謀' },
  { id: 'space', name: '深宇宙サバイバル', desc: '見知らぬ惑星からの脱出劇' },
  { id: 'horror', name: '廃校舎の怪談', desc: '呪われた旧校舎での一夜の脱出' },
];

export const InfiniteAdventure: React.FC<{ onOpenKeyModal: () => void }> = ({ onOpenKeyModal }) => {
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hp, setHp] = useState(100);
  const [storyHistory, setStoryHistory] = useState<
    { action: string; story: string }[]
  >([]);
  const [currentScene, setCurrentScene] = useState<StoryScene | null>(null);
  const [customAction, setCustomAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startStory = async () => {
    setIsPlaying(true);
    setHp(100);
    setStoryHistory([]);
    setCurrentScene(null);
    setLoading(true);
    setErrorMsg(null);

    const prompt = `
あなたは世界最高峰のゲームブック作家兼ゲームマスターです。
プレイヤーはジャンル「${selectedGenre.name} (${selectedGenre.desc})」の物語を開始します。

最初の導入シーンと、プレイヤーが取れる3つの具体的な選択肢を生成してください。
必ず以下のJSON形式のみで出力してください（Markdownコードブロックは不要です）:

{
  "storyText": "導入となる魅力的な描写（情景、主人公の置かれた危機や状況、200〜300文字程度）",
  "choices": [
    "選択肢1",
    "選択肢2",
    "選択肢3"
  ],
  "hpChange": 0,
  "statusText": "現在の状態や場所名",
  "isEnding": false
}
`;

    try {
      const resText = await generateGameContent({
        prompt,
        systemInstruction: 'JSONのみを出力する厳格なゲームマスターAIです。余計な文章やマークダウンブロックは出力しないでください。',
      });
      const cleanJson = resText.replace(/```json|```/g, '').trim();
      const parsed: StoryScene = JSON.parse(cleanJson);
      setCurrentScene(parsed);
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMsg('APIキーが設定されていません。');
      } else {
        setErrorMsg('ストーリーの開始に失敗しました。');
      }
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async (action: string) => {
    if (!currentScene || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setCustomAction('');

    const recentHistory = storyHistory.slice(-3).map((h) => `行動: ${h.action}\n結果: ${h.story}`).join('\n---\n');

    const prompt = `
世界観: ${selectedGenre.name}
直近のあらすじ・経緯:
${recentHistory}
直前の状況: ${currentScene.storyText}
プレイヤーの行動選択: 「${action}」
現在のHP: ${hp} (0になるとゲームオーバー)

プレイヤーの行動に対する結果の描写と、次に繋がる展開、および3つの新しい選択肢を生成してください。
もしプレイヤーの行動が致命的だったりHPが0以下になる場合は isEnding: true としてください。
必ず以下のJSON形式のみで出力してください:

{
  "storyText": "行動の結果と新たな展開（200〜300文字程度）",
  "choices": [
    "選択肢1",
    "選択肢2",
    "選択肢3"
  ],
  "hpChange": 0 (ダメージなら-10や-20、回復なら+10などの数値),
  "statusText": "現在の状態や場所名",
  "isEnding": false (物語が完結または主人公が倒れた場合は true)
}
`;

    try {
      const resText = await generateGameContent({
        prompt,
        systemInstruction: 'JSONのみを出力する厳格なゲームマスターAIです。',
      });
      const cleanJson = resText.replace(/```json|```/g, '').trim();
      const parsed: StoryScene = JSON.parse(cleanJson);

      const newHp = Math.max(0, Math.min(100, hp + (parsed.hpChange || 0)));
      setHp(newHp);

      setStoryHistory((prev) => [
        ...prev,
        { action, story: currentScene.storyText },
      ]);

      if (newHp <= 0) {
        parsed.isEnding = true;
        parsed.storyText += '\n\n【GAME OVER】あなたは力尽きてしまった…';
      }

      setCurrentScene(parsed);
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMsg('APIキーが設定されていません。');
      } else {
        setErrorMsg('次の展開の生成に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1 font-semibold text-sm">
            <BookOpen className="w-4 h-4" />
            AI 無限インタラクティブノベル
          </div>
          <h2 className="text-2xl font-bold text-white">Infinite Adventure RPG</h2>
          <p className="text-sm text-slate-400 mt-1">
            Geminiが紡ぎ出す無限の物語。あなたの選択が運命を切り拓く！
          </p>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">HP</span>
              <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    hp > 50 ? 'bg-emerald-500' : hp > 20 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hp}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-white">{hp}</span>
            </div>

            <button
              onClick={() => setIsPlaying(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              終了
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.includes('APIキー') && (
            <button
              onClick={onOpenKeyModal}
              className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-white px-3 py-1.5 rounded-lg border border-rose-500/40"
            >
              設定を開く
            </button>
          )}
        </div>
      )}

      {!isPlaying ? (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              冒険の世界観（ジャンル）を選択
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {GENRES.map((genre) => (
                <div
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    selectedGenre.id === genre.id
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1">{genre.name}</div>
                  <div className="text-xs text-slate-400">{genre.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={startStory}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                この世界で冒険を始める
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 現在のシーン */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            {currentScene?.statusText && (
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                📍 {currentScene.statusText}
              </div>
            )}

            <div className="text-slate-100 text-base leading-relaxed whitespace-pre-wrap font-serif bg-slate-950/50 p-6 rounded-xl border border-slate-800/80">
              {currentScene?.storyText}
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs py-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Geminiが新たな運命を構築中...
              </div>
            )}
          </div>

          {/* 選択肢 */}
          {currentScene?.isEnding ? (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
              <h3 className="text-xl font-bold text-amber-400">物語は完結しました</h3>
              <p className="text-sm text-slate-300">
                あなたの物語はここで幕を閉じました。別の選択や世界観で新たな旅に出てみませんか？
              </p>
              <button
                onClick={() => setIsPlaying(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
              >
                タイトルへ戻る
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400">次の行動を選択</div>

              <div className="grid grid-cols-1 gap-2.5">
                {currentScene?.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleNextStep(choice)}
                    disabled={loading}
                    className="p-4 bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/60 rounded-xl text-left text-sm font-medium text-slate-200 hover:text-white transition group flex items-center justify-between disabled:opacity-50"
                  >
                    <span>
                      <span className="text-indigo-400 font-bold mr-2">{idx + 1}.</span>
                      {choice}
                    </span>
                  </button>
                ))}
              </div>

              {/* 自由行動入力 */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customAction.trim()) handleNextStep(customAction.trim());
                }}
                className="flex gap-2 pt-2"
              >
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="または、自由に行動を入力 (例: 壁の隠しスイッチを探す)"
                  disabled={loading}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition"
                />
                <button
                  type="submit"
                  disabled={loading || !customAction.trim()}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  実行
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
