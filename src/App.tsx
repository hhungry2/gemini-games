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
import { GameInfo, GameId } from './types';
import { Gamepad2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

const THEME_KEY = 'games_hub_theme';
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

const GAMES: GameInfo[] = [
  {
    id: 'holeio',
    title: 'ブラックホール.io (Hole.io)',
    titleEn: 'City Devourer Physics Action',
    description:
      '地面のブラックホールとなり街のすべてを飲み込め！歩行者や車から始まり、ビルやライバルホールまで吸い込んで超巨大化！2.5D都市・8体の賢いBot対戦・3つのゲームモード・パワーアップ完備。',
    badge: '新作！大迫力io',
    iconName: 'holeio',
    color: 'from-sky-500 via-indigo-600 to-rose-600',
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

  // ハイスコア / ベストタイム状態
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

  // レコードの読み込み
  const loadRecords = () => {
    if (typeof window === 'undefined') return;
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
    if (activeGame === 'holeio') {
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
    } else {
      document.title = 'Games Hub - Web Mini Games Collection';
    }
  }, [activeGame]);

  // ゲームごとのレコード一覧
  const getGameRecords = (gameId: GameId): RecordItem[] => {
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

            {/* ゲーム一覧 */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2
                    className={`text-2xl font-black tracking-wide ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    ゲーム一覧 (全13タイトル)
                  </h2>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    プレイしたいゲームを選択してください
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {GAMES.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={(id) => setActiveGame(id)}
                    isDark={isDark}
                    records={getGameRecords(game.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300">
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
