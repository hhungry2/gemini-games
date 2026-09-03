import React from 'react';
import { GameInfo, GameId } from '../types';
import {
  LayoutGrid,
  ArrowRight,
  Sparkles,
  Trophy,
  Crosshair,
  Gamepad2,
  Layers,
  Bomb,
  Grid2X2,
  CircleDot,
  TableProperties,
  SquareDashedKanban,
  Crown,
  Target,
} from 'lucide-react';

export interface RecordItem {
  label: string;
  value: string;
}

interface GameCardProps {
  game: GameInfo;
  onSelect: (id: GameId) => void;
  isDark: boolean;
  records?: RecordItem[];
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isDark,
  records = [],
}) => {
  const getGameIcon = () => {
    switch (game.id) {
      case 'angrybirds':
        return <Target className="w-6 h-6 text-white" />;
      case 'shooter':
        return <Crosshair className="w-6 h-6 text-white" />;
      case 'bros':
        return <Gamepad2 className="w-6 h-6 text-white" />;
      case 'tetris':
        return <Layers className="w-6 h-6 text-white" />;
      case 'minesweeper':
        return <Bomb className="w-6 h-6 text-white" />;
      case 'breakout':
        return <SquareDashedKanban className="w-6 h-6 text-white" />;
      case 'game2048':
        return <Grid2X2 className="w-6 h-6 text-white" />;
      case 'doteater':
        return <CircleDot className="w-6 h-6 text-white" />;
      case 'pong':
        return <TableProperties className="w-6 h-6 text-white" />;
      case 'paperio':
        return <Crown className="w-6 h-6 text-white" />;
      default:
        return <LayoutGrid className="w-6 h-6 text-white" />;
    }
  };

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
            {getGameIcon()}
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

        {/* ハイスコア・ベスト記録表示領域 */}
        {records && records.length > 0 && (
          <div
            className={`mt-4 p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 transition-colors ${
              isDark
                ? 'bg-slate-950/70 border-slate-800'
                : 'bg-slate-50 border-slate-200/90'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <Trophy className="w-3.5 h-3.5" />
              <span>RECORD</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono font-bold">
              {records.map((r, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {r.label && (
                    <span
                      className={`text-[10px] font-sans font-medium px-1.5 py-0.5 rounded ${
                        isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {r.label}
                    </span>
                  )}
                  <span className="text-amber-500">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
