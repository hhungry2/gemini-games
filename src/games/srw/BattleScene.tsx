import React, { useState, useEffect, useRef } from 'react';
import { Unit, CombatAction, BattleResult } from './types';
import { srwAudio } from './srwAudio';
import { Swords, FastForward, SkipForward } from 'lucide-react';

interface BattleSceneProps {
  combat: CombatAction;
  onFinish: (result: BattleResult) => void;
  isFullscreen?: boolean;
}

type BattleSeq =
  | 'intro'           // 対峙 & パイロットカットイン
  | 'attacker_aim'    // 攻撃機構え & セリフ
  | 'attacker_fire'   // 武器発射演出
  | 'attacker_hit'    // 着弾・ダメージ・爆発
  | 'counter_check'   // 反撃判定
  | 'defender_aim'    // 反撃側構え
  | 'defender_fire'   // 反撃発射演出
  | 'defender_hit'    // 反撃着弾
  | 'result';         // 決着・経験値/資金

export const BattleScene: React.FC<BattleSceneProps> = ({
  combat,
  onFinish,
  isFullscreen = false,
}) => {
  const [seq, setSeq] = useState<BattleSeq>('intro');
  const [isFast, setIsFast] = useState<boolean>(false);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);

  // HPバーのローカルステート（スムーズアニメーション用）
  const [attackerHp, setAttackerHp] = useState<number>(combat.attacker.hp);
  const [defenderHp, setDefenderHp] = useState<number>(combat.defender.hp);

  // カットインテキスト
  const [dialogText, setDialogText] = useState<string>('');
  const [activePilot, setActivePilot] = useState<Unit>(combat.attacker);
  const [damagePopup, setDamagePopup] = useState<{
    text: string;
    isCrit?: boolean;
    isMiss?: boolean;
    side: 'left' | 'right';
  } | null>(null);

  // アニメーション用フラグ
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [screenFlash, setScreenFlash] = useState<boolean>(false);
  const [novaBackground, setNovaBackground] = useState<boolean>(false);
  const [weaponAnim, setWeaponAnim] = useState<string | null>(null);
  const [explodingUnit, setExplodingUnit] = useState<'left' | 'right' | null>(null);

  // 戦闘計算の確定結果を保持
  const battleResultRef = useRef<BattleResult>({
    attackerHit: false,
    attackerCrit: false,
    attackerDamage: 0,
    defenderDied: false,
    expGained: 0,
    fundsGained: 0,
  });

  const speedMultiplier = isFast ? 0.5 : 1.0;

  // 初期計算
  useEffect(() => {
    // 攻撃側の命中判定
    const roll1 = Math.random() * 100;
    const attackerHit = roll1 <= combat.attackerHitChance;
    const rollCrit1 = Math.random() * 100;
    const attackerCrit = attackerHit && rollCrit1 <= 20;

    let dmg1 = 0;
    if (attackerHit) {
      dmg1 = combat.attackerEstimatedDamage;
      if (attackerCrit) dmg1 = Math.round(dmg1 * 1.3);
      if (combat.defenderAction === 'defend') dmg1 = Math.round(dmg1 * 0.5);
      if (combat.defenderAction === 'evade') dmg1 = Math.round(dmg1 * 0.8);
      dmg1 = Math.max(10, dmg1 + Math.floor((Math.random() - 0.5) * 100));
    }

    const defenderRemainingHp = Math.max(0, combat.defender.hp - dmg1);
    const defenderDied = defenderRemainingHp <= 0;

    // 反撃判定（防御側が生きていて、反撃武器があり、defend/evadeでない場合）
    let defenderHit = false;
    let defenderCrit = false;
    let dmg2 = 0;
    let attackerDied = false;

    if (!defenderDied && combat.defenderAction === 'counter' && combat.counterWeapon) {
      const roll2 = Math.random() * 100;
      defenderHit = roll2 <= combat.defenderHitChance;
      const rollCrit2 = Math.random() * 100;
      defenderCrit = defenderHit && rollCrit2 <= 20;
      if (defenderHit) {
        dmg2 = combat.defenderEstimatedDamage;
        if (defenderCrit) dmg2 = Math.round(dmg2 * 1.3);
        dmg2 = Math.max(10, dmg2 + Math.floor((Math.random() - 0.5) * 100));
      }
      const attackerRemainingHp = Math.max(0, combat.attacker.hp - dmg2);
      attackerDied = attackerRemainingHp <= 0;
    }

    // 報酬計算
    let expGained = 0;
    let fundsGained = 0;
    if (combat.attacker.faction === 'player') {
      expGained = defenderDied ? 300 : 80;
      fundsGained = defenderDied ? (combat.defender.isBoss ? 8000 : 2500) : 400;
      if (combat.attacker.activeBuffs.fortune) fundsGained *= 2;
    } else if (combat.defender.faction === 'player' && defenderHit) {
      expGained = attackerDied ? 300 : 70;
      fundsGained = attackerDied ? (combat.attacker.isBoss ? 8000 : 2000) : 300;
    }

    battleResultRef.current = {
      attackerHit,
      attackerCrit,
      attackerDamage: dmg1,
      defenderDied,
      defenderHit,
      defenderCrit,
      defenderDamage: dmg2,
      attackerDied,
      expGained,
      fundsGained,
    };

    // BGM再生
    const isBoss = combat.attacker.isBoss || combat.defender.isBoss;
    srwAudio.playBgm(isBoss ? 'boss_battle' : 'battle');

    // 戦闘シーケンス開始
    runSequence();

    return () => {
      clearAllTimers();
    };
  }, []);

  const timeoutIdsRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  };

  const safeTimeout = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      if (!isSkipped) fn();
    }, delay);
    timeoutIdsRef.current.push(id);
    return id;
  };

  // 即時スキップ処理
  const handleSkip = () => {
    if (isSkipped) return;
    setIsSkipped(true);
    clearAllTimers();
    srwAudio.stopBgm();
    onFinish(battleResultRef.current);
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter') {
        handleSkip();
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFast((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSkipped]);

  // シーケンス進行タイマー
  const runSequence = () => {
    const res = battleResultRef.current;
    const weapon = combat.weapon;
    const attackerLines = combat.attacker.pilot.lines.attack;
    const randomLine = attackerLines[Math.floor(Math.random() * attackerLines.length)];

    // 1. intro: パイロットセリフと対峙
    setSeq('intro');
    setActivePilot(combat.attacker);
    setDialogText(randomLine);

    safeTimeout(() => {
      if (isSkipped) return;
      // 2. 構え・発射
      setSeq('attacker_fire');
      setWeaponAnim(weapon.animationKey);
      if (weapon.animationKey === 'nova') {
        setNovaBackground(true);
        srwAudio.playNova();
      } else if (weapon.type === 'beam') {
        srwAudio.playBeam();
      } else if (weapon.type === 'missile') {
        srwAudio.playVulcan();
      } else if (weapon.type === 'melee') {
        srwAudio.playSlash();
      }

      safeTimeout(() => {
        if (isSkipped) return;
        // 3. 着弾
        setSeq('attacker_hit');
        if (res.attackerHit) {
          setScreenShake(true);
          setScreenFlash(true);
          safeTimeout(() => {
            setScreenShake(false);
            setScreenFlash(false);
          }, 300);

          if (weapon.animationKey === 'nova') {
            srwAudio.playBigExplosion();
          } else {
            srwAudio.playExplosion();
          }

          setDamagePopup({
            text: res.attackerDamage.toString(),
            isCrit: res.attackerCrit,
            side: 'right',
          });

          // HP減少
          setDefenderHp((prev) => Math.max(0, prev - res.attackerDamage));

          if (res.defenderDied) {
            setExplodingUnit('right');
            srwAudio.playExplosion(true);
          }
        } else {
          // 回避
          setDamagePopup({
            text: 'MISS!',
            isMiss: true,
            side: 'right',
          });
        }

        safeTimeout(() => {
          if (isSkipped) return;
          setWeaponAnim(null);
          setNovaBackground(false);
          setDamagePopup(null);

          // 4. 反撃チェック
          if (!res.defenderDied && combat.defenderAction === 'counter' && combat.counterWeapon) {
            // 反撃へ
            setSeq('defender_aim');
            setActivePilot(combat.defender);
            const defLines = combat.defender.pilot.lines.attack;
            setDialogText(defLines[Math.floor(Math.random() * defLines.length)]);

            safeTimeout(() => {
              if (isSkipped) return;
              setSeq('defender_fire');
              setWeaponAnim(combat.counterWeapon!.animationKey);
              if (combat.counterWeapon!.type === 'beam') srwAudio.playBeam();
              else if (combat.counterWeapon!.type === 'melee') srwAudio.playSlash();
              else srwAudio.playVulcan();

              safeTimeout(() => {
                if (isSkipped) return;
                setSeq('defender_hit');
                if (res.defenderHit) {
                  setScreenShake(true);
                  safeTimeout(() => setScreenShake(false), 250);
                  srwAudio.playExplosion();
                  setDamagePopup({
                    text: res.defenderDamage!.toString(),
                    isCrit: res.defenderCrit,
                    side: 'left',
                  });
                  setAttackerHp((prev) => Math.max(0, prev - res.defenderDamage!));
                  if (res.attackerDied) {
                    setExplodingUnit('left');
                    srwAudio.playExplosion(true);
                  }
                } else {
                  setDamagePopup({
                    text: 'MISS!',
                    isMiss: true,
                    side: 'left',
                  });
                }

                safeTimeout(() => {
                  if (isSkipped) return;
                  finishBattle();
                }, 1200 * speedMultiplier);
              }, 600 * speedMultiplier);
            }, 800 * speedMultiplier);
          } else {
            finishBattle();
          }
        }, 1200 * speedMultiplier);
      }, 700 * speedMultiplier);
    }, 1400 * speedMultiplier);
  };

  const finishBattle = () => {
    setSeq('result');
    safeTimeout(() => {
      srwAudio.stopBgm();
      onFinish(battleResultRef.current);
    }, 900 * speedMultiplier);
  };

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden flex flex-col justify-between ${
        isFullscreen ? 'max-w-none' : ''
      } ${
        novaBackground
          ? 'bg-slate-950'
          : 'bg-gradient-to-b from-indigo-950 via-slate-900 to-black'
      } ${screenShake ? 'translate-x-1 translate-y-1' : ''}`}
    >
      {/* 画面フラッシュ */}
      {screenFlash && (
        <div className="absolute inset-0 bg-white/40 pointer-events-none z-50 animate-out fade-out duration-300" />
      )}

      {/* --- 上部ステータスバー --- */}
      <div className="z-20 w-full px-4 py-2 bg-slate-950/80 backdrop-blur border-b border-slate-700/80 flex items-center justify-between text-xs sm:text-sm">
        {/* 攻撃側ステータス (左) */}
        <div className="flex items-center space-x-3 w-5/12">
          <span className="text-2xl">{combat.attacker.pilot.portrait}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white truncate">
                {combat.attacker.mechName}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  combat.attacker.faction === 'player'
                    ? 'bg-blue-600/80 text-blue-100'
                    : 'bg-rose-600/80 text-rose-100'
                }`}
              >
                {combat.attacker.pilot.name}
              </span>
            </div>
            {/* HPバー */}
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-400">HP</span>
              <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (attackerHp / combat.attacker.maxHp) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold min-w-[55px] text-right">
                {attackerHp}/{combat.attacker.maxHp}
              </span>
            </div>
          </div>
        </div>

        {/* 中央: 武器表示 & スキップ操作 */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className="text-amber-400 font-extrabold text-xs sm:text-base tracking-wider flex items-center space-x-1">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>{combat.weapon.name}</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <button
              onClick={() => setIsFast(!isFast)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                isFast
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FastForward className="w-3 h-3" />
              <span>{isFast ? 'FAST x2' : 'NORMAL'}</span>
            </button>
            <button
              onClick={handleSkip}
              className="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 shadow transition cursor-pointer"
            >
              <SkipForward className="w-3 h-3" />
              <span>SKIP</span>
            </button>
          </div>
        </div>

        {/* 防御側ステータス (右) */}
        <div className="flex items-center justify-end space-x-3 w-5/12 text-right">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-end space-x-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  combat.defender.faction === 'player'
                    ? 'bg-blue-600/80 text-blue-100'
                    : 'bg-rose-600/80 text-rose-100'
                }`}
              >
                {combat.defender.pilot.name}
              </span>
              <span className="font-bold text-white truncate">
                {combat.defender.mechName}
              </span>
            </div>
            {/* HPバー */}
            <div className="flex items-center justify-end space-x-1.5 mt-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold min-w-[55px] text-left">
                {defenderHp}/{combat.defender.maxHp}
              </span>
              <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (defenderHp / combat.defender.maxHp) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">HP</span>
            </div>
          </div>
          <span className="text-2xl">{combat.defender.pilot.portrait}</span>
        </div>
      </div>

      {/* --- 中央ステージ (ロボットアニメーション) --- */}
      <div
        onClick={handleSkip}
        className="relative flex-1 w-full flex items-center justify-between px-8 sm:px-16 overflow-hidden cursor-pointer"
        title="クリックで戦闘をスキップ"
      >
        {/* 背景の宇宙・星雲エフェクト */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl" />
          {/* 流れる星々 */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
        </div>

        {/* 左機体 (攻撃機またはプレイヤー機) */}
        <div
          className={`relative flex flex-col items-center transition-all duration-500 z-10 ${
            explodingUnit === 'left' ? 'scale-0 opacity-0 duration-700' : ''
          } ${
            seq === 'attacker_fire'
              ? 'translate-x-12 scale-110'
              : seq === 'defender_hit' && damagePopup?.side === 'left'
              ? '-translate-x-6'
              : ''
          }`}
        >
          {/* 精神バフバッジ */}
          {combat.attacker.activeBuffs.hotBlood && (
            <span className="absolute -top-7 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-extrabold animate-bounce shadow">
              熱血発動中!
            </span>
          )}
          {/* ロボットアイコン・グラフィック */}
          <div className={`${isFullscreen ? 'w-32 h-32 sm:w-48 sm:h-48 text-6xl sm:text-8xl' : 'w-24 h-24 sm:w-36 sm:h-36 text-5xl sm:text-7xl'} rounded-2xl flex items-center justify-center bg-slate-800/80 border-2 border-blue-500/50 shadow-2xl shadow-blue-500/30 relative group`}>
            {combat.attacker.icon}
            {/* ブースト噴射炎 */}
            <div className="absolute -bottom-2 -left-2 w-8 h-4 bg-cyan-400 rounded-full blur-sm opacity-80 animate-pulse" />
          </div>
          <span className="mt-2 text-xs sm:text-sm font-bold text-blue-300 drop-shadow">
            {combat.attacker.mechName}
          </span>
        </div>

        {/* 中央の激突エフェクト / ビーム / 弾道 */}
        <div className="absolute inset-x-0 h-32 flex items-center justify-center pointer-events-none z-20">
          {weaponAnim === 'cannon' && (
            <div className="w-full h-8 bg-gradient-to-r from-cyan-400 via-white to-blue-500 rounded-full blur-xs animate-pulse shadow-[0_0_30px_#38bdf8]" />
          )}
          {weaponAnim === 'rifle' && (
            <div className="w-3/4 h-3 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full shadow-[0_0_20px_#f59e0b]" />
          )}
          {weaponAnim === 'slash' && (
            <div className="w-48 h-48 border-t-8 border-r-8 border-rose-500 rounded-full rotate-45 animate-ping opacity-80" />
          )}
          {weaponAnim === 'punch' && (
            <div className="text-6xl animate-bounce">👊💥</div>
          )}
          {weaponAnim === 'nova' && (
            <div className="w-96 h-96 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-white animate-ping opacity-90 blur-sm" />
          )}
        </div>

        {/* ダメージポップアップ */}
        {damagePopup && (
          <div
            className={`absolute top-1/3 z-40 transform -translate-y-8 animate-in zoom-in duration-200 ${
              damagePopup.side === 'left' ? 'left-24 sm:left-40' : 'right-24 sm:right-40'
            }`}
          >
            {damagePopup.isMiss ? (
              <span className="text-3xl sm:text-5xl font-extrabold text-cyan-400 drop-shadow-[0_2px_10px_#06b6d4] tracking-wider">
                MISS!!
              </span>
            ) : (
              <div className="flex flex-col items-center">
                {damagePopup.isCrit && (
                  <span className="text-sm sm:text-lg font-black text-amber-300 animate-pulse tracking-widest">
                    CRITICAL HIT!!
                  </span>
                )}
                <span className="text-4xl sm:text-6xl font-black text-red-500 drop-shadow-[0_4px_12px_#000000] tracking-tighter">
                  -{damagePopup.text}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 右機体 (防御機または敵機) */}
        <div
          className={`relative flex flex-col items-center transition-all duration-500 z-10 ${
            explodingUnit === 'right' ? 'scale-0 opacity-0 duration-700' : ''
          } ${
            seq === 'defender_fire'
              ? '-translate-x-12 scale-110'
              : seq === 'attacker_hit' && damagePopup?.side === 'right'
              ? 'translate-x-6'
              : ''
          }`}
        >
          {combat.defender.activeBuffs.ironWall && (
            <span className="absolute -top-7 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-extrabold animate-bounce shadow">
              鉄壁防御中!
            </span>
          )}
          <div className={`${isFullscreen ? 'w-32 h-32 sm:w-48 sm:h-48 text-6xl sm:text-8xl' : 'w-24 h-24 sm:w-36 sm:h-36 text-5xl sm:text-7xl'} rounded-2xl flex items-center justify-center bg-slate-800/80 border-2 border-rose-500/50 shadow-2xl shadow-rose-500/30 relative group`}>
            {combat.defender.icon}
            {/* ボスオーラ */}
            {combat.defender.isBoss && (
              <div className="absolute -inset-1 rounded-2xl bg-purple-600/30 blur animate-pulse" />
            )}
          </div>
          <span className="mt-2 text-xs sm:text-sm font-bold text-rose-300 drop-shadow">
            {combat.defender.mechName}
          </span>
        </div>
      </div>

      {/* --- 下部パイロットカットイン & セリフ --- */}
      <div className="z-30 w-full bg-slate-950/95 border-t-2 border-amber-500/60 p-3 sm:p-4 flex items-center space-x-4 shadow-2xl">
        {/* パイロットアバター */}
        <div className="relative">
          <div
            className="w-14 h-14 sm:w-18 sm:h-18 rounded-xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border-2"
            style={{
              backgroundColor: `${activePilot.pilot.color}22`,
              borderColor: activePilot.pilot.color,
            }}
          >
            {activePilot.pilot.portrait}
          </div>
          <span className="absolute -bottom-2 -right-1 bg-slate-900 border border-slate-700 text-[9px] px-1 py-0.2 rounded font-mono font-bold text-slate-300">
            {activePilot.pilot.callsign}
          </span>
        </div>

        {/* パイロット名 & セリフ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span
              className="text-xs sm:text-sm font-black tracking-wider"
              style={{ color: activePilot.pilot.color }}
            >
              {activePilot.pilot.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              [気力 {activePilot.morale}]
            </span>
            <span className="text-[9px] text-slate-500 ml-auto hidden sm:inline-block">
              (画面クリック / Spaceでスキップ)
            </span>
          </div>
          <p className="mt-1 text-sm sm:text-base font-bold text-white leading-relaxed font-sans animate-in fade-in duration-150">
            「{dialogText}」
          </p>
        </div>
      </div>
    </div>
  );
};
