import React, { useState } from 'react';
import { Unit, UnitUpgrades } from './types';
import { UPGRADE_COSTS, applyUpgrades } from './unitsData';
import { srwAudio } from './srwAudio';
import {
  Wrench,
  Play,
  Save,
  ChevronRight,
} from 'lucide-react';

interface IntermissionProps {
  playerUnits: Unit[];
  funds: number;
  onFundsChange: (newFunds: number) => void;
  onUnitsChange: (newUnits: Unit[]) => void;
  currentStage: number;
  onStartNextStage: () => void;
  isFullscreen?: boolean;
}

type Tab = 'mech_upgrade' | 'pilot_training' | 'unit_list';

export const Intermission: React.FC<IntermissionProps> = ({
  playerUnits,
  funds,
  onFundsChange,
  onUnitsChange,
  currentStage,
  onStartNextStage,
  isFullscreen = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('mech_upgrade');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<boolean>(false);

  const currentUnit = playerUnits[selectedUnitIndex] || playerUnits[0];

  // 機体改造実行
  const upgradeStat = (stat: keyof UnitUpgrades) => {
    const currentLevel = currentUnit.upgrades[stat];
    if (currentLevel >= 10) return;

    const cost = UPGRADE_COSTS[currentLevel];
    if (funds < cost) return;

    srwAudio.playSelect();
    const updatedFunds = funds - cost;
    onFundsChange(updatedFunds);

    const updatedUnits = [...playerUnits];
    const unitCopy = { ...currentUnit };
    unitCopy.upgrades = { ...unitCopy.upgrades, [stat]: currentLevel + 1 };
    applyUpgrades(unitCopy);

    // フル改造判定 (全項目5段階以上でフル改造ボーナス)
    const isFullCustom = Object.values(unitCopy.upgrades).every((lvl) => lvl >= 5);
    if (isFullCustom && unitCopy.move === unitCopy.baseMove) {
      unitCopy.move = unitCopy.baseMove + 1;
      unitCopy.maxEn += 50;
    }

    // 格納庫整備によりHP・EN全快
    unitCopy.hp = unitCopy.maxHp;
    unitCopy.en = unitCopy.maxEn;
    unitCopy.sp = unitCopy.maxSp;

    updatedUnits[selectedUnitIndex] = unitCopy;
    onUnitsChange(updatedUnits);
  };

  // パイロットステータス強化
  const upgradePilotStat = (stat: 'melee' | 'shooting' | 'defense' | 'hit' | 'evade') => {
    const cost = 2000;
    if (funds < cost) return;

    srwAudio.playSelect();
    onFundsChange(funds - cost);

    const updatedUnits = [...playerUnits];
    const unitCopy = { ...currentUnit };
    if (stat === 'melee') unitCopy.pilot.meleeSkill += 5;
    if (stat === 'shooting') unitCopy.pilot.shootingSkill += 5;
    if (stat === 'defense') unitCopy.pilot.defenseSkill += 5;
    if (stat === 'hit') unitCopy.pilot.hitSkill += 5;
    if (stat === 'evade') unitCopy.pilot.evadeSkill += 5;

    updatedUnits[selectedUnitIndex] = unitCopy;
    onUnitsChange(updatedUnits);
  };

  // セーブ処理
  const handleSave = () => {
    try {
      localStorage.setItem('srw_saved_units', JSON.stringify(playerUnits));
      localStorage.setItem('srw_saved_funds', funds.toString());
      localStorage.setItem('srw_saved_stage', currentStage.toString());
      srwAudio.playSelect();
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 2000);
    } catch {}
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden bg-slate-950 text-white ${
        isFullscreen ? 'max-w-none' : ''
      }`}
    >
      {/* --- ヘッダーバー --- */}
      <div className="z-20 w-full px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🛠️</span>
            <span className="font-black text-amber-400 tracking-wider text-sm sm:text-base">
              格納庫・インターミッション
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50 font-mono">
            STAGE {currentStage} クリア
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 font-mono font-bold text-emerald-400 text-sm">
            <span>💰</span>
            <span>{funds.toLocaleString()} G</span>
          </div>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveSuccessMsg ? 'セーブ完了!' : 'セーブ'}</span>
          </button>
        </div>
      </div>

      {/* --- メインコンテンツ領域 --- */}
      <div className="flex-1 w-full flex flex-col sm:flex-row overflow-hidden p-3 sm:p-4 gap-4">
        {/* 左サイド: 機体一覧リスト */}
        <div className="w-full sm:w-64 bg-slate-900/80 rounded-2xl border border-slate-800 p-3 flex flex-col space-y-2 overflow-y-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            UNIT ROSTER ({playerUnits.length})
          </span>
          {playerUnits.map((u, idx) => {
            const isSelected = selectedUnitIndex === idx;
            return (
              <button
                key={u.id}
                onClick={() => {
                  srwAudio.playSelect();
                  setSelectedUnitIndex(idx);
                }}
                className={`p-2.5 rounded-xl text-left flex items-center space-x-3 border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-md'
                    : 'bg-slate-850 hover:bg-slate-800/80 border-slate-700/50 text-slate-300'
                }`}
              >
                <div className="text-2xl">{u.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs truncate">{u.mechName}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {u.pilot.name} | HP {u.hp}/{u.maxHp}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            );
          })}
        </div>

        {/* 右メイン: 改造・強化パネル */}
        <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* タブ切り替え */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
              <button
                onClick={() => setActiveTab('mech_upgrade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'mech_upgrade'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                機体・武器改造
              </button>
              <button
                onClick={() => setActiveTab('pilot_training')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'pilot_training'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                パイロット能力養成
              </button>
            </div>

            {/* 機体概要ヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{currentUnit.icon}</div>
                <div>
                  <div className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
                    <span>{currentUnit.mechName}</span>
                    <span className="text-xs text-amber-400 font-mono">
                      Lv.{currentUnit.level}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    パイロット: {currentUnit.pilot.name} ({currentUnit.pilot.callsign})
                  </div>
                </div>
              </div>

              {Object.values(currentUnit.upgrades).every((lvl) => lvl >= 5) && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-extrabold flex items-center space-x-1.5 shadow-sm">
                  <span>✨</span>
                  <span>フル改造ボーナス発動中 (移動+1 / EN+50)</span>
                </div>
              )}
            </div>

            {/* --- タブ1: 機体・武器改造 --- */}
            {activeTab === 'mech_upgrade' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 各パラメータ改造バー */}
                {[
                  {
                    key: 'hp' as const,
                    label: '最大HP',
                    val: `${currentUnit.maxHp}`,
                    icon: '❤️',
                    delta: '+500',
                  },
                  {
                    key: 'en' as const,
                    label: '最大EN',
                    val: `${currentUnit.maxEn}`,
                    icon: '⚡',
                    delta: '+20',
                  },
                  {
                    key: 'armor' as const,
                    label: '装甲値',
                    val: `${currentUnit.armor}`,
                    icon: '🛡️',
                    delta: '+80',
                  },
                  {
                    key: 'mobility' as const,
                    label: '運動性',
                    val: `${currentUnit.mobility}`,
                    icon: '💨',
                    delta: '+6',
                  },
                  {
                    key: 'weapons' as const,
                    label: '全武器攻撃力',
                    val: `Lv.${currentUnit.upgrades.weapons}`,
                    icon: '⚔️',
                    delta: '+150',
                  },
                ].map((item) => {
                  const currentLvl = currentUnit.upgrades[item.key];
                  const cost = UPGRADE_COSTS[currentLvl] || 0;
                  const isMax = currentLvl >= 10;
                  const canAfford = funds >= cost && !isMax;

                  return (
                    <div
                      key={item.key}
                      className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-col space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                          <span className="font-mono text-emerald-400 ml-1">
                            [{item.val}]
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {isMax ? 'MAX' : `${cost.toLocaleString()} G`}
                        </span>
                      </div>

                      {/* 10段階ゲージ */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-2 rounded-sm ${
                              i < currentLvl
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm'
                                : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>

                      {/* 改造ボタン */}
                      <button
                        disabled={!canAfford}
                        onClick={() => upgradeStat(item.key)}
                        className={`py-1 rounded text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isMax ? '改造完了 (MAX)' : `改造する (${item.delta})`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* --- タブ2: パイロット能力養成 --- */}
            {activeTab === 'pilot_training' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'melee' as const, label: '格闘能力', val: currentUnit.pilot.meleeSkill, icon: '🥊' },
                  { key: 'shooting' as const, label: '射撃能力', val: currentUnit.pilot.shootingSkill, icon: '🎯' },
                  { key: 'defense' as const, label: '防御能力', val: currentUnit.pilot.defenseSkill, icon: '🛡️' },
                  { key: 'evade' as const, label: '回避能力', val: currentUnit.pilot.evadeSkill, icon: '🏃' },
                  { key: 'hit' as const, label: '命中能力', val: currentUnit.pilot.hitSkill, icon: '👁️' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                        {item.val}
                      </div>
                    </div>
                    <button
                      disabled={funds < 2000}
                      onClick={() => upgradePilotStat(item.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        funds >= 2000
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                          : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      +5 強化 (2,000G)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 出撃ボタン */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
            <button
              onClick={() => {
                srwAudio.playSelect();
                onStartNextStage();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm shadow-xl flex items-center space-x-2 transition cursor-pointer group"
            >
              <span>次の作戦へ出撃する！</span>
              <Play className="w-4 h-4 fill-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
