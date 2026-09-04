import { BikeState, Particle, TrackSegment } from './types';
import { LANE_Y_POSITIONS } from './physics';

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export function renderGame(
  ctx: CanvasRenderingContext2D,
  player: BikeState,
  allBikes: BikeState[],
  segments: TrackSegment[],
  totalLength: number,
  particles: Particle[],
  elapsedSeconds: number,
  bestTime: number | null,
  isEditor: boolean = false,
  selectedEditorSegmentId: string | null = null
) {
  // カメラX位置の決定 (プレイヤーが画面左から280px付近になるようにスクロール)
  const cameraX = Math.max(0, Math.min(totalLength - CANVAS_WIDTH, player.x - 280));

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. スタジアム上部・観客席・背景の描画
  renderStadiumBackground(ctx, cameraX, elapsedSeconds);

  // 2. コース路面と4レーンの描画
  renderTrackGround(ctx, cameraX);

  // 3. コース上の地形・障害物の描画
  renderTrackObstacles(ctx, cameraX, segments, isEditor, selectedEditorSegmentId);

  // 4. バイクの影の描画 (接地・滞空)
  renderBikeShadows(ctx, cameraX, allBikes);

  // 5. バイク本体 & ライダーの描画 (奥のレーンから順に描画して前後関係を正しく保つ)
  const sortedBikes = [...allBikes].sort((a, b) => a.lane - b.lane);
  for (const bike of sortedBikes) {
    renderBike(ctx, cameraX, bike, elapsedSeconds);
  }

  // 6. パーティクル (煙、火花、泥跳ね)
  renderParticles(ctx, cameraX, particles);

  // 7. ナイス着地ポップアップ
  if (player.niceLandingTimer > 0) {
    renderNiceLandingText(ctx, player, cameraX);
  }

  // 8. HUD (タイム、スピード、水温TEMP、順位)
  if (!isEditor) {
    renderHUD(ctx, player, allBikes, elapsedSeconds, bestTime);
  }
}

// スタジアム・観客席・スポンサーバナー背景
function renderStadiumBackground(ctx: CanvasRenderingContext2D, cameraX: number, elapsed: number) {
  // 空 (スタジアム天井)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 70);
  skyGrad.addColorStop(0, '#1e293b');
  skyGrad.addColorStop(1, '#334155');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 70);

  // 観客席スタンド (段々畑状のカラフルな観客たち)
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 70, CANVAS_WIDTH, 110);

  // 観客のドット (カメラと時間に合わせてパララックス＆アニメーション)
  const crowdColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#f8fafc', '#a855f7'];
  const cols = 70;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const y = 80 + r * 22;
    for (let c = 0; c < cols; c++) {
      const x = ((c * 24 - cameraX * 0.25) % (cols * 24) + cols * 24) % (cols * 24) - 10;
      // 飛び跳ねるアニメーション
      const bounce = Math.sin(elapsed * 6 + c * 0.8 + r * 1.5) > 0.4 ? -3 : 0;
      const colIdx = (c + r * 7) % crowdColors.length;
      ctx.fillStyle = crowdColors[colIdx];
      // 観客の頭
      ctx.fillRect(x, y + bounce, 6, 6);
      // 体
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 1, y + bounce + 6, 8, 8);
    }
  }

  // スポンサーバナー・手すり (180〜210px)
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(0, 175, CANVAS_WIDTH, 35);
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 175, CANVAS_WIDTH, 35);

  // バナーロゴ
  const bannerWidth = 320;
  const bannerCount = Math.ceil(CANVAS_WIDTH / bannerWidth) + 2;
  const bannerOffset = ((cameraX * 0.5) % bannerWidth + bannerWidth) % bannerWidth;

  ctx.font = '900 13px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = -1; i < bannerCount; i++) {
    const bx = i * bannerWidth - bannerOffset;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('⚡ EXCITE BIKE ★ SUPER MOTO ⚡', bx + bannerWidth / 2, 192);
  }

  // コース最上部のガードフェンス
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 210, CANVAS_WIDTH, 8);
  ctx.fillStyle = '#ef4444';
  for (let fx = 0; fx < CANVAS_WIDTH; fx += 30) {
    ctx.fillRect(fx, 210, 15, 8);
  }
}

