import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sound } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  Settings,
  Flame,
  Download,
  Upload,
  ShoppingBag,
  TrendingUp,
  Crown,
  Check,
  Edit2,
} from 'lucide-react';

interface CookieClickerGameProps {
  onBackToHub: () => void;
  isDark: boolean;
  isFullscreen?: boolean;
}

// 施設定義
export interface Building {
  id: string;
  name: string;
  nameEn: string;
  baseCost: number;
  baseCps: number;
  icon: string;
  desc: string;
}

export const BUILDINGS: Building[] = [
  { id: 'cursor', name: 'カーソル', nameEn: 'Cursor', baseCost: 15, baseCps: 0.1, icon: '👆', desc: '10秒ごとに1回自動でクッキーをクリックします。' },
  { id: 'grandma', name: 'おばあちゃん', nameEn: 'Grandma', baseCost: 100, baseCps: 1, icon: '👵', desc: '愛情を込めておいしい手焼きクッキーを焼いてくれます。' },
  { id: 'farm', name: 'クッキー農場', nameEn: 'Farm', baseCost: 1100, baseCps: 8, icon: '🌾', desc: 'クッキーの種を蒔いて、ふっくら焼き上がったクッキーを収穫します。' },
  { id: 'mine', name: 'チョコ鉱山', nameEn: 'Mine', baseCost: 12000, baseCps: 47, icon: '⛏️', desc: '地下深くのチョコチップと純白シュガーの鉱脈を発掘します。' },
  { id: 'factory', name: 'クッキー工場', nameEn: 'Factory', baseCost: 130000, baseCps: 260, icon: '🏭', desc: '超大型のオートメーション生産ラインでクッキーを大量生産！' },
  { id: 'bank', name: 'クッキー銀行', nameEn: 'Bank', baseCost: 1400000, baseCps: 1400, icon: '🏦', desc: 'クッキー資産を運用し、複利の利息クッキーを生み出します。' },
  { id: 'temple', name: 'クッキー神殿', nameEn: 'Temple', baseCost: 20000000, baseCps: 7800, icon: '🏛️', desc: '古代のクッキー神に祈りを捧げ、天より降る甘き恵みを授かります。' },
  { id: 'wizard', name: '魔法使いの塔', nameEn: 'Wizard Tower', baseCost: 330000000, baseCps: 44000, icon: '🧙‍♂️', desc: '秘術の呪文を詠唱し、異界から焼きたてのクッキーを直接召喚します。' },
  { id: 'shipment', name: '宇宙輸送船', nameEn: 'Shipment', baseCost: 5100000000, baseCps: 260000, icon: '🚀', desc: 'クッキー小惑星帯から純度100%のクッキー資源を地球へ直送します。' },
  { id: 'alchemy', name: '錬金術ラボ', nameEn: 'Alchemy Lab', baseCost: 75000000000, baseCps: 1600000, icon: '⚗️', desc: '金やあらゆる金属を化学変換し、本物のクッキーを作り出します。' },
  { id: 'portal', name: '時空ポータル', nameEn: 'Portal', baseCost: 1000000000000, baseCps: 10000000, icon: '🌀', desc: 'クッキーバース（並行次元）への扉を開放し、無限のクッキーを吸い上げます。' },
  { id: 'timeMachine', name: 'タイムマシン', nameEn: 'Time Machine', baseCost: 14000000000000, baseCps: 65000000, icon: '⏳', desc: '過去の歴史へ跳び、人々に食べられてしまう前のクッキーを回収します。' },
  { id: 'antimatter', name: '反物質凝縮器', nameEn: 'Antimatter Condenser', baseCost: 170000000000000, baseCps: 430000000, icon: '⚛️', desc: '宇宙の反物質を凝縮・衝突させ、素粒子レベルでクッキーを創造します。' },
  { id: 'prism', name: 'クッキープリズム', nameEn: 'Prism', baseCost: 2100000000000000, baseCps: 2900000000, icon: '🌈', desc: '純粋な光そのものを屈折させ、物理的なクッキーへと凝固させます。' },
];

// アップグレード定義
export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  icon: string;
  desc: string;
  reqBuilding?: string;
  reqBuildingCount?: number;
  reqTotalCookies?: number;
  reqTotalClicks?: number;
  effectType: 'building_mult' | 'click_mult' | 'click_cps_pct' | 'global_mult' | 'golden_buff';
  targetBuilding?: string;
  multiplier?: number;
  cpsPct?: number;
}

