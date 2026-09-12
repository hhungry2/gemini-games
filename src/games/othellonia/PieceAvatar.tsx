import React from 'react';
import { ElementAttribute, PieceRarity } from './types';

interface PieceAvatarProps {
  avatarSvg: string;
  attribute: ElementAttribute;
  rarity?: PieceRarity;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PieceAvatar: React.FC<PieceAvatarProps> = ({
  avatarSvg,
  attribute,
  rarity,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  }[size];

  // 属性カラー
  const attrBg = {
    god: 'from-amber-400 via-yellow-200 to-amber-500 border-amber-300 text-amber-950',
    demon: 'from-purple-900 via-indigo-800 to-slate-900 border-purple-400 text-purple-100',
    dragon: 'from-red-600 via-crimson-600 to-amber-600 border-red-400 text-amber-100',
  }[attribute];

  // レアリティバッジ色
  const rarityBadge = rarity ? (
    <span
      className={`absolute -top-1 -right-1 px-1 text-[9px] font-black rounded-full border shadow-sm ${
        rarity === 'S+'
          ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-white border-yellow-200'
          : rarity === 'S'
          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-200'
          : 'bg-gradient-to-r from-slate-600 to-slate-800 text-slate-200 border-slate-400'
      }`}
    >
      {rarity}
    </span>
  ) : null;

  // 属性シンボル
  const attrIcon = {
    god: '⚡',
    demon: '🔮',
    dragon: '🔥',
  }[attribute];

  // キャラごとの簡易ベクター/絵文字アイコン
  const renderIconContent = () => {
    switch (avatarSvg) {
      case 'michael':
        return <span className="drop-shadow">👼⚔️</span>;
      case 'athena':
        return <span className="drop-shadow">🛡️✨</span>;
      case 'messiah':
        return <span className="drop-shadow">🕊️🤍</span>;
      case 'valkyrie':
        return <span className="drop-shadow">🗡️🪽</span>;
      case 'raphael':
        return <span className="drop-shadow">🌿💚</span>;
      case 'seraphim':
        return <span className="drop-shadow">👑☀️</span>;
      case 'thor':
        return <span className="drop-shadow">⚡🔨</span>;
      case 'uriel':
        return <span className="drop-shadow">⚖️🔥</span>;
      case 'pegasus':
        return <span className="drop-shadow">🦄🪽</span>;
      case 'ra':
        return <span className="drop-shadow">☀️🦅</span>;
      case 'hades':
        return <span className="drop-shadow">👑💀</span>;
      case 'lilith':
        return <span className="drop-shadow">🥀🦇</span>;
      case 'clown':
        return <span className="drop-shadow">🎭🎪</span>;
      case 'reaper':
        return <span className="drop-shadow">⛓️‍💥☠️</span>;
      case 'succubus':
        return <span className="drop-shadow">💋💜</span>;
      case 'paracelsus':
        return <span className="drop-shadow">🧪🧪</span>;
      case 'astaroth':
        return <span className="drop-shadow">👁️🔱</span>;
      case 'belfegor':
        return <span className="drop-shadow">💤🪞</span>;
      case 'fefnir':
        return <span className="drop-shadow">🐉💎</span>;
      case 'jack':
        return <span className="drop-shadow">🎃🍭</span>;
      case 'bahamut':
        return <span className="drop-shadow">🐲🌌</span>;
      case 'liorex':
        return <span className="drop-shadow">🔥🐉</span>;
      case 'siegfried':
        return <span className="drop-shadow">🗡️🛡️</span>;
      case 'volganos':
        return <span className="drop-shadow">⚡🐲</span>;
      case 'leviathan':
        return <span className="drop-shadow">🌊🐉</span>;
      case 'alduin':
        return <span className="drop-shadow">👑🐉</span>;
      case 'salamander':
        return <span className="drop-shadow">🦎🔥</span>;
      case 'lindwurm':
        return <span className="drop-shadow">🌪️🐉</span>;
      case 'brachios':
        return <span className="drop-shadow">🪨🦕</span>;
      case 'babydragon':
        return <span className="drop-shadow">🥚🐲</span>;
      default:
        return <span>{attrIcon}</span>;
    }
  };

  return (
    <div
      className={`relative rounded-full border-2 bg-gradient-to-br flex items-center justify-center select-none shadow-md font-bold ${attrBg} ${sizeClasses} ${className}`}
    >
      {renderIconContent()}
      {rarityBadge}
    </div>
  );
};
