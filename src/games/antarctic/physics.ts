// けっきょく南極大冒険 物理・擬似3Dパースペクティブ演算

import {
  PlayerState,
  AntarcticWorldState,
  InputState,
  Obstacle,
  ItemFlag,
} from './types';
import { antarcticAudio } from './audio';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const HORIZON_Y = 220; // 地平線のY位置
export const ROAD_BASE_WIDTH = 340; // 画面手前での道路の半幅 (px)
export const MAX_VIEW_DISTANCE = 320; // 視界の最大Z距離 (m)
export const PLAYER_Z = 20; // プレイヤーの固定Z位置 (m)

/**
 * 3Dワールド座標 (x: -1〜1, z: 0〜MAX_VIEW_DISTANCE) を 2Dスクリーン座標に変換
 */
export function project3D(
  worldX: number,
  worldZ: number,
  curveOffset: number = 0
): { screenX: number; screenY: number; scale: number; visible: boolean } {
  if (worldZ < 5 || worldZ > MAX_VIEW_DISTANCE) {
    return { screenX: 0, screenY: 0, scale: 0, visible: false };
  }

  // 0(手前) 〜 1(地平線奥)
  const zNorm = Math.min(1, Math.max(0, worldZ / MAX_VIEW_DISTANCE));
  // 手前ほど急激に大きくなるパースペクティブカーブ
  const p = 1 - zNorm;
  const scale = Math.pow(p, 1.85);

  const screenY = HORIZON_Y + (CANVAS_HEIGHT - 60 - HORIZON_Y) * scale;
  const roadHalfW = ROAD_BASE_WIDTH * scale;
  // カーブによる横ずれ（奥ほどカーブの影響が大きい）
  const curveX = curveOffset * Math.pow(1 - scale, 1.5) * 220;
  const screenX = CANVAS_WIDTH / 2 + curveX + worldX * roadHalfW;

  return { screenX, screenY, scale, visible: true };
}

/**
 * プレイヤーの初期化
 */
export function createInitialPlayer(): PlayerState {
  return {
    x: 0,
    speed: 0,
    distanceTraveledKm: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isPropellerActive: false,
    propellerTimer: 0,
    propellerHover: false,
    hitState: 'none',
    hitTimer: 0,
    struggles: 0,
    animTick: 0,
    facing: 'straight',
  };
}

/**
 * メイン物理更新
 */
