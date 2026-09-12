import React from 'react';
import { OthelloniaPiece } from './types';
import { PieceAvatar } from './PieceAvatar';
import { X, Sparkles, Heart, Zap, Shield, Crown } from 'lucide-react';

interface PieceDetailModalProps {
  piece: OthelloniaPiece | null;
  onClose: () => void;
  actionButton?: React.ReactNode;
}

export const PieceDetailModal: React.FC<PieceDetailModalProps> = ({
  piece,
  onClose,
  actionButton,
}) => {
  if (!piece) return null;

  const attrBadge = {
    god: { label: '神属性 (God)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    demon: { label: '魔属性 (Demon)', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    dragon: { label: '竜属性 (Dragon)', bg: 'bg-red-500/20 text-red-300 border-red-500/40' },
  }[piece.attribute];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl p-5 overflow-hidden text-white">
        {/* 背景の装飾グロー */}
        <div
          className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25 ${
            piece.attribute === 'god'
              ? 'bg-amber-400'
              : piece.attribute === 'demon'
              ? 'bg-purple-600'
              : 'bg-red-600'
          }`}
        />

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー情報 */}
        <div className="flex items-center gap-4 mb-4">
          <PieceAvatar avatarSvg={piece.avatarSvg} attribute={piece.attribute} rarity={piece.rarity} size="lg" />
          <div className="flex-1">
            <div className="text-xs text-slate-400 font-medium tracking-wide">{piece.title}</div>
            <div className="text-xl font-black text-white">{piece.name}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${attrBadge.bg}`}>
                {attrBadge.label}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-800 border border-slate-700 text-amber-300">
                ★ {piece.rarity}
              </span>
            </div>
          </div>
        </div>

        {/* ステータスバー */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">HP</div>
              <div className="text-base font-black text-rose-300">{piece.hp.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">ATK</div>
              <div className="text-base font-black text-amber-300">{piece.atk.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* スキル情報 */}
        <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
          {/* リーダースキル */}
          {piece.leaderSkill && (
            <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>リーダースキル: {piece.leaderSkill.name}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{piece.leaderSkill.description}</p>
            </div>
          )}

          {/* スキル */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-sky-400">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>スキル: {piece.skill.name}</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {piece.skill.effectType}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{piece.skill.description}</p>
          </div>

          {/* コンボスキル */}
          {piece.comboSkill && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>コンボ: {piece.comboSkill.name}</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  {piece.comboSkill.effectType}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{piece.comboSkill.description}</p>
            </div>
          )}

          {/* フレーバーテキスト */}
          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs italic text-slate-300">
            {piece.flavorText}
          </div>
        </div>

        {/* アクションボタン */}
        {actionButton && <div className="mt-2">{actionButton}</div>}
      </div>
    </div>
  );
};
