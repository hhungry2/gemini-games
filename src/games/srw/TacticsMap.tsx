import React, { useState, useEffect } from 'react';
import {
  Unit,
  Weapon,
  CombatAction,
  StageData,
  SpiritType,
} from './types';
import { TERRAIN_DATA, SPIRIT_COMMANDS, calculateCombatForecast } from './unitsData';
import { srwAudio } from './srwAudio';
import {
  Swords,
  Sparkles,
  Wrench,
  Package,
  RotateCcw,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface TacticsMapProps {
  stage: StageData;
  playerUnits: Unit[];
  enemyUnits: Unit[];
  currentTurn: number;
  isPlayerTurn: boolean;
  funds: number;
  onInitiateCombat: (combat: CombatAction) => void;
  onUnitWait: (unitId: string) => void;
  onUnitRepair: (actorId: string, targetId: string) => void;
  onUnitResupply: (actorId: string, targetId: string) => void;
  onApplySpirit: (unitId: string, spirit: SpiritType) => void;
  onEndTurn: () => void;
  isFullscreen?: boolean;
}

export const TacticsMap: React.FC<TacticsMapProps> = ({
  stage,
  playerUnits,
  enemyUnits,
  currentTurn,
  isPlayerTurn,
  funds,
  onInitiateCombat,
  onUnitWait,
  onUnitRepair,
  onUnitResupply,
  onApplySpirit,
  onEndTurn,
  isFullscreen = false,
}) => {
  // カーソル座標
  const [cursorX, setCursorX] = useState<number>(0);
  const [cursorY, setCursorY] = useState<number>(0);

  // 選択中ユニット
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [originalPos, setOriginalPos] = useState<{ x: number; y: number } | null>(null);

  // 移動可能マス
  const [moveRange, setMoveRange] = useState<{ x: number; y: number }[]>([]);

  // 攻撃可能マス (赤)
  const [attackRange, setAttackRange] = useState<{ x: number; y: number }[]>([]);

  // UIモード
  const [uiMode, setUiMode] = useState<
    | 'idle'
    | 'moving'
    | 'action_menu'
    | 'weapon_select'
    | 'target_select'
    | 'spirit_select'
    | 'repair_select'
    | 'resupply_select'
    | 'forecast'
  >('idle');

  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [targetEnemy, setTargetEnemy] = useState<Unit | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // 初回カーソル位置を先頭プレイヤーユニットに
  useEffect(() => {
    if (playerUnits.length > 0) {
      setCursorX(playerUnits[0].x);
      setCursorY(playerUnits[0].y);
    }
  }, [stage.stageNumber]);

  // マス上のユニット検索
  const getUnitAt = (x: number, y: number): Unit | undefined => {
    return (
      playerUnits.find((u) => u.x === x && u.y === y) ||
      enemyUnits.find((u) => u.x === x && u.y === y)
    );
  };

  const hoveredUnit = getUnitAt(cursorX, cursorY);
  const currentTerrain = stage.terrainGrid[cursorY]?.[cursorX] || 'plain';
  const terrainInfo = TERRAIN_DATA[currentTerrain];

  // 移動可能範囲の計算 (マンハッタン距離 & 地形コスト)
  const calculateMoveRange = (unit: Unit) => {
    const reachable: { x: number; y: number }[] = [];
    const maxMove = unit.move + (unit.activeBuffs.accel ? 3 : 0);

    for (let y = 0; y < stage.mapHeight; y++) {
      for (let x = 0; x < stage.mapWidth; x++) {
        const dist = Math.abs(x - unit.x) + Math.abs(y - unit.y);
        if (dist <= maxMove) {
          // 敵ユニットが居るマスは進入不可
          const occupant = getUnitAt(x, y);
          if (occupant && occupant.faction !== unit.faction) {
            continue;
          }
          reachable.push({ x, y });
        }
      }
    }
    setMoveRange(reachable);
  };

  // 攻撃射程範囲の計算
  const calculateAttackRange = (originX: number, originY: number, weapon: Weapon) => {
    const rangeCells: { x: number; y: number }[] = [];
    for (let y = 0; y < stage.mapHeight; y++) {
      for (let x = 0; x < stage.mapWidth; x++) {
        const dist = Math.abs(x - originX) + Math.abs(y - originY);
        if (dist >= weapon.minRange && dist <= weapon.maxRange) {
          rangeCells.push({ x, y });
        }
      }
    }
    setAttackRange(rangeCells);
  };

  // マス目クリック / カーソル移動
  const handleCellClick = (x: number, y: number) => {
    srwAudio.playCursor();
    setCursorX(x);
    setCursorY(y);

    if (!isPlayerTurn) return;

    if (uiMode === 'idle') {
      const unit = playerUnits.find((u) => u.x === x && u.y === y);
      if (unit && !unit.hasActed) {
        srwAudio.playSelect();
        setSelectedUnit(unit);
        setOriginalPos({ x: unit.x, y: unit.y });
        calculateMoveRange(unit);
        setUiMode('moving');
      }
    } else if (uiMode === 'moving') {
      // 移動先マスをクリック
      const isValid = moveRange.some((c) => c.x === x && c.y === y);
      if (isValid && selectedUnit) {
        // マスに別の味方が居ないかチェック
        const occupant = playerUnits.find((u) => u.x === x && u.y === y && u.id !== selectedUnit.id);
        if (!occupant) {
          srwAudio.playSelect();
          // 一時的に移動
          selectedUnit.x = x;
          selectedUnit.y = y;
          setMoveRange([]);
          setUiMode('action_menu');
        }
      }
    } else if (uiMode === 'target_select') {
      // 射程内の敵をクリック
      const enemy = enemyUnits.find((e) => e.x === x && e.y === y);
      if (enemy && selectedWeapon && selectedUnit) {
        const inRange = attackRange.some((c) => c.x === x && c.y === y);
        if (inRange) {
          srwAudio.playSelect();
          setTargetEnemy(enemy);
          setAttackRange([]);
          setUiMode('forecast');
        }
      }
    } else if (uiMode === 'repair_select') {
      const target = playerUnits.find(
        (u) =>
          u.x === x &&
          u.y === y &&
          u.id !== selectedUnit?.id &&
          Math.abs(u.x - cursorX) + Math.abs(u.y - cursorY) <= 1
      );
      if (target && selectedUnit) {
        srwAudio.playSelect();
        if (selectedUnit.activeBuffs.accel) delete selectedUnit.activeBuffs.accel;
        onUnitRepair(selectedUnit.id, target.id);
        resetSelection();
      }
    } else if (uiMode === 'resupply_select') {
      const target = playerUnits.find(
        (u) =>
          u.x === x &&
          u.y === y &&
          u.id !== selectedUnit?.id &&
          Math.abs(u.x - cursorX) + Math.abs(u.y - cursorY) <= 1
      );
      if (target && selectedUnit) {
        srwAudio.playSelect();
        if (selectedUnit.activeBuffs.accel) delete selectedUnit.activeBuffs.accel;
        onUnitResupply(selectedUnit.id, target.id);
        resetSelection();
      }
    }
  };

  // Undo (移動キャンセルして元のマスに戻る)
  const handleCancelMove = () => {
    srwAudio.playCancel();
    if (selectedUnit && originalPos) {
      selectedUnit.x = originalPos.x;
      selectedUnit.y = originalPos.y;
      setCursorX(originalPos.x);
      setCursorY(originalPos.y);
    }
    resetSelection();
  };

  const resetSelection = () => {
    setSelectedUnit(null);
    setOriginalPos(null);
    setMoveRange([]);
    setAttackRange([]);
    setSelectedWeapon(null);
    setTargetEnemy(null);
    setUiMode('idle');
  };

  // キーボード操作対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (uiMode === 'forecast') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        srwAudio.playCursor();
        setCursorY((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        srwAudio.playCursor();
        setCursorY((prev) => Math.min(stage.mapHeight - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        srwAudio.playCursor();
        setCursorX((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        srwAudio.playCursor();
        setCursorX((prev) => Math.min(stage.mapWidth - 1, prev + 1));
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleCellClick(cursorX, cursorY);
      } else if (e.key === 'Escape' || e.key === 'x' || e.key === 'X' || e.key === 'Backspace') {
        e.preventDefault();
        if (uiMode === 'moving' || uiMode === 'action_menu') {
          handleCancelMove();
        } else if (uiMode === 'weapon_select' || uiMode === 'spirit_select') {
          srwAudio.playCancel();
          setUiMode('action_menu');
        } else if (uiMode === 'target_select') {
          srwAudio.playCancel();
          setAttackRange([]);
          setUiMode('weapon_select');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorX, cursorY, uiMode, selectedUnit]);

  // 戦闘突入確定
  const confirmCombat = () => {
    if (!selectedUnit || !targetEnemy || !selectedWeapon) return;

    const atkTerrain = TERRAIN_DATA[stage.terrainGrid[selectedUnit.y][selectedUnit.x] || 'plain'];
    const defTerrain = TERRAIN_DATA[stage.terrainGrid[targetEnemy.y][targetEnemy.x] || 'plain'];

    const atkForecast = calculateCombatForecast(
      selectedUnit,
      targetEnemy,
      selectedWeapon,
      atkTerrain,
      defTerrain
    );

    // 敵の反撃武器選定
    const dist = Math.abs(selectedUnit.x - targetEnemy.x) + Math.abs(selectedUnit.y - targetEnemy.y);
    const counterWpn = targetEnemy.weapons.find(
      (w) => dist >= w.minRange && dist <= w.maxRange && targetEnemy.en >= w.enCost
    );

    let defForecast = { hitChance: 0, estimatedDamage: 0 };
    if (counterWpn) {
      defForecast = calculateCombatForecast(
        targetEnemy,
        selectedUnit,
        counterWpn,
        defTerrain,
        atkTerrain
      );
    }

    const combatAction: CombatAction = {
      attacker: selectedUnit,
      defender: targetEnemy,
      weapon: selectedWeapon,
      counterWeapon: counterWpn,
      defenderAction: counterWpn ? 'counter' : 'defend',
      attackerHitChance: atkForecast.hitChance,
      attackerEstimatedDamage: atkForecast.estimatedDamage,
      defenderHitChance: defForecast.hitChance,
      defenderEstimatedDamage: defForecast.estimatedDamage,
      isCounter: false,
    };

    // EN消費
    selectedUnit.en -= selectedWeapon.enCost;
    if (selectedUnit.activeBuffs.accel) delete selectedUnit.activeBuffs.accel;
    resetSelection();
    onInitiateCombat(combatAction);
  };

  const allPlayersActed =
    isPlayerTurn && playerUnits.length > 0 && playerUnits.every((u) => u.hasActed);

  // ステージサイズに応じた動的セルクラス (フルスクリーン時は画面限界まで拡大)
  const cellDimensionClass = isFullscreen
    ? stage.mapWidth <= 10
      ? 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24'
      : stage.mapWidth <= 12
      ? 'w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20'
      : 'w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13 lg:w-16 lg:h-16'
    : stage.mapWidth <= 10
    ? 'w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14'
    : stage.mapWidth <= 12
    ? 'w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13'
    : 'w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11';

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 ${
        isFullscreen ? 'max-w-none' : ''
      }`}
    >
      {/* --- 上部情報バー --- */}
      <div className="z-20 w-full px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-black text-amber-400">
            <span className="text-base">🚩</span>
            <span>{stage.title}</span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-slate-400">
            <span>TURN: {currentTurn}</span>
            <span
              className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${
                isPlayerTurn ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'bg-rose-600/30 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isPlayerTurn ? 'PLAYER PHASE' : 'ENEMY PHASE'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="text-emerald-400 font-mono font-bold flex items-center space-x-1">
            <span>💰</span>
            <span>{funds.toLocaleString()} G</span>
          </div>

          <button
            onClick={() => {
              srwAudio.playSelect();
              setShowHelp(true);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="遊び方・操作ヘルプ"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {isPlayerTurn && (
            <button
              onClick={onEndTurn}
              className={`px-3 py-1 rounded text-xs font-black shadow-md transition cursor-pointer ${
                allPlayersActed
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 ring-2 ring-amber-300 animate-pulse scale-105'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950'
              }`}
            >
              {allPlayersActed ? '全機行動済 ターン終了' : 'ターン終了'}
            </button>
          )}
        </div>
      </div>

      {/* 全員行動完了案内バナー */}
      {allPlayersActed && (
        <div className="z-10 w-full bg-amber-500/20 border-b border-amber-500/40 py-1 px-4 text-center text-[11px] font-bold text-amber-300 animate-in fade-in">
          ⚡ 全味方ユニットの行動が完了しました。「ターン終了」ボタンを押してエネミーターンへ進めてください。
        </div>
      )}

      {/* --- メイン戦術グリッドマップ --- */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-auto p-2 sm:p-4">
        <div
          className="relative grid gap-1 p-2 bg-slate-900/80 rounded-2xl border-2 border-slate-700/60 shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${stage.mapWidth}, minmax(0, 1fr))`,
          }}
        >
          {stage.terrainGrid.map((row, y) =>
            row.map((terrain, x) => {
              const occupant = getUnitAt(x, y);
              const isCursor = cursorX === x && cursorY === y;
              const isMoveTarget = moveRange.some((c) => c.x === x && c.y === y);
              const isAttackTarget = attackRange.some((c) => c.x === x && c.y === y);

              let bgColor = '#1e293b'; // plain
              if (terrain === 'forest') bgColor = '#14532d';
              if (terrain === 'mountain') bgColor = '#451a03';
              if (terrain === 'base') bgColor = '#1e3a8a';
              if (terrain === 'sea') bgColor = '#0c4a6e';

              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  className={`relative ${cellDimensionClass} rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isMoveTarget
                      ? 'bg-blue-500/40 ring-2 ring-blue-400 ring-inset'
                      : isAttackTarget
                      ? 'bg-rose-500/40 ring-2 ring-rose-400 ring-inset animate-pulse'
                      : ''
                  } ${isCursor ? 'ring-2 sm:ring-4 ring-amber-400 z-30 scale-105 shadow-lg' : ''}`}
                  style={{ backgroundColor: isMoveTarget || isAttackTarget ? undefined : bgColor }}
                >
                  {/* 地形アイコン */}
                  {terrain === 'base' && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] sm:text-[10px] opacity-40">🏰</span>
                  )}
                  {terrain === 'forest' && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] sm:text-[10px] opacity-40">🌲</span>
                  )}
                  {terrain === 'mountain' && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] sm:text-[10px] opacity-40">⛰️</span>
                  )}

                  {/* ユニット駒 */}
                  {occupant && (
                    <div
                      className={`relative flex flex-col items-center justify-center transition-transform ${
                        occupant.hasActed ? 'opacity-40 grayscale' : 'hover:scale-110'
                      }`}
                    >
                      <span className={`${isFullscreen ? 'text-xl sm:text-3xl md:text-4xl' : 'text-lg sm:text-2xl'} drop-shadow select-none`}>
                        {occupant.icon}
                      </span>
                      {/* ミニHPバー */}
                      <div className={`absolute -bottom-1 ${isFullscreen ? 'w-8 sm:w-12 h-1.5' : 'w-6 sm:w-8 h-1'} bg-slate-950 rounded-full overflow-hidden border border-slate-700`}>
                        <div
                          className={`h-full ${
                            occupant.faction === 'player' ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${(occupant.hp / occupant.maxHp) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* カーソル枠装飾 */}
                  {isCursor && (
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* --- アクション選択メニュー (移動後) --- */}
        {uiMode === 'action_menu' && selectedUnit && (
          <div className="absolute z-40 bg-slate-900/95 border-2 border-amber-500/80 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 min-w-[150px] animate-in zoom-in-95 duration-150">
            <div className="text-xs font-bold text-amber-400 pb-1 border-b border-slate-700 flex items-center space-x-1">
              <span>{selectedUnit.mechName}</span>
            </div>

            <button
              onClick={() => {
                srwAudio.playSelect();
                setUiMode('weapon_select');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>攻撃 (Attack)</span>
            </button>

            <button
              onClick={() => {
                srwAudio.playSelect();
                setUiMode('spirit_select');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>精神 (Spirit)</span>
            </button>

            {selectedUnit.canRepair && (
              <button
                onClick={() => {
                  srwAudio.playSelect();
                  setUiMode('repair_select');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>修理 (Repair)</span>
              </button>
            )}

            {selectedUnit.canResupply && (
              <button
                onClick={() => {
                  srwAudio.playSelect();
                  setUiMode('resupply_select');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>補給 (Resupply)</span>
              </button>
            )}

            <button
              onClick={() => {
                srwAudio.playSelect();
                if (selectedUnit.activeBuffs.accel) delete selectedUnit.activeBuffs.accel;
                onUnitWait(selectedUnit.id);
                resetSelection();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center space-x-2 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>待機 (Wait)</span>
            </button>

            <button
              onClick={handleCancelMove}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-2 transition border border-slate-600 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>キャンセル (Undo)</span>
            </button>
          </div>
        )}

        {/* --- 武器選択メニュー --- */}
        {uiMode === 'weapon_select' && selectedUnit && (
          <div className="absolute z-40 bg-slate-900/95 border-2 border-rose-500/80 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-slate-700 text-xs font-bold text-rose-400">
              <span>武器選択</span>
              <button onClick={() => setUiMode('action_menu')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col space-y-1.5 max-h-60 overflow-y-auto">
              {selectedUnit.weapons.map((w) => {
                const canUse = selectedUnit.en >= w.enCost && selectedUnit.morale >= w.moraleReq;
                return (
                  <button
                    key={w.id}
                    disabled={!canUse}
                    onClick={() => {
                      srwAudio.playSelect();
                      setSelectedWeapon(w);
                      calculateAttackRange(selectedUnit.x, selectedUnit.y, w);
                      setUiMode('target_select');
                    }}
                    className={`px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between border transition cursor-pointer ${
                      canUse
                        ? 'bg-slate-800/90 hover:bg-rose-950/60 border-slate-700 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-amber-300">{w.name}</div>
                      <div className="text-[10px] text-slate-400">
                        威力: {w.power} | 射程: {w.minRange}-{w.maxRange} | 気力: {w.moraleReq}
                      </div>
                    </div>
                    <div className="text-right text-[10px] font-mono">
                      {w.enCost > 0 && <span className="text-cyan-400">EN {w.enCost}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 精神コマンド選択メニュー --- */}
        {uiMode === 'spirit_select' && selectedUnit && (
          <div className="absolute z-40 bg-slate-900/95 border-2 border-amber-500/80 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 max-w-sm w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-slate-700 text-xs font-bold text-amber-400">
              <span>精神コマンド (SP: {selectedUnit.sp}/{selectedUnit.maxSp})</span>
              <button onClick={() => setUiMode('action_menu')} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {selectedUnit.pilot.spirits.map((spId) => {
                const spInfo = SPIRIT_COMMANDS[spId];
                const canCast = selectedUnit.sp >= spInfo.spCost;
                return (
                  <button
                    key={spId}
                    disabled={!canCast}
                    onClick={() => {
                      srwAudio.playSpirit();
                      onApplySpirit(selectedUnit.id, spId);
                      setUiMode('action_menu');
                    }}
                    className={`p-2 rounded-lg text-left text-xs border transition cursor-pointer ${
                      canCast
                        ? 'bg-slate-800/90 hover:bg-amber-950/60 border-slate-700 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1 text-amber-300">
                      <span>{spInfo.icon}</span>
                      <span>{spInfo.name}</span>
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                      SP {spInfo.spCost}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight mt-1 truncate">
                      {spInfo.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 戦闘前予測ウィンドウ (Forecast) --- */}
        {uiMode === 'forecast' && selectedUnit && targetEnemy && selectedWeapon && (
          <div className="absolute z-50 bg-slate-900/95 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="text-center font-black text-rose-400 text-sm tracking-wider pb-2 border-b border-slate-700">
              COMBAT FORECAST
            </div>

            <div className="flex items-center justify-between py-3">
              {/* 自機 */}
              <div className="flex flex-col items-center w-5/12 text-center">
                <span className="text-3xl">{selectedUnit.icon}</span>
                <span className="font-bold text-white text-xs mt-1 truncate">
                  {selectedUnit.mechName}
                </span>
                <span className="text-[10px] text-blue-400 font-mono">
                  HP {selectedUnit.hp}/{selectedUnit.maxHp}
                </span>
                <span className="text-xs font-bold text-amber-300 mt-2">
                  {selectedWeapon.name}
                </span>
              </div>

              {/* VS */}
              <div className="text-rose-500 font-black text-xl italic">VS</div>

              {/* 敵機 */}
              <div className="flex flex-col items-center w-5/12 text-center">
                <span className="text-3xl">{targetEnemy.icon}</span>
                <span className="font-bold text-white text-xs mt-1 truncate">
                  {targetEnemy.mechName}
                </span>
                <span className="text-[10px] text-rose-400 font-mono">
                  HP {targetEnemy.hp}/{targetEnemy.maxHp}
                </span>
                <span className="text-xs font-bold text-slate-400 mt-2 truncate">
                  {targetEnemy.weapons[0]?.name || '防御'}
                </span>
              </div>
            </div>

            {/* 決定 / キャンセル */}
            <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-slate-800">
              <button
                onClick={confirmCombat}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <Swords className="w-4 h-4" />
                <span>戦闘開始 (ENGAGE)</span>
              </button>
              <button
                onClick={() => setUiMode('action_menu')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                戻る
              </button>
            </div>
          </div>
        )}
        {/* --- 操作ヘルプモーダル --- */}
        {showHelp && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl max-w-lg w-full flex flex-col space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-amber-400 font-black text-sm sm:text-base">
                  <HelpCircle className="w-5 h-5" />
                  <span>スーパーロボット大戦 操作＆戦術ガイド</span>
                </div>
                <button
                  onClick={() => {
                    srwAudio.playCancel();
                    setShowHelp(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-amber-300 block mb-1">🎮 基本操作</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                    <li><strong className="text-white">カーソル移動:</strong> 矢印キー / WASD / 画面下の十字ボタン / マスタップ</li>
                    <li><strong className="text-white">決定・行動:</strong> Enter / Space / Z / 〇ボタン / セル直接クリック</li>
                    <li><strong className="text-white">キャンセル・Undo:</strong> ESC / X / Backspace / ✕ボタン（移動直後なら元のマスに戻れます）</li>
                  </ul>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-cyan-300 block mb-1">✨ 精神コマンド</span>
                  <p className="text-[11px] text-slate-300 mb-1">
                    各パイロット固有のSPを消費して発動する強力な特殊能力です：
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-red-400">🔥 熱血:</strong> 次回与ダメ2.0倍</span>
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-amber-400">⚡ ひらめき:</strong> 次回攻撃を完全回避</span>
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-blue-400">🎯 必中:</strong> 命中率100%</span>
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-emerald-400">🛡️ 鉄壁:</strong> 被ダメ1/4に激減</span>
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-purple-400">👁️ 集中:</strong> 命中・回避+30%</span>
                    <span className="bg-slate-900/60 p-1.5 rounded"><strong className="text-yellow-400">👟 加速:</strong> 移動力+3マス</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                  <span className="font-bold text-emerald-300 block mb-1">🌲 地形効果 & 格納庫改造</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                    <li><strong className="text-white">森林・防衛基地:</strong> 防御率や回避率がアップ！基地上では毎ターンHP/EN回復！</li>
                    <li><strong className="text-white">機体・武器改造:</strong> ステージクリア後の格納庫で資金を使って改造可能。全項目5段階改造でカスタムボーナス獲得！</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => {
                  srwAudio.playSelect();
                  setShowHelp(false);
                }}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                理解した（閉じる）
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- 下部ステータス表示フッター & 仮想ゲームパッド --- */}
      <div className="z-20 w-full bg-slate-900/90 border-t border-slate-800 p-2 sm:p-3 flex flex-wrap items-center justify-between text-xs">
        {/* カーソル位置の地形 & ユニット情報 */}
        <div className="flex items-center space-x-4 min-w-[200px]">
          {/* 地形 */}
          <div className="flex items-center space-x-1 text-slate-300">
            <span className="text-sm">📍</span>
            <span className="font-bold">{terrainInfo.name}</span>
            <span className="text-[10px] text-slate-400">
              (防+{terrainInfo.defenseMod * 100}% 避+{terrainInfo.evadeMod * 100}%)
            </span>
          </div>

          {/* ユニット簡易ステータス */}
          {hoveredUnit && (
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-700">
              <span className="text-base">{hoveredUnit.pilot.portrait}</span>
              <div>
                <span className="font-bold text-white">{hoveredUnit.mechName}</span>
                <span className="text-[10px] text-slate-400 ml-1">
                  HP {hoveredUnit.hp}/{hoveredUnit.maxHp} | EN {hoveredUnit.en}/{hoveredUnit.maxEn}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 仮想ゲームパッド (スマホ・タッチ操作用) */}
        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              onClick={() => {
                srwAudio.playCursor();
                setCursorY((prev) => Math.max(0, prev - 1));
              }}
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-200 shadow cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              onClick={() => {
                srwAudio.playCursor();
                setCursorX((prev) => Math.max(0, prev - 1));
              }}
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-200 shadow cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleCellClick(cursorX, cursorY)}
              className="w-8 h-8 rounded bg-amber-600 hover:bg-amber-500 active:bg-amber-400 flex items-center justify-center text-slate-950 font-bold shadow cursor-pointer"
            >
              〇
            </button>
            <button
              onClick={() => {
                srwAudio.playCursor();
                setCursorX((prev) => Math.min(stage.mapWidth - 1, prev + 1));
              }}
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-200 shadow cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div />
            <button
              onClick={() => {
                srwAudio.playCursor();
                setCursorY((prev) => Math.min(stage.mapHeight - 1, prev + 1));
              }}
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-200 shadow cursor-pointer"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelMove}
              className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-300 text-[10px] font-bold shadow cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
