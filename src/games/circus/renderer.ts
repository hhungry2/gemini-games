// サーカスチャーリー Canvas レンダラー
import {
  StageWorldState,
  PlayerState,
  Particle,
  FloatingText,
  GameLoopState,
  GameDifficulty,
} from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from './physics';

export function renderCircusGame(
  ctx: CanvasRenderingContext2D,
  world: StageWorldState,
  player: PlayerState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  score: number,
  highScore: number,
  lives: number,
  state: GameLoopState,
  difficulty: GameDifficulty
) {
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. サーカステント背景描画
  renderCircusBackground(ctx, world);

  // 2. カメラトランスフォーム適用（ワールド空間）
  ctx.save();
  ctx.translate(-world.cameraX, 0);

  // ステージごとのオブジェクト描画
  switch (world.stageId) {
    case 'lion':
      renderLionStageObjects(ctx, world);
      break;
    case 'tightrope':
      renderTightropeStageObjects(ctx, world);
      break;
    case 'trampoline':
      renderTrampolineStageObjects(ctx, world);
      break;
    case 'ball':
      renderBallStageObjects(ctx, world);
      break;
    case 'trapeze':
      renderTrapezeStageObjects(ctx, world);
      break;
  }

  // ゴールポディウム（表彰台）
  renderGoalPodium(ctx, world.goalX, world.stageId === 'tightrope' ? 290 : GROUND_Y);

  // プレイヤー描画
  renderPlayer(ctx, player, world.stageId, state);

  // パーティクル描画
  renderParticles(ctx, particles);

  // 浮遊テキスト描画
  renderFloatingTexts(ctx, floatingTexts);

  ctx.restore(); // カメラトランスフォーム解除

  // 3. HUD描画（画面固定）
  renderHUD(ctx, world, score, highScore, lives, difficulty);

  // 4. ステート固有のオーバーレイ描画
  if (state === 'stage_intro') {
    renderStageIntro(ctx, world);
  } else if (state === 'stage_clear') {
    renderStageClearOverlay(ctx, world);
  } else if (state === 'game_over') {
    renderGameOverOverlay(ctx);
  } else if (state === 'player_miss') {
    renderMissOverlay(ctx);
  }

  ctx.restore();
}

// ---------------------------------------------
// 背景描画（サーカステント・観客席・床）
// ---------------------------------------------
function renderCircusBackground(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  // テントの天井ストライプ
  const stripeWidth = 40;
  const numStripes = Math.ceil(CANVAS_WIDTH / stripeWidth) + 1;
  const scrollOffset = (world.cameraX * 0.15) % (stripeWidth * 2);

  for (let i = -1; i < numStripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b91c1c' : '#f8fafc';
    ctx.fillRect(i * stripeWidth - scrollOffset, 0, stripeWidth, 80);
  }

  // テントの飾りカーテン裾
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 78, CANVAS_WIDTH, 6);

  // 観客席エリア
  const audienceY = 84;
  const audienceHeight = 160;
  const grad = ctx.createLinearGradient(0, audienceY, 0, audienceY + audienceHeight);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, audienceY, CANVAS_WIDTH, audienceHeight);

  // 観客たちのシルエット＆アニメーション
  const audOffset = (world.cameraX * 0.3) % 24;
  const now = Date.now() * 0.005;
  for (let row = 0; row < 3; row++) {
    const rowY = audienceY + 30 + row * 40;
    for (let x = -20; x < CANVAS_WIDTH + 20; x += 22) {
      const bob = Math.sin(now + x * 0.1 + row) * 2;
      ctx.fillStyle = row === 0 ? '#312e81' : row === 1 ? '#3730a3' : '#4338ca';
      // 頭
      ctx.beginPath();
      ctx.arc(x - audOffset, rowY + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      // 体
      ctx.fillRect(x - audOffset - 6, rowY + 6 + bob, 12, 14);
    }
  }

  // 手すり
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, audienceY + audienceHeight - 6, CANVAS_WIDTH, 6);

  // サーカスリングの壁・アリーナ
  const arenaY = audienceY + audienceHeight;
  ctx.fillStyle = '#450a0a';
  ctx.fillRect(0, arenaY, CANVAS_WIDTH, GROUND_Y - arenaY);

  // 装飾星
  ctx.fillStyle = '#fbbf24';
  const starOffset = (world.cameraX * 0.5) % 80;
  for (let x = -40; x < CANVAS_WIDTH + 40; x += 80) {
    drawStar(ctx, x - starOffset, arenaY + 25, 4, 10, 5);
  }

  // 地面（サーカスの砂・絨毯）
  const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
  floorGrad.addColorStop(0, '#d97706');
  floorGrad.addColorStop(0.1, '#b45309');
  floorGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  // 地面のライン模様
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);
}

