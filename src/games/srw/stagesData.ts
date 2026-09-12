import { StageData, TerrainType } from './types';

// マップ生成ヘルパー
function createMap(width: number, height: number, defaultType: TerrainType = 'plain'): TerrainType[][] {
  const grid: TerrainType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < width; x++) {
      row.push(defaultType);
    }
    grid.push(row);
  }
  return grid;
}

// ステージ1の地形
const map1 = createMap(10, 10, 'plain');
// 森林と基地を配置
map1[3][4] = 'forest';
map1[3][5] = 'forest';
map1[4][4] = 'forest';
map1[4][5] = 'forest';
map1[5][3] = 'forest';
map1[5][6] = 'forest';
map1[2][2] = 'mountain';
map1[2][7] = 'mountain';
map1[7][4] = 'base'; // 味方防衛拠点
map1[7][5] = 'base';

// ステージ2の地形
const map2 = createMap(12, 12, 'plain');
for (let x = 2; x <= 9; x++) {
  map2[5][x] = 'forest';
  map2[6][x] = 'forest';
}
map2[1][1] = 'mountain';
map2[1][2] = 'mountain';
map2[2][1] = 'mountain';
map2[1][10] = 'mountain';
map2[2][10] = 'mountain';
map2[8][2] = 'base';
map2[8][9] = 'base';
map2[10][5] = 'base';
map2[10][6] = 'base';

// ステージ3の地形
const map3 = createMap(14, 14, 'plain');
for (let y = 3; y <= 10; y++) {
  map3[y][2] = 'mountain';
  map3[y][11] = 'mountain';
}
map3[4][5] = 'forest';
map3[4][8] = 'forest';
map3[7][6] = 'base';
map3[7][7] = 'base';
map3[1][6] = 'base'; // 敵ボス御座
map3[1][7] = 'base';
map3[11][6] = 'base'; // 味方出撃地点
map3[11][7] = 'base';

