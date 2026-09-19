import {
  COLS,
  ROWS,
  TILE_SIZE,
  TILE_SKY,
  TILE_DIRT,
  TILE_TUNNEL,
  SURFACE_ROWS,
  PLAYER_SPEED,
  HARPOON_MAX_LENGTH,
  HARPOON_SPEED,
  POOKA_BASE_SPEED,
  FYGAR_BASE_SPEED,
  GHOST_SPEED,
  ESCAPE_SPEED,
  MAX_INFLATE_LEVEL,
  DEFLATE_DELAY,
  DEFLATE_INTERVAL,
  ROCK_WOBBLE_FRAMES,
  ROCK_FALL_ACCEL,
  ROCK_MAX_FALL_SPEED,
  SCORE_DIG,
  SCORES_DEEP,
  SCORES_FYGAR_HORIZONTAL,
  SCORES_ROCK_CRUSH,
  STAGE_CONFIGS,
} from './constants';
import {
  Direction,
  Player,
  Enemy,
  Rock,
  BonusItem,
  Particle,
  FloatingScore,
  FireTile,
} from './types';
import { digDugAudio } from './audio';

// ステージ初期化
export function initStageWorld(round: number) {
  // ステージテンプレートの取得（3面以降はループ＆難易度アップ）
  const stageIdx = (round - 1) % STAGE_CONFIGS.length;
  const loop = Math.floor((round - 1) / STAGE_CONFIGS.length);
  const config = STAGE_CONFIGS[stageIdx];

  // グリッド初期化
  const grid: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (r < SURFACE_ROWS) {
        row.push(TILE_SKY);
      } else {
        row.push(TILE_DIRT);
      }
    }
    grid.push(row);
  }

  // 初期トンネルの掘削
  config.initialTunnels.forEach((t) => {
    for (let r = t.row; r < Math.min(ROWS, t.row + t.h); r++) {
      for (let c = t.col; c < Math.min(COLS, t.col + t.w); c++) {
        if (r >= SURFACE_ROWS) {
          grid[r][c] = TILE_TUNNEL;
        }
      }
    }
  });

  // プレイヤー初期化（中央スタート）
  const player: Player = {
    x: 6 * TILE_SIZE,
    y: 1 * TILE_SIZE,
    dir: 'RIGHT',
    nextDir: 'NONE',
    isMoving: false,
    isDigging: false,
    animFrame: 0,
    animTimer: 0,
    isDead: false,
    deathTimer: 0,
    deathType: 'MONSTER',
    harpoonActive: false,
    harpoonLength: 0,
    harpoonDir: 'RIGHT',
    targetEnemyId: null,
  };

  // 敵の初期化
  const speedBonus = loop * 0.15;
  const enemies: Enemy[] = config.enemies.map((e, idx) => ({
    id: idx + 1,
    type: e.type,
    x: e.col * TILE_SIZE,
    y: e.row * TILE_SIZE,
    dir: e.dir,
    speed: (e.type === 'POOKA' ? POOKA_BASE_SPEED : FYGAR_BASE_SPEED) + speedBonus,
    state: 'NORMAL',
    ghostTimer: 300 + Math.random() * 200,
    ghostDuration: 0,
    inflateLevel: 0,
    deflateTimer: 0,
    breathState: 'IDLE',
    breathTimer: 0,
    breathDir: e.dir,
    animFrame: 0,
    animTimer: 0,
    isDead: false,
  }));

  // 落石の初期化
  const rocks: Rock[] = config.rocks.map((r, idx) => ({
    id: idx + 1,
    col: r.col,
    row: r.row,
    x: r.col * TILE_SIZE,
    y: r.row * TILE_SIZE,
    state: 'STABLE',
    wobbleTimer: 0,
    fallSpeed: 0,
    crushedCount: 0,
  }));

  // 落石のマスを確実に土にしておく
  rocks.forEach((rock) => {
    if (rock.row >= SURFACE_ROWS) {
      grid[rock.row][rock.col] = TILE_DIRT;
    }
  });

  return { grid, player, enemies, rocks };
}

// 深度インデックス (0〜3)
function getDepthIndex(y: number): number {
  const row = Math.floor(y / TILE_SIZE);
  if (row <= 4) return 0;
  if (row <= 7) return 1;
  if (row <= 11) return 2;
  return 3;
}