export const UPGRADES: Upgrade[] = [
  // クリック強化
  { id: 'c_click_1', name: '強化プラスチック指', cost: 100, icon: '👆', desc: 'クリックパワーが2倍になります。', reqTotalClicks: 15, effectType: 'click_mult', multiplier: 2 },
  { id: 'c_click_2', name: 'チタン合金マウス', cost: 1000, icon: '🖱️', desc: 'クリックパワーがさらに2倍になります。', reqTotalClicks: 100, effectType: 'click_mult', multiplier: 2 },
  { id: 'c_click_3', name: '千手観音クリック', cost: 50000, icon: '🖐️', desc: '全体のCpSの1%がクリックパワーに追加されます！', reqTotalClicks: 500, effectType: 'click_cps_pct', cpsPct: 0.01 },
  { id: 'c_click_4', name: '超光速タッチ', cost: 5000000, icon: '⚡', desc: '全体のCpSの3%がクリックパワーに追加されます！', reqTotalClicks: 2000, effectType: 'click_cps_pct', cpsPct: 0.03 },

  // カーソル
  { id: 'up_cur_1', name: '強化クリック針', cost: 100, icon: '📍', desc: 'カーソルの生産効率が2倍になります。', reqBuilding: 'cursor', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'cursor', multiplier: 2 },
  { id: 'up_cur_2', name: '両利きカーソル', cost: 500, icon: '✌️', desc: 'カーソルの生産効率が2倍になります。', reqBuilding: 'cursor', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'cursor', multiplier: 2 },
  { id: 'up_cur_3', name: 'オートクリッカーPro', cost: 10000, icon: '🤖', desc: 'カーソルの生産効率が2倍になります。', reqBuilding: 'cursor', reqBuildingCount: 25, effectType: 'building_mult', targetBuilding: 'cursor', multiplier: 2 },
  { id: 'up_cur_4', name: 'サイバネティック指', cost: 100000, icon: '🦾', desc: 'カーソルの生産効率が2倍になります。', reqBuilding: 'cursor', reqBuildingCount: 50, effectType: 'building_mult', targetBuilding: 'cursor', multiplier: 2 },

  // おばあちゃん
  { id: 'up_gra_1', name: '手押しめん棒', cost: 1000, icon: '🪵', desc: 'おばあちゃんの生産効率が2倍になります。', reqBuilding: 'grandma', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'grandma', multiplier: 2 },
  { id: 'up_gra_2', name: '特製エプロン', cost: 5000, icon: '🥻', desc: 'おばあちゃんの生産効率が2倍になります。', reqBuilding: 'grandma', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'grandma', multiplier: 2 },
  { id: 'up_gra_3', name: '老舗の秘密レシピ', cost: 50000, icon: '📜', desc: 'おばあちゃんの生産効率が2倍になります。', reqBuilding: 'grandma', reqBuildingCount: 25, effectType: 'building_mult', targetBuilding: 'grandma', multiplier: 2 },
  { id: 'up_gra_4', name: '元気ハツラツ健康茶', cost: 500000, icon: '🍵', desc: 'おばあちゃんの生産効率が2倍になります。', reqBuilding: 'grandma', reqBuildingCount: 50, effectType: 'building_mult', targetBuilding: 'grandma', multiplier: 2 },

  // 農場
  { id: 'up_far_1', name: '安価な肥料', cost: 11000, icon: '🧪', desc: '農場の生産効率が2倍になります。', reqBuilding: 'farm', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'farm', multiplier: 2 },
  { id: 'up_far_2', name: 'クッキー用トラクター', cost: 55000, icon: '🚜', desc: '農場の生産効率が2倍になります。', reqBuilding: 'farm', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'farm', multiplier: 2 },
  { id: 'up_far_3', name: '遺伝子組み換え小麦', cost: 550000, icon: '🧬', desc: '農場の生産効率が2倍になります。', reqBuilding: 'farm', reqBuildingCount: 25, effectType: 'building_mult', targetBuilding: 'farm', multiplier: 2 },

  // 鉱山
  { id: 'up_min_1', name: '砂糖ピッケル', cost: 120000, icon: '⛏️', desc: 'チョコ鉱山の生産効率が2倍になります。', reqBuilding: 'mine', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'mine', multiplier: 2 },
  { id: 'up_min_2', name: 'チョコ採掘トロッコ', cost: 600000, icon: '🛒', desc: 'チョコ鉱山の生産効率が2倍になります。', reqBuilding: 'mine', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'mine', multiplier: 2 },
  { id: 'up_min_3', name: 'ダイナマイト発破', cost: 6000000, icon: '🧨', desc: 'チョコ鉱山の生産効率が2倍になります。', reqBuilding: 'mine', reqBuildingCount: 25, effectType: 'building_mult', targetBuilding: 'mine', multiplier: 2 },

  // 工場
  { id: 'up_fac_1', name: '潤滑オイル', cost: 1300000, icon: '🛢️', desc: '工場の生産効率が2倍になります。', reqBuilding: 'factory', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'factory', multiplier: 2 },
  { id: 'up_fac_2', name: 'ベルトコンベア増設', cost: 6500000, icon: '⚙️', desc: '工場の生産効率が2倍になります。', reqBuilding: 'factory', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'factory', multiplier: 2 },
  { id: 'up_fac_3', name: '全自動ロボットアーム', cost: 65000000, icon: '🦾', desc: '工場の生産効率が2倍になります。', reqBuilding: 'factory', reqBuildingCount: 25, effectType: 'building_mult', targetBuilding: 'factory', multiplier: 2 },

  // 銀行
  { id: 'up_bnk_1', name: '低金利融資', cost: 14000000, icon: '💵', desc: '銀行の生産効率が2倍になります。', reqBuilding: 'bank', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'bank', multiplier: 2 },
  { id: 'up_bnk_2', name: 'クッキー債券', cost: 70000000, icon: '📊', desc: '銀行の生産効率が2倍になります。', reqBuilding: 'bank', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'bank', multiplier: 2 },

  // 寺院
  { id: 'up_tmp_1', name: '黄金の祭壇', cost: 200000000, icon: '✨', desc: '神殿の生産効率が2倍になります。', reqBuilding: 'temple', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'temple', multiplier: 2 },
  { id: 'up_tmp_2', name: '神聖な賛美歌', cost: 1000000000, icon: '🎶', desc: '神殿の生産効率が2倍になります。', reqBuilding: 'temple', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'temple', multiplier: 2 },

  // 魔法使い
  { id: 'up_wiz_1', name: '初級魔法書', cost: 3300000000, icon: '📖', desc: '魔法使いの塔の生産効率が2倍になります。', reqBuilding: 'wizard', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'wizard', multiplier: 2 },
  { id: 'up_wiz_2', name: '星詠みの杖', cost: 16500000000, icon: '🪄', desc: '魔法使いの塔の生産効率が2倍になります。', reqBuilding: 'wizard', reqBuildingCount: 10, effectType: 'building_mult', targetBuilding: 'wizard', multiplier: 2 },

  // 宇宙船
  { id: 'up_shp_1', name: 'ワープドライブ', cost: 51000000000, icon: '🌌', desc: '宇宙輸送船の生産効率が2倍になります。', reqBuilding: 'shipment', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'shipment', multiplier: 2 },

  // 錬金術
  { id: 'up_alc_1', name: '賢者の石', cost: 750000000000, icon: '💎', desc: '錬金術ラボの生産効率が2倍になります。', reqBuilding: 'alchemy', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'alchemy', multiplier: 2 },

  // ポータル
  { id: 'up_por_1', name: '次元跳躍コア', cost: 10000000000000, icon: '🕳️', desc: '時空ポータルの生産効率が2倍になります。', reqBuilding: 'portal', reqBuildingCount: 1, effectType: 'building_mult', targetBuilding: 'portal', multiplier: 2 },

  // 全体クッキーブースト（ビスケット・クッキー類）
  { id: 'up_glb_1', name: 'チョコチップ増量', cost: 10000, icon: '🍪', desc: '全体の生産効率(CpS)が+10%上昇します。', reqTotalCookies: 5000, effectType: 'global_mult', multiplier: 1.1 },
  { id: 'up_glb_2', name: '発酵バターの芳醇な香り', cost: 100000, icon: '🧈', desc: '全体の生産効率(CpS)が+10%上昇します。', reqTotalCookies: 50000, effectType: 'global_mult', multiplier: 1.1 },
  { id: 'up_glb_3', name: 'フランス産バニラエッセンス', cost: 1000000, icon: '🌸', desc: '全体の生産効率(CpS)が+15%上昇します。', reqTotalCookies: 500000, effectType: 'global_mult', multiplier: 1.15 },
  { id: 'up_glb_4', name: '最高級ベルギーチョコレート', cost: 50000000, icon: '🍫', desc: '全体の生産効率(CpS)が+20%上昇します。', reqTotalCookies: 20000000, effectType: 'global_mult', multiplier: 1.2 },
  { id: 'up_glb_5', name: '天界のシュガークリスタル', cost: 1000000000, icon: '💎', desc: '全体の生産効率(CpS)が+25%上昇します。', reqTotalCookies: 500000000, effectType: 'global_mult', multiplier: 1.25 },

  // ゴールデンクッキー強化
  { id: 'up_gld_1', name: '四つ葉のクローバー', cost: 777777, icon: '🍀', desc: '黄金のクッキーの出現頻度が25%アップします。', reqTotalCookies: 100000, effectType: 'golden_buff', multiplier: 1.25 },
  { id: 'up_gld_2', name: '黄金のベル', cost: 77777777, icon: '🔔', desc: '黄金のクッキーのバフ効果時間が2倍になります。', reqTotalCookies: 10000000, effectType: 'golden_buff', multiplier: 2 },
];

