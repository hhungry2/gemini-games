import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Heart,
  Sword,
  Award,
  Play,
  Clock,
  Zap,
} from 'lucide-react';

export interface ChiikawaGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// キャラクターID
export type ChiikawaCharId = 'chiikawa' | 'hachiware' | 'usagi' | 'kurimanju' | 'momonga';

// ゲームモード
export type ChiikawaGameMode = 'subjugation' | 'weeding' | 'dex';

export interface CharacterDef {
  id: ChiikawaCharId;
  name: string;
  title: string;
  color: string;
  accentColor: string;
  bgGradient: string;
  weaponName: string;
  specialName: string;
  specialDesc: string;
  passiveDesc: string;
  baseHp: number;
  baseSpeed: number;
  baseAttack: number;
  specialCooldown: number; // 秒
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'chiikawa',
    name: 'ちいかわ',
    title: '泣き虫だけどがんばり屋',
    color: '#ffffff',
    accentColor: '#f43f5e',
    bgGradient: 'from-rose-400 to-pink-500',
    weaponName: 'ピンクのさすまた',
    specialName: 'ウワァァァッ！',
    specialDesc: '大声で叫んで周囲の敵を吹き飛ばし、4秒間無敵ダッシュ！',
    passiveDesc: '草むしりスコア1.5倍 ＆ アイテム引き寄せUP',
    baseHp: 100,
    baseSpeed: 3.6,
    baseAttack: 18,
    specialCooldown: 10,
  },
  {
    id: 'hachiware',
    name: 'ハチワレ',
    title: '前向きなカメラ好き',
    color: '#60a5fa',
    accentColor: '#2563eb',
    bgGradient: 'from-sky-400 to-blue-600',
    weaponName: '青のさすまた',
    specialName: 'なんとかなれーッ！',
    specialDesc: '高く飛び上がり急降下突き！画面全体に大爆発ダメージ！',
    passiveDesc: 'チャリメラ効果で常時HPが少しずつ自動回復',
    baseHp: 110,
    baseSpeed: 4.0,
    baseAttack: 22,
    specialCooldown: 12,
  },
  {
    id: 'usagi',
    name: 'うさぎ',
    title: '自由奔放な超凄腕',
    color: '#fef08a',
    accentColor: '#eab308',
    bgGradient: 'from-amber-400 to-yellow-500',
    weaponName: '仕込み火花ロッド',
    specialName: 'ヤハーーッ！！',
    specialDesc: '火花を撒き散らしながら高速タックル！敵を連続貫通粉砕！',
    passiveDesc: '最高峰の攻撃力と移動速度を誇る',
    baseHp: 90,
    baseSpeed: 4.6,
    baseAttack: 28,
    specialCooldown: 8,
  },
  {
    id: 'kurimanju',
    name: 'くりまんじゅう',
    title: '頼れるお酒好きの先輩',
    color: '#fed7aa',
    accentColor: '#d97706',
    bgGradient: 'from-orange-400 to-amber-600',
    weaponName: 'スキットルとおつまみ',
    specialName: 'ハーーッ…！',
    specialDesc: '一杯あおって前方に超極太ブレス衝撃波！敵を遠くへノックバック！',
    passiveDesc: '被ダメージ30%軽減 ＆ ノックバック無効',
    baseHp: 140,
    baseSpeed: 3.4,
    baseAttack: 24,
    specialCooldown: 11,
  },
  {
    id: 'momonga',
    name: 'モモンガ',
    title: 'あざと可愛い暴れん坊',
    color: '#93c5fd',
    accentColor: '#0ea5e9',
    bgGradient: 'from-cyan-400 to-sky-500',
    weaponName: 'もふもふテイル',
    specialName: 'み〜て〜〜ッ！',
    specialDesc: 'ハートを放ち周囲の敵をメロメロスタン（4秒間行動不能）！',
    passiveDesc: '超広範囲アイテムマグネット ＆ 回復アイテム出現率UP',
    baseHp: 100,
    baseSpeed: 4.2,
    baseAttack: 19,
    specialCooldown: 10,
  },
];

// 討伐クエスト用の敵定義
interface Enemy {
  id: number;
  type: 'gichi' | 'chimera' | 'amiabura' | 'dekatsuyo' | 'anoko';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  attackPower: number;
  isBoss: boolean;
  color: string;
  name: string;
  animTimer: number;
  stunTimer: number;
}

// ドロップアイテム
interface DropItem {
  id: number;
  type: 'pudding' | 'pancake' | 'onigiri' | 'charimera' | 'coin';
  x: number;
  y: number;
  vy: number;
  exp: number;
  heal: number;
  score: number;
  life: number;
}

// パーティクル
interface ChiikawaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'sparkle' | 'circle' | 'tear' | 'heart' | 'star';
}

// 浮遊テキスト
interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
}

// 草むしり検定の草
interface WeedItem {
  id: number;
  x: number;
  y: number;
  type: 'normal' | 'large' | 'gold' | 'danger';
  radius: number;
  points: number;
  scale: number;
  sway: number;
}

// 強化ビルド
interface UpgradeChoice {
  id: string;
  name: string;
  desc: string;
  icon: string;
  apply: (state: any) => void;
}

const SUBJUGATION_HIGH_SCORE_KEY = 'chiikawa_subjugation_high_score';
const WEEDING_HIGH_SCORE_KEY = 'chiikawa_weeding_high_score';
const WEEDING_BEST_RANK_KEY = 'chiikawa_weeding_best_rank';

