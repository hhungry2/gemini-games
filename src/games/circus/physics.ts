// サーカスチャーリー 物理演算＆当たり判定エンジン
import {
  StageWorldState,
  PlayerState,
  InputState,
  Particle,
  FloatingText,
  GameDifficulty,
} from './types';
import { circusAudio } from './audio';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GROUND_Y = 370;

const GRAVITY = 0.44;

export interface PhysicsResult {
  isMiss: boolean;
  isClear: boolean;
  scoreGained: number;
}

// 矩形衝突判定ヘルパー
function checkAABB(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// 円形衝突判定ヘルパー
function checkCircleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

export function updatePhysics(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number = 1.0
): PhysicsResult {
  let scoreGained = 0;
  let isMiss = false;
  let isClear = false;

  // 無敵タイマー更新
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= 1 * deltaRatio;
  }

  // アニメーションタイマー
  player.animTimer += deltaRatio;
  if (player.animTimer > 6) {
    player.animTimer = 0;
    player.animFrame = (player.animFrame + 1) % 4;
  }

  // ステージごとの処理振り分け
  switch (world.stageId) {
    case 'lion':
      updateLionStage(world, player, inputs, particles, floatingTexts, difficulty, deltaRatio, (score, miss, clear) => {
        scoreGained += score;
        if (miss) isMiss = true;
        if (clear) isClear = true;
      });
      break;

    case 'tightrope':
      updateTightropeStage(world, player, inputs, particles, floatingTexts, difficulty, deltaRatio, (score, miss, clear) => {
        scoreGained += score;
        if (miss) isMiss = true;
        if (clear) isClear = true;
      });
      break;

    case 'trampoline':
      updateTrampolineStage(world, player, inputs, particles, floatingTexts, difficulty, deltaRatio, (score, miss, clear) => {
        scoreGained += score;
        if (miss) isMiss = true;
        if (clear) isClear = true;
      });
      break;

    case 'ball':
      updateBallStage(world, player, inputs, particles, floatingTexts, difficulty, deltaRatio, (score, miss, clear) => {
        scoreGained += score;
        if (miss) isMiss = true;
        if (clear) isClear = true;
      });
      break;

    case 'trapeze':
      updateTrapezeStage(world, player, inputs, particles, floatingTexts, difficulty, deltaRatio, (score, miss, clear) => {
        scoreGained += score;
        if (miss) isMiss = true;
        if (clear) isClear = true;
      });
      break;
  }

  // ゴール到達判定（各ステージ共通）
  if (player.x >= world.goalX && player.y >= GROUND_Y - 40 && !isClear) {
    isClear = true;
    scoreGained += 1000 + Math.max(0, Math.floor(world.timeBonus));
    circusAudio.playStageClear();
  }

  // タイムボーナスの減少
  if (world.timeBonus > 0) {
    world.timeBonus = Math.max(0, world.timeBonus - 1.2 * deltaRatio);
  }

  // 残り距離（メートル換算）の更新
  const remainingDist = Math.max(0, Math.round(world.totalDistance * (1 - Math.min(world.goalX, player.x) / world.goalX)));
  world.currentDistance = remainingDist;

  // カメラ追従（スムーズ補間）
  const targetCamX = Math.max(0, Math.min(world.goalX - CANVAS_WIDTH + 200, player.x - 240));
  world.cameraX += (targetCamX - world.cameraX) * 0.15;

  return { isMiss, isClear, scoreGained };
}

