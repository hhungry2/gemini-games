import React, { useState } from 'react';
import { generateGameContent } from '../lib/gemini';
import { Swords, Send, RotateCcw, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface ChainItem {
  sender: 'player' | 'gemini';
  word: string;
  comment?: string;
}

const THEMES = [
  { id: 'free', label: '通常しりとり' },
  { id: 'tech', label: 'IT・科学技術縛り' },
  { id: 'fantasy', label: 'ゲーム・ファンタジー用語' },
  { id: 'food', label: '食べ物・グルメ' },
];

export const WordChainBattle: React.FC<{ onOpenKeyModal: () => void }> = ({ onOpenKeyModal }) => {
  const [theme, setTheme] = useState('free');
  const [history, setHistory] = useState<ChainItem[]>([
    { sender: 'gemini', word: 'ジェミニ (Gemini)', comment: 'さあ、「に」または「い」から始めてください！' },
  ]);
  const [inputWord, setInputWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = () => {
    setHistory([
      { sender: 'gemini', word: 'ジェミニ (Gemini)', comment: 'さあ、「に」または「い」から始めてください！' },
    ]);
    setInputWord('');
    setGameOver(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim() || loading || gameOver) return;

    const playerWord = inputWord.trim();
    setInputWord('');
    setErrorMsg(null);
    setLoading(true);

    const prevWord = history[history.length - 1].word;
    const usedWords = history.map((h) => h.word).join(', ');

    const prompt = `
私たちは日本語の「しりとり・連想バトル」を行っています。
現在のルール・テーマ: ${THEMES.find((t) => t.id === theme)?.label}
これまでの単語リスト: [${usedWords}]
直前の単語: "${prevWord}"
プレイヤーの入力単語: "${playerWord}"

あなたの役割:
1. プレイヤーの単語が有効（直前の単語の最後の文字から始まっているか、テーマに沿っているか、「ん」で終わっていないか、既出でないか）を判定してください。
2. もしプレイヤーの単語が無効または「ん」で終わっていたら、プレイヤーの負けと判定してください。
3. 有効な場合、プレイヤーの単語に続くあなた（Gemini）の単語を1つ返し、気の利いた短いコメント（30文字以内）を添えてください。
4. あなた自身が単語を思いつかない、または降参する場合はあなたの負けと判定してください。

必ず以下のJSONフォーマットのみで返答してください（Markdownコードブロックは不要）:
{
  "isValid": true または false,
  "invalidReason": "無効な場合の理由（有効なら空文字）",
  "isGameOver": true または false,
  "winner": "player" または "gemini" または null,
  "geminiWord": "Geminiの返す単語（ゲームオーバーなら空文字）",
  "comment": "Geminiの短いコメントやツッコミ"
}
`;

    try {
      const resText = await generateGameContent({
        prompt,
        systemInstruction: 'JSONのみを出力する厳格なゲームジャッジAIです。余計な文字列を含めずJSONだけを返してください。',
      });
      const cleanJson = resText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanJson);

      if (!result.isValid) {
        setErrorMsg(result.invalidReason || '無効な単語です。もう一度入力してください。');
        setLoading(false);
        return;
      }

      const updatedHistory: ChainItem[] = [
        ...history,
        { sender: 'player', word: playerWord },
      ];

      if (result.geminiWord) {
        updatedHistory.push({
          sender: 'gemini',
          word: result.geminiWord,
          comment: result.comment,
        });
      }

      setHistory(updatedHistory);

      if (result.isGameOver) {
        setGameOver(true);
        if (result.winner === 'player') {
          setErrorMsg('🎉 おめでとうございます！あなたの勝利です！');
        } else {
          setErrorMsg('Geminiの勝利！「ん」がついたかルール違反となりました。');
        }
      }
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMsg('APIキーが設定されていません。');
      } else {
        setErrorMsg('応答の取得に失敗しました。');
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
            <Swords className="w-4 h-4" />
            AI しりとり＆連想バトル
          </div>
          <h2 className="text-2xl font-bold text-white">Word Chain Battle</h2>
          <p className="text-sm text-slate-400 mt-1">
            Geminiと交互に単語を繋ごう！テーマ縛りで難易度アップ。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              resetGame();
            }}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            onClick={resetGame}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            リセット
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            errorMsg.includes('おめでとう')
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
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

      {/* バトルタイムライン */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[360px] max-h-[500px] overflow-y-auto space-y-4">
        {history.map((item, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${item.sender === 'player' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-slate-400">
                {item.sender === 'player' ? 'あなた' : 'Gemini AI'}
              </span>
              {item.sender === 'gemini' && <Sparkles className="w-3 h-3 text-indigo-400" />}
            </div>
            <div
              className={`px-4 py-2.5 rounded-2xl max-w-md text-sm font-medium ${
                item.sender === 'player'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
              }`}
            >
              <div className="text-base font-bold">{item.word}</div>
              {item.comment && (
                <div className="text-xs opacity-80 mt-1 pt-1 border-t border-slate-700/60 font-normal">
                  {item.comment}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            Geminiが次の単語を思考中...
          </div>
        )}
      </div>

      {/* 入力欄 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputWord}
          onChange={(e) => setInputWord(e.target.value)}
          placeholder={gameOver ? 'ゲーム終了です。リセットしてください' : '単語を入力してしりとり (例: りんご)'}
          disabled={loading || gameOver}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={loading || !inputWord.trim() || gameOver}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          送信
        </button>
      </form>
    </div>
  );
};
