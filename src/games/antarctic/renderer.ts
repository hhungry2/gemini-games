// けっきょく南極大冒険 HTML5 Canvas 2D レンダラー (Renderer)

import {
  PlayerState,
  AntarcticWorldState,
  Obstacle,
  ItemFlag,
  Particle,
  FloatingText,
  StageConfig,
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HORIZON_Y,
  project3D,
  PLAYER_Z,
} from './physics';

/**
 * メイン描画エントリーポイント
 */
export function renderAntarcticGame(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  world: AntarcticWorldState,
  score: number,
  highScore: number,
  loopState: string
) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. 空と遠景の描画
  renderSky(ctx, world.stage.weather, world.curveOffset);

  // 2. 氷原と道路の描画
  renderIceField(ctx, player, world);

  // 3. ゴール基地（近づいた場合）
  if (world.stationVisible) {
    renderStation(ctx, world.stationZ, world.stage, world.curveOffset);
  }

  // 4. 障害物とアイテムの描画 (Z順ソート: 遠いものから描画)
  renderEntities(ctx, world);

  // 5. プレイヤー（ペン太）の描画
  renderPlayer(ctx, player, world, loopState);

  // 6. パーティクル & エフェクト
  renderParticles(ctx, world.particles);

  // 7. フローティングテキスト
  renderFloatingTexts(ctx, world.floatingTexts);

  // 8. HUD & ミニマップ
  renderHUD(ctx, player, world, score, highScore);

  ctx.restore();
}