export function updateAntarcticPhysics(
  player: PlayerState,
  world: AntarcticWorldState,
  inputs: InputState,
  dt: number, // デルタタイム (秒)
  addScore: (points: number) => void
): { isStageClear: boolean; isTimeUp: boolean } {
  let isStageClear = false;
  let isTimeUp = false;

  // --- 1. 時間・距離の更新 ---
  if (world.remainingTimeSec > 0 && !world.stationVisible) {
    world.remainingTimeSec = Math.max(0, world.remainingTimeSec - dt);
    if (world.remainingTimeSec <= 0) {
      isTimeUp = true;
      antarcticAudio.playGameOver();
      return { isStageClear, isTimeUp };
    }
  }

  // 残り距離の減少 (speed km/h -> km/sec)
  // ゲームのテンポに合わせて適切なスピード感に調整
  const distancePerSec = (player.speed / 3600) * 14.5;
  const distTravel = distancePerSec * dt;
  player.distanceTraveledKm += distTravel;
  world.remainingDistanceKm = Math.max(0, world.remainingDistanceKm - distTravel);

  // ゴール基地の可視化判定 (残り 25km 以下で遠くに見え始める)
  if (world.remainingDistanceKm <= 25 && !world.stationVisible) {
    world.stationVisible = true;
    world.stationZ = MAX_VIEW_DISTANCE;
  }

  if (world.stationVisible) {
    world.stationZ -= (player.speed / 3600) * 800 * dt;
    if (world.stationZ <= PLAYER_Z + 15) {
      // 基地に到着！ステージクリア
      isStageClear = true;
      player.speed = 0;
      antarcticAudio.playClearFanfare();
      return { isStageClear, isTimeUp };
    }
  }

  // --- 2. プレイヤーの衝突・硬直状態の処理 ---
  if (player.hitState !== 'none') {
    player.speed = Math.max(0, player.speed - 300 * dt);

    if (player.hitState === 'hole') {
      // 穴にはまり中: 左右キー連打で脱出
      if (inputs.jumpJustPressed || inputs.left || inputs.right) {
        player.struggles += 1;
        antarcticAudio.playStruggle();
        // 土煙パーティクル
        spawnIceParticles(world, 0, 0, 4);
      }
      player.hitTimer -= dt;
      if (player.struggles >= 4 || player.hitTimer <= 0) {
        player.hitState = 'none';
        player.struggles = 0;
        player.speed = 25;
      }
    } else {
      // 転倒またはアザラシ激突
      player.hitTimer -= dt;
      if (player.hitTimer <= 0) {
        player.hitState = 'none';
        player.speed = 20;
      }
    }
    return { isStageClear, isTimeUp };
  }

  // --- 3. 加速・減速・ブレーキ ---
  const MAX_SPEED = player.isPropellerActive ? 120 : 105;
  const ACCEL = 38;
  const BRAKE = 65;
  const NATURAL_DECEL = 16;

  if (inputs.up) {
    player.speed = Math.min(MAX_SPEED, player.speed + ACCEL * dt);
  } else if (inputs.down) {
    player.speed = Math.max(0, player.speed - BRAKE * dt);
  } else {
    // 自然減速（ただし巡航速度 75km/h 程度までは緩やかに維持）
    if (player.speed > 75) {
      player.speed = Math.max(75, player.speed - NATURAL_DECEL * dt);
    } else if (player.speed < 55) {
      player.speed = Math.min(55, player.speed + 15 * dt);
    }
  }

  // --- 4. 左右ハンドル移動 ---
  const steerSpeed = (1.4 + (player.speed / MAX_SPEED) * 0.4) * dt;
  if (inputs.left) {
    player.x = Math.max(-0.85, player.x - steerSpeed);
    player.facing = 'left';
  } else if (inputs.right) {
    player.x = Math.min(0.85, player.x + steerSpeed);
    player.facing = 'right';
  } else {
    player.facing = 'straight';
  }

  // --- 5. ジャンプ & プロペラ浮遊 ---
  const GRAVITY = 850;
  const JUMP_POWER = 390;

  // プロペラタイマー
  if (player.isPropellerActive) {
    player.propellerTimer -= dt;
    if (player.propellerTimer <= 0) {
      player.isPropellerActive = false;
    }
  }

  if (player.isPropellerActive && inputs.jump) {
    // プロペラホバリング
    player.isJumping = true;
    player.propellerHover = true;
    player.y = Math.min(95, player.y + 120 * dt);
    player.vy = 0;
    if (Math.random() < 0.25) {
      antarcticAudio.playPropellerFlap();
    }
  } else if (!player.isJumping) {
    if (inputs.jumpJustPressed) {
      player.isJumping = true;
      player.vy = JUMP_POWER;
      antarcticAudio.playJump();
    }
  } else {
    // 通常ジャンプ落下
    player.propellerHover = false;
    player.vy -= GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.isJumping = false;
      antarcticAudio.playLand();
      // 着地スノーエフェクト
      spawnIceParticles(world, player.x, 0, 3);
    }
  }

  // アニメーション足音
  player.animTick += (player.speed / 20) * dt;
  if (!player.isJumping && player.speed > 10) {
    const stepInterval = Math.max(0.18, 0.45 - (player.speed / MAX_SPEED) * 0.25);
    if (Math.floor(player.animTick / stepInterval) !== Math.floor((player.animTick - dt * 2) / stepInterval)) {
      antarcticAudio.playFootstep(Math.floor(player.animTick / stepInterval) % 2 === 0);
    }
  }

  // --- 6. 道路のカーブ変化 ---
  world.curveTimer -= dt;
  if (world.curveTimer <= 0) {
    world.curveTimer = 3.5 + Math.random() * 4.0;
    world.targetCurve = (Math.random() - 0.5) * 1.6;
  }
  world.curveOffset += (world.targetCurve - world.curveOffset) * 1.2 * dt;

  // --- 7. 障害物とアイテムのスクロール・出現・当たり判定 ---
  const scrollSpeed = (player.speed / 100) * 180 * dt; // 前進速度

  // 障害物スポーン
  world.nextObstacleDistance -= scrollSpeed;
  if (world.nextObstacleDistance <= 0 && !world.stationVisible) {
    spawnRandomObstacle(world);
    // スポーン間隔 (難易度・ステージ頻度で調整)
    world.nextObstacleDistance =
      (70 + Math.random() * 85) / world.stage.obstacleFrequency;
  }

  // 旗アイテムスポーン
  world.nextFlagDistance -= scrollSpeed;
  if (world.nextFlagDistance <= 0 && !world.stationVisible) {
    spawnRandomFlag(world);
    world.nextFlagDistance = 110 + Math.random() * 120;
  }

  // 障害物の更新
  for (let i = world.obstacles.length - 1; i >= 0; i--) {
    const obs = world.obstacles[i];
    obs.z -= scrollSpeed;

    // アザラシのひょっこりアニメーション
    if (obs.hasSeal) {
      obs.sealPhase = (obs.sealPhase || 0) + dt * 2.5;
      obs.sealOut = Math.sin(obs.sealPhase) > 0.15;
      if (Math.sin(obs.sealPhase) > 0.9 && Math.random() < 0.05) {
        antarcticAudio.playSealPop();
      }
    }

    // 飛び出す魚の物理更新
    if (obs.hasFish && obs.fishState === 'jumping') {
      obs.fishY = (obs.fishY || 0) + (obs.fishVy || 0) * dt;
      obs.fishVy = (obs.fishVy || 0) - 450 * dt; // 重力
      if (obs.fishY <= 0) {
        obs.fishState = 'waiting';
        obs.fishY = 0;
      }
    } else if (obs.hasFish && obs.fishState === 'waiting' && obs.z < 180 && obs.z > 60) {
      // プレイヤーが近づいたらピョンと飛び出す！
      obs.fishState = 'jumping';
      obs.fishY = 5;
      obs.fishVy = 260 + Math.random() * 80;
      antarcticAudio.playFishJump();
    }

    // 魚キャッチ判定
    if (
      obs.hasFish &&
      obs.fishState === 'jumping' &&
      Math.abs(obs.z - PLAYER_Z) < 18 &&
      Math.abs(player.x - obs.x) < 0.32
    ) {
      // 魚とプレイヤーの高さが近いか
      const fishScreenH = (obs.fishY || 0) * 0.7;
      if (Math.abs(player.y - fishScreenH) < 45 || player.isJumping) {
        obs.fishState = 'collected';
        const pts = obs.fishColor === 'red' ? 1500 : obs.fishColor === 'yellow' ? 1000 : 500;
        addScore(pts);
        antarcticAudio.playCatchFish();
        addFloatingText(world, `+${pts}`, player.x, 300, '#38bdf8');
      }
    }

    // 障害物との当たり判定 (Zがプレイヤー位置付近)
    if (Math.abs(obs.z - PLAYER_Z) < 10) {
      const xDiff = Math.abs(player.x - obs.x);

      if (obs.type === 'hole') {
        if (xDiff < 0.22) {
          // ジャンプ中かつ十分な高さがあれば飛び越せる
          if (player.y > 32 || player.isPropellerActive) {
            // 安全に飛び越えた！
          } else {
            // アザラシが出ている場合は激突！
            if (obs.hasSeal && obs.sealOut) {
              player.hitState = 'seal';
              player.hitTimer = 1.2;
              antarcticAudio.playHitSeal();
              addFloatingText(world, 'OUCH!', player.x, 280, '#ef4444');
              spawnIceParticles(world, player.x, 0, 10);
            } else {
              // 穴にはまった！
              player.hitState = 'hole';
              player.hitTimer = 2.5;
              player.struggles = 0;
              antarcticAudio.playFallHole();
              addFloatingText(world, 'STRUGGLE!', player.x, 280, '#f59e0b');
              spawnIceParticles(world, player.x, 0, 8);
            }
          }
        }
      } else if (obs.type === 'crevasse_small' || obs.type === 'crevasse_large') {
        const crevasseWidth = obs.type === 'crevasse_large' ? 0.75 : 0.45;
        if (xDiff < crevasseWidth) {
          if (player.y > 28 || player.isPropellerActive) {
            // ジャンプで飛び越えた
          } else {
            player.hitState = 'trip';
            player.hitTimer = 0.8;
            antarcticAudio.playFallHole();
            addFloatingText(world, 'TRIP!', player.x, 280, '#f97316');
            spawnIceParticles(world, player.x, 0, 6);
          }
        }
      } else if (obs.type === 'puddle') {
        if (xDiff < 0.3) {
          if (!player.isJumping && !player.isPropellerActive) {
            // 水たまりでスリップ減速
            player.speed = Math.max(15, player.speed - 35);
            spawnIceParticles(world, player.x, 0, 4, '#38bdf8');
          }
        }
      }
    }

    // 画面外に通り過ぎた障害物を削除
    if (obs.z < -20) {
      world.obstacles.splice(i, 1);
    }
  }

  // 旗アイテムの更新
  for (let i = world.flags.length - 1; i >= 0; i--) {
    const flag = world.flags[i];
    flag.z -= scrollSpeed;

    if (!flag.collected && Math.abs(flag.z - PLAYER_Z) < 12) {
      if (Math.abs(player.x - flag.x) < 0.25) {
        flag.collected = true;
        addScore(flag.points);

        if (flag.type === 'flag_propeller') {
          // プロペラ獲得！
          player.isPropellerActive = true;
          player.propellerTimer = 9.0;
          antarcticAudio.playGetPropeller();
          addFloatingText(world, 'PROP-COPTER!!', player.x, 320, '#fbbf24', 1.3);
        } else {
          antarcticAudio.playCatchFlag();
          addFloatingText(world, `+${flag.points}`, player.x, 300, '#4ade80');
        }
        spawnIceParticles(world, flag.x, 0, 8, '#facc15');
      }
    }

    if (flag.z < -20) {
      world.flags.splice(i, 1);
    }
  }

  // パーティクルの更新
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life += dt;
    if (p.life >= p.maxLife) {
      world.particles.splice(i, 1);
    }
  }

  // フローティングテキストの更新
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.y -= 35 * dt;
    ft.life += dt;
    if (ft.life >= ft.maxLife) {
      world.floatingTexts.splice(i, 1);
    }
  }

  return { isStageClear, isTimeUp };
}

