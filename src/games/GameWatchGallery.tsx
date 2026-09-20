import React, { useState, useEffect } from 'react';
import { GwGameId, GameDifficulty, ScreenMode } from './gwgallery/types';
import { ManholeGame } from './gwgallery/games/ManholeGame';
import { OctopusGame } from './gwgallery/games/OctopusGame';
import { FireGame } from './gwgallery/games/FireGame';
import { OilPanicGame } from './gwgallery/games/OilPanicGame';
import { gwSound } from './gwgallery/sound';
import {
  Trophy,
  Volume2,
  VolumeX,
  Palette,
  ArrowLeft,
  Play,
} from 'lucide-react';

interface GameWatchGalleryProps {
  onBackToHub: () => void;
  isDark?: boolean;
  isFullscreen?: boolean;
}

interface GameCardInfo {
  id: GwGameId;
  titleJa: string;
  titleEn: string;
  series: 'GOLD' | 'WIDE SCREEN' | 'MULTI SCREEN';
  year: number;
  badge: string;
  description: string;
  color: string;
  accent: string;
  previewIcon: string;
}

const GAME_CARDS: GameCardInfo[] = [
  {
    id: 'manhole',
    titleJa: 'マンホール',
    titleEn: 'MANHOLE',
    series: 'GOLD',
    year: 1981,
    badge: '名作パズルアクション',
    description:
      '4つの穴（上左・下左・上右・下右）にフタを持ち上げて橋をかけ、歩行者を安全に渡らせよう！落ちたら海へドボン！',
    color: 'from-amber-600 via-yellow-600 to-amber-700',
    accent: '#d97706',
    previewIcon: '🚶‍♂️🕳️',
  },
  {
    id: 'octopus',
    titleJa: 'オクトパス',
    titleEn: 'OCTOPUS',
    series: 'WIDE SCREEN',
    year: 1981,
    badge: '海底トレジャーハント',
    description:
      '巨大オクトパスのうごめく触手をくぐり抜け、沈没船の宝箱からゴールドを回収！ボートへ無事に持ち帰ればボーナス得点！',
    color: 'from-sky-600 via-cyan-700 to-blue-800',
    accent: '#0284c7',
    previewIcon: '🐙💰',
  },
  {
    id: 'fire',
    titleJa: 'ファイア',
    titleEn: 'FIRE',
    series: 'WIDE SCREEN',
    year: 1980,
    badge: '元祖パニックアクション',
    description:
      '火災ビルから飛び降りてくる避難者を救護ネットで3回バウンドさせて右端の救急車へ届けろ！タイミングが命の救助劇！',
    color: 'from-rose-600 via-red-600 to-amber-600',
    accent: '#e11d48',
    previewIcon: '🔥🚒',
  },
  {
    id: 'oilpanic',
    titleJa: 'オイルパニック',
    titleEn: 'OIL PANIC',
    series: 'MULTI SCREEN',
    year: 1982,
    badge: '伝説の上下2画面！',
    description:
      '上画面で配管から漏れるオイルの雫をバケツでキャッチ（最大3滴）！下画面でドラム缶を持つオッサンへ窓から流し落とせ！',
    color: 'from-amber-700 via-rose-800 to-neutral-900',
    accent: '#991b1b',
    previewIcon: '🛢️🏢',
  },
];

