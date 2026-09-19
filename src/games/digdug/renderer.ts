// Canvas 2D によるディグダグ高精細ピクセルアート描画エンジン
import {
  COLS,
  ROWS,
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_DIRT,
  TILE_TUNNEL,
  SURFACE_ROWS,
  LAYER_BOUNDARIES,
} from './constants';
import {
  Player,
  Enemy,
  Rock,
  BonusItem,
  Particle,
  FloatingScore,
  FireTile,
} from './types';

// 地層のインデックス取得
function getLayerIndex(row: number): number {
  if (row < 2) return -1;
  if (row <= 4) return 0;
  if (row <= 7) return 1;
  if (row <= 11) return 2;
  return 3;
}

export function renderDigDugWorld(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  player: Player,
  enemies: Enemy[],
  rocks: Rock[],
  bonusItem: BonusItem | null,
  particles: Particle[],
  floatingScores: FloatingScore[],
  fireTiles: FireTile[],
  _round: number,
  _isDark: boolean
) {
  // 画面クリア
  ctx.save();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. 地上（空と芝生）の描画
  renderSurface(ctx);

  // 2. 地下の土層の描画
  renderDirtLayers(ctx, grid);

  // 3. 掘削されたトンネルの描画
  renderTunnels(ctx, grid);

  // 4. ファイガーの火炎放射
  renderFire(ctx, fireTiles);

  // 5. モリ＆ホースの描画
  renderHarpoon(ctx, player);

  // 6. ボーナスアイテム（野菜/フルーツ）
  if (bonusItem && bonusItem.active) {
    renderBonusItem(ctx, bonusItem);
  }

  // 7. 落石の描画
  rocks.forEach((rock) => {
    if (rock.state !== 'BROKEN') {
      renderRock(ctx, rock);
    }
  });

  // 8. 敵キャラクターの描画（プーカァ、ファイガー）
  enemies.forEach((enemy) => {
    if (!enemy.isDead) {
      renderEnemy(ctx, enemy);
    }
  });

  // 9. プレイヤー（ディグダグ）の描画
  if (!player.isDead || player.deathTimer < 60) {
    renderPlayer(ctx, player);
  }

  // 10. パーティクル（土煙、破裂片、岩破片、炎）
  renderParticles(ctx, particles);

  // 11. 浮遊スコア
  renderFloatingScores(ctx, floatingScores);

  ctx.restore();
}

// 地上（空・地表ライン・花）
function renderSurface(ctx: CanvasRenderingContext2D) {
  // スカイブルー背景
  const skyHeight = SURFACE_ROWS * TILE_SIZE;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyHeight);
  skyGrad.addColorStop(0, '#38bdf8');
  skyGrad.addColorStop(1, '#7dd3fc');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, skyHeight);

  // 雲の描画
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  drawCloud(ctx, 40, 14, 28);
  drawCloud(ctx, 240, 20, 36);
  drawCloud(ctx, 330, 10, 22);

  // 地表の芝生ライン
  const grassY = skyHeight - 6;
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, grassY, CANVAS_WIDTH, 6);

  // 芝生の草むらドット
  ctx.fillStyle = '#16a34a';
  for (let x = 4; x < CANVAS_WIDTH; x += 14) {
    ctx.fillRect(x, grassY - 3, 3, 3);
  }

  // 小さな花
  ctx.fillStyle = '#facc15';
  ctx.fillRect(75, grassY - 4, 3, 3);
  ctx.fillRect(180, grassY - 4, 3, 3);
  ctx.fillRect(290, grassY - 4, 3, 3);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.beginPath();
  ctx.arc(x, y, w * 0.28, 0, Math.PI * 2);
  ctx.arc(x + w * 0.35, y - w * 0.1, w * 0.35, 0, Math.PI * 2);
  ctx.arc(x + w * 0.7, y, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// 地層と土のレンダリング
function renderDirtLayers(ctx: CanvasRenderingContext2D, grid: number[][]) {
  for (let r = SURFACE_ROWS; r < ROWS; r++) {
    const layerIdx = getLayerIndex(r);
    const layer = LAYER_BOUNDARIES[layerIdx] || LAYER_BOUNDARIES[0];

    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE_DIRT) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // タイルベース土色
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // ドット絵テクスチャ（ピクセル陰影）
        ctx.fillStyle = layer.darkColor;
        // 規則的な土の粒
        const seed = (c * 17 + r * 31) % 7;
        ctx.fillRect(x + 4 + seed, y + 6, 3, 3);
        ctx.fillRect(x + 16 - seed, y + 18, 4, 3);

        ctx.fillStyle = layer.lightColor;
        ctx.fillRect(x + 18, y + 4 + seed, 3, 2);
        ctx.fillRect(x + 6, y + 20, 2, 2);
      }
    }
  }
}

// くり抜かれたトンネルのレンダリング（黒で滑らかに開口）
function renderTunnels(ctx: CanvasRenderingContext2D, grid: number[][]) {
  ctx.fillStyle = '#09090b'; // 地下の漆黒

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === TILE_TUNNEL) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // トンネルの基本描画
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // トンネル周囲のほのかな土壁エッジ
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }
}