export const ChiikawaGame: React.FC<ChiikawaGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  // 状態管理
  const [activeTab, setActiveTab] = useState<ChiikawaGameMode>('subjugation');
  const [selectedCharId, setSelectedCharId] = useState<ChiikawaCharId>('chiikawa');
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory'>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // アンマウント時にBGMを停止
  useEffect(() => {
    return () => {
      sound.stopChiikawaBgm();
    };
  }, []);

  // スコア・記録
  const [subjugationHighScore, setSubjugationHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem(SUBJUGATION_HIGH_SCORE_KEY) || '0', 10);
  });
  const [weedingHighScore, setWeedingHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem(WEEDING_HIGH_SCORE_KEY) || '0', 10);
  });
  const [weedingBestRank, setWeedingBestRank] = useState<string>(() => {
    return localStorage.getItem(WEEDING_BEST_RANK_KEY) || '未取得';
  });

  // 討伐クエスト中の状態
  const [score, setScore] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(100);
  const [playerExp, setPlayerExp] = useState<number>(0);
  const [playerMaxExp, setPlayerMaxExp] = useState<number>(100);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [specialCooldownLeft, setSpecialCooldownLeft] = useState<number>(0);

  // 草むしり検定中の状態
  const [weedScore, setWeedScore] = useState<number>(0);
  const [weedCombo, setWeedCombo] = useState<number>(0);
  const [weedTimeLeft, setWeedTimeLeft] = useState<number>(60);
  const [weedsPulledCount, setWeedsPulledCount] = useState<number>(0);

  // アップグレード選択肢
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeChoice[]>([]);

  // 参照
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // 入力追跡
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchJoystickRef = useRef<{ active: boolean; startX: number; startY: number; dx: number; dy: number }>({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
  });

  // プレイヤー実体データ
  const playerRef = useRef({
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    dirX: 1,
    speed: 4.0,
    attackPower: 20,
    attackRange: 55,
    attackCooldown: 0,
    isAttacking: false,
    attackAnim: 0,
    isSpecial: false,
    specialTimer: 0,
    invincibleTimer: 0,
    regenTimer: 0,
    faceExpression: 'normal' as 'normal' | 'attack' | 'cry' | 'happy',
    walkCycle: 0,
  });

  // ゲームオブジェクト
  const enemiesRef = useRef<Enemy[]>([]);
  const dropItemsRef = useRef<DropItem[]>([]);
  const weedsRef = useRef<WeedItem[]>([]);
  const particlesRef = useRef<ChiikawaParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const waveTimerRef = useRef<number>(0);
  const weedSpawnTimerRef = useRef<number>(0);
  const nextEntityId = useRef<number>(1);

  const selectedChar = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];

  // ミュート初期同期
  useEffect(() => {
    setIsMuted(sound.getMuted());
    return () => {
      sound.stopChiikawaBgm();
    };
  }, []);

  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // 浮遊テキスト追加
  const addFloatingText = useCallback((text: string, x: number, y: number, color: string, scale: number = 1.0) => {
    floatingTextsRef.current.push({
      id: nextEntityId.current++,
      text,
      x,
      y,
      color,
      scale,
      alpha: 1.0,
    });
  }, []);

  // パーティクル追加
  const addParticles = useCallback((
    x: number,
    y: number,
    color: string,
    count: number = 8,
    shape: 'sparkle' | 'circle' | 'tear' | 'heart' | 'star' = 'circle',
    speed: number = 2.5
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.5 + Math.random()) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: Math.random() * 5 + 3,
        alpha: 1.0,
        life: 0,
        maxLife: Math.floor(Math.random() * 20 + 25),
        shape,
      });
    }
  }, []);

  // 草の生成
  const spawnWeed = useCallback((initial: boolean = false) => {
    const x = 50 + Math.random() * 700;
    const y = 60 + Math.random() * 480;

    const rand = Math.random();
    let type: 'normal' | 'large' | 'gold' | 'danger' = 'normal';
    let points = 100;
    let radius = 18;

    if (rand < 0.15) {
      type = 'danger';
      points = -200;
      radius = 22;
    } else if (rand < 0.25) {
      type = 'gold';
      points = 800;
      radius = 20;
    } else if (rand < 0.55) {
      type = 'large';
      points = 300;
      radius = 24;
    }

    weedsRef.current.push({
      id: nextEntityId.current++,
      x,
      y,
      type,
      radius,
      points,
      scale: initial ? 1.0 : 0.1,
      sway: Math.random() * Math.PI * 2,
    });
  }, []);

  // ゲームリセット / スタート
  const startGame = useCallback((mode: ChiikawaGameMode) => {
    setActiveTab(mode);
    setGameState('playing');

    const charDef = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];

    // プレイヤー初期化
    playerRef.current = {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      dirX: 1,
      speed: charDef.baseSpeed,
      attackPower: charDef.baseAttack,
      attackRange: charDef.id === 'usagi' ? 65 : 55,
      attackCooldown: 0,
      isAttacking: false,
      attackAnim: 0,
      isSpecial: false,
      specialTimer: 0,
      invincibleTimer: 0,
      regenTimer: 0,
      faceExpression: 'normal',
      walkCycle: 0,
    };

    setPlayerHp(charDef.baseHp);
    setPlayerMaxHp(charDef.baseHp);
    setPlayerExp(0);
    setPlayerMaxExp(100);
    setPlayerLevel(1);
    setSpecialCooldownLeft(0);
    setScore(0);
    setKills(0);
    setWave(1);

    // 草むしり用初期化
    setWeedScore(0);
    setWeedCombo(0);
    setWeedTimeLeft(60);
    setWeedsPulledCount(0);

    enemiesRef.current = [];
    dropItemsRef.current = [];
    weedsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    waveTimerRef.current = 0;
    weedSpawnTimerRef.current = 0;

    if (mode === 'subjugation') {
      sound.startChiikawaBgm('battle');
      addFloatingText('討伐クエスト開始ッ！', 400, 260, '#f43f5e', 1.4);
    } else if (mode === 'weeding') {
      sound.startChiikawaBgm('chill');
      addFloatingText('草むしり検定スタート！', 400, 260, '#10b981', 1.4);
      for (let i = 0; i < 18; i++) {
        spawnWeed(true);
      }
    }
  }, [selectedCharId, addFloatingText, spawnWeed]);

  // 敵の生成
  const spawnEnemy = useCallback((type: 'gichi' | 'chimera' | 'amiabura' | 'dekatsuyo' | 'anoko') => {
    let x = 0;
    let y = 0;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      x = Math.random() * 800;
      y = -30;
    } else if (side === 1) {
      x = 830;
      y = Math.random() * 600;
    } else if (side === 2) {
      x = Math.random() * 800;
      y = 630;
    } else {
      x = -30;
      y = Math.random() * 600;
    }

    let hp = 30;
    let speed = 1.8;
    let radius = 18;
    let attackPower = 10;
    let isBoss = false;
    let color = '#334155';
    let name = 'ギチギチ';

    if (type === 'chimera') {
      hp = 65;
      speed = 2.4;
      radius = 22;
      attackPower = 16;
      color = '#a855f7';
      name = 'キメラ';
    } else if (type === 'amiabura') {
      hp = 90;
      speed = 1.2;
      radius = 26;
      attackPower = 14;
      color = '#eab308';
      name = 'アミアブラ';
    } else if (type === 'dekatsuyo') {
      hp = 450;
      speed = 1.5;
      radius = 45;
      attackPower = 28;
      isBoss = true;
      color = '#dc2626';
      name = 'でかつよ (BOSS)';
    } else if (type === 'anoko') {
      hp = 850;
      speed = 1.8;
      radius = 55;
      attackPower = 35;
      isBoss = true;
      color = '#ef4444';
      name = 'あのこ (FINAL BOSS)';
    }

    hp = Math.round(hp * (1 + (wave - 1) * 0.25));

    enemiesRef.current.push({
      id: nextEntityId.current++,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      speed,
      radius,
      attackPower,
      isBoss,
      color,
      name,
      animTimer: Math.random() * 10,
      stunTimer: 0,
    });
  }, [wave]);

  // 草をむしる処理
  const pullWeed = useCallback((weed: WeedItem, index: number) => {
    weedsRef.current.splice(index, 1);
    const p = playerRef.current;

    if (weed.type === 'danger') {
      sound.playChiikawaDanger();
      setWeedCombo(0);
      setWeedScore((prev) => Math.max(0, prev - 200));
      p.faceExpression = 'cry';
      p.invincibleTimer = 40;
      addFloatingText('危険草！-200点', weed.x, weed.y - 20, '#ef4444', 1.3);
      addParticles(weed.x, weed.y, '#7f1d1d', 12, 'circle', 3.5);
      return;
    }

    const multiplier = selectedCharId === 'chiikawa' ? 1.5 : 1.0;
    const comboBonus = 1 + weedCombo * 0.08;
    const finalPoints = Math.round(weed.points * multiplier * comboBonus);

    setWeedScore((prev) => prev + finalPoints);
    setWeedCombo((prev) => prev + 1);
    setWeedsPulledCount((prev) => prev + 1);

    sound.playChiikawaWeed(weedCombo);

    if (weed.type === 'gold') {
      addFloatingText(`ゴールド草！+${finalPoints}`, weed.x, weed.y - 20, '#fbbf24', 1.5);
      addParticles(weed.x, weed.y, '#fde047', 18, 'star', 4.5);
    } else if (weed.type === 'large') {
      addFloatingText(`大物草！+${finalPoints}`, weed.x, weed.y - 20, '#34d399', 1.3);
      addParticles(weed.x, weed.y, '#4ade80', 10, 'sparkle', 3.5);
    } else {
      addFloatingText(`+${finalPoints}`, weed.x, weed.y - 15, '#6ee7b7', 1.0);
      addParticles(weed.x, weed.y, '#86efac', 6, 'circle', 2.5);
    }
  }, [selectedCharId, weedCombo, addFloatingText, addParticles]);

  // 攻撃実行
  const triggerAttack = useCallback(() => {
    const p = playerRef.current;
    if (p.attackCooldown > 0) return;

    p.isAttacking = true;
    p.attackAnim = 12;
    p.attackCooldown = 15;
    p.faceExpression = 'attack';
    sound.playChiikawaAttack();

    const hitBoxRadius = p.attackRange;
    const attackCenterX = p.x + p.dirX * (hitBoxRadius * 0.7);
    const attackCenterY = p.y;
    const is360 = selectedCharId === 'usagi';

    let hasHit = false;
    enemiesRef.current.forEach((enemy) => {
      const dx = enemy.x - (is360 ? p.x : attackCenterX);
      const dy = enemy.y - (is360 ? p.y : attackCenterY);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitBoxRadius + enemy.radius) {
        hasHit = true;
        const damage = Math.round(p.attackPower * (0.9 + Math.random() * 0.3));
        enemy.hp -= damage;
        enemy.stunTimer = 6;

        const angle = Math.atan2(dy, dx);
        const knockback = selectedCharId === 'kurimanju' ? 12 : 7;
        enemy.x += Math.cos(angle) * knockback;
        enemy.y += Math.sin(angle) * knockback;

        sound.playChiikawaHit();
        addFloatingText(`-${damage}`, enemy.x, enemy.y - 15, '#f43f5e', 1.1);
        addParticles(enemy.x, enemy.y, '#fbcfe8', 6, 'sparkle', 3);
      }
    });

    if (activeTab === 'weeding') {
      weedsRef.current.forEach((weed, idx) => {
        const dx = weed.x - p.x;
        const dy = weed.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitBoxRadius + weed.radius) {
          pullWeed(weed, idx);
        }
      });
    }

    if (hasHit && selectedCharId === 'chiikawa') {
      addParticles(p.x, p.y - 12, '#93c5fd', 2, 'tear', 1.5);
    }
  }, [selectedCharId, activeTab, addFloatingText, addParticles, pullWeed]);

  // 必殺技発動
  const triggerSpecial = useCallback(() => {
    if (specialCooldownLeft > 0) return;
    const charDef = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];
    const p = playerRef.current;

    sound.playChiikawaSpecial(selectedCharId);
    setSpecialCooldownLeft(charDef.specialCooldown);

    p.isSpecial = true;
    p.specialTimer = 60;

    if (selectedCharId === 'chiikawa') {
      p.invincibleTimer = 180;
      p.faceExpression = 'cry';
      addFloatingText('ウワァァァッ！！', p.x, p.y - 30, '#f43f5e', 1.6);
      addParticles(p.x, p.y, '#f43f5e', 30, 'heart', 6);
      addParticles(p.x, p.y, '#93c5fd', 25, 'tear', 5);

      enemiesRef.current.forEach((enemy) => {
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const dmg = p.attackPower * 2.2;
          enemy.hp -= dmg;
          const angle = Math.atan2(dy, dx);
          enemy.x += Math.cos(angle) * 35;
          enemy.y += Math.sin(angle) * 35;
          addFloatingText(`-${Math.round(dmg)}`, enemy.x, enemy.y - 15, '#f43f5e', 1.3);
        }
      });
    } else if (selectedCharId === 'hachiware') {
      p.invincibleTimer = 90;
      p.faceExpression = 'happy';
      addFloatingText('なんとかなれーッ！', p.x, p.y - 35, '#3b82f6', 1.7);
      addParticles(p.x, p.y, '#60a5fa', 35, 'sparkle', 7);

      enemiesRef.current.forEach((enemy) => {
        const dmg = p.attackPower * 2.8;
        enemy.hp -= dmg;
        enemy.stunTimer = 40;
        addFloatingText(`-${Math.round(dmg)}`, enemy.x, enemy.y - 15, '#38bdf8', 1.4);
      });
    } else if (selectedCharId === 'usagi') {
      p.invincibleTimer = 120;
      p.faceExpression = 'attack';
      addFloatingText('ヤハーーーーッ！！', p.x, p.y - 30, '#eab308', 1.7);
      addParticles(p.x, p.y, '#fde047', 40, 'star', 8);

      enemiesRef.current.forEach((enemy) => {
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220) {
          const dmg = p.attackPower * 3.0;
          enemy.hp -= dmg;
          addFloatingText(`-${Math.round(dmg)}`, enemy.x, enemy.y - 15, '#eab308', 1.5);
        }
      });
    } else if (selectedCharId === 'kurimanju') {
      p.invincibleTimer = 90;
      p.faceExpression = 'normal';
      addFloatingText('ハーーッ…！', p.x, p.y - 30, '#f97316', 1.8);
      addParticles(p.x, p.y, '#fdba74', 30, 'circle', 6);

      enemiesRef.current.forEach((enemy) => {
        const dx = enemy.x - p.x;
        if (dx * p.dirX > 0 && Math.abs(enemy.y - p.y) < 120) {
          const dmg = p.attackPower * 2.6;
          enemy.hp -= dmg;
          enemy.x += p.dirX * 50;
          addFloatingText(`-${Math.round(dmg)}`, enemy.x, enemy.y - 15, '#ea580c', 1.4);
        }
      });
    } else if (selectedCharId === 'momonga') {
      p.invincibleTimer = 90;
      p.faceExpression = 'happy';
      addFloatingText('み〜て〜〜ッ！💕', p.x, p.y - 30, '#ec4899', 1.7);
      addParticles(p.x, p.y, '#f472b6', 40, 'heart', 6);

      enemiesRef.current.forEach((enemy) => {
        enemy.stunTimer = 160;
        const dmg = p.attackPower * 1.5;
        enemy.hp -= dmg;
        addFloatingText('メロメロ…♡', enemy.x, enemy.y - 15, '#f472b6', 1.2);
      });
    }
  }, [selectedCharId, specialCooldownLeft, addFloatingText, addParticles]);

  // レベルアップ時の選択肢生成
  const showLevelUpModal = useCallback(() => {
    sound.playChiikawaLevelUp();
    setGameState('levelup');

    const pool: UpgradeChoice[] = [
      {
        id: 'attack_up',
        name: 'さすまた研ぎ澄まし',
        desc: '攻撃力 +25%',
        icon: '⚔️',
        apply: () => {
          playerRef.current.attackPower = Math.round(playerRef.current.attackPower * 1.25);
        },
      },
      {
        id: 'range_up',
        name: '巨大なさすまた',
        desc: '攻撃範囲 +30%',
        icon: '🌟',
        apply: () => {
          playerRef.current.attackRange = Math.round(playerRef.current.attackRange * 1.3);
        },
      },
      {
        id: 'speed_up',
        name: '全力ダッシュ',
        desc: '移動速度 +20%',
        icon: '💨',
        apply: () => {
          playerRef.current.speed *= 1.2;
        },
      },
      {
        id: 'max_hp_up',
        name: '鎧さんの差し入れ',
        desc: '最大HP +35 ＆ HP全回復',
        icon: '🍱',
        apply: () => {
          setPlayerMaxHp((prev) => {
            const next = prev + 35;
            setPlayerHp(next);
            return next;
          });
        },
      },
      {
        id: 'special_cd',
        name: 'なんとかなれ精神',
        desc: '必殺技のクールタイム -20%',
        icon: '⚡',
        apply: () => {
          setSpecialCooldownLeft((prev) => Math.max(0, prev * 0.8));
        },
      },
      {
        id: 'pudding_power',
        name: 'むちゃうまパワー',
        desc: '攻撃力 +15% ＆ 移動速度 +10%',
        icon: '🍮',
        apply: () => {
          playerRef.current.attackPower = Math.round(playerRef.current.attackPower * 1.15);
          playerRef.current.speed *= 1.1;
        },
      },
    ];

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setUpgradeChoices(shuffled.slice(0, 3));
  }, []);

  // アップグレード選択
  const selectUpgrade = (upgrade: UpgradeChoice) => {
    upgrade.apply({});
    sound.playChiikawaEat();
    setGameState('playing');
  };

  // キーボードイベントリスナー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (e.code === 'Space' || e.code === 'KeyJ') {
        if (gameState === 'playing') {
          triggerAttack();
        }
      } else if (e.code === 'KeyK' || e.code === 'KeyE') {
        if (gameState === 'playing') {
          triggerSpecial();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, triggerAttack, triggerSpecial]);

  // メインゲームループ
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // 入力・プレイヤー移動
      const p = playerRef.current;
      const keys = keysRef.current;
      const joy = touchJoystickRef.current;

      let moveX = 0;
      let moveY = 0;

      if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

      if (joy.active) {
        moveX += joy.dx;
        moveY += joy.dy;
      }

      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      if (len > 0.1) {
        moveX /= len;
        moveY /= len;
        p.vx = moveX * p.speed;
        p.vy = moveY * p.speed;
        if (moveX > 0.1) p.dirX = 1;
        if (moveX < -0.1) p.dirX = -1;
        p.walkCycle += dt * 12;
      } else {
        p.vx = 0;
        p.vy = 0;
      }

      p.x += p.vx;
      p.y += p.vy;

      p.x = Math.max(30, Math.min(770, p.x));
      p.y = Math.max(40, Math.min(560, p.y));

      if (p.attackCooldown > 0) p.attackCooldown--;
      if (p.attackAnim > 0) {
        p.attackAnim--;
        if (p.attackAnim === 0) p.faceExpression = 'normal';
      }
      if (p.specialTimer > 0) p.specialTimer--;
      if (p.invincibleTimer > 0) p.invincibleTimer--;

      // ハチワレのパッシブ: チャリメラ自動回復
      if (selectedCharId === 'hachiware') {
        p.regenTimer += dt;
        if (p.regenTimer >= 3.5) {
          p.regenTimer = 0;
          setPlayerHp((hp) => Math.min(playerMaxHp, hp + 3));
          addParticles(p.x, p.y, '#38bdf8', 2, 'sparkle', 1.2);
        }
      }

      setSpecialCooldownLeft((prev) => Math.max(0, prev - dt));

      // モード別ロジック
      if (activeTab === 'subjugation') {
        waveTimerRef.current += dt;

        const spawnInterval = Math.max(1.0, 3.2 - wave * 0.35);
        if (waveTimerRef.current >= spawnInterval) {
          waveTimerRef.current = 0;
          if (wave === 1) {
            spawnEnemy('gichi');
          } else if (wave === 2) {
            spawnEnemy(Math.random() < 0.6 ? 'gichi' : 'chimera');
          } else if (wave === 3) {
            spawnEnemy(Math.random() < 0.4 ? 'gichi' : Math.random() < 0.7 ? 'chimera' : 'amiabura');
          } else if (wave === 4) {
            spawnEnemy(Math.random() < 0.5 ? 'chimera' : 'amiabura');
          } else {
            spawnEnemy(Math.random() < 0.4 ? 'chimera' : 'amiabura');
          }
        }

        // ボス判定
        if (wave === 3 && enemiesRef.current.filter((e) => e.type === 'dekatsuyo').length === 0 && kills >= 15) {
          spawnEnemy('dekatsuyo');
          addFloatingText('巨大な気配…でかつよ現る！', 400, 200, '#dc2626', 1.5);
        } else if (wave === 5 && enemiesRef.current.filter((e) => e.type === 'anoko').length === 0 && kills >= 35) {
          spawnEnemy('anoko');
          addFloatingText('大ボス「あのこ」が降臨ッ！', 400, 200, '#ef4444', 1.8);
        }

        // 敵の追跡・衝突
        enemiesRef.current.forEach((enemy, idx) => {
          if (enemy.stunTimer > 0) {
            enemy.stunTimer--;
            return;
          }

          const dx = p.x - enemy.x;
          const dy = p.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 5) {
            enemy.vx = (dx / dist) * enemy.speed;
            enemy.vy = (dy / dist) * enemy.speed;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
          }

          if (dist < enemy.radius + 16 && p.invincibleTimer <= 0) {
            let dmg = enemy.attackPower;
            if (selectedCharId === 'kurimanju') dmg = Math.round(dmg * 0.7);

            setPlayerHp((hp) => {
              const next = hp - dmg;
              if (next <= 0) {
                sound.stopChiikawaBgm();
                sound.playChiikawaGameOver();
                setGameState('gameover');
              }
              return Math.max(0, next);
            });

            p.invincibleTimer = 35;
            p.faceExpression = 'cry';
            sound.playChiikawaDanger();
            addFloatingText(`-${dmg}`, p.x, p.y - 20, '#ef4444', 1.2);
            addParticles(p.x, p.y, '#ef4444', 8, 'tear', 3);
          }

          if (enemy.hp <= 0) {
            sound.playChiikawaDefeat();
            enemiesRef.current.splice(idx, 1);
            setKills((k) => k + 1);
            setScore((s) => s + (enemy.isBoss ? 2500 : 200));

            addParticles(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 40 : 16, 'sparkle', 5);

            const rand = Math.random();
            let dropType: 'pudding' | 'pancake' | 'onigiri' | 'charimera' | 'coin' = 'coin';
            let exp = 40;
            let heal = 0;
            let sc = 100;

            if (enemy.isBoss) {
              dropType = 'charimera';
              exp = 200;
              heal = 50;
              sc = 2000;
            } else if (rand < 0.25) {
              dropType = 'pudding';
              exp = 70;
            } else if (rand < 0.45) {
              dropType = 'onigiri';
              heal = 25;
            } else if (rand < 0.65) {
              dropType = 'pancake';
              exp = 100;
            }

            dropItemsRef.current.push({
              id: nextEntityId.current++,
              type: dropType,
              x: enemy.x,
              y: enemy.y,
              vy: -2,
              exp,
              heal,
              score: sc,
              life: 600,
            });

            if (enemy.type === 'anoko') {
              sound.stopChiikawaBgm();
              sound.playChiikawaVictory();
              setGameState('victory');
            } else if (enemy.type === 'dekatsuyo') {
              setWave((w) => w + 1);
              addFloatingText('でかつよ討伐大成功！Wave UP！', 400, 240, '#f59e0b', 1.6);
            }
          }
        });

        // ドロップアイテム回収
        const magnetRadius = selectedCharId === 'momonga' ? 180 : 80;
        dropItemsRef.current.forEach((item, idx) => {
          item.life--;
          if (item.life <= 0) {
            dropItemsRef.current.splice(idx, 1);
            return;
          }

          const dx = p.x - item.x;
          const dy = p.y - item.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < magnetRadius) {
            item.x += (dx / dist) * 6;
            item.y += (dy / dist) * 6;
          }

          if (dist < 25) {
            dropItemsRef.current.splice(idx, 1);
            sound.playChiikawaEat();
            p.faceExpression = 'happy';

            if (item.exp > 0) {
              setPlayerExp((exp) => {
                const next = exp + item.exp;
                if (next >= playerMaxExp) {
                  setPlayerLevel((lvl) => lvl + 1);
                  setPlayerMaxExp((max) => Math.round(max * 1.4));
                  showLevelUpModal();
                  return next - playerMaxExp;
                }
                return next;
              });
            }

            if (item.heal > 0) {
              setPlayerHp((hp) => Math.min(playerMaxHp, hp + item.heal));
              addFloatingText(`+${item.heal} HP`, p.x, p.y - 20, '#10b981', 1.1);
            }

            setScore((s) => s + item.score);
            addParticles(item.x, item.y, '#fef08a', 8, 'star', 2);
          }
        });
      } else if (activeTab === 'weeding') {
        setWeedTimeLeft((t) => {
          const next = t - dt;
          if (next <= 0) {
            sound.stopChiikawaBgm();
            sound.playChiikawaVictory();
            setGameState('victory');
            return 0;
          }
          return next;
        });

        weedSpawnTimerRef.current += dt;
        if (weedSpawnTimerRef.current >= 0.8 && weedsRef.current.length < 30) {
          weedSpawnTimerRef.current = 0;
          spawnWeed();
        }

        weedsRef.current.forEach((weed, idx) => {
          if (weed.scale < 1.0) {
            weed.scale = Math.min(1.0, weed.scale + dt * 3);
          }
          weed.sway += dt * 3;

          const dx = weed.x - p.x;
          const dy = weed.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < weed.radius + 18) {
            pullWeed(weed, idx);
          }
        });
      }

      // パーティクル・浮遊テキスト
      particlesRef.current.forEach((pt, idx) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = 1 - pt.life / pt.maxLife;
        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(idx, 1);
        }
      });

      floatingTextsRef.current.forEach((ft, idx) => {
        ft.y -= 0.8;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(idx, 1);
        }
      });

      // Canvas 描画
      ctx.clearRect(0, 0, 800, 600);

      const grad = ctx.createLinearGradient(0, 0, 0, 600);
      if (activeTab === 'subjugation') {
        grad.addColorStop(0, isDark ? '#1e293b' : '#ecfdf5');
        grad.addColorStop(1, isDark ? '#0f172a' : '#d1fae5');
      } else {
        grad.addColorStop(0, isDark ? '#14532d' : '#f0fdf4');
        grad.addColorStop(1, isDark ? '#052e16' : '#dcfce7');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);

      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(16,185,129,0.08)';
      ctx.lineWidth = 1;
      for (let x = 40; x < 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
      for (let y = 40; y < 600; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      weedsRef.current.forEach((weed) => {
        drawWeed(ctx, weed);
      });

      dropItemsRef.current.forEach((item) => {
        drawDropItem(ctx, item);
      });

      enemiesRef.current.forEach((enemy) => {
        drawEnemy(ctx, enemy);
      });

      drawChiikawaCharacter(ctx, p, selectedCharId);

      particlesRef.current.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;

        if (pt.shape === 'heart') {
          ctx.font = `${Math.round(pt.size * 2)}px sans-serif`;
          ctx.fillText('❤️', pt.x - pt.size, pt.y + pt.size);
        } else if (pt.shape === 'tear') {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI);
          ctx.lineTo(pt.x, pt.y - pt.size * 1.5);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `bold ${Math.round(18 * ft.scale)}px "M PLUS Rounded 1c", sans-serif, system-ui`;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x - 20, ft.y);
        ctx.fillText(ft.text, ft.x - 20, ft.y);
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, activeTab, selectedCharId, wave, kills, playerMaxExp, playerMaxHp, showLevelUpModal, spawnWeed, spawnEnemy, pullWeed, isDark]);

  // ハイスコア永続化
  useEffect(() => {
    if (gameState === 'victory' || gameState === 'gameover') {
      if (activeTab === 'subjugation') {
        if (score > subjugationHighScore) {
          setSubjugationHighScore(score);
          localStorage.setItem(SUBJUGATION_HIGH_SCORE_KEY, score.toString());
        }
      } else if (activeTab === 'weeding') {
        if (weedScore > weedingHighScore) {
          setWeedingHighScore(weedScore);
          localStorage.setItem(WEEDING_HIGH_SCORE_KEY, weedScore.toString());
        }
        let rank = '不合格';
        if (weedScore >= 18000) rank = '草むしりマスター (特級)';
        else if (weedScore >= 13000) rank = '草むしり検定 1級';
        else if (weedScore >= 9000) rank = '草むしり検定 2級';
        else if (weedScore >= 6000) rank = '草むしり検定 3級';
        else if (weedScore >= 3500) rank = '草むしり検定 4級';
        else if (weedScore >= 1500) rank = '草むしり検定 5級';

        setWeedingBestRank(rank);
        localStorage.setItem(WEEDING_BEST_RANK_KEY, rank);
      }
    }
  }, [gameState, activeTab, score, weedScore, subjugationHighScore, weedingHighScore]);

  // キャラクター描画
  const drawChiikawaCharacter = (ctx: CanvasRenderingContext2D, p: any, charId: ChiikawaCharId) => {
    ctx.save();
    ctx.translate(p.x, p.y);

    const bobbing = Math.sin(p.walkCycle) * 3;
    const tilt = (p.vx / p.speed) * 0.08;
    ctx.rotate(tilt);
    ctx.scale(p.dirX, 1);

    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // オーラ
    if (p.isSpecial) {
      ctx.strokeStyle = charId === 'chiikawa' ? '#fda4af' : charId === 'hachiware' ? '#93c5fd' : '#fde047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, bobbing, 32 + Math.sin(Date.now() / 80) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (charId === 'usagi') {
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(-10, -28 + bobbing, 6, 20, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(10, -28 + bobbing, 6, 20, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(-10, -28 + bobbing, 3, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(10, -28 + bobbing, 3, 14, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (charId === 'momonga') {
      ctx.fillStyle = '#93c5fd';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(-26, bobbing, 16, 26, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    let bodyColor = '#ffffff';
    if (charId === 'usagi') bodyColor = '#fef08a';
    if (charId === 'kurimanju') bodyColor = '#fed7aa';

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, bobbing, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (charId !== 'usagi') {
      ctx.beginPath();
      ctx.arc(-14, -16 + bobbing, 7, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(14, -16 + bobbing, 7, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffccd5';
      ctx.beginPath();
      ctx.arc(-14, -16 + bobbing, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14, -16 + bobbing, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (charId === 'hachiware') {
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(-18, -10 + bobbing);
      ctx.lineTo(-4, -18 + bobbing);
      ctx.lineTo(0, -6 + bobbing);
      ctx.lineTo(4, -18 + bobbing);
      ctx.lineTo(18, -10 + bobbing);
      ctx.quadraticCurveTo(0, -24 + bobbing, -18, -10 + bobbing);
      ctx.fill();
    }

    if (charId === 'kurimanju') {
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -18 + bobbing, 10, 0, Math.PI);
      ctx.fill();
    }

    // ほっぺ
    ctx.fillStyle = '#f43f5e';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(-12, 4 + bobbing, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, 4 + bobbing, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 目と眉毛
    ctx.fillStyle = '#1e293b';
    if (p.faceExpression === 'cry') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -2 + bobbing);
      ctx.lineTo(-6, 1 + bobbing);
      ctx.lineTo(-10, 4 + bobbing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -2 + bobbing);
      ctx.lineTo(6, 1 + bobbing);
      ctx.lineTo(10, 4 + bobbing);
      ctx.stroke();

      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(-14, 6 + bobbing, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14, 6 + bobbing, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.faceExpression === 'attack') {
      ctx.beginPath();
      ctx.arc(-8, bobbing, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, bobbing, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, -6 + bobbing);
      ctx.lineTo(-5, -4 + bobbing);
      ctx.moveTo(11, -6 + bobbing);
      ctx.lineTo(5, -4 + bobbing);
      ctx.stroke();
    } else if (p.faceExpression === 'happy') {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-8, 1 + bobbing, 4, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, 1 + bobbing, 4, Math.PI, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-8, bobbing, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, bobbing, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7.5, -0.8 + bobbing, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8.5, -0.8 + bobbing, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -5 + bobbing);
      ctx.lineTo(-6, -4 + bobbing);
      ctx.moveTo(10, -5 + bobbing);
      ctx.lineTo(6, -4 + bobbing);
      ctx.stroke();
    }

    // 口
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-2, 7 + bobbing, 2.5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, 7 + bobbing, 2.5, 0, Math.PI);
    ctx.stroke();

    // 足
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-10, 20 + Math.sin(p.walkCycle) * 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, 20 - Math.sin(p.walkCycle) * 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // アクセサリー (ちいかわのポシェット、ハチワレのカメラ、うさぎの尻尾)
    if (charId === 'chiikawa') {
      // 斜めがけの紐
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -2 + bobbing);
      ctx.lineTo(8, 14 + bobbing);
      ctx.stroke();

      // クマさんポシェット
      ctx.fillStyle = '#f472b6';
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(8, 14 + bobbing, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // クマの耳
      ctx.beginPath();
      ctx.arc(5, 9 + bobbing, 2, 0, Math.PI * 2);
      ctx.arc(11, 9 + bobbing, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (charId === 'hachiware') {
      // カメラのストラップ
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -2 + bobbing);
      ctx.lineTo(8, 14 + bobbing);
      ctx.stroke();

      // 青いトイカメラ
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(4, 9 + bobbing, 9, 7, 1.5);
      ctx.fill();
      ctx.stroke();
      // レンズ
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(8.5, 12.5 + bobbing, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (charId === 'usagi') {
      // うさぎのふわふわ丸尻尾
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-22, 10 + bobbing, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 武器
    const weaponExtend = p.isAttacking ? 18 : 0;
    ctx.save();
    ctx.translate(14 + weaponExtend, 6 + bobbing);

    if (charId === 'chiikawa' || charId === 'hachiware') {
      const sasumataColor = charId === 'chiikawa' ? '#fb7185' : '#38bdf8';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(12, -8);
      ctx.stroke();

      ctx.strokeStyle = sasumataColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(14, -10, 7, 0.8 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else if (charId === 'usagi') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.lineTo(18, -14);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(20, -16, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (charId === 'kurimanju') {
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, -6, 12, 14, 3);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  };

  // 敵の描画
  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, enemy.radius * 0.8, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.stunTimer > 0) {
      ctx.font = '16px sans-serif';
      ctx.fillText('💫', -8, -enemy.radius - 8);
    }

    if (enemy.type === 'gichi') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -enemy.radius + 2);
      ctx.lineTo(-12, -enemy.radius - 6);
      ctx.moveTo(6, -enemy.radius + 2);
      ctx.lineTo(12, -enemy.radius - 6);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'chimera') {
      ctx.fillStyle = '#c084fc';
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(-enemy.radius - 4, -4, 8, 14, -0.6, 0, Math.PI * 2);
      ctx.ellipse(enemy.radius + 4, -4, 8, 14, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-6, -2, 3, 0, Math.PI * 2);
      ctx.arc(6, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(-8, 4, 2, 0, Math.PI * 2);
      ctx.arc(8, 4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'dekatsuyo' || enemy.type === 'anoko') {
      ctx.fillStyle = enemy.type === 'anoko' ? '#dc2626' : '#7f1d1d';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-18, -enemy.radius + 6);
      ctx.lineTo(-28, -enemy.radius - 18);
      ctx.lineTo(-8, -enemy.radius + 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(18, -enemy.radius + 6);
      ctx.lineTo(28, -enemy.radius - 18);
      ctx.lineTo(8, -enemy.radius + 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-14, -6, 6, 0, Math.PI * 2);
      ctx.arc(14, -6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-13, -6, 2.5, 0, Math.PI * 2);
      ctx.arc(13, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.arc(-6, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // HPバー
    const barWidth = enemy.radius * 1.6;
    const barHeight = 4;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-barWidth / 2, -enemy.radius - 12, barWidth, barHeight);
    ctx.fillStyle = enemy.isBoss ? '#ef4444' : '#22c55e';
    ctx.fillRect(-barWidth / 2, -enemy.radius - 12, barWidth * hpRatio, barHeight);

    ctx.restore();
  };

  // 草の描画
  const drawWeed = (ctx: CanvasRenderingContext2D, weed: WeedItem) => {
    ctx.save();
    ctx.translate(weed.x, weed.y);
    ctx.scale(weed.scale, weed.scale);

    const swayOffset = Math.sin(weed.sway) * 3;

    if (weed.type === 'danger') {
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 16, Math.sin(ang) * 16);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.fillText('⚠️', -7, -14);
    } else if (weed.type === 'gold') {
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(i * 12 + swayOffset, -8, i * 16 + swayOffset, -18);
        ctx.quadraticCurveTo(i * 6, -6, 0, 8);
        ctx.fill();
        ctx.stroke();
      }
      ctx.font = '12px sans-serif';
      ctx.fillText('✨', -6, -20);
    } else if (weed.type === 'large') {
      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(i * 10 + swayOffset, -6, i * 14 + swayOffset, -16);
        ctx.quadraticCurveTo(i * 4, -4, 0, 8);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.quadraticCurveTo(i * 8 + swayOffset, -4, i * 10 + swayOffset, -12);
        ctx.quadraticCurveTo(i * 3, -2, 0, 6);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // ドロップアイテム描画
  const drawDropItem = (ctx: CanvasRenderingContext2D, item: DropItem) => {
    ctx.save();
    ctx.translate(item.x, item.y);

    const bob = Math.sin(Date.now() / 150) * 3;
    ctx.font = '22px sans-serif';

    if (item.type === 'pudding') {
      ctx.fillText('🍮', -11, bob);
    } else if (item.type === 'pancake') {
      ctx.fillText('🥞', -11, bob);
    } else if (item.type === 'onigiri') {
      ctx.fillText('🍙', -11, bob);
    } else if (item.type === 'charimera') {
      ctx.fillText('🍜', -11, bob);
    } else {
      ctx.fillText('💰', -11, bob);
    }

    ctx.restore();
  };

  return (
    <div
      className={`relative w-full flex flex-col items-center select-none ${
        isFullscreen ? 'h-[calc(100vh-80px)] justify-between py-1' : 'max-w-4xl py-4'
      }`}
    >
      {/* 上部ヘッダーバー */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 dark:text-white leading-none">
              ちいかわ なんとかなれ！大作戦
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeTab === 'subjugation' ? '大討伐クエスト' : '草むしり検定'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title={isMuted ? 'ミュート解除' : '消音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
          </button>

          <button
            onClick={() => startGame(activeTab)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="リスタート"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* モード切り替えタブ */}
      <div className="w-full flex items-center justify-center gap-2 mb-2">
        <button
          onClick={() => {
            if (activeTab !== 'subjugation') {
              sound.stopChiikawaBgm();
              setGameState('title');
              setActiveTab('subjugation');
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'subjugation'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 scale-105'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Sword className="w-3.5 h-3.5" />
          大討伐クエスト
        </button>

        <button
          onClick={() => {
            if (activeTab !== 'weeding') {
              sound.stopChiikawaBgm();
              setGameState('title');
              setActiveTab('weeding');
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'weeding'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-105'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          草むしり検定
        </button>
      </div>

      {/* ゲームステータス HUD */}
      {gameState === 'playing' && (
        <div className="w-full flex items-center justify-between px-4 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-800 mb-1 text-xs">
          {activeTab === 'subjugation' ? (
            <>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full transition-all duration-300"
                    style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">{playerHp}</span>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-[200px] mx-2">
                <span className="font-extrabold text-amber-500">Lv.{playerLevel}</span>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${(playerExp / playerMaxExp) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Wave: <strong className="text-indigo-500">{wave}</strong>
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  討伐: <strong className="text-rose-500">{kills}</strong>
                </span>
                <span className="font-extrabold text-slate-800 dark:text-white">
                  {score.toLocaleString()} pts
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  残り時間: <strong className="text-amber-500 text-sm">{Math.ceil(weedTimeLeft)}秒</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  コンボ: <strong className="text-emerald-500 text-sm">{weedCombo}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-slate-800 dark:text-white text-sm">
                  {weedScore.toLocaleString()} pts
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* メインCanvas表示エリア (フルスクリーン時はダイナミック拡大) */}
      <div
        className={`relative flex items-center justify-center rounded-3xl overflow-hidden border-2 border-slate-300 dark:border-slate-800 shadow-2xl transition-all ${
          isFullscreen
            ? 'w-[min(98vw,calc((100vh-130px)*800/600))] h-[min(calc(100vh-130px),calc(98vw*600/800))]'
            : 'w-full aspect-[4/3] max-w-[800px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-crosshair bg-slate-900"
          onClick={(e) => {
            if (gameState === 'playing' && activeTab === 'weeding') {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const scaleX = 800 / rect.width;
              const scaleY = 600 / rect.height;
              const clickX = (e.clientX - rect.left) * scaleX;
              const clickY = (e.clientY - rect.top) * scaleY;

              weedsRef.current.forEach((weed, idx) => {
                const dx = weed.x - clickX;
                const dy = weed.y - clickY;
                if (Math.sqrt(dx * dx + dy * dy) < weed.radius + 15) {
                  pullWeed(weed, idx);
                }
              });
            }
          }}
        />

        {/* タイトル画面オーバーレイ */}
        {gameState === 'title' && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="text-5xl mb-2 animate-bounce">🌸</div>
            <h2 className="text-3xl sm:text-4xl font-black mb-1 bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              ちいかわ なんとかなれ！大作戦
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              {activeTab === 'subjugation'
                ? 'さすまたを構えて危険なヤツらを討伐！ボスを撃破せよ！'
                : '次々生える草をむしって草むしり検定1級・マスターを目指せ！'}
            </p>

            {/* キャラクター選択カルーセル */}
            <div className="mb-6 w-full max-w-lg">
              <p className="text-xs font-bold text-slate-400 mb-2">▼ プレイするキャラクターを選択 ▼</p>
              <div className="grid grid-cols-5 gap-2">
                {CHARACTERS.map((char) => {
                  const isSelected = char.id === selectedCharId;
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        setSelectedCharId(char.id);
                        sound.playChiikawaWeed(3);
                      }}
                      className={`p-2 rounded-2xl flex flex-col items-center border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/20 border-white shadow-lg scale-105'
                          : 'bg-black/30 border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 shadow-inner bg-slate-800">
                        {char.id === 'chiikawa'
                          ? '🍙'
                          : char.id === 'hachiware'
                          ? '🐱'
                          : char.id === 'usagi'
                          ? '🐰'
                          : char.id === 'kurimanju'
                          ? '🍶'
                          : '🐿️'}
                      </div>
                      <span className="text-[11px] font-black">{char.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* 選択キャラ詳細 */}
              <div className="mt-3 p-3 rounded-2xl bg-white/10 border border-white/10 text-left text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-amber-300">{selectedChar.name} - {selectedChar.title}</span>
                  <span className="text-[10px] text-slate-300">武器: {selectedChar.weaponName}</span>
                </div>
                <p className="text-slate-300 text-[11px] mb-1">
                  <strong className="text-rose-400">必殺技:</strong> {selectedChar.specialName}（{selectedChar.specialDesc}）
                </p>
                <p className="text-slate-400 text-[11px]">
                  <strong className="text-emerald-400">特性:</strong> {selectedChar.passiveDesc}
                </p>
              </div>
            </div>

            {/* スタートボタン */}
            <button
              onClick={() => startGame(activeTab)}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-extrabold text-base shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              {activeTab === 'subjugation' ? '討伐クエストに出発！' : '草むしり検定を受験！'}
            </button>
          </div>
        )}

        {/* レベルアップモーダル */}
        {gameState === 'levelup' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center z-20">
            <span className="text-4xl mb-1 animate-bounce">✨</span>
            <h2 className="text-2xl font-black text-amber-300 mb-1">レベルアップッ！！</h2>
            <p className="text-xs text-slate-300 mb-5">強化したいパワーアップを1つ選んでね！</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
              {upgradeChoices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => selectUpgrade(choice)}
                  className="p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400/60 flex flex-col items-center justify-between text-center transition-all hover:scale-105 cursor-pointer shadow-lg"
                >
                  <div className="text-3xl mb-2">{choice.icon}</div>
                  <h3 className="font-extrabold text-sm text-white mb-1">{choice.name}</h3>
                  <p className="text-xs text-slate-300">{choice.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ゲームオーバー画面 */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center z-20">
            <div className="text-5xl mb-2">😢</div>
            <h2 className="text-3xl font-black text-rose-500 mb-2">泣いちゃった…！</h2>
            <p className="text-xs text-slate-400 mb-4">ちからがつきてしまった…なんとかならなかった…</p>

            <div className="bg-white/10 rounded-2xl p-4 mb-6 min-w-[240px]">
              <p className="text-xs text-slate-400">最終スコア</p>
              <p className="text-3xl font-black text-amber-400">{score.toLocaleString()} pts</p>
              <p className="text-xs text-slate-400 mt-2">討伐数: {kills} 体</p>
            </div>

            <button
              onClick={() => startGame(activeTab)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              もういちど挑戦する
            </button>
          </div>
        )}

        {/* 勝利・合格画面 */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center z-20">
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent mb-2">
              {activeTab === 'subjugation' ? '討伐大成功ーーッ！！' : '草むしり検定 終了！！'}
            </h2>

            {activeTab === 'subjugation' ? (
              <div className="bg-white/10 rounded-2xl p-4 mb-6 min-w-[260px]">
                <p className="text-xs text-slate-400">最終討伐スコア</p>
                <p className="text-3xl font-black text-amber-400 mb-2">{score.toLocaleString()} pts</p>
                <p className="text-xs text-emerald-400 font-bold">大ボス討伐報酬袋を獲得！</p>
              </div>
            ) : (
              <div className="bg-white/10 rounded-2xl p-4 mb-6 min-w-[260px]">
                <p className="text-xs text-slate-400">獲得スコア: {weedScore.toLocaleString()} pts</p>
                <p className="text-xs text-slate-400">むしった草: {weedsPulledCount} 本</p>
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                  <p className="text-xs text-emerald-300 font-bold">認定段位</p>
                  <p className="text-xl font-black text-emerald-400">{weedingBestRank}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => startGame(activeTab)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                もういちど遊ぶ
              </button>
              <button
                onClick={() => setGameState('title')}
                className="px-6 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold transition-all cursor-pointer"
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* スマホ・タッチ用操作ボタンバー */}
      <div className="w-full max-w-[800px] flex items-center justify-between px-2 pt-2 gap-2 sm:hidden">
        <div
          className="w-24 h-24 rounded-full bg-slate-800/60 border border-slate-700 relative flex items-center justify-center touch-none"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchJoystickRef.current = {
              active: true,
              startX: touch.clientX,
              startY: touch.clientY,
              dx: 0,
              dy: 0,
            };
          }}
          onTouchMove={(e) => {
            if (!touchJoystickRef.current.active) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchJoystickRef.current.startX;
            const dy = touch.clientY - touchJoystickRef.current.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxR = 35;
            touchJoystickRef.current.dx = (dx / Math.max(1, dist)) * Math.min(1, dist / maxR);
            touchJoystickRef.current.dy = (dy / Math.max(1, dist)) * Math.min(1, dist / maxR);
          }}
          onTouchEnd={() => {
            touchJoystickRef.current.active = false;
            touchJoystickRef.current.dx = 0;
            touchJoystickRef.current.dy = 0;
          }}
        >
          <div className="w-9 h-9 rounded-full bg-slate-400/80 shadow" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerAttack}
            className="w-16 h-16 rounded-full bg-rose-500 active:bg-rose-600 text-white font-black text-xs shadow-lg shadow-rose-500/40 flex flex-col items-center justify-center cursor-pointer"
          >
            <Sword className="w-5 h-5 mb-0.5" />
            攻撃
          </button>

          <button
            onClick={triggerSpecial}
            disabled={specialCooldownLeft > 0}
            className={`w-16 h-16 rounded-full text-white font-black text-xs shadow-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
              specialCooldownLeft > 0
                ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                : 'bg-amber-500 active:bg-amber-600 shadow-amber-500/40'
            }`}
          >
            <Zap className="w-5 h-5 mb-0.5" />
            {specialCooldownLeft > 0 ? `${Math.ceil(specialCooldownLeft)}s` : '必殺'}
          </button>
        </div>
      </div>

      {/* PC用操作ガイド */}
      <div className="hidden sm:flex items-center justify-center gap-6 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>移動: <strong>WASD / 矢印キー</strong></span>
        <span>攻撃: <strong>Space / J</strong></span>
        <span>必殺スキル: <strong>K / E</strong></span>
        {activeTab === 'weeding' && <span>草を直接クリックでも刈れます</span>}
      </div>
    </div>
  );
};