// パーティクル生成ヘルパー
export function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  type: Particle['type'] = 'DIRT'
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.5;
    particles.push({
      id: Math.random(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 3,
      life: 20 + Math.random() * 20,
      maxLife: 40,
      type,
    });
  }
}

// 物理・ゲームループ全体の更新処理
export function updateDigDugPhysics(
  grid: number[][],
  player: Player,
  enemies: Enemy[],
  rocks: Rock[],
  bonusItem: BonusItem | null,
  particles: Particle[],
  floatingScores: FloatingScore[],
  fireTiles: FireTile[],
  inputs: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    pump: boolean;
    pumpJustPressed: boolean;
  },
  onAddScore: (points: number) => void,
  onPlayerDeath: () => void,
  onSpawnBonus: () => void,
  _round: number
): { isRoundClear: boolean } {
  // 1. プレイヤーが死亡している場合のタイマー進行
  if (player.isDead) {
    player.deathTimer++;
    // パーティクル更新のみ行いリターン
    updateParticles(particles);
    return { isRoundClear: false };
  }

  // 2. プレイヤーの移動＆掘削
  handlePlayerMovement(grid, player, inputs, particles, onAddScore);

  // 3. モリ＆空気ポンプの処理
  handleHarpoon(grid, player, enemies, inputs, particles, floatingScores, onAddScore);

  // 4. 落石（Rock）の物理＆当たり判定
  handleRocks(grid, rocks, player, enemies, particles, floatingScores, onAddScore, onPlayerDeath, onSpawnBonus);

  // 5. 敵キャラクターのAI更新（プーカァ＆ファイガー）
  handleEnemies(grid, enemies, player, fireTiles, onPlayerDeath);

  // 6. ボーナスアイテム（野菜/フルーツ）の判定
  if (bonusItem && bonusItem.active) {
    bonusItem.timer++;
    const px = player.x + TILE_SIZE / 2;
    const py = player.y + TILE_SIZE / 2;
    const bx = bonusItem.x + TILE_SIZE / 2;
    const by = bonusItem.y + TILE_SIZE / 2;
    const dist = Math.hypot(px - bx, py - by);

    if (dist < TILE_SIZE * 0.85) {
      // 取得！
      bonusItem.active = false;
      digDugAudio.playBonusItem();
      onAddScore(bonusItem.points);
      floatingScores.push({
        id: Math.random(),
        x: bonusItem.x + TILE_SIZE / 2,
        y: bonusItem.y,
        score: bonusItem.points,
        color: '#facc15',
        life: 50,
      });
      spawnParticles(particles, bx, by, '#facc15', 12, 'STAR');
    } else if (bonusItem.timer > 600) {
      // 10秒で消滅
      bonusItem.active = false;
    }
  }

  // 7. パーティクル・浮遊スコアの更新
  updateParticles(particles);
  updateFloatingScores(floatingScores);

  // 8. 生存敵のチェック＆ラウンドクリア判定
  const aliveEnemies = enemies.filter((e) => !e.isDead);
  if (aliveEnemies.length === 0) {
    return { isRoundClear: true };
  }

  // 敵がラスト1体になったらエスケープ状態にし、BGMを高速化
  if (aliveEnemies.length === 1 && aliveEnemies[0].state !== 'ESCAPING') {
    aliveEnemies[0].state = 'ESCAPING';
    digDugAudio.setSpeedUp(true);
  }

  // 歩行BGMの同期
  digDugAudio.updateWalking(player.isMoving);

  return { isRoundClear: false };
}