// 実績定義
export interface Achievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
  unlockedDesc?: string;
  condition: (state: GameState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // クッキー生産量
  { id: 'ach_1', name: '最初の一枚', icon: '🍪', desc: 'クッキーを1枚焼く。', condition: (s) => s.totalCookiesEarned >= 1 },
  { id: 'ach_100', name: 'おやつタイム', icon: '☕', desc: '累計100枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 100 },
  { id: 'ach_1k', name: '焼き立てベーカリー', icon: '🥖', desc: '累計1,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 1000 },
  { id: 'ach_10k', name: 'クッキー愛好家', icon: '😋', desc: '累計10,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 10000 },
  { id: 'ach_100k', name: '菓子職人の矜持', icon: '👨‍🍳', desc: '累計100,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 100000 },
  { id: 'ach_1m', name: 'ミリオン・ベーカー', icon: '💰', desc: '累計1,000,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 1000000 },
  { id: 'ach_100m', name: 'クッキー長者', icon: '🏦', desc: '累計100,000,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 100000000 },
  { id: 'ach_1b', name: 'ビリオネア・クッキー', icon: '👑', desc: '累計1,000,000,000枚のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 1000000000 },
  { id: 'ach_1t', name: 'トリリオネア・エンパイア', icon: '🌌', desc: '累計1,000,000,000,000枚（1兆枚）のクッキーを焼く。', condition: (s) => s.totalCookiesEarned >= 1000000000000 },

  // クリック回数
  { id: 'ach_clk_1', name: 'クリッカーの第一歩', icon: '👆', desc: 'ビッグクッキーを1回クリックする。', condition: (s) => s.totalClicks >= 1 },
  { id: 'ach_clk_100', name: '連打の達人', icon: '🔥', desc: 'ビッグクッキーを累計100回クリックする。', condition: (s) => s.totalClicks >= 100 },
  { id: 'ach_clk_1000', name: '神速の指先', icon: '⚡', desc: 'ビッグクッキーを累計1,000回クリックする。', condition: (s) => s.totalClicks >= 1000 },
  { id: 'ach_clk_5000', name: 'マウスブレイカー', icon: '🖱️', desc: 'ビッグクッキーを累計5,000回クリックする。', condition: (s) => s.totalClicks >= 5000 },

  // 施設所持
  { id: 'ach_cur_1', name: '自動化の始まり', icon: '👆', desc: 'カーソルを1本購入する。', condition: (s) => (s.buildings.cursor || 0) >= 1 },
  { id: 'ach_cur_50', name: 'タップの嵐', icon: '🌪️', desc: 'カーソルを50本購入する。', condition: (s) => (s.buildings.cursor || 0) >= 50 },
  { id: 'ach_gra_1', name: '優しいおばあちゃん', icon: '👵', desc: 'おばあちゃんを1人雇う。', condition: (s) => (s.buildings.grandma || 0) >= 1 },
  { id: 'ach_gra_50', name: 'おばあちゃん大集合', icon: '👵👵', desc: 'おばあちゃんを50人雇う。', condition: (s) => (s.buildings.grandma || 0) >= 50 },
  { id: 'ach_fac_1', name: '産業革命', icon: '🏭', desc: 'クッキー工場を1軒建設する。', condition: (s) => (s.buildings.factory || 0) >= 1 },
  { id: 'ach_bnk_1', name: 'ウォール街の甘い罠', icon: '🏦', desc: 'クッキー銀行を1棟建設する。', condition: (s) => (s.buildings.bank || 0) >= 1 },
  { id: 'ach_por_1', name: '次元を超えて', icon: '🌀', desc: '時空ポータルを1基開く。', condition: (s) => (s.buildings.portal || 0) >= 1 },
  { id: 'ach_pri_1', name: '光の屈折', icon: '🌈', desc: 'クッキープリズムを1基建造する。', condition: (s) => (s.buildings.prism || 0) >= 1 },

  // 施設合計
  { id: 'ach_bld_50', name: '街の発展', icon: '🏘️', desc: '施設を合計50軒以上所有する。', condition: (s) => Object.values(s.buildings).reduce((a, b) => a + b, 0) >= 50 },
  { id: 'ach_bld_150', name: '巨大クッキー都市', icon: '🏙️', desc: '施設を合計150軒以上所有する。', condition: (s) => Object.values(s.buildings).reduce((a, b) => a + b, 0) >= 150 },

  // 秒間生産量 (CpS)
  { id: 'ach_cps_100', name: '秒速100枚', icon: '⏱️', desc: '毎秒100枚以上のクッキーを生産する。', condition: (s) => s.cps >= 100 },
  { id: 'ach_cps_10k', name: 'クッキー豪雨', icon: '🌧️', desc: '毎秒10,000枚以上のクッキーを生産する。', condition: (s) => s.cps >= 10000 },
  { id: 'ach_cps_1m', name: 'クッキー大洪水', icon: '🌊', desc: '毎秒1,000,000枚以上のクッキーを生産する。', condition: (s) => s.cps >= 1000000 },
  { id: 'ach_cps_100m', name: 'クッキー津波', icon: '🌪️', desc: '毎秒100,000,000枚以上のクッキーを生産する。', condition: (s) => s.cps >= 100000000 },

  // ゴールデンクッキー
  { id: 'ach_gld_1', name: '黄金の輝き', icon: '✨', desc: '黄金のクッキーを1回クリックする。', condition: (s) => s.goldenClicks >= 1 },
  { id: 'ach_gld_7', name: 'ラッキーセブン', icon: '🍀', desc: '黄金のクッキーを7回クリックする。', condition: (s) => s.goldenClicks >= 7 },
  { id: 'ach_gld_27', name: '黄金の錬金術師', icon: '⭐', desc: '黄金のクッキーを27回クリックする。', condition: (s) => s.goldenClicks >= 27 },

  // アップグレード購入数
  { id: 'ach_upg_5', name: '技術革新', icon: '🔬', desc: 'アップグレードを5個購入する。', condition: (s) => s.upgrades.length >= 5 },
  { id: 'ach_upg_15', name: 'ハイテクベーカリー', icon: '💡', desc: 'アップグレードを15個購入する。', condition: (s) => s.upgrades.length >= 15 },
  { id: 'ach_upg_30', name: 'クッキーの極致', icon: '🏆', desc: 'アップグレードを30個購入する。', condition: (s) => s.upgrades.length >= 30 },

  // 転生・昇天
  { id: 'ach_asc_1', name: '天界の扉', icon: '👼', desc: '初めて天界へ昇天（転生）する。', condition: (s) => s.ascensionCount >= 1 },
];

// ニュース速報一覧
export const NEWS_TICKERS = [
  '「近所のおばあちゃんが『生地の気持ちがよくわかる』と誇らしげに語る。」',
  '速報：世界的なクッキー不足の懸念は杞憂だった模様。むしろクッキーで家が建つ事態に。',
  '「専門家によると、1日3枚のクッキーで人生の幸福度が400%上昇するとのこと。」',
  'クッキー通貨が世界の主要基軸通貨を抜き去る。各中央銀行がクッキー準備金を保有。',
  'チョコチップ鉱山の坑道から「超古代の巨大クッキー壁画」が発掘される！',
  '農林水産省、新品種「メガ・チョコチップ小麦」の特許を認可。',
  'クッキー工場から漂う香ばしいバターの匂い、半径50kmの住民を多幸感に包む。',
  '「クッキー神に祈りを捧げたところ、庭からチョコソースが湧き出た」と信者が証言。',
  '天文学者、夜空に浮かぶ満月が実は巨大なバターガレットである可能性を指摘。',
  '時空の裂け目から謎のクッキーが大量に溢れ出す事件が発生。「おいしいので問題ない」と結論。',
  '宇宙望遠鏡、銀河の中心に輝く超大質量ブラックホールがクッキー型をしていることを観測。',
  '「今日のおやつは何にしよう？」という全人類の悩みが永遠に解決される。',
];

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  color: string;
  alpha: number;
}

interface ActiveBuff {
  id: string;
  type: 'frenzy' | 'click_frenzy' | 'sugar_rush';
  label: string;
  multiplier: number;
  endTime: number;
  duration: number;
  color: string;
}

interface GoldenCookieItem {
  id: number;
  x: number; // 画面%
  y: number; // 画面%
  expireTime: number;
  size: number;
}

interface GameState {
  cookies: number;
  totalCookiesEarned: number;
  prestigeCookiesEarned: number;
  totalClicks: number;
  buildings: Record<string, number>;
  upgrades: string[];
  achievements: string[];
  goldenClicks: number;
  ascensionCount: number;
  prestigeChips: number;
  cps: number;
}

const SAVE_KEY = 'cookie_clicker_save_v1';
export const COOKIE_ALL_TIME_KEY = 'cookie_clicker_all_time_v1';
export const COOKIE_PRESTIGE_KEY = 'cookie_clicker_prestige_v1';

// 数値フォーマット関数（見やすく美麗な単位）
export const formatNumber = (num: number): string => {
  if (num < 1000) return Math.floor(num).toLocaleString();
  if (num < 10000) return (Math.floor(num * 10) / 10).toLocaleString();
  if (num < 1e6) return `${(num / 1e3).toFixed(2)} 千`;
  if (num < 1e8) return `${(num / 1e4).toFixed(2)} 万`;
  if (num < 1e12) return `${(num / 1e8).toFixed(3)} 億`;
  if (num < 1e16) return `${(num / 1e12).toFixed(3)} 兆`;
  if (num < 1e20) return `${(num / 1e16).toFixed(3)} 京`;
  return `${(num / 1e20).toFixed(3)} 垓`;
};

// 英語単位版（コンパクト）
export const formatNumberEn = (num: number): string => {
  if (num < 1000) return Math.floor(num).toLocaleString();
  if (num < 1e6) return `${(num / 1e3).toFixed(1)}k`;
  if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
  if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
  if (num < 1e15) return `${(num / 1e12).toFixed(3)}T`;
  if (num < 1e18) return `${(num / 1e15).toFixed(3)}Qa`;
  return `${(num / 1e18).toFixed(3)}Qi`;
};

export const CookieClickerGame: React.FC<CookieClickerGameProps> = ({
  isDark,
  isFullscreen = false,
}) => {
  // 基本ステート
  const [cookies, setCookies] = useState<number>(0);
  const [totalCookiesEarned, setTotalCookiesEarned] = useState<number>(0);
  const [prestigeCookiesEarned, setPrestigeCookiesEarned] = useState<number>(0);
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const [goldenClicks, setGoldenClicks] = useState<number>(0);
  const [ascensionCount, setAscensionCount] = useState<number>(0);
  const [prestigeChips, setPrestigeChips] = useState<number>(0);
  const [bakeryName, setBakeryName] = useState<string>('ジェミニ');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');

  // 施設所持数
  const [buildings, setBuildings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    BUILDINGS.forEach((b) => (init[b.id] = 0));
    return init;
  });

  // 購入済みアップグレード & 解除済み実績
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<string[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

  // バフ
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);

  // 黄金のクッキー
  const [goldenCookies, setGoldenCookies] = useState<GoldenCookieItem[]>([]);

  // UI・演出ステート
  const [cookieScale, setCookieScale] = useState<number>(1);
  const [cookieRotation, setCookieRotation] = useState<number>(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [buyMultiplier, setBuyMultiplier] = useState<number | 'max'>(1);
  const [activeTab, setActiveTab] = useState<
    'cookie' | 'buildings' | 'upgrades' | 'achievements' | 'prestige' | 'stats' | 'settings'
  >(() => (typeof window !== 'undefined' && window.innerWidth < 1024 ? 'cookie' : 'buildings'));
  const [newsIndex, setNewsIndex] = useState<number>(0);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // エクスポート/インポート用モーダル
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveDataText, setSaveDataText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // 昇天確認モーダル
  const [ascendModalOpen, setAscendModalOpen] = useState<boolean>(false);

  // キャンバス描画用パーティクル
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nextTextIdRef = useRef<number>(1);
  const nextGoldenIdRef = useRef<number>(1);

  // セーブロード（localStorage）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.cookies === 'number') setCookies(data.cookies);
        if (typeof data.totalCookiesEarned === 'number') setTotalCookiesEarned(data.totalCookiesEarned);
        if (typeof data.prestigeCookiesEarned === 'number') setPrestigeCookiesEarned(data.prestigeCookiesEarned);
        if (typeof data.totalClicks === 'number') setTotalClicks(data.totalClicks);
        if (typeof data.goldenClicks === 'number') setGoldenClicks(data.goldenClicks);
        if (typeof data.ascensionCount === 'number') setAscensionCount(data.ascensionCount);
        if (typeof data.prestigeChips === 'number') setPrestigeChips(data.prestigeChips);
        if (data.bakeryName) setBakeryName(data.bakeryName);
        if (data.buildings) setBuildings((prev) => ({ ...prev, ...data.buildings }));
        if (Array.isArray(data.upgrades)) setPurchasedUpgrades(data.upgrades);
        if (Array.isArray(data.achievements)) setUnlockedAchievements(data.achievements);
      }
    } catch (e) {
      console.error('Failed to load save data', e);
    }
  }, []);

  // 定期セーブ（30秒毎）および重要ハイスコアの保存
  const saveGame = useCallback(() => {
    try {
      const stateToSave = {
        cookies,
        totalCookiesEarned,
        prestigeCookiesEarned,
        totalClicks,
        goldenClicks,
        ascensionCount,
        prestigeChips,
        bakeryName,
        buildings,
        upgrades: purchasedUpgrades,
        achievements: unlockedAchievements,
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(COOKIE_ALL_TIME_KEY, Math.floor(totalCookiesEarned).toString());
      localStorage.setItem(COOKIE_PRESTIGE_KEY, prestigeChips.toString());
    } catch (e) {
      console.error('Failed to save game', e);
    }
  }, [
    cookies,
    totalCookiesEarned,
    prestigeCookiesEarned,
    totalClicks,
    goldenClicks,
    ascensionCount,
    prestigeChips,
    bakeryName,
    buildings,
    purchasedUpgrades,
    unlockedAchievements,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      saveGame();
    }, 30000);

    const handleBeforeUnload = () => {
      saveGame();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveGame]);

  // ニュースティッカー自動切り替え
  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((prev) => (prev + 1) % NEWS_TICKERS.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // トースト表示タイマー
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  // CpS (Cookies per Second) の計算
  const currentCps = useMemo(() => {
    let baseCpsSum = 0;

    // 各施設ごとの生産量
    BUILDINGS.forEach((b) => {
      const count = buildings[b.id] || 0;
      if (count <= 0) return;

      let bMultiplier = 1;
      // 施設のアップグレード倍率
      purchasedUpgrades.forEach((upgId) => {
        const upg = UPGRADES.find((u) => u.id === upgId);
        if (upg && upg.effectType === 'building_mult' && upg.targetBuilding === b.id && upg.multiplier) {
          bMultiplier *= upg.multiplier;
        }
      });

      baseCpsSum += b.baseCps * count * bMultiplier;
    });

    // 全体倍率アップグレード
    let globalMult = 1;
    purchasedUpgrades.forEach((upgId) => {
      const upg = UPGRADES.find((u) => u.id === upgId);
      if (upg && upg.effectType === 'global_mult' && upg.multiplier) {
        globalMult *= upg.multiplier;
      }
    });

    // ヘブンリーチップスによる昇天ボーナス (+1% per chip)
    const prestigeMult = 1 + prestigeChips * 0.01;

    // Frenzy などのアクティブバフ
    let buffMult = 1;
    activeBuffs.forEach((b) => {
      if (b.type === 'frenzy') buffMult *= b.multiplier;
    });

    return baseCpsSum * globalMult * prestigeMult * buffMult;
  }, [buildings, purchasedUpgrades, prestigeChips, activeBuffs]);

  // 1クリックあたりの獲得量計算
  const clickPower = useMemo(() => {
    let baseClick = 1;

    // クリック倍率アップグレード
    purchasedUpgrades.forEach((upgId) => {
      const upg = UPGRADES.find((u) => u.id === upgId);
      if (upg && upg.effectType === 'click_mult' && upg.multiplier) {
        baseClick *= upg.multiplier;
      }
    });

    // CpSの割合加算アップグレード
    let cpsAddition = 0;
    purchasedUpgrades.forEach((upgId) => {
      const upg = UPGRADES.find((u) => u.id === upgId);
      if (upg && upg.effectType === 'click_cps_pct' && upg.cpsPct) {
        cpsAddition += currentCps * upg.cpsPct;
      }
    });

    // Click Frenzy などのバフ
    let buffMult = 1;
    activeBuffs.forEach((b) => {
      if (b.type === 'click_frenzy') buffMult *= b.multiplier;
      if (b.type === 'sugar_rush') buffMult *= b.multiplier;
    });

    return Math.max(1, (baseClick + cpsAddition) * buffMult);
  }, [purchasedUpgrades, currentCps, activeBuffs]);

  // 次の昇天で得られるヘブンリーチップス計算 (1兆ごとに算出)
  const potentialChips = useMemo(() => {
    const total = prestigeCookiesEarned;
    if (total < 1e12) return 0;
    return Math.floor(Math.cbrt(total / 1e12));
  }, [prestigeCookiesEarned]);

  // メインループ：毎秒10回 (100ms周期) でクッキー加算
  useEffect(() => {
    const interval = 100; // ms
    const timer = setInterval(() => {
      const deltaSec = interval / 1000;
      const earned = currentCps * deltaSec;

      if (earned > 0) {
        setCookies((prev) => prev + earned);
        setTotalCookiesEarned((prev) => prev + earned);
        setPrestigeCookiesEarned((prev) => prev + earned);
      }

      // バフの持続時間チェック
      const now = Date.now();
      setActiveBuffs((prev) => prev.filter((b) => b.endTime > now));

      // 黄金クッキーの有効期限チェック
      setGoldenCookies((prev) => prev.filter((g) => g.expireTime > now));
    }, interval);

    return () => clearInterval(timer);
  }, [currentCps]);

  // ゴールデンクッキーのランダム出現タイマー (約60秒〜120秒間隔)
  useEffect(() => {
    const spawnCheckInterval = setInterval(() => {
      // 画面上に既に黄金クッキーがある場合はスキップ
      if (goldenCookies.length >= 2) return;

      // 四つ葉のクローバー等の出現頻度ブースト
      const hasClover = purchasedUpgrades.includes('up_gld_1');
      const chance = hasClover ? 0.35 : 0.22;

      if (Math.random() < chance) {
        // 新しい黄金クッキーを生成
        const newCookie: GoldenCookieItem = {
          id: nextGoldenIdRef.current++,
          x: 10 + Math.random() * 80,
          y: 15 + Math.random() * 70,
          expireTime: Date.now() + 13000, // 13秒間出現
          size: 54 + Math.random() * 16,
        };
        setGoldenCookies((prev) => [...prev, newCookie]);
        if (soundEnabled) sound.playGoldenCookieSpawn();
      }
    }, 20000);

    return () => clearInterval(spawnCheckInterval);
  }, [goldenCookies.length, purchasedUpgrades, soundEnabled]);

  // 実績解除チェック
  useEffect(() => {
    const gameState: GameState = {
      cookies,
      totalCookiesEarned,
      prestigeCookiesEarned,
      totalClicks,
      buildings,
      upgrades: purchasedUpgrades,
      achievements: unlockedAchievements,
      goldenClicks,
      ascensionCount,
      prestigeChips,
      cps: currentCps,
    };

    ACHIEVEMENTS.forEach((ach) => {
      if (!unlockedAchievements.includes(ach.id)) {
        if (ach.condition(gameState)) {
          setUnlockedAchievements((prev) => [...prev, ach.id]);
          triggerToast(`🏆 実績解除！「${ach.name}」`);
          if (soundEnabled) sound.playCookieAchievement();
        }
      }
    });
  }, [
    cookies,
    totalCookiesEarned,
    prestigeCookiesEarned,
    totalClicks,
    buildings,
    purchasedUpgrades,
    unlockedAchievements,
    goldenClicks,
    ascensionCount,
    prestigeChips,
    currentCps,
    soundEnabled,
  ]);

  // キーボード操作対応（Space または Enter でビッグクッキークリック）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleCookieClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clickPower, soundEnabled]);

  // ビッグクッキークリック処理
  const handleCookieClick = (e?: React.MouseEvent | React.TouchEvent) => {
    if (soundEnabled) sound.playCookieClick();

    const gain = clickPower;
    setCookies((prev) => prev + gain);
    setTotalCookiesEarned((prev) => prev + gain);
    setPrestigeCookiesEarned((prev) => prev + gain);
    setTotalClicks((prev) => prev + 1);

    // ビッグクッキーの縮小拡大・回転アニメーション
    setCookieScale(0.92);
    setCookieRotation((prev) => prev + (Math.random() * 10 - 5));
    setTimeout(() => setCookieScale(1.05), 45);
    setTimeout(() => setCookieScale(1), 120);

    // クリック位置の取得
    let clientX = window.innerWidth / 3;
    let clientY = window.innerHeight / 2;

    if (e) {
      if ('clientX' in e && e.clientX) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    }

    // 浮遊テキスト追加
    const textId = nextTextIdRef.current++;
    const isBig = gain >= 1000;
    setFloatingTexts((prev) => [
      ...prev.slice(-15),
      {
        id: textId,
        text: `+${formatNumber(gain)}`,
        x: clientX + (Math.random() * 40 - 20),
        y: clientY - 20,
        color: isBig ? '#fbbf24' : '#ffffff',
      },
    ]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((t) => t.id !== textId));
    }, 1100);

    // キャンバス用パーティクル生成（クッキー破片）
    const colors = ['#d97706', '#b45309', '#78350f', '#fde68a', '#f59e0b'];
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        id: Math.random(),
        x: clientX,
        y: clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }
  };

  // パーティクルアニメーションループ
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // パーティクル更新・描画
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // 重力
        p.rotation += p.vRot;
        p.alpha -= 0.022;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 黄金のクッキークリック処理
  const handleGoldenCookieClick = (item: GoldenCookieItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundEnabled) sound.playGoldenCookieClick();

    setGoldenCookies((prev) => prev.filter((g) => g.id !== item.id));
    setGoldenClicks((prev) => prev + 1);

    // バフ効果時間の倍率（黄金のベル所持時）
    const durationMult = purchasedUpgrades.includes('up_gld_2') ? 2 : 1;

    // ランダムな効果抽選
    const roll = Math.random();
    if (roll < 0.45) {
      // クッキー狂乱 (Frenzy): CpS 7倍 77秒
      const dur = 77 * 1000 * durationMult;
      setActiveBuffs((prev) => [
        ...prev.filter((b) => b.type !== 'frenzy'),
        {
          id: 'frenzy_' + Date.now(),
          type: 'frenzy',
          label: 'クッキー狂乱 (Frenzy)',
          multiplier: 7,
          endTime: Date.now() + dur,
          duration: dur,
          color: 'from-amber-500 to-yellow-300',
        },
      ]);
      triggerToast('🌟 黄金のクッキー！『クッキー狂乱 (Frenzy)』発動！CpS 7倍！');
    } else if (roll < 0.8) {
      // クリック狂乱 (Click Frenzy): クリック 777倍 13秒
      const dur = 13 * 1000 * durationMult;
      setActiveBuffs((prev) => [
        ...prev.filter((b) => b.type !== 'click_frenzy'),
        {
          id: 'cfrenzy_' + Date.now(),
          type: 'click_frenzy',
          label: 'クリック狂乱 (Click Frenzy)',
          multiplier: 777,
          endTime: Date.now() + dur,
          duration: dur,
          color: 'from-rose-500 to-amber-300',
        },
      ]);
      triggerToast('🔥 黄金のクッキー！『クリック狂乱 (Click Frenzy)』！クリック力 777倍！');
    } else {
      // ラッキー！ (Lucky): 即座にクッキー獲得 (15分分のCpS または 保有の15%)
      const reward = Math.max(13, Math.min(cookies * 0.15, currentCps * 900) + 77);
      setCookies((prev) => prev + reward);
      setTotalCookiesEarned((prev) => prev + reward);
      setPrestigeCookiesEarned((prev) => prev + reward);
      triggerToast(`🍀 黄金のクッキー！『ラッキー！』+${formatNumber(reward)} クッキー獲得！`);
    }
  };

  // 施設購入計算
  const getBuildingCostInfo = useCallback(
    (b: Building, mult: number | 'max') => {
      const current = buildings[b.id] || 0;

      if (mult === 'max') {
        let count = 0;
        let totalCost = 0;
        let nextCost = b.baseCost * Math.pow(1.15, current);

        while (cookies >= totalCost + nextCost && count < 1000) {
          totalCost += nextCost;
          count++;
          nextCost = b.baseCost * Math.pow(1.15, current + count);
        }

        return {
          count: Math.max(1, count),
          totalCost: count === 0 ? b.baseCost * Math.pow(1.15, current) : totalCost,
          canAfford: count > 0,
        };
      }

      // 1, 10, 100個の場合
      let totalCost = 0;
      for (let i = 0; i < mult; i++) {
        totalCost += b.baseCost * Math.pow(1.15, current + i);
      }

      return {
        count: mult,
        totalCost,
        canAfford: cookies >= totalCost,
      };
    },
    [buildings, cookies]
  );

  // 施設購入処理
  const handleBuyBuilding = (b: Building) => {
    const info = getBuildingCostInfo(b, buyMultiplier);
    if (!info.canAfford) return;

    setCookies((prev) => Math.max(0, prev - info.totalCost));
    setBuildings((prev) => ({
      ...prev,
      [b.id]: (prev[b.id] || 0) + info.count,
    }));

    if (soundEnabled) sound.playCookieBuy();
  };

  // アップグレード購入処理
  const handleBuyUpgrade = (upg: Upgrade) => {
    if (cookies < upg.cost) return;
    if (purchasedUpgrades.includes(upg.id)) return;

    setCookies((prev) => Math.max(0, prev - upg.cost));
    setPurchasedUpgrades((prev) => [...prev, upg.id]);
    triggerToast(`✨ アップグレード購入: 「${upg.name}」`);

    if (soundEnabled) sound.playCookieUpgrade();
  };

  // 昇天（転生）実行
  const handleAscend = () => {
    if (potentialChips <= 0) return;

    if (soundEnabled) sound.playCookieAscend();

    const newChips = prestigeChips + potentialChips;
    setPrestigeChips(newChips);
    setAscensionCount((prev) => prev + 1);

    // リセット
    setCookies(0);
    setPrestigeCookiesEarned(0);
    setBuildings(() => {
      const init: Record<string, number> = {};
      BUILDINGS.forEach((b) => (init[b.id] = 0));
      return init;
    });
    setPurchasedUpgrades([]);
    setActiveBuffs([]);
    setGoldenCookies([]);
    setAscendModalOpen(false);

    triggerToast(`👼 昇天完了！新たに +${potentialChips} 個のヘブンリーチップスを獲得！`);
    saveGame();
  };

  // セーブデータエクスポート
  const handleExportSave = () => {
    saveGame();
    const currentSave = localStorage.getItem(SAVE_KEY) || '';
    setSaveDataText(currentSave);
    setSaveModalOpen(true);
    setCopied(false);
  };

  // セーブデータインポート
  const handleImportSave = () => {
    try {
      const parsed = JSON.parse(saveDataText.trim());
      if (typeof parsed.cookies === 'number') {
        localStorage.setItem(SAVE_KEY, saveDataText.trim());
        window.location.reload();
      } else {
        alert('セーブデータの形式が正しくありません。');
      }
    } catch {
      alert('セーブデータの解析に失敗しました。');
    }
  };

  // リセット
  const handleHardReset = () => {
    if (window.confirm('本当にすべてのデータをリセットしますか？この操作は取り消せません！')) {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(COOKIE_ALL_TIME_KEY);
      localStorage.removeItem(COOKIE_PRESTIGE_KEY);
      window.location.reload();
    }
  };

  // ミルク割合の計算（実績解除数 / 全実績数）
  const milkPercentage = Math.min(100, Math.floor((unlockedAchievements.length / ACHIEVEMENTS.length) * 100));

  // 購入可能なアップグレード一覧
  const availableUpgrades = useMemo(() => {
    return UPGRADES.filter((upg) => {
      if (purchasedUpgrades.includes(upg.id)) return false;
      if (upg.reqBuilding && (buildings[upg.reqBuilding] || 0) < (upg.reqBuildingCount || 1)) return false;
      if (upg.reqTotalCookies && totalCookiesEarned < upg.reqTotalCookies) return false;
      if (upg.reqTotalClicks && totalClicks < upg.reqTotalClicks) return false;
      return true;
    });
  }, [purchasedUpgrades, buildings, totalCookiesEarned, totalClicks]);

  return (
    <div
      className={`relative w-full h-full min-h-screen flex flex-col select-none overflow-hidden ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-amber-50/60 text-slate-800'
      }`}
    >
      {/* 背景パーティクル描画用キャンバス */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-40" />

      {/* 浮遊テキストレイヤー */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.x}px`, top: `${item.y}px`, color: item.color }}
            className="absolute font-black text-2xl drop-shadow-md animate-out fade-out slide-out-to-top-12 duration-1000"
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* 黄金のクッキー出現レイヤー */}
      {goldenCookies.map((item) => (
        <div
          key={item.id}
          onClick={(e) => handleGoldenCookieClick(item, e)}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.size}px`,
            height: `${item.size}px`,
          }}
          className="fixed z-50 cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 animate-pulse"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* オーラ発光 */}
            <div className="absolute inset-0 rounded-full bg-yellow-400 blur-md opacity-80 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 shadow-2xl border-2 border-yellow-100 flex items-center justify-center">
              <span className="text-2xl drop-shadow">🍪</span>
              <div className="absolute top-1 right-2 text-xs">✨</div>
            </div>
          </div>
        </div>
      ))}

      {/* トースト通知 */}
      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-slate-900/90 text-white font-bold text-sm shadow-2xl border border-amber-400/50 backdrop-blur flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <span>{showToast}</span>
        </div>
      )}

      {/* ヘッダー・トップバー */}
      <header
        className={`w-full shrink-0 px-4 py-2.5 flex items-center justify-between border-b backdrop-blur z-20 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-amber-200 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🍪</span>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                {isEditingName ? (
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => {
                      if (nameInput.trim()) setBakeryName(nameInput.trim());
                      setIsEditingName(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (nameInput.trim()) setBakeryName(nameInput.trim());
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    maxLength={15}
                    className="px-1.5 py-0.5 rounded text-xs font-bold border border-amber-400 bg-transparent"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setNameInput(bakeryName);
                      setIsEditingName(true);
                    }}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                    title="クリックしてベーカリー名を編集"
                  >
                    {bakeryName}のベーカリー <Edit2 className="w-3 h-3 opacity-60" />
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight">クッキークリッカー</h1>
            </div>
          </div>
        </div>

        {/* ニュース速報ティッカー */}
        <div className="hidden sm:flex flex-1 max-w-xl mx-4 items-center justify-center">
          <div
            onClick={() => setNewsIndex((prev) => (prev + 1) % NEWS_TICKERS.length)}
            className={`w-full px-3 py-1.5 rounded-full text-xs truncate text-center border font-medium transition-all cursor-pointer hover:border-amber-400 ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-amber-100/50 border-amber-200 text-amber-800 hover:text-amber-950'
            }`}
            title="クリックして次のニュースを表示"
          >
            📰 {NEWS_TICKERS[newsIndex]}
          </div>
        </div>

        {/* コントロールボタン群 */}
        <div className="flex items-center space-x-1.5">
          {/* 天界チップス表示 */}
          {prestigeChips > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center space-x-1">
              <span>👼</span>
              <span>+{prestigeChips}%</span>
            </div>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-amber-100 border-amber-200'
            }`}
            title={soundEnabled ? 'サウンドミュート' : 'サウンド有効化'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            onClick={handleExportSave}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-amber-100 border-amber-200'
            }`}
            title="セーブ・ロード"
          >
            <Settings className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </header>

      {/* アクティブバフ通知バー（Frenzy中など） */}
      {activeBuffs.length > 0 && (
        <div className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white font-bold text-xs py-1 px-4 flex items-center justify-center space-x-4 shadow-md animate-pulse">
          {activeBuffs.map((buff) => {
            const remSec = Math.max(0, Math.ceil((buff.endTime - Date.now()) / 1000));
            return (
              <div key={buff.id} className="flex items-center space-x-1">
                <span>⚡ {buff.label}！</span>
                <span className="bg-black/30 px-2 py-0.5 rounded-full text-[11px] font-mono">{remSec}秒</span>
              </div>
            );
          })}
        </div>
      )}

      {/* メインゲームエリア：フルスクリーン時は幅上限解除＆画面フル活用 */}
      <main
        className={`flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden ${
          isFullscreen ? 'h-[calc(100vh-60px)]' : 'max-w-7xl mx-auto h-[calc(100vh-64px)]'
        }`}
      >
        {/* ===================== 左ペイン (ビッグクッキー ＆ クリックエリア) ===================== */}
        <section
          className={`${
            activeTab === 'cookie' ? 'flex' : 'hidden'
          } lg:flex col-span-1 lg:col-span-4 flex-col items-center justify-between p-4 relative border-r overflow-hidden ${
            isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-amber-50/40 border-amber-200/80'
          }`}
        >
          {/* 上部：クッキー保有数＆秒間生産量カウンター */}
          <div className="w-full text-center my-2 z-10">
            <div className="text-xs uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 mb-1">
              保有クッキー
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-amber-500 drop-shadow-sm font-mono">
              {formatNumber(cookies)}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center space-x-1">
              <span>毎秒:</span>
              <span className="text-amber-600 dark:text-amber-300 font-mono font-black">{formatNumber(currentCps)}</span>
              <span>CpS</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              1クリック: <span className="font-mono font-bold text-amber-500">+{formatNumber(clickPower)}</span>
            </div>
          </div>

          {/* 中央：超リアル・ビッグクッキー（フルスクリーン時はダイナミック拡大！） */}
          <div className="relative flex-1 w-full flex items-center justify-center my-4 z-10">
            {/* クッキー背後の光輪エフェクト */}
            <div
              className={`absolute rounded-full pointer-events-none transition-all duration-700 ${
                activeBuffs.length > 0
                  ? 'w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-r from-amber-400/40 to-yellow-300/40 blur-2xl animate-spin'
                  : 'w-60 h-60 sm:w-80 sm:h-80 bg-amber-500/10 blur-xl'
              }`}
            />

            {/* 周回する自動カーソルたち */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {Array.from({ length: Math.min(16, buildings.cursor || 0) }).map((_, idx) => {
                const total = Math.min(16, buildings.cursor || 0);
                const angle = (idx / total) * 360;
                const radius = isFullscreen ? 160 : 130;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                return (
                  <div
                    key={idx}
                    style={{
                      transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                    }}
                    className="absolute text-xl sm:text-2xl transition-all duration-500 animate-bounce"
                  >
                    👆
                  </div>
                );
              })}
            </div>

            {/* ビッグクッキー本体 */}
            <button
              onClick={handleCookieClick}
              style={{
                transform: `scale(${cookieScale}) rotate(${cookieRotation}deg)`,
                transition: 'transform 0.06s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              className={`relative group rounded-full cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-400/30 touch-manipulation active:scale-95 ${
                isFullscreen
                  ? 'w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96'
                  : 'w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72'
              }`}
              title="クリックしてクッキーを焼く！（SpaceキーでもOK）"
            >
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full drop-shadow-2xl filter group-hover:brightness-105"
              >
                <defs>
                  {/* クッキーの生地グラデーション */}
                  <radialGradient id="cookieBase" cx="40%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="90%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>

                  {/* チョコチップグラデーション */}
                  <radialGradient id="chocoGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#451a03" />
                    <stop offset="80%" stopColor="#271005" />
                    <stop offset="100%" stopColor="#150600" />
                  </radialGradient>
                </defs>

                {/* クッキーの外枠と凹凸輪郭 */}
                <circle cx="100" cy="100" r="92" fill="url(#cookieBase)" />

                {/* 表面の焼きヒビ */}
                <path
                  d="M 50 60 Q 65 75 75 70 T 110 75"
                  stroke="#92400e"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M 115 120 Q 130 135 145 125 T 160 140"
                  stroke="#92400e"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M 70 140 Q 85 155 105 145"
                  stroke="#92400e"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                />

                {/* チョコチップ群 */}
                <ellipse cx="65" cy="65" rx="13" ry="10" fill="url(#chocoGrad)" transform="rotate(-15 65 65)" />
                <ellipse cx="135" cy="60" rx="14" ry="11" fill="url(#chocoGrad)" transform="rotate(25 135 60)" />
                <ellipse cx="98" cy="100" rx="16" ry="13" fill="url(#chocoGrad)" transform="rotate(10 98 100)" />
                <ellipse cx="55" cy="125" rx="14" ry="11" fill="url(#chocoGrad)" transform="rotate(-30 55 125)" />
                <ellipse cx="140" cy="125" rx="15" ry="12" fill="url(#chocoGrad)" transform="rotate(40 140 125)" />
                <ellipse cx="95" cy="160" rx="12" ry="9" fill="url(#chocoGrad)" transform="rotate(5 95 160)" />
                <ellipse cx="155" cy="95" rx="10" ry="8" fill="url(#chocoGrad)" transform="rotate(-10 155 95)" />
                <ellipse cx="40" cy="95" rx="9" ry="8" fill="url(#chocoGrad)" transform="rotate(20 40 95)" />
                <ellipse cx="105" cy="40" rx="10" ry="7" fill="url(#chocoGrad)" transform="rotate(-5 105 40)" />

                {/* チョコチップのハイライト */}
                <circle cx="62" cy="62" r="2.5" fill="#78350f" opacity="0.6" />
                <circle cx="95" cy="97" r="3" fill="#78350f" opacity="0.6" />
                <circle cx="137" cy="122" r="3" fill="#78350f" opacity="0.6" />
              </svg>
            </button>
          </div>

          {/* 下部：ミルク水面アニメーション（実績解除数で水位上昇） */}
          <div className="w-full relative h-16 sm:h-20 rounded-2xl overflow-hidden border border-amber-200/50 dark:border-slate-800 mt-2 bg-gradient-to-b from-transparent to-amber-100/30">
            <div
              style={{ height: `${Math.max(25, milkPercentage)}%` }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-amber-50 to-white/90 transition-all duration-1000 shadow-inner flex items-center justify-between px-4 text-xs font-bold text-amber-900"
            >
              <span>🥛 ミルク</span>
              <div className="flex items-center space-x-1">
                <span>{milkPercentage}%</span>
                <span className="text-sm">🐥</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 中央ペイン (施設稼働ビジュアル ＆ アニメーション) ===================== */}
        <section
          className={`hidden md:flex col-span-1 lg:col-span-4 flex-col p-4 border-r overflow-y-auto ${
            isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-amber-50/20 border-amber-200/80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              稼働中のクッキー施設
            </h2>
            <span className="text-xs font-mono font-bold text-slate-500">
              合計 {Object.values(buildings).reduce((a, b) => a + b, 0)} 軒
            </span>
          </div>

          {/* 各施設の稼働状況・アニメーション行 */}
          <div className="flex-1 flex flex-col space-y-2">
            {BUILDINGS.map((b) => {
              const count = buildings[b.id] || 0;
              if (count <= 0) return null;

              return (
                <div
                  key={b.id}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-amber-200/70 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <span className="text-base">{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">×{count}</span>
                  </div>

                  {/* 施設のアニメーションアイコン並び */}
                  <div className="flex flex-wrap gap-1 items-center max-h-16 overflow-hidden">
                    {Array.from({ length: Math.min(24, count) }).map((_, i) => (
                      <span
                        key={i}
                        style={{
                          animationDelay: `${(i % 5) * 0.2}s`,
                        }}
                        className="text-sm inline-block hover:scale-125 transition-transform"
                        title={`${b.name} #${i + 1}`}
                      >
                        {b.icon}
                      </span>
                    ))}
                    {count > 24 && (
                      <span className="text-[10px] font-bold text-slate-400 self-center">+{count - 24}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {Object.values(buildings).reduce((a, b) => a + b, 0) === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-4xl mb-2">🏭</span>
                <p className="text-xs font-bold">まだ施設がありません</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  右側のショップから「カーソル」や「おばあちゃん」を購入してみましょう！
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ===================== 右ペイン (ショップ・アップグレード・実績・転生・統計) ===================== */}
        <section
          className={`${
            activeTab !== 'cookie' ? 'flex' : 'hidden'
          } lg:flex col-span-1 lg:col-span-4 flex-col h-full overflow-hidden`}
        >
          {/* 上部タブバー */}
          <div
            className={`flex items-center justify-between px-2 py-2 border-b shrink-0 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-amber-200'
            }`}
          >
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('buildings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'buildings'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>施設</span>
              </button>

              <button
                onClick={() => setActiveTab('upgrades')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer relative ${
                  activeTab === 'upgrades'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>強化</span>
                {availableUpgrades.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                    {availableUpgrades.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'achievements'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>実績</span>
              </button>

              <button
                onClick={() => setActiveTab('prestige')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'prestige'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>昇天</span>
              </button>

              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>統計</span>
              </button>
            </div>

            {/* まとめ買い倍率セレクター (1 / 10 / 100 / MAX) */}
            {activeTab === 'buildings' && (
              <div className="flex items-center space-x-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-bold">
                {([1, 10, 100, 'max'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBuyMultiplier(m)}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                      buyMultiplier === m
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {m === 'max' ? 'MAX' : `×${m}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* コンテンツ表示エリア */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* 1. 施設一覧タブ */}
            {activeTab === 'buildings' && (
              <div className="flex flex-col space-y-2">
                {BUILDINGS.map((b) => {
                  const current = buildings[b.id] || 0;
                  const costInfo = getBuildingCostInfo(b, buyMultiplier);

                  return (
                    <div
                      key={b.id}
                      onClick={() => handleBuyBuilding(b)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        costInfo.canAfford
                          ? isDark
                            ? 'bg-slate-900/90 hover:bg-slate-850 border-slate-700/80 hover:border-amber-500/50 shadow-sm'
                            : 'bg-white hover:bg-amber-50/80 border-amber-200/90 hover:border-amber-400 shadow-sm'
                          : 'opacity-50 grayscale hover:grayscale-0 cursor-not-allowed border-dashed ' +
                            (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/60 border-slate-200')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl shrink-0">
                          {b.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm">{b.name}</span>
                            <span className="text-[10px] text-slate-400">{b.nameEn}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-xs mt-0.5">
                            <span className="text-amber-500 font-bold font-mono">
                              🍪 {formatNumber(costInfo.totalCost)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (買 +{costInfo.count})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black font-mono text-amber-500">
                          {current}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          +{formatNumber(b.baseCps * (buildings[b.id] || 0))} CpS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. アップグレード一覧タブ */}
            {activeTab === 'upgrades' && (
              <div className="flex flex-col space-y-2">
                <div className="text-xs font-bold text-slate-400 mb-1">
                  アンロックされた強化 ({availableUpgrades.length} 件)
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {availableUpgrades.map((upg) => {
                    const canAfford = cookies >= upg.cost;
                    return (
                      <div
                        key={upg.id}
                        onClick={() => handleBuyUpgrade(upg)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          canAfford
                            ? isDark
                              ? 'bg-slate-900/90 hover:bg-slate-850 border-amber-500/40 hover:border-amber-400 shadow-md'
                              : 'bg-white hover:bg-amber-50 border-amber-300 hover:border-amber-500 shadow-sm'
                            : 'opacity-50 cursor-not-allowed ' +
                              (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200')
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                            {upg.icon}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs">{upg.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                              {upg.desc}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <div className="text-xs font-black font-mono text-amber-500">
                            🍪 {formatNumber(upg.cost)}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                              canAfford ? 'bg-amber-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            購入
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {availableUpgrades.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      現在購入可能な強化はありません。クッキーを焼くか施設を増やしてアンロックしましょう！
                    </div>
                  )}
                </div>

                {/* 購入済みアップグレード */}
                {purchasedUpgrades.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-400 mb-2">
                      購入済み ({purchasedUpgrades.length} / {UPGRADES.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {purchasedUpgrades.map((id) => {
                        const upg = UPGRADES.find((u) => u.id === id);
                        if (!upg) return null;
                        return (
                          <div
                            key={id}
                            className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm"
                            title={`${upg.name}: ${upg.desc}`}
                          >
                            {upg.icon}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. 実績タブ */}
            {activeTab === 'achievements' && (
              <div className="flex flex-col space-y-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">実績達成度</div>
                    <div className="text-xl font-black text-amber-500">
                      {unlockedAchievements.length} / {ACHIEVEMENTS.length}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400">ミルク濃度</div>
                    <div className="text-xl font-black text-amber-500">{milkPercentage}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {ACHIEVEMENTS.map((ach) => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center space-x-3 ${
                          isUnlocked
                            ? isDark
                              ? 'bg-slate-900 border-amber-500/40 shadow-xs'
                              : 'bg-white border-amber-300 shadow-xs'
                            : 'opacity-40 grayscale ' +
                              (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200')
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            isUnlocked
                              ? 'bg-amber-500/20 border border-amber-500/40'
                              : 'bg-slate-300 dark:bg-slate-800'
                          }`}
                        >
                          {isUnlocked ? ach.icon : '❓'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs">{ach.name}</span>
                            {isUnlocked && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ach.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. 昇天（転生）タブ */}
            {activeTab === 'prestige' && (
              <div className="flex flex-col space-y-4 p-2 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 mx-auto flex items-center justify-center text-3xl shadow-lg animate-pulse">
                  👼
                </div>

                <div>
                  <h3 className="text-base font-extrabold">天界への昇天 (Prestige)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    現在のクッキー帝国を天界へ捧げ、永続するヘブンリーチップスを獲得して「強くてニューゲーム」を行います。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">現在のチップ数:</span>
                    <span className="font-mono font-bold text-indigo-400">{prestigeChips} チップ</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">永続CpSボーナス:</span>
                    <span className="font-mono font-bold text-emerald-400">+{prestigeChips}%</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-indigo-500/20 pt-2">
                    <span className="font-bold text-amber-500">昇天で得られるチップ:</span>
                    <span className="font-mono font-black text-amber-500 text-sm">
                      +{potentialChips} チップ
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setAscendModalOpen(true)}
                  disabled={potentialChips <= 0}
                  className={`w-full py-3 rounded-2xl font-black text-xs transition-all shadow-md cursor-pointer ${
                    potentialChips > 0
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {potentialChips > 0 ? `天界へ昇天する (+${potentialChips} チップ)` : 'クッキーが足りません (要: 累計1兆枚)'}
                </button>
              </div>
            )}

            {/* 5. 統計タブ */}
            {activeTab === 'stats' && (
              <div className="flex flex-col space-y-3">
                <div className="text-xs font-bold text-slate-400 mb-1">ベーカリー統計</div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">現在の所持クッキー:</span>
                    <span className="font-mono font-bold text-amber-500">{formatNumber(cookies)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">今回の周回の累計生産:</span>
                    <span className="font-mono font-bold">{formatNumber(prestigeCookiesEarned)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">全時代の累計総生産量:</span>
                    <span className="font-mono font-bold text-amber-400">{formatNumber(totalCookiesEarned)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">総クリック回数:</span>
                    <span className="font-mono font-bold">{totalClicks.toLocaleString()} 回</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">黄金クッキークリック数:</span>
                    <span className="font-mono font-bold text-yellow-400">{goldenClicks.toLocaleString()} 回</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">転生・昇天回数:</span>
                    <span className="font-mono font-bold text-purple-400">{ascensionCount} 回</span>
                  </div>
                  <div className="p-2.5 rounded-xl border flex justify-between dark:bg-slate-900/50 dark:border-slate-800">
                    <span className="text-slate-400">施設総保有数:</span>
                    <span className="font-mono font-bold">
                      {Object.values(buildings).reduce((a, b) => a + b, 0)} 個
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex space-x-2">
                  <button
                    onClick={() => {
                      saveGame();
                      triggerToast('💾 手動セーブを完了しました！');
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    今すぐセーブ
                  </button>
                  <button
                    onClick={handleHardReset}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold text-xs border border-rose-500/30 cursor-pointer"
                  >
                    初期化
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* モバイル用ボトムナビゲーションバー (lg未満で表示) */}
      <nav
        className={`lg:hidden shrink-0 w-full px-2 py-2 border-t flex items-center justify-around z-30 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-amber-200 shadow-lg'
        }`}
      >
        <button
          onClick={() => setActiveTab('cookie')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'cookie'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">🍪</span>
          <span className="mt-0.5">クッキー</span>
        </button>

        <button
          onClick={() => setActiveTab('buildings')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'buildings'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">🏭</span>
          <span className="mt-0.5">施設</span>
        </button>

        <button
          onClick={() => setActiveTab('upgrades')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer relative ${
            activeTab === 'upgrades'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">✨</span>
          <span className="mt-0.5">強化</span>
          {availableUpgrades.length > 0 && (
            <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[9px] flex items-center justify-center">
              {availableUpgrades.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'achievements'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">🏆</span>
          <span className="mt-0.5">実績</span>
        </button>

        <button
          onClick={() => setActiveTab('prestige')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'prestige'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">👼</span>
          <span className="mt-0.5">昇天</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'stats'
              ? 'text-amber-500 scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base leading-none">📊</span>
          <span className="mt-0.5">統計</span>
        </button>
      </nav>

      {/* 昇天確認モーダル */}
      {ascendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 text-center ${
              isDark ? 'bg-slate-900 border-indigo-500/40 text-slate-100' : 'bg-white border-indigo-300 text-slate-800'
            }`}
          >
            <div className="text-4xl">👼✨</div>
            <h3 className="text-lg font-black">天界へ昇天しますか？</h3>
            <p className="text-xs text-slate-400">
              現在のクッキー保有数、施設、通常アップグレードはリセットされますが、新たに{' '}
              <strong className="text-indigo-400 font-bold">+{potentialChips} 個のヘブンリーチップス</strong>{' '}
              を獲得し、次回のプレイで全CpSが永続強化されます！
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setAscendModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-800 font-bold text-xs transition cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleAscend}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                昇天を実行する！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* セーブ・ロード設定モーダル */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-500" />
                データ管理（エクスポート / インポート）
              </h3>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              以下のテキストをコピーして別の端末に引き継ぐか、保存したテキストを貼り付けてインポートできます。
            </p>

            <textarea
              value={saveDataText}
              onChange={(e) => setSaveDataText(e.target.value)}
              rows={5}
              className="w-full p-2.5 rounded-xl font-mono text-[11px] border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(saveDataText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs border border-slate-700 flex items-center justify-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{copied ? 'コピーしました！' : 'テキストをコピー'}</span>
              </button>

              <button
                onClick={handleImportSave}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>テキストから読み込む</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
