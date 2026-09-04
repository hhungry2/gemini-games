import React, { useState, useEffect } from 'react';
import {
  Card,
  HeroClass,
  Enemy,
  Relic,
  Potion,
  MapNode,
  GamePhase,
  BattleFx,
  FloatingText,
  BattleReward,
  OrbInstance,
  SpireEvent,
} from './spire/types';
import {
  getStarterDeck,
  getRandomRewardCards,
  createCard,
  upgradeCard,
} from './spire/cardsData';
import { getStarterRelic, getRandomRelic } from './spire/relicsData';
import { getRandomPotion } from './spire/potionsData';
import {
  createNormalEncounter,
  createEliteEncounter,
  createBossEncounter,
  advanceEnemyIntent,
  createDefaultStatuses,
} from './spire/enemiesData';
import {
  generateSpireMap,
  getRandomEvent,
  TOTAL_FLOORS,
} from './spire/mapGenerator';
import { spireAudio } from './spire/SpireAudio';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Sword,
  Sparkles,
  Heart,
  Coins,
  Flame,
  Skull,
  Award,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';

interface SpireGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

const HIGH_FLOOR_KEY = 'spire_high_floor_v1';
const WINS_KEY = 'spire_total_wins_v1';

export const SpireGame: React.FC<SpireGameProps> = ({
  onBackToHub,
  isDark,
  isFullscreen = false,
}) => {
  // --- ゲームフェーズ ---
  const [phase, setPhase] = useState<GamePhase>('class_select');
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  // --- プレイヤー基本ステータス ---
  const [heroClass, setHeroClass] = useState<HeroClass>('warrior');
  const [hp, setHp] = useState<number>(80);
  const [maxHp, setMaxHp] = useState<number>(80);
  const [gold, setGold] = useState<number>(99);
  const [deck, setDeck] = useState<Card[]>([]);
  const [relics, setRelics] = useState<Relic[]>([]);
  const [potions, setPotions] = useState<(Potion | null)[]>([null, null, null]);

  // --- マップ進行 ---
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [currentFloor, setCurrentFloor] = useState<number>(0);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  // --- 戦闘ステート ---
  const [energy, setEnergy] = useState<number>(3);
  const [maxEnergy, setMaxEnergy] = useState<number>(3);
  const [playerBlock, setPlayerBlock] = useState<number>(0);
  const [playerStatuses, setPlayerStatuses] = useState(createDefaultStatuses());
  const [drawPile, setDrawPile] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [exhaustPile, setExhaustPile] = useState<Card[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [turn, setTurn] = useState<number>(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [orbs, setOrbs] = useState<OrbInstance[]>([]); // メイジ用
  const [currentBattleType, setCurrentBattleType] = useState<'normal' | 'elite' | 'boss'>('normal');

  // --- イベント & ショップ & 報酬ステート ---
  const [currentEvent, setCurrentEvent] = useState<SpireEvent | null>(null);
  const [eventOutcomeText, setEventOutcomeText] = useState<string | null>(null);
  const [rewards, setRewards] = useState<BattleReward | null>(null);
  const [shopCards, setShopCards] = useState<Card[]>([]);
  const [shopRelics, setShopRelics] = useState<Relic[]>([]);
  const [shopPotions, setShopPotions] = useState<Potion[]>([]);
  const [hasRemovedCardInShop, setHasRemovedCardInShop] = useState<boolean>(false);

  // --- モーダル表示 ---
  const [inspectPileType, setInspectPileType] = useState<
    'deck' | 'draw' | 'discard' | 'exhaust' | 'forge' | 'remove' | null
  >(null);

  // --- 視覚エフェクト ---
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleFxList, setBattleFxList] = useState<BattleFx[]>([]);

  // --- 記録 ---
  const [highFloor, setHighFloor] = useState<number>(() => {
    return parseInt(localStorage.getItem(HIGH_FLOOR_KEY) || '1', 10);
  });
  const [totalWins, setTotalWins] = useState<number>(() => {
    return parseInt(localStorage.getItem(WINS_KEY) || '0', 10);
  });

  // サウンドミュート連動
  const toggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    spireAudio.setMuted(next);
  };

  // 浮遊テキストの追加
  const addFloatingText = (
    text: string,
    x: number,
    y: number,
    color: string = '#f87171'
  ) => {
    const id = `ft_${Date.now()}_${Math.random()}`;
    setFloatingTexts((prev) => [...prev, { id, text, x, y, color, opacity: 1 }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  // バトルエフェクト追加
  const triggerFx = (
    type: BattleFx['type'],
    target: 'player' | string
  ) => {
    const id = `fx_${Date.now()}_${Math.random()}`;
    setBattleFxList((prev) => [...prev, { id, type, target, createdAt: Date.now() }]);
    setTimeout(() => {
      setBattleFxList((prev) => prev.filter((item) => item.id !== id));
    }, 600);
  };

  // --- ゲーム初期化（クラス選択後） ---
  const startGameWithClass = (c: HeroClass) => {
    setHeroClass(c);
    let baseHp = 80;
    if (c === 'rogue') baseHp = 70;
    if (c === 'mage') baseHp = 75;

    setHp(baseHp);
    setMaxHp(baseHp);
    setGold(99);

    const initDeck = getStarterDeck(c);
    setDeck(initDeck);

    const starterRelic = getStarterRelic(c);
    setRelics([starterRelic]);
    setPotions([null, null, null]);

    const generatedMap = generateSpireMap();
    setMapNodes(generatedMap);
    setCurrentFloor(0);
    setCurrentNodeId(null);
    setPhase('map');

    spireAudio.playGold();
  };

  // --- ノード進入 ---
  const enterNode = (node: MapNode) => {
    if (!node.available) return;

    // ノード進行ステート更新
    setCurrentFloor(node.floor);
    setCurrentNodeId(node.id);

    // 次の階層の利用可能ノードを設定
    setMapNodes((prev) =>
      prev.map((n) => {
        if (n.id === node.id) {
          return { ...n, visited: true, available: false };
        }
        if (node.nextNodes.includes(n.id)) {
          return { ...n, available: true };
        }
        return { ...n, available: false };
      })
    );

    // 最高到達階層の記録更新
    if (node.floor + 1 > highFloor) {
      setHighFloor(node.floor + 1);
      localStorage.setItem(HIGH_FLOOR_KEY, (node.floor + 1).toString());
    }

    // ノード種別に応じた画面遷移
    if (node.type === 'monster') {
      startBattle(createNormalEncounter(node.floor), false);
    } else if (node.type === 'elite') {
      startBattle(createEliteEncounter(node.floor), true);
    } else if (node.type === 'boss') {
      startBattle(createBossEncounter(), false, true);
    } else if (node.type === 'shop') {
      setupShop();
      setPhase('shop');
    } else if (node.type === 'rest') {
      setPhase('rest');
    } else if (node.type === 'event') {
      setupEvent();
      setPhase('event');
    } else if (node.type === 'treasure') {
      setupTreasure();
      setPhase('treasure');
    }
  };

  // --- 戦闘開始 ---
  const startBattle = (
    encounterEnemies: Enemy[],
    isElite = false,
    isBoss = false
  ) => {
    setEnemies(encounterEnemies);
    setCurrentBattleType(isBoss ? 'boss' : isElite ? 'elite' : 'normal');
    setTurn(1);
    setIsPlayerTurn(true);
    setPlayerBlock(0);
    setSelectedCard(null);

    // プレイヤー初期ステータス
    const initialStatuses = createDefaultStatuses();

    // レリック効果適用 (戦闘開始時)
    let startBlock = 0;
    let startEnergy = 3;
    let initialDraw = 5;

    relics.forEach((relic) => {
      if (relic.id === 'vajra') initialStatuses.strength += 1;
      if (relic.id === 'smooth_stone') initialStatuses.dexterity += 1;
      if (relic.id === 'anchor') startBlock += 10;
      if (relic.id === 'blood_vial') {
        setHp((prev) => Math.min(maxHp, prev + 2));
      }
      if (relic.id === 'ring_of_snake') initialDraw += 2;
      if (relic.id === 'lantern') startEnergy += 1;
      if (relic.id === 'bag_of_marbles') {
        encounterEnemies.forEach((e) => (e.statuses.vulnerable += 1));
      }
    });

    setPlayerStatuses(initialStatuses);
    setPlayerBlock(startBlock);
    setEnergy(startEnergy);
    setMaxEnergy(3);

    // オーブ初期化 (メイジの共鳴コア)
    if (heroClass === 'mage') {
      const hasCore = relics.some((r) => r.id === 'cracked_core');
      if (hasCore) {
        setOrbs([{ type: 'lightning', passiveVal: 3, evokeVal: 8 }]);
      } else {
        setOrbs([]);
      }
    } else {
      setOrbs([]);
    }

    // 山札シャッフル
    const shuffledDeck = [...deck].sort(() => 0.5 - Math.random());
    const initialHand = shuffledDeck.slice(0, initialDraw);
    const remainingDraw = shuffledDeck.slice(initialDraw);

    setHand(initialHand);
    setDrawPile(remainingDraw);
    setDiscardPile([]);
    setExhaustPile([]);

    setPhase('battle');
    spireAudio.startBattleBgm();
  };

  // --- カードドロー処理 ---
  const drawCards = (count: number) => {
    let currentDraw = [...drawPile];
    let currentDiscard = [...discardPile];
    const newCards: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (currentDraw.length === 0) {
        if (currentDiscard.length === 0) break;
        currentDraw = [...currentDiscard].sort(() => 0.5 - Math.random());
        currentDiscard = [];
        spireAudio.playCardDraw();
      }
      const drawn = currentDraw.pop();
      if (drawn) newCards.push(drawn);
    }

    setDrawPile(currentDraw);
    setDiscardPile(currentDiscard);
    setHand((prev) => [...prev, ...newCards]);
    spireAudio.playCardDraw();
  };

  // --- オーブの生成 (メイジ) ---
  const channelOrb = (type: OrbInstance['type']) => {
    let pVal = 3;
    let eVal = 8;
    if (type === 'frost') {
      pVal = 2;
      eVal = 5;
    } else if (type === 'dark') {
      pVal = 6;
      eVal = 6;
    }

    // 集中力適用
    pVal += playerStatuses.focus;
    eVal += playerStatuses.focus;

    setOrbs((prev) => {
      const nextOrbs = [...prev, { type, passiveVal: pVal, evokeVal: eVal }];
      if (nextOrbs.length > 3) {
        // 先頭オーブを自動Evoke
        const evoked = nextOrbs.shift()!;
        executeEvoke(evoked);
      }
      return nextOrbs;
    });
    spireAudio.playLightning();
  };

  // オーブ解放 (Evoke)
  const executeEvoke = (orb: OrbInstance) => {
    if (orb.type === 'lightning') {
      // 敵単体に雷撃
      setEnemies((prevEnemies) => {
        if (prevEnemies.length === 0) return prevEnemies;
        const target = prevEnemies[0];
        const updated = damageEnemy(target, orb.evokeVal);
        triggerFx('lightning', target.instanceId);
        spireAudio.playLightning();
        return prevEnemies
          .map((e) => (e.instanceId === target.instanceId ? updated : e))
          .filter((e) => e.hp > 0);
      });
    } else if (orb.type === 'frost') {
      // プレイヤーに大ブロック
      setPlayerBlock((prev) => prev + orb.evokeVal);
      triggerFx('shield', 'player');
      spireAudio.playShield();
    } else if (orb.type === 'dark') {
      // 暗黒の一撃
      setEnemies((prevEnemies) => {
        if (prevEnemies.length === 0) return prevEnemies;
        const lowestHpEnemy = [...prevEnemies].sort((a, b) => a.hp - b.hp)[0];
        const updated = damageEnemy(lowestHpEnemy, orb.evokeVal);
        triggerFx('slash', lowestHpEnemy.instanceId);
        spireAudio.playHeavySlash();
        return prevEnemies
          .map((e) => (e.instanceId === lowestHpEnemy.instanceId ? updated : e))
          .filter((e) => e.hp > 0);
      });
    }
  };

  // 敵へのダメージ計算（脆弱、筋力、脱力考慮）
  const damageEnemy = (target: Enemy, rawDamage: number): Enemy => {
    let finalDamage = rawDamage;
    if (target.statuses.vulnerable > 0) {
      finalDamage = Math.floor(finalDamage * 1.5);
    }
    let remainingDamage = finalDamage;
    let newBlock = target.block;
    let newHp = target.hp;

    if (newBlock > 0) {
      if (remainingDamage <= newBlock) {
        newBlock -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= newBlock;
        newBlock = 0;
      }
    }

    newHp = Math.max(0, newHp - remainingDamage);

    if (remainingDamage > 0) {
      addFloatingText(`-${remainingDamage}`, 200, 100, '#ef4444');
    } else if (rawDamage > 0) {
      addFloatingText('防御!', 200, 100, '#60a5fa');
    }

    // トゲ反射ダメージ
    if (target.statuses.thorns > 0 && isPlayerTurn) {
      damagePlayer(target.statuses.thorns);
    }

    return {
      ...target,
      hp: newHp,
      block: newBlock,
    };
  };

  // プレイヤーへのダメージ計算
  const damagePlayer = (rawDamage: number) => {
    let remaining = rawDamage;
    let currentBlock = playerBlock;

    if (currentBlock > 0) {
      if (remaining <= currentBlock) {
        setPlayerBlock(currentBlock - remaining);
        remaining = 0;
      } else {
        remaining -= currentBlock;
        setPlayerBlock(0);
      }
    }

    if (remaining > 0) {
      addFloatingText(`-${remaining}`, 60, 100, '#f43f5e');
      setHp((prev) => {
        const next = Math.max(0, prev - remaining);
        if (next <= 0) {
          handleGameOver();
        }
        return next;
      });
      triggerFx('slash', 'player');
      spireAudio.playHeavySlash();
    } else {
      triggerFx('shield', 'player');
      spireAudio.playShield();
    }
  };

  // --- カードのプレイ ---
  const handleCardClick = (card: Card) => {
    if (!isPlayerTurn) return;

    if (card.cost > energy) {
      spireAudio.playDebuff();
      return;
    }

    if (card.target === 'enemy') {
      if (enemies.length === 1) {
        // 敵が1体のみの場合はオートターゲットで即時発動！
        playCard(card, enemies[0]);
        setSelectedCard(null);
      } else {
        // 複数敵の場合は選択状態へ
        if (selectedCard?.id === card.id) {
          setSelectedCard(null);
        } else {
          setSelectedCard(card);
          spireAudio.playCardHover();
        }
      }
    } else {
      // 自分自身または全体対象カードは即時発動
      playCard(card, null);
    }
  };

  const handleEnemyTargetClick = (target: Enemy) => {
    if (!isPlayerTurn || !selectedCard) return;
    playCard(selectedCard, target);
    setSelectedCard(null);
  };

  const playCard = (card: Card, target: Enemy | null) => {
    // エナジー消費
    setEnergy((prev) => prev - card.cost);
    spireAudio.playCardPlay();

    // 手札から除外
    setHand((prev) => prev.filter((c) => c.id !== card.id));

    // 消滅 or 捨て札
    if (card.exhaust) {
      setExhaustPile((prev) => [...prev, card]);
    } else {
      setDiscardPile((prev) => [...prev, card]);
    }

    // --- 効果の適用 ---
    // 1. ブロック
    if (card.block) {
      let finalBlock = card.block + playerStatuses.dexterity;
      finalBlock = Math.max(0, finalBlock);
      setPlayerBlock((prev) => prev + finalBlock);
      triggerFx('shield', 'player');
      spireAudio.playShield();
    }

    // 2. ダメージ (単体)
    if (card.damage && target) {
      let baseDmg = card.damage + playerStatuses.strength;
      if (card.id.includes('heavy_blade')) {
        // ヘビーブレード: 筋力倍加
        const mult = card.upgraded ? 5 : 3;
        baseDmg = card.damage + playerStatuses.strength * mult;
      }
      if (playerStatuses.weak > 0) {
        baseDmg = Math.floor(baseDmg * 0.75);
      }
      const hits = card.hits || 1;

      for (let h = 0; h < hits; h++) {
        setEnemies((prevEnemies) => {
          return prevEnemies
            .map((e) => (e.instanceId === target.instanceId ? damageEnemy(e, baseDmg) : e))
            .filter((e) => e.hp > 0);
        });
      }
      triggerFx('slash', target.instanceId);
      spireAudio.playSlash();
    }

    // 3. ダメージ (全体)
    if (card.damage && card.target === 'all_enemies') {
      let baseDmg = card.damage + playerStatuses.strength;
      if (playerStatuses.weak > 0) {
        baseDmg = Math.floor(baseDmg * 0.75);
      }
      const hits = card.hits || 1;

      for (let h = 0; h < hits; h++) {
        setEnemies((prevEnemies) => {
          return prevEnemies
            .map((e) => damageEnemy(e, baseDmg))
            .filter((e) => e.hp > 0);
        });
      }
      enemies.forEach((e) => triggerFx('slash', e.instanceId));
      spireAudio.playHeavySlash();
    }

    // 4. バフ付与 (筋力、敏捷性、金属化、集中力)
    if (card.strength) {
      setPlayerStatuses((prev) => ({
        ...prev,
        strength: prev.strength + card.strength!,
      }));
      triggerFx('buff', 'player');
      spireAudio.playBuff();
    }
    if (card.dexterity) {
      setPlayerStatuses((prev) => ({
        ...prev,
        dexterity: prev.dexterity + card.dexterity!,
      }));
      triggerFx('buff', 'player');
      spireAudio.playBuff();
    }
    if (card.metallicize) {
      setPlayerStatuses((prev) => ({
        ...prev,
        metallicize: prev.metallicize + card.metallicize!,
      }));
      triggerFx('buff', 'player');
      spireAudio.playBuff();
    }
    if (card.focus) {
      setPlayerStatuses((prev) => ({
        ...prev,
        focus: prev.focus + card.focus!,
      }));
      triggerFx('buff', 'player');
      spireAudio.playBuff();
    }

    // 5. デバフ付与 (脆弱、脱力、毒)
    if (target) {
      if (card.vulnerable) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === target.instanceId
              ? {
                  ...e,
                  statuses: {
                    ...e.statuses,
                    vulnerable: e.statuses.vulnerable + card.vulnerable!,
                  },
                }
              : e
          )
        );
        spireAudio.playDebuff();
      }
      if (card.weak) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === target.instanceId
              ? {
                  ...e,
                  statuses: {
                    ...e.statuses,
                    weak: e.statuses.weak + card.weak!,
                  },
                }
              : e
          )
        );
        spireAudio.playDebuff();
      }
      if (card.poison) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === target.instanceId
              ? {
                  ...e,
                  statuses: {
                    ...e.statuses,
                    poison: e.statuses.poison + card.poison!,
                  },
                }
              : e
          )
        );
        triggerFx('poison', target.instanceId);
        spireAudio.playPoison();
      }
    }

    // 全体デバフ
    if (card.target === 'all_enemies') {
      if (card.vulnerable || card.weak) {
        setEnemies((prev) =>
          prev.map((e) => ({
            ...e,
            statuses: {
              ...e.statuses,
              vulnerable: e.statuses.vulnerable + (card.vulnerable || 0),
              weak: e.statuses.weak + (card.weak || 0),
            },
          }))
        );
        spireAudio.playDebuff();
      }
    }

    // 6. ドロー & エナジー
    if (card.draw) {
      drawCards(card.draw);
    }
    if (card.energy) {
      setEnergy((prev) => prev + card.energy!);
      spireAudio.playBuff();
    }

    // 7. 特殊カード効果
    // 怒り: 捨て札に怒りを加える
    if (card.id.includes('anger')) {
      const angerCopy = createCard('anger', card.upgraded);
      setDiscardPile((prev) => [...prev, angerCopy]);
    }
    // 刃の舞: シヴを手札に生成
    if (card.id.includes('blade_dance')) {
      const count = card.upgraded ? 4 : 3;
      const shivs = Array.from({ length: count }, () => createCard('shiv'));
      setHand((prev) => [...prev, ...shivs]);
      spireAudio.playCardDraw();
    }
    // メイジのオーブ生成
    if (card.orbChannel) {
      channelOrb(card.orbChannel);
    }
    // デュアルキャスト: 先頭オーブを2回Evoke
    if (card.evokeOrbs && orbs.length > 0) {
      const leadOrb = orbs[0];
      for (let i = 0; i < card.evokeOrbs; i++) {
        executeEvoke(leadOrb);
      }
      setOrbs((prev) => prev.slice(1));
    }
  };

  // 敵の全滅チェック（勝利判定）
  useEffect(() => {
    if (phase === 'battle' && enemies.length === 0) {
      handleBattleVictory();
    }
  }, [enemies, phase]);

  // --- 戦闘勝利処理 ---
  const handleBattleVictory = () => {
    spireAudio.stopBgm();
    spireAudio.playVictory();

    // レリック効果適用 (紅蓮の心臓: 戦闘終了時HP回復)
    let healAmt = 0;
    relics.forEach((r) => {
      if (r.id === 'burning_blood') healAmt += 6;
      if (r.id === 'meat_on_bone' && hp <= maxHp * 0.5) healAmt += 12;
    });
    if (healAmt > 0) {
      setHp((prev) => Math.min(maxHp, prev + healAmt));
    }

    // ボス撃破判定
    const isBossFight = currentFloor === TOTAL_FLOORS - 1;
    if (isBossFight) {
      const newWins = totalWins + 1;
      setTotalWins(newWins);
      localStorage.setItem(WINS_KEY, newWins.toString());
      setPhase('victory');
      return;
    }

    // 報酬生成
    const isElite = mapNodes.find((n) => n.id === currentNodeId)?.type === 'elite';
    const rewardGold = 15 + Math.floor(Math.random() * 20) + (isElite ? 25 : 0);
    const rewardCards = getRandomRewardCards(heroClass);

    let rewardRelic: Relic | undefined;
    if (isElite || Math.random() < 0.2) {
      rewardRelic = getRandomRelic(relics);
    }

    let rewardPotion: Potion | undefined;
    if (Math.random() < 0.4) {
      rewardPotion = getRandomPotion();
    }

    setRewards({
      gold: rewardGold,
      cards: rewardCards,
      relic: rewardRelic,
      potion: rewardPotion,
    });

    setPhase('battle_rewards');
  };

  // --- プレイヤーターン終了 -> 敵ターン実行 ---
  const handleEndTurn = async () => {
    if (!isPlayerTurn) return;
    setIsPlayerTurn(false);
    setSelectedCard(null);
    spireAudio.playEndTurn();

    // 1. ターン終了時パッシブ (オーブのパッシブ効果)
    if (orbs.length > 0) {
      orbs.forEach((orb) => {
        if (orb.type === 'lightning') {
          // ランダムな敵にパッシブ放電
          if (enemies.length > 0) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            setEnemies((prev) =>
              prev
                .map((e) => (e.instanceId === target.instanceId ? damageEnemy(e, orb.passiveVal) : e))
                .filter((e) => e.hp > 0)
            );
            triggerFx('lightning', target.instanceId);
            spireAudio.playLightning();
          }
        } else if (orb.type === 'frost') {
          // パッシブブロック付与
          setPlayerBlock((prev) => prev + orb.passiveVal);
          triggerFx('shield', 'player');
        } else if (orb.type === 'dark') {
          // 暗黒オーブのダメージ蓄積
          orb.evokeVal += orb.passiveVal;
        }
      });
    }

    // 2. 金属化 & オリハルコンのブロック付与
    let endTurnBlock = playerStatuses.metallicize;
    if (playerBlock === 0 && relics.some((r) => r.id === 'orichalcum')) {
      endTurnBlock += 6;
    }
    if (endTurnBlock > 0) {
      setPlayerBlock((prev) => prev + endTurnBlock);
    }

    // 3. 手札をすべて捨て札へ送る
    setDiscardPile((prev) => [...prev, ...hand]);
    setHand([]);

    // 敵の行動実行ウェイト
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 4. 敵の行動順次実行
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;

      const intent = enemy.intents[enemy.currentIntentIndex];

      // 防御
      if (intent.block) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === enemy.instanceId
              ? { ...e, block: e.block + intent.block! }
              : e
          )
        );
        spireAudio.playShield();
      }

      // 攻撃
      if (intent.damage) {
        let dmg = intent.damage + enemy.statuses.strength;
        if (enemy.statuses.weak > 0) {
          dmg = Math.floor(dmg * 0.75);
        }
        if (playerStatuses.vulnerable > 0) {
          dmg = Math.floor(dmg * 1.5);
        }
        const hits = intent.hits || 1;
        for (let h = 0; h < hits; h++) {
          damagePlayer(dmg);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      // バフ (筋力など)
      if (intent.strength) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === enemy.instanceId
              ? {
                  ...e,
                  statuses: {
                    ...e.statuses,
                    strength: e.statuses.strength + intent.strength!,
                  },
                }
              : e
          )
        );
        spireAudio.playBuff();
      }

      // デバフ (プレイヤーへの脆弱、脱力)
      if (intent.vulnerable) {
        setPlayerStatuses((prev) => ({
          ...prev,
          vulnerable: prev.vulnerable + intent.vulnerable!,
        }));
        spireAudio.playDebuff();
      }
      if (intent.weak) {
        setPlayerStatuses((prev) => ({
          ...prev,
          weak: prev.weak + intent.weak!,
        }));
        spireAudio.playDebuff();
      }

      // カルティストの儀式 (毎ターン筋力+)
      if (enemy.statuses.ritual && enemy.statuses.ritual > 0) {
        setEnemies((prev) =>
          prev.map((e) =>
            e.instanceId === enemy.instanceId
              ? {
                  ...e,
                  statuses: {
                    ...e.statuses,
                    strength: e.statuses.strength + enemy.statuses.ritual!,
                  },
                }
              : e
          )
        );
      }

      // 敵の毒ダメージ処理
      if (enemy.statuses.poison > 0) {
        setEnemies((prev) =>
          prev
            .map((e) => {
              if (e.instanceId === enemy.instanceId) {
                const pDmg = e.statuses.poison;
                return {
                  ...e,
                  hp: Math.max(0, e.hp - pDmg),
                  statuses: { ...e.statuses, poison: pDmg - 1 },
                };
              }
              return e;
            })
            .filter((e) => e.hp > 0)
        );
        spireAudio.playPoison();
      }

      // 次のインテントへ進行
      advanceEnemyIntent(enemy);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // 5. プレイヤーターン開始準備
    setTurn((prev) => prev + 1);
    setPlayerBlock(0); // ブロックリセット
    setEnergy(maxEnergy);

    // デバフのターン経過減少
    setPlayerStatuses((prev) => ({
      ...prev,
      vulnerable: Math.max(0, prev.vulnerable - 1),
      weak: Math.max(0, prev.weak - 1),
    }));

    // 敵のデバフ経過減少
    setEnemies((prev) =>
      prev.map((e) => ({
        ...e,
        block: 0, // 敵のブロックもリセット
        statuses: {
          ...e.statuses,
          vulnerable: Math.max(0, e.statuses.vulnerable - 1),
          weak: Math.max(0, e.statuses.weak - 1),
        },
      }))
    );

    // 悪魔化パワー (毎ターン筋力+)
    if (deck.some((c) => c.name.startsWith('悪魔化'))) {
      setPlayerStatuses((prev) => ({
        ...prev,
        strength: prev.strength + 2,
      }));
    }

    // カードを 5 枚ドロー
    drawCards(5);
    setIsPlayerTurn(true);
  };

  // --- ポーション使用 ---
  const handleUsePotion = (index: number) => {
    const pot = potions[index];
    if (!pot || !isPlayerTurn) return;

    spireAudio.playPotion();

    if (pot.effect.heal) {
      setHp((prev) => Math.min(maxHp, prev + pot.effect.heal!));
    }
    if (pot.effect.block) {
      setPlayerBlock((prev) => prev + pot.effect.block!);
      triggerFx('shield', 'player');
    }
    if (pot.effect.strength) {
      setPlayerStatuses((prev) => ({
        ...prev,
        strength: prev.strength + pot.effect.strength!,
      }));
      triggerFx('buff', 'player');
    }
    if (pot.effect.damage) {
      if (pot.target === 'all_enemies') {
        setEnemies((prev) =>
          prev.map((e) => damageEnemy(e, pot.effect.damage!)).filter((e) => e.hp > 0)
        );
        enemies.forEach((e) => triggerFx('fire', e.instanceId));
      } else if (enemies.length > 0) {
        const target = enemies[0];
        setEnemies((prev) =>
          prev
            .map((e) => (e.instanceId === target.instanceId ? damageEnemy(e, pot.effect.damage!) : e))
            .filter((e) => e.hp > 0)
        );
        triggerFx('fire', target.instanceId);
      }
    }
    if (pot.effect.poison && enemies.length > 0) {
      const target = enemies[0];
      setEnemies((prev) =>
        prev.map((e) =>
          e.instanceId === target.instanceId
            ? {
                ...e,
                statuses: {
                  ...e.statuses,
                  poison: e.statuses.poison + pot.effect.poison!,
                },
              }
            : e
        )
      );
      triggerFx('poison', target.instanceId);
    }

    // スロットからポーション消費
    setPotions((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  // --- ショップの初期化 ---
  const setupShop = () => {
    setHasRemovedCardInShop(false);
    const shopC: Card[] = [];

    // クラスカード3枚
    for (let i = 0; i < 3; i++) {
      const c = getRandomRewardCards(heroClass)[0];
      shopC.push(c);
    }
    setShopCards(shopC);

    // レリック2個
    const r1 = getRandomRelic(relics);
    const r2 = getRandomRelic([...relics, r1]);
    setShopRelics([r1, r2]);

    // ポーション2個
    const p1 = getRandomPotion();
    const p2 = getRandomPotion();
    setShopPotions([p1, p2]);
  };

  // --- イベントの初期化 ---
  const setupEvent = () => {
    const ev = getRandomEvent();
    setCurrentEvent(ev);
    setEventOutcomeText(null);
  };

  // --- 宝箱の初期化 ---
  const setupTreasure = () => {
    const relic = getRandomRelic(relics);
    const chestGold = 50 + Math.floor(Math.random() * 40);
    setRewards({
      gold: chestGold,
      cards: [],
      relic,
    });
  };

  // --- ゲームオーバー ---
  const handleGameOver = () => {
    spireAudio.stopBgm();
    spireAudio.playDefeat();
    setPhase('game_over');
  };

  return (
    <div
      className={`w-full flex flex-col items-center select-none transition-all duration-300 ${
        isFullscreen ? 'h-screen w-screen max-w-none p-0 overflow-hidden' : 'max-w-5xl my-2'
      } ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-stone-900 text-stone-100 shadow-2xl'
      } rounded-3xl border border-stone-800 relative`}
    >
      {/* 画面トップバー */}
      <header
        className={`w-full flex items-center justify-between px-4 py-2.5 border-b border-stone-800/80 bg-stone-950/70 backdrop-blur-md z-30 shrink-0 ${
          isFullscreen ? 'text-sm' : 'text-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition font-bold"
            title="ゲーム一覧へ戻る"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>一覧</span>
          </button>
          <div className="flex items-center gap-1.5 font-black text-amber-400 tracking-wider">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>尖塔 {currentFloor + 1}F</span>
          </div>
        </div>

        {/* プレイヤーステータス (HP, ゴールド, レリック, ポーション) */}
        {phase !== 'class_select' && (
          <div className="flex items-center gap-4">
            {/* HP */}
            <div className="flex items-center gap-1 font-mono font-bold text-rose-400">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              <span>
                {hp} / {maxHp}
              </span>
            </div>

            {/* ゴールド */}
            <div className="flex items-center gap-1 font-mono font-bold text-amber-300">
              <Coins className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{gold} G</span>
            </div>

            {/* レリック一覧 */}
            <div className="flex items-center gap-1">
              {relics.map((r, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-lg bg-stone-800/80 border border-stone-700 flex items-center justify-center text-sm cursor-help hover:scale-110 transition"
                  title={`${r.name}: ${r.description}`}
                >
                  {r.icon}
                </div>
              ))}
            </div>

            {/* ポーションスロット (3枠) */}
            <div className="flex items-center gap-1.5 ml-2">
              {potions.map((pot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUsePotion(idx)}
                  disabled={!pot || phase !== 'battle' || !isPlayerTurn}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs transition ${
                    pot
                      ? 'bg-amber-950/70 border-amber-500 hover:scale-110 cursor-pointer shadow-md'
                      : 'bg-stone-900 border-stone-800 opacity-40 cursor-default'
                  }`}
                  title={pot ? `${pot.name}: ${pot.description} (クリックで使用)` : '空きスロット'}
                >
                  {pot ? pot.icon : '・'}
                </button>
              ))}
            </div>

            {/* デッキ確認ボタン */}
            <button
              onClick={() => setInspectPileType('deck')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-700/50 hover:bg-indigo-900/60 text-indigo-300 font-bold text-xs cursor-pointer"
              title="デッキ全カードを確認"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>デッキ ({deck.length})</span>
            </button>
          </div>
        )}

        {/* サウンド切り替え */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition cursor-pointer"
            title={isSoundMuted ? 'サウンドON' : 'サウンドOFF'}
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* メインビューエリア */}
      <div className={`w-full flex-1 flex flex-col relative overflow-hidden ${isFullscreen ? 'h-full' : 'min-h-[580px]'}`}>
        {/* ---------------- 1. クラス選択フェーズ ---------------- */}
        {phase === 'class_select' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 mb-2">
              スパイア・オブ・フェイト
            </h1>
            <p className="text-sm text-stone-400 mb-8 max-w-lg">
              尖塔の頂を目指す挑戦者よ、運命を共にする英雄を選択せよ。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
              {/* ウォーリアー */}
              <div
                onClick={() => startGameWithClass('warrior')}
                className="group relative rounded-2xl p-6 bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 hover:border-red-500/80 hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-300 cursor-pointer flex flex-col items-center text-left"
              >
                <div className="w-20 h-20 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-1">ブレードウォリアー</h3>
                <span className="text-xs text-stone-400 mb-3">鉄の戦士 / 剛撃＆筋力</span>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  強靭な肉体と圧倒的な膂力で敵を粉砕する。筋力を高めてヘビーブレードや旋風刃を放ち、戦闘終了時にHPを自動回復する。
                </p>
                <div className="mt-auto w-full pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                  <div>❤️ 初期HP: 80</div>
                  <div>🩸 レリック: 紅蓮の心臓 (戦闘後HP+6回復)</div>
                </div>
              </div>

              {/* ローグ */}
              <div
                onClick={() => startGameWithClass('rogue')}
                className="group relative rounded-2xl p-6 bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 hover:border-emerald-500/80 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 cursor-pointer flex flex-col items-center text-left"
              >
                <div className="w-20 h-20 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
                  🗡️
                </div>
                <h3 className="text-xl font-bold text-emerald-400 mb-1">シャドウローグ</h3>
                <span className="text-xs text-stone-400 mb-3">影の狩人 / 毒＆ナイフ連打</span>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  0コストのシヴ連撃と、毎ターン敵を蝕む猛毒を操る暗殺者。素早いドロー加速と回避・敏捷性で相手を翻弄する。
                </p>
                <div className="mt-auto w-full pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                  <div>❤️ 初期HP: 70</div>
                  <div>🐍 レリック: 毒蛇の指輪 (1ターン目ドロー+2)</div>
                </div>
              </div>

              {/* メイジ */}
              <div
                onClick={() => startGameWithClass('mage')}
                className="group relative rounded-2xl p-6 bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 hover:border-cyan-500/80 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer flex flex-col items-center text-left"
              >
                <div className="w-20 h-20 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-cyan-400 mb-1">ストームメイジ</h3>
                <span className="text-xs text-stone-400 mb-3">魔導技師 / オーブ＆集中力</span>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  電撃・氷結・暗黒のオーブを召喚・循環させ、自動攻撃や超シールド、大解放(Evoke)を炸裂させる知略の魔導師。
                </p>
                <div className="mt-auto w-full pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                  <div>❤️ 初期HP: 75</div>
                  <div>⚡ レリック: 共鳴コア (戦闘開始時電撃オーブ生成)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. マップ画面フェーズ ---------------- */}
        {phase === 'map' && (
          <div
            className={`w-full flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto ${
              isFullscreen ? 'max-h-[calc(100vh-65px)]' : 'max-h-[85vh]'
            }`}
          >
            <div className="text-center mb-4">
              <h2 className="text-xl font-black text-amber-300 flex items-center justify-center gap-2">
                <span>運命の尖塔 マップ</span>
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                輝くノードを選択して上層へ進軍してください。
              </p>
            </div>

            {/* フロアツリーマップ */}
            <div className="flex flex-col-reverse gap-3 items-center w-full max-w-md py-4">
              {Array.from({ length: TOTAL_FLOORS }).map((_, fIndex) => {
                const floorNodes = mapNodes.filter((n) => n.floor === fIndex);
                const isCurrentF = currentFloor === fIndex;

                return (
                  <div
                    key={fIndex}
                    className={`flex items-center justify-center gap-8 w-full py-1.5 rounded-xl transition ${
                      isCurrentF ? 'bg-amber-500/10 border border-amber-500/20' : ''
                    }`}
                  >
                    <span className="text-[10px] font-mono text-stone-500 w-8 text-right">
                      {fIndex + 1}F
                    </span>
                    <div className="flex items-center gap-6 justify-center flex-1">
                      {floorNodes.map((node) => {
                        const isAvail = node.available;
                        const isVisited = node.visited;

                        let icon = '⚔️';
                        let label = '敵';
                        let colorClass = 'border-stone-700 bg-stone-900 text-stone-300';

                        if (node.type === 'elite') {
                          icon = '👹';
                          label = 'エリート';
                          colorClass = 'border-red-600/70 bg-red-950/40 text-red-300';
                        } else if (node.type === 'event') {
                          icon = '❓';
                          label = '未知';
                          colorClass = 'border-blue-500/60 bg-blue-950/40 text-blue-300';
                        } else if (node.type === 'shop') {
                          icon = '💰';
                          label = '商人';
                          colorClass = 'border-amber-500/70 bg-amber-950/40 text-amber-300';
                        } else if (node.type === 'rest') {
                          icon = '🏕️';
                          label = '休息';
                          colorClass = 'border-emerald-500/70 bg-emerald-950/40 text-emerald-300';
                        } else if (node.type === 'treasure') {
                          icon = '🏆';
                          label = '宝箱';
                          colorClass = 'border-yellow-400/80 bg-yellow-950/40 text-yellow-300';
                        } else if (node.type === 'boss') {
                          icon = '👑';
                          label = 'ボス';
                          colorClass = 'border-purple-500 bg-purple-950/60 text-purple-200 text-lg';
                        }

                        return (
                          <button
                            key={node.id}
                            onClick={() => enterNode(node)}
                            disabled={!isAvail}
                            className={`relative group p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                              isAvail
                                ? 'scale-110 shadow-lg shadow-amber-500/25 border-amber-400 animate-pulse cursor-pointer ring-2 ring-amber-400/50'
                                : isVisited
                                ? 'opacity-40 grayscale cursor-default border-stone-800'
                                : 'opacity-60 cursor-not-allowed'
                            } ${colorClass}`}
                            title={`${label} (${node.type})`}
                          >
                            <span className="text-xl">{icon}</span>
                            <span className="text-[9px] font-bold mt-0.5">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- 3. 戦闘フェーズ ---------------- */}
        {phase === 'battle' && (
          <div className="w-full flex-1 flex flex-col justify-between p-3 sm:p-5 relative">
            {/* 戦闘情報ヘッダー */}
            <div className="w-full flex items-center justify-between px-4 pb-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-300 font-bold text-xs">
                  ターン {turn}
                </span>
                {currentBattleType === 'elite' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500 text-red-300 font-black text-xs animate-pulse">
                    👹 ELITE
                  </span>
                )}
                {currentBattleType === 'boss' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500 text-purple-300 font-black text-xs animate-pulse">
                    👑 BOSS
                  </span>
                )}
              </div>
              {selectedCard && (
                <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold animate-pulse">
                  対象の敵を選択してください
                </div>
              )}
            </div>

            {/* 浮遊テキスト & エフェクト描画コンテナ */}
            {floatingTexts.map((ft) => (
              <div
                key={ft.id}
                className="absolute top-1/3 left-1/2 -translate-x-1/2 font-black text-2xl drop-shadow-md pointer-events-none animate-bounce z-40"
                style={{ color: ft.color }}
              >
                {ft.text}
              </div>
            ))}
            {battleFxList.map((fx) => (
              <div
                key={fx.id}
                className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 animate-ping"
              >
                <div className="text-6xl opacity-75">
                  {fx.type === 'slash' ? '⚔️' : fx.type === 'shield' ? '🛡️' : fx.type === 'lightning' ? '⚡' : fx.type === 'fire' ? '🔥' : '🧪'}
                </div>
              </div>
            ))}

            {/* バトルアリーナ（上部・中央） */}
            <div
              onClick={() => {
                if (selectedCard) setSelectedCard(null);
              }}
              className="flex-1 flex items-center justify-between px-4 sm:px-12 relative"
            >
              {/* プレイヤー陣営 (左側) */}
              <div className="flex flex-col items-center relative">
                {/* オーブスロット (メイジ専用) */}
                {heroClass === 'mage' && (
                  <div className="flex items-center gap-2 mb-2">
                    {Array.from({ length: 3 }).map((_, idx) => {
                      const orb = orbs[idx];
                      return (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-full border flex flex-col items-center justify-center text-xs transition ${
                            orb
                              ? orb.type === 'lightning'
                                ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/30'
                                : orb.type === 'frost'
                                ? 'bg-blue-500/20 border-blue-400 shadow-lg shadow-blue-500/30'
                                : 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-500/30'
                              : 'bg-stone-900 border-stone-800 opacity-40'
                          }`}
                          title={
                            orb
                              ? `${orb.type.toUpperCase()}: パッシブ ${orb.passiveVal} / 解放 ${orb.evokeVal}`
                              : '空スロット'
                          }
                        >
                          {orb ? (
                            <>
                              <span>{orb.type === 'lightning' ? '⚡' : orb.type === 'frost' ? '❄️' : '🟣'}</span>
                              <span className="text-[9px] font-bold">{orb.passiveVal}</span>
                            </>
                          ) : (
                            '・'
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* プレイヤーアバター */}
                <div className="relative group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-stone-900 to-stone-800 border-2 border-stone-700 flex items-center justify-center text-5xl shadow-xl">
                    {heroClass === 'warrior' ? '🛡️' : heroClass === 'rogue' ? '🗡️' : '⚡'}
                  </div>

                  {/* ブロック表示 */}
                  {playerBlock > 0 && (
                    <div className="absolute -top-3 -right-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-xs border border-blue-400 shadow-lg animate-bounce">
                      <Shield className="w-3.5 h-3.5 fill-white" />
                      <span>{playerBlock}</span>
                    </div>
                  )}
                </div>

                {/* HP バー */}
                <div className="w-32 mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold font-mono">
                    <span className="text-rose-400">HP</span>
                    <span>
                      {hp} / {maxHp}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                    <div
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-300"
                      style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* プレイヤーバフ・デバフ一覧 */}
                <div className="flex flex-wrap gap-1 mt-2 max-w-[150px] justify-center">
                  {playerStatuses.strength !== 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600/50 text-[10px] text-amber-300 font-bold">
                      筋力 {playerStatuses.strength > 0 ? `+${playerStatuses.strength}` : playerStatuses.strength}
                    </span>
                  )}
                  {playerStatuses.dexterity !== 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-600/50 text-[10px] text-emerald-300 font-bold">
                      敏捷 {playerStatuses.dexterity > 0 ? `+${playerStatuses.dexterity}` : playerStatuses.dexterity}
                    </span>
                  )}
                  {playerStatuses.vulnerable > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500 text-[10px] text-red-300 font-bold">
                      脆弱 {playerStatuses.vulnerable}
                    </span>
                  )}
                  {playerStatuses.weak > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-600 text-[10px] text-stone-300 font-bold">
                      脱力 {playerStatuses.weak}
                    </span>
                  )}
                </div>
              </div>

              {/* 敵陣営 (右側) */}
              <div className="flex items-center gap-6 sm:gap-10">
                {enemies.map((enemy) => {
                  const intent = enemy.intents[enemy.currentIntentIndex];
                  const isTargeted = selectedCard?.target === 'enemy';

                  // 実ダメージ予測計算
                  let calculatedDmg = intent?.damage || 0;
                  if (calculatedDmg > 0) {
                    calculatedDmg += enemy.statuses.strength;
                    if (enemy.statuses.weak > 0) {
                      calculatedDmg = Math.floor(calculatedDmg * 0.75);
                    }
                    if (playerStatuses.vulnerable > 0) {
                      calculatedDmg = Math.floor(calculatedDmg * 1.5);
                    }
                  }

                  return (
                    <div
                      key={enemy.instanceId}
                      onClick={() => handleEnemyTargetClick(enemy)}
                      className={`flex flex-col items-center relative transition-all duration-300 ${
                        isTargeted
                          ? 'cursor-crosshair scale-105 ring-2 ring-red-500/80 rounded-2xl p-2 bg-red-500/10'
                          : ''
                      }`}
                    >
                      {/* インテント（行動予告）アイコンと数値 */}
                      {intent && (
                        <div
                          className="flex items-center gap-1 mb-2 px-2.5 py-1 rounded-full bg-stone-900/90 border border-stone-700 shadow-md text-xs cursor-help animate-pulse"
                          title={intent.description}
                        >
                          {intent.type === 'attack' || intent.type === 'attack_buff' || intent.type === 'attack_debuff' ? (
                            <div className="flex items-center gap-0.5 text-red-400 font-black font-mono">
                              <Sword className="w-3.5 h-3.5" />
                              <span>{calculatedDmg}</span>
                              {intent.hits && intent.hits > 1 && <span>x{intent.hits}</span>}
                            </div>
                          ) : intent.type === 'defend' || intent.type === 'defend_buff' ? (
                            <div className="flex items-center gap-0.5 text-blue-400 font-bold font-mono">
                              <Shield className="w-3.5 h-3.5" />
                              <span>{intent.block}</span>
                            </div>
                          ) : intent.type === 'buff' ? (
                            <div className="flex items-center gap-0.5 text-amber-400 font-bold">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>強化</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 text-purple-400 font-bold">
                              <Skull className="w-3.5 h-3.5" />
                              <span>妨害</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 敵アバター */}
                      <div className="relative">
                        <div
                          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr ${enemy.color} border-2 border-stone-700 flex items-center justify-center text-5xl shadow-2xl`}
                        >
                          {enemy.avatarIcon}
                        </div>

                        {/* 敵ブロック */}
                        {enemy.block > 0 && (
                          <div className="absolute -top-3 -right-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-xs border border-blue-400 shadow-lg">
                            <Shield className="w-3.5 h-3.5 fill-white" />
                            <span>{enemy.block}</span>
                          </div>
                        )}
                      </div>

                      {/* 敵名前 */}
                      <div className="text-xs font-bold text-stone-200 mt-2">
                        {enemy.name}
                      </div>

                      {/* 敵HPバー */}
                      <div className="w-28 mt-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold font-mono">
                          <span className="text-rose-400">HP</span>
                          <span>
                            {enemy.hp} / {enemy.maxHp}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
                          <div
                            className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
                            style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* 敵ステータス一覧 (毒、筋力、脆弱、脱力など) */}
                      <div className="flex flex-wrap gap-1 mt-1.5 max-w-[130px] justify-center">
                        {enemy.statuses.poison > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500 text-[10px] text-emerald-300 font-bold">
                            毒 {enemy.statuses.poison}
                          </span>
                        )}
                        {enemy.statuses.vulnerable > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500 text-[10px] text-red-300 font-bold">
                            脆弱 {enemy.statuses.vulnerable}
                          </span>
                        )}
                        {enemy.statuses.weak > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-600 text-[10px] text-stone-300 font-bold">
                            脱力 {enemy.statuses.weak}
                          </span>
                        )}
                        {enemy.statuses.strength > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600 text-[10px] text-amber-300 font-bold">
                            筋力 +{enemy.statuses.strength}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* バトル操作エリア（下部手札 & エナジー & ターン終了） */}
            <div className="w-full flex flex-col items-center pt-2 relative z-20">
              {/* エナジー & ターン終了バー */}
              <div className="w-full flex items-center justify-between px-6 mb-2">
                {/* 山札確認 */}
                <button
                  onClick={() => setInspectPileType('draw')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-xs font-bold text-stone-300 cursor-pointer"
                >
                  <span>山札:</span>
                  <span className="font-mono text-amber-400">{drawPile.length}</span>
                </button>

                {/* 現在エナジーオーブ */}
                <div className="flex items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 border-2 border-yellow-200 shadow-xl shadow-amber-500/30 flex items-center justify-center text-xl font-black text-stone-950 font-mono">
                    {energy}/{maxEnergy}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* ターン終了ボタン */}
                  <button
                    onClick={handleEndTurn}
                    disabled={!isPlayerTurn}
                    className={`px-5 py-2.5 rounded-2xl font-black text-sm transition-all shadow-lg cursor-pointer ${
                      isPlayerTurn
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-rose-600/30 active:scale-95'
                        : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    ターン終了
                  </button>

                  {/* 捨て札確認 */}
                  <button
                    onClick={() => setInspectPileType('discard')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-xs font-bold text-stone-300 cursor-pointer"
                  >
                    <span>捨て札:</span>
                    <span className="font-mono text-stone-400">{discardPile.length}</span>
                  </button>

                  {/* 消滅カード確認 */}
                  {exhaustPile.length > 0 && (
                    <button
                      onClick={() => setInspectPileType('exhaust')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 text-xs font-bold text-rose-300 cursor-pointer"
                    >
                      <span>消滅:</span>
                      <span className="font-mono text-rose-400">{exhaustPile.length}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 手札カードトレイ */}
              <div className="flex items-end justify-center gap-2 overflow-x-auto max-w-full pb-2 px-4 scrollbar-none min-h-[160px]">
                {hand.map((card) => {
                  const isSelected = selectedCard?.id === card.id;
                  const canAfford = energy >= card.cost;

                  let borderClass = 'border-stone-700 bg-stone-900';
                  let headerColor = 'bg-stone-800 text-stone-200';

                  if (card.type === 'attack') {
                    borderClass = 'border-red-600/60 bg-gradient-to-b from-stone-900 to-red-950/40';
                    headerColor = 'bg-red-900/60 text-red-200';
                  } else if (card.type === 'skill') {
                    borderClass = 'border-blue-600/60 bg-gradient-to-b from-stone-900 to-blue-950/40';
                    headerColor = 'bg-blue-900/60 text-blue-200';
                  } else if (card.type === 'power') {
                    borderClass = 'border-amber-500/70 bg-gradient-to-b from-stone-900 to-amber-950/40';
                    headerColor = 'bg-amber-900/60 text-amber-200';
                  }

                  return (
                    <div
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      className={`relative ${
                        isFullscreen
                          ? 'w-32 sm:w-36 h-44 sm:h-52 text-xs'
                          : 'w-28 sm:w-32 h-40 sm:h-44 text-[11px]'
                      } rounded-2xl border-2 p-2.5 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none shrink-0 ${
                        isSelected
                          ? '-translate-y-6 scale-110 shadow-2xl ring-4 ring-amber-400 z-30'
                          : 'hover:-translate-y-4 hover:scale-105 hover:z-20'
                      } ${!canAfford ? 'opacity-50 grayscale-[30%]' : ''} ${borderClass}`}
                    >
                      {/* コストオーブ */}
                      <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-amber-500 border border-yellow-200 text-stone-950 font-black text-xs font-mono flex items-center justify-center shadow-md">
                        {card.cost}
                      </div>

                      {/* カード名 & タイプ */}
                      <div className="mt-1 text-center">
                        <div
                          className={`text-[11px] font-black tracking-tight py-0.5 px-1 rounded-md ${headerColor} truncate`}
                        >
                          {card.name}
                        </div>
                        <span className="text-[8px] font-semibold text-stone-400 uppercase tracking-wider">
                          {card.type}
                        </span>
                      </div>

                      {/* 効果説明文 */}
                      <div className="my-auto text-[10px] text-stone-300 leading-snug text-center px-1">
                        {card.description}
                      </div>

                      {/* レアリティ＆消滅表示 */}
                      <div className="flex justify-between items-center text-[8px] text-stone-400 border-t border-stone-800/80 pt-1">
                        <span className="capitalize">{card.rarity}</span>
                        {card.exhaust && <span className="text-rose-400">消滅</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 4. 戦闘勝利報酬フェーズ ---------------- */}
        {phase === 'battle_rewards' && rewards && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <h2 className="text-2xl font-black text-amber-400 mb-1 flex items-center gap-2">
              <Award className="w-7 h-7 text-amber-400" />
              <span>戦闘勝利！</span>
            </h2>
            <p className="text-xs text-stone-400 mb-6">報酬を獲得して更なる高みへ進め。</p>

            <div className="w-full max-w-md space-y-3 mb-6">
              {/* ゴールド報酬 */}
              {rewards.gold > 0 && (
                <div
                  onClick={() => {
                    setGold((prev) => prev + rewards.gold);
                    spireAudio.playGold();
                    setRewards({ ...rewards, gold: 0 });
                  }}
                  className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 font-bold text-amber-300 text-sm">
                    <Coins className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span>金貨 +{rewards.gold} G</span>
                  </div>
                  <span className="text-xs text-stone-400">獲得</span>
                </div>
              )}

              {/* ポーション報酬 */}
              {rewards.potion && (
                <div
                  onClick={() => {
                    const emptyIdx = potions.findIndex((p) => p === null);
                    if (emptyIdx !== -1) {
                      setPotions((prev) => {
                        const next = [...prev];
                        next[emptyIdx] = rewards.potion!;
                        return next;
                      });
                      spireAudio.playPotion();
                      setRewards({ ...rewards, potion: undefined });
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 font-bold text-emerald-300 text-sm">
                    <span className="text-lg">{rewards.potion.icon}</span>
                    <span>{rewards.potion.name}</span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {potions.some((p) => p === null) ? '獲得' : '枠満杯'}
                  </span>
                </div>
              )}

              {/* レリック報酬 */}
              {rewards.relic && (
                <div
                  onClick={() => {
                    setRelics((prev) => [...prev, rewards.relic!]);
                    spireAudio.playBuff();
                    setRewards({ ...rewards, relic: undefined });
                  }}
                  className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-indigo-500 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5 font-bold text-indigo-300 text-sm">
                    <span className="text-lg">{rewards.relic.icon}</span>
                    <span>{rewards.relic.name}</span>
                  </div>
                  <span className="text-xs text-stone-400">獲得</span>
                </div>
              )}
            </div>

            {/* カード選択提示 (3枚から1枚選ぶ) */}
            {rewards.cards.length > 0 && (
              <div className="w-full max-w-2xl mb-6">
                <div className="text-xs font-bold text-stone-400 mb-3">
                  デッキに加えるカードを 1 枚選択してください：
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {rewards.cards.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setDeck((prev) => [...prev, c]);
                        spireAudio.playCardDraw();
                        setRewards({ ...rewards, cards: [] });
                      }}
                      className="p-3 rounded-2xl border-2 border-stone-700 hover:border-amber-400 bg-stone-900 hover:scale-105 transition cursor-pointer flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-amber-300 truncate">{c.name}</span>
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-mono text-[10px]">
                          {c.cost}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug my-auto">
                        {c.description}
                      </p>
                      <span className="text-[9px] text-stone-500 uppercase mt-2">
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRewards({ ...rewards, cards: [] })}
                  className="mt-3 text-xs text-stone-400 hover:text-stone-200 underline cursor-pointer"
                >
                  カード獲得をスキップ
                </button>
              </div>
            )}

            {/* マップへ戻るボタン */}
            <button
              onClick={() => setPhase('map')}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              尖塔マップへ進む
            </button>
          </div>
        )}

        {/* ---------------- 5. ショップフェーズ ---------------- */}
        {phase === 'shop' && (
          <div className="w-full flex-1 flex flex-col p-6 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <span>尖塔の闇商人</span>
                </h2>
                <p className="text-xs text-stone-400">ゴールドを使ってカードや秘宝を購入できます。</p>
              </div>
              <button
                onClick={() => setPhase('map')}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition cursor-pointer"
              >
                店を出る
              </button>
            </div>

            {/* カード販売 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                販売カード (各 50 G)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {shopCards.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (gold >= 50) {
                        setGold((prev) => prev - 50);
                        setDeck((prev) => [...prev, c]);
                        setShopCards((prev) => prev.filter((sc) => sc.id !== c.id));
                        spireAudio.playGold();
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition flex flex-col justify-between min-h-[130px] ${
                      gold >= 50
                        ? 'border-stone-700 bg-stone-900 hover:border-amber-400 cursor-pointer'
                        : 'border-stone-800 bg-stone-950 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-amber-300">{c.name}</span>
                      <span className="text-amber-400 font-mono">50 G</span>
                    </div>
                    <p className="text-[11px] text-stone-300 my-auto">{c.description}</p>
                    <span className="text-[9px] text-stone-500 uppercase">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* レリック販売 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                秘宝・レリック (各 150 G)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shopRelics.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (gold >= 150) {
                        setGold((prev) => prev - 150);
                        setRelics((prev) => [...prev, r]);
                        setShopRelics((prev) => prev.filter((sr) => sr.id !== r.id));
                        spireAudio.playGold();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition ${
                      gold >= 150
                        ? 'border-stone-700 bg-stone-900 hover:border-amber-400 cursor-pointer'
                        : 'border-stone-800 bg-stone-950 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-stone-200">{r.name}</div>
                        <div className="text-[10px] text-stone-400">{r.description}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">150 G</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ポーション販売 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                薬品・ポーション (各 50 G)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shopPotions.map((pot) => {
                  const hasEmptySlot = potions.some((p) => p === null);
                  const canBuy = gold >= 50 && hasEmptySlot;

                  return (
                    <div
                      key={pot.id}
                      onClick={() => {
                        if (canBuy) {
                          const emptyIdx = potions.findIndex((p) => p === null);
                          if (emptyIdx !== -1) {
                            setGold((prev) => prev - 50);
                            setPotions((prev) => {
                              const next = [...prev];
                              next[emptyIdx] = pot;
                              return next;
                            });
                            setShopPotions((prev) => prev.filter((p) => p.id !== pot.id));
                            spireAudio.playPotion();
                          }
                        }
                      }}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition ${
                        canBuy
                          ? 'border-stone-700 bg-stone-900 hover:border-emerald-400 cursor-pointer'
                          : 'border-stone-800 bg-stone-950 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{pot.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-stone-200">{pot.name}</div>
                          <div className="text-[10px] text-stone-400">{pot.description}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {hasEmptySlot ? '50 G' : '枠満杯'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 不要カードの除去サービス */}
            <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-200">不要カードの除去サービス</h4>
                <p className="text-[11px] text-stone-400">
                  デッキから不要なカードを 1 枚完全に取り除きます。(75 G)
                </p>
              </div>
              <button
                onClick={() => {
                  if (gold >= 75 && !hasRemovedCardInShop) {
                    setInspectPileType('remove');
                  }
                }}
                disabled={gold < 75 || hasRemovedCardInShop}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  gold >= 75 && !hasRemovedCardInShop
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-800 text-stone-500 opacity-50 cursor-not-allowed'
                }`}
              >
                {hasRemovedCardInShop ? '利用済み' : '除去 (75 G)'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- 6. キャンプファイヤー休憩所フェーズ ---------------- */}
        {phase === 'rest' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="text-5xl mb-3">🏕️</div>
            <h2 className="text-2xl font-black text-amber-400 mb-1">安息の焚き火</h2>
            <p className="text-xs text-stone-400 mb-8 max-w-sm">
              暖かな炎が冒険の疲労を包み込む。休息をとるか、武器・技を鍛錬するか選択してください。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg w-full mb-6">
              {/* 休息 */}
              <button
                onClick={() => {
                  const healAmt = Math.floor(maxHp * 0.3);
                  setHp((prev) => Math.min(maxHp, prev + healAmt));
                  spireAudio.playBuff();
                  setPhase('map');
                }}
                className="p-6 rounded-2xl bg-stone-900 border-2 border-stone-800 hover:border-emerald-500/80 hover:scale-105 transition flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition">
                  💤
                </div>
                <div className="text-sm font-bold text-emerald-400 mb-1">休息</div>
                <p className="text-xs text-stone-400">
                  HP を 最大値の 30% (+{Math.floor(maxHp * 0.3)}) 回復する。
                </p>
              </button>

              {/* 鍛冶 */}
              <button
                onClick={() => {
                  setInspectPileType('forge');
                }}
                className="p-6 rounded-2xl bg-stone-900 border-2 border-stone-800 hover:border-amber-500/80 hover:scale-105 transition flex flex-col items-center cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-amber-950/50 border border-amber-500/40 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition">
                  🔨
                </div>
                <div className="text-sm font-bold text-amber-400 mb-1">鍛冶</div>
                <p className="text-xs text-stone-400">
                  手持ちのカード 1 枚を選んで【+版】に永続強化する。
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- 7. 未知のイベントフェーズ ---------------- */}
        {phase === 'event' && currentEvent && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="text-5xl mb-3">{currentEvent.imageIcon}</div>
            <h2 className="text-2xl font-black text-blue-300 mb-2">{currentEvent.title}</h2>
            <p className="text-xs text-stone-300 max-w-lg mb-6 leading-relaxed">
              {currentEvent.description}
            </p>

            {eventOutcomeText ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-900 border border-stone-700 text-xs font-bold text-amber-300 max-w-md">
                  {eventOutcomeText}
                </div>
                <button
                  onClick={() => setPhase('map')}
                  className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold cursor-pointer"
                >
                  先へ進む
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md space-y-3">
                {currentEvent.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const res = opt.outcome({
                        hp,
                        maxHp,
                        gold,
                        deck,
                        relics,
                        potions,
                      });
                      setEventOutcomeText(res);
                      spireAudio.playBuff();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-blue-400 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-200">{opt.text}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 8. 宝箱フェーズ ---------------- */}
        {phase === 'treasure' && rewards && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-yellow-400 mb-2">古代の秘宝箱</h2>
            <p className="text-xs text-stone-400 mb-6">尖塔に眠る豪華な遺宝を発見した！</p>

            <div className="w-full max-w-md space-y-3 mb-6">
              {rewards.gold > 0 && (
                <div
                  onClick={() => {
                    setGold((prev) => prev + rewards.gold);
                    spireAudio.playGold();
                    setRewards({ ...rewards, gold: 0 });
                  }}
                  className="p-4 rounded-2xl bg-stone-900 border border-stone-700 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                >
                  <span className="font-bold text-amber-300">金貨 +{rewards.gold} G</span>
                  <span className="text-xs text-stone-400">獲得</span>
                </div>
              )}
              {rewards.relic && (
                <div
                  onClick={() => {
                    setRelics((prev) => [...prev, rewards.relic!]);
                    spireAudio.playBuff();
                    setRewards({ ...rewards, relic: undefined });
                  }}
                  className="p-4 rounded-2xl bg-stone-900 border border-stone-700 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rewards.relic.icon}</span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-stone-100">
                        {rewards.relic.name}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {rewards.relic.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-stone-400">獲得</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setPhase('map')}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 text-stone-950 font-black text-sm shadow-lg hover:scale-105 transition cursor-pointer"
            >
              尖塔マップへ戻る
            </button>
          </div>
        )}

        {/* ---------------- 9. ゲームオーバーフェーズ ---------------- */}
        {phase === 'game_over' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <Skull className="w-16 h-16 text-rose-500 mb-3" />
            <h2 className="text-3xl font-black text-rose-400 mb-2">力尽きた…</h2>
            <p className="text-sm text-stone-400 mb-6">
              尖塔の試練は過酷だった。到達階層: {currentFloor + 1}F
            </p>

            <button
              onClick={() => setPhase('class_select')}
              className="px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm transition cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>もう一度挑戦する</span>
            </button>
          </div>
        )}

        {/* ---------------- 10. 勝利（クリア）フェーズ ---------------- */}
        {phase === 'victory' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-3xl font-black text-amber-400 mb-2">尖塔制覇！！</h2>
            <p className="text-sm text-stone-300 mb-6 max-w-md">
              巨躯の帝王を打ち破り、尖塔の最上階に到達した！君の名は伝説として永遠に語り継がれるだろう。
            </p>
            <div className="text-xs font-mono text-amber-300 mb-8">
              通算クリア回数: {totalWins} 回
            </div>

            <button
              onClick={() => setPhase('class_select')}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-sm shadow-xl hover:scale-105 transition cursor-pointer"
            >
              新たな冒険へ出撃する
            </button>
          </div>
        )}
      </div>

      {/* ---------------- デッキ / 山札 / 捨て札 / 鍛冶 / 除去 モーダル ---------------- */}
      {inspectPileType && (
        <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex flex-col items-center p-6 overflow-y-auto">
          <div className="w-full max-w-3xl flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
            <h3 className="text-lg font-bold text-amber-300">
              {inspectPileType === 'deck' && `所持デッキ一覧 (${deck.length} 枚)`}
              {inspectPileType === 'draw' && `山札の残り (${drawPile.length} 枚)`}
              {inspectPileType === 'discard' && `捨て札一覧 (${discardPile.length} 枚)`}
              {inspectPileType === 'forge' && '強化するカードを 1 枚選択してください'}
              {inspectPileType === 'remove' && '除去するカードを 1 枚選択してください'}
            </h3>
            <button
              onClick={() => setInspectPileType(null)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold cursor-pointer"
            >
              閉じる
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
            {(inspectPileType === 'deck' || inspectPileType === 'forge' || inspectPileType === 'remove'
              ? deck
              : inspectPileType === 'draw'
              ? drawPile
              : discardPile
            ).map((card, idx) => {
              const canForge = inspectPileType === 'forge' && !card.upgraded;
              const canRemove = inspectPileType === 'remove';

              return (
                <div
                  key={`${card.id}_${idx}`}
                  onClick={() => {
                    if (canForge) {
                      upgradeCard(card);
                      spireAudio.playBuff();
                      setInspectPileType(null);
                      setPhase('map');
                    } else if (canRemove) {
                      setDeck((prev) => prev.filter((_, i) => i !== idx));
                      setGold((prev) => prev - 75);
                      setHasRemovedCardInShop(true);
                      spireAudio.playSlash();
                      setInspectPileType(null);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 flex flex-col justify-between min-h-[140px] transition ${
                    canForge || canRemove
                      ? 'border-amber-500 bg-stone-900 hover:scale-105 cursor-pointer shadow-lg'
                      : 'border-stone-700 bg-stone-900/90'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-stone-200 truncate">{card.name}</span>
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-mono text-[10px]">
                      {card.cost}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 my-auto">{card.description}</p>
                  <div className="flex justify-between text-[8px] text-stone-500 uppercase mt-2">
                    <span>{card.type}</span>
                    {card.upgraded && <span className="text-amber-400 font-bold">強化済み</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