/** 空・背景の描画 */
function renderSky(
  ctx: CanvasRenderingContext2D,
  weather: StageConfig['weather'],
  curveOffset: number
) {
  const skyH = HORIZON_Y;
  const gradient = ctx.createLinearGradient(0, 0, 0, skyH);

  if (weather === 'day') {
    // 爽快な南極の青空
    gradient.addColorStop(0, '#0284c7');
    gradient.addColorStop(0.7, '#38bdf8');
    gradient.addColorStop(1, '#bae6fd');
  } else if (weather === 'sunset') {
    // 幻想的な夕焼け
    gradient.addColorStop(0, '#4c1d95');
    gradient.addColorStop(0.4, '#c026d3');
    gradient.addColorStop(0.75, '#f97316');
    gradient.addColorStop(1, '#fef08a');
  } else if (weather === 'aurora') {
    // 極夜と星空
    gradient.addColorStop(0, '#030712');
    gradient.addColorStop(0.5, '#0c1a30');
    gradient.addColorStop(1, '#112948');
  } else {
    // blizzard (吹雪)
    gradient.addColorStop(0, '#475569');
    gradient.addColorStop(0.6, '#94a3b8');
    gradient.addColorStop(1, '#e2e8f0');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, skyH);

  // 星（aurora時）
  if (weather === 'aurora') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5) % CANVAS_WIDTH);
      const sy = ((i * 73.1) % (skyH - 30));
      const r = (i % 3 === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // オーロラ光のカーテン
    const time = Date.now() * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let j = 0; j < 3; j++) {
      const auroraGrad = ctx.createLinearGradient(0, 20 + j * 20, 0, skyH);
      if (j === 0) {
        auroraGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
        auroraGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.6)');
        auroraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else if (j === 1) {
        auroraGrad.addColorStop(0, 'rgba(192, 132, 252, 0)');
        auroraGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.5)');
        auroraGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
      } else {
        auroraGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        auroraGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.4)');
        auroraGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      }
      ctx.fillStyle = auroraGrad;
      ctx.beginPath();
      ctx.moveTo(0, skyH);
      for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
        const wave = Math.sin(x * 0.012 + time * 1.5 + j) * 25 + Math.cos(x * 0.007 - time) * 15;
        ctx.lineTo(x, 40 + j * 30 + wave);
      }
      ctx.lineTo(CANVAS_WIDTH, skyH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 太陽 / 月
  if (weather === 'day' || weather === 'sunset') {
    const sunX = CANVAS_WIDTH * 0.72 - curveOffset * 25;
    const sunY = weather === 'sunset' ? skyH - 22 : 55;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, weather === 'sunset' ? 60 : 45);
    sunGrad.addColorStop(0, weather === 'sunset' ? '#ffedd5' : '#ffffff');
    sunGrad.addColorStop(0.3, weather === 'sunset' ? '#f97316' : '#fef08a');
    sunGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  // 遠くの氷山・山並み (パララックス)
  ctx.save();
  const mountainOffset = -curveOffset * 40;
  ctx.fillStyle = weather === 'sunset' ? '#7e22ce' : weather === 'aurora' ? '#1e3a5f' : '#93c5fd';
  ctx.beginPath();
  ctx.moveTo(0, skyH);
  const mountainPoints = [
    [0, 25], [90, 65], [160, 30], [240, 80], [330, 40], [420, 95],
    [510, 35], [600, 75], [680, 20], [750, 60], [800, 30]
  ];
  for (const pt of mountainPoints) {
    ctx.lineTo(pt[0] + mountainOffset * 0.4, skyH - pt[1] * 0.5);
  }
  ctx.lineTo(CANVAS_WIDTH, skyH);
  ctx.closePath();
  ctx.fill();

  // 手前の白い雪山
  ctx.fillStyle = weather === 'sunset' ? '#fed7aa' : weather === 'aurora' ? '#e2e8f0' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, skyH);
  const frontPeaks = [
    [0, 10], [70, 35], [140, 15], [210, 48], [300, 22], [380, 55],
    [470, 18], [560, 42], [650, 12], [720, 38], [800, 15]
  ];
  for (const pt of frontPeaks) {
    ctx.lineTo(pt[0] + mountainOffset * 0.7, skyH - pt[1] * 0.6);
  }
  ctx.lineTo(CANVAS_WIDTH, skyH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 氷原と道路の描画 */
function renderIceField(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  world: AntarcticWorldState
) {
  // 氷原ベースグラデーション
  const groundGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_HEIGHT);
  if (world.stage.weather === 'sunset') {
    groundGrad.addColorStop(0, '#fed7aa');
    groundGrad.addColorStop(0.4, '#fdba74');
    groundGrad.addColorStop(1, '#f97316');
  } else if (world.stage.weather === 'aurora') {
    groundGrad.addColorStop(0, '#93c5fd');
    groundGrad.addColorStop(0.5, '#bfdbfe');
    groundGrad.addColorStop(1, '#e0f2fe');
  } else {
    groundGrad.addColorStop(0, '#dbeafe');
    groundGrad.addColorStop(0.3, '#eff6ff');
    groundGrad.addColorStop(1, '#ffffff');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, HORIZON_Y, CANVAS_WIDTH, CANVAS_HEIGHT - HORIZON_Y);

  // 擬似3D道路のストライプ・パース描画
  const totalStripes = 28;
  const animOffset = (player.distanceTraveledKm * 60) % 1;

  for (let i = 0; i < totalStripes; i++) {
    const norm = (i + animOffset) / totalStripes;
    const normNext = (i + 1 + animOffset) / totalStripes;

    const z1 = norm * 300;
    const z2 = normNext * 300;

    const p1 = project3D(0, z1, world.curveOffset);
    const p2 = project3D(0, z2, world.curveOffset);

    if (!p1.visible || !p2.visible) continue;

    // 交互に色を変える氷のラスタースクロール
    const isAlt = i % 2 === 0;
    if (isAlt) {
      ctx.fillStyle = world.stage.weather === 'sunset' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(0, p1.screenY, CANVAS_WIDTH, Math.max(1, p2.screenY - p1.screenY));
    }

    // 道路両端の雪山ガイドポール
    const leftProj = project3D(-0.95, z1, world.curveOffset);
    const rightProj = project3D(0.95, z1, world.curveOffset);

    if (leftProj.visible && i % 3 === 0) {
      const poleH = 28 * leftProj.scale;
      // 左ポール（赤白）
      ctx.fillStyle = i % 6 === 0 ? '#ef4444' : '#ffffff';
      ctx.fillRect(leftProj.screenX - 1.5 * leftProj.scale, leftProj.screenY - poleH, 3 * leftProj.scale, poleH);
      // 右ポール（黄黒）
      ctx.fillStyle = i % 6 === 0 ? '#f59e0b' : '#1e293b';
      ctx.fillRect(rightProj.screenX - 1.5 * rightProj.scale, rightProj.screenY - poleH, 3 * rightProj.scale, poleH);
    }
  }

  // 氷のひび割れライン (奥から手前へ)
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
  ctx.lineWidth = 1.5;
  for (let lane = -0.6; lane <= 0.6; lane += 0.4) {
    ctx.beginPath();
    let started = false;
    for (let z = 280; z >= 25; z -= 30) {
      const p = project3D(lane, z, world.curveOffset);
      if (p.visible) {
        if (!started) {
          ctx.moveTo(p.screenX, p.screenY);
          started = true;
        } else {
          ctx.lineTo(p.screenX, p.screenY);
        }
      }
    }
    ctx.stroke();
  }
}

