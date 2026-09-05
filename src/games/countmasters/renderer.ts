// Count Masters 3DパースペクティブCanvasレンダラー

import {
  Stickman,
  Gate,
  Obstacle,
  EnemyMob,
  Boss,
  StairStep,
  Coin,
  Particle,
  StageTheme,
  Skin,
} from './types';
import { ROAD_WIDTH } from './stages';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camX: number;
  camY: number;
  camZ: number;
  shakeX: number;
  shakeY: number;
  theme: StageTheme;
  skin: Skin;
  stickmen: Stickman[];
  gates: Gate[];
  obstacles: Obstacle[];
  mobs: EnemyMob[];
  boss: Boss;
  stairs: StairStep[];
  coins: Coin[];
  particles: Particle[];
  crowdCount: number;
  courseLength: number;
  isGameOver: boolean;
  isStageClear: boolean;
  highestStepReached: number;
  isBossBattle: boolean;
  isStairsClimb: boolean;
}

export class CountMastersRenderer {
  private fov = 380; // 焦点距離

  // 3D座標 (wx, wy, wz) をスクリーン座標 (sx, sy, scale) に投影
  public project(
    wx: number,
    wy: number,
    wz: number,
    camX: number,
    camY: number,
    camZ: number,
    width: number,
    height: number,
    shakeX: number = 0,
    shakeY: number = 0
  ): { sx: number; sy: number; scale: number; depth: number } | null {
    const rx = wx - camX;
    const ry = wy - camY;
    const rz = wz - camZ;

    if (rz <= 4) return null; // カメラ後方クリッピング

    const scale = this.fov / rz;
    const horizonY = height * 0.38; // 地平線の高さ
    const sx = width / 2 + rx * scale + shakeX;
    const sy = horizonY - ry * scale + shakeY;

    return { sx, sy, scale, depth: rz };
  }