// ---------------------------------------------
// STAGE 1: ライオン火の輪・火壺の描画
// ---------------------------------------------
function renderLionStageObjects(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  const time = Date.now() * 0.01;

  // 火の輪
  for (const hoop of world.fireHoops) {
    const rx = hoop.size === 'small' ? 20 : 28;
    const ry = hoop.size === 'small' ? 52 : 72;

    ctx.save();
    ctx.translate(hoop.x, hoop.y);

    // 炎のゆらぎ
    const flameWiggle = Math.sin(time + hoop.id) * 3;

    // 外側の炎リング
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + flameWiggle, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 内側の明るい炎
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 2 + flameWiggle * 0.5, ry - 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // コアの黄色
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - 4, ry - 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // コイン（火の輪の中に浮かぶボーナス）
    if (hoop.hasCoin && !hoop.coinCollected) {
      const coinBounce = Math.sin(time * 2 + hoop.id) * 4;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, coinBounce, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, coinBounce);
    }

    ctx.restore();
  }

  // 火壺（Fire Pot）
  for (const pot of world.firePots) {
    ctx.save();
    ctx.translate(pot.x, pot.y);

    // 壺の本体
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-20, -18);
    ctx.lineTo(20, -18);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();

    // 壺の台座
    ctx.fillStyle = '#475569';
    ctx.fillRect(-18, -4, 36, 4);

    // 燃え盛る炎
    const fH = 26 + Math.sin(time * 3 + pot.id) * 5;
    const fGrad = ctx.createRadialGradient(0, -20, 2, 0, -20, 24);
    fGrad.addColorStop(0, '#fef08a');
    fGrad.addColorStop(0.4, '#f59e0b');
    fGrad.addColorStop(0.9, '#ef4444');
    fGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fGrad;

    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.quadraticCurveTo(-18, -18 - fH * 0.6, 0, -18 - fH);
    ctx.quadraticCurveTo(18, -18 - fH * 0.6, 14, -18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// ---------------------------------------------
// STAGE 2: 綱渡り＆サルの描画
// ---------------------------------------------
function renderTightropeStageObjects(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  const ROPE_Y = 290;

  // 綱（ワイヤー）
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, ROPE_Y);
  ctx.lineTo(world.goalX + 200, ROPE_Y);
  ctx.stroke();

  // ワイヤーの支柱
  for (let x = 100; x <= world.goalX; x += 360) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 3, ROPE_Y, 6, GROUND_Y - ROPE_Y);
  }

  // お猿たち
  for (const m of world.monkeys) {
    renderMonkey(ctx, m);
  }
}

function renderMonkey(ctx: CanvasRenderingContext2D, m: { x: number; y: number; type: string; isJumping: boolean }) {
  ctx.save();
  ctx.translate(m.x, m.y);

  const isBlue = m.type === 'blue';
  const isStacked = m.type === 'stacked';

  const bodyColor = isBlue ? '#3b82f6' : '#92400e';
  const faceColor = '#fed7aa';

  // 下のサル
  drawSingleMonkey(ctx, 0, 0, bodyColor, faceColor, m.isJumping);

  // 2段重ねサル
  if (isStacked) {
    drawSingleMonkey(ctx, 0, -22, '#d97706', faceColor, false);
  }

  ctx.restore();
}