// ファイガーの火炎放射
function renderFire(ctx: CanvasRenderingContext2D, fireTiles: FireTile[]) {
  fireTiles.forEach((fire) => {
    const x = fire.col * TILE_SIZE;
    const y = fire.row * TILE_SIZE;

    // 炎の揺らぎ
    const flameH = TILE_SIZE * (0.7 + Math.random() * 0.3);
    const grad = ctx.createRadialGradient(
      x + TILE_SIZE / 2,
      y + TILE_SIZE / 2,
      2,
      x + TILE_SIZE / 2,
      y + TILE_SIZE / 2,
      TILE_SIZE / 1.1
    );
    grad.addColorStop(0, '#fef08a'); // 白黄色芯
    grad.addColorStop(0.3, '#f97316'); // オレンジ
    grad.addColorStop(0.8, '#dc2626'); // 赤
    grad.addColorStop(1, 'rgba(153, 27, 27, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, flameH / 2, 0, Math.PI * 2);
    ctx.fill();

    // 火の粉
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 6 + Math.random() * 16, y + 6 + Math.random() * 16, 3, 3);
  });
}

// モリ＆ホース
function renderHarpoon(ctx: CanvasRenderingContext2D, player: Player) {
  if (!player.harpoonActive || player.isDead) return;

  const startX = player.x + TILE_SIZE / 2;
  const startY = player.y + TILE_SIZE / 2;

  let endX = startX;
  let endY = startY;

  switch (player.harpoonDir) {
    case 'RIGHT':
      endX = startX + player.harpoonLength;
      break;
    case 'LEFT':
      endX = startX - player.harpoonLength;
      break;
    case 'DOWN':
      endY = startY + player.harpoonLength;
      break;
    case 'UP':
      endY = startY - player.harpoonLength;
      break;
  }

  // 黄色の蛇腹ホース
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // ホースのストライプ節
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1;
  const dist = player.harpoonLength;
  for (let d = 4; d < dist; d += 8) {
    let px = startX;
    let py = startY;
    if (player.harpoonDir === 'RIGHT') px += d;
    else if (player.harpoonDir === 'LEFT') px -= d;
    else if (player.harpoonDir === 'DOWN') py += d;
    else if (player.harpoonDir === 'UP') py -= d;

    ctx.strokeRect(px - 1, py - 2, 2, 4);
  }

  // 先端のモリ（矢じり）
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;

  ctx.save();
  ctx.translate(endX, endY);
  let rot = 0;
  if (player.harpoonDir === 'RIGHT') rot = 0;
  else if (player.harpoonDir === 'LEFT') rot = Math.PI;
  else if (player.harpoonDir === 'DOWN') rot = Math.PI / 2;
  else if (player.harpoonDir === 'UP') rot = -Math.PI / 2;
  ctx.rotate(rot);

  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// プレイヤー（ディグダグ）
function renderPlayer(ctx: CanvasRenderingContext2D, player: Player) {
  const x = player.x;
  const y = player.y;

  ctx.save();
  ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);

  if (player.isDead) {
    // 死亡演出: くるくる回転しながら昇天
    const rot = (player.deathTimer * 0.15);
    ctx.rotate(rot);
    const alpha = Math.max(0, 1 - player.deathTimer / 60);
    ctx.globalAlpha = alpha;
  } else if (player.dir === 'LEFT') {
    ctx.scale(-1, 1);
  }

  // ヘルメット（白＆青のライン）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -2, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-9, -2, 18, 5);

  // ヘルメットつば・バイザー（青）
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, -3, 8, 4);

  // ゴーグルの中の目
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, -2, 3, 2);

  // ボディ（青い服）
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-7, 3, 14, 7);

  // 赤いグローブ＆シューズ
  ctx.fillStyle = '#dc2626';
  const walkOffset = player.isMoving ? Math.sin(player.animTimer * 0.4) * 2 : 0;
  // 前足・後足
  ctx.fillRect(-6 + walkOffset, 10, 5, 4);
  ctx.fillRect(1 - walkOffset, 10, 5, 4);

  // 手・ドリル
  if (player.isDigging) {
    // 掘削中のドリル/ツルハシ
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6, 1, 6, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(17, 3);
    ctx.lineTo(12, 6);
    ctx.fill();
  } else {
    // グローブ
    ctx.fillRect(4, 4, 4, 4);
  }

  ctx.restore();
}

// 敵キャラクター（プーカァ、ファイガー）
function renderEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const x = enemy.x;
  const y = enemy.y;

  ctx.save();
  ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);

  if (enemy.dir === 'LEFT') {
    ctx.scale(-1, 1);
  }

  // 1. ゴースト状態（土すり抜け中の目玉幽霊）
  if (enemy.state === 'GHOST') {
    renderGhostEyes(ctx, enemy);
    ctx.restore();
    return;
  }

  // 2. 膨張スケール（段階0: 1.0, 1: 1.25, 2: 1.55, 3: 1.9）
  let scale = 1.0;
  if (enemy.state === 'INFLATING') {
    scale = 1.0 + enemy.inflateLevel * 0.28;
  }
  ctx.scale(scale, scale);

  if (enemy.type === 'POOKA') {
    renderPooka(ctx, enemy);
  } else {
    renderFygar(ctx, enemy);
  }

  ctx.restore();
}