// ==========================================
// STAGE 1: ライオン火の輪くぐり
// ==========================================
function updateLionStage(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number,
  callback: (score: number, miss: boolean, clear: boolean) => void
) {
  let score = 0;
  let miss = false;
  let clear = false;

  // 速度制御
  const baseSpeed = 2.3;
  if (inputs.right) {
    player.vx = baseSpeed + 1.2;
  } else if (inputs.left) {
    player.vx = -1.4;
  } else {
    player.vx = baseSpeed;
  }

  // ジャンプ
  if (inputs.jumpJustPressed && player.isGrounded) {
    player.vy = -9.6;
    player.isGrounded = false;
    player.isJumping = true;
    circusAudio.playJump();
  }

  // 重力
  if (!player.isGrounded) {
    player.vy += GRAVITY * deltaRatio;
  }

  player.x += player.vx * deltaRatio;
  player.y += player.vy * deltaRatio;

  // 後退リミット
  if (player.x < world.cameraX + 40) {
    player.x = world.cameraX + 40;
  }

  // 地面着地
  if (player.y >= GROUND_Y) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.isGrounded = true;
    player.isJumping = false;
  }

  // プレイヤーの当たり判定ボックス (ライオン + チャーリー)
  const pBox = {
    x: player.x - 20,
    y: player.y - 48,
    w: 44,
    h: 48,
  };

  // 火の輪の更新＆衝突
  for (const hoop of world.fireHoops) {
    hoop.x -= hoop.speed * deltaRatio;

    // 通過ボーナス
    if (!hoop.passed && player.x > hoop.x + 20) {
      hoop.passed = true;
      score += 100;
      floatingTexts.push({
        id: Date.now() + Math.random(),
        x: hoop.x,
        y: hoop.y - 40,
        text: '+100',
        color: '#fbbf24',
        alpha: 1,
        vy: -1.2,
        life: 40,
      });
      circusAudio.playBonus();
    }

    // コイン取得判定
    if (hoop.hasCoin && !hoop.coinCollected) {
      const coinX = hoop.x;
      const coinY = hoop.y;
      if (checkCircleCollision(player.x, player.y - 24, 18, coinX, coinY, 14)) {
        hoop.coinCollected = true;
        score += 500;
        floatingTexts.push({
          id: Date.now() + Math.random(),
          x: coinX,
          y: coinY - 30,
          text: '+500 COIN!',
          color: '#facc15',
          alpha: 1,
          vy: -1.5,
          life: 50,
        });
        circusAudio.playCoin();

        // キラキラパーティクル
        for (let i = 0; i < 8; i++) {
          particles.push({
            id: Date.now() + Math.random(),
            x: coinX,
            y: coinY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            color: '#fde047',
            size: 4 + Math.random() * 3,
            alpha: 1,
            life: 30,
            maxLife: 30,
            shape: 'star',
          });
        }
      }
    }

    // 火の輪の接触判定（縁に触れるとアウト、中を潜ればセーフ）
    if (player.invincibleTimer <= 0) {
      const margin = difficulty === 'easy' ? 6 : difficulty === 'hard' ? 12 : 10;
      const hoopRadiusY = hoop.size === 'small' ? 44 : 64;
      const hoopRadiusX = hoop.size === 'small' ? 16 : 22;
      const dx = Math.abs(player.x - hoop.x);
      const dy = Math.abs((player.y - 24) - hoop.y);

      // 横幅が近く、かつ上下の縁に近い場合は衝突
      if (dx < hoopRadiusX + margin) {
        const isSafeInCenter = dy < hoopRadiusY - (margin + 8);
        if (!isSafeInCenter && dy < hoopRadiusY + margin + 4) {
          miss = true;
        }
      }
    }
  }

  // 火壺の更新＆衝突
  for (const pot of world.firePots) {
    if (!pot.passed && player.x > pot.x + 20) {
      pot.passed = true;
      score += 200;
      floatingTexts.push({
        id: Date.now() + Math.random(),
        x: pot.x,
        y: pot.y - 30,
        text: '+200',
        color: '#fbbf24',
        alpha: 1,
        vy: -1.2,
        life: 40,
      });
      circusAudio.playBonus();
    }

    if (player.invincibleTimer <= 0) {
      if (checkAABB(pBox.x, pBox.y, pBox.w, pBox.h, pot.x - 14, pot.y - 28, 28, 38)) {
        miss = true;
      }
    }
  }

  callback(score, miss, clear);
}

