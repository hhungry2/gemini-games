import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GameCard, RecordItem } from './components/GameCard';
import { TetrisGame } from './games/TetrisGame';
import { MinesweeperGame } from './games/MinesweeperGame';
import { GeminiBrosGame } from './games/GeminiBrosGame';
import { SpaceShooterGame } from './games/SpaceShooterGame';
import { GameInfo, GameId } from './types';
import { Gamepad2, Sparkles, Zap, ShieldCheck } from 'lucide-react';

const THEME_KEY = 'games_hub_theme';
const TETRIS_HIGH_SCORE_KEY = 'tetris_high_score_v1';
const BROS_HIGH_SCORE_KEY = 'gemini_bros_high_score';
const SHOOTER_HIGH_SCORE_KEY = 'star_striker_high_score';

const GAMES: GameInfo[] = [
  {
    id: 'shooter',
    title: 'Star Striker (スター・ストライカー)',
    titleEn: 'Cyber Space Vertical Shooter',
    description:
      '宇宙空間を舞台にした超爽快な本格縦スクロールシューティング！パワーアップ・追尾ミサイル・支援ビット機・巨大ボス戦・ハイパーボム完備。',
    badge: '新作STG',
    iconName: 'shooter',
    color: 'from-cyan-500 via-indigo-600 to-rose-500',
    tags: ['縦シュー', '弾幕', '3ステージ', '巨大ボス', 'スマホ・PC両対応'],
  },
  {
    id: 'bros',
    title: 'Gemini 3.7 Bros.',
    titleEn: 'Super AI 2D Platformer Adventure',
    description:
      '4つのワールド・地下ボーナス・城・ボス戦を駆け巡る本格2D横スクロールアクション！思考ビーム・スター無敵・チップチューンBGM完備。',
    badge: '本格アクション',
    iconName: 'bros',
    color: 'from-blue-600 via-indigo-600 to-purple-600',
    tags: ['2Dアクション', '4ワールド', 'ボス戦', 'チップチューン', 'スマホ操作OK'],
  },
  {
    id: 'tetris',
    title: 'テトリス (Tetris Neon)',
    titleEn: 'Classic Block Puzzle Game',
    description:
      'ネオングローが輝く本格テトリス！HOLD・NEXT・ゴースト表示・壁蹴り回転・Web Audioシンセ効果音・スマホタッチ操作に完全対応。',
    badge: '人気パズル',
    iconName: 'tetris',
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    tags: ['パズル', '定番', 'アクション', 'サウンド対応', 'スマホ操作OK'],
  },
  {
    id: 'minesweeper',
    title: 'マインスイーパー (Minesweeper Cyber)',
    titleEn: 'Neon Cyber Minesweeper',
    description:
      'サイバーパンク調のクールなマインスイーパー！初手安全保証・連鎖オープン・Chording・初級〜上級・ベストタイム記録に対応。',
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
  const [shooterHighScore, setShooterHighScore] = useState<number>(0);
  const [tetrisHighScore, setTetrisHighScore] = useState<number>(0);
  const [brosHighScore, setBrosHighScore] = useState<number>(0);
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
    const sScore = localStorage.getItem(SHOOTER_HIGH_SCORE_KEY);
    if (sScore) setShooterHighScore(parseInt(sScore, 10) || 0);

    const tScore = localStorage.getItem(TETRIS_HIGH_SCORE_KEY);
    if (tScore) setTetrisHighScore(parseInt(tScore, 10) || 0);

    const bScore = localStorage.getItem(BROS_HIGH_SCORE_KEY);
    if (bScore) setBrosHighScore(parseInt(bScore, 10) || 0);

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
    if (activeGame === 'shooter') {
      document.title = 'Star Striker (スター・ストライカー) | Games Hub';
    } else if (activeGame === 'bros') {
      document.title = 'Gemini 3.7 Bros. | Games Hub';
    } else if (activeGame === 'tetris') {
      document.title = 'テトリス (Tetris Neon) | Games Hub';
    } else if (activeGame === 'minesweeper') {
      document.title = 'マインスイーパー (Minesweeper Cyber) | Games Hub';
    } else {
      document.title = 'Games Hub - Web Mini Games Collection';
    }
  }, [activeGame]);

  // ゲームごとのレコード一覧
  const getGameRecords = (gameId: GameId): RecordItem[] => {
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
        className={`flex-1 w-full flex flex-col items-center transition-all duration-300 ${
          isFullscreen ? 'max-w-none px-2 sm:px-4 py-2' : 'max-w-6xl mx-auto px-4 py-4 sm:py-6'
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
                    ゲーム一覧
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
          <div className="w-full animate-in fade-in duration-300">
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

      <footer
        className={`py-6 border-t text-center text-xs transition-colors ${
          isDark
            ? 'border-slate-800/60 text-slate-500'
            : 'border-slate-200 text-slate-500 bg-white/50'
        }`}
      >
        <p>Games Hub &copy; 2026 - Instant Play in Browser</p>
      </footer>
    </div>
  );
}

export default App;