  // メイン描画メソッド
  public render(rc: RenderContext) {
    const { ctx, width, height, camX, camY, camZ, shakeX, shakeY, theme } = rc;

    // 画面クリア
    ctx.clearRect(0, 0, width, height);

    // 1. 背景描画 (空・地平線・遠景都市)
    this.renderSkyAndHorizon(ctx, width, height, theme, camX);

    // 2. コース道路の描画 (手前から奥へのポリゴン)
    this.renderRoad(ctx, width, height, camX, camY, camZ, shakeX, shakeY, theme);

    // 3. 階段タワーの描画 (Multiplier Stairs)
    this.renderStairs(ctx, width, height, camX, camY, camZ, shakeX, shakeY, rc.stairs, rc.highestStepReached);

    // 描画深度ソート（奥にあるものから順に描画するZソート）
    // 各オブジェクトを (depth, renderFn) のペアにして一括ソート描画
    type RenderItem = { depth: number; draw: () => void };
    const items: RenderItem[] = [];

    // コイン
    rc.coins.forEach((coin) => {
      if (coin.collected) return;
      const p = this.project(coin.x, coin.y, coin.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.sx > -50 && p.sx < width + 50 && p.sy > -50 && p.sy < height + 50) {
        items.push({
          depth: p.depth,
          draw: () => this.drawCoin(ctx, p.sx, p.sy, p.scale, coin.rot),
        });
      }
    });

    // 障害物
    rc.obstacles.forEach((obs) => {
      const p = this.project(obs.x, 0, obs.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.depth < 1200) {
        items.push({
          depth: p.depth,
          draw: () => this.drawObstacle(ctx, p.sx, p.sy, p.scale, obs),
        });
      }
    });

    // 計算ゲート
    rc.gates.forEach((gate) => {
      const p = this.project(0, 0, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.depth > 0 && p.depth < 1400) {
        items.push({
          depth: p.depth,
          draw: () => this.drawGate(ctx, gate, camX, camY, camZ, width, height, shakeX, shakeY),
        });
      }
    });

    // 敵軍団
    rc.mobs.forEach((mob) => {
      if (mob.currentCount <= 0) return;
      mob.stickmen.forEach((sm) => {
        if (!sm.isAlive) return;
        const wx = mob.x + sm.offsetX;
        const wz = mob.z + sm.offsetZ;
        const p = this.project(wx, 0, wz, camX, camY, camZ, width, height, shakeX, shakeY);
        if (p && p.depth < 1000) {
          items.push({
            depth: p.depth,
            draw: () => this.drawStickman(ctx, p.sx, p.sy, p.scale, mob.color, '#b91c1c', 'running', Math.random() * 5, 'none'),
          });
        }
      });
    });

    // ボス
    if (rc.boss && rc.boss.hp > 0) {
      const p = this.project(0, 0, rc.boss.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.depth < 1500) {
        items.push({
          depth: p.depth,
          draw: () => this.drawBoss(ctx, p.sx, p.sy, p.scale, rc.boss),
        });
      }
    }

    // プレイヤースティックマン
    rc.stickmen.forEach((sm, index) => {
      if (!sm.isAlive) return;
      const p = this.project(sm.x, sm.y, sm.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.depth > 0 && p.depth < 1200) {
        const isLeader = index === 0;
        const acc = isLeader ? (rc.skin.accessory === 'none' ? 'crown' : rc.skin.accessory) : 'none';
        items.push({
          depth: p.depth,
          draw: () =>
            this.drawStickman(
              ctx,
              p.sx,
              p.sy,
              p.scale * sm.scale,
              sm.color,
              rc.skin.headColor,
              sm.state,
              sm.animOffset,
              acc
            ),
        });
      }
    });

    // パーティクル (奥にあるもの)
    rc.particles.forEach((pt) => {
      const p = this.project(pt.x, pt.y, pt.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (p && p.depth > 0) {
        items.push({
          depth: p.depth,
          draw: () => this.drawParticle(ctx, p.sx, p.sy, p.scale, pt),
        });
      }
    });

    // 深度順（奥から手前）にソートして描画
    items.sort((a, b) => b.depth - a.depth);
    items.forEach((item) => item.draw());

    // 4. 群衆人数のポップアップバブル描画 (リーダー頭上)
    this.renderCrowdCounter(ctx, rc);
  }

  // 背景の空と地平線の描画
  private renderSkyAndHorizon(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: StageTheme,
    camX: number
  ) {
    const horizonY = height * 0.38;

    // 空のグラデーション
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    switch (theme) {
      case 'neon':
      case 'cyber':
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(0.5, '#1e1035');
        skyGrad.addColorStop(1, '#3b0764');
        break;
      case 'volcano':
        skyGrad.addColorStop(0, '#1c0a00');
        skyGrad.addColorStop(0.6, '#450a0a');
        skyGrad.addColorStop(1, '#991b1b');
        break;
      case 'beach':
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.6, '#38bdf8');
        skyGrad.addColorStop(1, '#fef08a');
        break;
      case 'city':
      default:
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.7, '#67e8f9');
        skyGrad.addColorStop(1, '#e0f2fe');
        break;
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizonY);