// 4レーンの土トラック路面
function renderTrackGround(ctx: CanvasRenderingContext2D, cameraX: number) {
  // コース全体の土 (茶褐色・モトクロスダート)
  const dirtGrad = ctx.createLinearGradient(0, 218, 0, 420);
  dirtGrad.addColorStop(0, '#c2854b'); // 奥のレーン
  dirtGrad.addColorStop(0.5, '#b4773d');
  dirtGrad.addColorStop(1, '#985e2b'); // 手前のレーン
  ctx.fillStyle = dirtGrad;
  ctx.fillRect(0, 218, CANVAS_WIDTH, 202);

  // 4レーンの分割線 (白と黄の破線)
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 16]);
  ctx.lineDashOffset = cameraX;

  for (let l = 1; l < 4; l++) {
    const y = (LANE_Y_POSITIONS[l - 1] + LANE_Y_POSITIONS[l]) / 2 + 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  ctx.setLineDash([]); // リセット

  // コース下部フェンス & 外枠 (420〜540px)
  ctx.fillStyle = '#15803d'; // 芝生
  ctx.fillRect(0, 420, CANVAS_WIDTH, 120);

  // 白フェンス
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 420, CANVAS_WIDTH, 6);
  for (let px = 0; px < CANVAS_WIDTH; px += 40) {
    const pScreenX = ((px - cameraX) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
    ctx.fillRect(pScreenX, 420, 6, 25);
  }
}

// 障害物・地形の描画
function renderTrackObstacles(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  segments: TrackSegment[],
  isEditor: boolean,
  selectedId: string | null
) {
  for (const seg of segments) {
    const screenX = seg.x - cameraX;
    // 画面外ならスキップ
    if (screenX + seg.width < -50 || screenX > CANVAS_WIDTH + 50) continue;

    // エディタ用選択枠
    if (isEditor && seg.id === selectedId) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.strokeRect(screenX, 218, seg.width, 202);
    }

    switch (seg.type) {
      case 'small_ramp':
        drawSmallRamp(ctx, screenX, seg.width);
        break;
      case 'big_ramp':
        drawBigRamp(ctx, screenX, seg.width);
        break;
      case 'table_top':
        drawTableTop(ctx, screenX, seg.width);
        break;
      case 'whoops':
        drawWhoops(ctx, screenX, seg.width);
        break;
      case 'mud':
        drawMud(ctx, screenX, seg.width);
        break;
      case 'hurdle':
        drawHurdle(ctx, screenX, seg.width);
        break;
      case 'cooler':
        drawCooler(ctx, screenX, seg.width);
        break;
      case 'finish':
        drawFinishLine(ctx, screenX, seg.width);
        break;
    }
  }
}

// 小ジャンプ台
function drawSmallRamp(ctx: CanvasRenderingContext2D, screenX: number, _width: number) {
  const rampW = 65;
  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] + 16;
    ctx.fillStyle = '#854d0e'; // 側面影
    ctx.beginPath();
    ctx.moveTo(screenX, baseY);
    ctx.lineTo(screenX + rampW, baseY - 28);
    ctx.lineTo(screenX + rampW, baseY);
    ctx.closePath();
    ctx.fill();

    // スロープ表面 (明るい土色＋木製板)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY - 2);
    ctx.lineTo(screenX + rampW, baseY - 30);
    ctx.lineTo(screenX + rampW, baseY - 26);
    ctx.lineTo(screenX, baseY + 2);
    ctx.closePath();
    ctx.fill();

    // 先端チェッカー模様
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenX + rampW - 6, baseY - 28, 6, 6);
  }
}

