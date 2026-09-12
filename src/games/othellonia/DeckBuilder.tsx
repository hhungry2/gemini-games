import React, { useState } from 'react';
import { OthelloniaPiece, ElementAttribute } from './types';
import { ALL_PIECES, PRESET_DECKS, PIECES_MAP } from './piecesData';
import { PieceAvatar } from './PieceAvatar';
import { PieceDetailModal } from './PieceDetailModal';
import { Crown, Heart, Zap, Sparkles, Filter, Check, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface DeckBuilderProps {
  currentDeck: OthelloniaPiece[];
  currentLeader: OthelloniaPiece;
  onSaveDeck: (deck: OthelloniaPiece[], leader: OthelloniaPiece) => void;
  onBack: () => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  currentDeck,
  currentLeader,
  onSaveDeck,
  onBack,
}) => {
  const [deck, setDeck] = useState<OthelloniaPiece[]>(currentDeck);
  const [leader, setLeader] = useState<OthelloniaPiece>(currentLeader);
  const [selectedPiece, setSelectedPiece] = useState<OthelloniaPiece | null>(null);
  const [filterAttr, setFilterAttr] = useState<ElementAttribute | 'all'>('all');
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  // フィルタリング
  const filteredPieces = ALL_PIECES.filter((p) => {
    if (filterAttr !== 'all' && p.attribute !== filterAttr) return false;
    return true;
  });

  // デッキ統計
  const totalHp = deck.reduce((sum, p) => sum + p.hp, 0) + 10000; // リーダー基本HP込
  const avgAtk = Math.round(deck.reduce((sum, p) => sum + p.atk, 0) / Math.max(1, deck.length));
  const godCount = deck.filter((p) => p.attribute === 'god').length;
  const demonCount = deck.filter((p) => p.attribute === 'demon').length;
  const dragonCount = deck.filter((p) => p.attribute === 'dragon').length;

  // 駒をデッキに追加
  const handleAddPiece = (piece: OthelloniaPiece) => {
    if (deck.length >= 10) return;
    const newDeck = [...deck, piece];
    setDeck(newDeck);
  };

  // 駒をデッキから削除
  const handleRemovePiece = (index: number) => {
    if (deck.length <= 1) return;
    const pieceToRemove = deck[index];
    const newDeck = deck.filter((_, i) => i !== index);
    setDeck(newDeck);

    // リーダーが削除された場合、残りの先頭をリーダーにする
    if (leader.id === pieceToRemove.id && !newDeck.some((p) => p.id === pieceToRemove.id)) {
      setLeader(newDeck[0]);
    }
  };

  // リーダーに設定
  const handleSetLeader = (piece: OthelloniaPiece) => {
    setLeader(piece);
    // デッキに含まれていなければ追加
    if (!deck.some((p) => p.id === piece.id)) {
      if (deck.length < 10) {
        setDeck([piece, ...deck]);
      } else {
        setDeck([piece, ...deck.slice(0, 9)]);
      }
    }
  };

  // プリセット適用
  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_DECKS.find((p) => p.id === presetId);
    if (!preset) return;
    const newPieces = preset.pieceIds.map((id) => PIECES_MAP[id]).filter(Boolean);
    const newLeader = PIECES_MAP[preset.leaderId] || newPieces[0];
    setDeck(newPieces);
    setLeader(newLeader);
  };

  // 保存して戻る
  const handleSave = () => {
    onSaveDeck(deck, leader);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6 text-white animate-fade-in">
      {/* 上部バー */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-amber-300 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
              デッキ編成 (Deck Builder)
            </h1>
            <p className="text-xs text-slate-400">
              10体の駒を選択して最強のマイデッキを作ろう（現在 {deck.length}/10体）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-black text-sm shadow-lg shadow-emerald-900/40 transition transform active:scale-95"
          >
            <Check className="w-4 h-4" />
            デッキを保存
          </button>
        </div>
      </div>

      {isSavedNotice && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-xl text-center font-bold text-sm">
          ✨ デッキの編成を保存しました！
        </div>
      )}

      {/* プリセット選択 */}
      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>おすすめプリセットデッキ（1クリックで編成可能）:</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_DECKS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLoadPreset(p.id)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-left transition"
            >
              <div className="text-xs font-black text-amber-300 truncate">{p.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 現在のデッキエリア */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">現在の編成スロット</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-bold border border-slate-700">
              {deck.length} / 10
            </span>
          </div>

          {/* デッキ統計 */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1 text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-800/40">
              <Heart className="w-3.5 h-3.5" />
              <span>総HP: {totalHp.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/40">
              <Zap className="w-3.5 h-3.5" />
              <span>平均ATK: {avgAtk.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/60">
              <span className="text-amber-400">神: {godCount}</span>
              <span className="text-purple-400">魔: {demonCount}</span>
              <span className="text-red-400">竜: {dragonCount}</span>
            </div>
          </div>
        </div>

        {/* 10枠のスロット */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {Array.from({ length: 10 }).map((_, i) => {
            const piece = deck[i];
            const isLeader = piece && piece.id === leader.id;

            if (!piece) {
              return (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-700/70 bg-slate-800/20 flex flex-col items-center justify-center text-slate-500 text-xs"
                >
                  <Plus className="w-5 h-5 opacity-40 mb-1" />
                  <span className="text-[10px] font-bold">空き</span>
                </div>
              );
            }

            return (
              <div
                key={`${piece.id}-${i}`}
                className={`relative group aspect-square rounded-2xl border-2 p-2 flex flex-col items-center justify-between cursor-pointer transition transform hover:-translate-y-1 ${
                  isLeader
                    ? 'border-amber-400 bg-gradient-to-b from-amber-950/50 to-slate-900 shadow-lg shadow-amber-900/30'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                }`}
                onClick={() => setSelectedPiece(piece)}
              >
                {/* リーダーバッジ */}
                {isLeader && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] flex items-center gap-0.5 shadow">
                    <Crown className="w-2.5 h-2.5" />
                    <span>LEADER</span>
                  </div>
                )}

                {/* 削除ボタン */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePiece(i);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition z-10"
                  title="外す"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                <div className="mt-1">
                  <PieceAvatar avatarSvg={piece.avatarSvg} attribute={piece.attribute} rarity={piece.rarity} size="sm" />
                </div>

                <div className="w-full text-center">
                  <div className="text-[11px] font-black text-white truncate">{piece.name}</div>
                  <div className="text-[9px] text-slate-400 font-bold">ATK {piece.atk}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 手持ち駒一覧 */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-black text-white">手持ちの駒一覧（クリックで詳細・追加）</span>
          </div>

          {/* 属性フィルター */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setFilterAttr('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterAttr === 'all' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilterAttr('god')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterAttr === 'god' ? 'bg-amber-500 text-slate-950 shadow' : 'text-amber-400 hover:text-white'
              }`}
            >
              ⚡ 神
            </button>
            <button
              onClick={() => setFilterAttr('demon')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterAttr === 'demon' ? 'bg-purple-600 text-white shadow' : 'text-purple-400 hover:text-white'
              }`}
            >
              🔮 魔
            </button>
            <button
              onClick={() => setFilterAttr('dragon')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterAttr === 'dragon' ? 'bg-red-600 text-white shadow' : 'text-red-400 hover:text-white'
              }`}
            >
              🔥 竜
            </button>
          </div>
        </div>

        {/* 駒リストグリッド */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[440px] overflow-y-auto pr-1">
          {filteredPieces.map((piece) => {
            const inDeckCount = deck.filter((p) => p.id === piece.id).length;
            const isLeader = leader.id === piece.id;

            return (
              <div
                key={piece.id}
                onClick={() => setSelectedPiece(piece)}
                className={`relative p-3 rounded-2xl border transition transform hover:-translate-y-1 cursor-pointer bg-slate-800/70 hover:bg-slate-800 flex flex-col justify-between ${
                  inDeckCount > 0 ? 'border-amber-500/60 shadow-md shadow-amber-950/30' : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                {inDeckCount > 0 && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-[10px] font-black text-amber-300">
                    デッキ中
                  </span>
                )}

                <div className="flex items-center gap-3 mb-2">
                  <PieceAvatar avatarSvg={piece.avatarSvg} attribute={piece.attribute} rarity={piece.rarity} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-white truncate">{piece.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{piece.title}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-slate-300 bg-slate-900/60 p-1.5 rounded-lg mb-2">
                  <div>HP: {piece.hp}</div>
                  <div>ATK: {piece.atk}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddPiece(piece);
                    }}
                    disabled={deck.length >= 10}
                    className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-40 text-white text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    追加
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetLeader(piece);
                    }}
                    className={`py-1 px-2 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 ${
                      isLeader
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 hover:bg-amber-600 text-amber-300 hover:text-white'
                    }`}
                    title="リーダーに指定"
                  >
                    <Crown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 駒詳細モーダル */}
      <PieceDetailModal
        piece={selectedPiece}
        onClose={() => setSelectedPiece(null)}
        actionButton={
          selectedPiece && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleAddPiece(selectedPiece);
                  setSelectedPiece(null);
                }}
                disabled={deck.length >= 10}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold text-sm transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                デッキに加える
              </button>
              <button
                onClick={() => {
                  handleSetLeader(selectedPiece);
                  setSelectedPiece(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                リーダーに設定
              </button>
            </div>
          )
        }
      />
    </div>
  );
};