/** 障害物のランダムスポーン */
function spawnRandomObstacle(world: AntarcticWorldState) {
  const types: Obstacle['type'][] = ['hole', 'hole', 'crevasse_small', 'crevasse_large', 'puddle'];
  const chosenType = types[Math.floor(Math.random() * types.length)];
  const x = (Math.random() - 0.5) * 1.4;

  const isHole = chosenType === 'hole';
  const hasSeal = isHole && Math.random() < 0.45;
  const hasFish = isHole && !hasSeal && Math.random() < 0.55;

  const fishColors: ('green' | 'yellow' | 'red')[] = ['green', 'green', 'yellow', 'red'];
  const fishColor = hasFish ? fishColors[Math.floor(Math.random() * fishColors.length)] : undefined;

  world.obstacles.push({
    id: world.idCounter++,
    type: chosenType,
    x,
    z: MAX_VIEW_DISTANCE - 10,
    width: chosenType === 'crevasse_large' ? 0.75 : 0.4,
    hasSeal,
    sealPhase: Math.random() * Math.PI * 2,
    sealOut: false,
    hasFish,
    fishColor,
    fishY: 0,
    fishVy: 0,
    fishState: 'waiting',
  });
}

/** 旗アイテムのスポーン */
function spawnRandomFlag(world: AntarcticWorldState) {
  const isPropeller = Math.random() < 0.28;
  const type: ItemFlag['type'] = isPropeller
    ? 'flag_propeller'
    : Math.random() < 0.5
    ? 'flag_yellow'
    : 'flag_blue';

  world.flags.push({
    id: world.idCounter++,
    type,
    x: (Math.random() - 0.5) * 1.3,
    z: MAX_VIEW_DISTANCE - 10,
    collected: false,
    points: type === 'flag_propeller' ? 1000 : type === 'flag_yellow' ? 500 : 300,
  });
}

/** 氷の破片パーティクル生成 */
function spawnIceParticles(
  world: AntarcticWorldState,
  worldX: number,
  _worldY: number,
  count: number = 6,
  color: string = '#e0f2fe'
) {
  const proj = project3D(worldX, PLAYER_Z, world.curveOffset);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    world.particles.push({
      x: proj.screenX,
      y: proj.screenY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.25,
      color,
      size: 2.5 + Math.random() * 3,
    });
  }
}

/** フローティングテキスト生成 */
function addFloatingText(
  world: AntarcticWorldState,
  text: string,
  worldX: number,
  screenY: number,
  color: string,
  scale: number = 1.0
) {
  const proj = project3D(worldX, PLAYER_Z, world.curveOffset);
  world.floatingTexts.push({
    id: world.idCounter++,
    text,
    x: proj.screenX,
    y: screenY,
    life: 0,
    maxLife: 0.8,
    color,
    size: 20 * scale,
  });
}
