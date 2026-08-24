import React from 'react';
import { GameInfo } from '../types';
import { Search, Sparkles, Swords, BookOpen, ArrowRight } from 'lucide-react';

interface GameCardProps {
  game: GameInfo;
  onSelect: (id: GameInfo['id']) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'detective':
        return <Search className="w-6 h-6" />;
      case 'wordchain':
        return <Swords className="w-6 h-6" />;
      case 'adventure':
        return <BookOpen className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(game.id)}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${game.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform duration-500`} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-slate-800 border border-slate-700/60 text-white shadow-inner group-hover:scale-105 transition-transform`}>
            {getIcon(game.iconName)}
          </div>
          <span className="text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {game.badge}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
          {game.title}
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-3">{game.titleEn}</p>
        <p className="text-sm text-slate-300 leading-relaxed">{game.description}</p>
      </div>

      <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
        <span>ゲームを開始する</span>
        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
