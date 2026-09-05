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
  Flame,
  Bike,
  Aperture,
  Gem,
  Heart,
  Swords,
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
      case 'bomberman':
        return <Flame className="w-6 h-6 text-white" />;
      case 'excitebike':
        return <Bike className="w-6 h-6 text-white" />;
      case 'holeio':
        return <Aperture className="w-6 h-6 text-white" />;
      case 'jewel':
        return <Gem className="w-6 h-6 text-white" />;
      case 'chiikawa':
        return <Heart className="w-6 h-6 text-white fill-white" />;
      case 'spire':
        return <Swords className="w-6 h-6 text-white" />;
      case 'cookie':
        return (
          <svg className="w-6 h-6 text-amber-100" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.07-.17-2.1-.48-3.07a3.5 3.5 0 0 1-4.45-4.45C16.1 4.17 15.07 4 14 4a2 2 0 0 1-2-2zm-3.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-4 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5.5 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-6 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
          </svg>
        );
      case 'suika':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            {/* スイカスライスSVG */}
            <path
              d="M12 3C7.03 3 3 7.03 3 12c0 2.24.82 4.29 2.18 5.86L17.86 5.18C16.29 3.82 14.24 3 12 3z"
              fill="#22c55e"
            />
            <path
              d="M12 5c-3.87 0-7 3.13-7 7 0 1.76.65 3.37 1.73 4.61L16.61 6.73C15.37 5.65 13.76 5 12 5z"
              fill="#ef4444"
            />
            {/* 種 */}
            <circle cx="9" cy="9" r="0.8" fill="#1e293b" />
            <circle cx="11.5" cy="11.5" r="0.8" fill="#1e293b" />
            <circle cx="8" cy="12" r="0.8" fill="#1e293b" />
            <circle cx="12" cy="8" r="0.8" fill="#1e293b" />
            {/* 皮のふち */}
            <path
              d="M3 12a9 9 0 0 0 2.18 5.86l12.68-12.68A9 9 0 0 0 12 3"
              stroke="#15803d"
              strokeWidth="1.5"
            />
          </svg>
        );
      case 'wario':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            {/* ワリオの鼻 & ギザギザヒゲ & 爆弾 */}
            {/* ピンクの丸い鼻 */}
            <circle cx="12" cy="9" r="4.5" fill="#f43f5e" />
            {/* ギザギザ黒ヒゲ */}
            <path
              d="M4 14l3-2 3 3 2-2 2 2 3-3 3 2-1 4-4-1-1 2-1-2-4 1z"
              fill="#1e293b"
            />
            {/* 上部のボム導火線 */}
            <path d="M12 4.5V2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="1.5" r="1.5" fill="#ef4444" />
          </svg>
        );
      case 'sonic':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* ソニックの青いトゲトゲヘッド & ゴールドリング */}
            <path
              d="M12 3C8 3 4.5 5.5 3.5 9c-1 3.5.5 7 2 9.5l-3.5 1.5 5 1c3.5 2 8 1 10.5-1.5 2-2 3-5 2.5-8-.5-3-3.5-6.5-6-7.5l2-1.5-4.5.5z"
              fill="#2563eb"
            />
            {/* トゲのディテール */}
            <path
              d="M4 11l-3 3 4 1M6 6.5l-4 1.5 4 2"
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 目・耳 */}
            <circle cx="14" cy="10" r="3.5" fill="#ffffff" />
            <circle cx="15.5" cy="10" r="1.5" fill="#0f172a" />
            <circle cx="16" cy="9.5" r="0.5" fill="#ffffff" />
            {/* 輝くゴールドリング */}
            <ellipse
              cx="17"
              cy="16"
              rx="4.5"
              ry="2.5"
              stroke="#fbbf24"
              strokeWidth="2"
              fill="none"
              transform="rotate(-20 17 16)"
            />
            {/* スピードスパーク */}
            <path
              d="M19 5l1.5 2.5 2.5.5-2 1.5.5 2.5-2.5-1.5L16.5 12l.5-2.5-2-1.5 2.5-.5z"
              fill="#fef08a"
              transform="scale(0.4) translate(22, 0)"
            />
          </svg>
        );
      case 'zoo':
        return <span className="text-2xl leading-none select-none">🐼</span>;
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
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <span
              className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                game.genre === 'action'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : game.genre === 'puzzle'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : game.genre === 'io'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : game.genre === 'racing'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {game.genre === 'action'
                ? '⚡ アクション'
                : game.genre === 'puzzle'
                ? '🧩 パズル'
                : game.genre === 'io'
                ? '🌐 .io'
                : game.genre === 'racing'
                ? '🏁 レース'
                : '🕹️ アーケード'}
            </span>
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
