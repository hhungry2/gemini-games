import React from 'react';
import { Gamepad2, Key, Sparkles, Home } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  activeGame: string | null;
  onGoHome: () => void;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenApiKeyModal,
  activeGame,
  onGoHome,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 text-white">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
                Gemini Games
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                Hub
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeGame && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
            >
              <Home className="w-3.5 h-3.5" />
              ゲーム一覧
            </button>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              hasApiKey
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30 animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{hasApiKey ? 'APIキー設定済' : 'APIキーを設定'}</span>
            {!hasApiKey && <Sparkles className="w-3 h-3 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