// プレイヤー移動とスムーズなグリッド吸着・掘削
function handlePlayerMovement(
  grid: number[][],
  player: Player,
  inputs: { up: boolean; down: boolean; left: boolean; right: boolean },
  particles: Particle[],
  onAddScore: (points: number) => void
) {
  // 入力から希望方向を決定
  let reqDir: Direction = 'NONE';
  if (inputs.up) reqDir = 'UP';
  else if (inputs.down) reqDir = 'DOWN';
  else if (inputs.left) reqDir = 'LEFT';
  else if (inputs.right) reqDir = 'RIGHT';

  player.nextDir = reqDir;

  // モリ射出中かつ接続中（ポンプ中）はプレイヤーはその場に固定
  if (player.harpoonActive && player.targetEnemyId !== null) {
    player.isMoving = false;
    player.isDigging = false;
    return;
  }

  // グリッド中心合わせ（スムーズなターン補助）
  const snapThreshold = 6.0;
  const col = Math.round(player.x / TILE_SIZE);
  const row = Math.round(player.y / TILE_SIZE);
  const targetX = col * TILE_SIZE;
  const targetY = row * TILE_SIZE;

  // 方向転換可能かのチェック
  if (reqDir !== 'NONE' && reqDir !== player.dir) {
    const isOpposite =
      (player.dir === 'LEFT' && reqDir === 'RIGHT') ||
      (player.dir === 'RIGHT' && reqDir === 'LEFT') ||
      (player.dir === 'UP' && reqDir === 'DOWN') ||
      (player.dir === 'DOWN' && reqDir === 'UP');

    if (isOpposite) {
      player.dir = reqDir;
    } else {
      // 垂直転換の場合、グリッド軸に近い時のみ方向転換を許可
      if (reqDir === 'UP' || reqDir === 'DOWN') {
        if (Math.abs(player.x - targetX) < snapThreshold) {
          player.x = targetX;
          player.dir = reqDir;
        }
      } else if (reqDir === 'LEFT' || reqDir === 'RIGHT') {
        if (Math.abs(player.y - targetY) < snapThreshold) {
          player.y = targetY;
          player.dir = reqDir;
        }
      }
    }
  }

  // 実際の移動実行
  let moved = false;
  let digging = false;

  if (reqDir !== 'NONE') {
    let nextX = player.x;
    let nextY = player.y;

    if (player.dir === 'UP') nextY -= PLAYER_SPEED;
    if (player.dir === 'DOWN') nextY += PLAYER_SPEED;
    if (player.dir === 'LEFT') nextX -= PLAYER_SPEED;
    if (player.dir === 'RIGHT') nextX += PLAYER_SPEED;

    // 画面境界制限
    const minX = 0;
    const maxX = (COLS - 1) * TILE_SIZE;
    const minY = 0;
    const maxY = (ROWS - 1) * TILE_SIZE;

    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    if (nextX !== player.x || nextY !== player.y) {
      player.x = nextX;
      player.y = nextY;
      moved = true;
    }
  }

  player.isMoving = moved;
  if (moved) {
    player.animTimer++;
    if (player.animTimer % 6 === 0) {
      player.animFrame = (player.animFrame + 1) % 4;
    }

    // 掘削判定: プレイヤーの中心が含まれるタイルをチェック
    const c = Math.floor((player.x + TILE_SIZE / 2) / TILE_SIZE);
    const r = Math.floor((player.y + TILE_SIZE / 2) / TILE_SIZE);

    if (r >= SURFACE_ROWS && r < ROWS && c >= 0 && c < COLS) {
      if (grid[r][c] === TILE_DIRT) {
        grid[r][c] = TILE_TUNNEL;
        digging = true;
        onAddScore(SCORE_DIG);
        // 土煙パーティクル
        spawnParticles(
          particles,
          c * TILE_SIZE + TILE_SIZE / 2,
          r * TILE_SIZE + TILE_SIZE / 2,
          '#b45309',
          4,
          'DIRT'
        );
      }
    }
  }
  player.isDigging = digging;
}