// ==========================================
// STAGE 2: 綱渡り＆お猿
// ==========================================
function updateTightropeStage(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number,
  callback: (score: number, miss: boolean, clear: boolean) => void
) {
  let score = 0;
  let miss = false;
  let clear = false;

  // 綱の高さ
  const ROPE_Y = 290;

  // 水平移動
  if (inputs.right) {
    player.vx = 2.4;
    player.facingRight = true;
  } else if (inputs.left) {
    player.vx = -1.6;
    player.facingRight = false;
  } else {
    player.vx = 0;
  }

  // ジャンプ
  if (inputs.jumpJustPressed && player.isGrounded) {
    player.vy = -8.8;
    player.isGrounded = false;
    player.isJumping = true;
    circusAudio.playJump();
  }

  if (!player.isGrounded) {
    player.vy += GRAVITY * deltaRatio;
  }

  player.x += player.vx * deltaRatio;
  player.y += player.vy * deltaRatio;

  if (player.x < world.cameraX + 40) player.x = world.cameraX + 40;

  if (player.y >= ROPE_Y) {
    player.y = ROPE_Y;
    player.vy = 0;
    player.isGrounded = true;
    player.isJumping = false;
  }

  const pBox = {
    x: player.x - 12,
    y: player.y - 36,
    w: 24,
    h: 36,
  };

  // サルの行動と衝突
  for (const monkey of world.monkeys) {
    monkey.x += monkey.vx * deltaRatio;

    // 青ザルはプレイヤーが近づくと跳躍する！
    if (monkey.type === 'blue') {
      const dist = monkey.x - player.x;
      if (dist > 20 && dist < 120 && !monkey.isJumping) {
        monkey.isJumping = true;
        monkey.jumpVy = -7.5;
        circusAudio.playJump();
      }
    }

    if (monkey.isJumping) {
      monkey.jumpVy += GRAVITY * deltaRatio;
      monkey.y += monkey.jumpVy * deltaRatio;
      if (monkey.y >= ROPE_Y) {
        monkey.y = ROPE_Y;
        monkey.jumpVy = 0;
        monkey.isJumping = false;
      }
    }

    // 飛び越えボーナス
    if (!monkey.passed && player.x > monkey.x + 15) {
      monkey.passed = true;
      const pts = monkey.type === 'stacked' ? 300 : monkey.type === 'blue' ? 200 : 100;
      score += pts;
      floatingTexts.push({
        id: Date.now() + Math.random(),
        x: monkey.x,
        y: monkey.y - 45,
        text: `+${pts}`,
        color: '#60a5fa',
        alpha: 1,
        vy: -1.2,
        life: 40,
      });
      circusAudio.playBonus();

      for (let i = 0; i < 5; i++) {
        particles.push({
          id: Date.now() + Math.random(),
          x: monkey.x,
          y: monkey.y - 20,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3 - 1,
          color: '#60a5fa',
          size: 3,
          alpha: 1,
          life: 25,
          maxLife: 25,
          shape: 'star',
        });
      }
    }

    // 衝突判定
    if (player.invincibleTimer <= 0) {
      const margin = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 0 : 2;
      const mH = (monkey.type === 'stacked' ? 44 : 26) - margin;
      const mW = 20 - margin;
      if (checkAABB(pBox.x, pBox.y, pBox.w, pBox.h, monkey.x - mW / 2, monkey.y - mH, mW, mH)) {
        miss = true;
      }
    }
  }

  callback(score, miss, clear);
}

// ==========================================
// STAGE 3: トランポリン＆火吹き男
// ==========================================
function updateTrampolineStage(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number,
  callback: (score: number, miss: boolean, clear: boolean) => void
) {
  let score = 0;
  let miss = false;
  let clear = false;

  const TRAMP_Y = 320;

  // 空中での左右制動
  if (inputs.right) {
    player.vx = Math.min(3.6, player.vx + 0.25 * deltaRatio);
  } else if (inputs.left) {
    player.vx = Math.max(-3.0, player.vx - 0.25 * deltaRatio);
  } else {
    player.vx *= 0.96;
  }

  // 重力
  player.vy += GRAVITY * deltaRatio;
  player.x += player.vx * deltaRatio;
  player.y += player.vy * deltaRatio;

  if (player.x < world.cameraX + 40) player.x = world.cameraX + 40;

  // トランポリン着地判定
  for (const tramp of world.trampolines) {
    if (player.x >= tramp.x - 10 && player.x <= tramp.x + tramp.width + 10) {
      if (player.y >= TRAMP_Y && player.vy > 0 && player.y - player.vy <= TRAMP_Y + 16) {
        player.y = TRAMP_Y;
        player.jumpCountOnTrampoline = (player.jumpCountOnTrampoline || 0) + 1;

        // 跳ねるたびに高く跳ぶ！
        let bounceVy = -9.2;
        if (player.jumpCountOnTrampoline === 2) bounceVy = -11.6;
        if (player.jumpCountOnTrampoline >= 3) bounceVy = -13.8;

        // 4回同じところで跳ねると天井突き抜けミス！
        const maxBounces = difficulty === 'easy' ? 5 : 4;
        if (player.jumpCountOnTrampoline > maxBounces) {
          miss = true;
        }

        player.vy = bounceVy;
        circusAudio.playBounce();
        const bouncePts = 50 * player.jumpCountOnTrampoline;
        score += bouncePts;

        floatingTexts.push({
          id: Date.now() + Math.random(),
          x: player.x,
          y: TRAMP_Y - 20,
          text: `+${bouncePts} BOUNCE!`,
          color: '#a78bfa',
          alpha: 1,
          vy: -1.2,
          life: 30,
        });

        // バウンドパーティクル
        for (let i = 0; i < 5; i++) {
          particles.push({
            id: Date.now() + Math.random(),
            x: player.x + (Math.random() - 0.5) * 20,
            y: TRAMP_Y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3,
            color: '#a78bfa',
            size: 3,
            alpha: 1,
            life: 20,
            maxLife: 20,
          });
        }
        break;
      }
    }
  }

  // 落下ミス（トランポリンを外して床に落ちた）
  if (player.y > GROUND_Y + 20) {
    miss = true;
  }

  // 火吹き男の更新＆炎判定
  for (const fb of world.fireBreathers) {
    fb.flameCycle = (fb.flameCycle + 0.02 * deltaRatio) % 1.0;
    fb.isBlowing = fb.flameCycle > 0.45 && fb.flameCycle < 0.85;

    if (fb.isBlowing && player.invincibleTimer <= 0) {
      // 炎の当たり判定
      const flameX = fb.x - 35;
      const flameY = fb.y;
      const fRadius = difficulty === 'easy' ? 16 : difficulty === 'hard' ? 24 : 20;
      if (checkCircleCollision(player.x, player.y - 20, 16, flameX, flameY, fRadius)) {
        miss = true;
      }
    }
  }

  callback(score, miss, clear);
}