// 大ジャンプ台
function drawBigRamp(ctx: CanvasRenderingContext2D, screenX: number, _width: number) {
  const rampW = 115;
  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] + 16;
    // 巨大スロープ
    ctx.fillStyle = '#713f12';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY);
    ctx.lineTo(screenX + rampW, baseY - 56);
    ctx.lineTo(screenX + rampW, baseY);
    ctx.closePath();
    ctx.fill();

    // 表面
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY - 2);
    ctx.lineTo(screenX + rampW, baseY - 58);
    ctx.lineTo(screenX + rampW, baseY - 52);
    ctx.lineTo(screenX, baseY + 4);
    ctx.closePath();
    ctx.fill();

    // 骨組みライン
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let i = 25; i < rampW; i += 25) {
      const h = (i / rampW) * 56;
      ctx.beginPath();
      ctx.moveTo(screenX + i, baseY);
      ctx.lineTo(screenX + i, baseY - h);
      ctx.stroke();
    }
  }
}

// テーブルトップ (登り台・平坦・下り坂)
function drawTableTop(ctx: CanvasRenderingContext2D, screenX: number, _width: number) {
  const upW = 75;
  const flatW = 90;
  const downW = 75;
  const h = 42;

  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] + 16;

    // 丘の本体
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY);
    ctx.lineTo(screenX + upW, baseY - h);
    ctx.lineTo(screenX + upW + flatW, baseY - h);
    ctx.lineTo(screenX + upW + flatW + downW, baseY);
    ctx.closePath();
    ctx.fill();

    // 丘の表面
    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.moveTo(screenX, baseY - 2);
    ctx.lineTo(screenX + upW, baseY - h - 3);
    ctx.lineTo(screenX + upW + flatW, baseY - h - 3);
    ctx.lineTo(screenX + upW + flatW + downW, baseY - 2);
    ctx.lineTo(screenX + upW + flatW + downW, baseY + 3);
    ctx.lineTo(screenX + upW + flatW, baseY - h + 3);
    ctx.lineTo(screenX + upW, baseY - h + 3);
    ctx.lineTo(screenX, baseY + 3);
    ctx.closePath();
    ctx.fill();
  }
}

// 連続波状モーグル (Whoops)
function drawWhoops(ctx: CanvasRenderingContext2D, screenX: number, width: number) {
  const waves = 4;
  const wavelength = width / waves;

  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] + 16;
    ctx.fillStyle = '#a16207';

    for (let w = 0; w < waves; w++) {
      const wx = screenX + w * wavelength;
      ctx.beginPath();
      ctx.ellipse(wx + wavelength / 2, baseY - 6, wavelength / 2, 16, 0, Math.PI, 0);
      ctx.fill();

      // コブのハイライト
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(wx + wavelength / 2, baseY - 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a16207';
    }
  }
}

// 泥だまり (Mud)
function drawMud(ctx: CanvasRenderingContext2D, screenX: number, width: number) {
  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] - 8;
    // 濃い泥の池
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.roundRect(screenX, baseY, width, 36, 12);
    ctx.fill();

    // ぬかるみ気泡
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(screenX + 30, baseY + 14, 8, 0, Math.PI * 2);
    ctx.arc(screenX + 90, baseY + 20, 11, 0, Math.PI * 2);
    ctx.arc(screenX + 130, baseY + 12, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ハードル
function drawHurdle(ctx: CanvasRenderingContext2D, screenX: number, _width: number) {
  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] + 16;
    ctx.fillStyle = '#dc2626'; // 赤と白のハードル
    ctx.fillRect(screenX + 10, baseY - 16, 14, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenX + 10, baseY - 10, 14, 5);
  }
}

