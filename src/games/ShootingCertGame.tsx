import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Crosshair,
  HelpCircle,
  Sparkles,
  Flame,
  ChevronRight,
  Share2,
  Check,
} from 'lucide-react';
import { sound } from '../utils/audio';

// ==========================================
// 定数 & 型定義
// ==========================================
export const SHOOTING_CERT_HIGH_SCORE_KEY = 'shooting_cert_high_score_v1';
export const SHOOTING_CERT_BEST_AGE_KEY = 'shooting_cert_best_age_v1';
export const SHOOTING_CERT_BEST_RANK_KEY = 'shooting_cert_best_rank_v1';

interface ShootingCertGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// ゲーム状態
type GameState =
  | 'TITLE'
  | 'HOW_TO_PLAY'
  | 'PRACTICE_SELECT'
  | 'STAGE_INTRO'
  | 'PLAYING'
  | 'STAGE_RESULT'
  | 'FINAL_EVAL_ANIM'
  | 'FINAL_RESULT';

// 検定種目ID
export type TestType =
  | 'RAPID_FIRE' // 種目1: 連射検定
  | 'CHICKEN_RACE' // 種目2: 寸止め検定
  | 'REACTION' // 種目3: 反射迎撃検定
  | 'BULLET_HELL' // 種目4: 弾幕回避・かすり検定
  | 'JUDGEMENT' // 種目5: 敵味方識別検定
  | 'BOSS_DUEL'; // 種目6: ボス討伐タイムアタック

interface TestMeta {
  id: TestType;
  index: number;
  title: string;
  subtitle: string;
  rule: string;
  targetMetric: string;
  timeLimit: number; // 秒
  color: string;
  iconText: string;
}

const TESTS: TestMeta[] = [
  {
    id: 'RAPID_FIRE',
    index: 1,
    title: '連射検定',
    subtitle: 'RAPID FIRE TEST',
    rule: '制限時間内に撃ちまくれ！秒間連射速度を測定！',
    targetMetric: '秒間連射数 (shots/s)',
    timeLimit: 7,
    color: '#ef4444',
    iconText: '🔥',
  },
  {
    id: 'CHICKEN_RACE',
    index: 2,
    title: '寸止め検定',
    subtitle: 'CHICKEN RACE TEST',
    rule: '猛スピードで迫る防壁！激突直前ギリギリで急停止せよ！',
    targetMetric: '停止残距離 (px)',
    timeLimit: 8,
    color: '#f59e0b',
    iconText: '🛑',
  },
  {
    id: 'REACTION',
    index: 3,
    title: '反射迎撃検定',
    subtitle: 'REACTION & INTERCEPT',
    rule: '突如出現する高機動ターゲットを最短時間で即撃破せよ！',
    targetMetric: '平均反応時間 (ms)',
    timeLimit: 12,
    color: '#3b82f6',
    iconText: '⚡',
  },
  {
    id: 'BULLET_HELL',
    index: 4,
    title: '弾幕回避検定',
    subtitle: 'BULLET HELL & GRAZE',
    rule: '狂乱の弾幕を掻い潜れ！弾をギリギリかすめてグレイズを稼げ！',
    targetMetric: '生存 & グレイズ数',
    timeLimit: 12,
    color: '#a855f7',
    iconText: '🌀',
  },
  {
    id: 'JUDGEMENT',
    index: 5,
    title: '識別判断検定',
    subtitle: 'FRIEND OR FOE TEST',
    rule: '敵だけを撃墜せよ！友軍機・救護船への誤射は大幅減点！',
    targetMetric: '正確撃破数 & 誤射ゼロ',
    timeLimit: 12,
    color: '#10b981',
    iconText: '🎯',
  },
  {
    id: 'BOSS_DUEL',
    index: 6,
    title: 'ボス討伐検定',
    subtitle: 'BOSS TIME ATTACK',
    rule: '最終決戦！巨大要塞ボスの弱点コアを最速タイムで破壊せよ！',
    targetMetric: '撃破所要タイム (秒)',
    timeLimit: 22,
    color: '#ec4899',
    iconText: '👑',
  },
];

// 各種目の成績データ
interface TestResultData {
  testId: TestType;
  score: number; // 0〜1000
  metricLabel: string;
  metricValue: string;
  rank: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  comment: string;
}

// 総合評価データ
interface FinalEvaluation {
  totalScore: number;
  shooterAge: number;
  overallRank: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  titleName: string;
  instructorComment: string;
  radarScores: {
    rapid: number; // 連射力 (0~100)
    reaction: number; // 反射神経 (0~100)
    guts: number; // 度胸・寸止め (0~100)
    evasion: number; // 回避・グレイズ (0~100)
    judgement: number; // 識別・判断力 (0~100)
  };
}

// 内部バーチャル解像度
const V_WIDTH = 760;
const V_HEIGHT = 900;

