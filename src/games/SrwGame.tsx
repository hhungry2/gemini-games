import React, { useState, useEffect, useRef } from 'react';
import {
  Unit,
  GamePhase,
  CombatAction,
  BattleResult,
  DialogMessage,
  SpiritType,
} from './srw/types';
import { STAGES_DATA } from './srw/stagesData';
import {
  createUnitInstance,
  TERRAIN_DATA,
  calculateCombatForecast,
} from './srw/unitsData';
import { srwAudio } from './srw/srwAudio';
import { TacticsMap } from './srw/TacticsMap';
import { BattleScene } from './srw/BattleScene';
import { Intermission } from './srw/Intermission';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface SrwGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

export const SRW_HIGH_STAGE_KEY = 'srw_high_stage_v1';
export const SRW_TOTAL_KILLS_KEY = 'srw_total_kills_v1';
export const SRW_MAX_FUNDS_KEY = 'srw_max_funds_v1';

export const SrwGame: React.FC<SrwGameProps> = ({
  onBackToHub,
  isDark: _isDark,
  isFullscreen = false,
}) => {
  // --- ゲームフェーズ ---
  const [phase, setPhase] = useState<GamePhase>('dialog');
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [turn, setTurn] = useState<number>(1);
  const [funds, setFunds] = useState<number>(10000);
  const [totalKills, setTotalKills] = useState<number>(0);

  // --- ユニット群 ---
  const [playerUnits, setPlayerUnits] = useState<Unit[]>([]);
  const [enemyUnits, setEnemyUnits] = useState<Unit[]>([]);

  // 敵フェイズ中の行動進行を追跡するRef
  const enemyPhaseIndexRef = useRef<number>(-1);
  const enemyPhaseActiveRef = useRef<boolean>(false);

  // --- 戦闘演出ステート ---
  const [currentCombat, setCurrentCombat] = useState<CombatAction | null>(null);

  // --- 会話イベントステート ---
  const [dialogQueue, setDialogQueue] = useState<DialogMessage[]>([]);
  const [currentDialogIndex, setCurrentDialogIndex] = useState<number>(0);
  const [dialogPostAction, setDialogPostAction] = useState<(() => void) | null>(null);

  // --- 音声ミュート ---
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const currentStage = STAGES_DATA[currentStageIndex];

  // ステージ初期化
  const initStage = (stageIdx: number, carryOverUnits?: Unit[], carryOverFunds?: number) => {
    const stg = STAGES_DATA[stageIdx];
    if (!stg) return;

    // プレイヤーユニット初期化 (引き継ぎまたは新規)
    let pUnits: Unit[] = [];
    if (carryOverUnits && carryOverUnits.length > 0) {
      // 座標をステージ初期位置に合わせてリセット
      pUnits = stg.playerUnits.map((pu, i) => {
        const existing = carryOverUnits.find((u) => u.id === pu.unitId) || carryOverUnits[i];
        if (existing) {
          return {
            ...existing,
            x: pu.x,
            y: pu.y,
            hp: existing.maxHp,
            en: existing.maxEn,
            sp: existing.maxSp,
            hasMoved: false,
            hasActed: false,
            activeBuffs: {},
          };
        }
        return createUnitInstance(pu.unitId, 'player', pu.x, pu.y);
      });
    } else {
      pUnits = stg.playerUnits.map((pu) =>
        createUnitInstance(pu.unitId, 'player', pu.x, pu.y)
      );
    }

    // 敵ユニット初期化
    const eUnits = stg.enemyUnits.map((eu) =>
      createUnitInstance(eu.unitId, 'enemy', eu.x, eu.y)
    );

    setPlayerUnits(pUnits);
    setEnemyUnits(eUnits);
    setTurn(1);
    enemyPhaseActiveRef.current = false;
    enemyPhaseIndexRef.current = -1;
    if (carryOverFunds !== undefined) setFunds(carryOverFunds);

    // オープニング会話がある場合は会話へ、なければプレイヤーフェイズへ
    if (stg.openingDialog && stg.openingDialog.length > 0) {
      setDialogQueue(stg.openingDialog);
      setCurrentDialogIndex(0);
      setDialogPostAction(() => () => {
        setPhase('player_phase');
        srwAudio.playBgm('map');
      });
      setPhase('dialog');
    } else {
      setPhase('player_phase');
      srwAudio.playBgm('map');
    }
  };

  // 初回マウント時
  useEffect(() => {
    initStage(0);
    return () => {
      srwAudio.stopBgm();
    };
  }, []);

  // ミュート切り替え
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    srwAudio.setMuted(nextMute);
  };

  // 会話送り
  const handleNextDialog = () => {
    srwAudio.playCursor();
    if (currentDialogIndex + 1 < dialogQueue.length) {
      setCurrentDialogIndex((prev) => prev + 1);
    } else {
      // 会話終了
      setDialogQueue([]);
      setCurrentDialogIndex(0);
      if (dialogPostAction) {
        dialogPostAction();
        setDialogPostAction(null);
      }
    }
  };

  // キーボードで会話送り
  useEffect(() => {
    if (phase !== 'dialog') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleNextDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentDialogIndex, dialogQueue]);

  // 戦闘突入
  const handleInitiateCombat = (combat: CombatAction) => {
    setCurrentCombat(combat);
    setPhase('battle');
  };

  // 戦闘演出終了・結果反映
  const handleBattleFinish = (result: BattleResult) => {
    if (!currentCombat) return;

    const { attacker, defender } = currentCombat;
    let newKills = totalKills;

    // 攻撃側のHP反映
    if (result.defenderHit && result.defenderDamage) {
      attacker.hp = Math.max(0, attacker.hp - result.defenderDamage);
    }
    // 防御側のHP反映
    if (result.attackerHit && result.attackerDamage) {
      defender.hp = Math.max(0, defender.hp - result.attackerDamage);
    }

    // 精神バフの精緻な消費管理
    // 1. 熱血: 攻撃実行で消費
    if (attacker.activeBuffs.hotBlood) delete attacker.activeBuffs.hotBlood;
    // 2. 必中: 攻撃実行で消費
    if (attacker.activeBuffs.sureHit) delete attacker.activeBuffs.sureHit;
    // 3. ひらめき: 回避成功または被攻撃で消費
    if (defender.activeBuffs.flash) delete defender.activeBuffs.flash;
    if (attacker.activeBuffs.flash && result.defenderHit === false) delete attacker.activeBuffs.flash;
    // 4. 幸運: 敵撃破時のみ消費
    if (result.defenderDied && attacker.activeBuffs.fortune) delete attacker.activeBuffs.fortune;
    // (※ 鉄壁・集中は1ターン持続するため戦闘後も維持し、ターン開始時にリセット)

    // 気力上昇
    attacker.morale = Math.min(150, attacker.morale + (result.attackerHit ? 2 : 1));
    defender.morale = Math.min(150, defender.morale + 1);

    // 撃破判定
    let updatedPlayerUnits = [...playerUnits];
    let updatedEnemyUnits = [...enemyUnits];

    if (result.defenderDied) {
      if (defender.faction === 'enemy') {
        updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== defender.id);
        newKills += 1;
        attacker.morale = Math.min(150, attacker.morale + 3);
      } else {
        updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== defender.id);
      }
    }

    if (result.attackerDied) {
      if (attacker.faction === 'player') {
        updatedPlayerUnits = updatedPlayerUnits.filter((u) => u.id !== attacker.id);
      } else {
        updatedEnemyUnits = updatedEnemyUnits.filter((u) => u.id !== attacker.id);
        newKills += 1;
      }
    }

    // 行動終了に設定
    attacker.hasActed = true;
    attacker.hasMoved = true;

    // 獲得資金・EXP
    if (result.fundsGained > 0) {
      setFunds((prev) => prev + result.fundsGained);
    }
    if (result.expGained > 0 && attacker.faction === 'player') {
      attacker.exp += result.expGained;
      if (attacker.exp >= 500) {
        attacker.level += 1;
        attacker.exp -= 500;
        attacker.maxHp += 200;
        attacker.maxEn += 10;
        attacker.pilot.meleeSkill += 3;
        attacker.pilot.shootingSkill += 3;
      }
    }

    setTotalKills(newKills);
    setPlayerUnits(updatedPlayerUnits);
    setEnemyUnits(updatedEnemyUnits);
    setCurrentCombat(null);

    // 1. 敗北条件チェック (味方全滅)
    if (updatedPlayerUnits.length === 0) {
      srwAudio.stopBgm();
      enemyPhaseActiveRef.current = false;
      enemyPhaseIndexRef.current = -1;
      setPhase('game_over');
      return;
    }

    // 2. ステージごとの勝利条件チェック
    const isStage1Clear = currentStageIndex === 0 && updatedEnemyUnits.length === 0;
    const isStage2BossKilled =
      currentStageIndex === 1 &&
      ((defender.id === 'dis_garm' && result.defenderDied) ||
        (attacker.id === 'dis_garm' && result.attackerDied) ||
        updatedEnemyUnits.length === 0);
    const isStage3BossKilled =
      currentStageIndex === 2 &&
      ((defender.id === 'neo_genesis' && result.defenderDied) ||
        (attacker.id === 'neo_genesis' && result.attackerDied) ||
        !updatedEnemyUnits.some((u) => u.id === 'neo_genesis'));

    if (isStage1Clear || isStage2BossKilled || isStage3BossKilled) {
      enemyPhaseActiveRef.current = false;
      enemyPhaseIndexRef.current = -1;
      handleStageClear(updatedPlayerUnits);
      return;
    }

    // 3. 戦闘後フェイズ復帰 (敵フェイズ継続またはプレイヤーターン復帰)
    if (enemyPhaseActiveRef.current && enemyPhaseIndexRef.current >= 0) {
      // 敵フェイズ中なので、次の敵の行動へ進める
      setPhase('enemy_phase');
      srwAudio.playBgm('enemy');
      const nextEnemyIndex = enemyPhaseIndexRef.current + 1;
      setTimeout(() => {
        stepNextEnemy(nextEnemyIndex, updatedEnemyUnits, updatedPlayerUnits);
      }, 500);
    } else {
      // プレイヤーフェイズ復帰
      setPhase('player_phase');
      srwAudio.playBgm('map');
    }
  };

  // ステージクリア処理
  const handleStageClear = (_clearedPlayerUnits: Unit[]) => {
    srwAudio.stopBgm();
    const stg = currentStage;

    // ハイスコア更新
    try {
      localStorage.setItem(SRW_HIGH_STAGE_KEY, (currentStageIndex + 1).toString());
      localStorage.setItem(SRW_TOTAL_KILLS_KEY, totalKills.toString());
      localStorage.setItem(SRW_MAX_FUNDS_KEY, funds.toString());
    } catch {}

    // エンディング会話
    if (stg.endingDialog && stg.endingDialog.length > 0) {
      setDialogQueue(stg.endingDialog);
      setCurrentDialogIndex(0);
      setDialogPostAction(() => () => {
        if (currentStageIndex + 1 >= STAGES_DATA.length) {
          // 全ステージ制覇！
          setPhase('all_clear');
        } else {
          // インターミッションへ
          setPhase('intermission');
          srwAudio.playBgm('intermission');
        }
      });
      setPhase('dialog');
    } else {
      if (currentStageIndex + 1 >= STAGES_DATA.length) {
        setPhase('all_clear');
      } else {
        setPhase('intermission');
        srwAudio.playBgm('intermission');
      }
    }
  };

  // 待機アクション
  const handleUnitWait = (unitId: string) => {
    setPlayerUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, hasActed: true, hasMoved: true } : u))
    );
  };

  // 修理アクション
  const handleUnitRepair = (actorId: string, targetId: string) => {
    srwAudio.playSelect();
    setPlayerUnits((prev) =>
      prev.map((u) => {
        if (u.id === targetId) {
          const healedHp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.4));
          return { ...u, hp: healedHp };
        }
        if (u.id === actorId) {
          return { ...u, hasActed: true, hasMoved: true };
        }
        return u;
      })
    );
  };

  // 補給アクション
  const handleUnitResupply = (actorId: string, targetId: string) => {
    srwAudio.playSelect();
    setPlayerUnits((prev) =>
      prev.map((u) => {
        if (u.id === targetId) {
          return { ...u, en: u.maxEn };
        }
        if (u.id === actorId) {
          return { ...u, hasActed: true, hasMoved: true };
        }
        return u;
      })
    );
  };

  // 精神コマンド適用
  const handleApplySpirit = (unitId: string, spirit: SpiritType) => {
    setPlayerUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const copy = { ...u, activeBuffs: { ...u.activeBuffs } };
        if (spirit === 'hotBlood') copy.activeBuffs.hotBlood = true;
        if (spirit === 'flash') copy.activeBuffs.flash = true;
        if (spirit === 'sureHit') copy.activeBuffs.sureHit = true;
        if (spirit === 'ironWall') copy.activeBuffs.ironWall = true;
        if (spirit === 'focus') copy.activeBuffs.focus = true;
        if (spirit === 'accel') copy.activeBuffs.accel = true;
        if (spirit === 'fortune') copy.activeBuffs.fortune = true;
        if (spirit === 'guts') copy.hp = Math.min(copy.maxHp, copy.hp + Math.round(copy.maxHp * 0.35));
        if (spirit === 'greatGuts') copy.hp = copy.maxHp;
        if (spirit === 'moraleUp') copy.morale = Math.min(150, copy.morale + 10);
        return copy;
      })
    );
  };

  // プレイヤーターン終了 → エネミーターン実行
  const handleEndPlayerTurn = () => {
    setPhase('enemy_phase');
    srwAudio.playBgm('enemy');
    enemyPhaseActiveRef.current = true;
    enemyPhaseIndexRef.current = 0;

    // 敵思考＆行動シーケンス開始
    setTimeout(() => {
      stepNextEnemy(0, enemyUnits, playerUnits);
    }, 600);
  };

  // 敵AIターン実行 (1体ずつ順次処理)
  const stepNextEnemy = (
    stepIndex: number,
    currentEnemies: Unit[],
    currentPlayers: Unit[]
  ) => {
    if (stepIndex >= currentEnemies.length || currentPlayers.length === 0) {
      // 全敵行動完了 → 次プレイヤーターンへ
      enemyPhaseActiveRef.current = false;
      enemyPhaseIndexRef.current = -1;
      endEnemyTurn(currentPlayers, currentEnemies);
      return;
    }

    enemyPhaseIndexRef.current = stepIndex;
    const enemy = currentEnemies[stepIndex];

    if (!enemy || enemy.hp <= 0) {
      stepNextEnemy(stepIndex + 1, currentEnemies, currentPlayers);
      return;
    }

    // 最も近い生存プレイヤーユニットを探索
    let targetPlayer: Unit | null = null;
    let minDistance = 999;
    for (const p of currentPlayers) {
      if (p.hp <= 0) continue;
      const dist = Math.abs(p.x - enemy.x) + Math.abs(p.y - enemy.y);
      if (dist < minDistance) {
        minDistance = dist;
        targetPlayer = p;
      }
    }

    if (!targetPlayer) {
      stepNextEnemy(stepIndex + 1, currentEnemies, currentPlayers);
      return;
    }

    // 敵の移動処理 (目標プレイヤーに近づく)
    const dx = targetPlayer.x - enemy.x;
    const dy = targetPlayer.y - enemy.y;
    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    const newX = Math.max(0, Math.min(currentStage.mapWidth - 1, enemy.x + stepX));
    const newY = Math.max(0, Math.min(currentStage.mapHeight - 1, enemy.y + stepY));

    // 移動先マスが他のユニットと重複しないか確認
    const isOccupied =
      currentPlayers.some((p) => p.x === newX && p.y === newY) ||
      currentEnemies.some((e) => e.id !== enemy.id && e.x === newX && e.y === newY);

    if (!isOccupied) {
      enemy.x = newX;
      enemy.y = newY;
    }

    // 敵座標変更をstateに反映
    setEnemyUnits([...currentEnemies]);

    // 射程内の使用可能武器を探す
    const finalDist = Math.abs(targetPlayer.x - enemy.x) + Math.abs(targetPlayer.y - enemy.y);
    const readyWeapon = enemy.weapons.find(
      (w) => finalDist >= w.minRange && finalDist <= w.maxRange && enemy.en >= w.enCost
    );

    if (readyWeapon) {
      // 敵からの攻撃発生！
      const enemyTerrain = TERRAIN_DATA[currentStage.terrainGrid[enemy.y]?.[enemy.x] || 'plain'];
      const playerTerrain = TERRAIN_DATA[currentStage.terrainGrid[targetPlayer.y]?.[targetPlayer.x] || 'plain'];

      const eForecast = calculateCombatForecast(
        enemy,
        targetPlayer,
        readyWeapon,
        enemyTerrain,
        playerTerrain
      );

      // プレイヤー側の反撃武器
      const pCounterWpn = targetPlayer.weapons.find(
        (w) => finalDist >= w.minRange && finalDist <= w.maxRange && targetPlayer!.en >= w.enCost
      );

      let pForecast = { hitChance: 0, estimatedDamage: 0 };
      if (pCounterWpn) {
        pForecast = calculateCombatForecast(
          targetPlayer,
          enemy,
          pCounterWpn,
          playerTerrain,
          enemyTerrain
        );
      }

      const combat: CombatAction = {
        attacker: enemy,
        defender: targetPlayer,
        weapon: readyWeapon,
        counterWeapon: pCounterWpn,
        defenderAction: pCounterWpn ? 'counter' : 'defend',
        attackerHitChance: eForecast.hitChance,
        attackerEstimatedDamage: eForecast.estimatedDamage,
        defenderHitChance: pForecast.hitChance,
        defenderEstimatedDamage: pForecast.estimatedDamage,
        isCounter: true,
      };

      // 敵EN消費
      enemy.en = Math.max(0, enemy.en - readyWeapon.enCost);

      handleInitiateCombat(combat);
      // ※戦闘終了後は handleBattleFinish から stepNextEnemy(stepIndex + 1, ...) が呼ばれる
    } else {
      // 射程外の場合は少しウェイトを入れて次の敵へ
      setTimeout(() => {
        stepNextEnemy(stepIndex + 1, currentEnemies, currentPlayers);
      }, 250);
    }
  };

  // 敵フェイズ終了 → 次プレイヤーターンへ
  const endEnemyTurn = (pUnits: Unit[], eUnits: Unit[]) => {
    const nextTurn = turn + 1;
    let finalEnemyUnits = [...eUnits];

    // 増援判定
    const reinforcement = currentStage.reinforcements?.find((r) => r.turn === nextTurn);
    if (reinforcement && reinforcement.enemies) {
      const spawnedEnemies = reinforcement.enemies.map((eu) =>
        createUnitInstance(eu.unitId, 'enemy', eu.x, eu.y)
      );
      finalEnemyUnits = [...finalEnemyUnits, ...spawnedEnemies];
    }

    // 基地回復 & ターン開始時更新 (1ターン持続バフのリセット)
    const nextPlayerUnits = pUnits.map((u) => {
      const terrain = currentStage.terrainGrid[u.y]?.[u.x] || 'plain';
      const healRate = TERRAIN_DATA[terrain]?.healRate || 0;
      return {
        ...u,
        hasMoved: false,
        hasActed: false,
        // 鉄壁・集中・加速などのターン持続バフをリセット（幸運は撃破まで維持）
        activeBuffs: {
          fortune: u.activeBuffs.fortune,
        },
        hp: Math.min(u.maxHp, u.hp + Math.round(u.maxHp * healRate)),
        en: Math.min(u.maxEn, u.en + 10 + Math.round(u.maxEn * healRate)),
        sp: Math.min(u.maxSp, u.sp + 5),
      };
    });

    setPlayerUnits(nextPlayerUnits);
    setEnemyUnits(finalEnemyUnits);
    setTurn(nextTurn);

    if (reinforcement?.dialog && reinforcement.dialog.length > 0) {
      setDialogQueue(reinforcement.dialog);
      setCurrentDialogIndex(0);
      setDialogPostAction(() => () => {
        setPhase('player_phase');
        srwAudio.playBgm('map');
      });
      setPhase('dialog');
    } else {
      setPhase('player_phase');
      srwAudio.playBgm('map');
    }
  };

  // インターミッションから次のステージへ
  const handleStartNextStage = () => {
    const nextIdx = currentStageIndex + 1;
    setCurrentStageIndex(nextIdx);
    initStage(nextIdx, playerUnits, funds);
  };

  // リトライ / リスタート
  const handleRestart = () => {
    initStage(currentStageIndex, playerUnits, funds);
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans transition-all duration-300 ${
        isFullscreen
          ? 'w-full h-full max-w-none rounded-none'
          : 'w-full max-w-5xl h-[850px] max-h-[92vh] rounded-3xl border border-slate-800 shadow-2xl my-auto'
      }`}
    >
      {/* 共通トップコントロール (戦闘演出中は戦闘UIを遮らないよう非表示) */}
      {phase !== 'battle' && (
        <>
          <div className="absolute top-3 left-3 z-50 flex items-center space-x-2">
            <button
              onClick={onBackToHub}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition shadow cursor-pointer backdrop-blur"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ゲーム一覧</span>
            </button>
          </div>

          <div className="absolute top-3 right-3 z-50 flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-700/60 text-slate-300 hover:text-white transition shadow cursor-pointer backdrop-blur"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </>
      )}

      {/* --- 1. 会話イベント画面 (Dialog) --- */}
      {phase === 'dialog' && dialogQueue[currentDialogIndex] && (
        <div
          onClick={handleNextDialog}
          className="relative w-full h-full flex flex-col justify-end p-6 sm:p-12 bg-cover bg-center cursor-pointer select-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at bottom, #1e1b4b 0%, #030712 100%)',
          }}
        >
          <div className="absolute inset-0 bg-slate-950/60 pointer-events-none" />

          {/* 会話ウィンドウ */}
          <div className="relative z-10 w-full max-w-3xl mx-auto bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl border-2"
                style={{
                  backgroundColor: `${dialogQueue[currentDialogIndex].themeColor}22`,
                  borderColor: dialogQueue[currentDialogIndex].themeColor,
                }}
              >
                {dialogQueue[currentDialogIndex].portrait}
              </div>
              <div>
                <span
                  className="font-black text-sm sm:text-base tracking-wider"
                  style={{ color: dialogQueue[currentDialogIndex].themeColor }}
                >
                  {dialogQueue[currentDialogIndex].speaker}
                </span>
                <span className="text-[10px] text-slate-400 ml-2">
                  (クリック / Spaceで次へ)
                </span>
              </div>
            </div>

            <p className="text-sm sm:text-base font-bold text-white leading-relaxed pl-2 border-l-2 border-slate-700">
              {dialogQueue[currentDialogIndex].text}
            </p>

            <div className="text-right text-xs text-amber-400 font-mono animate-pulse">
              ▼ NEXT
            </div>
          </div>
        </div>
      )}

      {/* --- 2. 戦術マップパート (Player & Enemy Phase) --- */}
      {(phase === 'player_phase' || phase === 'enemy_phase') && (
        <TacticsMap
          stage={currentStage}
          playerUnits={playerUnits}
          enemyUnits={enemyUnits}
          currentTurn={turn}
          isPlayerTurn={phase === 'player_phase'}
          funds={funds}
          onInitiateCombat={handleInitiateCombat}
          onUnitWait={handleUnitWait}
          onUnitRepair={handleUnitRepair}
          onUnitResupply={handleUnitResupply}
          onApplySpirit={handleApplySpirit}
          onEndTurn={handleEndPlayerTurn}
          isFullscreen={isFullscreen}
        />
      )}

      {/* --- 3. 戦闘アニメーション演出 (Battle Scene) --- */}
      {phase === 'battle' && currentCombat && (
        <BattleScene
          combat={currentCombat}
          onFinish={handleBattleFinish}
          isFullscreen={isFullscreen}
        />
      )}

      {/* --- 4. インターミッション格納庫 (Intermission) --- */}
      {phase === 'intermission' && (
        <Intermission
          playerUnits={playerUnits}
          funds={funds}
          onFundsChange={setFunds}
          onUnitsChange={setPlayerUnits}
          currentStage={currentStage.stageNumber}
          onStartNextStage={handleStartNextStage}
          isFullscreen={isFullscreen}
        />
      )}

      {/* --- 5. 作戦失敗 (Game Over) --- */}
      {phase === 'game_over' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
          <ShieldAlert className="w-20 h-20 text-rose-500 animate-pulse" />
          <h2 className="text-3xl sm:text-4xl font-black text-rose-500 tracking-wider">
            OPERATION FAILED
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-md">
            味方部隊が壊滅しました…だが、魂の灯火はまだ消えてはいない！
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRestart}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-sm shadow-xl transition cursor-pointer flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>この作戦をやり直す</span>
            </button>
            <button
              onClick={onBackToHub}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
            >
              ハブへ戻る
            </button>
          </div>
        </div>
      )}

      {/* --- 6. 全ステージ完全制覇 (All Clear) --- */}
      {phase === 'all_clear' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-slate-900 to-black p-6 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <Trophy className="w-20 h-20 text-amber-400 animate-bounce" />
          <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-yellow-300 tracking-wider">
            MISSION COMPLETE!!
          </h2>
          <p className="text-base sm:text-lg text-slate-200 max-w-lg font-bold">
            全3話を完全制覇！地球と銀河の平和は守られた！
          </p>
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-8 text-sm">
            <div>
              <div className="text-slate-400 text-xs">総撃破数</div>
              <div className="text-xl font-black text-rose-400 font-mono">{totalKills} 機</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">最終所持資金</div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {funds.toLocaleString()} G
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => initStage(0, playerUnits, funds)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black text-sm shadow-xl transition cursor-pointer flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>機体を強化して2周目に挑戦！</span>
            </button>
            <button
              onClick={onBackToHub}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
            >
              ゲームハブへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