function drawSingleMonkey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyColor: string,
  faceColor: string,
  isJumping: boolean
) {
  ctx.save();
  ctx.translate(x, y);

  // 体
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, -12, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // 顔
  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.arc(0, -18, 7, 0, Math.PI * 2);
  ctx.fill();

  // 耳
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(-7, -19, 3, 0, Math.PI * 2);
  ctx.arc(7, -19, 3, 0, Math.PI * 2);
  ctx.fill();

  // 目
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-2, -19, 1.5, 0, Math.PI * 2);
  ctx.arc(2, -19, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 手足（歩行 / ジャンプ）
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  if (isJumping) {
    // バンザイ
    ctx.beginPath();
    ctx.moveTo(-4, -14); ctx.lineTo(-10, -22);
    ctx.moveTo(4, -14); ctx.lineTo(10, -22);
    ctx.moveTo(-4, -2); ctx.lineTo(-8, 3);
    ctx.moveTo(4, -2); ctx.lineTo(8, 3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.lineTo(-8, -1);
    ctx.moveTo(4, -8); ctx.lineTo(8, -1);
    ctx.moveTo(-3, -2); ctx.lineTo(-3, 0);
    ctx.moveTo(3, -2); ctx.lineTo(3, 0);
    ctx.stroke();
  }

  // しっぽ
  ctx.beginPath();
  ctx.moveTo(7, -10);
  ctx.quadraticCurveTo(14, -16, 11, -22);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------
// STAGE 3: トランポリン＆火吹き男
// ---------------------------------------------
function renderTrampolineStageObjects(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  const TRAMP_Y = 320;

  // トランポリン
  for (const tramp of world.trampolines) {
    ctx.save();
    ctx.translate(tramp.x, TRAMP_Y);

    // 脚フレーム
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(15, GROUND_Y - TRAMP_Y);
    ctx.moveTo(tramp.width - 10, 0); ctx.lineTo(tramp.width - 15, GROUND_Y - TRAMP_Y);
    ctx.stroke();

    // ネットマット
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, -3, tramp.width, 6);

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(8, -2, tramp.width - 16, 4);

    ctx.restore();
  }

  // 火吹き男
  for (const fb of world.fireBreathers) {
    ctx.save();
    ctx.translate(fb.x, fb.y);

    // 男の体
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-10, -20, 20, 26);

    // 頭
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -28, 8, 0, Math.PI * 2);
    ctx.fill();

    // ターバン
    ctx.fillStyle = '#4338ca';
    ctx.beginPath();
    ctx.arc(0, -32, 9, Math.PI, Math.PI * 2);
    ctx.fill();

    // 炎を吹くエフェクト
    if (fb.isBlowing) {
      const flW = 50 + Math.random() * 10;
      const flH = 22 + Math.random() * 6;

      const fGrad = ctx.createRadialGradient(-20, -26, 4, -20 - flW * 0.5, -26, flW);
      fGrad.addColorStop(0, '#fef08a');
      fGrad.addColorStop(0.3, '#f97316');
      fGrad.addColorStop(0.8, '#dc2626');
      fGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fGrad;

      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.quadraticCurveTo(-25, -26 - flH, -8 - flW, -26);
      ctx.quadraticCurveTo(-25, -26 + flH, -8, -26);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

// ---------------------------------------------
// STAGE 4: 玉乗りの描画
// ---------------------------------------------
function renderBallStageObjects(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  for (const ball of world.balls) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // ボール本体
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // ボールのストライプ模様
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, -Math.PI / 4, Math.PI / 4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, (3 * Math.PI) / 4, (5 * Math.PI) / 4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // 星のワンポイント
    ctx.fillStyle = '#fbbf24';
    drawStar(ctx, 0, 0, 5, 12, 6);

    // 外枠
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// ---------------------------------------------
// STAGE 5: 空中ブランコの描画
// ---------------------------------------------
function renderTrapezeStageObjects(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  // 上部トラス梁
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 60, world.goalX + 200, 14);

  // セーフティネット
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < world.goalX + 200; x += 20) {
    ctx.moveTo(x, 380); ctx.lineTo(x + 15, 410);
    ctx.moveTo(x, 410); ctx.lineTo(x + 15, 380);
  }
  ctx.stroke();

  // 各ブランコ
  for (const t of world.trapezes) {
    const endX = t.pivotX + Math.sin(t.angle) * t.ropeLength;
    const endY = t.pivotY + Math.cos(t.angle) * t.ropeLength;

    // ロープ2本
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(t.pivotX - 12, t.pivotY); ctx.lineTo(endX - 12, endY);
    ctx.moveTo(t.pivotX + 12, t.pivotY); ctx.lineTo(endX + 12, endY);
    ctx.stroke();

    // バー
    ctx.fillStyle = '#b45309';
    ctx.fillRect(endX - 18, endY - 3, 36, 6);
  }
}

// ---------------------------------------------
// チャーリー＆ライオンの描画
// ---------------------------------------------
function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  stageId: string,
  state: GameLoopState
) {
  ctx.save();
  ctx.translate(player.x, player.y);

  // ミス時のダウン演出
  if (state === 'player_miss') {
    ctx.rotate(Math.PI / 4);
  }

  // 無敵時の点滅
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // ステージ1のみライオンに乗る
  if (stageId === 'lion') {
    renderLion(ctx, player);
    // ライオンの背中に乗るチャーリー
    ctx.save();
    ctx.translate(2, -34);
    renderCharlie(ctx, player, true);
    ctx.restore();
  } else {
    // チャーリー単体
    renderCharlie(ctx, player, false);
  }

  ctx.restore();
}

