import React, { useState, useEffect } from 'react';
import { Key, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from '../lib/gemini';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setStoredApiKey(apiKey);
    } else {
      clearStoredApiKey();
    }
    setSaved(true);
    setTimeout(() => {
      onKeySaved();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearStoredApiKey();
    setApiKey('');
    onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Gemini API 設定</h2>
            <p className="text-xs text-slate-400">Google Gemini APIキーを設定してプレイ</p>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            APIキーはお使いのブラウザ（LocalStorage）にのみ安全に保存され、GoogleのAPIエンドポイントへの通信にのみ直接使用されます。
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              API キー
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition underline underline-offset-2"
            >
              Google AI Studioでキーを取得
              <ExternalLink className="w-3 h-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-400 hover:text-rose-300 transition"
              >
                キーを削除
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  保存完了
                </>
              ) : (
                '保存する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