// クーラーパッド (Chevron ストライプ)
function drawCooler(ctx: CanvasRenderingContext2D, screenX: number, width: number) {
  for (let l = 0; l < 4; l++) {
    const baseY = LANE_Y_POSITIONS[l] - 6;

    // パッド下地 (ネオンシアン)
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.fillRect(screenX, baseY, width, 32);

    // 進行方向を示す Chevron 矢印 (>>>)
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;

    for (let ax = screenX + 15; ax < screenX + width - 10; ax += 28) {
      ctx.beginPath();
      ctx.moveTo(ax, baseY + 6);
      ctx.lineTo(ax + 14, baseY + 16);
      ctx.lineTo(ax, baseY + 26);
      ctx.stroke();
    }
  }
}

// ゴールライン & チェッカーアーチ
function drawFinishLine(ctx: CanvasRenderingContext2D, screenX: number, _width: number) {
  // 地面のチェッカーライン
  const tileSize = 14;
  for (let y = 218; y < 420; y += tileSize) {
    for (let x = screenX; x < screenX + 60; x += tileSize) {
      const isBlack = ((x - screenX) / tileSize + (y - 218) / tileSize) % 2 === 0;
      ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  // 巨大なチェッカーゴールアーチ柱
  const archX = screenX + 30;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(archX - 12, 120, 24, 300);

  // アーチ上部の「FINISH」サインボード
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(archX - 70, 95, 140, 45);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(archX - 70, 95, 140, 45);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', archX, 118);
}

// バイクの影
function renderBikeShadows(ctx: CanvasRenderingContext2D, cameraX: number, bikes: BikeState[]) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (const bike of bikes) {
    const screenX = bike.x - cameraX;
    if (screenX < -60 || screenX > CANVAS_WIDTH + 60) continue;

    const shadowScale = Math.max(0.4, 1 - (bike.z / 180));
    const shadowW = 44 * shadowScale;
    const shadowH = 12 * shadowScale;

    // 影のY座標 (地上高基準)
    const shadowY = bike.y + bike.z;

    ctx.beginPath();
    ctx.ellipse(screenX, shadowY + 12, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// バイク本体 & ライダーのベクタードット絵描画
function renderBike(ctx: CanvasRenderingContext2D, cameraX: number, bike: BikeState, elapsed: number) {
  const screenX = bike.x - cameraX;
  if (screenX < -100 || screenX > CANVAS_WIDTH + 100) return;

  ctx.save();
  ctx.translate(screenX, bike.y);

  if (bike.crashed) {
    // クラッシュ時: 倒れたバイク
    ctx.rotate(bike.crashEndo ? 1.2 : -1.2);
    drawBikeBody(ctx, bike, 0, false);
    ctx.restore();

    // 放り出されたライダー
    drawCrashedRider(ctx, cameraX, bike, elapsed);
    return;
  }

  // ピッチ角度で回転
  ctx.rotate((bike.pitch * Math.PI) / 180);

  // バイク本体と乗っているライダーを描画
  drawBikeBody(ctx, bike, elapsed, true);

  ctx.restore();
}

// バイクフレーム・車輪・ライダー
function drawBikeBody(ctx: CanvasRenderingContext2D, bike: BikeState, _elapsed: number, hasRider: boolean) {
  const wheelRadius = 11;
  const wheelBase = 38; // 前後輪の距離

  // 後輪 (-wheelBase/2, +4)
  drawWheel(ctx, -wheelBase / 2, 4, wheelRadius, bike.speed);

  // 前輪 (+wheelBase/2, +4)
  drawWheel(ctx, wheelBase / 2, 4, wheelRadius, bike.speed);

  // バイクフレーム & エンジンブロック
  ctx.fillStyle = '#334155'; // 暗い金属
  ctx.fillRect(-12, -4, 22, 10);

  // マフラー (排気管)
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-22, 1, 16, 4);
  // 排気口の赤熱 (ターボ時)
  if (bike.speed > 14) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-24, 1, 3, 4);
  }

  // 燃料タンク & カウル (チームカラー)
  ctx.fillStyle = bike.color;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(16, -2);
  ctx.lineTo(-12, -2);
  ctx.closePath();
  ctx.fill();

  // ナンバープレート
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, -6, 10, 7);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bike.number.toString(), 3, 0);

  // フロントフォーク & ハンドル
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wheelBase / 2, 4);
  ctx.lineTo(12, -14);
  ctx.lineTo(8, -16);
  ctx.stroke();

  // ライダー
  if (hasRider) {
    drawRiderOnBike(ctx, bike);
  }
}