// モリ発射＆空気ポンプ処理
function handleHarpoon(
  grid: number[][],
  player: Player,
  enemies: Enemy[],
  inputs: { pump: boolean; pumpJustPressed: boolean },
  particles: Particle[],
  floatingScores: FloatingScore[],
  onAddScore: (points: number) => void
) {
  // モリ発射トリガー
  if (inputs.pumpJustPressed && !player.harpoonActive) {
    player.harpoonActive = true;
    player.harpoonDir = player.dir;
    player.harpoonLength = 0;
    player.targetEnemyId = null;
    digDugAudio.playHarpoonShoot();
  }

  // モリがアクティブな場合の伸長＆接続処理
  if (player.harpoonActive) {
    // 敵に未接続の場合：前方へ伸ばす
    if (player.targetEnemyId === null) {
      player.harpoonLength += HARPOON_SPEED;

      const px = player.x + TILE_SIZE / 2;
      const py = player.y + TILE_SIZE / 2;

      let tipX = px;
      let tipY = py;
      if (player.harpoonDir === 'RIGHT') tipX += player.harpoonLength;
      else if (player.harpoonDir === 'LEFT') tipX -= player.harpoonLength;
      else if (player.harpoonDir === 'DOWN') tipY += player.harpoonLength;
      else if (player.harpoonDir === 'UP') tipY -= player.harpoonLength;

      // 土壁との衝突チェック（土に入ったら止まる）
      const tipCol = Math.floor(tipX / TILE_SIZE);
      const tipRow = Math.floor(tipY / TILE_SIZE);
      const hitWall =
        tipRow >= SURFACE_ROWS &&
        tipRow < ROWS &&
        tipCol >= 0 &&
        tipCol < COLS &&
        grid[tipRow][tipCol] === TILE_DIRT;

      // 最大射程または壁に当たったらモリ回収
      if (player.harpoonLength >= HARPOON_MAX_LENGTH || hitWall) {
        player.harpoonActive = false;
        player.harpoonLength = 0;
      } else {
        // 敵との当たり判定
        for (const enemy of enemies) {
          if (!enemy.isDead && enemy.state !== 'CRUSHED') {
            const ex = enemy.x + TILE_SIZE / 2;
            const ey = enemy.y + TILE_SIZE / 2;
            const hitDist = Math.hypot(tipX - ex, tipY - ey);

            if (hitDist < TILE_SIZE * 0.65) {
              // モリが刺さった！
              player.targetEnemyId = enemy.id;
              enemy.state = 'INFLATING';
              enemy.deflateTimer = 0;
              enemy.inflateLevel = 1;
              digDugAudio.playPump(1);
              break;
            }
          }
        }
      }
    } else {
      // すでに敵に接続中：ボタン押下で空気を注入
      const target = enemies.find((e) => e.id === player.targetEnemyId);
      if (!target || target.isDead) {
        // 敵が存在しない・死亡時は解除
        player.harpoonActive = false;
        player.targetEnemyId = null;
        return;
      }

      // ポンプボタン押下で空気注入
      if (inputs.pumpJustPressed) {
        target.inflateLevel++;
        target.deflateTimer = 0;
        digDugAudio.playPump(target.inflateLevel);

        // 限界膨張で破裂！
        if (target.inflateLevel >= MAX_INFLATE_LEVEL) {
          target.isDead = true;
          player.harpoonActive = false;
          player.targetEnemyId = null;
          digDugAudio.playPop();

          // スコア計算（深度ボーナス＆ファイガー横ボーナス）
          const depth = getDepthIndex(target.y);
          let points = SCORES_DEEP[depth];
          if (target.type === 'FYGAR') {
            const isHorizontal = player.harpoonDir === 'LEFT' || player.harpoonDir === 'RIGHT';
            if (isHorizontal) {
              points = SCORES_FYGAR_HORIZONTAL[depth];
            }
          }
          onAddScore(points);

          // 浮遊スコア
          floatingScores.push({
            id: Math.random(),
            x: target.x + TILE_SIZE / 2,
            y: target.y,
            score: points,
            color: '#facc15',
            life: 50,
          });

          // 破裂パーティクル
          spawnParticles(
            particles,
            target.x + TILE_SIZE / 2,
            target.y + TILE_SIZE / 2,
            target.type === 'POOKA' ? '#ef4444' : '#22c55e',
            16,
            'POP'
          );
        }
      }
    }
  }
}