export const STAGES_DATA: StageData[] = [
  // --- 第1話 ---
  {
    stageNumber: 1,
    title: '第1話「鋼鉄の咆哮」',
    subtitle: 'Awakening of Steel',
    description: '突如出現した次元侵略軍「カルテル」！カイザーとアーク・ヴァイスが迎撃に向かう！',
    mapWidth: 10,
    mapHeight: 10,
    terrainGrid: map1,
    victoryConditions: ['敵の全滅'],
    defeatConditions: ['味方部隊の全滅'],
    playerUnits: [
      { unitId: 'kaiser', x: 4, y: 7 },
      { unitId: 'arc_weiss', x: 5, y: 7 },
    ],
    enemyUnits: [
      { unitId: 'trooper', x: 3, y: 2 },
      { unitId: 'trooper', x: 6, y: 2 },
      { unitId: 'trooper', x: 4, y: 1 },
      { unitId: 'raider', x: 5, y: 0 },
    ],
    openingDialog: [
      {
        speaker: '剛 豪気',
        portrait: '🔥',
        text: '警報が鳴り響いてやがる！あいつらが噂のカルテル軍か！',
        side: 'left',
        themeColor: '#ef4444',
      },
      {
        speaker: 'レン・クロサキ',
        portrait: '🎯',
        text: '熱くなるなよゴウ。敵の先遣部隊だ。森林の地形効果を活かし、各個撃破するぞ。',
        side: 'left',
        themeColor: '#3b82f6',
      },
      {
        speaker: 'カルテル兵',
        portrait: '🪖',
        text: '目標捕捉！地球のスーパーロボットか…まとめて消し炭にしてやる！',
        side: 'right',
        themeColor: '#94a3b8',
      },
      {
        speaker: '剛 豪気',
        portrait: '🔥',
        text: '吠え面かくなよ！ダイナミック・カイザー、出撃だぁぁっ！！',
        side: 'left',
        themeColor: '#ef4444',
      },
    ],
    endingDialog: [
      {
        speaker: '剛 豪気',
        portrait: '🔥',
        text: 'へっ！見たか！俺たちカイザーチームの敵じゃねえぜ！',
        side: 'left',
        themeColor: '#ef4444',
      },
      {
        speaker: 'レン・クロサキ',
        portrait: '🎯',
        text: 'だが、これは前哨戦にすぎない…本隊の反応が急速に接近している。格納庫へ戻り、機体を整備・改造しよう！',
        side: 'left',
        themeColor: '#3b82f6',
      },
    ],
  },

  // --- 第2話 ---
  {
    stageNumber: 2,
    title: '第2話「蒼空の急襲」',
    subtitle: 'Sky Raiders',
    description: '敵主力部隊が防衛都市に急襲！超音速機サイバー・ファルコンとエンジェル・ウィングが合流！',
    mapWidth: 12,
    mapHeight: 12,
    terrainGrid: map2,
    victoryConditions: ['敵の全滅（またはディス・ガルムの撃破）'],
    defeatConditions: ['味方部隊の全滅'],
    playerUnits: [
      { unitId: 'kaiser', x: 5, y: 10 },
      { unitId: 'arc_weiss', x: 6, y: 10 },
      { unitId: 'cyber_falcon', x: 4, y: 9 },
      { unitId: 'angel_wing', x: 7, y: 9 },
    ],
    enemyUnits: [
      { unitId: 'trooper', x: 2, y: 3 },
      { unitId: 'trooper', x: 5, y: 2 },
      { unitId: 'trooper', x: 9, y: 3 },
      { unitId: 'raider', x: 3, y: 1 },
      { unitId: 'raider', x: 8, y: 1 },
      { unitId: 'goliath', x: 6, y: 1 },
    ],
    reinforcements: [
      {
        turn: 2,
        enemies: [{ unitId: 'dis_garm', x: 6, y: 0 }],
        dialog: [
          {
            speaker: 'ガルム司令官',
            portrait: '😈',
            text: 'フハハハ！虫ケラどもが群がっておるわ！我が暗黒機神ディス・ガルム自らが引導を渡してくれよう！',
            side: 'right',
            themeColor: '#7c3aed',
          },
          {
            speaker: 'アイシャ',
            portrait: '✨',
            text: 'なにあれ…とんでもない禍々しいプレッシャー！でもスピードなら負けないわ！',
            side: 'left',
            themeColor: '#06b6d4',
          },
          {
            speaker: 'ミナモ',
            portrait: '🌸',
            text: 'ゴウさん、レンさん！損傷したら私のエンジェル・ウィングの近くへ！すぐに修理します！',
            side: 'left',
            themeColor: '#ec4899',
          },
          {
            speaker: '剛 豪気',
            portrait: '🔥',
            text: 'おう！精神コマンド『熱血』と『鉄壁』を合わせりゃ、どんなデカ物だって粉砕できるぜ！行くぞ皆の衆！',
            side: 'left',
            themeColor: '#ef4444',
          },
        ],
      },
    ],
    openingDialog: [
      {
        speaker: 'アイシャ',
        portrait: '✨',
        text: 'お待たせ！サイバー・ファルコン、ただいま合流完了よ！',
        side: 'left',
        themeColor: '#06b6d4',
      },
      {
        speaker: 'ミナモ',
        portrait: '🌸',
        text: 'エンジェル・ウィングも支援準備完了です！皆さん、ご武運を！',
        side: 'left',
        themeColor: '#ec4899',
      },
      {
        speaker: 'ゴライアス操縦士',
        portrait: '🗿',
        text: '地球のネズミどもめ、ヘヴィ・ゴライアスの主砲で山ごと消し飛ばしてやる！',
        side: 'right',
        themeColor: '#d97706',
      },
    ],
    endingDialog: [
      {
        speaker: 'ガルム司令官',
        portrait: '😈',
        text: 'ば、馬鹿な…このディス・ガルムが圧されるだと…！？おのれ…次は本気の本拠地で葬ってやる…撤退だ！',
        side: 'right',
        themeColor: '#7c3aed',
      },
      {
        speaker: 'レン・クロサキ',
        portrait: '🎯',
        text: '敵幹部を退けたか…だが敵本拠地には首領「ゼノス」が潜んでいる。総力戦になるぞ。',
        side: 'left',
        themeColor: '#3b82f6',
      },
    ],
  },

  // --- 第3話 (最終決戦) ---
  {
    stageNumber: 3,
    title: '最終話「決戦！ネオ・ジェネシス」',
    subtitle: 'Final Genesis',
    description: 'カルテル本拠要塞へ突入！全人類の明日を賭けた最後の総力大決戦！',
    mapWidth: 14,
    mapHeight: 14,
    terrainGrid: map3,
    victoryConditions: ['終焉使徒ネオ・ジェネシスの撃破'],
    defeatConditions: ['味方部隊の全滅'],
    playerUnits: [
      { unitId: 'kaiser', x: 6, y: 12 },
      { unitId: 'arc_weiss', x: 7, y: 12 },
      { unitId: 'cyber_falcon', x: 5, y: 13 },
      { unitId: 'angel_wing', x: 8, y: 13 },
    ],
    enemyUnits: [
      { unitId: 'neo_genesis', x: 6, y: 1 },
      { unitId: 'dis_garm', x: 7, y: 3 },
      { unitId: 'goliath', x: 3, y: 5 },
      { unitId: 'goliath', x: 10, y: 5 },
      { unitId: 'raider', x: 4, y: 7 },
      { unitId: 'raider', x: 9, y: 7 },
      { unitId: 'trooper', x: 5, y: 9 },
      { unitId: 'trooper', x: 8, y: 9 },
    ],
    openingDialog: [
      {
        speaker: '創造主 ゼノス',
        portrait: '👁️',
        text: 'よくぞここまで辿り着いた、愚かなる塵芥どもよ。だが我が『ネオ・ジェネシス』の前に、貴様らの光は消え去る。',
        side: 'right',
        themeColor: '#e11d48',
      },
      {
        speaker: '剛 豪気',
        portrait: '🔥',
        text: '抜かしやがれ！俺たちの未来は、俺たち人間が切り拓くんだよ！',
        side: 'left',
        themeColor: '#ef4444',
      },
      {
        speaker: 'レン・クロサキ',
        portrait: '🎯',
        text: 'アーク・ヴァイス、全ジェネレーター直結。限界を超えてみせる！',
        side: 'left',
        themeColor: '#3b82f6',
      },
      {
        speaker: 'アイシャ',
        portrait: '✨',
        text: 'これ以上の破壊はさせない！ファルコン・ミラージュ、全開スタンバイ！',
        side: 'left',
        themeColor: '#06b6d4',
      },
      {
        speaker: 'ミナモ',
        portrait: '🌸',
        text: '生命の輝きは、闇になんて消せません！奇跡を起こしましょう！',
        side: 'left',
        themeColor: '#ec4899',
      },
      {
        speaker: '創造主 ゼノス',
        portrait: '👁️',
        text: 'ならば見せてみよ。貴様らの「魂の叫び」というものを！',
        side: 'right',
        themeColor: '#e11d48',
      },
    ],
    endingDialog: [
      {
        speaker: '創造主 ゼノス',
        portrait: '👁️',
        text: 'この…光は……まさか、人間たちの熱き魂の力というのか……！我が生涯に…悔い…なし……うわああああっ！！',
        side: 'right',
        themeColor: '#e11d48',
      },
      {
        speaker: '剛 豪気',
        portrait: '🔥',
        text: 'やった…勝ったんだ！！俺たちのダイナミック・ノヴァが世界を救ったんだぜえええっ！！',
        side: 'left',
        themeColor: '#ef4444',
      },
      {
        speaker: 'レン・クロサキ',
        portrait: '🎯',
        text: '全敵影消失。青き地球に、平和が戻ったな。',
        side: 'left',
        themeColor: '#3b82f6',
      },
      {
        speaker: 'アイシャ',
        portrait: '✨',
        text: 'やったね！最高のチームだったわ！',
        side: 'left',
        themeColor: '#06b6d4',
      },
      {
        speaker: 'ミナモ',
        portrait: '🌸',
        text: '皆さん、本当にお疲れ様でした！私たちの勝利です！',
        side: 'left',
        themeColor: '#ec4899',
      },
    ],
  },
];
