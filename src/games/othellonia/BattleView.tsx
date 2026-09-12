import React, { useState, useEffect } from 'react';
import {
  BoardCell,
  OthelloniaPiece,
  FloatingText,
  CutinEffect,
  DamageLog,
  GameMode,
} from './types';
import { PieceAvatar } from './PieceAvatar';
import { PieceDetailModal } from './PieceDetailModal';
import { getFlipMultiplier, getFlippableCells } from './boardUtils';
import { Sparkles, Skull, RotateCcw, Volume2, VolumeX, Eye } from 'lucide-react';

interface BattleViewProps {
  board: BoardCell[][];
  playerHand: OthelloniaPiece[];
  enemyHand: OthelloniaPiece[];
  playerLeader: OthelloniaPiece;
  enemyLeader: OthelloniaPiece;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerPoison: number;
  enemyPoison: number;
  currentTurn: 'player' | 'enemy';
  turnNumber: number;
  validMoves: { x: number; y: number; flipsCount: number }[];
  selectedPieceIndex: number;
  onSelectPieceIndex: (index: number) => void;
  onPlacePiece: (x: number, y: number) => void;
  floatingTexts: FloatingText[];
  cutinEffect: CutinEffect | null;
  lastDamageLog: DamageLog | null;
  gameMode: GameMode;
  enemyName: string;
  isFullscreen?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  battleSpeed: number;
  onChangeBattleSpeed: (speed: number) => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  board,
  playerHand,
  enemyHand,
  playerLeader,
  enemyLeader,
  playerHp,
  playerMaxHp,
  enemyHp,
  enemyMaxHp,
  playerPoison,
  enemyPoison,
  currentTurn,
  turnNumber,
  validMoves,
  selectedPieceIndex,
  onSelectPieceIndex,
  onPlacePiece,
  floatingTexts,
  cutinEffect,
  lastDamageLog,
  gameMode,
  enemyName,
  isFullscreen = false,
  onUndo,
  canUndo = false,
  isMuted,
  onToggleMute,
  battleSpeed,
  onChangeBattleSpeed,
}) => {
  const [inspectPiece, setInspectPiece] = useState<OthelloniaPiece | null>(null);
  const [shakeScreen, setShakeScreen] = useState<boolean>(false);
  const [hoveredMove, setHoveredMove] = useState<{ x: number; y: number } | null>(null);

  // 大ダメージ時に画面揺れ
  useEffect(() => {
    if (lastDamageLog && (lastDamageLog.normalDamage + lastDamageLog.specialDamage) >= 3500) {
      setShakeScreen(true);
      const timer = setTimeout(() => setShakeScreen(false), 500);
      return () => clearTimeout(timer);
    }
  }, [lastDamageLog]);

  const playerHpPercent = Math.max(0, Math.min(100, (playerHp / Math.max(1, playerMaxHp)) * 100));
  const enemyHpPercent = Math.max(0, Math.min(100, (enemyHp / Math.max(1, enemyMaxHp)) * 100));

  const isPvPEnemyTurn = gameMode === 'pvp' && currentTurn === 'enemy';
  const activeHand = isPvPEnemyTurn ? enemyHand : playerHand;
  const selectedPiece = activeHand[selectedPieceIndex] || null;

  // ホバー時に裏返る相手の石の座標一覧（反転プレビュー）
  const previewFlippedCells =
    hoveredMove && selectedPiece
      ? getFlippableCells(board, hoveredMove.x, hoveredMove.y, currentTurn).flippedCells
      : [];

  return (
    <div
      className={`w-full flex flex-col items-center justify-between text-white select-none transition-all duration-300 relative overflow-hidden ${
        isFullscreen ? 'h-full max-w-none p-1 sm:p-2' : 'max-w-4xl p-2 sm:p-4 min-h-[760px]'
      } ${shakeScreen ? 'animate-bounce' : ''}`}
    >
      {/* ================= 上部：相手ステータスバー ================= */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md mb-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <PieceAvatar
              avatarSvg={enemyLeader.avatarSvg}
              attribute={enemyLeader.attribute}
              rarity={enemyLeader.rarity}
              size="sm"
            />
            <div>
              <div className="text-xs font-black text-rose-300 flex items-center gap-1">
                <span>{enemyName}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {gameMode === 'quest' ? 'クエスト' : 'VS CPU'}
                </span>
                {enemyLeader.leaderSkill && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    オーラ発動中
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-bold">
                HP {enemyHp.toLocaleString()} / {enemyMaxHp.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {enemyPoison > 0 && (
              <div className="flex items-center gap-1 bg-purple-950/80 border border-purple-600/80 px-2 py-0.5 rounded-lg text-purple-300 text-xs font-black animate-pulse">
                <Skull className="w-3.5 h-3.5 text-purple-400" />
                <span>毎ターン -{enemyPoison}</span>
              </div>
            )}
            {/* 速度切り替え */}
            <button
              onClick={() => {
                const nextSpeed = battleSpeed === 1 ? 1.5 : battleSpeed === 1.5 ? 2 : 1;
                onChangeBattleSpeed(nextSpeed);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black transition border border-slate-700"
              title="バトル速度"
            >
              ⚡ {battleSpeed}x
            </button>
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={isMuted ? 'サウンドON' : 'ミュート'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* 相手HPゲージ */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 shadow-lg shadow-rose-900/40"
            style={{ width: `${enemyHpPercent}%` }}
          />
        </div>

        {/* 相手の手駒アイコン (裏面または小型) */}
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[10px] text-slate-500 font-bold mr-1">手駒 ({enemyHand.length}):</span>
          {enemyHand.map((_, i) => (
            <div
              key={`enemy-card-${i}`}
              className="w-5 h-7 rounded bg-slate-800 border border-slate-700 shadow-sm flex items-center justify-center text-[10px] text-slate-500"
            >
              ◆
            </div>
          ))}
        </div>
      </div>

      {/* ================= ターン表示 ＆ 直近ログバナー ================= */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 ${
              currentTurn === 'player'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-900/40 animate-pulse'
                : 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-rose-900/40'
            }`}
          >
            <span>
              {currentTurn === 'player'
                ? gameMode === 'pvp'
                  ? '★ プレイヤー1 (1P) の手番'
                  : '★ あなたのターン'
                : gameMode === 'pvp'
                ? '★ プレイヤー2 (2P) の手番'
                : '⏳ 相手の思考中...'}
            </span>
            <span className="text-[10px] opacity-80">(Turn {turnNumber})</span>
          </div>

          {canUndo && onUndo && currentTurn === 'player' && gameMode !== 'pvp' && (
            <button
              onClick={onUndo}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>待った (Undo)</span>
            </button>
          )}
        </div>

        {lastDamageLog && (
          <div className="text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 truncate max-w-[280px]">
            {lastDamageLog.message}
          </div>
        )}
      </div>

      {/* ================= メイン：6x6 盤面 (Board) ================= */}
      <div className="relative flex items-center justify-center my-auto">
        <div
          className={`relative p-2 sm:p-3.5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-slate-700/80 shadow-2xl backdrop-blur-md transition-transform duration-300 ${
            isFullscreen ? 'scale-100 sm:scale-105 md:scale-110' : ''
          }`}
        >
          {/* 6x6 グリッド */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {board.map((row, y) =>
              row.map((cell, x) => {
                const validMove = validMoves.find((m) => m.x === x && m.y === y);
                const isActionableNow = gameMode === 'pvp' || currentTurn === 'player';
                const canPlaceHere = isActionableNow && !!validMove && selectedPiece !== null;
                const willFlipThis = previewFlippedCells.some((f) => f.x === x && f.y === y);

                // ギミックマスのバッジ
                const renderGimmickBadge = () => {
                  if (cell.gimmick === 'heal') return <span className="text-[10px] drop-shadow">💚</span>;
                  if (cell.gimmick === 'buff') return <span className="text-[10px] drop-shadow">⚡</span>;
                  if (cell.gimmick === 'damage') return <span className="text-[10px] drop-shadow">🔥</span>;
                  return null;
                };

                const isHovered = hoveredMove?.x === x && hoveredMove?.y === y;
                const estimatedDmg = canPlaceHere && selectedPiece && validMove
                  ? Math.round(selectedPiece.atk * getFlipMultiplier(validMove.flipsCount) * (cell.gimmick === 'buff' ? 1.5 : 1.0))
                  : 0;

                return (
                  <div
                    key={`cell-${x}-${y}`}
                    onClick={() => {
                      if (canPlaceHere) {
                        onPlacePiece(x, y);
                      } else if (cell.piece) {
                        setInspectPiece(cell.piece);
                      }
                    }}
                    onMouseEnter={() => canPlaceHere && setHoveredMove({ x, y })}
                    onMouseLeave={() => setHoveredMove(null)}
                    className={`relative rounded-2xl flex items-center justify-center transition-all duration-200 select-none ${
                      isFullscreen
                        ? 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
                        : 'w-11 h-11 sm:w-14 sm:h-14'
                    } ${
                      cell.owner === null
                        ? 'bg-slate-800/80 border border-slate-700/50 hover:bg-slate-750'
                        : cell.owner === 'player'
                        ? 'bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 border-2 border-sky-400/80 shadow-md shadow-sky-950/50'
                        : 'bg-gradient-to-br from-rose-950 via-slate-900 to-purple-950 border-2 border-rose-500/80 shadow-md shadow-rose-950/50'
                    } ${canPlaceHere ? 'ring-2 ring-amber-400/90 cursor-pointer bg-amber-950/40 animate-pulse' : ''} ${
                      cell.flipsThisTurn ? 'scale-105 rotate-y-180' : ''
                    } ${
                      willFlipThis
                        ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 brightness-125 scale-95 transition-all'
                        : ''
                    }`}
                  >
                    {/* ギミックアイコン */}
                    {cell.gimmick !== 'none' && !cell.piece && (
                      <div className="absolute top-1 right-1 opacity-80 pointer-events-none">
                        {renderGimmickBadge()}
                      </div>
                    )}

                    {/* 配置可能ガイド＆裏返し枚数バッジ */}
                    {canPlaceHere && validMove && (
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-400/80" />
                        <span className="text-[9px] font-black text-amber-300 mt-0.5">
                          +{validMove.flipsCount}
                        </span>
                        {isHovered && estimatedDmg > 0 && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-30 animate-bounce">
                            予: ~{estimatedDmg.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 置かれている駒 */}
                    {cell.piece && (
                      <div className="relative transform transition hover:scale-110">
                        <PieceAvatar
                          avatarSvg={cell.piece.avatarSvg}
                          attribute={cell.piece.attribute}
                          rarity={cell.piece.rarity}
                          size={isFullscreen ? 'lg' : 'md'}
                        />
                        {/* 持ち主インジケータ */}
                        <div
                          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded-full text-[8px] font-black border shadow ${
                            cell.owner === 'player'
                              ? 'bg-sky-500 border-sky-300 text-white'
                              : 'bg-rose-600 border-rose-300 text-white'
                          }`}
                        >
                          {cell.owner === 'player'
                            ? gameMode === 'pvp'
                              ? '1P'
                              : 'YOU'
                            : gameMode === 'pvp'
                            ? '2P'
                            : 'CPU'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 浮遊エフェクトテキスト (Floating Texts) */}
        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className={`absolute pointer-events-none font-black text-lg sm:text-2xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] animate-bounce z-40 transition-all ${
              ft.type === 'damage'
                ? 'text-white'
                : ft.type === 'special'
                ? 'text-amber-300 scale-110'
                : ft.type === 'poison'
                ? 'text-purple-400'
                : ft.type === 'heal'
                ? 'text-emerald-300'
                : ft.type === 'trap'
                ? 'text-rose-400'
                : 'text-sky-300'
            }`}
            style={{
              left: `${ft.x}%`,
              top: `${ft.y}%`,
            }}
          >
            {ft.text}
          </div>
        ))}

        {/* スキル発動ド派手カットイン演出 (Cutin Overlay) */}
        {cutinEffect && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center pointer-events-none animate-scale-in">
            <div
              className={`w-full py-3 px-6 shadow-2xl border-y-2 flex items-center justify-between backdrop-blur-md ${
                cutinEffect.piece.attribute === 'god'
                  ? 'bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-700/90 border-yellow-300 text-amber-950'
                  : cutinEffect.piece.attribute === 'demon'
                  ? 'bg-gradient-to-r from-purple-950/90 via-indigo-900/90 to-purple-950/90 border-purple-400 text-purple-100'
                  : 'bg-gradient-to-r from-red-700/90 via-rose-600/90 to-amber-600/90 border-rose-300 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <PieceAvatar
                  avatarSvg={cutinEffect.piece.avatarSvg}
                  attribute={cutinEffect.piece.attribute}
                  rarity={cutinEffect.piece.rarity}
                  size="lg"
                  className="shadow-2xl ring-4 ring-white/50 animate-spin-slow"
                />
                <div>
                  <div className="text-xs font-black tracking-wider uppercase opacity-80">
                    {cutinEffect.isCombo ? '⚡ 連鎖コンボ発動！' : '★ スキル発動！'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black drop-shadow-md">
                    {cutinEffect.skillName}
                  </div>
                  <div className="text-xs font-bold opacity-90 truncate max-w-xs">
                    {cutinEffect.piece.name}「{cutinEffect.piece.flavorText.replace(/[「」]/g, '')}」
                  </div>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <div className="text-2xl font-black tracking-widest uppercase">
                  {cutinEffect.piece.attribute}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 下部：プレイヤー手札 ＆ ステータス ================= */}
      <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md mt-2">
        {/* 手札スロット (4枚) */}
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isPvPEnemyTurn
                  ? '【2Pの手番】配置する手駒を選択:'
                  : gameMode === 'pvp'
                  ? '【1Pの手番】配置する手駒を選択:'
                  : '配置する手駒を選択してマスをタップ:'}
              </span>
            </div>
            {selectedPiece && (
              <button
                onClick={() => setInspectPiece(selectedPiece)}
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold transition"
              >
                <Eye className="w-3 h-3" />
                <span>性能を見る</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {activeHand.map((piece, idx) => {
              const isSelected = selectedPieceIndex === idx;

              return (
                <div
                  key={`hand-${piece.id}-${idx}`}
                  onClick={() => onSelectPieceIndex(idx)}
                  className={`relative p-2 rounded-2xl border-2 flex flex-col items-center justify-between cursor-pointer transition transform hover:-translate-y-1 ${
                    isSelected
                      ? 'border-amber-400 bg-gradient-to-b from-amber-950/60 to-slate-900 shadow-lg shadow-amber-900/40 scale-102'
                      : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow">
                      選択中
                    </div>
                  )}

                  <PieceAvatar avatarSvg={piece.avatarSvg} attribute={piece.attribute} rarity={piece.rarity} size="md" />

                  <div className="w-full text-center mt-1">
                    <div className="text-[11px] font-black text-white truncate">{piece.name}</div>
                    <div className="text-[9px] text-amber-300 font-bold">ATK {piece.atk}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 選択中駒のスキル簡易バナー */}
        {selectedPiece && (
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60 text-xs mb-2 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="font-black text-amber-300 mr-1.5">[{selectedPiece.skill.name}]</span>
              <span className="text-slate-300 text-[11px]">{selectedPiece.skill.description}</span>
            </div>
            {selectedPiece.comboSkill && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 shrink-0">
                コンボ有
              </span>
            )}
          </div>
        )}

        {/* プレイヤーHPゲージ */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <PieceAvatar
                avatarSvg={playerLeader.avatarSvg}
                attribute={playerLeader.attribute}
                rarity={playerLeader.rarity}
                size="sm"
              />
              <div>
                <div className="text-xs font-black text-sky-300 flex items-center gap-1">
                  <span>{gameMode === 'pvp' ? 'プレイヤー1 (1P)' : 'あなた (YOU)'}</span>
                  {playerLeader.leaderSkill && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      オーラ発動中
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-bold">
                  HP {playerHp.toLocaleString()} / {playerMaxHp.toLocaleString()}
                </div>
              </div>
            </div>

            {playerPoison > 0 && (
              <div className="flex items-center gap-1 bg-purple-950/80 border border-purple-600/80 px-2 py-0.5 rounded-lg text-purple-300 text-xs font-black animate-pulse">
                <Skull className="w-3.5 h-3.5 text-purple-400" />
                <span>毎ターン -{playerPoison}</span>
              </div>
            )}
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 shadow-lg shadow-sky-900/40"
              style={{ width: `${playerHpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 駒詳細モーダル */}
      <PieceDetailModal piece={inspectPiece} onClose={() => setInspectPiece(null)} />
    </div>
  );
};