// ライオン描画
function renderLion(ctx: CanvasRenderingContext2D, player: PlayerState) {
  const isRunning = player.isGrounded && Math.abs(player.vx) > 0.5;
  const legCycle = Math.sin(player.animFrame * Math.PI * 0.5) * 8;

  // 尻尾
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-22, -14);
  ctx.quadraticCurveTo(-34, -24, -30, -32);
  ctx.stroke();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(-30, -32, 4, 0, Math.PI * 2);
  ctx.fill();

  // 体
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(-4, -14, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // たてがみ
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(14, -20, 16, 0, Math.PI * 2);
  ctx.fill();

  // 頭
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(16, -18, 10, 0, Math.PI * 2);
  ctx.fill();

  // 耳
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(12, -26, 4, 0, Math.PI * 2);
  ctx.fill();

  // 目
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(19, -20, 2, 0, Math.PI * 2);
  ctx.fill();

  // 鼻
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(24, -17, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 脚 (4本)
  ctx.fillStyle = '#d97706';
  if (player.isJumping) {
    // ジャンプ中の前足・後ろ足
    ctx.fillRect(10, -8, 6, 12);
    ctx.fillRect(-18, -8, 6, 12);
  } else if (isRunning) {
    ctx.fillRect(10 + legCycle, -6, 5, 10);
    ctx.fillRect(4 - legCycle, -6, 5, 10);
    ctx.fillRect(-14 - legCycle, -6, 5, 10);
    ctx.fillRect(-20 + legCycle, -6, 5, 10);
  } else {
    ctx.fillRect(8, -6, 5, 10);
    ctx.fillRect(-16, -6, 5, 10);
  }
}

// チャーリー（ピエロ）描画
function renderCharlie(ctx: CanvasRenderingContext2D, player: PlayerState, onLion: boolean) {
  // 体（赤と青のストライプ衣装）
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-8, -20, 16, 16);

  // フリル襟
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -20, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 顔
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(0, -28, 8, 0, Math.PI * 2);
  ctx.fill();

  // 赤い丸鼻
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(2, -28, 3, 0, Math.PI * 2);
  ctx.fill();

  // 目
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(1, -30, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // ピエロ帽子（青い三角帽子）
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.moveTo(-6, -35);
  ctx.lineTo(6, -35);
  ctx.lineTo(2, -48);
  ctx.closePath();
  ctx.fill();

  // 帽子の先のポンポン
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(2, -49, 3, 0, Math.PI * 2);
  ctx.fill();

  // 手（ジャンプ時はバンザイ）
  ctx.fillStyle = '#ffffff';
  if (player.isJumping || player.attachedToTrapezeId !== null) {
    ctx.beginPath();
    ctx.arc(-10, -28, 3, 0, Math.PI * 2);
    ctx.arc(10, -28, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(-8, -14, 3, 0, Math.PI * 2);
    ctx.arc(8, -14, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 足（ライオンに乗っていない場合）
  if (!onLion) {
    ctx.fillStyle = '#3b82f6';
    const legOffset = Math.sin(player.animFrame * Math.PI) * 4;
    ctx.fillRect(-6, -5, 4, 6);
    ctx.fillRect(2, -5, 4, 6);

    // 靴
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-8 + legOffset, 0, 6, 3);
    ctx.fillRect(2 - legOffset, 0, 6, 3);
  }
}

// ゴールポディウム（表彰台）
function renderGoalPodium(ctx: CanvasRenderingContext2D, goalX: number, baseGroundY: number) {
  ctx.save();
  ctx.translate(goalX, baseGroundY);

  // 台座
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, -32, 70, 32);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(5, -28, 60, 24);

  // 金の「GOAL」星飾り
  ctx.fillStyle = '#fbbf24';
  drawStar(ctx, 35, -16, 5, 8, 4);

  // ゴールフラッグ
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(65, -32);
  ctx.lineTo(65, -80);
  ctx.stroke();

  // 旗
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.moveTo(65, -80);
  ctx.lineTo(35, -68);
  ctx.lineTo(65, -56);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------
// パーティクル＆浮遊テキスト
// ---------------------------------------------
function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;

    if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, 4, p.size, p.size * 0.5);
    } else if (p.shape === 'confetti') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 1.5);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const t of texts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