// 落石（Rock）の物理
function handleRocks(
  grid: number[][],
  rocks: Rock[],
  player: Player,
  enemies: Enemy[],
  particles: Particle[],
  floatingScores: FloatingScore[],
  onAddScore: (points: number) => void,
  onPlayerDeath: () => void,
  onSpawnBonus: () => void
) {
  rocks.forEach((rock) => {
    if (rock.state === 'BROKEN') return;

    if (rock.state === 'STABLE') {
      // 岩の真下のマスが掘られて空洞（TUNNELまたはSKY）になったか？
      const belowRow = rock.row + 1;
      if (belowRow < ROWS && grid[belowRow][rock.col] !== TILE_DIRT) {
        // グラグラ開始！
        rock.state = 'WOBBLING';
        rock.wobbleTimer = ROCK_WOBBLE_FRAMES;
        digDugAudio.playRockWobble();
      }
    } else if (rock.state === 'WOBBLING') {
      rock.wobbleTimer--;
      if (rock.wobbleTimer <= 0) {
        // 落下開始！
        rock.state = 'FALLING';
        rock.fallSpeed = 2.0;
        // 岩があったマスをトンネルにする
        grid[rock.row][rock.col] = TILE_TUNNEL;
      }
    } else if (rock.state === 'FALLING') {
      rock.fallSpeed = Math.min(ROCK_MAX_FALL_SPEED, rock.fallSpeed + ROCK_FALL_ACCEL);
      rock.y += rock.fallSpeed;

      const curRow = Math.floor((rock.y + TILE_SIZE / 2) / TILE_SIZE);
      rock.row = curRow;

      // 敵の押し潰し判定
      enemies.forEach((enemy) => {
        if (!enemy.isDead && enemy.state !== 'CRUSHED') {
          const ex = enemy.x + TILE_SIZE / 2;
          const ey = enemy.y + TILE_SIZE / 2;
          const rx = rock.x + TILE_SIZE / 2;
          const ry = rock.y + TILE_SIZE / 2;

          if (Math.abs(ex - rx) < TILE_SIZE * 0.75 && Math.abs(ey - ry) < TILE_SIZE * 0.75) {
            // 敵を巻き込みペシャンコ！
            enemy.state = 'CRUSHED';
            enemy.isDead = true;
            rock.crushedCount++;
            spawnParticles(particles, ex, ey, '#ef4444', 10, 'ROCK');
          }
        }
      });

      // プレイヤーの押し潰し判定
      const px = player.x + TILE_SIZE / 2;
      const py = player.y + TILE_SIZE / 2;
      const rx = rock.x + TILE_SIZE / 2;
      const ry = rock.y + TILE_SIZE / 2;
      if (Math.abs(px - rx) < TILE_SIZE * 0.7 && Math.abs(py - ry) < TILE_SIZE * 0.7) {
        player.isDead = true;
        player.deathType = 'ROCK';
        digDugAudio.playPlayerDeath();
        onPlayerDeath();
      }

      // 着地判定（真下の土マスまたは最下段に激突）
      const nextRow = Math.floor((rock.y + TILE_SIZE) / TILE_SIZE);
      const isAtBottom = nextRow >= ROWS;
      const hitsDirt = nextRow < ROWS && grid[nextRow][rock.col] === TILE_DIRT;

      if (isAtBottom || hitsDirt) {
        // 粉砕！
        rock.state = 'BROKEN';
        digDugAudio.playRockCrash();
        spawnParticles(particles, rx, ry, '#78716c', 14, 'ROCK');

        // まとめて倒したボーナス加算
        if (rock.crushedCount > 0) {
          const comboIdx = Math.min(SCORES_ROCK_CRUSH.length - 1, rock.crushedCount - 1);
          const points = SCORES_ROCK_CRUSH[comboIdx];
          onAddScore(points);
          floatingScores.push({
            id: Math.random(),
            x: rx,
            y: ry - 10,
            score: points,
            color: '#38bdf8',
            life: 60,
          });
        }

        // 岩を2個落とすとボーナスアイテム出現
        onSpawnBonus();
      }
    }
  });
}