// ==========================================
// STAGE 4: 玉乗り
// ==========================================
function updateBallStage(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number,
  callback: (score: number, miss: boolean, clear: boolean) => void
) {
  let score = 0;
  let miss = false;
  let clear = false;

  const currentBall = world.balls[player.currentBallIndex] || world.balls[0];

  // ジャンプ
  if (inputs.jumpJustPressed && player.isGrounded) {
    player.vy = -9.2;
    player.isGrounded = false;
    player.isJumping = true;
    circusAudio.playJump();
  }

  // 空中での左右移動
  if (!player.isGrounded) {
    player.vy += GRAVITY * deltaRatio;
    if (inputs.right) player.vx = Math.min(3.2, player.vx + 0.2);
    else if (inputs.left) player.vx = Math.max(-2.5, player.vx - 0.2);
    player.x += player.vx * deltaRatio;
    player.y += player.vy * deltaRatio;
  } else {
    // 玉の上に乗っている時
    if (inputs.right) {
      player.ballSpeed = Math.min(2.8, player.ballSpeed + 0.15 * deltaRatio);
    } else if (inputs.left) {
      player.ballSpeed = Math.max(-1.8, player.ballSpeed - 0.15 * deltaRatio);
    } else {
      player.ballSpeed *= 0.95;
    }

    currentBall.x += player.ballSpeed * deltaRatio;
    currentBall.rotation += (player.ballSpeed / currentBall.radius) * deltaRatio;
    player.x = currentBall.x;
    player.y = currentBall.y - currentBall.radius - 28;
    player.vx = player.ballSpeed;
  }

  // 対向ボールたちの移動
  for (let i = 0; i < world.balls.length; i++) {
    const ball = world.balls[i];
    if (i !== player.currentBallIndex || !player.isGrounded) {
      ball.x += ball.vx * deltaRatio;
      ball.rotation += (ball.vx / ball.radius) * deltaRatio;
    }

    // ジャンプ中の乗り移り判定
    if (!player.isGrounded && player.vy > 0) {
      const dist = Math.abs(player.x - ball.x);
      const topY = ball.y - ball.radius - 28;
      if (dist < ball.radius * 0.75 && Math.abs(player.y - topY) < 14) {
        // 別のボールへの着地成功！
        if (i !== player.currentBallIndex) {
          player.currentBallIndex = i;
          score += 300;
          floatingTexts.push({
            id: Date.now() + Math.random(),
            x: ball.x,
            y: ball.y - 60,
            text: '+300 BALL JUMP!',
            color: '#34d399',
            alpha: 1,
            vy: -1.4,
            life: 45,
          });
          circusAudio.playBonus();

          for (let p = 0; p < 6; p++) {
            particles.push({
              id: Date.now() + Math.random(),
              x: ball.x,
              y: topY + 20,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 1,
              color: ball.color,
              size: 4,
              alpha: 1,
              life: 25,
              maxLife: 25,
              shape: 'star',
            });
          }
        }
        player.isGrounded = true;
        player.isJumping = false;
        player.vy = 0;
        player.ballSpeed = 0;
        player.x = ball.x;
        player.y = topY;
      }
    }

    // 玉同士の激突ミス
    if (i !== player.currentBallIndex && player.isGrounded) {
      const colRatio = difficulty === 'easy' ? 0.72 : difficulty === 'hard' ? 0.9 : 0.82;
      if (Math.abs(currentBall.x - ball.x) < (currentBall.radius + ball.radius) * colRatio) {
        miss = true;
      }
    }
  }

  // 落下判定
  if (player.y > GROUND_Y + 10) {
    miss = true;
  }

  callback(score, miss, clear);
}

