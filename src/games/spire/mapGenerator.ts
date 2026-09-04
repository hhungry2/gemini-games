import { MapNode, NodeType, SpireEvent } from './types';

export const TOTAL_FLOORS = 15;
const LANES_COUNT = 3;

// 分岐ツリーマップを自動生成
export function generateSpireMap(): MapNode[] {
  const nodes: MapNode[] = [];

  // フロア 0 から TOTAL_FLOORS - 1 まで
  for (let floor = 0; floor < TOTAL_FLOORS; floor++) {
    if (floor === TOTAL_FLOORS - 1) {
      // 最終フロア: ボスノード (中央1つのみ)
      nodes.push({
        id: `node_${floor}_1`,
        floor,
        lane: 1,
        type: 'boss',
        nextNodes: [],
        visited: false,
        available: false,
      });
      continue;
    }

    if (floor === TOTAL_FLOORS - 2) {
      // ボス直前: 必ずキャンプファイヤー (休憩所)
      for (let lane = 0; lane < LANES_COUNT; lane++) {
        nodes.push({
          id: `node_${floor}_${lane}`,
          floor,
          lane,
          type: 'rest',
          nextNodes: [`node_${floor + 1}_1`],
          visited: false,
          available: false,
        });
      }
      continue;
    }

    if (floor === 7) {
      // 中盤固定: 宝箱フロア (Treasure)
      for (let lane = 0; lane < LANES_COUNT; lane++) {
        nodes.push({
          id: `node_${floor}_${lane}`,
          floor,
          lane,
          type: 'treasure',
          nextNodes: [],
          visited: false,
          available: false,
        });
      }
      continue;
    }

    // 通常フロアのノード生成
    for (let lane = 0; lane < LANES_COUNT; lane++) {
      let type: NodeType = 'monster';

      if (floor === 0) {
        // 初手は必ず通常モンスター
        type = 'monster';
      } else if (floor >= 5 && floor <= 11 && Math.random() < 0.28) {
        // エリート出現ゾーン
        type = 'elite';
      } else {
        const rand = Math.random();
        if (rand < 0.45) {
          type = 'monster';
        } else if (rand < 0.7) {
          type = 'event';
        } else if (rand < 0.85) {
          type = 'shop';
        } else {
          type = 'rest';
        }
      }

      nodes.push({
        id: `node_${floor}_${lane}`,
        floor,
        lane,
        type,
        nextNodes: [],
        visited: false,
        available: floor === 0, // フロア0は最初から選択可能
      });
    }
  }

  // ノード間の接続ライン（エッジ）を張る (0 <= floor < TOTAL_FLOORS - 2)
  for (let floor = 0; floor < TOTAL_FLOORS - 2; floor++) {
    const currentFloorNodes = nodes.filter((n) => n.floor === floor);
    const nextFloorNodes = nodes.filter((n) => n.floor === floor + 1);

    currentFloorNodes.forEach((node) => {
      // 同じレーンへの接続
      const sameLaneNext = nextFloorNodes.find((n) => n.lane === node.lane);
      if (sameLaneNext) {
        node.nextNodes.push(sameLaneNext.id);
      }

      // 確率で隣接レーンへも接続 (分岐を作る)
      [-1, 1].forEach((offset) => {
        const adjLane = node.lane + offset;
        if (adjLane >= 0 && adjLane < LANES_COUNT && Math.random() < 0.45) {
          const adjNext = nextFloorNodes.find((n) => n.lane === adjLane);
          if (adjNext && !node.nextNodes.includes(adjNext.id)) {
            node.nextNodes.push(adjNext.id);
          }
        }
      });

      // 最低1つは接続先を保証
      if (node.nextNodes.length === 0 && nextFloorNodes.length > 0) {
        const fallback = nextFloorNodes[0];
        node.nextNodes.push(fallback.id);
      }
    });
  }

  return nodes;
}

