import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GameCard, RecordItem } from './components/GameCard';
import { TetrisGame } from './games/TetrisGame';
import { MinesweeperGame } from './games/MinesweeperGame';
import { GeminiBrosGame } from './games/GeminiBrosGame';
import { SpaceShooterGame } from './games/SpaceShooterGame';
import { BreakoutGame } from './games/BreakoutGame';
import { Game2048 } from './games/Game2048';
import { DotEaterGame } from './games/DotEaterGame';
import { PongGame } from './games/PongGame';
import { PaperIoGame } from './games/PaperIoGame';
import { AngryBirdsGame } from './games/AngryBirdsGame';
import { BombermanGame } from './games/BombermanGame';
import { ExcitebikeGame } from './games/ExcitebikeGame';
import { HoleIoGame } from './games/HoleIoGame';
import { JewelGame } from './games/JewelGame';
import { ChiikawaGame } from './games/ChiikawaGame';
import { SpireGame } from './games/SpireGame';
import { CookieClickerGame, COOKIE_ALL_TIME_KEY, COOKIE_PRESTIGE_KEY, formatNumber } from './games/CookieClickerGame';
import { SuikaGame } from './games/SuikaGame';
import { WarioGame } from './games/WarioGame';
import { SonicGame, SONIC_HIGH_SCORE_KEY, SONIC_BEST_TIME_KEY, SONIC_MAX_RINGS_KEY } from './games/SonicGame';
import { PixelZooGame } from './games/PixelZooGame';
import { GameInfo, GameId, GameGenre } from './types';
import { Gamepad2, Sparkles, Zap, ShieldCheck, Search, X } from 'lucide-react';

const THEME_KEY = 'games_hub_theme';
const SONIC_HIGH_KEY = SONIC_HIGH_SCORE_KEY;
const SONIC_TIME_KEY = SONIC_BEST_TIME_KEY;
const SONIC_RINGS_KEY = SONIC_MAX_RINGS_KEY;
const WARIO_HIGH_SCORE_KEY = 'wario_high_score_v1';
const WARIO_MAX_SPEED_KEY = 'wario_max_speed_v1';
const SUIKA_HIGH_SCORE_KEY = 'suika_high_score';
const SUIKA_WATERMELONS_KEY = 'suika_watermelons_count';
const SPIRE_HIGH_FLOOR_KEY = 'spire_high_floor_v1';
const SPIRE_WINS_KEY = 'spire_total_wins_v1';
const CHIIKAWA_SUBJUGATION_HIGH_SCORE_KEY = 'chiikawa_subjugation_high_score';
const CHIIKAWA_WEEDING_HIGH_SCORE_KEY = 'chiikawa_weeding_high_score';
const CHIIKAWA_WEEDING_BEST_RANK_KEY = 'chiikawa_weeding_best_rank';
const JEWEL_HIGH_SCORE_KEY = 'jewel_quest_high_score_timeAttack';
const JEWEL_STARS_KEY = 'jewel_quest_stage_stars_';
const HOLEIO_HIGH_SCORE_KEY = 'holeio_high_score';
const HOLEIO_BEST_KILLS_KEY = 'holeio_best_kills';
const HOLEIO_MAX_SIZE_KEY = 'holeio_max_size';
const EXCITEBIKE_BEST_TIMES_KEY = 'excitebike_best_times_v1';
const BOMBERMAN_HIGH_SCORE_KEY = 'bomberman_high_score';
const BOMBERMAN_BATTLE_WINS_KEY = 'bomberman_battle_wins';
const BOMBERMAN_STAGE_CLEARED_KEY = 'bomberman_stage_cleared';
const TETRIS_HIGH_SCORE_KEY = 'tetris_high_score_v1';
const BROS_HIGH_SCORE_KEY = 'gemini_bros_high_score';
const SHOOTER_HIGH_SCORE_KEY = 'star_striker_high_score';
const BREAKOUT_HIGH_SCORE_KEY = 'breakout_high_score';
const GAME2048_HIGH_SCORE_KEY = '2048_high_score';
const DOTEATER_HIGH_SCORE_KEY = 'doteater_high_score';
const PONG_RALLY_KEY = 'pong_rally_best';
const PAPERIO_HIGH_SCORE_KEY = 'paperio_high_score';
const PAPERIO_MAX_PERCENT_KEY = 'paperio_max_percent';
const PAPERIO_HIGH_KILLS_KEY = 'paperio_high_kills';
const ANGRY_BIRDS_HIGH_SCORE_KEY = 'angrybirds_high_score';
const ANGRY_BIRDS_STARS_KEY = 'angrybirds_level_stars';

const GENRES: { id: GameGenre | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'すべて', icon: '🌟' },
  { id: 'action', label: 'アクション・対戦', icon: '⚡' },
  { id: 'puzzle', label: 'パズル・知略', icon: '🧩' },
  { id: 'io', label: '.io・サバイバル', icon: '🌐' },
  { id: 'arcade', label: 'アーケード・名作', icon: '🕹️' },
  { id: 'racing', label: 'レース・バイク', icon: '🏁' },
];