// ==========================================
// STAGE 5: 空中ブランコ
// ==========================================
function updateTrapezeStage(
  world: StageWorldState,
  player: PlayerState,
  inputs: InputState,
  particles: Particle[],
  floatingTexts: FloatingText[],
  difficulty: GameDifficulty,
  deltaRatio: number,
  callback: (score: number, miss: boolean, clear: boolean) => void
) {
  let score = 0;
  let miss = false;
  let clear = false;

  // ブランコ振り子運動の更新
  for (const trap of world.trapezes) {
    // 単振り子の角加速度 \alpha = -(g / L) * \sin(\theta)
    const angularFreq = (2 * Math.PI) / trap.period;
    trap.angle = trap.maxAngle * Math.sin(Date.now() * 0.001 * angularFreq);
    trap.angularVel = trap.maxAngle * angularFreq * Math.cos(Date.now() * 0.001 * angularFreq);
  }

  // プレイヤーがブランコに掴まっている場合
  if (player.attachedToTrapezeId !== null) {
    const currentTrap = world.trapezes.find((t) => t.id === player.attachedToTrapezeId);
    if (currentTrap) {
      const barX = currentTrap.pivotX + Math.sin(currentTrap.angle) * currentTrap.ropeLength;
      const barY = currentTrap.pivotY + Math.cos(currentTrap.angle) * currentTrap.ropeLength;

      player.x = barX;
      player.y = barY + 16;
      player.isGrounded = false;
      player.isJumping = false;

      // ジャンプボタンで手放してダイブ！
      if (inputs.jumpJustPressed) {
        // 接線速度を計算
        const tangSpeed = currentTrap.angularVel * currentTrap.ropeLength * 0.9;
        player.vx = Math.cos(currentTrap.angle) * tangSpeed + (inputs.right ? 2.5 : inputs.left ? -1.0 : 1.5);
        player.vy = -Math.sin(currentTrap.angle) * tangSpeed - 3.8;
        player.attachedToTrapezeId = null;
        player.isJumping = true;
        circusAudio.playJump();
      }
    } else {
      player.attachedToTrapezeId = null;
    }
  } else {
    // 空中ダイブ中
    player.vy += GRAVITY * deltaRatio;
    if (inputs.right) player.vx = Math.min(4.5, player.vx + 0.15);
    else if (inputs.left) player.vx = Math.max(-2.5, player.vx - 0.15);

    player.x += player.vx * deltaRatio;
    player.y += player.vy * deltaRatio;

    // 次のブランコを掴む判定
    if (player.vy > -2) {
      const catchRadius = difficulty === 'easy' ? 34 : difficulty === 'hard' ? 24 : 28;
      for (const trap of world.trapezes) {
        const barX = trap.pivotX + Math.sin(trap.angle) * trap.ropeLength;
        const barY = trap.pivotY + Math.cos(trap.angle) * trap.ropeLength;

        const dist = Math.hypot(player.x - barX, player.y - barY);
        if (dist < catchRadius) {
          player.attachedToTrapezeId = trap.id;
          player.vx = 0;
          player.vy = 0;
          score += 400;
          floatingTexts.push({
            id: Date.now() + Math.random(),
            x: barX,
            y: barY - 40,
            text: '+400 CATCH!',
            color: '#38bdf8',
            alpha: 1,
            vy: -1.3,
            life: 45,
          });
          circusAudio.playCatch();

          for (let p = 0; p < 6; p++) {
            particles.push({
              id: Date.now() + Math.random(),
              x: barX,
              y: barY,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: '#38bdf8',
              size: 4,
              alpha: 1,
              life: 25,
              maxLife: 25,
              shape: 'star',
            });
          }
          break;
        }
      }
    }

    // 落下ミス判定
    if (player.y > GROUND_Y + 10) {
      miss = true;
    }
  }

  callback(score, miss, clear);
}
