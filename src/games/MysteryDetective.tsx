import React, { useState } from 'react';
import { generateGameContent } from '../lib/gemini';
import { Search, Send, User, Award, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

interface Suspect {
  id: string;
  name: string;
  role: string;
  personality: string;
}

interface Case {
  title: string;
  scenario: string;
  suspects: Suspect[];
  victim: string;
  culprit: string;
  trickSummary: string;
}

export const MysteryDetective: React.FC<{ onOpenKeyModal: () => void }> = ({ onOpenKeyModal }) => {
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);
  const [question, setQuestion] = useState('');
  const [logs, setLogs] = useState<{ suspectName: string; question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingCase, setGeneratingCase] = useState(false);
  const [accuseMode, setAccuseMode] = useState(false);
  const [accuseResult, setAccuseResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startNewCase = async () => {
    setGeneratingCase(true);
    setErrorMsg(null);
    setLogs([]);
    setCurrentCase(null);
    setSelectedSuspect(null);
    setAccuseMode(false);
    setAccuseResult(null);

    const prompt = `
あなたは本格ミステリー作家兼ゲームマスターです。探偵ゲーム用の新しい短編事件を1件作成してください。
必ず以下のJSON形式のみで出力してください（Markdownのコードブロックを含めないでください）:

{
  "title": "事件のタイトル",
  "victim": "被害者の名前と状況",
  "scenario": "事件のあらましと現場の状況（150字程度）",
  "suspects": [
    {"id": "1", "name": "容疑者Aの名前", "role": "役職・関係", "personality": "性格や口調の特徴"},
    {"id": "2", "name": "容疑者Bの名前", "role": "役職・関係", "personality": "性格や口調の特徴"},
    {"id": "3", "name": "容疑者Cの名前", "role": "役職・関係", "personality": "性格や口調の特徴"}
  ],
  "culprit": "真犯人の容疑者名（容疑者A/B/Cのいずれか）",
  "trickSummary": "犯行のトリックと動機、および証言の中に隠された矛盾"
}
`;

    try {
      const resText = await generateGameContent({
        prompt,
        systemInstruction: 'JSONフォーマットのみを出力する厳格なゲームマスターAIです。余計な前置きやマークダウン記法(```jsonなど)は出力しないでください。',
      });
      const cleanJson = resText.replace(/```json|```/g, '').trim();
      const parsed: Case = JSON.parse(cleanJson);
      setCurrentCase(parsed);
      setSelectedSuspect(parsed.suspects[0]);
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMsg('APIキーが設定されていません。ヘッダーの「APIキーを設定」から登録してください。');
      } else {
        setErrorMsg('事件の生成に失敗しました。もう一度お試しください。');
      }
    } finally {
      setGeneratingCase(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedSuspect || !currentCase || loading) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setLoading(true);
    setErrorMsg(null);

    const isCulprit = selectedSuspect.name === currentCase.culprit;
    const prompt = `
事件情報:
- タイトル: ${currentCase.title}
- 概要: ${currentCase.scenario}
- 真犯人: ${currentCase.culprit}
- トリック・真相: ${currentCase.trickSummary}

あなたは容疑者の「${selectedSuspect.name}（${selectedSuspect.role}）」です。
性格・口調: ${selectedSuspect.personality}
${isCulprit ? 'あなたは【真犯人】です。自分が犯人だとバレないように嘘やごまかしを交えて証言してください。ただし、巧みな質問にはわずかな矛盾や動揺が漏れる可能性があります。' : 'あなたは【無実】です。正直に自分の知っている事実やアリバイを答えてください。'}

探偵からの質問: 「${currentQuestion}」

容疑者として、なりきって返答してください（100〜200文字程度）。
`;

    try {
      const answer = await generateGameContent({
        prompt,
        systemInstruction: `あなたはミステリーの登場人物「${selectedSuspect.name}」です。メタ的な発言はせず、完全にその人物として探偵に答えてください。`,
      });

      setLogs((prev) => [
        ...prev,
        {
          suspectName: selectedSuspect.name,
          question: currentQuestion,
          answer,
        },
      ]);
    } catch (err: any) {
      if (err.message === 'API_KEY_MISSING') {
        setErrorMsg('APIキーが設定されていません。');
      } else {
        setErrorMsg('証言の取得に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccuse = async (suspectName: string) => {
    if (!currentCase) return;
    setLoading(true);

    const isCorrect = suspectName === currentCase.culprit;
    const prompt = `
事件「${currentCase.title}」において、探偵が「${suspectName}」を犯人として告発しました。
真犯人: ${currentCase.culprit}
真相・トリック: ${currentCase.trickSummary}
判定結果: ${isCorrect ? '【正解】' : '【不正解】'}

探偵への評価と、事件の完全な真相解決編（ドラマチックな解明シーン）を300〜400文字程度で語ってください。
`;

    try {
      const resultText = await generateGameContent({ prompt });
      setAccuseResult(resultText);
    } catch (err) {
      setErrorMsg('判定の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1 font-semibold text-sm">
            <Search className="w-4 h-4" />
            AI 推理探偵ゲーム
          </div>
          <h2 className="text-2xl font-bold text-white">AI Mystery Detective</h2>
          <p className="text-sm text-slate-400 mt-1">
            容疑者たちに事情聴取し、矛盾を暴いて真犯人を特定しよう！
          </p>
        </div>

        <button
          onClick={startNewCase}
          disabled={generatingCase}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition flex items-center gap-2"
        >
          {generatingCase ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              事件を生成中...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              {currentCase ? '別の事件を調査' : '事件ファイルを開く'}
            </>
          )}
        </button>
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

      {!currentCase && !generatingCase && (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-4">まだ捜査が始まっていません</p>
          <button
            onClick={startNewCase}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition"
          >
            事件を開始する
          </button>
        </div>
      )}

      {currentCase && (
        <div className="space-y-6">
          {/* 事件概要 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full border border-rose-400/20">
                FILE: {currentCase.title}
              </span>
              <span className="text-xs text-slate-400">被害者: {currentCase.victim}</span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{currentCase.scenario}</p>
          </div>

          {/* 告発モーダル/表示 */}
          {accuseResult ? (
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Award className="w-6 h-6" />
                <span className="text-lg">事件解決・真相発表</span>
              </div>
              <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {accuseResult}
              </div>
              <button
                onClick={startNewCase}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
              >
                次の事件へ挑む
              </button>
            </div>
          ) : accuseMode ? (
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-rose-400">真犯人を告発する</h3>
              <p className="text-xs text-slate-400">
                あなたが真犯人だと思う容疑者を選択してください。真相が明らかになります。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentCase.suspects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAccuse(s.name)}
                    disabled={loading}
                    className="p-4 bg-slate-800 hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500/60 rounded-xl text-left transition group"
                  >
                    <div className="font-bold text-white group-hover:text-rose-300">{s.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{s.role}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setAccuseMode(false)}
                className="text-xs text-slate-400 hover:text-slate-200 underline mt-2"
              >
                捜査に戻る
              </button>
            </div>
          ) : (
            <>
              {/* 容疑者タブ */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">事情聴取する対象を選択</span>
                  <button
                    onClick={() => setAccuseMode(true)}
                    className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    犯人を告発する！
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {currentCase.suspects.map((s) => {
                    const isSelected = selectedSuspect?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSuspect(s)}
                        className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 聴取ログ */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-h-96 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  捜査手帳 / 聴取記録 ({logs.length}件)
                </div>

                {logs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    容疑者に質問をして手がかりを集めましょう。
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="space-y-2 text-sm border-b border-slate-800 pb-3 last:border-b-0">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-indigo-400 text-xs shrink-0">探偵:</span>
                        <span className="text-slate-300 text-xs">{log.question}</span>
                      </div>
                      <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="font-semibold text-emerald-400 text-xs shrink-0">
                          {log.suspectName}:
                        </span>
                        <span className="text-slate-200 text-xs leading-relaxed">{log.answer}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 質問入力 */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={`【${selectedSuspect?.name}】に質問を入力 (例: 事件当時のアリバイは？ 被害者との関係は？)`}
                  disabled={loading}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition"
                />
                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  質問する
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};
