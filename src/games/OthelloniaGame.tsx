import React, { useState, useEffect, useRef } from 'react';
import {
  OthelloniaPiece,
  BoardCell,
  GameMode,
  Difficulty,
  StageInfo,
  DamageLog,
  FloatingText,
  CutinEffect,
} from './othellonia/types';
import { PRESET_DECKS, PIECES_MAP } from './othellonia/piecesData';
import { STAGES } from './othellonia/stagesData';
import {
  createInitialBoard,
  getValidMoves,
  getFlippableCells,
  getFlipMultiplier,
  isConditionMet,
  countBoardPieces,
  countAttributePieces,
} from './othellonia/boardUtils';
import { chooseAiMove } from './othellonia/othelloniaAi';
import { othelloniaAudio } from './othellonia/othelloniaAudio';
import { BattleView } from './othellonia/BattleView';
import { DeckBuilder } from './othellonia/DeckBuilder';
import { PieceAvatar } from './othellonia/PieceAvatar';
import { Play, ArrowLeft, Star, BookOpen } from 'lucide-react';

interface OthelloniaGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// ストレージキー
export const OTHELLONIA_WINS_KEY = 'othellonia_total_wins_v1';
export const OTHELLONIA_MAX_DAMAGE_KEY = 'othellonia_max_damage_v1';
export const OTHELLONIA_STAGES_CLEARED_KEY = 'othellonia_cleared_stages_v1';
export const OTHELLONIA_CUSTOM_DECK_KEY = 'othellonia_custom_deck_v1';