// 敵キャラクターAI（プーカァ、ファイガー）
function handleEnemies(
  grid: number[][],
  enemies: Enemy[],
  player: Player,
  fireTiles: FireTile[],
  onPlayerDeath: () => void
) {
  // 火炎タイルの初期化
  fireTiles.length = 0;

  enemies.forEach((enemy) => {
    if (enemy.isDead) return;

    enemy.animTimer++;

    // 1. 空気注入中の処理
    if (enemy.state === 'INFLATING') {
      enemy.deflateTimer++;
      // 一定時間放置されたら空気が抜けていく
      if (enemy.deflateTimer >= DEFLATE_DELAY) {
        if (enemy.deflateTimer % DEFLATE_INTERVAL === 0) {
          enemy.inflateLevel--;
          if (enemy.inflateLevel <= 0) {
            enemy.state = 'NORMAL';
            enemy.inflateLevel = 0;
          }
        }
      }
      return; // 膨らんでいる間は移動不能
    }

    // 2. ゴースト状態タイマー
    if (enemy.state === 'NORMAL') {
      enemy.ghostTimer--;
      if (enemy.ghostTimer <= 0) {
        enemy.state = 'GHOST';
        enemy.ghostDuration = 240; // 約4秒間ゴースト化
      }
    } else if (enemy.state === 'GHOST') {
      enemy.ghostDuration--;
      // トンネルのど真ん中に入り、ある程度時間が経過していたら通常に戻る
      const curCol = Math.round(enemy.x / TILE_SIZE);
      const curRow = Math.round(enemy.y / TILE_SIZE);
      const isAligned =
        Math.abs(enemy.x - curCol * TILE_SIZE) < 3 &&
        Math.abs(enemy.y - curRow * TILE_SIZE) < 3;

      if (isAligned && curRow < ROWS && curCol < COLS && grid[curRow][curCol] === TILE_TUNNEL && enemy.ghostDuration < 160) {
        enemy.state = 'NORMAL';
        enemy.x = curCol * TILE_SIZE;
        enemy.y = curRow * TILE_SIZE;
        enemy.ghostTimer = 300 + Math.random() * 250;
      }
    }

    // 3. 移動処理
    if (enemy.state === 'GHOST') {
      // ゴースト時: 土壁を無視してプレイヤーへ直線接近
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const angle = Math.atan2(dy, dx);
      enemy.x += Math.cos(angle) * GHOST_SPEED;
      enemy.y += Math.sin(angle) * GHOST_SPEED;
      enemy.dir = dx >= 0 ? 'RIGHT' : 'LEFT';
    } else if (enemy.state === 'ESCAPING') {
      // ラスト1匹の脱出: 画面左上（0, 1）を目指す
      const targetX = 0;
      const targetY = 1 * TILE_SIZE;
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;

      if (Math.abs(dx) > 2) {
        enemy.x += Math.sign(dx) * ESCAPE_SPEED;
        enemy.dir = dx >= 0 ? 'RIGHT' : 'LEFT';
      } else if (Math.abs(dy) > 2) {
        enemy.y += Math.sign(dy) * ESCAPE_SPEED;
        enemy.dir = dy >= 0 ? 'DOWN' : 'UP';
      } else {
        // 脱出完了！
        enemy.isDead = true;
      }
    } else {
      // 通常移動: トンネル内をパトロール
      moveEnemyInTunnels(grid, enemy);

      // ファイガー専用：火炎放射チェック
      if (enemy.type === 'FYGAR') {
        handleFygarBreath(enemy, player, fireTiles, onPlayerDeath);
      }
    }

    // 4. プレイヤーとの接触ミス判定
    const px = player.x + TILE_SIZE / 2;
    const py = player.y + TILE_SIZE / 2;
    const ex = enemy.x + TILE_SIZE / 2;
    const ey = enemy.y + TILE_SIZE / 2;
    const dist = Math.hypot(px - ex, py - ey);

    // ゴースト状態または通常状態で接触するとミス（膨らみレベル1以上の時はすれ違いセーフ）
    if (dist < TILE_SIZE * 0.72 && enemy.inflateLevel === 0 && !player.isDead) {
      player.isDead = true;
      player.deathType = 'MONSTER';
      digDugAudio.playPlayerDeath();
      onPlayerDeath();
    }
  });
}