export const GameWatchGallery: React.FC<GameWatchGalleryProps> = ({
  onBackToHub,
  isDark = true,
  isFullscreen = false,
}) => {
  const [selectedGame, setSelectedGame] = useState<GwGameId | null>(null);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('gameA');
  const [screenMode, setScreenMode] = useState<ScreenMode>('classic');
  const [isMuted, setIsMuted] = useState<boolean>(gwSound.getMuted());
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameKey, setGameKey] = useState<number>(1);

  // ハイスコア一覧の取得
  const [scores, setScores] = useState({
    manholeA: 0,
    manholeB: 0,
    octopusA: 0,
    octopusB: 0,
    fireA: 0,
    fireB: 0,
    oilpanicA: 0,
    oilpanicB: 0,
  });

  const refreshScores = () => {
    setScores({
      manholeA: parseInt(localStorage.getItem('gw_manhole_gameA') || '0', 10),
      manholeB: parseInt(localStorage.getItem('gw_manhole_gameB') || '0', 10),
      octopusA: parseInt(localStorage.getItem('gw_octopus_gameA') || '0', 10),
      octopusB: parseInt(localStorage.getItem('gw_octopus_gameB') || '0', 10),
      fireA: parseInt(localStorage.getItem('gw_fire_gameA') || '0', 10),
      fireB: parseInt(localStorage.getItem('gw_fire_gameB') || '0', 10),
      oilpanicA: parseInt(localStorage.getItem('gw_oilpanic_gameA') || '0', 10),
      oilpanicB: parseInt(localStorage.getItem('gw_oilpanic_gameB') || '0', 10),
    });
  };

  useEffect(() => {
    refreshScores();
  }, [selectedGame]);

  const handleSelectGame = (gameId: GwGameId, diff: GameDifficulty = 'gameA') => {
    gwSound.click();
    setDifficulty(diff);
    setSelectedGame(gameId);
    setIsPaused(false);
    setGameKey((k) => k + 1);
  };

  const handleBackToMenu = () => {
    gwSound.click();
    setSelectedGame(null);
    refreshScores();
  };

  const handleToggleMute = () => {
    const next = gwSound.toggleMute();
    setIsMuted(next);
  };

  const handleToggleScreenMode = () => {
    gwSound.click();
    setScreenMode((m) => (m === 'classic' ? 'modern' : 'classic'));
  };

  const handleRestart = () => {
    gwSound.click();
    setIsPaused(false);
    setGameKey((k) => k + 1);
  };

  // プレイ中ゲームのレンダリング
  if (selectedGame !== null) {
    const commonProps = {
      key: `${selectedGame}-${difficulty}-${screenMode}-${gameKey}`,
      difficulty,
      screenMode,
      isFullscreen,
      onGameOver: () => refreshScores(),
      onBackToMenu: handleBackToMenu,
      onScoreChange: () => {},
      onMissChange: () => {},
      isPaused,
      onTogglePause: () => setIsPaused((p) => !p),
      onRestart: handleRestart,
      onToggleScreenMode: handleToggleScreenMode,
      onChangeDifficulty: (diff: GameDifficulty) => {
        setDifficulty(diff);
        handleRestart();
      },
    };

    switch (selectedGame) {
      case 'manhole':
        return <ManholeGame {...commonProps} />;
      case 'octopus':
        return <OctopusGame {...commonProps} />;
      case 'fire':
        return <FireGame {...commonProps} />;
      case 'oilpanic':
        return <OilPanicGame {...commonProps} />;
      default:
        return null;
    }
  }

  // ギャラリー選択メニュー画面
  const totalScore =
    scores.manholeA +
    scores.manholeB +
    scores.octopusA +
    scores.octopusB +
    scores.fireA +
    scores.fireB +
    scores.oilpanicA +
    scores.oilpanicB;

  return (
    <div
      className={`w-full flex flex-col items-center select-none transition-all duration-300 ${
        isDark ? 'text-neutral-100' : 'text-neutral-900'
      } ${
        isFullscreen
          ? 'h-screen w-screen max-w-none p-2 sm:p-6 bg-neutral-950 overflow-y-auto'
          : 'max-w-5xl mx-auto p-2 sm:p-4'
      }`}
    >
      {/* ギャラリーミュージアム ヘッダーバー */}
      <div className="w-full flex items-center justify-between bg-neutral-900/90 text-amber-300 px-4 py-3 rounded-2xl border-2 border-amber-600/40 shadow-xl backdrop-blur-md mb-4 sm:mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToHub}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black text-neutral-200 hover:text-white text-xs font-bold transition-all border border-neutral-700 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>HUB</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl">🎮</span>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wider text-amber-200 font-mono">
                GAME &amp; WATCH GALLERY
              </h1>
              <p className="text-[10px] sm:text-xs text-neutral-400">
                4-in-1 Retro LCD Classics Collection
              </p>
            </div>
          </div>
        </div>

        {/* 総合スコア＆設定トグル */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 bg-black/50 px-3 py-1 rounded-lg border border-amber-500/30">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <div className="text-right">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">TOTAL BEST</div>
              <div className="text-xs font-mono font-black text-amber-300">{totalScore}</div>
            </div>
          </div>

          <button
            onClick={handleToggleScreenMode}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all active:scale-95 ${
              screenMode === 'modern'
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-neutral-800 text-amber-300 border-amber-600/50'
            }`}
            title="画面モード切替"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{screenMode === 'classic' ? 'CLASSIC LCD' : 'MODERN COLOR'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border text-xs transition-all active:scale-95 ${
              isMuted
                ? 'bg-red-950/80 text-red-400 border-red-700'
                : 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
            }`}
            title={isMuted ? 'ミュート中' : 'サウンドON'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4タイトル グリッドカード一覧 */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {GAME_CARDS.map((card) => {
          const scoreA =
            card.id === 'manhole'
              ? scores.manholeA
              : card.id === 'octopus'
              ? scores.octopusA
              : card.id === 'fire'
              ? scores.fireA
              : scores.oilpanicA;
          const scoreB =
            card.id === 'manhole'
              ? scores.manholeB
              : card.id === 'octopus'
              ? scores.octopusB
              : card.id === 'fire'
              ? scores.fireB
              : scores.oilpanicB;

          return (
            <div
              key={card.id}
              className="relative rounded-2xl sm:rounded-3xl border-2 border-neutral-700/80 bg-neutral-900/90 shadow-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden hover:border-amber-500/70 transition-all duration-300 group"
            >
              {/* 背景の薄いグラデーション光彩 */}
              <div
                className={`absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${card.color} pointer-events-none group-hover:opacity-30 transition-opacity`}
              />

              <div>
                {/* ヘッダー情報 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                    {card.series} &bull; {card.year}
                  </span>
                  <span className="text-xs font-bold text-amber-200/80 bg-neutral-800 px-2 py-0.5 rounded-full">
                    {card.badge}
                  </span>
                </div>

                {/* タイトル & アイコン */}
                <div className="flex items-start space-x-3 my-2">
                  <div className="text-3xl sm:text-4xl p-2.5 rounded-2xl bg-neutral-800/80 border border-neutral-700 shadow-inner flex items-center justify-center shrink-0">
                    {card.previewIcon}
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-amber-100 font-mono tracking-wide">
                      {card.titleJa}
                    </h2>
                    <div className="text-xs font-bold text-amber-400 tracking-wider">
                      {card.titleEn}
                    </div>
                  </div>
                </div>

                {/* ゲーム説明 */}
                <p className="text-xs text-neutral-300 leading-relaxed my-2 min-h-[38px]">
                  {card.description}
                </p>
              </div>

              {/* ハイスコア＆スタートボタン群 */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col gap-2.5">
                {/* ハイスコア表示 */}
                <div className="flex items-center justify-between text-xs font-mono px-2 py-1 bg-black/40 rounded-lg border border-neutral-800">
                  <div className="flex items-center space-x-1 text-neutral-400">
                    <span>BEST A:</span>
                    <span className="text-amber-300 font-bold">{scoreA}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-neutral-400">
                    <span>BEST B:</span>
                    <span className="text-amber-300 font-bold">{scoreB}</span>
                  </div>
                </div>

                {/* スタートボタン (GAME A / GAME B) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSelectGame(card.id, 'gameA')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-black text-xs shadow-lg flex items-center justify-center space-x-1 active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>GAME A (NORMAL)</span>
                  </button>
                  <button
                    onClick={() => handleSelectGame(card.id, 'gameB')}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-xs shadow-lg flex items-center justify-center space-x-1 active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>GAME B (HARD)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター・操作ガイド */}
      <div className="w-full mt-6 text-center text-xs text-neutral-500 font-mono">
        <p>
          &copy; 1980-1982 Nintendo Game &amp; Watch Tribute &bull; HTML5 LCD Simulation
        </p>
      </div>
    </div>
  );
};
