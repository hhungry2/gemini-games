import React from 'react';
import { GameInfo, GameId } from '../types';
import { LayoutGrid, ArrowRight, Sparkles } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
  onSelect: (id: GameId) => void;
  isDark: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect, isDark }) => {
  return (
    <div
      onClick={() => onSelect(game.id)}
      className={`group relative rounded-3xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden border ${
        isDark
          ? 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/15 text-slate-100'
          : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 text-slate-800 shadow-sm'
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${game.color} ${
          isDark ? 'opacity-15' : 'opacity-10'
        } rounded-bl-full group-hover:scale-110 transition-transform duration-500`}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3.5 rounded-2xl border text-white shadow-inner group-hover:scale-105 transition-transform ${
              isDark
                ? 'bg-slate-800/90 border-slate-700/60'
                : 'bg-indigo-600 border-indigo-500 shadow-indigo-600/30'
            }`}
          >
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <span
            className={`text-[11px] font-bold tracking-wider px-3 py-1 rounded-full border ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
            }`}
          >
            {game.badge}
          </span>
        </div>

        <h3
          className={`text-2xl font-black transition-colors mb-1 ${
            isDark
              ? 'text-white group-hover:text-indigo-300'
              : 'text-slate-900 group-hover:text-indigo-600'
          }`}
        >
          {game.title}
        </h3>
        <p
          className={`text-xs font-mono mb-3 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {game.titleEn}
        </p>
        <p
          className={`text-sm leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {game.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {game.tags.map((tag, idx) => (
            <span
              key={idx}
              className={`text-[10px] font-medium px-2.5 py-0.5 rounded-md border ${
                isDark
                  ? 'bg-slate-800/60 text-slate-400 border-slate-800'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`pt-6 mt-6 border-t flex items-center justify-between text-xs font-bold transition-colors ${
          isDark
            ? 'border-slate-800/80 text-indigo-400 group-hover:text-indigo-300'
            : 'border-slate-100 text-indigo-600 group-hover:text-indigo-700'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          今すぐプレイ
        </span>
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
      </div>
    </div>
  );
};