// 星描画ヘルパー
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number, outerR: number, innerR: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------
// HUD描画
// ---------------------------------------------
function renderHUD(
  ctx: CanvasRenderingContext2D,
  world: StageWorldState,
  score: number,
  highScore: number,
  lives: number,
  difficulty: GameDifficulty
) {
  // 上部黒帯HUDバー
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 44);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, CANVAS_WIDTH, 44);

  // スコア
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('SCORE', 20, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(score.toString().padStart(6, '0'), 20, 36);

  // ハイスコア
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('HIGH SCORE', 150, 16);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(highScore.toString().padStart(6, '0'), 150, 36);

  // 残機表示
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('REST', 300, 16);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`🤡 × ${Math.max(0, lives)}`, 300, 36);

  // ステージ名＆残りメーター
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText(`STAGE ${world.stageNumber}`, 420, 16);
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${world.currentDistance} m`, 420, 36);

  // タイムボーナス
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('BONUS', 560, 16);
  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(Math.floor(world.timeBonus).toString(), 560, 36);

  // 難易度バッジ
  ctx.fillStyle = difficulty === 'hard' ? '#ef4444' : difficulty === 'easy' ? '#10b981' : '#3b82f6';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(difficulty.toUpperCase(), CANVAS_WIDTH - 20, 26);
  ctx.textAlign = 'left';
}

// ---------------------------------------------
// オーバーレイ画面（ステージ導入、クリア、ゲームオーバー）
// ---------------------------------------------
function renderStageIntro(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🎪 STAGE ${world.stageNumber} 🎪`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  const stageTitles: Record<string, string> = {
    lion: '🔥 ライオン火の輪くぐり 🔥',
    tightrope: '🐒 綱渡りお猿ジャンプ 🐒',
    trampoline: '🤸 トランポリン大跳躍 🤸',
    ball: '⚽ 玉乗りボールジャンプ ⚽',
    trapeze: '🎪 空中ブランコ・トラピーズ 🎪',
  };

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(stageTitles[world.stageId] || '', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55);
}

function renderStageClearOverlay(ctx: CanvasRenderingContext2D, world: StageWorldState) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.fillText('🎉 STAGE CLEAR! 🎉', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`BONUS +${Math.floor(world.timeBonus)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
}

function renderMissOverlay(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 8;
  ctx.fillText('MISS!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function renderGameOverOverlay(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 12;
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '18px sans-serif';
  ctx.fillText('THANK YOU FOR PLAYING CIRCUS!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('Press SPACE or TAP to Continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
}