const GAMES: GameInfo[] = [
  {
    id: 'zoo',
    title: 'ぽかぽかドット動物園 (Pixel Zoo Sanctuary)',
    titleEn: 'Pixel Zoo Sanctuary - Cozy Animals',
    description:
      'プログラム描画によるかわいいドット絵の動物たち（パンダ・カピバラ・レッサーパンダ・ペンギン・柴犬・三毛猫等）と触れ合って癒やされる動物園ゲーム！なでなで、エサやり、ボール遊び、温泉、昼夜・天候変化、心地よいオルゴール音響完備！詳細なゲーム開発仕様書ビューアも内蔵！',
    badge: '🌿 最新作！癒やし動物園',
    iconName: 'zoo',
    color: 'from-emerald-500 via-teal-600 to-green-700',
    genre: 'arcade',
    genres: ['arcade', 'puzzle'],
    tags: ['ドット絵', '動物園', '癒やし', 'パンダ', 'カピバラ', '温泉', 'エサやり', '仕様書完備', 'スマホ・PC両対応'],
  },
  {
    id: 'sonic',
    title: 'ソニック・スピード・ラッシュ (Sonic Speed Rush)',
    titleEn: 'Sonic the Hedgehog Clone Adventure',
    description:
      'メガドライブの名作『ソニック』を完全再現！慣性と最高速度の物理演算、スピンダッシュ、ローリング、ホーミングアタック、360度大ループを搭載！テイルス（飛行）やナックルズ（滑空＆壁登り）も選べる爽快ハイスピードアクション！ACT 1 グリーンヒル＆ACT 2 Dr.エッグマンボス戦完備！',
    badge: '超爽快！新作アクション',
    iconName: 'sonic',
    color: 'from-blue-600 via-sky-500 to-amber-400',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['ソニック', 'スピンダッシュ', 'ホーミングアタック', '360度ループ', 'テイルス＆ナックルズ', 'Dr.エッグマン', 'スマホ・PC両対応'],
  },
  {
    id: 'wario',
    title: 'メイド イン ワリオ (WarioWare)',
    titleEn: 'Microgame Frenzy Action',
    description:
      '4秒間の超短時間プチゲームが次々と襲来！「よけろ！」「ぬけ！」「つかめ！」「いれろ！」「おせ！」「きれ！」など直感反射アクションをクリアせよ！BPMが加速するスピードアップ＆プチゲーム図鑑（練習モード）完備！',
    badge: '超爽快！瞬間アクション',
    iconName: 'wario',
    color: 'from-amber-500 via-orange-600 to-rose-600',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['メイドインワリオ', 'プチゲーム', '瞬間アクション', '連打・反射神経', 'スピードアップ', 'スマホ・PC両対応'],
  },
  {
    id: 'suika',
    title: 'スイカゲーム (Suika Game)',
    titleEn: 'Fruit Merge Physics Puzzle',
    description:
      '同じフルーツ同士をくっつけて大きなスイカを目指せ！リアルでコミカルな剛体物理演算、11段階の進化ツリー、表情豊かなフルーツ達、Web Audioサウンド＆BGM、困ったときのフルーツ揺らし(SHAKE)機能完備！',
    badge: '超人気！新作パズル',
    iconName: 'suika',
    color: 'from-emerald-500 via-rose-500 to-amber-500',
    genre: 'puzzle',
    genres: ['puzzle', 'arcade'],
    tags: ['スイカゲーム', 'フルーツ合体', '物理演算', '進化パズル', 'シェイク機能', 'スマホ・PC両対応'],
  },
  {
    id: 'cookie',
    title: 'クッキークリッカー (Cookie Clicker)',
    titleEn: 'Infinite Bakery Empire',
    description:
      '世界的大ヒット放置インクリメンタルゲームを完全再現！巨大クッキーを連打し、カーソルやおばあちゃんから反物質凝縮器・プリズムまで14大施設を建設！50種以上の強化、黄金クッキー、ミルク＆アヒルちゃん、ニュース速報、転生昇天（Prestige）完備の中毒性MAXクッキー帝国！',
    badge: '大人気！無限育成',
    iconName: 'cookie',
    color: 'from-amber-500 via-orange-500 to-yellow-600',
    genre: 'arcade',
    genres: ['arcade', 'action', 'puzzle'],
    tags: ['クリッカー', '放置育成', '14大施設', '黄金クッキー', '転生・昇天', 'スマホ・PC両対応'],
  },
  {
    id: 'spire',
    title: 'スパイア・オブ・フェイト (Spire of Fate)',
    titleEn: 'Deckbuilding Roguelike Card RPG',
    description:
      '名作Slay the Spireを徹底再現！3人の英雄（戦士・暗殺者・魔導士）から選び、分岐ツリーマップを登攀せよ！敵のインテント予測、エナジー管理、カード強化、オーブ循環、レリック＆ポーション、ショップ完備の本格デッキ構築RPG！',
    badge: '超大作！新作RPG',
    iconName: 'spire',
    color: 'from-amber-600 via-rose-600 to-indigo-700',
    genre: 'puzzle',
    genres: ['puzzle', 'action', 'arcade'],
    tags: ['デッキ構築', 'ローグライク', 'カードバトル', 'インテント予測', '3大クラス', 'スマホ・PC両対応'],
  },
  {
    id: 'chiikawa',
    title: 'ちいかわ なんとかなれ！大作戦',
    titleEn: 'Chiikawa: Nantokanare Quest',
    description:
      'ちいかわ達と危険なヤツらを大討伐！全5人のキャラ（ちいかわ・ハチワレ・うさぎ・くりまんじゅう・モモンガ）で出撃！迫力のサバイバル討伐クエスト＆草むしり検定（特級マスターを目指せ！）の2大モード搭載！',
    badge: '超人気！最新作',
    iconName: 'chiikawa',
    color: 'from-pink-400 via-rose-500 to-amber-400',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['ちいかわ', '大討伐', '草むしり検定', 'なんとかなれーッ！', '5人キャラ選択', 'スマホ・PC両対応'],
  },
  {
    id: 'jewel',
    title: 'ジュエルクエスト (Jewel Quest)',
    titleEn: 'Match-3 Cascade Puzzle',
    description:
      '3つ以上つなげて爽快粉砕！4消し雷光レーザー、交差爆弾、5消しレインボーを駆使して超絶連鎖を決めろ！タイムアタック・エンドレス・全5面ステージミッションの3モード完備。',
    badge: '新作！爽快パズル',
    iconName: 'jewel',
    color: 'from-pink-500 via-purple-600 to-cyan-500',
    genre: 'puzzle',
    genres: ['puzzle', 'arcade'],
    tags: ['マッチ3', '連鎖コンボ', '雷光＆大爆発', '3モード搭載', 'スマホ・PC両対応'],
  },
  {
    id: 'holeio',
    title: 'ブラックホール.io (Hole.io)',
    titleEn: 'City Devourer Physics Action',
    description:
      '地面のブラックホールとなり街のすべてを飲み込め！歩行者や車から始まり、ビルやライバルホールまで吸い込んで超巨大化！2.5D都市・8体の賢いBot対戦・3つのゲームモード・パワーアップ完備。',
    badge: '新作！大迫力io',
    iconName: 'holeio',
    color: 'from-sky-500 via-indigo-600 to-rose-600',
    genre: 'io',
    genres: ['io', 'action'],
    tags: ['ブラックホール', '街破壊', 'Bot対戦', '吸い込み物理', 'スマホ・PC両対応'],
  },
  {
    id: 'excitebike',
    title: 'エキサイトバイク (Excitebike)',
    titleEn: 'Classic Motocross 2.5D Racing',
    description:
      '名作モトクロスレースが完全復活！通常＆ターボアクセル・オーバーヒート管理・クーラーパッド・空中チルト制御・クラッシュ連打復帰・全5コース・CPUバトル・自作コースエディタ完備。',
    badge: '名作レース',
    iconName: 'excitebike',
    color: 'from-amber-500 via-red-500 to-rose-600',
    genre: 'racing',
    genres: ['racing', 'arcade', 'action'],
    tags: ['モトクロス', '2.5Dレース', 'ターボ＆チルト', 'コースエディタ', 'スマホ・PC両対応'],
  },
  {
    id: 'bomberman',
    title: 'ボンバーブラスト (Bomber Blast)',
    titleEn: 'Classic Bomb Arena Battle',
    description:
      '爆弾でブロックを破壊しアイテムを集めてライバルを吹き飛ばせ！4人同時バトル（賢いCPU AI・サドンデス落下ブロック・ローカル2P対戦）＆全5面のアドベンチャー、10種のアイテム完備。',
    badge: '大人気対戦爆破',
    iconName: 'bomberman',
    color: 'from-orange-500 via-amber-500 to-red-600',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['爆弾対戦', '4人バトル', 'サドンデス', '全10種アイテム', 'スマホ・PC両対応'],
  },
  {
    id: 'angrybirds',
    title: 'アングリーバード (Angry Birds)',
    titleEn: 'Slingshot Physics Destruction',
    description:
      'スリングショットで鳥を撃ち放ち、木・氷・石・TNTの砦を豪快に粉砕せよ！5種類の特殊バード、リアルな2D剛体物理、全8ステージ、3つ星評価を搭載。',
    badge: '大人気物理パズル',
    iconName: 'angrybirds',
    color: 'from-red-500 via-amber-500 to-emerald-500',
    genre: 'puzzle',
    genres: ['puzzle', 'action'],
    tags: ['物理演算', 'スリングショット', '破壊爽快感', '特殊スキル', 'スマホ・PC両対応'],
  },
  {
    id: 'paperio',
    title: 'ペーパー.io (Paper.io)',
    titleEn: 'Territory Conquest Action',
    description:
      '自分の領地を広げてマップを制覇せよ！領地外で敵の軌跡（トレイル）を切って撃破し、パワーアップアイテムを駆使して完全制覇を目指す陣取りアクション。',
    badge: '人気陣取り',
    iconName: 'paperio',
    color: 'from-emerald-500 via-teal-500 to-cyan-600',
    genre: 'io',
    genres: ['io', 'action'],
    tags: ['陣取り', '対戦アクション', 'Bot対戦', 'パワーアップ', 'スマホ・PC両対応'],
  },
  {
    id: 'breakout',
    title: 'ブロック崩し (Breakout)',
    titleEn: 'Classic Block Breaker',
    description:
      'パドルでボールを打ち返してブロックを破壊！マルチボール・レーザー・拡大・バリアなど多彩なアイテムと複数ステージを搭載。',
    badge: '定番アクション',
    iconName: 'breakout',
    color: 'from-amber-500 via-orange-500 to-rose-500',
    genre: 'arcade',
    genres: ['arcade', 'action'],
    tags: ['アクション', 'アイテム', 'マルチボール', 'レーザー', 'スマホ・PC両対応'],
  },
  {
    id: 'game2048',
    title: '2048 (Classic 2048)',
    titleEn: 'Number Sliding Puzzle',
    description:
      '同じ数字のタイルを合体させて「2048」を目指す名作スライドラジックパズル！1手戻す(Undo)機能、スムーズなアニメーション完備。',
    badge: '人気パズル',
    iconName: 'game2048',
    color: 'from-yellow-500 via-amber-500 to-orange-600',
    genre: 'puzzle',
    genres: ['puzzle'],
    tags: ['パズル', '思考', 'Undo機能', 'スワイプ操作', 'スマホ・PC両対応'],
  },
  {
    id: 'doteater',
    title: 'ドットイーター (Dot Eater)',
    titleEn: 'Maze Chase Action',
    description:
      '迷路を駆け巡りドットを全回収！個性豊かな4色のゴーストをパワードットで撃退し、フルーツボーナスを獲得しよう！',
    badge: '名作アーケード',
    iconName: 'doteater',
    color: 'from-yellow-400 via-emerald-500 to-teal-600',
    genre: 'arcade',
    genres: ['arcade', 'action'],
    tags: ['迷路', 'アーケード', 'ゴーストAI', 'パワーアップ', 'スマホ・PC両対応'],
  },
  {
    id: 'pong',
    title: 'ポン (Pong)',
    titleEn: 'Classic Table Tennis Battle',
    description:
      '元祖対戦アクション！VS CPU(難易度3段階)での1人プレイ、1台での2人対戦(2P)、壁打ちラリーチャレンジに対応。',
    badge: '対戦スポーツ',
    iconName: 'pong',
    color: 'from-sky-500 via-blue-600 to-indigo-600',
    genre: 'arcade',
    genres: ['arcade', 'action'],
    tags: ['対戦', '2P対戦', 'VS CPU', 'ラリー', 'スマホ・PC両対応'],
  },
  {
    id: 'shooter',
    title: 'Star Striker (スター・ストライカー)',
    titleEn: 'Space Vertical Shooter',
    description:
      '宇宙空間を舞台にした本格縦スクロールシューティング！パワーアップ・追尾ミサイル・支援ビット機・巨大ボス戦・ハイパーボム完備。',
    badge: '本格STG',
    iconName: 'shooter',
    color: 'from-cyan-500 via-indigo-600 to-rose-500',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['縦シュー', '弾幕', '3ステージ', '巨大ボス', 'スマホ・PC両対応'],
  },
  {
    id: 'bros',
    title: 'Gemini 3.7 Bros.',
    titleEn: 'Super 2D Platformer Adventure',
    description:
      '4つのワールド・地下ボーナス・城・ボス戦を駆け巡る本格2D横スクロールアクション！思考ビーム・スター無敵・チップチューンBGM完備。',
    badge: '2Dアクション',
    iconName: 'bros',
    color: 'from-blue-600 via-indigo-600 to-purple-600',
    genre: 'action',
    genres: ['action', 'arcade'],
    tags: ['2Dアクション', '4ワールド', 'ボス戦', 'チップチューン', 'スマホ操作OK'],
  },
  {
    id: 'tetris',
    title: 'テトリス (Tetris)',
    titleEn: 'Classic Block Puzzle Game',
    description:
      '本格テトリス！HOLD・NEXT・ゴースト表示・壁蹴り回転・Web Audioシンセ効果音・スマホタッチ操作に完全対応。',
    badge: '定番パズル',
    iconName: 'tetris',
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    genre: 'puzzle',
    genres: ['puzzle', 'arcade'],
    tags: ['パズル', '定番', 'アクション', 'サウンド対応', 'スマホ操作OK'],
  },
  {
    id: 'minesweeper',
    title: 'マインスイーパー (Minesweeper)',
    titleEn: 'Classic Logic Minesweeper',
    description:
      '洗練されたマインスイーパー！初手安全保証・連鎖オープン・Chording・初級〜上級・ベストタイム記録に対応。',
    badge: '知略パズル',
    iconName: 'minesweeper',
    color: 'from-rose-500 via-amber-500 to-emerald-500',
    genre: 'puzzle',
    genres: ['puzzle'],
    tags: ['知略', '初手安全', '連鎖オープン', 'タイムアタック', 'スマホ操作OK'],
  },
];