/** ゴール基地の描画 */
function renderStation(
  ctx: CanvasRenderingContext2D,
  z: number,
  stage: StageConfig,
  curveOffset: number
) {
  const proj = project3D(0, z, curveOffset);
  if (!proj.visible) return;

  const scale = proj.scale;
  const cx = proj.screenX;
  const cy = proj.screenY;

  ctx.save();

  // 基地のドーム型観測棟
  const bldgW = 160 * scale;
  const bldgH = 75 * scale;
  ctx.fillStyle = stage.stationColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy - bldgH * 0.4, bldgW * 0.5, bldgH * 0.5, 0, Math.PI, 0);
  ctx.fill();

  // 観測ドームの窓
  ctx.fillStyle = '#0f172a';
  for (let w = -3; w <= 3; w++) {
    const wx = cx + w * 18 * scale;
    const wy = cy - 25 * scale;
    ctx.fillRect(wx - 4 * scale, wy, 8 * scale, 12 * scale);
  }

  // アンテナタワー
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(cx + 45 * scale, cy - bldgH * 0.4);
  ctx.lineTo(cx + 45 * scale, cy - bldgH * 1.4);
  ctx.moveTo(cx + 35 * scale, cy - bldgH * 1.2);
  ctx.lineTo(cx + 55 * scale, cy - bldgH * 1.2);
  ctx.stroke();

  // 国旗ポール & 国旗
  const poleX = cx - 60 * scale;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = Math.max(1, 2.5 * scale);
  ctx.beginPath();
  ctx.moveTo(poleX, cy);
  ctx.lineTo(poleX, cy - bldgH * 1.5);
  ctx.stroke();

  // 国旗
  const flagW = 34 * scale;
  const flagH = 22 * scale;
  ctx.fillStyle = stage.flagColor;
  ctx.fillRect(poleX, cy - bldgH * 1.5, flagW, flagH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(10, 14 * scale)}px sans-serif`;
  ctx.fillText(stage.flagEmoji, poleX + 4 * scale, cy - bldgH * 1.5 + flagH * 0.75);

  // 基地の看板
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  const signW = 140 * scale;
  const signH = 26 * scale;
  ctx.fillRect(cx - signW / 2, cy - bldgH - signH, signW, signH);
  ctx.strokeRect(cx - signW / 2, cy - bldgH - signH, signW, signH);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${Math.max(9, 13 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(stage.name, cx, cy - bldgH - 8 * scale);

  ctx.restore();
}

/** 障害物とアイテムの描画 (Zソート済み) */
function renderEntities(ctx: CanvasRenderingContext2D, world: AntarcticWorldState) {
  // 全エンティティを Z 座標の降順（奥から手前）でソート
  type Entity =
    | { kind: 'obstacle'; data: Obstacle }
    | { kind: 'flag'; data: ItemFlag };

  const entities: Entity[] = [
    ...world.obstacles.map((o) => ({ kind: 'obstacle' as const, data: o })),
    ...world.flags.map((f) => ({ kind: 'flag' as const, data: f })),
  ];

  entities.sort((a, b) => b.data.z - a.data.z);

  for (const ent of entities) {
    if (ent.kind === 'obstacle') {
      renderObstacle(ctx, ent.data, world.curveOffset);
    } else {
      renderFlag(ctx, ent.data, world.curveOffset);
    }
  }
}

/** 単一障害物の描画 */
function renderObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, curveOffset: number) {
  const proj = project3D(obs.x, obs.z, curveOffset);
  if (!proj.visible) return;

  const { screenX, screenY, scale } = proj;

  if (obs.type === 'hole') {
    // 氷の丸穴
    const rx = 36 * scale;
    const ry = 14 * scale;

    // 穴の縁（白・淡いシアン）
    ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, rx + 4 * scale, ry + 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 穴の深み（暗青・黒）
    const holeGrad = ctx.createRadialGradient(screenX, screenY, 2 * scale, screenX, screenY, rx);
    holeGrad.addColorStop(0, '#0369a1');
    holeGrad.addColorStop(0.7, '#082f49');
    holeGrad.addColorStop(1, '#020617');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // アザラシのひょっこり顔出し描画
    if (obs.hasSeal && obs.sealPhase !== undefined) {
      const popAmount = Math.max(0, Math.sin(obs.sealPhase));
      if (popAmount > 0.05) {
        renderSeal(ctx, screenX, screenY - 5 * scale, scale, popAmount);
      }
    }

    // 飛び出す魚の描画
    if (obs.hasFish && obs.fishState === 'jumping' && (obs.fishY || 0) > 0) {
      renderJumpingFish(ctx, screenX, screenY - (obs.fishY || 0) * scale * 0.9, scale, obs.fishColor || 'green', (obs.fishVy || 0) > 0);
    }
  } else if (obs.type === 'crevasse_small' || obs.type === 'crevasse_large') {
    // クレバス（氷の裂け目）
    const isLarge = obs.type === 'crevasse_large';
    const cw = (isLarge ? 120 : 75) * scale;
    const ch = (isLarge ? 16 : 10) * scale;

    ctx.fillStyle = '#020617'; // 底なしの青黒
    ctx.beginPath();
    ctx.moveTo(screenX - cw / 2, screenY);
    ctx.lineTo(screenX - cw * 0.2, screenY - ch * 0.4);
    ctx.lineTo(screenX + cw * 0.1, screenY - ch * 0.1);
    ctx.lineTo(screenX + cw / 2, screenY);
    ctx.lineTo(screenX + cw * 0.25, screenY + ch * 0.6);
    ctx.lineTo(screenX - cw * 0.1, screenY + ch * 0.3);
    ctx.closePath();
    ctx.fill();

    // 裂け目の縁（白く光る氷）
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = Math.max(1, 1.8 * scale);
    ctx.stroke();
  } else if (obs.type === 'puddle') {
    // 水たまり
    const rx = 40 * scale;
    const ry = 12 * scale;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(1, scale);
    ctx.stroke();
  }
}

/** アザラシの顔出し描画 */
function renderSeal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  popAmount: number // 0〜1
) {
  ctx.save();
  const sealH = 34 * scale * popAmount;
  const sealW = 28 * scale;
  const topY = y - sealH;

  // アザラシの頭部（淡いブルーグレー）
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.ellipse(x, topY + sealH * 0.6, sealW * 0.5, sealH * 0.6, 0, Math.PI, 0);
  ctx.fill();

  // マズル・鼻口（白）
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(x, topY + sealH * 0.7, 9 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 鼻（ピンク）
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.ellipse(x, topY + sealH * 0.6, 3.5 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目（黒いつぶらな瞳＆光）
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 6 * scale, topY + sealH * 0.45, 2.5 * scale, 0, Math.PI * 2);
  ctx.arc(x + 6 * scale, topY + sealH * 0.45, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 5.2 * scale, topY + sealH * 0.42, 1 * scale, 0, Math.PI * 2);
  ctx.arc(x + 6.8 * scale, topY + sealH * 0.42, 1 * scale, 0, Math.PI * 2);
  ctx.fill();

  // ひげ（黒）
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = Math.max(1, 1.2 * scale);
  ctx.beginPath();
  ctx.moveTo(x - 4 * scale, topY + sealH * 0.7);
  ctx.lineTo(x - 14 * scale, topY + sealH * 0.65);
  ctx.moveTo(x + 4 * scale, topY + sealH * 0.7);
  ctx.lineTo(x + 14 * scale, topY + sealH * 0.65);
  ctx.stroke();

  ctx.restore();
}

/** 飛び出す魚の描画 */
function renderJumpingFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: 'green' | 'yellow' | 'red',
  goingUp: boolean
) {
  ctx.save();
  const fishColor = color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : '#22c55e';
  const fishW = 20 * scale;
  const fishH = 10 * scale;

  ctx.translate(x, y);
  ctx.rotate(goingUp ? -0.4 : 0.4);

  // 魚の体
  ctx.fillStyle = fishColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, fishW * 0.5, fishH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 尾びれ
  ctx.beginPath();
  ctx.moveTo(-fishW * 0.4, 0);
  ctx.lineTo(-fishW * 0.75, -fishH * 0.5);
  ctx.lineTo(-fishW * 0.75, fishH * 0.5);
  ctx.closePath();
  ctx.fill();

  // 目
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(fishW * 0.25, -2 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(fishW * 0.28, -2 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 旗アイテムの描画 */
function renderFlag(ctx: CanvasRenderingContext2D, flag: ItemFlag, curveOffset: number) {
  if (flag.collected) return;
  const proj = project3D(flag.x, flag.z, curveOffset);
  if (!proj.visible) return;

  const { screenX, screenY, scale } = proj;
  const poleH = 45 * scale;
  const flagW = 26 * scale;
  const flagH = 16 * scale;

  ctx.save();

  // ポール
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(screenX, screenY - poleH);
  ctx.stroke();

  // 三角旗
  const isPropeller = flag.type === 'flag_propeller';
  const isBlink = isPropeller && Math.floor(Date.now() / 120) % 2 === 0;

  ctx.fillStyle = isPropeller
    ? isBlink ? '#facc15' : '#ec4899'
    : flag.type === 'flag_yellow' ? '#eab308' : '#3b82f6';

  ctx.beginPath();
  ctx.moveTo(screenX, screenY - poleH);
  ctx.lineTo(screenX + flagW, screenY - poleH + flagH * 0.5);
  ctx.lineTo(screenX, screenY - poleH + flagH);
  ctx.closePath();
  ctx.fill();

  // プロペラアイコンマーク
  if (isPropeller) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, 11 * scale)}px sans-serif`;
    ctx.fillText('P', screenX + 5 * scale, screenY - poleH + flagH * 0.7);
  }

  ctx.restore();
}