    // 地面のベースカラー (地平線以下)
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    switch (theme) {
      case 'neon':
      case 'cyber':
        groundGrad.addColorStop(0, '#030712');
        groundGrad.addColorStop(1, '#0f172a');
        break;
      case 'volcano':
        groundGrad.addColorStop(0, '#1f130e');
        groundGrad.addColorStop(1, '#451a03');
        break;
      case 'beach':
        groundGrad.addColorStop(0, '#fed7aa');
        groundGrad.addColorStop(1, '#0284c7');
        break;
      case 'city':
      default:
        groundGrad.addColorStop(0, '#93c5fd');
        groundGrad.addColorStop(0.4, '#6ee7b7');
        groundGrad.addColorStop(1, '#34d399');
        break;
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // 遠景の山やビル群シルエット
    ctx.save();
    const cityOffset = (camX * 0.1) % 100;
    ctx.fillStyle = theme === 'cyber' || theme === 'neon' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(100, 116, 139, 0.25)';

    const numBuildings = 14;
    const bWidth = width / (numBuildings - 2);
    for (let i = -1; i <= numBuildings; i++) {
      const bx = i * bWidth - cityOffset;
      const bh = 40 + ((Math.sin(i * 3.7) + 1) * 0.5) * 60;
      ctx.fillRect(bx, horizonY - bh, bWidth * 0.85, bh);

      // ビルの光る窓
      if (theme === 'cyber' || theme === 'neon') {
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(56, 189, 248, 0.4)' : 'rgba(236, 72, 153, 0.4)';
        for (let wy = horizonY - bh + 10; wy < horizonY - 10; wy += 14) {
          ctx.fillRect(bx + 4, wy, 4, 6);
          ctx.fillRect(bx + bWidth * 0.85 - 8, wy, 4, 6);
        }
        ctx.fillStyle = 'rgba(30, 27, 75, 0.6)';
      }
    }

    // サイバーグリッド背景ライン
    if (theme === 'cyber' || theme === 'neon') {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      for (let x = -width; x <= width * 2; x += 60) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + (x - width / 2) * 0.1, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 道路の描画
  private renderRoad(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camX: number,
    camY: number,
    camZ: number,
    shakeX: number,
    shakeY: number,
    theme: StageTheme
  ) {
    const halfW = ROAD_WIDTH / 2;
    const segmentLength = 25; // 道路セグメントの長さ
    const minZ = Math.max(0, Math.floor(camZ / segmentLength) * segmentLength);
    const maxZ = minZ + 1200;

    for (let z = minZ; z < maxZ; z += segmentLength) {
      const p1Left = this.project(-halfW, 0, z, camX, camY, camZ, width, height, shakeX, shakeY);
      const p1Right = this.project(halfW, 0, z, camX, camY, camZ, width, height, shakeX, shakeY);
      const p2Left = this.project(-halfW, 0, z + segmentLength, camX, camY, camZ, width, height, shakeX, shakeY);
      const p2Right = this.project(halfW, 0, z + segmentLength, camX, camY, camZ, width, height, shakeX, shakeY);

      if (!p1Left || !p1Right || !p2Left || !p2Right) continue;

      // 道路のベースポリゴン
      ctx.beginPath();
      ctx.moveTo(p1Left.sx, p1Left.sy);
      ctx.lineTo(p1Right.sx, p1Right.sy);
      ctx.lineTo(p2Right.sx, p2Right.sy);
      ctx.lineTo(p2Left.sx, p2Left.sy);
      ctx.closePath();

      // セグメントごとの交互チェッカー調カラー
      const isAlt = Math.floor(z / segmentLength) % 2 === 0;
      if (theme === 'cyber' || theme === 'neon') {
        ctx.fillStyle = isAlt ? '#18181b' : '#27272a';
      } else if (theme === 'volcano') {
        ctx.fillStyle = isAlt ? '#292524' : '#1c1917';
      } else {
        ctx.fillStyle = isAlt ? '#f8fafc' : '#f1f5f9';
      }
      ctx.fill();

      // サイドレール・縁石
      const curbLeft1 = this.project(-halfW - 0.8, 1.2, z, camX, camY, camZ, width, height, shakeX, shakeY);
      const curbLeft2 = this.project(-halfW - 0.8, 1.2, z + segmentLength, camX, camY, camZ, width, height, shakeX, shakeY);
      if (curbLeft1 && curbLeft2) {
        ctx.beginPath();
        ctx.moveTo(p1Left.sx, p1Left.sy);
        ctx.lineTo(curbLeft1.sx, curbLeft1.sy);
        ctx.lineTo(curbLeft2.sx, curbLeft2.sy);
        ctx.lineTo(p2Left.sx, p2Left.sy);
        ctx.closePath();
        ctx.fillStyle = isAlt ? '#3b82f6' : '#ffffff';
        if (theme === 'cyber' || theme === 'neon') ctx.fillStyle = isAlt ? '#06b6d4' : '#ec4899';
        ctx.fill();
      }

      const curbRight1 = this.project(halfW + 0.8, 1.2, z, camX, camY, camZ, width, height, shakeX, shakeY);
      const curbRight2 = this.project(halfW + 0.8, 1.2, z + segmentLength, camX, camY, camZ, width, height, shakeX, shakeY);
      if (curbRight1 && curbRight2) {
        ctx.beginPath();
        ctx.moveTo(p1Right.sx, p1Right.sy);
        ctx.lineTo(curbRight1.sx, curbRight1.sy);
        ctx.lineTo(curbRight2.sx, curbRight2.sy);
        ctx.lineTo(p2Right.sx, p2Right.sy);
        ctx.closePath();
        ctx.fillStyle = isAlt ? '#3b82f6' : '#ffffff';
        if (theme === 'cyber' || theme === 'neon') ctx.fillStyle = isAlt ? '#06b6d4' : '#ec4899';
        ctx.fill();
      }

      // 中央の白線（破線）
      if (isAlt) {
        const c1 = this.project(0, 0, z, camX, camY, camZ, width, height, shakeX, shakeY);
        const c2 = this.project(0, 0, z + segmentLength, camX, camY, camZ, width, height, shakeX, shakeY);
        if (c1 && c2) {
          ctx.beginPath();
          ctx.moveTo(c1.sx - 1.5 * c1.scale, c1.sy);
          ctx.lineTo(c1.sx + 1.5 * c1.scale, c1.sy);
          ctx.lineTo(c2.sx + 1.5 * c2.scale, c2.sy);
          ctx.lineTo(c2.sx - 1.5 * c2.scale, c2.sy);
          ctx.closePath();
          ctx.fillStyle = theme === 'cyber' ? 'rgba(56, 189, 248, 0.7)' : 'rgba(203, 213, 225, 0.8)';
          ctx.fill();
        }
      }
    }
  }

  // 階段タワーの描画
  private renderStairs(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    camX: number,
    camY: number,
    camZ: number,
    shakeX: number,
    shakeY: number,
    stairs: StairStep[],
    highestStepReached: number
  ) {
    stairs.forEach((step) => {
      const halfW = ROAD_WIDTH / 2;
      const p1L = this.project(-halfW, step.y, step.z, camX, camY, camZ, width, height, shakeX, shakeY);
      const p1R = this.project(halfW, step.y, step.z, camX, camY, camZ, width, height, shakeX, shakeY);
      const p2L = this.project(-halfW, step.y, step.z + 60, camX, camY, camZ, width, height, shakeX, shakeY);
      const p2R = this.project(halfW, step.y, step.z + 60, camX, camY, camZ, width, height, shakeX, shakeY);

      if (!p1L || !p1R || !p2L || !p2R) return;

      // ステップ上面
      ctx.beginPath();
      ctx.moveTo(p1L.sx, p1L.sy);
      ctx.lineTo(p1R.sx, p1R.sy);
      ctx.lineTo(p2R.sx, p2R.sy);
      ctx.lineTo(p2L.sx, p2L.sy);
      ctx.closePath();
      ctx.fillStyle = step.color;
      ctx.fill();

      // ステップ正面（立ち上がり面）
      const pBottomL = this.project(-halfW, Math.max(0, step.y - 15), step.z, camX, camY, camZ, width, height, shakeX, shakeY);
      const pBottomR = this.project(halfW, Math.max(0, step.y - 15), step.z, camX, camY, camZ, width, height, shakeX, shakeY);
      if (pBottomL && pBottomR) {
        ctx.beginPath();
        ctx.moveTo(p1L.sx, p1L.sy);
        ctx.lineTo(p1R.sx, p1R.sy);
        ctx.lineTo(pBottomR.sx, pBottomR.sy);
        ctx.lineTo(pBottomL.sx, pBottomL.sy);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();
      }

      // 到達フラグがある場合は輝く枠線
      if (step.stepIndex <= highestStepReached) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3 * p1L.scale;
        ctx.stroke();
      }

      // 倍率テキスト (×1.5, ×2.0, ×10.0 など)
      const centerP = this.project(0, step.y + 0.5, step.z + 30, camX, camY, camZ, width, height, shakeX, shakeY);
      if (centerP && centerP.scale > 0.15) {
        ctx.save();
        ctx.font = `900 ${Math.max(12, Math.floor(22 * centerP.scale))}px "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4 * centerP.scale;
        const text = `×${step.multiplier.toFixed(1)}`;
        ctx.strokeText(text, centerP.sx, centerP.sy);
        ctx.fillText(text, centerP.sx, centerP.sy);
        ctx.restore();
      }
    });
  }

  // スティックマンの描画
  private drawStickman(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    scale: number,
    bodyColor: string,
    headColor: string,
    state: Stickman['state'],
    animOffset: number,
    accessory: Skin['accessory']
  ) {
    ctx.save();

    // 1. 足元のソフトシャドウ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 7 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 走りのアニメーション計算
    const runCycle = Math.sin(animOffset * 8);
    const bounceY = Math.abs(Math.sin(animOffset * 8)) * 3 * scale;

    const footY = sy;
    const hipY = footY - 8 * scale - bounceY;
    const neckY = hipY - 9 * scale;
    const headY = neckY - 6 * scale;
    const headRadius = 5.5 * scale;

    // 状態によるポーズ
    let leg1Angle = runCycle * 0.6;
    let leg2Angle = -runCycle * 0.6;
    let arm1Angle = -runCycle * 0.8;
    let arm2Angle = runCycle * 0.8;

    if (state === 'flying') {
      leg1Angle = 0.8;
      leg2Angle = -0.8;
      arm1Angle = -1.2;
      arm2Angle = 1.2;
    } else if (state === 'climbing') {
      // バンザイ勝利ポーズ！
      arm1Angle = -2.2;
      arm2Angle = -2.2;
      leg1Angle = 0.2;
      leg2Angle = -0.2;
    }

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2.8 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 2. 左脚
    ctx.beginPath();
    ctx.moveTo(sx, hipY);
    ctx.lineTo(sx + Math.sin(leg1Angle) * 8 * scale, footY - bounceY + Math.max(0, -Math.cos(leg1Angle) * 3 * scale));
    ctx.stroke();

    // 3. 右脚
    ctx.beginPath();
    ctx.moveTo(sx, hipY);
    ctx.lineTo(sx + Math.sin(leg2Angle) * 8 * scale, footY - bounceY + Math.max(0, -Math.cos(leg2Angle) * 3 * scale));
    ctx.stroke();

    // 4. 胴体
    ctx.beginPath();
    ctx.moveTo(sx, hipY);
    ctx.lineTo(sx, neckY);
    ctx.stroke();

    // 5. 左腕
    ctx.beginPath();
    ctx.moveTo(sx, neckY + 2 * scale);
    ctx.lineTo(sx + Math.sin(arm1Angle) * 7 * scale, neckY + 2 * scale + Math.cos(arm1Angle) * 7 * scale);
    ctx.stroke();

    // 6. 右腕
    ctx.beginPath();
    ctx.moveTo(sx, neckY + 2 * scale);
    ctx.lineTo(sx + Math.sin(arm2Angle) * 7 * scale, neckY + 2 * scale + Math.cos(arm2Angle) * 7 * scale);
    ctx.stroke();

    // 7. 頭
    ctx.beginPath();
    ctx.arc(sx, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = headColor;
    ctx.fill();
    ctx.stroke();

    // 顔（目）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx - 1.5 * scale, headY - 0.5 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.arc(sx + 1.5 * scale, headY - 0.5 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(sx - 1.2 * scale, headY - 0.5 * scale, 0.6 * scale, 0, Math.PI * 2);
    ctx.arc(sx + 1.8 * scale, headY - 0.5 * scale, 0.6 * scale, 0, Math.PI * 2);
    ctx.fill();

    // 8. アクセサリ
    if (accessory === 'crown') {
      // 金の王冠
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      const cy = headY - headRadius - 1 * scale;
      ctx.moveTo(sx - 4.5 * scale, cy);
      ctx.lineTo(sx - 4.5 * scale, cy - 5 * scale);
      ctx.lineTo(sx - 2.2 * scale, cy - 2.5 * scale);
      ctx.lineTo(sx, cy - 6 * scale);
      ctx.lineTo(sx + 2.2 * scale, cy - 2.5 * scale);
      ctx.lineTo(sx + 4.5 * scale, cy - 5 * scale);
      ctx.lineTo(sx + 4.5 * scale, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (accessory === 'ninja') {
      // 忍者はちまき
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx - headRadius - 1 * scale, headY - 1.5 * scale, (headRadius + 1 * scale) * 2, 2 * scale);
      // はちまきの結び目・なびき
      ctx.beginPath();
      ctx.moveTo(sx - headRadius, headY - 1 * scale);
      ctx.lineTo(sx - headRadius - 6 * scale, headY + runCycle * 3 * scale);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
    } else if (accessory === 'helmet') {
      // ヘルメット
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(sx, headY - 1 * scale, headRadius + 1 * scale, Math.PI, 0);
      ctx.fill();
    } else if (accessory === 'cat') {
      // 猫耳
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(sx - 4 * scale, headY - headRadius);
      ctx.lineTo(sx - 6 * scale, headY - headRadius - 4 * scale);
      ctx.lineTo(sx - 2 * scale, headY - headRadius - 2 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + 4 * scale, headY - headRadius);
      ctx.lineTo(sx + 6 * scale, headY - headRadius - 4 * scale);
      ctx.lineTo(sx + 2 * scale, headY - headRadius - 2 * scale);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 計算ゲートの描画
  private drawGate(
    ctx: CanvasRenderingContext2D,
    gate: Gate,
    camX: number,
    camY: number,
    camZ: number,
    width: number,
    height: number,
    shakeX: number,
    shakeY: number
  ) {
    const halfW = ROAD_WIDTH / 2;
    const gateH = 26; // ゲートの高さ
    const offsetX = gate.offsetX || 0;

    // 左側パネルの4点 (3D)
    const pL_BL = this.project(-halfW + offsetX, 0, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pL_BR = this.project(offsetX, 0, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pL_TR = this.project(offsetX, gateH, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pL_TL = this.project(-halfW + offsetX, gateH, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);

    // 右側パネルの4点 (3D)
    const pR_BL = this.project(offsetX, 0, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pR_BR = this.project(halfW + offsetX, 0, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pR_TR = this.project(halfW + offsetX, gateH, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);
    const pR_TL = this.project(offsetX, gateH, gate.z, camX, camY, camZ, width, height, shakeX, shakeY);

    if (!pL_BL || !pL_BR || !pL_TR || !pL_TL || !pR_BL || !pR_BR || !pR_TR || !pR_TL) return;

    // ヘルパー: パネル描画
    const renderPanel = (
      bl: typeof pL_BL,
      br: typeof pL_BR,
      tr: typeof pL_TR,
      tl: typeof pL_TL,
      opt: Gate['leftOption']
    ) => {
      const isPositive = opt.op === '+' || opt.op === '×';
      const mainColor = isPositive ? 'rgba(6, 182, 212, 0.75)' : 'rgba(239, 68, 68, 0.75)';
      const glowColor = isPositive ? '#38bdf8' : '#f87171';
      const borderColor = isPositive ? '#22d3ee' : '#fca5a5';

      ctx.save();
      // ガラス調半透明グラデーション
      ctx.beginPath();
      ctx.moveTo(tl.sx, tl.sy);
      ctx.lineTo(tr.sx, tr.sy);
      ctx.lineTo(br.sx, br.sy);
      ctx.lineTo(bl.sx, bl.sy);
      ctx.closePath();

      ctx.fillStyle = mainColor;
      ctx.fill();

      // 枠線グロー
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3.5 * tl.scale;
      ctx.stroke();

      // ピラー（支柱）
      ctx.fillStyle = '#0f172a';
      const pillarW = 2.5 * tl.scale;
      ctx.fillRect(tl.sx - pillarW / 2, tl.sy, pillarW, bl.sy - tl.sy);
      ctx.fillRect(tr.sx - pillarW / 2, tr.sy, pillarW, br.sy - tr.sy);

      // パネル中央の計算テキスト (+25, ×2 など)
      const centerSx = (tl.sx + tr.sx + bl.sx + br.sx) / 4;
      const centerSy = (tl.sy + tr.sy + bl.sy + br.sy) / 4;
      const fontSize = Math.max(13, Math.floor(28 * tl.scale));

      ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.fillText(opt.label, centerSx, centerSy);

      // 上部にサブアイコンまたは小さく「人型」
      if (fontSize > 16) {
        ctx.font = `bold ${Math.floor(fontSize * 0.45)}px sans-serif`;
        ctx.fillText(isPositive ? '👥 CROWD' : '⚠️ HAZARD', centerSx, centerSy - fontSize * 0.65);
      }

      ctx.restore();
    };

    renderPanel(pL_BL, pL_BR, pL_TR, pL_TL, gate.leftOption);
    renderPanel(pR_BL, pR_BR, pR_TR, pR_TL, gate.rightOption);
  }

  // 障害物の描画
  private drawObstacle(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    scale: number,
    obs: Obstacle
  ) {
    ctx.save();
    switch (obs.type) {
      case 'saw': {
        // 回転丸鋸
        const r = obs.radius * scale * 1.8;
        ctx.translate(sx, sy);
        ctx.rotate(obs.phase * 4);

        // 影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * scale, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // ノコギリのギザギザ歯
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        const teeth = 12;
        for (let i = 0; i < teeth; i++) {
          const a = (i / teeth) * Math.PI * 2;
          const aMid = a + Math.PI / teeth;
          const rInner = r * 0.7;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.lineTo(Math.cos(aMid) * rInner, Math.sin(aMid) * rInner);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 中心ハブ
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'pendulum': {
        // 振り子ギロチン
        const swingAngle = Math.sin(obs.phase) * 0.8;
        const armLength = 35 * scale;
        const pivotY = sy - 40 * scale;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, pivotY);
        const bladeX = sx + Math.sin(swingAngle) * armLength;
        const bladeY = pivotY + Math.cos(swingAngle) * armLength;
        ctx.lineTo(bladeX, bladeY);
        ctx.stroke();

        // 巨大な三日月状の刃
        ctx.save();
        ctx.translate(bladeX, bladeY);
        ctx.rotate(swingAngle);
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 14 * scale, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.quadraticCurveTo(5 * scale, 0, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'spikes': {
        // トゲトゲ床
        const sw = obs.width * scale * 2;
        const spikeHeight = (Math.sin(obs.phase) > 0 ? Math.sin(obs.phase) : 0) * 12 * scale;

        // ベース床
        ctx.fillStyle = '#475569';
        ctx.fillRect(sx - sw / 2, sy - 2 * scale, sw, 4 * scale);

        // トゲの突き出し
        if (spikeHeight > 1) {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 1 * scale;
          const count = 5;
          const step = sw / count;
          for (let i = 0; i < count; i++) {
            const tx = sx - sw / 2 + (i + 0.5) * step;
            ctx.beginPath();
            ctx.moveTo(tx - step * 0.35, sy);
            ctx.lineTo(tx, sy - spikeHeight);
            ctx.lineTo(tx + step * 0.35, sy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
        break;
      }

      case 'smasher': {
        // ピストン壁
        const extend = (Math.sin(obs.phase) + 1) * 0.5; // 0 ~ 1
        const pw = obs.width * scale * 2.5;
        const ph = 24 * scale;
        const currentW = pw * (0.3 + 0.7 * extend);

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * scale;
        ctx.fillRect(sx - currentW / 2, sy - ph, currentW, ph);
        ctx.strokeRect(sx - currentW / 2, sy - ph, currentW, ph);

        // 警告ハザードストライプ
        ctx.fillStyle = '#f59e0b';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(sx - currentW / 2 + 4 * scale + i * 8 * scale, sy - ph + 4 * scale, 4 * scale, ph - 8 * scale);
        }
        break;
      }
    }
    ctx.restore();
  }

  // ボスの描画
  private drawBoss(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    scale: number,
    boss: Boss
  ) {
    ctx.save();
    const bossScale = scale * boss.scale * 1.5;

    // 1. 巨大な影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 25 * bossScale, 10 * bossScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const bounce = Math.sin(boss.animTimer * 5) * 4 * bossScale;
    const bodyY = sy - 28 * bossScale - bounce;
    const headY = bodyY - 24 * bossScale;
    const headR = 14 * bossScale;

    // 2. 脚
    ctx.strokeStyle = boss.color;
    ctx.lineWidth = 9 * bossScale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - 10 * bossScale, sy - bounce);
    ctx.lineTo(sx - 8 * bossScale, bodyY + 10 * bossScale);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx + 10 * bossScale, sy - bounce);
    ctx.lineTo(sx + 8 * bossScale, bodyY + 10 * bossScale);
    ctx.stroke();

    // 3. 胴体
    ctx.beginPath();
    ctx.moveTo(sx, bodyY + 10 * bossScale);
    ctx.lineTo(sx, bodyY - 10 * bossScale);
    ctx.stroke();

    // 4. 腕 (威嚇ポーズまたはパンチ)
    const armSwing = Math.sin(boss.animTimer * 8) * 8 * bossScale;
    ctx.beginPath();
    ctx.moveTo(sx - 10 * bossScale, bodyY - 8 * bossScale);
    ctx.lineTo(sx - 24 * bossScale, bodyY + armSwing);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx + 10 * bossScale, bodyY - 8 * bossScale);
    ctx.lineTo(sx + 24 * bossScale, bodyY - armSwing);
    ctx.stroke();

    // 5. 頭
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.arc(sx, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 邪悪な目
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sx - 4 * bossScale, headY - 2 * bossScale, 3 * bossScale, 0, Math.PI * 2);
    ctx.arc(sx + 4 * bossScale, headY - 2 * bossScale, 3 * bossScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(sx - 3.5 * bossScale, headY - 2 * bossScale, 1.5 * bossScale, 0, Math.PI * 2);
    ctx.arc(sx + 4.5 * bossScale, headY - 2 * bossScale, 1.5 * bossScale, 0, Math.PI * 2);
    ctx.fill();

    // 巨大な王冠
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2 * bossScale;
    ctx.beginPath();
    const cTop = headY - headR - 2 * bossScale;
    ctx.moveTo(sx - 12 * bossScale, cTop);
    ctx.lineTo(sx - 12 * bossScale, cTop - 12 * bossScale);
    ctx.lineTo(sx - 6 * bossScale, cTop - 6 * bossScale);
    ctx.lineTo(sx, cTop - 15 * bossScale);
    ctx.lineTo(sx + 6 * bossScale, cTop - 6 * bossScale);
    ctx.lineTo(sx + 12 * bossScale, cTop - 12 * bossScale);
    ctx.lineTo(sx + 12 * bossScale, cTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. ボスHPバー (頭上)
    const barW = Math.max(60, 110 * scale);
    const barH = Math.max(8, 14 * scale);
    const barX = sx - barW / 2;
    const barY = headY - headR - 35 * scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const hpPercent = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = hpPercent > 0.4 ? '#ef4444' : '#dc2626';
    ctx.fillRect(barX, barY, barW * hpPercent, barH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // HP数値 & 名前テキスト
    ctx.font = `bold ${Math.max(10, Math.floor(12 * scale))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${boss.name} (${Math.ceil(boss.hp)}/${boss.maxHp})`, sx, barY - 3);

    ctx.restore();
  }

  // コインの描画
  private drawCoin(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    scale: number,
    rot: number
  ) {
    ctx.save();
    const r = 8 * scale;
    const rx = Math.abs(Math.cos(rot)) * r;

    // 影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 6 * scale, rx, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 黄金コイン本体
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(sx, sy, Math.max(1, rx), r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 内側の輝き
    if (rx > 3 * scale) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(sx, sy, rx * 0.6, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // パーティクルの描画
  private drawParticle(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    scale: number,
    pt: Particle
  ) {
    ctx.save();
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;

    if (pt.type === 'text' && pt.text) {
      ctx.font = `900 ${Math.max(14, Math.floor(22 * scale))}px "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3 * scale;
      ctx.strokeText(pt.text, sx, sy);
      ctx.fillText(pt.text, sx, sy);
    } else if (pt.type === 'confetti') {
      ctx.fillStyle = pt.color;
      ctx.fillRect(sx - pt.size * scale, sy - pt.size * scale, pt.size * scale * 2, pt.size * scale * 2);
    } else if (pt.type === 'gateRing') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.ellipse(sx, sy, pt.size * scale * 2, pt.size * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pt.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // リーダー頭上の人数カウンターバブル
  private renderCrowdCounter(ctx: CanvasRenderingContext2D, rc: RenderContext) {
    if (rc.stickmen.length === 0 || rc.crowdCount <= 0) return;
    const leader = rc.stickmen[0];
    const p = this.project(leader.x, leader.y + 12, leader.z, rc.camX, rc.camY, rc.camZ, rc.width, rc.height, rc.shakeX, rc.shakeY);
    if (!p) return;

    ctx.save();
    const text = `${rc.crowdCount}`;
    const fontSize = Math.max(14, Math.min(26, Math.floor(20 * p.scale)));
    ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`;

    const textMetrics = ctx.measureText(text);
    const padX = 12 * p.scale;
    const padY = 6 * p.scale;
    const bw = textMetrics.width + padX * 2;
    const bh = fontSize + padY * 2;
    const bx = p.sx - bw / 2;
    const by = p.sy - bh - 6 * p.scale;

    // バブル背景
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * p.scale;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;

    // 角丸四角形
    const radius = 8 * p.scale;
    ctx.beginPath();
    ctx.moveTo(bx + radius, by);
    ctx.lineTo(bx + bw - radius, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + radius, radius);
    ctx.lineTo(bx + bw, by + bh - radius);
    ctx.arcTo(bx + bw, by + bh, bx + bw - radius, by + bh, radius);
    // 吹き出しの三角
    ctx.lineTo(bx + bw / 2 + 5 * p.scale, by + bh);
    ctx.lineTo(bx + bw / 2, by + bh + 5 * p.scale);
    ctx.lineTo(bx + bw / 2 - 5 * p.scale, by + bh);
    ctx.lineTo(bx + radius, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - radius, radius);
    ctx.lineTo(bx, by + radius);
    ctx.arcTo(bx, by, bx + radius, by, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 人数テキスト
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 - 1);

    ctx.restore();
  }
}