// ランダムイベント定義
export const SPIRE_EVENTS: SpireEvent[] = [
  {
    id: 'ancient_forge',
    title: '古代の鍛冶場',
    description:
      '尖塔の壁に埋め込まれた赤く燃える古代の炉壇を発見した。炉からは圧倒的な熱気が立ち込め、武器や技を強化できる魔力が満ちている。ただし身を削る代償が必要なようだ。',
    imageIcon: '🌋',
    options: [
      {
        text: '身を焦がして技を磨く (HP 12 消費)',
        description: '手持ちのランダムなカードを 1 枚強化する。',
        outcome: (state) => {
          state.hp = Math.max(1, state.hp - 12);
          const unupgraded = state.deck.filter((c) => !c.upgraded);
          if (unupgraded.length > 0) {
            const card = unupgraded[Math.floor(Math.random() * unupgraded.length)];
            card.upgraded = true;
            card.name = `${card.name}+`;
            return `業火の熱気で【${card.name}】が強化された！(HP -12)`;
          }
          return 'すべてのカードは既に極められている。(HP -12)';
        },
      },
      {
        text: '火花を避けて立ち去る',
        description: '何も失わず、その場を後にする。',
        outcome: () => '君は慎重に歩みを進めた。',
      },
    ],
  },
  {
    id: 'shining_fountain',
    title: '奇跡の聖水泉',
    description:
      '暗闇の中に青白く輝く神秘の泉がある。清らかな水からは生命力と癒やしの波動が溢れ出ている。一口飲めば wounds を癒やせるだろう。',
    imageIcon: '⛲',
    options: [
      {
        text: '聖水を心ゆくまで飲む',
        description: 'HP を 20 回復する。',
        outcome: (state) => {
          const healAmount = Math.min(20, state.maxHp - state.hp);
          state.hp += healAmount;
          return `聖水の力で生命力がみなぎる！(HP +${healAmount} 回復)`;
        },
      },
      {
        text: '泉に金貨を投げ入れて祈る (50 G 消費)',
        description: '最大 HP が 5 増加し、HP を 10 回復する。',
        outcome: (state) => {
          if (state.gold < 50) return '金貨が足りなかった…。';
          state.gold -= 50;
          state.maxHp += 5;
          state.hp += 10;
          return '神託の光が体を包む！最大HP +5、HP +10 回復！(金貨 -50G)';
        },
      },
      {
        text: '立ち去る',
        description: '泉には触れずに先を急ぐ。',
        outcome: () => '君は静かに泉を通り過ぎた。',
      },
    ],
  },
  {
    id: 'wandering_beggar',
    title: '彷徨う老商人',
    description:
      'フードを目深に被った老人が、道端で小箱を抱えて震えている。「旅の御方…もし金貨を恵んでくださるなら、わしの秘蔵のお宝を譲りましょう…」',
    imageIcon: '🧙‍♂️',
    options: [
      {
        text: '金貨を恵んで宝を受け取る (75 G 消費)',
        description: 'ランダムなレリックを 1 つ獲得する。',
        outcome: (state) => {
          if (state.gold < 75) return '金貨が足りず、老人は寂しそうに去っていった。';
          state.gold -= 75;
          return '老人は満面の笑みで謎の宝箱を差し出した！(金貨 -75G, 宝物獲得)';
        },
      },
      {
        text: '小銭だけ恵む (25 G 消費)',
        description: 'HP を 8 回復してもらう。',
        outcome: (state) => {
          if (state.gold < 25) return '金貨が足りない。';
          state.gold -= 25;
          state.hp = Math.min(state.maxHp, state.hp + 8);
          return '老人は感謝の祈りを捧げて傷を癒やしてくれた。(HP +8, 金貨 -25G)';
        },
      },
      {
        text: '無視して立ち去る',
        description: '相手にせず足早に通り過ぎる。',
        outcome: () => '君は何事もなく先へ進んだ。',
      },
    ],
  },
];

export function getRandomEvent(): SpireEvent {
  return SPIRE_EVENTS[Math.floor(Math.random() * SPIRE_EVENTS.length)];
}