// トンネル内の敵移動
function moveEnemyInTunnels(grid: number[][], enemy: Enemy) {
  const col = Math.round(enemy.x / TILE_SIZE);
  const row = Math.round(enemy.y / TILE_SIZE);
  const isAtGridCenter =
    Math.abs(enemy.x - col * TILE_SIZE) < enemy.speed &&
    Math.abs(enemy.y - row * TILE_SIZE) < enemy.speed;

  if (isAtGridCenter) {
    enemy.x = col * TILE_SIZE;
    enemy.y = row * TILE_SIZE;

    // 分岐点で進行可能な方向を探す
    const availableDirs: Direction[] = [];
    if (canEnemyEnter(grid, col + 1, row)) availableDirs.push('RIGHT');
    if (canEnemyEnter(grid, col - 1, row)) availableDirs.push('LEFT');
    if (canEnemyEnter(grid, col, row - 1)) availableDirs.push('UP');
    if (canEnemyEnter(grid, col, row + 1)) availableDirs.push('DOWN');

    if (availableDirs.length > 0) {
      // 今の方向が進行可能なら高確率で直進、たまに方向転換
      const canKeepGoing = availableDirs.includes(enemy.dir);
      if (!canKeepGoing || Math.random() < 0.25) {
        enemy.dir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
      }
    }
  }

  // 前進
  if (enemy.dir === 'RIGHT') enemy.x += enemy.speed;
  if (enemy.dir === 'LEFT') enemy.x -= enemy.speed;
  if (enemy.dir === 'UP') enemy.y -= enemy.speed;
  if (enemy.dir === 'DOWN') enemy.y += enemy.speed;
}

function canEnemyEnter(grid: number[][], col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  // 地上またはトンネルのみ進入可能
  return grid[row][col] === TILE_TUNNEL || grid[row][col] === TILE_SKY;
}

// ファイガー火炎放射
function handleFygarBreath(
  enemy: Enemy,
  player: Player,
  fireTiles: FireTile[],
  onPlayerDeath: () => void
) {
  if (enemy.breathState === 'IDLE') {
    // プレイヤーと同じ行（水平）にいて、距離が3〜4マス以内の時に火炎チャージ
    const sameRow = Math.abs(enemy.y - player.y) < TILE_SIZE * 0.6;
    const dist = (player.x - enemy.x) / TILE_SIZE;
    const lookingAtPlayer = (enemy.dir === 'RIGHT' && dist > 0 && dist < 4) || (enemy.dir === 'LEFT' && dist < 0 && dist > -4);

    if (sameRow && lookingAtPlayer && Math.random() < 0.03) {
      enemy.breathState = 'CHARGING';
      enemy.breathTimer = 40; // 40フレームチャージ点滅
      enemy.breathDir = enemy.dir;
      digDugAudio.playFygarCharge();
    }
  } else if (enemy.breathState === 'CHARGING') {
    enemy.breathTimer--;
    if (enemy.breathTimer <= 0) {
      enemy.breathState = 'BREATHING';
      enemy.breathTimer = 35; // 35フレーム火炎噴射
      digDugAudio.playFygarFire();
    }
  } else if (enemy.breathState === 'BREATHING') {
    enemy.breathTimer--;

    // 前方に2〜3マス分の火炎タイルを生成
    const baseCol = Math.round(enemy.x / TILE_SIZE);
    const baseRow = Math.round(enemy.y / TILE_SIZE);
    const step = enemy.breathDir === 'RIGHT' ? 1 : -1;

    for (let i = 1; i <= 3; i++) {
      const fc = baseCol + i * step;
      if (fc >= 0 && fc < COLS) {
        fireTiles.push({
          col: fc,
          row: baseRow,
          x: fc * TILE_SIZE,
          y: baseRow * TILE_SIZE,
          intensity: 1.0,
        });

        // プレイヤーとの火炎接触判定
        const px = player.x + TILE_SIZE / 2;
        const py = player.y + TILE_SIZE / 2;
        const fx = fc * TILE_SIZE + TILE_SIZE / 2;
        const fy = baseRow * TILE_SIZE + TILE_SIZE / 2;

        if (Math.abs(px - fx) < TILE_SIZE * 0.7 && Math.abs(py - fy) < TILE_SIZE * 0.7 && !player.isDead) {
          player.isDead = true;
          player.deathType = 'FIRE';
          digDugAudio.playPlayerDeath();
          onPlayerDeath();
        }
      }
    }

    if (enemy.breathTimer <= 0) {
      enemy.breathState = 'IDLE';
    }
  }
}

// パーティクル更新
function updateParticles(particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// 浮遊スコア更新
function updateFloatingScores(scores: FloatingScore[]) {
  for (let i = scores.length - 1; i >= 0; i--) {
    const s = scores[i];
    s.y -= 0.75;
    s.life--;
    if (s.life <= 0) {
      scores.splice(i, 1);
    }
  }
}