// 車輪 (タイヤ＋スポーク回転)
function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, speed: number) {
  ctx.save();
  ctx.translate(x, y);

  // 黒タイヤ
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // ホイールリム
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 0, r - 3.5, 0, Math.PI * 2);
  ctx.fill();

  // スポーク (回転線)
  const angle = (Date.now() * 0.015 * Math.max(1, speed)) % (Math.PI * 2);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }

  // センターハブ
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// バイクに乗っているライダー
function drawRiderOnBike(ctx: CanvasRenderingContext2D, bike: BikeState) {
  // ウイリー中や前傾でライダーの姿勢がダイナミックに変化
  const isWheelie = bike.pitch > 15;
  const isEndo = bike.pitch < -15;

  const bodyLeanX = isWheelie ? -5 : isEndo ? 5 : 0;
  const bodyLeanY = isWheelie ? 2 : isEndo ? -2 : 0;

  // ライダースーツ (カラー)
  ctx.fillStyle = bike.color;

  // 胴体
  ctx.fillRect(-6 + bodyLeanX, -18 + bodyLeanY, 11, 12);

  // 脚 (ステップに乗せる)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-1 + bodyLeanX, -8 + bodyLeanY);
  ctx.lineTo(-4, 0);
  ctx.lineTo(3, 2);
  ctx.stroke();

  // 腕 (ハンドルを握る)
  ctx.strokeStyle = bike.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(3 + bodyLeanX, -15 + bodyLeanY);
  ctx.lineTo(9, -15);
  ctx.stroke();

  // ヘルメット (白または黄色)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(bodyLeanX, -23 + bodyLeanY, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // バイザー (ゴーグル)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(3 + bodyLeanX, -25 + bodyLeanY, 4.5, 4);
}

// クラッシュして投げ出されたライダー
function drawCrashedRider(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  bike: BikeState,
  elapsed: number
) {
  const rx = bike.riderX - cameraX;
  const ry = bike.riderY;

  ctx.save();
  ctx.translate(rx, ry);

  if (bike.isReturning) {
    // バイクに向かって猛ダッシュ中！
    const stepAnim = Math.sin(elapsed * 22) > 0;
    const dir = bike.riderX > bike.x ? -1 : 1; // バイクの方向へ向く
    ctx.scale(dir, 1);

    // 走るライダー
    ctx.fillStyle = bike.color;
    ctx.fillRect(-4, -16, 9, 11); // 胴体

    // 頭
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -21, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // 足
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (stepAnim) {
      ctx.moveTo(-2, -6);
      ctx.lineTo(-7, 2);
      ctx.moveTo(2, -6);
      ctx.lineTo(6, 2);
    } else {
      ctx.moveTo(-2, -6);
      ctx.lineTo(5, 2);
      ctx.moveTo(2, -6);
      ctx.lineTo(-6, 2);
    }
    ctx.stroke();

    if (bike.isPlayer) {
      // 「RUN! 連打!」コールアウト
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RUN! 🏃', 0, -32);
    }
  } else {
    // 地面に倒れて転がっている
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = bike.color;
    ctx.fillRect(-4, -8, 9, 14);

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -14, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // ピヨピヨ星マーク
    const starAngle = elapsed * 10;
    ctx.fillStyle = '#facc15';
    ctx.font = '10px monospace';
    ctx.fillText('★', Math.cos(starAngle) * 12, -18 + Math.sin(starAngle) * 4);
  }

  ctx.restore();
}

