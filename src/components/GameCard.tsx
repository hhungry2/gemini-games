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
  Link2,
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
  onCopyLink?: (id: GameId) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  isDark,
  records = [],
  onCopyLink,
}) => {
  const getGameIcon = () => {
    switch (game.id) {
      case 'spindoctor':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* 回転軌跡の円弧 */}
            <circle cx="12" cy="12" r="8.5" stroke="#38bdf8" strokeDasharray="3 3" opacity="0.6" strokeWidth="1" />
            {/* 中心のピボットピン */}
            <circle cx="12" cy="12" r="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="1.2" fill="#ffffff" />
            {/* スピンするロッド（針） */}
            <line x1="12" y1="12" x2="19" y2="6" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            {/* フリー側のボール */}
            <circle cx="19" cy="6" r="3" fill="#ef4444" stroke="#fcd34d" strokeWidth="1.5" />
            {/* もう片方のピン（近くのドット） */}
            <circle cx="6" cy="17" r="2" fill="#10b981" stroke="#a7f3d0" strokeWidth="1" />
            <circle cx="18" cy="18" r="2" fill="#6366f1" stroke="#c7d2fe" strokeWidth="1" />
          </svg>
        );
      case 'gwgallery':
        return (
          <svg className="w-6 h-6 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* ゲーム＆ウォッチ携帯ゲーム機本体 */}
            <rect x="2" y="5" width="20" height="14" rx="2.5" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
            {/* 液晶画面 */}
            <rect x="7" y="7.5" width="10" height="9" rx="1" fill="#84cc16" stroke="#365314" strokeWidth="1" />
            {/* LCD上のMr.ゲーム＆ウォッチ風シルエット */}
            <circle cx="12" cy="10.5" r="1.2" fill="#14532d" />
            <line x1="12" y1="11.7" x2="12" y2="14" stroke="#14532d" strokeWidth="1" />
            <line x1="10.5" y1="12" x2="13.5" y2="12" stroke="#14532d" strokeWidth="0.8" />
            {/* 十字キー (左) */}
            <path d="M4 11h2M5 10v2" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
            {/* ボタン (右) */}
            <circle cx="19" cy="11" r="0.8" fill="#ef4444" />
            <circle cx="20" cy="13" r="0.8" fill="#ef4444" />
          </svg>
        );
      case 'digdug':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* シャベル＆ヘルメットアイコン */}
            <path d="M4 4l5 5m0 0l-3 3 5 5 3-3-5-5m0 0l5-5" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="5" fill="#ef4444" stroke="#dc2626" />
            <circle cx="15" cy="15" r="1.5" fill="#ffffff" />
          </svg>
        );
      case 'srw':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* メカヘッド・V字アンテナ・ツインアイ */}
            <path d="M12 2L9 8h6l-3-6z" fill="#f59e0b" stroke="#f59e0b" />
            <path d="M4 6l5 4h6l5-4-3 6v6l-5 4-5-4v-6L4 6z" fill="#2563eb" stroke="#93c5fd" />
            <circle cx="8.5" cy="13" r="1" fill="#38bdf8" />
            <circle cx="15.5" cy="13" r="1" fill="#38bdf8" />
            <path d="M10 16h4M12 16v2" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
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
      case 'shooting_cert':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* シューティング技能検定アイコン：照準＆戦闘機 */}
            <circle cx="12" cy="12" r="9" stroke="#f43f5e" strokeWidth="2" />
            <line x1="12" y1="3" x2="12" y2="7" stroke="#f43f5e" />
            <line x1="12" y1="17" x2="12" y2="21" stroke="#f43f5e" />
            <line x1="3" y1="12" x2="7" y2="12" stroke="#f43f5e" />
            <line x1="17" y1="12" x2="21" y2="12" stroke="#f43f5e" />
            <polygon points="12,8 15,16 12,14 9,16" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
          </svg>
        );
      case 'lofi':
        return (
          <svg className="w-6 h-6 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            <circle cx="12" cy="12" r="2" fill="#f59e0b" />
          </svg>
        );
      case 'countmasters':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Count Masters アイコン：リーダー(王冠付き青スティックマン)と群衆・増殖 */}
            {/* リーダー (中央) */}
            <circle cx="12" cy="7" r="3" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M12 10v6M9 13l3-1 3 1M10 20l2-4 2 4" stroke="#60a5fa" strokeWidth="2" />
            {/* 王冠 */}
            <path d="M10 4l1 1.5 1-1.5 1 1.5 1-1.5v1.5h-4z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
            {/* 左の仲間 */}
            <circle cx="5" cy="10" r="2.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
            <path d="M5 12.2v4.5M3 14l2-0.8 2 0.8M3.5 19.5l1.5-2.8 1.5 2.8" stroke="#38bdf8" strokeWidth="1.5" />
            {/* 右の仲間 */}
            <circle cx="19" cy="10" r="2.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
            <path d="M19 12.2v4.5M17 14l2-0.8 2 0.8M17.5 19.5l1.5-2.8 1.5 2.8" stroke="#38bdf8" strokeWidth="1.5" />
          </svg>
        );
      case 'agario':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* Agar.io アイコン：大きなメイン細胞、分裂細胞、エサ、トゲ */}
            {/* 周囲のエサ(Pellets) */}
            <circle cx="4" cy="6" r="1.5" fill="#f43f5e" />
            <circle cx="20" cy="5" r="1.2" fill="#eab308" />
            <circle cx="21" cy="18" r="1.5" fill="#06b6d4" />
            <circle cx="5" cy="19" r="1.2" fill="#a855f7" />
            {/* トゲ細胞 (Virus) */}
            <path
              d="M18 10l1.2-.5.3 1.2 1.2.2-.4 1.1 1 1-1.2.5-.2 1.3-1.1-.4-1 1-.5-1.2-1.3-.2.4-1.1-1-1 1.2-.5.2-1.3z"
              fill="#22c55e"
              stroke="#15803d"
              strokeWidth="0.5"
            />
            {/* 分裂した小細胞 */}
            <circle cx="7" cy="14" r="3.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
            <circle cx="6.2" cy="13.2" r="0.8" fill="#ffffff" />
            <circle cx="6.4" cy="13.2" r="0.4" fill="#0f172a" />
            {/* メイン巨大細胞 */}
            <circle cx="12.5" cy="9.5" r="6.5" fill="#ec4899" stroke="#be185d" strokeWidth="1" />
            {/* 瞳 (キョロキョロした目) */}
            <circle cx="10.8" cy="8.2" r="1.6" fill="#ffffff" />
            <circle cx="11.2" cy="8.2" r="0.8" fill="#0f172a" />
            <circle cx="14.8" cy="8.2" r="1.6" fill="#ffffff" />
            <circle cx="15.2" cy="8.2" r="0.8" fill="#0f172a" />
          </svg>
        );
      case 'mariokart':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* マリオカートアイコン：レーシングカート・赤いマリオキャップ・チェッカー */}
            {/* タイヤ (前輪 & 後輪) */}
            <rect x="2" y="14" width="4" height="6" rx="1.5" fill="#1e293b" />
            <rect x="18" y="14" width="4" height="6" rx="1.5" fill="#1e293b" />
            <rect x="4" y="8" width="3" height="4" rx="1" fill="#334155" />
            <rect x="17" y="8" width="3" height="4" rx="1" fill="#334155" />
            {/* カートシャーシ */}
            <path d="M5 13h14l-2 5H7l-2-5z" fill="#e11d48" />
            <rect x="8" y="16" width="8" height="2" rx="1" fill="#fbbf24" />
            {/* マリオキャップ・ドライバー */}
            <circle cx="12" cy="9" r="3.5" fill="#e11d48" />
            <ellipse cx="12" cy="11.5" rx="3.2" ry="1.2" fill="#be123c" />
            <rect x="10" y="12" width="4" height="3" rx="1" fill="#3b82f6" />
            {/* チェッカーフラッグの風 */}
            <path d="M17 3l3 2-3 2v-4z" fill="#ffffff" stroke="#facc15" strokeWidth="0.8" />
          </svg>
        );
      case 'circus':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* サーカスチャーリーアイコン：サーカステント＆火の輪＆星 */}
            <path d="M12 2L4 9h16L12 2z" fill="#ef4444" />
            <path d="M12 2L8 9h8L12 2z" fill="#facc15" />
            <path d="M4 9v9h16V9H4z" fill="#3b82f6" />
            <path d="M7 9v9M12 9v9M17 9v9" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M10 18a2 2 0 0 1 4 0" fill="#facc15" />
            <ellipse cx="18" cy="6" rx="3.5" ry="5.5" stroke="#f97316" strokeWidth="1.5" />
            <ellipse cx="18" cy="6" rx="2.5" ry="4" stroke="#facc15" strokeWidth="1" />
          </svg>
        );
      case 'othellonia':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* オセロニアアイコン：金・紫・赤の属性シンボルとリッチなオセロ石 */}
            <circle cx="12" cy="12" r="9" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="#f59e0b" />
            <path d="M12 3a9 9 0 0 0 0 18z" fill="#7c3aed" />
            <path d="M12 7l1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5z" fill="#ffffff" />
            <circle cx="12" cy="12" r="1.5" fill="#ef4444" />
          </svg>
        );
      case 'antarctic':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
            {/* けっきょく南極大冒険：ペンギン（ペン太）アイコン */}
            {/* ペンギンの体 */}
            <ellipse cx="12" cy="13" rx="7" ry="8" fill="#1e293b" />
            {/* 白いお腹 */}
            <ellipse cx="12" cy="14" rx="4.5" ry="6" fill="#f8fafc" />
            {/* 頭部 */}
            <circle cx="12" cy="7.5" r="4.5" fill="#1e293b" />
            {/* 目 */}
            <circle cx="10" cy="7" r="1" fill="#ffffff" />
            <circle cx="10.3" cy="7" r="0.5" fill="#0f172a" />
            <circle cx="14" cy="7" r="1" fill="#ffffff" />
            <circle cx="13.7" cy="7" r="0.5" fill="#0f172a" />
            {/* くちばし */}
            <polygon points="12,7.5 10.5,9.5 13.5,9.5" fill="#f59e0b" />
            {/* 翼・フリッパー */}
            <ellipse cx="5.5" cy="13" rx="1.5" ry="3.5" transform="rotate(-20 5.5 13)" fill="#0f172a" />
            <ellipse cx="18.5" cy="13" rx="1.5" ry="3.5" transform="rotate(20 18.5 13)" fill="#0f172a" />
            {/* 足（オレンジ） */}
            <ellipse cx="9.5" cy="21" rx="2" ry="1.2" fill="#f97316" />
            <ellipse cx="14.5" cy="21" rx="2" ry="1.2" fill="#f97316" />
            {/* 小さな氷山・雪の結晶アクセント */}
            <path d="M19 4l1.5 2h-3z" fill="#38bdf8" />
          </svg>
        );
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
        className={`pt-5 mt-5 border-t flex items-center justify-between text-xs font-bold transition-colors ${
          isDark
            ? 'border-slate-800/80 text-indigo-400'
            : 'border-slate-100 text-indigo-600'
        }`}
      >
        <div className="flex items-center gap-1.5 group-hover:text-indigo-400 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>今すぐプレイ</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
        </div>

        {onCopyLink && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(game.id);
            }}
            className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-[11px] font-medium cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="直接アクセス用URLをコピー"
            aria-label="URLコピー"
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px]">URLコピー</span>
          </button>
        )}
      </div>
    </div>
  );
};