export const OthelloniaGame: React.FC<OthelloniaGameProps> = ({
  onBackToHub,
  isFullscreen = false,
}) => {
  // --- モード管理 ---
  const [currentScreen, setCurrentScreen] = useState<
    'title' | 'mode_select' | 'quest_select' | 'cpu_select' | 'deck_builder' | 'battle' | 'result'
  >('title');

  const [gameMode, setGameMode] = useState<GameMode>('quest');
  const [selectedStage, setSelectedStage] = useState<StageInfo>(STAGES[0]);
  const [cpuDifficulty, setCpuDifficulty] = useState<Difficulty>('normal');
  const [cpuDeckType, setCpuDeckType] = useState<string>('preset_dragon_burst');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // --- デッキ管理 ---
  const [playerDeck, setPlayerDeck] = useState<OthelloniaPiece[]>(() => {
    try {
      const saved = localStorage.getItem(OTHELLONIA_CUSTOM_DECK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 10) {
          return parsed.map((id: string) => PIECES_MAP[id]).filter(Boolean);
        }
      }
    } catch {}
    // デフォルト: 混合レジェンドデッキ
    const preset = PRESET_DECKS[3];
    return preset.pieceIds.map((id) => PIECES_MAP[id]).filter(Boolean);
  });

  const [playerLeader, setPlayerLeader] = useState<OthelloniaPiece>(
    () => playerDeck[0] || PIECES_MAP['god_seraphim']
  );

  // --- バトルステート ---
  const [board, setBoard] = useState<BoardCell[][]>(() => createInitialBoard());
  const [playerHp, setPlayerHp] = useState<number>(20000);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(20000);
  const [enemyHp, setEnemyHp] = useState<number>(20000);
  const [enemyMaxHp, setEnemyMaxHp] = useState<number>(20000);
  const [playerPoison, setPlayerPoison] = useState<number>(0);
  const [enemyPoison, setEnemyPoison] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'enemy'>('player');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [playerDrawPile, setPlayerDrawPile] = useState<OthelloniaPiece[]>([]);
  const [playerHand, setPlayerHand] = useState<OthelloniaPiece[]>([]);
  const [enemyDrawPile, setEnemyDrawPile] = useState<OthelloniaPiece[]>([]);
  const [enemyHand, setEnemyHand] = useState<OthelloniaPiece[]>([]);
  const [enemyLeader, setEnemyLeader] = useState<OthelloniaPiece>(PIECES_MAP['dragon_baby']);
  const [enemyName, setEnemyName] = useState<string>('CPU');
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number>(0);
  const [battleSpeed, setBattleSpeed] = useState<number>(1);

  // --- 演出ステート ---
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [cutinEffect, setCutinEffect] = useState<CutinEffect | null>(null);
  const [lastDamageLog, setLastDamageLog] = useState<DamageLog | null>(null);
  const [battleResult, setBattleResult] = useState<'win' | 'lose' | 'draw'>('win');
  const [earnedStars, setEarnedStars] = useState<boolean[]>([false, false, false]);

  // --- 戦績記録 ---
  const [totalWins, setTotalWins] = useState<number>(() => {
    return parseInt(localStorage.getItem(OTHELLONIA_WINS_KEY) || '0', 10);
  });
  const [maxDamageRecord, setMaxDamageRecord] = useState<number>(() => {
    return parseInt(localStorage.getItem(OTHELLONIA_MAX_DAMAGE_KEY) || '0', 10);
  });
  const [clearedStages, setClearedStages] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(OTHELLONIA_STAGES_CLEARED_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Undo履歴 ---
  const historyStackRef = useRef<any[]>([]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      othelloniaAudio.stopBgm();
    };
  }, []);

  // ミュート切り替え
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    othelloniaAudio.setMuted(nextMuted);
  };

  // デッキ保存
  const handleSaveDeck = (newDeck: OthelloniaPiece[], newLeader: OthelloniaPiece) => {
    setPlayerDeck(newDeck);
    setPlayerLeader(newLeader);
    try {
      const ids = newDeck.map((p) => p.id);
      localStorage.setItem(OTHELLONIA_CUSTOM_DECK_KEY, JSON.stringify(ids));
    } catch {}
  };

  // 浮遊テキスト追加ヘルパー
  const addFloatingText = (text: string, type: FloatingText['type'], x: number, y: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingTexts((prev) => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((ft) => ft.id !== id));
    }, 1200);
  };

  // バトル開始初期化
  const startBattle = (
    mode: GameMode,
    stageInfo?: StageInfo,
    difficulty: Difficulty = 'normal',
    cpuPresetId: string = 'preset_dragon_burst'
  ) => {
    setGameMode(mode);
    historyStackRef.current = [];

    // プレイヤーHP計算
    const pMaxHp = playerDeck.reduce((sum, p) => sum + p.hp, 0) + 10000;
    setPlayerHp(pMaxHp);
    setPlayerMaxHp(pMaxHp);

    // プレイヤー手札（4枚）と山札
    const shuffledPlayer = [...playerDeck].sort(() => Math.random() - 0.5);
    const pHand = shuffledPlayer.slice(0, 4);
    const pDraw = shuffledPlayer.slice(4);
    setPlayerHand(pHand);
    setPlayerDrawPile(pDraw);
    setSelectedPieceIndex(0);

    // 敵デッキ・設定
    let eLeader: OthelloniaPiece;
    let eMaxHp: number;
    let eName: string;
    let eDeck: OthelloniaPiece[];
    let stageGimmicks: { x: number; y: number; gimmick: any }[] | undefined = undefined;

    if (mode === 'quest' && stageInfo) {
      eLeader = stageInfo.bossLeader;
      eMaxHp = stageInfo.bossHp;
      eName = stageInfo.bossName;
      eDeck = stageInfo.bossDeck;
      stageGimmicks = stageInfo.gimmicks;
    } else if (mode === 'pvp') {
      const preset = PRESET_DECKS.find((p) => p.id === cpuPresetId) || PRESET_DECKS[1];
      eLeader = PIECES_MAP[preset.leaderId];
      eDeck = preset.pieceIds.map((id) => PIECES_MAP[id]).filter(Boolean);
      eMaxHp = eDeck.reduce((sum, p) => sum + p.hp, 0) + 10000;
      eName = 'プレイヤー2 (2P)';
    } else {
      const preset = PRESET_DECKS.find((p) => p.id === cpuPresetId) || PRESET_DECKS[0];
      eLeader = PIECES_MAP[preset.leaderId];
      eDeck = preset.pieceIds.map((id) => PIECES_MAP[id]).filter(Boolean);
      eMaxHp = eDeck.reduce((sum, p) => sum + p.hp, 0) + (difficulty === 'nightmare' ? 14000 : 10000);
      eName = `CPU (${difficulty.toUpperCase()})`;
    }

    setEnemyLeader(eLeader);
    setEnemyHp(eMaxHp);
    setEnemyMaxHp(eMaxHp);
    setEnemyName(eName);

    const shuffledEnemy = [...eDeck].sort(() => Math.random() - 0.5);
    setEnemyHand(shuffledEnemy.slice(0, 4));
    setEnemyDrawPile(shuffledEnemy.slice(4));

    // 盤面生成
    const initialBoard = createInitialBoard(stageGimmicks);
    setBoard(initialBoard);

    setPlayerPoison(0);
    setEnemyPoison(0);
    setCurrentTurn('player');
    setTurnNumber(1);
    setCutinEffect(null);
    setLastDamageLog(null);

    setCurrentScreen('battle');
    othelloniaAudio.startBattleBgm(false);
  };

  // 現在の打てるマス
  const validMoves = getValidMoves(board, currentTurn);

  // Undo (一手戻し)
  const handleUndo = () => {
    if (historyStackRef.current.length === 0 || currentTurn !== 'player') return;
    const prevState = historyStackRef.current.pop();
    if (prevState) {
      setBoard(prevState.board);
      setPlayerHp(prevState.playerHp);
      setEnemyHp(prevState.enemyHp);
      setPlayerPoison(prevState.playerPoison);
      setEnemyPoison(prevState.enemyPoison);
      setPlayerHand(prevState.playerHand);
      setPlayerDrawPile(prevState.playerDrawPile);
      setEnemyHand(prevState.enemyHand);
      setEnemyDrawPile(prevState.enemyDrawPile);
      setCurrentTurn('player');
      setTurnNumber(prevState.turnNumber);
      setSelectedPieceIndex(0);
      setLastDamageLog(null);
    }
  };

  // 駒の着手処理（共通ロジック）
  const executeMove = (
    actor: 'player' | 'enemy',
    piece: OthelloniaPiece,
    x: number,
    y: number,
    handPieceIndex?: number
  ) => {
    // プレイヤーの手番なら履歴に保存
    if (actor === 'player') {
      historyStackRef.current.push({
        board: JSON.parse(JSON.stringify(board)),
        playerHp,
        enemyHp,
        playerPoison,
        enemyPoison,
        playerHand: [...playerHand],
        playerDrawPile: [...playerDrawPile],
        enemyHand: [...enemyHand],
        enemyDrawPile: [...enemyDrawPile],
        turnNumber,
      });
      if (historyStackRef.current.length > 5) {
        historyStackRef.current.shift();
      }
    }

    // 1. 反転計算
    const { flippedCells, bracketPieces } = getFlippableCells(board, x, y, actor);
    const flipsCount = flippedCells.length;
    if (flipsCount === 0) return;

    // 音響：打音
    othelloniaAudio.playPlaceSound();

    // 盤面更新
    const newBoard = board.map((row) => row.map((cell) => ({ ...cell, flipsThisTurn: false, justPlaced: false })));
    newBoard[y][x].owner = actor;
    newBoard[y][x].piece = piece;
    newBoard[y][x].justPlaced = true;

    // スキル条件判定（先行チェック: 貫通やカットイン等の判定のため）
    const currentHpPercent = ((actor === 'player' ? playerHp : enemyHp) / (actor === 'player' ? playerMaxHp : enemyMaxHp)) * 100;
    const isSkillMet = isConditionMet(piece.skill.condition, {
      flipsCount,
      currentHpPercent,
      board: newBoard,
      currentTurn: actor,
      turnNumber,
    });

    const isPierce = isSkillMet && piece.skill.effectType === 'pierce';

    // 罠チェック (反転させた相手マスに罠があるか)
    let triggeredTrapDamage = 0;
    let trapMessage = '';
    const opponent = actor === 'player' ? 'enemy' : 'player';

    flippedCells.forEach(({ x: fx, y: fy }, idx) => {
      const cell = newBoard[fy][fx];
      if (cell.trap && cell.trap.owner === opponent) {
        if (isPierce) {
          trapMessage = `${cell.trap.sourcePieceName}の罠を貫通で無効化！`;
          cell.trap = undefined;
        } else {
          const trapDmg = Math.round(piece.atk * cell.trap.damageRatio) + (cell.trap.fixedDamage || 0);
          triggeredTrapDamage += trapDmg;
          trapMessage = `${cell.trap.sourcePieceName}の罠発動！反撃 ${trapDmg}ダメージ！`;
          cell.trap = undefined;
          othelloniaAudio.playTrapSound();
        }
      }
      cell.owner = actor;
      cell.flipsThisTurn = true;
      // 連鎖音
      setTimeout(() => {
        othelloniaAudio.playFlipSound(idx);
      }, idx * 100);
    });

    // 2. 通常攻撃ダメージ計算
    const flipMult = getFlipMultiplier(flipsCount);
    let calculatedAtk = piece.atk * flipMult;

    // ギミックマスの効果
    const cellGimmick = newBoard[y][x].gimmick;
    let gimmickHeal = 0;
    let gimmickSelfDmg = 0;
    if (cellGimmick === 'buff') {
      calculatedAtk *= 1.5;
    } else if (cellGimmick === 'heal') {
      gimmickHeal = 1500;
    } else if (cellGimmick === 'damage') {
      gimmickSelfDmg = 1200;
    }

    // リーダーオーラバフ (竜オーラ攻撃UP)
    const currentLeader = actor === 'player' ? playerLeader : enemyLeader;
    if (currentLeader.leaderSkill) {
      if (currentLeader.leaderSkill.effectType === 'aura_atk' && piece.attribute === 'dragon') {
        calculatedAtk *= currentLeader.leaderSkill.power;
      }
    }

    calculatedAtk = Math.round(calculatedAtk);

    // 3. スキル効果計算
    let skillSpecialDamage = 0;
    let skillHeal = 0;
    let addedPoison = 0;

    if (isSkillMet) {
      // カットイン表示
      setCutinEffect({
        piece,
        skillName: piece.skill.name,
        skillType: piece.skill.effectType,
        playerSide: actor,
      });
      othelloniaAudio.playSkillCutinSound();
      setTimeout(() => setCutinEffect(null), 1400);

      const s = piece.skill;
      if (s.effectType === 'special_damage' || s.effectType === 'pierce') {
        if (s.name === '聖輝・神聖断罪') {
          // ミカエル: ひっくり返した枚数×1,400
          skillSpecialDamage += flipsCount * 1400;
        } else if (s.name === 'アイギスの神盾') {
          // アテナ: 盤面の自分の神属性駒1枚につき1,000
          const godPieces = countAttributePieces(newBoard, actor, 'god');
          skillSpecialDamage += godPieces * 1000;
        } else if (s.name === 'ソウル・ハーベスト') {
          // 死神: 相手の最大HPの18%
          const targetMaxHp = actor === 'player' ? enemyMaxHp : playerMaxHp;
          skillSpecialDamage += Math.round(targetMaxHp * 0.18);
        } else if (s.power < 1.0) {
          // 割合ダメージ (相手現HPのN%)
          const targetHp = actor === 'player' ? enemyHp : playerHp;
          skillSpecialDamage += Math.round(targetHp * s.power);
        } else if (s.power <= 10) {
          skillSpecialDamage += Math.round(piece.atk * s.power);
        } else {
          skillSpecialDamage += s.power;
        }
        if (s.extraValue) skillHeal += s.extraValue;
      } else if (s.effectType === 'heal') {
        skillHeal += s.power;
      } else if (s.effectType === 'drain') {
        skillSpecialDamage += s.power;
        skillHeal += s.power;
      } else if (s.effectType === 'poison') {
        addedPoison += s.power;
      } else if (s.effectType === 'buff') {
        calculatedAtk = Math.round(calculatedAtk * s.power);
        if (s.extraValue) skillSpecialDamage += s.extraValue;
      } else if (s.effectType === 'trap') {
        // 罠設置
        newBoard[y][x].trap = {
          owner: actor,
          damageRatio: s.power,
          fixedDamage: s.extraValue,
          sourcePieceName: piece.name,
        };
      }
    }

    // リーダーオーラ毒ブースト
    if (addedPoison > 0 && currentLeader.leaderSkill?.effectType === 'aura_poison_boost') {
      addedPoison = Math.round(addedPoison * currentLeader.leaderSkill.power);
    }

    // 4. コンボスキル連鎖の判定
    const comboPieces: OthelloniaPiece[] = [];
    let comboDamage = 0;

    bracketPieces.forEach((bCell) => {
      if (bCell.piece && bCell.piece.comboSkill) {
        const comboSkill = bCell.piece.comboSkill;
        const isComboMet = isConditionMet(comboSkill.condition, {
          flipsCount,
          currentHpPercent,
          board: newBoard,
          currentTurn: actor,
          turnNumber,
        });

        if (isComboMet) {
          comboPieces.push(bCell.piece);
          if (comboSkill.name === '熾天の連鎖光波') {
            // セラフィム: 盤面の自駒数×400特殊ダメージ＆同量回復
            const myPieceCount = countAttributePieces(newBoard, actor);
            const drainAmt = myPieceCount * 400;
            comboDamage += drainAmt;
            skillHeal += drainAmt;
          } else if (comboSkill.name === '天空の連撃') {
            // ペガサスナイト: 盤面の神駒1枚につき300特殊ダメージ
            const godCount = countAttributePieces(newBoard, actor, 'god');
            comboDamage += godCount * 300;
          } else if (comboSkill.effectType === 'special_damage' || comboSkill.effectType === 'pierce') {
            comboDamage += comboSkill.power <= 10 ? Math.round(bCell.piece.atk * comboSkill.power) : comboSkill.power;
          } else if (comboSkill.effectType === 'heal') {
            skillHeal += comboSkill.power;
          } else if (comboSkill.effectType === 'drain') {
            comboDamage += comboSkill.power;
            skillHeal += comboSkill.power;
          } else if (comboSkill.effectType === 'poison') {
            let comboPoison = comboSkill.power;
            if (currentLeader.leaderSkill?.effectType === 'aura_poison_boost') {
              comboPoison = Math.round(comboPoison * currentLeader.leaderSkill.power);
            }
            addedPoison += comboPoison;
          } else if (comboSkill.effectType === 'buff') {
            calculatedAtk = Math.round(calculatedAtk * comboSkill.power);
            if (comboSkill.extraValue) skillHeal += comboSkill.extraValue;
          }
        }
      }
    });

    if (comboPieces.length > 0) {
      setTimeout(() => {
        othelloniaAudio.playComboSound(comboPieces.length);
        comboPieces.forEach((cp, idx) => {
          addFloatingText(`COMBO ${idx + 1}! ${cp.name}`, 'combo', 50, 40 + idx * 8);
        });
      }, 400);
    }

    // 合計ダメージ
    const totalAttackDamage = calculatedAtk + skillSpecialDamage + comboDamage;

    // 音響
    if (skillSpecialDamage > 0 || comboDamage > 0) {
      setTimeout(() => othelloniaAudio.playSpecialDamageSound(), 300);
    }
    if (skillHeal > 0 || gimmickHeal > 0) {
      setTimeout(() => othelloniaAudio.playHealSound(), 400);
    }
    if (addedPoison > 0) {
      setTimeout(() => othelloniaAudio.playPoisonSound(), 500);
    }

    // HP更新
    let newPlayerHp = playerHp;
    let newEnemyHp = enemyHp;
    let newPlayerPoison = playerPoison;
    let newEnemyPoison = enemyPoison;

    if (actor === 'player') {
      newEnemyHp = Math.max(0, enemyHp - totalAttackDamage);
      newPlayerHp = Math.min(playerMaxHp, playerHp + skillHeal + gimmickHeal - triggeredTrapDamage - gimmickSelfDmg);
      newEnemyPoison += addedPoison;

      // リーダーオーラ毎ターン回復
      if (playerLeader.leaderSkill?.effectType === 'aura_hp_regen') {
        newPlayerHp = Math.min(playerMaxHp, newPlayerHp + playerLeader.leaderSkill.power);
      }

      // 浮遊テキスト
      addFloatingText(`-${totalAttackDamage.toLocaleString()}`, skillSpecialDamage > 0 ? 'special' : 'damage', 50, 20);
      if (skillHeal + gimmickHeal > 0) {
        addFloatingText(`+${(skillHeal + gimmickHeal).toLocaleString()}`, 'heal', 50, 75);
      }
      if (triggeredTrapDamage > 0) {
        addFloatingText(`罠被弾 -${triggeredTrapDamage.toLocaleString()}`, 'trap', 50, 70);
      }

      // 最高ダメージ記録更新
      if (totalAttackDamage > maxDamageRecord) {
        setMaxDamageRecord(totalAttackDamage);
        localStorage.setItem(OTHELLONIA_MAX_DAMAGE_KEY, totalAttackDamage.toString());
      }
    } else {
      newPlayerHp = Math.max(0, playerHp - totalAttackDamage);
      newEnemyHp = Math.min(enemyMaxHp, enemyHp + skillHeal + gimmickHeal - triggeredTrapDamage - gimmickSelfDmg);
      newPlayerPoison += addedPoison;

      // 敵リーダーオーラ回復
      if (enemyLeader.leaderSkill?.effectType === 'aura_hp_regen') {
        newEnemyHp = Math.min(enemyMaxHp, newEnemyHp + enemyLeader.leaderSkill.power);
      }

      // 浮遊テキスト
      addFloatingText(`-${totalAttackDamage.toLocaleString()}`, skillSpecialDamage > 0 ? 'special' : 'damage', 50, 75);
      if (skillHeal + gimmickHeal > 0) {
        addFloatingText(`+${(skillHeal + gimmickHeal).toLocaleString()}`, 'heal', 50, 20);
      }
      if (triggeredTrapDamage > 0) {
        addFloatingText(`罠被弾 -${triggeredTrapDamage.toLocaleString()}`, 'trap', 50, 25);
      }
    }

    setBoard(newBoard);
    setPlayerHp(newPlayerHp);
    setEnemyHp(newEnemyHp);
    setPlayerPoison(newPlayerPoison);
    setEnemyPoison(newEnemyPoison);

    // ログ記録
    const logMsg = `${piece.name}が${flipsCount}枚返して通常${calculatedAtk} ${
      skillSpecialDamage > 0 ? `+特殊${skillSpecialDamage}` : ''
    } ${comboDamage > 0 ? `+コンボ${comboDamage}` : ''}${trapMessage ? ` (${trapMessage})` : ''}！`;
    setLastDamageLog({
      id: `${Date.now()}`,
      turn: turnNumber,
      source: actor,
      actorName: piece.name,
      normalDamage: calculatedAtk,
      specialDamage: skillSpecialDamage + comboDamage,
      poisonDamage: addedPoison,
      healAmount: skillHeal + gimmickHeal,
      flipsCount,
      comboPieceNames: comboPieces.map((p) => p.name),
      message: logMsg,
    });

    // 5. 手札補充（ドロー）: 正確な駒インデックスを消費
    if (actor === 'player') {
      const pIdx = handPieceIndex !== undefined ? handPieceIndex : selectedPieceIndex;
      const remainingHand = playerHand.filter((_, i) => i !== pIdx);
      if (playerDrawPile.length > 0) {
        const nextDraw = playerDrawPile[0];
        setPlayerHand([...remainingHand, nextDraw]);
        setPlayerDrawPile(playerDrawPile.slice(1));
      } else {
        setPlayerHand([...remainingHand, piece]);
      }
      setSelectedPieceIndex(0);
    } else {
      const eIdx = handPieceIndex !== undefined ? handPieceIndex : (gameMode === 'pvp' ? selectedPieceIndex : 0);
      const remainingHand = enemyHand.filter((_, i) => i !== eIdx);
      if (enemyDrawPile.length > 0) {
        const nextDraw = enemyDrawPile[0];
        setEnemyHand([...remainingHand, nextDraw]);
        setEnemyDrawPile(enemyDrawPile.slice(1));
      } else {
        setEnemyHand([...remainingHand, piece]);
      }
      if (gameMode === 'pvp') {
        setSelectedPieceIndex(0);
      }
    }

    // 6. 勝敗チェック（相打ち引き分け対応）
    if (newPlayerHp <= 0 && newEnemyHp <= 0) {
      endBattle('draw', newPlayerHp, newEnemyHp);
      return;
    } else if (newPlayerHp <= 0 || newEnemyHp <= 0) {
      endBattle(newPlayerHp > 0 ? 'win' : 'lose', newPlayerHp, newEnemyHp);
      return;
    }

    // 全マス埋まりチェック
    const { empty } = countBoardPieces(newBoard);
    if (empty === 0) {
      if (newPlayerHp > newEnemyHp) endBattle('win', newPlayerHp, newEnemyHp);
      else if (newPlayerHp < newEnemyHp) endBattle('lose', newPlayerHp, newEnemyHp);
      else endBattle('draw', newPlayerHp, newEnemyHp);
      return;
    }

    // 7. ターンエンド＆次ターン移行
    const nextTurn = actor === 'player' ? 'enemy' : 'player';
    setCurrentTurn(nextTurn);
    setTurnNumber((prev) => (nextTurn === 'player' ? prev + 1 : prev));

    // ピンチBGM切り替え
    const isPinch = newPlayerHp < playerMaxHp * 0.35 || newEnemyHp < enemyMaxHp * 0.35;
    othelloniaAudio.startBattleBgm(isPinch);
  };

  // プレイヤーの石打ち (PvP対応)
  const handlePlayerPlace = (x: number, y: number) => {
    if (gameMode === 'pvp') {
      const activeHand = currentTurn === 'player' ? playerHand : enemyHand;
      const piece = activeHand[selectedPieceIndex];
      if (!piece) return;
      executeMove(currentTurn, piece, x, y, selectedPieceIndex);
      return;
    }

    if (currentTurn !== 'player' || playerHand.length === 0) return;
    const piece = playerHand[selectedPieceIndex];
    if (!piece) return;

    executeMove('player', piece, x, y, selectedPieceIndex);
  };

  // 敵ターン進行（AI または PvP 2P）
  useEffect(() => {
    if (currentTurn !== 'enemy' || currentScreen !== 'battle') return;

    // 毒ダメージ処理
    if (enemyPoison > 0) {
      const nextEnemyHp = Math.max(0, enemyHp - enemyPoison);
      setEnemyHp(nextEnemyHp);
      addFloatingText(`毒 -${enemyPoison}`, 'poison', 50, 20);
      othelloniaAudio.playPoisonSound();
      if (nextEnemyHp <= 0) {
        endBattle('win', playerHp, 0);
        return;
      }
    }

    // 打てる手の確認
    const validMovesForEnemy = getValidMoves(board, 'enemy');
    if (validMovesForEnemy.length === 0) {
      // 1Pも打てないかチェック（両者パスなら終了）
      const validMovesForPlayer = getValidMoves(board, 'player');
      if (validMovesForPlayer.length === 0) {
        if (playerHp > enemyHp) endBattle('win', playerHp, enemyHp);
        else if (playerHp < enemyHp) endBattle('lose', playerHp, enemyHp);
        else endBattle('draw', playerHp, enemyHp);
        return;
      }

      // 敵（または2P）のみパス
      const timer = setTimeout(() => {
        addFloatingText(
          gameMode === 'pvp' ? '2Pは打てる場所がなくパスしました！' : '相手は打てる場所がなくパスしました！',
          'combo',
          50,
          30
        );
        setCurrentTurn('player');
        setTurnNumber((t) => t + 1);
      }, Math.round(900 / battleSpeed));
      return () => clearTimeout(timer);
    }

    // PvPモードなら、2Pの入力を待つためAI思考タイマーは起動しない
    if (gameMode === 'pvp') return;

    // AI思考タイマー (速度倍率に連動)
    const aiTimer = setTimeout(() => {
      const decision = chooseAiMove(
        board,
        enemyHand,
        gameMode === 'quest' ? (selectedStage.id >= 6 ? 'hard' : 'normal') : cpuDifficulty,
        enemyHp,
        enemyMaxHp,
        playerHp,
        turnNumber
      );

      if (decision && enemyHand[decision.pieceIndex]) {
        const chosenPiece = enemyHand[decision.pieceIndex];
        executeMove('enemy', chosenPiece, decision.x, decision.y, decision.pieceIndex);
      } else {
        // パス
        setCurrentTurn('player');
        setTurnNumber((t) => t + 1);
      }
    }, Math.round(1100 / battleSpeed));

    return () => clearTimeout(aiTimer);
  }, [currentTurn, currentScreen, battleSpeed, enemyPoison, enemyHp, playerHp, gameMode]);

  // 1Pターン開始時の毒処理 & パス判定
  useEffect(() => {
    if (currentTurn !== 'player' || currentScreen !== 'battle') return;

    if (playerPoison > 0) {
      const nextPlayerHp = Math.max(0, playerHp - playerPoison);
      setPlayerHp(nextPlayerHp);
      addFloatingText(`毒 -${playerPoison}`, 'poison', 50, 75);
      othelloniaAudio.playPoisonSound();
      if (nextPlayerHp <= 0) {
        endBattle('lose', 0, enemyHp);
        return;
      }
    }

    const validMovesForPlayer = getValidMoves(board, 'player');
    if (validMovesForPlayer.length === 0) {
      // 相手も打てないかチェック（両者パスなら終了）
      const validMovesForEnemy = getValidMoves(board, 'enemy');
      if (validMovesForEnemy.length === 0) {
        if (playerHp > enemyHp) endBattle('win', playerHp, enemyHp);
        else if (playerHp < enemyHp) endBattle('lose', playerHp, enemyHp);
        else endBattle('draw', playerHp, enemyHp);
        return;
      }

      // 1Pのみパス
      const timer = setTimeout(() => {
        addFloatingText(
          gameMode === 'pvp' ? '1Pは打てる場所がなくパスしました！' : '打てる場所がなくパスしました！',
          'combo',
          50,
          70
        );
        setCurrentTurn('enemy');
      }, Math.round(900 / battleSpeed));
      return () => clearTimeout(timer);
    }
  }, [currentTurn, currentScreen, battleSpeed, playerPoison, playerHp, enemyHp, gameMode]);

  // バトル終了処理
  const endBattle = (result: 'win' | 'lose' | 'draw', finalPlayerHp: number, _finalEnemyHp: number) => {
    setBattleResult(result);
    othelloniaAudio.stopBgm();

    if (result === 'win' || (gameMode === 'pvp' && result === 'lose')) {
      othelloniaAudio.playVictoryFanfare();
    } else if (result === 'lose') {
      othelloniaAudio.playDefeatSound();
    }

    if (result === 'win' && gameMode !== 'pvp') {
      const newWins = totalWins + 1;
      setTotalWins(newWins);
      localStorage.setItem(OTHELLONIA_WINS_KEY, newWins.toString());

      if (gameMode === 'quest') {
        // 各ステージ固有の星（スター）判定
        const star1 = true; // クリア
        let star2 = false;
        let star3 = false;

        const hpRatio = finalPlayerHp / Math.max(1, playerMaxHp);

        if (selectedStage.id === 1) {
          star2 = hpRatio >= 0.5;
          star3 = turnNumber <= 12;
        } else if (selectedStage.id === 2) {
          star2 = hpRatio >= 0.6;
          star3 = turnNumber <= 10;
        } else if (selectedStage.id === 3) {
          star2 = true; // 毒を耐えて勝利
          star3 = hpRatio >= 0.4;
        } else if (selectedStage.id === 4) {
          star2 = maxDamageRecord >= 5000 || finalPlayerHp > 0;
          star3 = hpRatio >= 0.5;
        } else if (selectedStage.id === 5) {
          star2 = hpRatio >= 0.5;
          star3 = turnNumber <= 8;
        } else if (selectedStage.id === 6) {
          star2 = hpRatio >= 0.4;
          star3 = maxDamageRecord >= 6000;
        } else if (selectedStage.id === 7) {
          star2 = hpRatio >= 0.5;
          star3 = turnNumber <= 10;
        } else {
          // 最終話
          star2 = hpRatio >= 0.3;
          star3 = maxDamageRecord >= 8000;
        }

        const stars = [star1, star2, star3];
        setEarnedStars(stars);

        if (!clearedStages.includes(selectedStage.id)) {
          const newCleared = [...clearedStages, selectedStage.id];
          setClearedStages(newCleared);
          localStorage.setItem(OTHELLONIA_STAGES_CLEARED_KEY, JSON.stringify(newCleared));
        }
      }
    }

    setTimeout(() => {
      setCurrentScreen('result');
    }, 1500);
  };

  return (
    <div
      className={`w-full min-h-screen flex flex-col items-center bg-slate-950 text-slate-100 transition-all duration-300 font-sans ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* ================= 画面1：タイトル画面 ================= */}
      {currentScreen === 'title' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto p-6 text-center animate-fade-in">
          {/* メインロゴバナー */}
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-purple-600/30 blur-2xl rounded-full pointer-events-none" />
            <div className="relative flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">⚡</span>
              <span className="text-4xl">🔮</span>
              <span className="text-4xl">🔥</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-wider bg-gradient-to-r from-amber-300 via-rose-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl">
              逆転オセロニア・レジェンド
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-bold mt-2 tracking-wide">
              Othellonia: Reverse Legends — 神・魔・竜の三界覇権バトル
            </p>
          </div>

          {/* 実績サマリー */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-md bg-slate-900/80 border border-slate-800 p-3 rounded-2xl mb-8 shadow-xl">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-bold">累計勝利数</div>
              <div className="text-xl font-black text-amber-300">{totalWins} 勝</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-bold">最高一撃ダメージ</div>
              <div className="text-xl font-black text-rose-400">{maxDamageRecord.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 font-bold">制覇クエスト</div>
              <div className="text-xl font-black text-sky-400">{clearedStages.length} / {STAGES.length}</div>
            </div>
          </div>

          {/* メニューボタン */}
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={() => setCurrentScreen('mode_select')}
              className="py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-600 hover:from-amber-400 hover:via-rose-500 hover:to-indigo-500 font-black text-lg shadow-xl shadow-rose-900/40 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>バトル開始 (Game Start)</span>
            </button>

            <button
              onClick={() => setCurrentScreen('deck_builder')}
              className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>デッキ編成 ＆ 駒図鑑</span>
            </button>

            <button
              onClick={onBackToHub}
              className="py-2.5 px-6 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ゲーム一覧へ戻る</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= 画面2：モード選択 ================= */}
      {currentScreen === 'mode_select' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-center my-auto p-4 animate-fade-in">
          <div className="flex items-center justify-between w-full max-w-xl mb-6">
            <button
              onClick={() => setCurrentScreen('title')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              タイトルへ
            </button>
            <h2 className="text-xl font-black text-white">モードを選択</h2>
            <div className="w-16" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
            {/* クエストモード */}
            <div
              onClick={() => setCurrentScreen('quest_select')}
              className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/60 to-slate-900 border-2 border-amber-500/50 hover:border-amber-400 transition transform hover:-translate-y-1 cursor-pointer shadow-xl"
            >
              <div className="text-3xl mb-2">🏰</div>
              <h3 className="text-lg font-black text-amber-300">クエスト・試練の塔</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                全8話のストーリーバトル！各ステージのボスと専用ギミック盤面を攻略して完全制覇を目指せ！
              </p>
              <div className="mt-3 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>制覇進捗: {clearedStages.length}/{STAGES.length}</span>
              </div>
            </div>

            {/* フリーVS CPU対戦 */}
            <div
              onClick={() => setCurrentScreen('cpu_select')}
              className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border-2 border-indigo-500/50 hover:border-indigo-400 transition transform hover:-translate-y-1 cursor-pointer shadow-xl"
            >
              <div className="text-3xl mb-2">⚔️</div>
              <h3 className="text-lg font-black text-sky-300">フリー対戦 (VS CPU)</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                4段階の難易度（Easy〜Nightmare）と相手の属性特化デッキを自由に選んで腕試し！
              </p>
              <div className="mt-3 text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <span>自由対戦・特訓モード</span>
              </div>
            </div>

            {/* 2人対戦 (Pass & Play) */}
            <div
              onClick={() => startBattle('pvp', undefined, 'normal', 'preset_god_heal')}
              className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/60 to-slate-900 border-2 border-purple-500/50 hover:border-purple-400 transition transform hover:-translate-y-1 cursor-pointer shadow-xl sm:col-span-2"
            >
              <div className="text-3xl mb-2">👥</div>
              <h3 className="text-lg font-black text-purple-300">2人対戦 (Pass & Play)</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                1台の端末で友達や家族と交互に対戦！手駒を選び合って本格的なリアルタイム頭脳戦を楽しもう！
              </p>
              <div className="mt-3 text-[11px] font-bold text-purple-400 flex items-center gap-1">
                <span>オフライン2人ローカル対戦</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 画面3：クエスト選択 ================= */}
      {currentScreen === 'quest_select' && (
        <div className="w-full max-w-4xl p-4 flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCurrentScreen('mode_select')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
            <h2 className="text-lg font-black text-white">クエスト・試練の塔（全8話）</h2>
            <div className="w-16" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {STAGES.map((stage) => {
              const isCleared = clearedStages.includes(stage.id);

              return (
                <div
                  key={stage.id}
                  onClick={() => {
                    setSelectedStage(stage);
                    startBattle('quest', stage);
                  }}
                  className={`p-4 rounded-2xl border-2 transition transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                    isCleared
                      ? 'bg-slate-900/90 border-amber-500/50 hover:border-amber-400'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-amber-400">{stage.name}</span>
                      {isCleared && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                          <Star className="w-3 h-3 fill-current" />
                          <span>CLEAR</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mb-2">{stage.subtitle}</div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{stage.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <PieceAvatar
                        avatarSvg={stage.bossLeader.avatarSvg}
                        attribute={stage.bossLeader.attribute}
                        size="sm"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{stage.bossName}</div>
                        <div className="text-[10px] text-slate-400">HP {stage.bossHp.toLocaleString()}</div>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition">
                      挑戦する
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 画面4：CPU対戦設定 ================= */}
      {currentScreen === 'cpu_select' && (
        <div className="w-full max-w-xl p-4 flex flex-col gap-5 my-auto animate-fade-in">
          <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCurrentScreen('mode_select')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </button>
            <h2 className="text-lg font-black text-white">フリー対戦設定</h2>
            <div className="w-16" />
          </div>

          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
            {/* 難易度 */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">AI難易度:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'normal', 'hard', 'nightmare'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setCpuDifficulty(diff)}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase transition ${
                      cpuDifficulty === diff
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* 相手デッキ */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-2 block">対戦相手のデッキ:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_DECKS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setCpuDeckType(preset.id)}
                    className={`p-3 rounded-xl text-left border transition ${
                      cpuDeckType === preset.id
                        ? 'bg-slate-800 border-amber-400 text-white'
                        : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-black text-amber-300">{preset.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => startBattle('cpu', undefined, cpuDifficulty, cpuDeckType)}
              className="mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 font-black text-base shadow-xl transition transform active:scale-95 text-center"
            >
              対戦を開始する！
            </button>
          </div>
        </div>
      )}

      {/* ================= 画面5：デッキ編成 ================= */}
      {currentScreen === 'deck_builder' && (
        <DeckBuilder
          currentDeck={playerDeck}
          currentLeader={playerLeader}
          onSaveDeck={handleSaveDeck}
          onBack={() => setCurrentScreen('title')}
        />
      )}

      {/* ================= 画面6：メインバトル画面 ================= */}
      {currentScreen === 'battle' && (
        <BattleView
          board={board}
          playerHand={playerHand}
          enemyHand={enemyHand}
          playerLeader={playerLeader}
          enemyLeader={enemyLeader}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          enemyHp={enemyHp}
          enemyMaxHp={enemyMaxHp}
          playerPoison={playerPoison}
          enemyPoison={enemyPoison}
          currentTurn={currentTurn}
          turnNumber={turnNumber}
          validMoves={validMoves}
          selectedPieceIndex={selectedPieceIndex}
          onSelectPieceIndex={setSelectedPieceIndex}
          onPlacePiece={handlePlayerPlace}
          floatingTexts={floatingTexts}
          cutinEffect={cutinEffect}
          lastDamageLog={lastDamageLog}
          gameMode={gameMode}
          enemyName={enemyName}
          isFullscreen={isFullscreen}
          onUndo={handleUndo}
          canUndo={historyStackRef.current.length > 0}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          battleSpeed={battleSpeed}
          onChangeBattleSpeed={setBattleSpeed}
        />
      )}

      {/* ================= 画面7：バトルリザルト ================= */}
      {currentScreen === 'result' && (
        <div className="w-full max-w-md my-auto p-6 bg-slate-900/95 border-2 border-slate-800 rounded-3xl shadow-2xl text-center flex flex-col items-center gap-4 animate-scale-in">
          <div className="text-5xl animate-bounce">
            {battleResult === 'win' ? '🏆' : battleResult === 'lose' ? '💀' : '🤝'}
          </div>

          <h2
            className={`text-3xl font-black ${
              battleResult === 'win'
                ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent'
                : battleResult === 'lose' && gameMode === 'pvp'
                ? 'bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent'
                : 'text-rose-400'
            }`}
          >
            {gameMode === 'pvp'
              ? battleResult === 'win'
                ? '🎉 プレイヤー1 (1P) の大逆転勝利！'
                : battleResult === 'lose'
                ? '🎉 プレイヤー2 (2P) の大逆転勝利！'
                : '🤝 DRAW 引き分け'
              : battleResult === 'win'
              ? 'VICTORY！大逆転勝利！'
              : battleResult === 'lose'
              ? 'DEFEAT... 敗北'
              : 'DRAW 引き分け'}
          </h2>

          <div className="w-full bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>ターン数:</span>
              <span className="font-black text-white">{turnNumber} ターン</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{gameMode === 'pvp' ? '1P の残りHP:' : 'あなたの残りHP:'}</span>
              <span className="font-black text-emerald-400">{playerHp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{gameMode === 'pvp' ? '2P の残りHP:' : '相手の残りHP:'}</span>
              <span className="font-black text-rose-400">{enemyHp.toLocaleString()}</span>
            </div>

            {gameMode === 'quest' && battleResult === 'win' && (
              <div className="pt-2 border-t border-slate-700 text-left">
                <div className="font-black text-amber-300 mb-1">クエスト達成条件:</div>
                {selectedStage.starConditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[11px]">
                    <Star
                      className={`w-3.5 h-3.5 ${
                        earnedStars[idx] ? 'text-amber-400 fill-current' : 'text-slate-600'
                      }`}
                    />
                    <span className={earnedStars[idx] ? 'text-slate-200' : 'text-slate-500'}>
                      {cond}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={() => {
                if (gameMode === 'quest') {
                  startBattle('quest', selectedStage);
                } else if (gameMode === 'pvp') {
                  startBattle('pvp', undefined, 'normal', 'preset_god_heal');
                } else {
                  startBattle('cpu', undefined, cpuDifficulty, cpuDeckType);
                }
              }}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 font-black text-sm shadow-lg transition"
            >
              もう一度戦う (Retry)
            </button>
            <button
              onClick={() => setCurrentScreen('mode_select')}
              className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              モード選択へ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