// パーティクル描画
function renderParticles(ctx: CanvasRenderingContext2D, cameraX: number, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life++;

    const screenX = p.x - cameraX;
    if (screenX < -20 || screenX > CANVAS_WIDTH + 20 || p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = 1 - p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.beginPath();
    ctx.arc(screenX, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

// ナイス着地テキスト
function renderNiceLandingText(ctx: CanvasRenderingContext2D, player: BikeState, cameraX: number) {
  const screenX = player.x - cameraX;
  const screenY = player.y - 45;

  ctx.save();
  ctx.font = '900 16px "Courier New", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  ctx.strokeText('⚡ NICE LANDING! +BOOST ⚡', screenX, screenY);
  ctx.fillText('⚡ NICE LANDING! +BOOST ⚡', screenX, screenY);
  ctx.restore();
}

// 上部HUD
function renderHUD(
  ctx: CanvasRenderingContext2D,
  player: BikeState,
  allBikes: BikeState[],
  elapsed: number,
  bestTime: number | null
) {
  // HUD背景プレート
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(16, 12, CANVAS_WIDTH - 32, 52);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 12, CANVAS_WIDTH - 32, 52);

  ctx.font = 'bold 12px monospace';
  ctx.textBaseline = 'middle';

  // 1. タイム表示
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const millis = Math.floor((elapsed * 100) % 100);
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;

  ctx.fillStyle = '#94a3b8';
  ctx.fillText('TIME', 32, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px monospace';
  ctx.fillText(timeStr, 32, 48);

  // 2. ベストタイム
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('BEST TIME', 170, 28);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 16px monospace';
  if (bestTime !== null) {
    const bMins = Math.floor(bestTime / 60);
    const bSecs = Math.floor(bestTime % 60);
    const bMillis = Math.floor((bestTime * 100) % 100);
    ctx.fillText(
      `${bMins.toString().padStart(2, '0')}:${bSecs.toString().padStart(2, '0')}.${bMillis.toString().padStart(2, '0')}`,
      170,
      48
    );
  } else {
    ctx.fillText('--:--.--', 170, 48);
  }

  // 3. スピードメーター (km/h)
  const kmh = Math.round((player.speed / 20.5) * 160);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SPEED', 320, 28);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 18px monospace';
  ctx.fillText(`${kmh} km/h`, 320, 48);

  // 4. 水温・TEMPゲージ (0〜100)
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('ENGINE TEMP', 450, 28);

  const gaugeW = 180;
  const gaugeH = 14;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(450, 40, gaugeW, gaugeH);

  // 温度バーの色 (緑 -> 黄 -> 赤)
  const tempRatio = player.temp / 100;
  let barColor = '#10b981';
  if (tempRatio > 0.75) barColor = '#ef4444';
  else if (tempRatio > 0.45) barColor = '#f59e0b';

  ctx.fillStyle = barColor;
  ctx.fillRect(450, 40, gaugeW * tempRatio, gaugeH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(450, 40, gaugeW, gaugeH);

  // オーバーヒート警告
  if (player.isOverheated) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 12px monospace';
    const blink = Math.floor(elapsed * 6) % 2 === 0;
    if (blink) {
      ctx.fillText('⚠ OVERHEAT! COOLING ⚠', 645, 48);
    }
  }

  // 5. 順位 (MODE B時)
  if (allBikes.length > 1) {
    const sorted = [...allBikes].sort((a, b) => b.x - a.x);
    const rank = sorted.findIndex((b) => b.id === player.id) + 1;
    const rankSuffix = rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH';

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('RANK', 820, 28);

    ctx.fillStyle = rank === 1 ? '#facc15' : '#ffffff';
    ctx.font = '900 22px monospace';
    ctx.fillText(`${rank}${rankSuffix}`, 820, 48);
  }
}