/** プレイヤー（ペン太）の描画 */
function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  world: AntarcticWorldState,
  loopState: string
) {
  const proj = project3D(player.x, PLAYER_Z, world.curveOffset);
  const cx = proj.screenX;
  const groundY = proj.screenY;
  const cy = groundY - player.y; // ジャンプ高さ考慮

  ctx.save();

  // 1. 地面に落ちる影
  const shadowScale = Math.max(0.3, 1 - (player.y / 150));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 4, 32 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. 状態に応じたペン太の描画
  if (loopState === 'stage_clear' || loopState === 'all_clear') {
    // ゴール時の歓喜のバンザイ！
    renderPentaGoalCheer(ctx, cx, cy);
  } else if (player.hitState === 'hole') {
    // 穴はまり（下半身が埋まって手足をジタバタ）
    renderPentaInHole(ctx, cx, groundY, player.struggles);
  } else if (player.hitState === 'trip' || player.hitState === 'seal') {
    // 転倒・ピヨピヨ
    renderPentaTripped(ctx, cx, groundY);
  } else {
    // 通常の走行またはジャンプ・飛行
    renderPentaRunning(ctx, cx, cy, player);
  }

  ctx.restore();
}

/** ペン太の通常走行・ジャンプ・飛行描画 */
function renderPentaRunning(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  player: PlayerState
) {
  const isJumping = player.isJumping;
  const walkCycle = Math.sin(player.animTick * 6);
  const tilt = player.facing === 'left' ? -0.12 : player.facing === 'right' ? 0.12 : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);

  // --- 足（オレンジ） ---
  if (!isJumping) {
    const leftFootY = walkCycle * 4;
    const rightFootY = -walkCycle * 4;
    ctx.fillStyle = '#f97316';
    // 左足
    ctx.beginPath();
    ctx.ellipse(-14, 18 + leftFootY, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 右足
    ctx.beginPath();
    ctx.ellipse(14, 18 + rightFootY, 9, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ジャンプ中の足
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(-12, 14, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(12, 14, 8, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 体（まるまる太ったペンギンの後ろ姿） ---
  // 外枠・黒い背中
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // ハイライト（青みがかったレトロシャドウ）
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(-4, -2, 20, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // 白いお腹（左右に少し見える）
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(-23, 2, 4, 16, 0.2, 0, Math.PI * 2);
  ctx.ellipse(23, 2, 4, 16, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // --- 頭部 ---
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, -22, 19, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // 左右に向いた時に少し見える横顔・くちばし
  if (player.facing === 'left') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-18, -23);
    ctx.lineTo(-27, -20);
    ctx.lineTo(-18, -17);
    ctx.closePath();
    ctx.fill();
    // 白目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-14, -23, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-15, -23, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (player.facing === 'right') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(18, -23);
    ctx.lineTo(27, -20);
    ctx.lineTo(18, -17);
    ctx.closePath();
    ctx.fill();
    // 白目
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(14, -23, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(15, -23, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 赤いマフラー（風になびく） ---
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(0, -10, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // なびく端
  const scarfWave = Math.sin(Date.now() * 0.015) * 5;
  ctx.beginPath();
  ctx.moveTo(12, -10);
  ctx.lineTo(26 + scarfWave, -8);
  ctx.lineTo(24 + scarfWave, 2);
  ctx.lineTo(10, -5);
  ctx.closePath();
  ctx.fill();

  // --- 翼（フリッパー） ---
  const flapAngle = isJumping ? 0.7 : walkCycle * 0.35;
  // 左翼
  ctx.save();
  ctx.translate(-22, -4);
  ctx.rotate(-flapAngle - 0.2);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 10, 5, 15, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 右翼
  ctx.save();
  ctx.translate(22, -4);
  ctx.rotate(flapAngle + 0.2);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 10, 5, 15, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- プロペラ（タケコプター） ---
  if (player.isPropellerActive) {
    const isBlinking = player.propellerTimer < 2.5 && Math.floor(Date.now() / 100) % 2 === 0;
    if (!isBlinking) {
      // 軸
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(0, -46);
      ctx.stroke();

      // 回転するブレード
      const propAngle = (Date.now() * 0.04) % (Math.PI * 2);
      const bladeW = Math.cos(propAngle) * 32;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, -46, Math.abs(bladeW), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -46, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** 穴はまり時のペン太 */
function renderPentaInHole(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  struggles: number
) {
  const shake = Math.sin(struggles * 5 + Date.now() * 0.02) * 3;
  ctx.save();
  ctx.translate(cx + shake, groundY - 4);

  // 下半身は穴に埋まるので上半身と頭のみ
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, -10, 20, 16, 0, Math.PI, 0); // 半円
  ctx.fill();

  // バタバタもがく翼
  const wingY = Math.sin(Date.now() * 0.03) * 6;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(-22, -16 + wingY, 14, 5, -0.6, 0, Math.PI * 2);
  ctx.ellipse(22, -16 - wingY, 14, 5, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // マフラー
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-12, -14, 24, 6);

  // 焦りマーク（汗の水滴）
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(16, -26 + wingY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 転倒・トリップ時のペン太 */
function renderPentaTripped(ctx: CanvasRenderingContext2D, cx: number, groundY: number) {
  ctx.save();
  ctx.translate(cx, groundY);

  // 前にペタッと倒れた姿
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, -10, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // 足が上にピーン
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.ellipse(-18, -20, 8, 4, 0.4, 0, Math.PI * 2);
  ctx.ellipse(18, -20, 8, 4, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // 頭上のピヨピヨ星
  const t = Date.now() * 0.008;
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 3; i++) {
    const starAngle = t + (i * Math.PI * 2) / 3;
    const sx = Math.cos(starAngle) * 22;
    const sy = -32 + Math.sin(starAngle) * 7;
    drawStar(ctx, sx, sy, 4.5, 2.5);
  }

  ctx.restore();
}

/** ゴール時の歓喜の万歳ペン太 */
function renderPentaGoalCheer(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const hop = Math.abs(Math.sin(Date.now() * 0.008)) * 14;
  ctx.save();
  ctx.translate(cx, cy - hop);

  // 前を向いている（白いお腹が正面）
  // 体
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  // お腹の白
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(0, 3, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // 頭部
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, -22, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目（笑顔のニッコリ弧）
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(-7, -23, 4, Math.PI, 0);
  ctx.arc(7, -23, 4, Math.PI, 0);
  ctx.stroke();

  // くちばし
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.lineTo(0, -12);
  ctx.lineTo(6, -18);
  ctx.closePath();
  ctx.fill();

  // 赤いマフラー
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-15, -12, 30, 6);

  // 万歳の両翼！
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(-24, -20, 6, 18, -0.6, 0, Math.PI * 2);
  ctx.ellipse(24, -20, 6, 18, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // 足
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.ellipse(-12, 22, 8, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(12, 22, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 星の描画ヘルパー */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** パーティクル描画 */
function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = 1 - p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** フローティングテキスト描画 */
function renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const ft of texts) {
    const alpha = 1 - ft.life / ft.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3.5;
    ctx.font = `bold ${ft.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

/** HUD & ミニマップの描画 */
function renderHUD(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  world: AntarcticWorldState,
  score: number,
  highScore: number
) {
  ctx.save();

  // 上部ダッシュボードバー
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 48);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(CANVAS_WIDTH, 48);
  ctx.stroke();

  ctx.font = 'bold 15px monospace';

  // 1. スコア & ハイスコア
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SCORE', 20, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(score.toString().padStart(6, '0'), 20, 38);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText('HI-SCORE', 130, 20);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(highScore.toString().padStart(6, '0'), 130, 38);

  // 2. 残り時間 (TIME)
  const isTimeAlert = world.remainingTimeSec <= 15 && Math.floor(Date.now() / 250) % 2 === 0;
  ctx.fillStyle = isTimeAlert ? '#ef4444' : '#94a3b8';
  ctx.fillText('TIME', 275, 20);
  ctx.fillStyle = isTimeAlert ? '#ef4444' : '#38bdf8';
  ctx.fillText(`${Math.ceil(world.remainingTimeSec)}s`.padStart(5, ' '), 275, 38);

  // 3. スピードメーター (SPEED)
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SPEED', 380, 20);
  ctx.fillStyle = player.speed >= 100 ? '#4ade80' : '#ffffff';
  ctx.fillText(`${Math.round(player.speed)} km/h`, 380, 38);

  // 4. 残り距離 (DISTANCE)
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('DISTANCE', 515, 20);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`${Math.max(0, Math.ceil(world.remainingDistanceKm))} km`, 515, 38);

  // 5. ステージ名 & 国旗
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${world.stage.flagEmoji} STAGE ${world.stage.id}`, CANVAS_WIDTH - 20, 20);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(world.stage.name, CANVAS_WIDTH - 20, 38);

  // プロペラ有効時のインジケーター
  if (player.isPropellerActive) {
    const propBoxW = 150;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
    ctx.fillRect(CANVAS_WIDTH / 2 - propBoxW / 2, 54, propBoxW, 24);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PROP: ${player.propellerTimer.toFixed(1)}s`, CANVAS_WIDTH / 2, 70);
  }

  // ミニマップ（南極大陸ルートマップ: 画面右下）
  renderMiniMap(ctx, world);

  ctx.restore();
}

/** 南極大陸ミニマップ */
function renderMiniMap(ctx: CanvasRenderingContext2D, world: AntarcticWorldState) {
  const mapX = CANVAS_WIDTH - 110;
  const mapY = CANVAS_HEIGHT - 110;
  const mapR = 42;

  ctx.save();
  // マップ背景円
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.arc(mapX, mapY, mapR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 南極大陸の簡易輪郭
  ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
  ctx.beginPath();
  for (let a = 0; a < 12; a++) {
    const ang = (a * Math.PI * 2) / 12;
    const rad = mapR * 0.7 + (Math.sin(a * 2.3) * 6);
    const x = mapX + Math.cos(ang) * rad;
    const y = mapY + Math.sin(ang) * rad;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // 南極点マーク
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(mapX, mapY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 全ステージのルート進行プロット
  const totalStages = 8;
  const currentStageProg =
    (world.stage.id - 1 + (1 - world.remainingDistanceKm / world.stage.totalDistanceKm)) / totalStages;
  const runnerAngle = currentStageProg * Math.PI * 2 - Math.PI / 2;
  const runnerDist = mapR * 0.72;

  // ペン太の現在位置アイコン
  const px = mapX + Math.cos(runnerAngle) * runnerDist;
  const py = mapY + Math.sin(runnerAngle) * runnerDist;

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}