export function App() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved === 'dark';
    }
    return true;
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // ジャンルフィルタ＆検索状態
  const [selectedGenre, setSelectedGenre] = useState<GameGenre | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ハイスコア / ベストタイム状態
  const [spireHighFloor, setSpireHighFloor] = useState<number>(0);
  const [spireWins, setSpireWins] = useState<number>(0);
  const [chiikawaSubjugationScore, setChiikawaSubjugationScore] = useState<number>(0);
  const [chiikawaWeedingScore, setChiikawaWeedingScore] = useState<number>(0);
  const [chiikawaWeedingRank, setChiikawaWeedingRank] = useState<string>('未取得');
  const [jewelHighScore, setJewelHighScore] = useState<number>(0);
  const [jewelTotalStars, setJewelTotalStars] = useState<number>(0);
  const [holeioHighScore, setHoleioHighScore] = useState<number>(0);
  const [holeioBestKills, setHoleioBestKills] = useState<number>(0);
  const [holeioMaxSize, setHoleioMaxSize] = useState<number>(0);
  const [shooterHighScore, setShooterHighScore] = useState<number>(0);
  const [tetrisHighScore, setTetrisHighScore] = useState<number>(0);
  const [brosHighScore, setBrosHighScore] = useState<number>(0);
  const [breakoutHighScore, setBreakoutHighScore] = useState<number>(0);
  const [game2048HighScore, setGame2048HighScore] = useState<number>(0);
  const [doteaterHighScore, setDoteaterHighScore] = useState<number>(0);
  const [pongRallyBest, setPongRallyBest] = useState<number>(0);
  const [paperioHighScore, setPaperioHighScore] = useState<number>(0);
  const [paperioMaxPercent, setPaperioMaxPercent] = useState<number>(0);
  const [paperioHighKills, setPaperioHighKills] = useState<number>(0);
  const [bombermanHighScore, setBombermanHighScore] = useState<number>(0);
  const [bombermanBattleWins, setBombermanBattleWins] = useState<number>(0);
  const [bombermanStageCleared, setBombermanStageCleared] = useState<number>(0);
  const [angryBirdsHighScore, setAngryBirdsHighScore] = useState<number>(0);
  const [angryBirdsTotalStars, setAngryBirdsTotalStars] = useState<number>(0);
  const [excitebikeBestTimes, setExcitebikeBestTimes] = useState<Record<string, number>>({});
  const [minesweeperBests, setMinesweeperBests] = useState<{
    easy: number | null;
    medium: number | null;
    hard: number | null;
  }>({
    easy: null,
    medium: null,
    hard: null,
  });
  const [cookieAllTimeEarned, setCookieAllTimeEarned] = useState<number>(0);
  const [cookiePrestigeChips, setCookiePrestigeChips] = useState<number>(0);
  const [suikaHighScore, setSuikaHighScore] = useState<number>(0);
  const [suikaWatermelons, setSuikaWatermelons] = useState<number>(0);
  const [warioHighScore, setWarioHighScore] = useState<number>(0);
  const [warioMaxSpeed, setWarioMaxSpeed] = useState<number>(1);
  const [sonicHighScore, setSonicHighScore] = useState<number>(0);
  const [sonicBestTime, setSonicBestTime] = useState<number>(0);
  const [sonicMaxRings, setSonicMaxRings] = useState<number>(0);

  // レコードの読み込み
  const loadRecords = () => {
    if (typeof window === 'undefined') return;

    const snkScore = localStorage.getItem(SONIC_HIGH_KEY);
    if (snkScore) setSonicHighScore(parseInt(snkScore, 10) || 0);

    const snkTime = localStorage.getItem(SONIC_TIME_KEY);
    if (snkTime) setSonicBestTime(parseInt(snkTime, 10) || 0);

    const snkRings = localStorage.getItem(SONIC_RINGS_KEY);
    if (snkRings) setSonicMaxRings(parseInt(snkRings, 10) || 0);

    const wScore = localStorage.getItem(WARIO_HIGH_SCORE_KEY);
    if (wScore) setWarioHighScore(parseInt(wScore, 10) || 0);

    const wSpeed = localStorage.getItem(WARIO_MAX_SPEED_KEY);
    if (wSpeed) setWarioMaxSpeed(parseInt(wSpeed, 10) || 1);

    const suikaScore = localStorage.getItem(SUIKA_HIGH_SCORE_KEY);
    if (suikaScore) setSuikaHighScore(parseInt(suikaScore, 10) || 0);

    const sMelons = localStorage.getItem(SUIKA_WATERMELONS_KEY);
    if (sMelons) setSuikaWatermelons(parseInt(sMelons, 10) || 0);

    const cAllTime = localStorage.getItem(COOKIE_ALL_TIME_KEY);
    if (cAllTime) setCookieAllTimeEarned(parseFloat(cAllTime) || 0);

    const cPres = localStorage.getItem(COOKIE_PRESTIGE_KEY);
    if (cPres) setCookiePrestigeChips(parseInt(cPres, 10) || 0);

    const sFloor = localStorage.getItem(SPIRE_HIGH_FLOOR_KEY);
    if (sFloor) setSpireHighFloor(parseInt(sFloor, 10) || 0);

    const sWins = localStorage.getItem(SPIRE_WINS_KEY);
    if (sWins) setSpireWins(parseInt(sWins, 10) || 0);

    const cSub = localStorage.getItem(CHIIKAWA_SUBJUGATION_HIGH_SCORE_KEY);
    if (cSub) setChiikawaSubjugationScore(parseInt(cSub, 10) || 0);

    const cWeed = localStorage.getItem(CHIIKAWA_WEEDING_HIGH_SCORE_KEY);
    if (cWeed) setChiikawaWeedingScore(parseInt(cWeed, 10) || 0);

    const cRank = localStorage.getItem(CHIIKAWA_WEEDING_BEST_RANK_KEY);
    if (cRank) setChiikawaWeedingRank(cRank);

    const jScore = localStorage.getItem(JEWEL_HIGH_SCORE_KEY);
    if (jScore) setJewelHighScore(parseInt(jScore, 10) || 0);

    const jStars = localStorage.getItem(JEWEL_STARS_KEY);
    if (jStars) {
      try {
        const parsed = JSON.parse(jStars);
        const total = Object.values(parsed).reduce((a: any, b: any) => (a || 0) + (b || 0), 0);
        setJewelTotalStars(Number(total) || 0);
      } catch {}
    }

    const ebTimes = localStorage.getItem(EXCITEBIKE_BEST_TIMES_KEY);
    if (ebTimes) {
      try {
        setExcitebikeBestTimes(JSON.parse(ebTimes));
      } catch {}
    }

    const hScore = localStorage.getItem(HOLEIO_HIGH_SCORE_KEY);
    if (hScore) setHoleioHighScore(parseInt(hScore, 10) || 0);

    const hKills = localStorage.getItem(HOLEIO_BEST_KILLS_KEY);
    if (hKills) setHoleioBestKills(parseInt(hKills, 10) || 0);

    const hSize = localStorage.getItem(HOLEIO_MAX_SIZE_KEY);
    if (hSize) setHoleioMaxSize(parseInt(hSize, 10) || 0);
    const sScore = localStorage.getItem(SHOOTER_HIGH_SCORE_KEY);
    if (sScore) setShooterHighScore(parseInt(sScore, 10) || 0);

    const tScore = localStorage.getItem(TETRIS_HIGH_SCORE_KEY);
    if (tScore) setTetrisHighScore(parseInt(tScore, 10) || 0);

    const bScore = localStorage.getItem(BROS_HIGH_SCORE_KEY);
    if (bScore) setBrosHighScore(parseInt(bScore, 10) || 0);

    const boScore = localStorage.getItem(BREAKOUT_HIGH_SCORE_KEY);
    if (boScore) setBreakoutHighScore(parseInt(boScore, 10) || 0);

    const gScore = localStorage.getItem(GAME2048_HIGH_SCORE_KEY);
    if (gScore) setGame2048HighScore(parseInt(gScore, 10) || 0);

    const deScore = localStorage.getItem(DOTEATER_HIGH_SCORE_KEY);
    if (deScore) setDoteaterHighScore(parseInt(deScore, 10) || 0);

    const pBest = localStorage.getItem(PONG_RALLY_KEY);
    if (pBest) setPongRallyBest(parseInt(pBest, 10) || 0);

    const pScore = localStorage.getItem(PAPERIO_HIGH_SCORE_KEY);
    if (pScore) setPaperioHighScore(parseInt(pScore, 10) || 0);

    const pPct = localStorage.getItem(PAPERIO_MAX_PERCENT_KEY);
    if (pPct) setPaperioMaxPercent(parseFloat(pPct) || 0);

    const pKills = localStorage.getItem(PAPERIO_HIGH_KILLS_KEY);
    if (pKills) setPaperioHighKills(parseInt(pKills, 10) || 0);

    const abScore = localStorage.getItem(ANGRY_BIRDS_HIGH_SCORE_KEY);
    if (abScore) setAngryBirdsHighScore(parseInt(abScore, 10) || 0);

    const bmScore = localStorage.getItem(BOMBERMAN_HIGH_SCORE_KEY);
    if (bmScore) setBombermanHighScore(parseInt(bmScore, 10) || 0);

    const bmWins = localStorage.getItem(BOMBERMAN_BATTLE_WINS_KEY);
    if (bmWins) setBombermanBattleWins(parseInt(bmWins, 10) || 0);

    const bmStage = localStorage.getItem(BOMBERMAN_STAGE_CLEARED_KEY);
    if (bmStage) setBombermanStageCleared(parseInt(bmStage, 10) || 0);

    const abStars = localStorage.getItem(ANGRY_BIRDS_STARS_KEY);
    if (abStars) {
      try {
        const parsed = JSON.parse(abStars);
        const total = Object.values(parsed).reduce(
          (acc: number, cur) => acc + (typeof cur === 'number' ? cur : 0),
          0
        ) as number;
        setAngryBirdsTotalStars(total);
      } catch {}
    }

    const mEasy = localStorage.getItem('minesweeper_best_easy');
    const mMed = localStorage.getItem('minesweeper_best_medium');
    const mHard = localStorage.getItem('minesweeper_best_hard');

    setMinesweeperBests({
      easy: mEasy ? parseInt(mEasy, 10) : null,
      medium: mMed ? parseInt(mMed, 10) : null,
      hard: mHard ? parseInt(mHard, 10) : null,
    });
  };

  useEffect(() => {
    loadRecords();
  }, [activeGame]);

  // フルスクリーン状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    if (activeGame === 'sonic') {
      document.title = 'ソニック・スピード・ラッシュ (Sonic Speed Rush) | Games Hub';
    } else if (activeGame === 'wario') {
      document.title = 'メイド イン ワリオ (WarioWare) | Games Hub';
    } else if (activeGame === 'suika') {
      document.title = 'スイカゲーム (Suika Game) | Games Hub';
    } else if (activeGame === 'cookie') {
      document.title = 'クッキークリッカー (Cookie Clicker) | Games Hub';
    } else if (activeGame === 'spire') {
      document.title = 'スパイア・オブ・フェイト (Spire of Fate) | Games Hub';
    } else if (activeGame === 'chiikawa') {
      document.title = 'ちいかわ なんとかなれ！大作戦 | Games Hub';
    } else if (activeGame === 'holeio') {
      document.title = 'ブラックホール.io (Hole.io) | Games Hub';
    } else if (activeGame === 'excitebike') {
      document.title = 'エキサイトバイク (Excitebike) | Games Hub';
    } else if (activeGame === 'bomberman') {
      document.title = 'ボンバーブラスト (Bomber Blast) | Games Hub';
    } else if (activeGame === 'angrybirds') {
      document.title = 'アングリーバード (Angry Birds) | Games Hub';
    } else if (activeGame === 'paperio') {
      document.title = 'ペーパー.io (Paper.io) | Games Hub';
    } else if (activeGame === 'breakout') {
      document.title = 'ブロック崩し (Breakout) | Games Hub';
    } else if (activeGame === 'game2048') {
      document.title = '2048 | Games Hub';
    } else if (activeGame === 'doteater') {
      document.title = 'ドットイーター (Dot Eater) | Games Hub';
    } else if (activeGame === 'pong') {
      document.title = 'ポン (Pong) | Games Hub';
    } else if (activeGame === 'shooter') {
      document.title = 'Star Striker (スター・ストライカー) | Games Hub';
    } else if (activeGame === 'bros') {
      document.title = 'Gemini 3.7 Bros. | Games Hub';
    } else if (activeGame === 'tetris') {
      document.title = 'テトリス (Tetris) | Games Hub';
    } else if (activeGame === 'minesweeper') {
      document.title = 'マインスイーパー (Minesweeper) | Games Hub';
    } else if (activeGame === 'jewel') {
      document.title = 'ジュエルクエスト (Jewel Quest) | Games Hub';
    } else {
      document.title = 'Games Hub - Web Mini Games Collection';
    }
  }, [activeGame]);

  // ゲームごとのレコード一覧
  const getGameRecords = (gameId: GameId): RecordItem[] => {
    if (gameId === 'sonic') {
      return [
        {
          label: 'HIGH SCORE',
          value: sonicHighScore > 0 ? `${sonicHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'BEST TIME',
          value:
            sonicBestTime > 0
              ? `${Math.floor(sonicBestTime / 60000)}:${Math.floor((sonicBestTime % 60000) / 1000).toString().padStart(2, '0')}`
              : '--',
        },
        {
          label: 'MAX RINGS',
          value: sonicMaxRings > 0 ? `${sonicMaxRings} 💍` : '--',
        },
      ];
    }
    if (gameId === 'wario') {
      return [
        {
          label: 'HIGH SCORE',
          value: warioHighScore > 0 ? `${warioHighScore.toLocaleString()} ゲーム` : '--',
        },
        {
          label: 'MAX SPEED',
          value: warioMaxSpeed > 1 ? `Lv.${warioMaxSpeed}` : 'Lv.1',
        },
      ];
    }
    if (gameId === 'suika') {
      return [
        {
          label: 'HIGH SCORE',
          value: suikaHighScore > 0 ? `${suikaHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: '🍉 スイカ作成数',
          value: suikaWatermelons > 0 ? `${suikaWatermelons} 個` : '--',
        },
      ];
    }
    if (gameId === 'cookie') {
      return [
        {
          label: '累計生産クッキー',
          value: cookieAllTimeEarned > 0 ? `🍪 ${formatNumber(cookieAllTimeEarned)}` : '--',
        },
        {
          label: '昇天チップス',
          value: cookiePrestigeChips > 0 ? `👼 ${cookiePrestigeChips} 個` : '--',
        },
      ];
    }
    if (gameId === 'spire') {
      return [
        {
          label: '最高到達階層',
          value: spireHighFloor > 0 ? `${spireHighFloor} F` : '--',
        },
        {
          label: '尖塔制覇クリア',
          value: spireWins > 0 ? `👑 ${spireWins} 回` : '--',
        },
      ];
    }
    if (gameId === 'chiikawa') {
      return [
        {
          label: '討伐 HIGH SCORE',
          value: chiikawaSubjugationScore > 0 ? `${chiikawaSubjugationScore.toLocaleString()} pts` : '--',
        },
        {
          label: '草むしり HIGH',
          value: chiikawaWeedingScore > 0 ? `${chiikawaWeedingScore.toLocaleString()} pts` : '--',
        },
        {
          label: '草むしり検定段位',
          value: chiikawaWeedingRank !== '未取得' ? chiikawaWeedingRank : '--',
        },
      ];
    }
    if (gameId === 'jewel') {
      return [
        {
          label: 'TIME ATTACK',
          value: jewelHighScore > 0 ? `${jewelHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'MISSION STARS',
          value: jewelTotalStars > 0 ? `★ ${jewelTotalStars} / 15` : '--',
        },
      ];
    }
    if (gameId === 'holeio') {
      return [
        {
          label: 'HIGH SCORE',
          value: holeioHighScore > 0 ? `${holeioHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'MAX RADIUS',
          value: holeioMaxSize > 0 ? `${holeioMaxSize} m` : '--',
        },
        {
          label: 'MAX KILLS',
          value: holeioBestKills > 0 ? `${holeioBestKills} 撃破` : '--',
        },
      ];
    }
    if (gameId === 'excitebike') {
      const t1 = excitebikeBestTimes['track_1'];
      const t2 = excitebikeBestTimes['track_2'];
      const t3 = excitebikeBestTimes['track_3'];
      return [
        {
          label: 'TRACK 1 BEST',
          value: t1 !== undefined ? `${t1.toFixed(2)}s` : '--',
        },
        {
          label: 'TRACK 2 BEST',
          value: t2 !== undefined ? `${t2.toFixed(2)}s` : '--',
        },
        {
          label: 'TRACK 3 BEST',
          value: t3 !== undefined ? `${t3.toFixed(2)}s` : '--',
        },
      ];
    }
    if (gameId === 'bomberman') {
      return [
        {
          label: 'BATTLE WINS',
          value: bombermanBattleWins > 0 ? `👑 ${bombermanBattleWins} 勝` : '--',
        },
        {
          label: 'HIGH SCORE',
          value: bombermanHighScore > 0 ? `${bombermanHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'STAGE CLEARED',
          value: bombermanStageCleared > 0 ? `STAGE ${bombermanStageCleared}` : '--',
        },
      ];
    }
    if (gameId === 'angrybirds') {
      return [
        {
          label: 'HIGH SCORE',
          value: angryBirdsHighScore > 0 ? `${angryBirdsHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'STARS',
          value: angryBirdsTotalStars > 0 ? `★ ${angryBirdsTotalStars} / 24` : '--',
        },
      ];
    }
    if (gameId === 'paperio') {
      return [
        {
          label: 'MAX PERCENT',
          value: paperioMaxPercent > 0 ? `${paperioMaxPercent.toFixed(1)}%` : '--',
        },
        {
          label: 'HIGH SCORE',
          value: paperioHighScore > 0 ? `${paperioHighScore.toLocaleString()} pts` : '--',
        },
        {
          label: 'MAX KILLS',
          value: paperioHighKills > 0 ? `${paperioHighKills} 撃破` : '--',
        },
      ];
    }
    if (gameId === 'breakout') {
      return [
        {
          label: 'HIGH SCORE',
          value: breakoutHighScore > 0 ? `${breakoutHighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'game2048') {
      return [
        {
          label: 'BEST SCORE',
          value: game2048HighScore > 0 ? `${game2048HighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'doteater') {
      return [
        {
          label: 'HIGH SCORE',
          value: doteaterHighScore > 0 ? `${doteaterHighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'pong') {
      return [
        {
          label: 'RALLY BEST',
          value: pongRallyBest > 0 ? `${pongRallyBest} 回` : '--',
        },
      ];
    }
    if (gameId === 'shooter') {
      return [
        {
          label: 'HIGH SCORE',
          value: shooterHighScore > 0 ? `${shooterHighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'bros') {
      return [
        {
          label: 'HIGH SCORE',
          value: brosHighScore > 0 ? `${brosHighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'tetris') {
      return [
        {
          label: 'HIGH SCORE',
          value: tetrisHighScore > 0 ? `${tetrisHighScore.toLocaleString()} pts` : '--',
        },
      ];
    }
    if (gameId === 'minesweeper') {
      return [
        {
          label: '初級',
          value: minesweeperBests.easy !== null ? `${minesweeperBests.easy}s` : '--',
        },
        {
          label: '中級',
          value: minesweeperBests.medium !== null ? `${minesweeperBests.medium}s` : '--',
        },
        {
          label: '上級',
          value: minesweeperBests.hard !== null ? `${minesweeperBests.hard}s` : '--',
        },
      ];
    }
    return [];
  };

  // ジャンル別該当件数の計算
  const getGenreCount = (genreId: GameGenre | 'all'): number => {
    if (genreId === 'all') return GAMES.length;
    return GAMES.filter((g) => g.genres.includes(genreId)).length;
  };

  // ジャンルおよびキーワードによるフィルタリング
  const filteredGames = GAMES.filter((game) => {
    const matchesGenre = selectedGenre === 'all' || game.genres.includes(selectedGenre);
    if (!matchesGenre) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      game.title.toLowerCase().includes(q) ||
      game.titleEn.toLowerCase().includes(q) ||
      game.description.toLowerCase().includes(q) ||
      game.badge.toLowerCase().includes(q) ||
      game.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className={`min-h-screen flex flex-col antialiased transition-colors duration-200 ${
        isDark
          ? 'bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white'
          : 'bg-slate-50 text-slate-900 selection:bg-indigo-200 selection:text-indigo-900'
      }`}
    >
      <Header
        activeGame={activeGame}
        onGoHome={() => setActiveGame(null)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <main
        className={`flex-1 w-full flex flex-col items-center justify-center transition-all duration-300 ${
          isFullscreen
            ? activeGame
              ? 'max-w-none p-1 sm:p-2'
              : 'max-w-none px-2 sm:px-4 py-2'
            : 'max-w-6xl mx-auto px-4 py-4 sm:py-6'
        }`}
      >
        {!activeGame ? (
          <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* ヒーローセクション */}
            <div
              className={`relative text-center py-6 px-4 sm:py-8 sm:px-6 rounded-3xl border overflow-hidden transition-all ${
                isDark
                  ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950 border-slate-800/80 shadow-xl'
                  : 'bg-gradient-to-b from-indigo-50/80 via-white to-slate-50 border-slate-200/90 shadow-md'
              }`}
            >
              <div
                className={`absolute inset-0 ${
                  isDark
                    ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]'
                    : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]'
                }`}
              />

              <div className="relative z-10 max-w-2xl mx-auto space-y-3">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold ${
                    isDark
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Instant Web Games Collection
                </div>

                <h1
                  className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
                    isDark
                      ? 'bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-pink-300'
                      : 'bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-indigo-900 to-purple-800'
                  }`}
                >
                  Games Hub
                </h1>

                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600 font-medium'
                  }`}
                >
                  PCやスマホからブラウザを開くだけで即座に遊べるWebゲームコレクションです。
                </p>
              </div>

              {/* 特徴ハイライト */}
              <div
                className={`relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mt-6 pt-5 border-t text-left ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200/80'
                }`}
              >
                <div
                  className={`flex items-start gap-3 p-3 rounded-2xl border ${
                    isDark
                      ? 'bg-slate-900/70 border-slate-800'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      インストール不要
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      ブラウザを開くだけで即プレイ
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                    isDark
                      ? 'bg-slate-900/70 border-slate-800'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <Gamepad2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      スマホ・PC両対応
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      キーボード ＆ タッチ操作
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                    isDark
                      ? 'bg-slate-900/70 border-slate-800'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div
                      className={`text-xs font-bold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      記録の自動保存
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      ベストタイム・ハイスコア保持
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ゲーム一覧 ＆ ジャンルフィルタリング */}
            <div className="space-y-5">
              {/* ヘッダー＆検索バー */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2
                    className={`text-2xl font-black tracking-wide flex items-center gap-2.5 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>ゲーム一覧</span>
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {filteredGames.length} / {GAMES.length}
                    </span>
                  </h2>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    ジャンル選択やキーワード検索でお好みのゲームを瞬時に見つけられます
                  </p>
                </div>

                {/* キーワード検索入力 */}
                <div className="relative w-full sm:w-72">
                  <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ゲーム名・キーワード検索..."
                    className={`w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs font-medium border transition-all outline-hidden ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
                      title="検索をクリア"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* ピル型ジャンルフィルタータブバー */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {GENRES.map((g) => {
                  const isSelected = selectedGenre === g.id;
                  const count = getGenreCount(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-102 border border-indigo-400/40'
                          : isDark
                          ? 'bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                      }`}
                    >
                      <span className="text-sm">{g.icon}</span>
                      <span>{g.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white font-black'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ゲームカードグリッド */}
              {filteredGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {filteredGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onSelect={(id) => setActiveGame(id)}
                      isDark={isDark}
                      records={getGameRecords(game.id)}
                    />
                  ))}
                </div>
              ) : (
                /* 検索・絞り込み結果0件の空ステート */
                <div
                  className={`w-full py-16 px-4 rounded-3xl border text-center flex flex-col items-center justify-center space-y-3 ${
                    isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl text-indigo-400">
                    🔍
                  </div>
                  <div className={`text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    条件に一致するゲームが見つかりませんでした
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    検索キーワードを変更するか、ジャンルフィルターを「すべて」に切り替えてみてください。
                  </p>
                  <button
                    onClick={() => {
                      setSelectedGenre('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    すべてのゲームを表示
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
            {activeGame === 'zoo' && (
              <PixelZooGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'sonic' && (
              <SonicGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'wario' && (
              <WarioGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'suika' && (
              <SuikaGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'cookie' && (
              <CookieClickerGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'spire' && (
              <SpireGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'chiikawa' && (
              <ChiikawaGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'jewel' && (
              <JewelGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'holeio' && (
              <HoleIoGame
                onBackToHub={() => {
                  setActiveGame(null);
                  loadRecords();
                }}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'excitebike' && (
              <ExcitebikeGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'bomberman' && (
              <BombermanGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'angrybirds' && (
              <AngryBirdsGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'paperio' && (
              <PaperIoGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'breakout' && (
              <BreakoutGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'game2048' && (
              <Game2048
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'doteater' && (
              <DotEaterGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'pong' && (
              <PongGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'shooter' && (
              <SpaceShooterGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'bros' && (
              <GeminiBrosGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'tetris' && (
              <TetrisGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
            {activeGame === 'minesweeper' && (
              <MinesweeperGame
                onBackToHub={() => setActiveGame(null)}
                isDark={isDark}
                isFullscreen={isFullscreen}
              />
            )}
          </div>
        )}
      </main>

      {(!isFullscreen || !activeGame) && (
        <footer
          className={`py-6 border-t text-center text-xs transition-colors ${
            isDark
              ? 'border-slate-800/60 text-slate-500'
              : 'border-slate-200 text-slate-500 bg-white/50'
          }`}
        >
          <p>Games Hub &copy; 2026 - Instant Play in Browser</p>
        </footer>
      )}
    </div>
  );
}

export default App;
