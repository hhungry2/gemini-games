import React from 'react';
import { GameInfo, GameId } from '../types';
import { LayoutGrid, ArrowRight, Sparkles } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
  onSelect: (id: GameId) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(game.id)}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/15 flex flex-col justify-between overflow-hidden"
    >
      <div
        className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl ${game.color} opacity-15 rounded-bl-full group-hover:scale-110 transition-transform duration-500`}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/60 text-white shadow-inner group-hover:scale-105 transition-transform">
            <LayoutGrid className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="text-[11px] font-bold tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            {game.badge}
          </span>
        </div>

        <h3 className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors mb-1">
          {game.title}
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-3">{game.titleEn}</p>
        <p className="text-sm text-slate-300 leading-relaxed">{game.description}</p>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {game.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-800"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          今すぐプレイ
        </span>
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
      </div>
    </div>
  );
};