// ゴースト状態（目玉だけが土中をすり抜ける）
function renderGhostEyes(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  // ほのかな幽霊オーラ
  const pulse = Math.sin(enemy.animTimer * 0.2) * 2;
  ctx.fillStyle = enemy.type === 'POOKA' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 10 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // 大きな黄色いゴーグル枠
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.roundRect(-8, -5, 16, 10, 4);
  ctx.fill();

  // 白目
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6, -3, 5, 6);
  ctx.fillRect(1, -3, 5, 6);

  // 黒目・瞳（プレイヤーの方向を凝視）
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-3, -2, 2, 4);
  ctx.fillRect(4, -2, 2, 4);
}

// プーカァ（赤い風船モンスター）
function renderPooka(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  // まん丸な赤いボディ
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  // 黄色いゴーグル
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-4, -5, 12, 7);
  ctx.fillStyle = '#ca8a04';
  ctx.strokeRect(-4, -5, 12, 7);

  // ゴーグルの黒目
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, -3, 3, 4);

  // 足（黄色/オレンジのちっちゃい足）
  ctx.fillStyle = '#f97316';
  const legOffset = Math.sin(enemy.animTimer * 0.3) * 2;
  ctx.fillRect(-6 + legOffset, 8, 4, 3);
  ctx.fillRect(1 - legOffset, 8, 4, 3);

  // 膨張時のバタバタ表情
  if (enemy.inflateLevel >= 2) {
    ctx.fillStyle = '#ffffff';
    // 涙目
    ctx.fillRect(5, -1, 2, 2);
  }
}

// ファイガー（緑の火吹きドラゴン）
function renderFygar(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  // 火炎チャージ中の点滅（白・赤・緑）
  if (enemy.breathState === 'CHARGING') {
    const flash = Math.floor(enemy.breathTimer / 4) % 2 === 0;
    ctx.fillStyle = flash ? '#ef4444' : '#facc15';
  } else {
    ctx.fillStyle = '#16a34a'; // グリーンボディ
  }

  // ドラゴンの胴体
  ctx.beginPath();
  ctx.ellipse(0, 1, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 頭部
  ctx.fillRect(2, -7, 7, 8);

  // 黄色いツノ・トサカ
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.lineTo(-2, -10);
  ctx.lineTo(0, -6);
  ctx.fill();

  // 赤い小さな翼
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-7, -4, 5, 4);

  // 大きな目
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, -5, 3, 3);
  ctx.fillStyle = '#000000';
  ctx.fillRect(6, -4, 1, 2);

  // 足
  ctx.fillStyle = '#15803d';
  const legOffset = Math.sin(enemy.animTimer * 0.3) * 2;
  ctx.fillRect(-5 + legOffset, 7, 4, 3);
  ctx.fillRect(2 - legOffset, 7, 4, 3);
}

// 落石（Rock）
function renderRock(ctx: CanvasRenderingContext2D, rock: Rock) {
  const x = rock.x;
  const y = rock.y;

  ctx.save();
  ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);

  // グラグラ揺れ
  if (rock.state === 'WOBBLING') {
    const wobble = Math.sin(rock.wobbleTimer * 0.8) * 3;
    ctx.rotate((wobble * Math.PI) / 180);
  }

  // 岩の本体（丸みを帯びた大岩）
  ctx.fillStyle = '#78716c';
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-6, -10);
  ctx.lineTo(6, -9);
  ctx.lineTo(10, -4);
  ctx.lineTo(9, 7);
  ctx.lineTo(2, 10);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ハイライト（光沢）
  ctx.fillStyle = '#a8a29e';
  ctx.beginPath();
  ctx.arc(-3, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  // ひび割れ（クラック）
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1, -5);
  ctx.lineTo(3, 1);
  ctx.lineTo(-2, 4);
  ctx.stroke();

  ctx.restore();
}

// ボーナスアイテム（野菜/フルーツ）
function renderBonusItem(ctx: CanvasRenderingContext2D, bonus: BonusItem) {
  const x = bonus.x;
  const y = bonus.y;

  ctx.save();
  ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);

  // 浮遊アニメーション
  const floatY = Math.sin(bonus.timer * 0.1) * 3;
  ctx.translate(0, floatY);

  // 輝きオーラ
  ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // アイテムドット絵
  ctx.fillStyle = bonus.color;
  ctx.beginPath();
  ctx.arc(0, 2, 8, 0, Math.PI * 2);
  ctx.fill();

  // ヘタ（緑）
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-2, -9, 4, 4);
  ctx.fillRect(-4, -7, 8, 2);

  ctx.restore();
}

// パーティクル描画
function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((p) => {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.type === 'STAR') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  });
}

// 浮遊スコアテキスト
function renderFloatingScores(ctx: CanvasRenderingContext2D, scores: FloatingScore[]) {
  scores.forEach((s) => {
    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = s.color;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.fillText(`+${s.score}`, s.x, s.y);
    ctx.restore();
  });
}