export const ShootingCertGame: React.FC<ShootingCertGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  // DOM refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ステート
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [isExamMode, setIsExamMode] = useState<boolean>(true); // true: 総合検定, false: 特訓
  const [currentTestIndex, setCurrentTestIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // ベスト記録 (localStorage)
  const [bestAge, setBestAge] = useState<number>(() => {
    const val = localStorage.getItem(SHOOTING_CERT_BEST_AGE_KEY);
    return val ? parseInt(val, 10) : 0;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const val = localStorage.getItem(SHOOTING_CERT_HIGH_SCORE_KEY);
    return val ? parseInt(val, 10) : 0;
  });
  const [bestRank, setBestRank] = useState<string>(() => {
    return localStorage.getItem(SHOOTING_CERT_BEST_RANK_KEY) || '--';
  });

  // 検定結果リスト
  const examResultsRef = useRef<TestResultData[]>([]);
  const [latestResult, setLatestResult] = useState<TestResultData | null>(null);
  const [finalEval, setFinalEval] = useState<FinalEvaluation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // 多重終了防止フラグ
  const testFinishedRef = useRef<boolean>(false);

  // アニメーション用タイマー
  const stateTimerRef = useRef<number>(0);
  const animStepRef = useRef<number>(0);

  // 操作キー状態
  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    shot: boolean;
    brake: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    shot: false,
    brake: false,
  });

  // タッチ・マウス操作座標
  const touchPosRef = useRef<{ x: number; y: number; active: boolean }>({
    x: V_WIDTH / 2,
    y: V_HEIGHT - 120,
    active: false,
  });

  // 自機エンティティ
  const playerRef = useRef({
    x: V_WIDTH / 2,
    y: V_HEIGHT - 140,
    vx: 0,
    vy: 0,
    speed: 7.5,
    width: 32,
    height: 38,
    hitRadius: 4, // かすり用の極小当たり判定
    grazeRadius: 28,
    isInvincible: false,
    invincibleTimer: 0,
    shield: 100,
    maxShield: 100,
    lastShotTime: 0,
  });

  // 弾・パーティクル・エフェクト
  interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    isEnemy: boolean;
    grazed?: boolean;
  }

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    shape?: 'circle' | 'spark' | 'ring';
  }

  interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    vy: number;
  }

  const playerBulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatingText[]>([]);
  const starsRef = useRef<{ x: number; y: number; speed: number; size: number; alpha: number }[]>([]);

  // 種目固有のワーク変数群
  const testDataRef = useRef({
    // 共通
    timeLeft: 0,
    elapsedTime: 0,
    frameCount: 0,

    // 種目1: 連射検定
    rapidShotsCount: 0,
    rapidDamage: 0,
    rapidTargetHp: 1000,
    rapidMaxHp: 1000,
    rapidPhase: 1,
    rapidClickShots: 0,

    // 種目2: 寸止め検定
    wallY: 0,
    wallSpeed: 0,
    isBraked: false,
    stoppedDistance: -1, // -1: 未停止
    isCrashed: false,
    targetLineY: V_HEIGHT - 220,

    // 種目3: 反射迎撃検定
    reactionRound: 0,
    totalReactionRounds: 5,
    reactionTarget: null as {
      x: number;
      y: number;
      spawnTime: number;
      active: boolean;
      radius: number;
      vx: number;
    } | null,
    reactionTimes: [] as number[],
    reactionNextSpawnTime: 0,

    // 種目4: 弾幕回避検定
    bulletHellSurvivalTime: 0,
    grazeCount: 0,
    bulletPatternTimer: 0,
    bulletPatternPhase: 0,
    hitsTaken: 0,

    // 種目5: 敵味方識別検定
    judgementEnemies: [] as {
      id: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      isFriend: boolean;
      hp: number;
      radius: number;
      type: number;
    }[],
    judgementEnemyKills: 0,
    judgementFriendMistakes: 0,
    judgementTotalTargets: 0,

    // 種目6: ボス討伐検定
    boss: null as {
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      vx: number;
      shield: number;
      phase: number;
      timer: number;
      defeatedTime: number;
    } | null,
  });

  // 星空背景の初期化
  useEffect(() => {
    const stars: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * V_WIDTH,
        y: Math.random() * V_HEIGHT,
        speed: 0.5 + Math.random() * 2.5,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }
    starsRef.current = stars;
  }, []);

  // 浮遊テキスト追加ヘルパー
  const addFloatText = (x: number, y: number, text: string, color: string = '#38bdf8', size: number = 20) => {
    floatTextsRef.current.push({
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      life: 0,
      maxLife: 45,
      vy: -1.2,
    });
  };

  // パーティクル追加ヘルパー
  const addExplosion = (x: number, y: number, count: number = 18, color: string = '#f59e0b', isBig: boolean = false) => {
    sound.playCertExplode(isBig);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (1.5 + Math.random() * 5.5) * (isBig ? 1.5 : 1);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 20),
        color: i % 2 === 0 ? color : '#ffffff',
        size: (2 + Math.random() * 4) * (isBig ? 1.8 : 1),
        shape: i % 4 === 0 ? 'spark' : 'circle',
      });
    }
  };

  // ==========================================
  // 種目開始セットアップ
  // ==========================================
  const startTest = useCallback((testIdx: number) => {
    testFinishedRef.current = false;
    setCurrentTestIndex(testIdx);
    const testMeta = TESTS[testIdx];
    setGameState('STAGE_INTRO');
    stateTimerRef.current = 100; // 約1.6秒イントロ

    // 自機リセット
    playerRef.current.x = V_WIDTH / 2;
    playerRef.current.y = V_HEIGHT - 130;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.shield = 100;
    playerRef.current.isInvincible = false;
    playerRef.current.lastShotTime = 0;

    // オブジェクトクリア
    playerBulletsRef.current = [];
    enemyBulletsRef.current = [];
    particlesRef.current = [];
    floatTextsRef.current = [];

    // ワーク変数リセット
    const w = testDataRef.current;
    w.timeLeft = testMeta.timeLimit;
    w.elapsedTime = 0;
    w.frameCount = 0;

    if (testMeta.id === 'RAPID_FIRE') {
      w.rapidShotsCount = 0;
      w.rapidDamage = 0;
      w.rapidMaxHp = 800;
      w.rapidTargetHp = 800;
      w.rapidPhase = 1;
      w.rapidClickShots = 0;
    } else if (testMeta.id === 'CHICKEN_RACE') {
      w.wallY = -120;
      w.wallSpeed = 6.2;
      w.isBraked = false;
      w.stoppedDistance = -1;
      w.isCrashed = false;
      w.targetLineY = V_HEIGHT - 210;
      playerRef.current.y = V_HEIGHT - 180;
    } else if (testMeta.id === 'REACTION') {
      w.reactionRound = 0;
      w.reactionTimes = [];
      w.reactionTarget = null;
      w.reactionNextSpawnTime = 30; // 0.5秒後に出現
    } else if (testMeta.id === 'BULLET_HELL') {
      w.bulletHellSurvivalTime = 0;
      w.grazeCount = 0;
      w.bulletPatternTimer = 0;
      w.bulletPatternPhase = 0;
      w.hitsTaken = 0;
    } else if (testMeta.id === 'JUDGEMENT') {
      w.judgementEnemies = [];
      w.judgementEnemyKills = 0;
      w.judgementFriendMistakes = 0;
      w.judgementTotalTargets = 0;
    } else if (testMeta.id === 'BOSS_DUEL') {
      w.boss = {
        x: V_WIDTH / 2,
        y: 180,
        hp: 1200,
        maxHp: 1200,
        vx: 3,
        shield: 100,
        phase: 1,
        timer: 0,
        defeatedTime: 0,
      };
    }

    sound.playCertStart();
  }, []);

  // 総合検定スタート
  const startExam = () => {
    setIsExamMode(true);
    examResultsRef.current = [];
    setLatestResult(null);
    setFinalEval(null);
    startTest(0);
    sound.startShootingCertBgm();
  };

  // 個別特訓スタート
  const startPractice = (idx: number) => {
    setIsExamMode(false);
    examResultsRef.current = [];
    setLatestResult(null);
    startTest(idx);
    sound.startShootingCertBgm();
  };

  // ==========================================
  // 種目終了＆評価判定
  // ==========================================
  const finishCurrentTest = useCallback(() => {
    if (testFinishedRef.current) return;
    testFinishedRef.current = true;

    const testMeta = TESTS[currentTestIndex];
    const w = testDataRef.current;
    let score = 0;
    let metricLabel = '';
    let metricValue = '';
    let comment = '';
    let rank: TestResultData['rank'] = 'C';

    if (testMeta.id === 'RAPID_FIRE') {
      // 秒間連射数
      const duration = testMeta.timeLimit;
      const rps = (w.rapidShotsCount / duration);
      metricLabel = '秒間連射速度';
      metricValue = `${rps.toFixed(1)} shots/s (${w.rapidShotsCount}発)`;

      if (rps >= 11.0) {
        score = 1000;
        rank = 'SSS';
        comment = '神速の指先！伝説の16連射を超越した神業！';
      } else if (rps >= 9.5) {
        score = 920;
        rank = 'SS';
        comment = '圧巻の超高速連射！メカを粉々に粉砕！';
      } else if (rps >= 8.0) {
        score = 820;
        rank = 'S';
        comment = '素晴らしいハイパフォーマー！一流シューターの証！';
      } else if (rps >= 6.5) {
        score = 680;
        rank = 'A';
        comment = '安定した連射力！戦力として十分な腕前だ！';
      } else if (rps >= 5.0) {
        score = 520;
        rank = 'B';
        comment = 'まずまずの速度。手首のスナップを鍛えよう！';
      } else if (rps >= 3.5) {
        score = 380;
        rank = 'C';
        comment = '連射がやや重い。指先の筋トレが必要だ！';
      } else {
        score = 200;
        rank = 'D';
        comment = '連射不足！指が痙攣しているのか！？';
      }
    } else if (testMeta.id === 'CHICKEN_RACE') {
      metricLabel = '停止寸止め距離';
      if (w.isCrashed || w.stoppedDistance < 0) {
        score = 0;
        rank = 'E';
        metricValue = '激突クラッシュ (0px)';
        comment = '無謀すぎる大激突！命が何個あっても足りんぞ！';
        sound.playCertFail();
      } else {
        metricValue = `${Math.round(w.stoppedDistance)} px`;
        const dist = w.stoppedDistance;
        if (dist <= 12) {
          score = 1000;
          rank = 'SSS';
          comment = '奇跡のミリ単位寸止め！鋼の心臓を持つ神業！';
        } else if (dist <= 25) {
          score = 920;
          rank = 'SS';
          comment = '凄まじい度胸！壁の風圧を肌で感じるギリギリ！';
        } else if (dist <= 45) {
          score = 800;
          rank = 'S';
          comment = '見事なブレーキング！熟練の度胸が光る！';
        } else if (dist <= 80) {
          score = 650;
          rank = 'A';
          comment = '手堅い寸止め。生存重視の的確な判断！';
        } else if (dist <= 130) {
          score = 480;
          rank = 'B';
          comment = '少し安全マージンを取りすぎたか！？';
        } else if (dist <= 200) {
          score = 300;
          rank = 'C';
          comment = 'ビビりすぎだ！チキン野郎と呼ばれてしまうぞ！';
        } else {
          score = 150;
          rank = 'D';
          comment = '遥か手前で停止！度胸を鍛え直してこい！';
        }
      }
    } else if (testMeta.id === 'REACTION') {
      metricLabel = '平均反応撃墜時間';
      const validTimes = w.reactionTimes.filter((t) => t > 0);
      const avgMs = validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 9999;
      metricValue = validTimes.length > 0 ? `${Math.round(avgMs)} ms (命中 ${validTimes.length}/5)` : '全弾空振り';

      if (validTimes.length === 5 && avgMs <= 280) {
        score = 1000;
        rank = 'SSS';
        comment = 'ニュータイプ覚醒！出現と同時に消滅させる神速！';
      } else if (validTimes.length >= 4 && avgMs <= 350) {
        score = 900;
        rank = 'SS';
        comment = '電光石火の早撃ち！超人的な動体視力！';
      } else if (validTimes.length >= 4 && avgMs <= 430) {
        score = 800;
        rank = 'S';
        comment = '文句なしのハイレスポンス！素晴らしい反射神経！';
      } else if (validTimes.length >= 3 && avgMs <= 550) {
        score = 650;
        rank = 'A';
        comment = '良好な反射速度！ターゲットを逃さず迎撃成功！';
      } else if (validTimes.length >= 2 && avgMs <= 700) {
        score = 480;
        rank = 'B';
        comment = '平均的な反応。もう少し軸合わせを速く！';
      } else {
        score = 250;
        rank = 'C';
        comment = '反応がワンテンポ遅い！ターゲットを見失うな！';
      }
    } else if (testMeta.id === 'BULLET_HELL') {
      metricLabel = 'グレイズ & 被弾数';
      const survives = w.timeLeft <= 0.1;
      metricValue = `Graze: ${w.grazeCount}回 / 被弾: ${w.hitsTaken}回`;

      const grazeBonus = Math.min(500, w.grazeCount * 12);
      const hitPenalty = w.hitsTaken * 120;
      let rawScore = (survives ? 550 : 250) + grazeBonus - hitPenalty;
      score = Math.max(100, Math.min(1000, rawScore));

      if (w.hitsTaken === 0 && w.grazeCount >= 35) {
        rank = 'SSS';
        comment = '弾幕の間を舞う蝶！完璧なノーヒット＆大量グレイズ！';
      } else if (w.hitsTaken === 0 && w.grazeCount >= 20) {
        rank = 'SS';
        comment = 'ノーミス制覇！極小の当たり判定を完全把握している！';
      } else if (w.hitsTaken <= 1 && w.grazeCount >= 15) {
        rank = 'S';
        comment = '見事な弾幕回避！かすり技も冴え渡っている！';
      } else if (w.hitsTaken <= 2) {
        rank = 'A';
        comment = 'しぶとく生き残った！弾幕シューターの素質あり！';
      } else if (w.hitsTaken <= 4) {
        rank = 'B';
        comment = '被弾が目立ったが根性で耐え抜いた！';
      } else {
        rank = 'C';
        comment = '弾幕に飲まれてしまった！周囲を広く見渡そう！';
      }
    } else if (testMeta.id === 'JUDGEMENT') {
      metricLabel = '敵撃墜 & 誤射回数';
      metricValue = `撃破: ${w.judgementEnemyKills}機 / 誤射: ${w.judgementFriendMistakes}回`;

      const killPoints = w.judgementEnemyKills * 65;
      const penalty = w.judgementFriendMistakes * 180;
      let rawScore = killPoints - penalty;
      score = Math.max(100, Math.min(1000, rawScore));

      if (w.judgementFriendMistakes === 0 && w.judgementEnemyKills >= 14) {
        rank = 'SSS';
        comment = '完璧な選別射撃！1機の友軍も傷つけず敵を殲滅！';
      } else if (w.judgementFriendMistakes === 0 && w.judgementEnemyKills >= 10) {
        rank = 'SS';
        comment = '誤射ゼロの冷静沈着なエイム！真のエースパイロット！';
      } else if (w.judgementFriendMistakes <= 1 && w.judgementEnemyKills >= 10) {
        rank = 'S';
        comment = '高い殲滅力！わずかな誤射はあったが上出来！';
      } else if (w.judgementFriendMistakes <= 1 && w.judgementEnemyKills >= 7) {
        rank = 'A';
        comment = '敵味方の識別は良好。焦らず狙い撃て！';
      } else if (w.judgementFriendMistakes <= 2) {
        rank = 'B';
        comment = '味方を誤射してしまった！トリガーハッピーに注意！';
      } else {
        rank = 'C';
        comment = '味方機を撃ちすぎだ！軍法会議ものの大惨事だぞ！';
      }
    } else if (testMeta.id === 'BOSS_DUEL') {
      metricLabel = 'ボス撃破タイム';
      const isDefeated = (w.boss?.hp ?? 1) <= 0;
      const timeTaken = isDefeated ? w.boss?.defeatedTime || 15 : testMeta.timeLimit;
      metricValue = isDefeated ? `${timeTaken.toFixed(1)} 秒 (撃破成功)` : `タイムアップ (残HP ${Math.round(w.boss?.hp || 0)})`;

      if (isDefeated && timeTaken <= 10.0) {
        score = 1000;
        rank = 'SSS';
        comment = '瞬殺の電撃戦！巨大ボスコアを秒速で消滅させた！';
      } else if (isDefeated && timeTaken <= 14.0) {
        score = 920;
        rank = 'SS';
        comment = '猛烈な集中砲火！ボスの攻撃を許さぬ圧倒劇！';
      } else if (isDefeated && timeTaken <= 18.0) {
        score = 820;
        rank = 'S';
        comment = '見事なボス撃破！弱点を的確に捉え続けた！';
      } else if (isDefeated) {
        score = 700;
        rank = 'A';
        comment = '制限時間内での討伐成功！手強い敵によく勝った！';
      } else {
        const hpPercent = Math.max(0, 1 - (w.boss?.hp || 0) / (w.boss?.maxHp || 1));
        score = Math.floor(hpPercent * 550);
        rank = score > 400 ? 'B' : 'C';
        comment = '惜しくもタイムアップ！火力をさらに叩き込め！';
      }
    }

    const res: TestResultData = {
      testId: testMeta.id,
      score,
      metricLabel,
      metricValue,
      rank,
      comment,
    };

    setLatestResult(res);
    examResultsRef.current.push(res);
    setGameState('STAGE_RESULT');
    stateTimerRef.current = 140; // 約2.3秒結果表示
    sound.playCertSuccess();
  }, [currentTestIndex]);

  // ==========================================
  // 総合結果の算出
  // ==========================================
  const calculateFinalEvaluation = useCallback(() => {
    const results = examResultsRef.current;
    if (results.length === 0) return;

    let totalScore = 0;
    const scoresMap: Record<TestType, number> = {
      RAPID_FIRE: 500,
      CHICKEN_RACE: 500,
      REACTION: 500,
      BULLET_HELL: 500,
      JUDGEMENT: 500,
      BOSS_DUEL: 500,
    };

    results.forEach((r) => {
      totalScore += r.score;
      scoresMap[r.testId] = r.score;
    });

    // 総合スコア（最大6000点満点）
    // シューター年齢計算 (18歳〜80歳)
    // 6000点 -> 18歳, 4500点 -> 28歳, 3000点 -> 45歳, 1500点 -> 65歳
    const scoreRatio = totalScore / 6000;
    let shooterAge = Math.round(75 - scoreRatio * 56);
    if (scoreRatio >= 0.95) shooterAge = 18;
    else if (scoreRatio >= 0.88) shooterAge = 21;
    else if (scoreRatio >= 0.80) shooterAge = 25;
    else if (scoreRatio >= 0.70) shooterAge = 30;
    else if (scoreRatio >= 0.58) shooterAge = 38;
    else if (scoreRatio >= 0.45) shooterAge = 48;
    else if (scoreRatio >= 0.32) shooterAge = 58;
    else shooterAge = Math.min(82, 65 + Math.round((1 - scoreRatio) * 17));

    // 総合ランク
    let overallRank: FinalEvaluation['overallRank'] = 'C';
    let titleName = '見習いシューター';

    if (totalScore >= 5600) {
      overallRank = 'SSS';
      titleName = '神域の伝説シューター';
    } else if (totalScore >= 5100) {
      overallRank = 'SS';
      titleName = '銀河最強の撃墜王';
    } else if (totalScore >= 4500) {
      overallRank = 'S';
      titleName = '超一流エースパイロット';
    } else if (totalScore >= 3800) {
      overallRank = 'A';
      titleName = '熟練の一等戦士';
    } else if (totalScore >= 3000) {
      overallRank = 'B';
      titleName = '一人前パイロット';
    } else if (totalScore >= 2200) {
      overallRank = 'C';
      titleName = '訓練生（ブランクあり）';
    } else if (totalScore >= 1400) {
      overallRank = 'D';
      titleName = '民間一般市民';
    } else {
      overallRank = 'E';
      titleName = '動体視力化石級';
    }

    // 教官の総評コメント生成
    let instructorComment = '';
    if (overallRank === 'SSS' || overallRank === 'SS') {
      instructorComment =
        '「恐るべき才能だ！連射、反射、度胸、回避、すべてにおいて神の領域に達している。貴様のようなシューターに出会えたことを誇りに思うぞ！」';
    } else if (overallRank === 'S') {
      instructorComment =
        '「素晴らしい成績だ！並み居る強豪の中でも頭一つ抜けている。寸止めや弾幕潜りの感覚も研ぎ澄まされている。さらなる頂を目指せ！」';
    } else if (overallRank === 'A') {
      instructorComment =
        '「実に手堅く優秀な実力だ！前線で即戦力として大活躍できる腕前を持っている。弱点種目を特訓すればSS級も夢ではないぞ！」';
    } else if (overallRank === 'B') {
      instructorComment =
        '「基本的なセンスはある！だが極限状態での判断力や連射速度にまだ伸び代がある。個別特訓モードで弱点を克服せよ！」';
    } else {
      instructorComment =
        '「まだまだ修行が足りん！焦って味方を撃ったり、壁に激突していては命がいくつあっても足りんぞ！まずは連射と寸止めの特訓からだ！」';
    }

    // レーダーチャートスコア (0〜100)
    const radarScores = {
      rapid: Math.round(scoresMap.RAPID_FIRE / 10),
      reaction: Math.round(scoresMap.REACTION / 10),
      guts: Math.round(scoresMap.CHICKEN_RACE / 10),
      evasion: Math.round(scoresMap.BULLET_HELL / 10),
      judgement: Math.round(scoresMap.JUDGEMENT / 10),
    };

    const evalResult: FinalEvaluation = {
      totalScore,
      shooterAge,
      overallRank,
      titleName,
      instructorComment,
      radarScores,
    };

    setFinalEval(evalResult);

    // ハイスコア・ベスト年齢保存
    if (totalScore > highScore) {
      setHighScore(totalScore);
      localStorage.setItem(SHOOTING_CERT_HIGH_SCORE_KEY, totalScore.toString());
    }
    if (bestAge === 0 || shooterAge < bestAge) {
      setBestAge(shooterAge);
      localStorage.setItem(SHOOTING_CERT_BEST_AGE_KEY, shooterAge.toString());
    }
    setBestRank(overallRank);
    localStorage.setItem(SHOOTING_CERT_BEST_RANK_KEY, overallRank);

    // ドラムロール演出後、大ファンファーレ
    setGameState('FINAL_EVAL_ANIM');
    sound.playCertDrumRoll();
    setTimeout(() => {
      setGameState('FINAL_RESULT');
      sound.playCertGrandFanfare();
    }, 1600);
  }, [highScore, bestAge]);

  // ==========================================
  // ゲームループ（更新 & 描画）
  // ==========================================
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      animStepRef.current++;
      const curState = gameState;

      // 1. 星空背景更新
      starsRef.current.forEach((st) => {
        st.y += st.speed;
        if (st.y > V_HEIGHT) {
          st.y = 0;
          st.x = Math.random() * V_WIDTH;
        }
      });

      // 2. 状態遷移タイマー処理
      if (curState === 'STAGE_INTRO') {
        stateTimerRef.current--;
        if (stateTimerRef.current <= 0) {
          setGameState('PLAYING');
        }
      } else if (curState === 'STAGE_RESULT') {
        stateTimerRef.current--;
        if (stateTimerRef.current <= 0) {
          if (isExamMode) {
            if (currentTestIndex + 1 < TESTS.length) {
              startTest(currentTestIndex + 1);
            } else {
              calculateFinalEvaluation();
            }
          } else {
            // 特訓モードなら特訓選択へ
            setGameState('PRACTICE_SELECT');
          }
        }
      }

      // 3. プレイ中のメインロジック更新
      if (curState === 'PLAYING') {
        const testMeta = TESTS[currentTestIndex];
        const w = testDataRef.current;
        const p = playerRef.current;
        const keys = keysRef.current;
        w.frameCount++;

        // 残り時間カウントダウン
        w.timeLeft = Math.max(0, w.timeLeft - 1 / 60);
        w.elapsedTime += 1 / 60;

        // プレイヤー移動（キーボード & タッチ追従）
        let moveX = 0;
        let moveY = 0;
        if (keys.left) moveX -= 1;
        if (keys.right) moveX += 1;
        if (keys.up) moveY -= 1;
        if (keys.down) moveY += 1;

        if (touchPosRef.current.active) {
          const dx = touchPosRef.current.x - p.x;
          const dy = touchPosRef.current.y - p.y;
          if (Math.hypot(dx, dy) > 8) {
            moveX = Math.sign(dx) * Math.min(1, Math.abs(dx) / 30);
            moveY = Math.sign(dy) * Math.min(1, Math.abs(dy) / 30);
          }
        }

        p.vx = moveX * p.speed;
        p.vy = moveY * p.speed;

        // 寸止め検定中のみ、Y軸移動を制限（ブレーキのみ）
        if (testMeta.id === 'CHICKEN_RACE') {
          p.vx = 0; // 横移動なし
          p.vy = 0;
        } else {
          p.x = Math.max(25, Math.min(V_WIDTH - 25, p.x + p.vx));
          p.y = Math.max(80, Math.min(V_HEIGHT - 60, p.y + p.vy));
        }

        // ショット発射
        const canShoot = testMeta.id !== 'CHICKEN_RACE';
        if (canShoot && (keys.shot || touchPosRef.current.active)) {
          if (w.frameCount - p.lastShotTime >= 5) {
            // 連射クールダウン
            p.lastShotTime = w.frameCount;
            w.rapidShotsCount++;
            sound.playCertShot();

            // 弾の生成
            playerBulletsRef.current.push({
              x: p.x - 8,
              y: p.y - 18,
              vx: 0,
              vy: -18,
              radius: 4,
              color: '#38bdf8',
              isEnemy: false,
            });
            playerBulletsRef.current.push({
              x: p.x + 8,
              y: p.y - 18,
              vx: 0,
              vy: -18,
              radius: 4,
              color: '#38bdf8',
              isEnemy: false,
            });
          }
        }

        // ----------------------------------------
        // 各種目ごとの固有ロジック
        // ----------------------------------------
        if (testMeta.id === 'RAPID_FIRE') {
          // ターゲットに弾が当たるとHP減少＆パーティクル
          const targetY = 220;
          const targetW = 180;
          const targetH = 90;

          playerBulletsRef.current.forEach((b) => {
            if (
              b.y <= targetY + targetH &&
              b.y >= targetY &&
              b.x >= V_WIDTH / 2 - targetW / 2 &&
              b.x <= V_WIDTH / 2 + targetW / 2
            ) {
              b.y = -999;
              w.rapidTargetHp -= 12;
              w.rapidDamage += 12;
              sound.playCertHit();
              addFloatText(b.x + (Math.random() * 20 - 10), b.y - 10, '+12', '#facc15', 14);

              // ターゲット破壊でフェーズアップ
              if (w.rapidTargetHp <= 0) {
                w.rapidPhase++;
                w.rapidMaxHp = 1000 + w.rapidPhase * 400;
                w.rapidTargetHp = w.rapidMaxHp;
                addExplosion(V_WIDTH / 2, targetY + targetH / 2, 28, '#ef4444', true);
                addFloatText(V_WIDTH / 2, targetY, `PHASE ${w.rapidPhase} BREAK!`, '#f43f5e', 26);
              }
            }
          });

          if (w.timeLeft <= 0) {
            finishCurrentTest();
          }
        } else if (testMeta.id === 'CHICKEN_RACE') {
          // スパイク電磁壁が上から落下
          if (!w.isBraked && !w.isCrashed) {
            w.wallY += w.wallSpeed;
            w.wallSpeed += 0.08; // 加速

            // プレイヤーのブレーキ検知（下キー、Xキー、ブレーキキー、またはタッチ終了）
            const brakeTriggered = keys.brake || keys.down || keys.shot;
            if (brakeTriggered && w.wallY > 50) {
              w.isBraked = true;
              sound.playCertBrake();
              const dist = p.y - (w.wallY + 80);
              w.stoppedDistance = Math.max(0, dist);

              if (dist <= 0) {
                // クラッシュ
                w.isCrashed = true;
                w.stoppedDistance = 0;
                addExplosion(p.x, p.y, 40, '#ef4444', true);
                addFloatText(p.x, p.y - 40, 'CRASH! 激突！', '#ef4444', 32);
                setTimeout(finishCurrentTest, 800);
              } else {
                // 寸止め成功
                addFloatText(
                  p.x,
                  p.y - 60,
                  `${Math.round(w.stoppedDistance)} px 寸止め！`,
                  w.stoppedDistance < 30 ? '#10b981' : '#f59e0b',
                  28
                );
                setTimeout(finishCurrentTest, 1000);
              }
            }

            // 壁がプレイヤーを直撃
            if (w.wallY + 80 >= p.y - 10 && !w.isBraked) {
              w.isCrashed = true;
              w.stoppedDistance = 0;
              addExplosion(p.x, p.y, 40, '#ef4444', true);
              addFloatText(p.x, p.y - 40, 'CRASH! 激突！', '#ef4444', 32);
              setTimeout(finishCurrentTest, 800);
            }
          }
        } else if (testMeta.id === 'REACTION') {
          // ターゲット生成 & 撃墜
          if (!w.reactionTarget && w.reactionRound < w.totalReactionRounds) {
            w.reactionNextSpawnTime--;
            if (w.reactionNextSpawnTime <= 0) {
              w.reactionRound++;
              const rx = 100 + Math.random() * (V_WIDTH - 200);
              const ry = 150 + Math.random() * 200;
              w.reactionTarget = {
                x: rx,
                y: ry,
                spawnTime: performance.now(),
                active: true,
                radius: 28,
                vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
              };
              sound.playCertWarning();
              addFloatText(rx, ry - 30, 'TARGET !!', '#ef4444', 22);
            }
          }

          // ターゲット移動＆被弾判定
          if (w.reactionTarget && w.reactionTarget.active) {
            const rt = w.reactionTarget;
            rt.x += rt.vx;
            if (rt.x < 80 || rt.x > V_WIDTH - 80) rt.vx *= -1;

            // 弾との衝突判定
            playerBulletsRef.current.forEach((b) => {
              if (Math.hypot(b.x - rt.x, b.y - rt.y) < rt.radius + b.radius) {
                b.y = -999;
                rt.active = false;
                const elapsedMs = performance.now() - rt.spawnTime;
                w.reactionTimes.push(elapsedMs);
                addExplosion(rt.x, rt.y, 22, '#38bdf8', false);
                addFloatText(rt.x, rt.y, `${Math.round(elapsedMs)} ms!`, '#38bdf8', 24);

                // 次のターゲット準備
                w.reactionTarget = null;
                w.reactionNextSpawnTime = 35; // 0.6秒後
                if (w.reactionRound >= w.totalReactionRounds) {
                  setTimeout(finishCurrentTest, 900);
                }
              }
            });
          }

          if (w.timeLeft <= 0) {
            finishCurrentTest();
          }
        } else if (testMeta.id === 'BULLET_HELL') {
          // 弾幕パターン展開
          w.bulletPatternTimer++;
          const t = w.bulletPatternTimer;

          // 放射リング弾
          if (t % 40 === 0) {
            const ringCount = 14;
            const originX = V_WIDTH / 2 + Math.sin(t * 0.05) * 180;
            const originY = 160;
            for (let i = 0; i < ringCount; i++) {
              const angle = (Math.PI * 2 / ringCount) * i + t * 0.02;
              const spd = 3.6;
              enemyBulletsRef.current.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: 6,
                color: '#ec4899',
                isEnemy: true,
              });
            }
          }

          // 狙い撃ちスナイパー弾
          if (t % 25 === 0) {
            const angleToPlayer = Math.atan2(p.y - 120, p.x - V_WIDTH / 2);
            for (let d = -1; d <= 1; d++) {
              const ang = angleToPlayer + d * 0.15;
              enemyBulletsRef.current.push({
                x: V_WIDTH / 2,
                y: 120,
                vx: Math.cos(ang) * 5.2,
                vy: Math.sin(ang) * 5.2,
                radius: 5,
                color: '#38bdf8',
                isEnemy: true,
              });
            }
          }

          // グレイズ（かすり）判定＆被弾判定
          enemyBulletsRef.current.forEach((eb) => {
            const dist = Math.hypot(eb.x - p.x, eb.y - p.y);

            // 被弾
            if (dist < eb.radius + p.hitRadius) {
              eb.y = 9999;
              w.hitsTaken++;
              sound.playCertFail();
              addExplosion(p.x, p.y, 16, '#ef4444', false);
              addFloatText(p.x, p.y - 20, 'HIT 被弾!', '#ef4444', 20);
            }
            // かすり (Graze)
            else if (dist < eb.radius + p.grazeRadius && !eb.grazed) {
              eb.grazed = true;
              w.grazeCount++;
              sound.playCertGraze();
              addFloatText(p.x + (Math.random() * 30 - 15), p.y - 30, 'GRAZE!', '#a855f7', 14);
            }
          });

          if (w.timeLeft <= 0) {
            finishCurrentTest();
          }
        } else if (testMeta.id === 'JUDGEMENT') {
          // 敵味方ターゲットの定期スポーン
          if (w.frameCount % 45 === 0 && w.judgementEnemies.length < 7) {
            const isFriend = Math.random() < 0.38; // 38%で友軍
            w.judgementTotalTargets++;
            const startX = 60 + Math.random() * (V_WIDTH - 120);
            w.judgementEnemies.push({
              id: Date.now() + Math.random(),
              x: startX,
              y: -40,
              vx: (Math.random() - 0.5) * 2,
              vy: 2.2 + Math.random() * 2,
              isFriend,
              hp: 1,
              radius: isFriend ? 26 : 22,
              type: Math.floor(Math.random() * 2),
            });
          }

          // 移動 & 被弾判定
          w.judgementEnemies.forEach((en) => {
            en.x += en.vx;
            en.y += en.vy;

            playerBulletsRef.current.forEach((b) => {
              if (Math.hypot(b.x - en.x, b.y - en.y) < en.radius + b.radius) {
                b.y = -999;
                en.hp--;
                if (en.isFriend) {
                  // 友軍誤射！
                  w.judgementFriendMistakes++;
                  sound.playCertFail();
                  addExplosion(en.x, en.y, 25, '#10b981', true);
                  addFloatText(en.x, en.y, '友軍誤射!! -300', '#ef4444', 24);
                } else {
                  // 敵撃破！
                  w.judgementEnemyKills++;
                  sound.playCertHit();
                  addExplosion(en.x, en.y, 20, '#f59e0b', false);
                  addFloatText(en.x, en.y, '+100', '#38bdf8', 20);
                }
              }
            });
          });

          // 画面外除去
          w.judgementEnemies = w.judgementEnemies.filter((en) => en.y < V_HEIGHT + 50 && en.hp > 0);

          if (w.timeLeft <= 0) {
            finishCurrentTest();
          }
        } else if (testMeta.id === 'BOSS_DUEL') {
          // ボス挙動
          const boss = w.boss;
          if (boss && boss.hp > 0) {
            boss.timer++;
            boss.x += boss.vx;
            if (boss.x < 160 || boss.x > V_WIDTH - 160) boss.vx *= -1;

            // ボス弾幕発射
            if (boss.timer % 30 === 0) {
              const ang = Math.atan2(p.y - boss.y, p.x - boss.x);
              for (let i = -1; i <= 1; i++) {
                enemyBulletsRef.current.push({
                  x: boss.x + i * 30,
                  y: boss.y + 40,
                  vx: Math.cos(ang + i * 0.2) * 4.5,
                  vy: Math.sin(ang + i * 0.2) * 4.5,
                  radius: 6,
                  color: '#f43f5e',
                  isEnemy: true,
                });
              }
            }

            // 弾ヒット判定
            playerBulletsRef.current.forEach((b) => {
              if (
                b.x >= boss.x - 70 &&
                b.x <= boss.x + 70 &&
                b.y >= boss.y - 40 &&
                b.y <= boss.y + 40
              ) {
                b.y = -999;
                boss.hp -= 16;
                sound.playCertHit();
                addFloatText(b.x, b.y - 10, '16', '#f59e0b', 14);

                if (boss.hp <= 0) {
                  boss.hp = 0;
                  boss.defeatedTime = w.elapsedTime;
                  addExplosion(boss.x, boss.y, 60, '#f43f5e', true);
                  addFloatText(boss.x, boss.y, 'BOSS DESTROYED!', '#f43f5e', 36);
                  setTimeout(finishCurrentTest, 1200);
                }
              }
            });
          }

          if (w.timeLeft <= 0) {
            finishCurrentTest();
          }
        }

        // 弾の更新
        playerBulletsRef.current.forEach((b) => {
          b.x += b.vx;
          b.y += b.vy;
        });
        playerBulletsRef.current = playerBulletsRef.current.filter((b) => b.y > -20 && b.y < V_HEIGHT + 20);

        enemyBulletsRef.current.forEach((eb) => {
          eb.x += eb.vx;
          eb.y += eb.vy;
        });
        enemyBulletsRef.current = enemyBulletsRef.current.filter((b) => b.y > -20 && b.y < V_HEIGHT + 20 && b.x > -20 && b.x < V_WIDTH + 20);
      }

      // パーティクル更新
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
      });
      particlesRef.current = particlesRef.current.filter((pt) => pt.life < pt.maxLife);

      // 浮遊テキスト更新
      floatTextsRef.current.forEach((ft) => {
        ft.y += ft.vy;
        ft.life++;
        ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);
      });
      floatTextsRef.current = floatTextsRef.current.filter((ft) => ft.life < ft.maxLife);

      // ==========================================
      // 描画ルーチン
      // ==========================================
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // 背景（ディープサイバーグラデーション）
      const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
      bgGrad.addColorStop(0, '#050814');
      bgGrad.addColorStop(0.6, '#0b1120');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // サイバーグリッド線（奥へ流れる感覚）
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      const gridOffset = (animStepRef.current * 1.5) % 40;
      for (let y = gridOffset; y < V_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }
      for (let x = 0; x < V_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, V_HEIGHT);
        ctx.stroke();
      }

      // 星空描画
      starsRef.current.forEach((st) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });

      // ----------------------------------------
      // ゲームプレイ中のエンティティ描画
      // ----------------------------------------
      if (curState === 'PLAYING' || curState === 'STAGE_INTRO' || curState === 'STAGE_RESULT') {
        const testMeta = TESTS[currentTestIndex];
        const w = testDataRef.current;
        const p = playerRef.current;

        // 種目1: 連射検定ターゲット描画
        if (testMeta.id === 'RAPID_FIRE') {
          const targetY = 220;
          const targetW = 200;
          const targetH = 90;
          const tx = V_WIDTH / 2 - targetW / 2;

          // 巨大メカボディー
          ctx.save();
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.fillRect(tx, targetY, targetW, targetH);
          ctx.strokeRect(tx, targetY, targetW, targetH);

          // HPバー
          const hpRatio = Math.max(0, w.rapidTargetHp / w.rapidMaxHp);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(tx + 10, targetY + targetH - 18, (targetW - 20) * hpRatio, 10);

          // ラベル
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`TARGET HP [${Math.max(0, Math.round(w.rapidTargetHp))}]`, V_WIDTH / 2, targetY + 36);
          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = '#f87171';
          ctx.fillText(`PHASE ${w.rapidPhase} / RAPID SHOTS: ${w.rapidShotsCount}`, V_WIDTH / 2, targetY + 58);

          // リアルタイム秒間連射スピードメーター (右サイド)
          const currentRps = w.elapsedTime > 0.3 ? w.rapidShotsCount / w.elapsedTime : 0;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(V_WIDTH - 150, 100, 130, 80);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(V_WIDTH - 150, 100, 130, 80);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('REALTIME SPEED', V_WIDTH - 85, 120);
          ctx.fillStyle = currentRps >= 10 ? '#facc15' : '#38bdf8';
          ctx.font = 'bold 24px monospace';
          ctx.fillText(`${currentRps.toFixed(1)}`, V_WIDTH - 85, 150);
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText('shots/sec', V_WIDTH - 85, 168);
          ctx.restore();
        }

        // 種目2: 寸止め検定の電磁壁描画
        if (testMeta.id === 'CHICKEN_RACE') {
          ctx.save();
          const wy = w.wallY;

          // スパイク電磁壁
          const wallGrad = ctx.createLinearGradient(0, wy, 0, wy + 80);
          wallGrad.addColorStop(0, '#7f1d1d');
          wallGrad.addColorStop(0.7, '#ef4444');
          wallGrad.addColorStop(1, '#fef08a');
          ctx.fillStyle = wallGrad;
          ctx.fillRect(0, wy, V_WIDTH, 80);

          // 危険なトゲトゲ
          ctx.fillStyle = '#fef08a';
          for (let sx = 0; sx < V_WIDTH; sx += 30) {
            ctx.beginPath();
            ctx.moveTo(sx, wy + 80);
            ctx.lineTo(sx + 15, wy + 100);
            ctx.lineTo(sx + 30, wy + 80);
            ctx.fill();
          }

          // 警告電磁パルス
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, wy + 80);
          ctx.lineTo(V_WIDTH, wy + 80);
          ctx.stroke();

          // リアルタイム残り距離ライン＆HUD
          const currentDist = Math.max(0, Math.round(p.y - 20 - (wy + 80)));

          // 壁先端から自機先端へのレーザー照準線
          ctx.strokeStyle = currentDist < 50 ? '#ef4444' : '#f59e0b';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x, wy + 80);
          ctx.lineTo(p.x, p.y - 20);
          ctx.stroke();
          ctx.setLineDash([]);

          // 距離メーターHUD表示
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(V_WIDTH / 2 - 120, p.y - 100, 240, 52);
          ctx.strokeStyle = currentDist < 40 ? '#ef4444' : '#f59e0b';
          ctx.strokeRect(V_WIDTH / 2 - 120, p.y - 100, 240, 52);

          ctx.font = 'bold 12px monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('DISTANCE TO IMPACT', V_WIDTH / 2, p.y - 82);

          ctx.font = '900 24px monospace';
          ctx.fillStyle = currentDist < 30 ? '#10b981' : currentDist < 80 ? '#facc15' : '#ef4444';
          ctx.fillText(`${currentDist} px`, V_WIDTH / 2, p.y - 58);

          // ブレーキ案内
          if (!w.isBraked && !w.isCrashed) {
            const blink = Math.floor(animStepRef.current / 10) % 2 === 0;
            if (blink) {
              ctx.font = 'bold 14px monospace';
              ctx.fillStyle = '#facc15';
              ctx.fillText('▶ BRAKE [X / K / ↓] ◀', V_WIDTH / 2, p.y + 45);
            }
          } else if (w.isBraked) {
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#10b981';
            ctx.fillText(`BRAKED! 停止完了: ${Math.round(w.stoppedDistance)} px`, V_WIDTH / 2, p.y + 45);
          }

          // プレイヤー位置の目標停止ライン
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.setLineDash([8, 8]);
          ctx.strokeRect(0, p.y + 10, V_WIDTH, 1);
          ctx.setLineDash([]);
          ctx.restore();
        }

        // 種目3: 反射迎撃ターゲット描画
        if (testMeta.id === 'REACTION' && w.reactionTarget && w.reactionTarget.active) {
          const rt = w.reactionTarget;
          ctx.save();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 25;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(rt.x, rt.y, rt.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();

          // 照準サークル
          ctx.strokeStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(rt.x, rt.y, rt.radius + 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillText('!', rt.x, rt.y + 6);
          ctx.restore();
        }

        // 種目5: 識別敵味方描画
        if (testMeta.id === 'JUDGEMENT') {
          w.judgementEnemies.forEach((en) => {
            ctx.save();
            if (en.isFriend) {
              // 友軍機（緑・青の救護シップ）
              ctx.shadowColor = '#10b981';
              ctx.shadowBlur = 15;
              ctx.fillStyle = '#059669';
              ctx.beginPath();
              ctx.arc(en.x, en.y, en.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('✚', en.x, en.y + 5);
              ctx.font = 'bold 10px monospace';
              ctx.fillText('FRIEND', en.x, en.y + 20);
            } else {
              // 敵戦闘機（赤・紫のサイバー戦闘機）
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 15;
              ctx.fillStyle = '#dc2626';
              ctx.beginPath();
              ctx.moveTo(en.x, en.y + en.radius);
              ctx.lineTo(en.x - en.radius, en.y - en.radius);
              ctx.lineTo(en.x + en.radius, en.y - en.radius);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#fca5a5';
              ctx.stroke();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('ENEMY', en.x, en.y - 12);
            }
            ctx.restore();
          });
        }

        // 種目6: ボス描画
        if (testMeta.id === 'BOSS_DUEL' && w.boss && w.boss.hp > 0) {
          const boss = w.boss;
          ctx.save();
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 30;

          // 巨大母艦ボディ
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(boss.x - 90, boss.y - 40);
          ctx.lineTo(boss.x + 90, boss.y - 40);
          ctx.lineTo(boss.x + 60, boss.y + 35);
          ctx.lineTo(boss.x - 60, boss.y + 35);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 弱点コア
          const coreGlow = (Math.sin(animStepRef.current * 0.15) + 1) * 0.5;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.7 + coreGlow * 0.3})`;
          ctx.beginPath();
          ctx.arc(boss.x, boss.y + 5, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // HPゲージ
          const hpRatio = boss.hp / boss.maxHp;
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(boss.x - 80, boss.y - 55, 160 * hpRatio, 8);
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(boss.x - 80, boss.y - 55, 160, 8);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`BOSS GIGA-VALKYRIE [${Math.round(boss.hp)}]`, boss.x, boss.y - 62);
          ctx.restore();
        }

        // プレイヤー弾描画
        playerBulletsRef.current.forEach((b) => {
          ctx.save();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x - 3, b.y - 12, 6, 16);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(b.x - 2, b.y - 10, 4, 12);
          ctx.restore();
        });

        // 敵弾描画
        enemyBulletsRef.current.forEach((eb) => {
          ctx.save();
          ctx.shadowColor = eb.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = eb.color;
          ctx.beginPath();
          ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(eb.x, eb.y, eb.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // プレイヤー戦闘機描画
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;

        // アフターバーナー噴射炎
        const flameH = 12 + Math.random() * 8;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y + 18);
        ctx.lineTo(p.x + 6, p.y + 18);
        ctx.lineTo(p.x, p.y + 18 + flameH);
        ctx.closePath();
        ctx.fill();

        // 機体シルエット (鋭角な白＆シアンの戦闘機)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 20); // 機首
        ctx.lineTo(p.x + 16, p.y + 16); // 右翼
        ctx.lineTo(p.x + 6, p.y + 12);
        ctx.lineTo(p.x, p.y + 15);
        ctx.lineTo(p.x - 6, p.y + 12);
        ctx.lineTo(p.x - 16, p.y + 16); // 左翼
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // コックピットキャノピー
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 3, 3.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 極小当たり判定コア (弾幕検定時)
        if (testMeta.id === 'BULLET_HELL') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.hitRadius, 0, Math.PI * 2);
          ctx.fill();

          // かすり判定リング
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.grazeRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();

        // ----------------------------------------
        // HUD（上部ステータスバー）
        // ----------------------------------------
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, V_WIDTH, 65);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeRect(0, 65, V_WIDTH, 1);

        // 種目タイトル
        ctx.fillStyle = testMeta.color;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${testMeta.iconText} 検定 ${testMeta.index}/6 : ${testMeta.title}`, 20, 32);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(testMeta.rule, 22, 52);

        // 制限時間タイマー
        ctx.textAlign = 'right';
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = w.timeLeft <= 3 ? '#ef4444' : '#38bdf8';
        ctx.fillText(`TIME: ${w.timeLeft.toFixed(1)}s`, V_WIDTH - 20, 42);
        ctx.restore();

        // ----------------------------------------
        // ステージイントロ演出
        // ----------------------------------------
        if (curState === 'STAGE_INTRO') {
          ctx.save();
          ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
          ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

          ctx.textAlign = 'center';
          ctx.shadowColor = testMeta.color;
          ctx.shadowBlur = 30;

          ctx.font = 'bold 26px monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`TEST 0${testMeta.index}`, V_WIDTH / 2, V_HEIGHT / 2 - 80);

          ctx.font = '900 52px monospace';
          ctx.fillStyle = testMeta.color;
          ctx.fillText(testMeta.title, V_WIDTH / 2, V_HEIGHT / 2 - 15);

          ctx.font = 'bold 22px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(testMeta.subtitle, V_WIDTH / 2, V_HEIGHT / 2 + 35);

          ctx.font = 'bold 20px monospace';
          ctx.fillStyle = '#facc15';
          ctx.fillText(`READY... GO!`, V_WIDTH / 2, V_HEIGHT / 2 + 95);
          ctx.restore();
        }

        // ----------------------------------------
        // ステージ結果（リザルトスタンプ演出）
        // ----------------------------------------
        if (curState === 'STAGE_RESULT' && latestResult) {
          ctx.save();
          ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
          ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

          ctx.textAlign = 'center';
          ctx.font = 'bold 32px monospace';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText('検 定 結 果', V_WIDTH / 2, V_HEIGHT / 2 - 120);

          ctx.font = 'bold 22px monospace';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`${latestResult.metricLabel}: ${latestResult.metricValue}`, V_WIDTH / 2, V_HEIGHT / 2 - 70);

          // ランクスタンプ (巨大SSS/S/A/B...)
          ctx.font = '900 84px monospace';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 25;
          ctx.fillStyle =
            latestResult.rank === 'SSS' || latestResult.rank === 'SS'
              ? '#facc15'
              : latestResult.rank === 'S'
              ? '#38bdf8'
              : latestResult.rank === 'A'
              ? '#10b981'
              : '#94a3b8';
          ctx.fillText(latestResult.rank, V_WIDTH / 2, V_HEIGHT / 2 + 15);

          ctx.font = 'bold 28px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`SCORE: ${latestResult.score} pts`, V_WIDTH / 2, V_HEIGHT / 2 + 75);

          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(latestResult.comment, V_WIDTH / 2, V_HEIGHT / 2 + 115);
          ctx.restore();
        }
      }

      // パーティクル描画
      particlesRef.current.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size * (1 - pt.life / pt.maxLife)), 0, Math.PI * 2);
        ctx.fill();
      });

      // 浮遊テキスト描画
      floatTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, currentTestIndex, isExamMode, latestResult, calculateFinalEvaluation, finishCurrentTest, startTest]);

  // ==========================================
  // キーボードイベントリスナー
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 画面スクロール防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = true;
      if (e.code === 'KeyZ' || e.code === 'KeyJ' || e.code === 'Space') keysRef.current.shot = true;
      if (e.code === 'KeyX' || e.code === 'KeyK') keysRef.current.brake = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = false;
      if (e.code === 'KeyZ' || e.code === 'KeyJ' || e.code === 'Space') keysRef.current.shot = false;
      if (e.code === 'KeyX' || e.code === 'KeyK') keysRef.current.brake = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // タッチ＆マウスクリックハンドラー
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    touchPosRef.current = { x: px, y: py, active: true };
    keysRef.current.shot = true;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!touchPosRef.current.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    touchPosRef.current.x = (e.clientX - rect.left) * scaleX;
    touchPosRef.current.y = (e.clientY - rect.top) * scaleY;
  };

  const handleCanvasPointerUp = () => {
    touchPosRef.current.active = false;
    keysRef.current.shot = false;
    keysRef.current.brake = false;
  };

  // サウンド切り替え
  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) sound.stopShootingCertBgm();
      else if (gameState === 'PLAYING') sound.startShootingCertBgm();
      return next;
    });
  };

  // レーダーチャート描画コンポーネント (Canvas)
  const renderRadarCanvas = (radarScores: FinalEvaluation['radarScores']) => {
    return (
      <RadarChartComponent scores={radarScores} isDark={isDark} />
    );
  };

  // アンマウント時にBGMを確実に停止
  useEffect(() => {
    return () => {
      sound.stopShootingCertBgm();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center select-none w-full transition-colors ${
        isFullscreen ? 'h-screen w-screen overflow-hidden p-0 m-0' : 'min-h-[85vh] p-2 sm:p-4'
      } ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'}`}
    >
      {/* 画面上部コントロールバー */}
      {!isFullscreen && (
        <div className="w-full max-w-[800px] flex items-center justify-end py-2 px-3 mb-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              BEST AGE: {bestAge > 0 ? `${bestAge}歳` : '--'}
            </span>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              HIGH: {highScore > 0 ? `${highScore} pts` : '--'}
            </span>
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isMuted ? 'ミュート解除' : '消音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* メインCanvasゲームスクリーン */}
      <div
        className={`relative flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none border-none'
            : 'w-full max-w-[760px] aspect-[760/900] max-h-[85vh]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          className="w-full h-full object-contain cursor-crosshair touch-none"
        />

        {/* ---------------------------------------- */}
        {/* タイトル画面オーバーレイ */}
        {/* ---------------------------------------- */}
        {gameState === 'TITLE' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            {/* メインタイトルロゴ */}
            <div className="relative mb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black tracking-widest bg-red-600/30 text-red-400 border border-red-500/40 mb-3 shadow-lg animate-pulse">
                <Flame className="w-3.5 h-3.5" /> ARCADE SKILL EXAMINATION
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-rose-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.5)]">
                シューティング技能検定
              </h1>
              <p className="text-sm sm:text-base font-bold text-slate-400 mt-2 font-mono tracking-wider">
                SHOOTING LOVE &middot; SKILL TEST
              </p>
            </div>

            {/* 現在の公式レコード */}
            <div className="flex items-center justify-center gap-4 mb-8 bg-slate-900/90 px-6 py-3 rounded-2xl border border-slate-800 shadow-inner">
              <div>
                <div className="text-[10px] text-slate-400 font-bold">シューター年齢</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
                  {bestAge > 0 ? `${bestAge} 歳` : '未測定'}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold">公式最高ランク</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                  {bestRank !== '--' ? bestRank : '未判定'}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold">ハイスコア</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {highScore > 0 ? `${highScore} pts` : '0 pts'}
                </div>
              </div>
            </div>

            {/* ボタンメニュー */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startExam}
                className="w-full py-4 px-6 rounded-2xl text-base font-black tracking-wide text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-lg shadow-red-500/30 hover:scale-102 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>総合検定を受験する</span>
              </button>

              <button
                onClick={() => setGameState('PRACTICE_SELECT')}
                className="w-full py-3 px-6 rounded-2xl text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 hover:scale-101 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>個別特訓モード（練習）</span>
              </button>

              <button
                onClick={() => setGameState('HOW_TO_PLAY')}
                className="w-full py-2.5 px-6 rounded-2xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:scale-101 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>検定種目の解説＆操作方法</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------- */}
        {/* 個別特訓モード選択画面 */}
        {/* ---------------------------------------- */}
        {gameState === 'PRACTICE_SELECT' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 z-20 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Crosshair className="w-6 h-6 text-cyan-400" />
                  <span>個別特訓モード</span>
                </h2>
                <p className="text-xs text-slate-400">苦手な検定種目を自由に選択して徹底的に特訓できます</p>
              </div>
              <button
                onClick={() => setGameState('TITLE')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                タイトルへ戻る
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto">
              {TESTS.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => startPractice(idx)}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 hover:scale-102 transition text-left cursor-pointer group shadow-md"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-mono shadow-inner"
                    style={{ backgroundColor: `${t.color}25`, color: t.color }}
                  >
                    {t.iconText}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold" style={{ color: t.color }}>
                        TEST 0{t.index}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{t.timeLimit}s</span>
                    </div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition truncate">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.rule}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------- */}
        {/* 遊び方＆検定項目モーダル */}
        {/* ---------------------------------------- */}
        {gameState === 'HOW_TO_PLAY' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col p-6 z-20 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>検定ルール＆操作方法</span>
              </h2>
              <button
                onClick={() => setGameState('TITLE')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                閉じる
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 max-w-xl mx-auto my-auto">
              {/* 操作方法 */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> 操作方法
                </h3>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-mono">移動:</span> 矢印キー / WASD / タッチドラッグ
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono">ショット:</span> Z / J / Space / タップ連打
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono">寸止めブレーキ:</span> X / K / 下キー / 画面長押し
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono">スマホ対応:</span> 画面タッチ直感操作
                  </div>
                </div>
              </div>

              {/* 6大検定種目 */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2">全6種目の測定内容</h3>
                <div className="space-y-2">
                  {TESTS.map((t) => (
                    <div key={t.id} className="flex items-start gap-2.5">
                      <span className="text-base">{t.iconText}</span>
                      <div>
                        <span className="font-bold text-slate-200">{t.title}</span>: {t.rule}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------- */}
        {/* 総合検定リザルト画面 (シューター年齢＆レーダーチャート) */}
        {/* ---------------------------------------- */}
        {gameState === 'FINAL_RESULT' && finalEval && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-20 overflow-y-auto text-center">
            {/* 年齢発表ヘッダー */}
            <div className="mb-2">
              <span className="text-xs font-black tracking-widest text-slate-400 font-mono">
                FINAL OFFICIAL CERTIFICATION
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                あなたのシューティング技能年齢は…
              </h2>
            </div>

            {/* 巨大シューター年齢バッジ */}
            <div className="my-2 py-2 px-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-bounce">
              <div className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-rose-400">
                {finalEval.shooterAge} <span className="text-3xl sm:text-4xl text-white font-sans">歳</span>
              </div>
            </div>

            {/* 称号＆総合ランク */}
            <div className="flex items-center gap-3 my-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {finalEval.titleName}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                RANK {finalEval.overallRank} ({finalEval.totalScore} / 6000 pts)
              </span>
            </div>

            {/* 5角形レーダーチャート & 種目別内訳 */}
            <div className="w-full max-w-sm my-2 flex flex-col items-center">
              {renderRadarCanvas(finalEval.radarScores)}
            </div>

            {/* 教官からの熱血コメント */}
            <div className="max-w-md p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-amber-200/90 italic my-2 shadow-inner">
              {finalEval.instructorComment}
            </div>

            {/* 結果シェアコピーボタン */}
            <button
              onClick={() => {
                const shareText = `🎮 【シューティング技能検定】検定結果 🎮\n━━━━━━━━━━━━━━━━━━━━\n🎯 シューター技能年齢: ${finalEval.shooterAge}歳\n🏆 総合評価: RANK ${finalEval.overallRank} (${finalEval.totalScore}/6000 pts)\n🎖️ 称号: ${finalEval.titleName}\n📊 能力値: 連射${finalEval.radarScores.rapid} / 度胸${finalEval.radarScores.guts} / 反射${finalEval.radarScores.reaction} / 回避${finalEval.radarScores.evasion} / 識別${finalEval.radarScores.judgement}\n━━━━━━━━━━━━━━━━━━━━\n#シューティング技能検定 #GamesHub`;
                navigator.clipboard.writeText(shareText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full max-w-xs py-2 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition cursor-pointer flex items-center justify-center gap-1.5 my-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? '結果をコピーしました！' : '検定結果テキストをコピー (シェア)'}</span>
            </button>

            {/* アクションボタン */}
            <div className="flex items-center gap-3 mt-2 w-full max-w-xs">
              <button
                onClick={startExam}
                className="flex-1 py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/30 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>もう一度検定</span>
              </button>
              <button
                onClick={() => setGameState('PRACTICE_SELECT')}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>個別特訓へ</span>
              </button>
              <button
                onClick={() => setGameState('TITLE')}
                className="py-3 px-4 rounded-2xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition cursor-pointer"
              >
                タイトル
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------- */}
        {/* スマホ用タッチ操作バーチャルボタン (PLAYING時のみ) */}
        {/* ---------------------------------------- */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto sm:hidden z-10">
            {/* ブレーキボタン (寸止め用) */}
            <button
              onPointerDown={() => (keysRef.current.brake = true)}
              onPointerUp={() => (keysRef.current.brake = false)}
              className="w-16 h-16 rounded-2xl bg-amber-600/80 active:bg-amber-500 text-white font-black text-xs shadow-lg border border-amber-400/50 flex flex-col items-center justify-center cursor-pointer select-none backdrop-blur-sm"
            >
              <span>🛑</span>
              <span className="text-[10px]">BRAKE</span>
            </button>

            {/* 連射ショットボタン */}
            <button
              onPointerDown={() => (keysRef.current.shot = true)}
              onPointerUp={() => (keysRef.current.shot = false)}
              className="w-18 h-18 rounded-3xl bg-red-600/80 active:bg-red-500 text-white font-black text-sm shadow-lg border border-red-400/50 flex flex-col items-center justify-center cursor-pointer select-none backdrop-blur-sm"
            >
              <span>🔥</span>
              <span>SHOT</span>
            </button>
          </div>
        )}
      </div>

      {/* フッター情報 */}
      {!isFullscreen && (
        <div className="mt-2 text-center text-[11px] text-slate-500">
          Shooting Love &middot; Skill Examination System &copy; 2026 Web Edition
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5角形レーダーチャート描画サブコンポーネント
// ==========================================
const RadarChartComponent: React.FC<{
  scores: FinalEvaluation['radarScores'];
  isDark: boolean;
}> = ({ scores, isDark }) => {
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 240;
    const height = 180;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 62;

    ctx.clearRect(0, 0, width, height);

    const labels = [
      { name: '連射力', val: scores.rapid },
      { name: '度胸', val: scores.guts },
      { name: '反射神経', val: scores.reaction },
      { name: '弾幕回避', val: scores.evasion },
      { name: '識別力', val: scores.judgement },
    ];
    const totalPoints = labels.length;

    // 蜘蛛の巣状グリッド (3段階)
    [0.33, 0.66, 1.0].forEach((ratio) => {
      ctx.beginPath();
      for (let i = 0; i < totalPoints; i++) {
        const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
        const x = centerX + Math.cos(angle) * (radius * ratio);
        const y = centerY + Math.sin(angle) * (radius * ratio);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 軸線
    for (let i = 0; i < totalPoints; i++) {
      const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();

      // ラベルテキスト描画
      const lx = centerX + Math.cos(angle) * (radius + 20);
      const ly = centerY + Math.sin(angle) * (radius + 15);
      ctx.fillStyle = isDark ? '#94a3b8' : '#cbd5e1';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${labels[i].name}`, lx, ly - 5);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${labels[i].val}`, lx, ly + 6);
    }

    // スコアポリゴン描画
    ctx.beginPath();
    for (let i = 0; i < totalPoints; i++) {
      const angle = (Math.PI * 2 / totalPoints) * i - Math.PI / 2;
      const scoreRatio = Math.max(0.1, Math.min(1.0, labels[i].val / 100));
      const x = centerX + Math.cos(angle) * (radius * scoreRatio);
      const y = centerY + Math.sin(angle) * (radius * scoreRatio);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [scores]);

  return <canvas ref={chartCanvasRef} width={240} height={180} className="w-[240px] h-[180px]" />;
};
