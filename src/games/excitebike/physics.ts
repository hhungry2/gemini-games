import { BikeState, InputState, TrackSegment, Particle } from './types';
import { exciteAudio } from './audio';

export const LANE_Y_POSITIONS = [240, 288, 336, 384]; // 4レーンの基本Y座標
export const GRAVITY = 0.44;
export const MAX_SPEED_A = 13.5;
export const MAX_SPEED_B = 20.5;
export const ACCEL_A = 0.16;
export const ACCEL_B = 0.32;
export const BRAKE_FRICTION = 0.08;
export const NATURAL_FRICTION = 0.04;

export interface SurfaceInfo {
  heightOffset: number; // 基準Yからの高さオフセット (負が上向き)
  slopeAngle: number; // 地面の傾き角度 (度数法: 登りが負、下りが正)
  segmentType: string;
  isMud: boolean;
  isCooler: boolean;
  isHurdle: boolean;
  isFinish: boolean;
}

// コース上の特定X座標における地面の情報 (高さ、スロープ角、属性) を算出
export function getSurfaceInfo(x: number, segments: TrackSegment[]): SurfaceInfo {
  for (const seg of segments) {
    if (x >= seg.x && x < seg.x + seg.width) {
      const relX = x - seg.x;
      switch (seg.type) {
        case 'flat':
          return {
            heightOffset: 0,
            slopeAngle: 0,
            segmentType: 'flat',
            isMud: false,
            isCooler: false,
            isHurdle: false,
            isFinish: false,
          };

        case 'small_ramp': {
          // 幅80: 0〜65で上り坂 (0 -> -28px), 65〜80は先端のドロップ
          const rampLength = 65;
          if (relX <= rampLength) {
            const progress = relX / rampLength;
            return {
              heightOffset: -progress * 28,
              slopeAngle: -23,
              segmentType: 'small_ramp',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          } else {
            return {
              heightOffset: 0,
              slopeAngle: 0,
              segmentType: 'ramp_drop',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          }
        }

        case 'big_ramp': {
          // 幅140: 0〜115で急な上り坂 (0 -> -56px), 115〜140はドロップ
          const rampLength = 115;
          if (relX <= rampLength) {
            const progress = relX / rampLength;
            return {
              heightOffset: -progress * 56,
              slopeAngle: -26,
              segmentType: 'big_ramp',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          } else {
            return {
              heightOffset: 0,
              slopeAngle: 0,
              segmentType: 'ramp_drop',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          }
        }

        case 'table_top': {
          // 幅240: 上り75 (-42px), 平坦90 (-42px), 下り75 (-42 -> 0px)
          if (relX < 75) {
            const p = relX / 75;
            return {
              heightOffset: -p * 42,
              slopeAngle: -29,
              segmentType: 'table_top_up',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          } else if (relX < 165) {
            return {
              heightOffset: -42,
              slopeAngle: 0,
              segmentType: 'table_top_flat',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          } else {
            const p = (relX - 165) / 75;
            return {
              heightOffset: -42 + p * 42,
              slopeAngle: 29, // 下り坂
              segmentType: 'table_top_down',
              isMud: false,
              isCooler: false,
              isHurdle: false,
              isFinish: false,
            };
          }
        }

        case 'whoops': {
          // 幅240: 連続する波状モーグル (4山)
          const wavelength = 60;
          const phase = ((relX % wavelength) / wavelength) * Math.PI * 2;
          const h = -Math.sin(phase) * 16;
          // 微分して傾きを算出
          const slope = -Math.cos(phase) * 25;
          return {
            heightOffset: Math.min(0, h),
            slopeAngle: slope,
            segmentType: 'whoops',
            isMud: false,
            isCooler: false,
            isHurdle: false,
            isFinish: false,
          };
        }

        case 'mud':
          return {
            heightOffset: 0,
            slopeAngle: 0,
            segmentType: 'mud',
            isMud: true,
            isCooler: false,
            isHurdle: false,
            isFinish: false,
          };

        case 'hurdle':
          return {
            heightOffset: relX < 25 ? -14 : 0,
            slopeAngle: 0,
            segmentType: 'hurdle',
            isMud: false,
            isCooler: false,
            isHurdle: true,
            isFinish: false,
          };

        case 'cooler':
          return {
            heightOffset: 0,
            slopeAngle: 0,
            segmentType: 'cooler',
            isMud: false,
            isCooler: true,
            isHurdle: false,
            isFinish: false,
          };

        case 'finish':
          return {
            heightOffset: 0,
            slopeAngle: 0,
            segmentType: 'finish',
            isMud: false,
            isCooler: false,
            isHurdle: false,
            isFinish: true,
          };
      }
    }
  }

  return {
    heightOffset: 0,
    slopeAngle: 0,
    segmentType: 'flat',
    isMud: false,
    isCooler: false,
    isHurdle: false,
    isFinish: false,
  };
}

// バイクの物理更新処理
export function updateBike(
  bike: BikeState,
  input: InputState,
  segments: TrackSegment[],
  totalLength: number,
  particles: Particle[],
  isGameActive: boolean,
  dt: number = 1
): void {
  if (bike.finished) {
    // ゴール後の自然減速
    bike.speed = Math.max(0, bike.speed - 0.15);
    bike.x += bike.speed;
    bike.temp = Math.max(0, bike.temp - 0.4);
    return;
  }

  // クラッシュ中の処理
  if (bike.crashed) {
    bike.speed = Math.max(0, bike.speed - 0.4);
    bike.x += bike.speed;
    bike.crashTimer += dt;
    bike.grounded = true;
    bike.z = 0;
    bike.vz = 0;

    // クラッシュ後1秒でライダーが起き上がり、バイクに向かって走る
    if (bike.crashTimer > 50) {
      bike.isReturning = true;
      let runSpeed = 2.4;
      // 連打ボーナスが加算されている場合
      if (bike.isPlayer && input.accelA) {
        runSpeed += 1.8;
      }

      // ライダーをバイクのX位置へ近づける
      if (bike.riderX > bike.x + 8) {
        bike.riderX -= runSpeed;
      } else if (bike.riderX < bike.x - 8) {
        bike.riderX += runSpeed;
      } else {
        // バイクに到達 -> 復活！
        bike.crashed = false;
        bike.crashTimer = 0;
        bike.isReturning = false;
        bike.pitch = 0;
        bike.speed = 1.0;
        if (bike.isPlayer) {
          exciteAudio.startEngine();
        }
      }
    }
    return;
  }

  // オーバーヒート中の処理
  if (bike.isOverheated) {
    bike.speed = Math.max(0, bike.speed - 0.22);
    bike.temp = Math.max(0, bike.temp - 0.38); // 徐々に冷却
    bike.overheatCooldown -= dt;

    // 白煙パーティクル
    if (Math.random() < 0.4) {
      particles.push({
        x: bike.x - 12 + Math.random() * 6,
        y: bike.y - 12,
        vx: -1 - Math.random() * 2,
        vy: -1.5 - Math.random() * 1.5,
        color: 'rgba(230, 230, 230, 0.8)',
        size: 5 + Math.random() * 5,
        alpha: 0.8,
        life: 0,
        maxLife: 35,
      });
    }

    if (bike.temp <= 0) {
      bike.isOverheated = false;
      bike.temp = 0;
      bike.overheatCooldown = 0;
    }
  }

  // レーン移動処理 (Up / Down)
  if (isGameActive && !bike.isOverheated) {
    if (input.up && bike.targetLane > 0) {
      bike.targetLane = Math.max(0, Math.round(bike.lane) - 1);
    } else if (input.down && bike.targetLane < 3) {
      bike.targetLane = Math.min(3, Math.round(bike.lane) + 1);
    }
  }
  // レーンの滑らかな補間
  if (Math.abs(bike.lane - bike.targetLane) > 0.01) {
    bike.lane += (bike.targetLane - bike.lane) * 0.12;
  } else {
    bike.lane = bike.targetLane;
  }

  // 基準Y座標の更新 (4レーン補間)
  const laneRatio = bike.lane - Math.floor(bike.lane);
  const floorIdx = Math.floor(bike.lane);
  const ceilIdx = Math.min(3, Math.ceil(bike.lane));
  const currentBaseY =
    LANE_Y_POSITIONS[floorIdx] * (1 - laneRatio) + LANE_Y_POSITIONS[ceilIdx] * laneRatio;

  // 地形情報取得
  const surface = getSurfaceInfo(bike.x, segments);

  // 冷却パッド判定
  if (surface.isCooler && bike.grounded) {
    if (bike.temp > 5) {
      bike.temp = 0;
      if (bike.isPlayer) {
        exciteAudio.playCooler();
      }
      // 青いスパークパーティクル
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: bike.x + (Math.random() - 0.5) * 20,
          y: bike.y - 5,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 3,
          color: '#38bdf8',
          size: 4,
          alpha: 1,
          life: 0,
          maxLife: 20,
        });
      }
    }
  }

  // 泥ゾーン判定
  if (surface.isMud && bike.grounded) {
    bike.mudTimer = 5;
    // ウイリーしている場合は減速ペナルティが軽減される！
    const mudFriction = bike.wheelie ? 0.94 : 0.78;
    bike.speed *= mudFriction;

    // 泥跳ねパーティクル
    if (Math.random() < 0.6 && bike.speed > 2) {
      particles.push({
        x: bike.x - 15,
        y: bike.y + 5,
        vx: -2 - Math.random() * 3,
        vy: -1 - Math.random() * 2,
        color: '#78350f',
        size: 3 + Math.random() * 3,
        alpha: 0.9,
        life: 0,
        maxLife: 15,
      });
    }
  }

  // ハードル衝突判定
  if (surface.isHurdle && bike.grounded && !bike.wheelie && bike.speed > 3) {
    // ウイリーしていないと激突クラッシュ！
    triggerCrash(bike, true, particles);
    return;
  }

  // アクセル & 速度制御
  if (isGameActive && !bike.isOverheated) {
    if (input.accelB) {
      // ターボアクセル (B)
      bike.speed = Math.min(MAX_SPEED_B, bike.speed + ACCEL_B);
      bike.temp = Math.min(100, bike.temp + 0.28);
      if (bike.temp >= 100) {
        // オーバーヒート発生！
        bike.isOverheated = true;
        bike.overheatCooldown = 220; // 約3.5秒
        if (bike.isPlayer) {
          exciteAudio.playOverheat();
        }
      }
    } else if (input.accelA) {
      // 通常アクセル (A)
      if (bike.speed < MAX_SPEED_A) {
        bike.speed = Math.min(MAX_SPEED_A, bike.speed + ACCEL_A);
      } else {
        // ターボ解除後の穏やかな減速
        bike.speed = Math.max(MAX_SPEED_A, bike.speed - 0.08);
      }
      bike.temp = Math.min(100, bike.temp + 0.05);
    } else {
      // アクセルOFF (自然減速)
      bike.speed = Math.max(0, bike.speed - NATURAL_FRICTION);
      bike.temp = Math.max(0, bike.temp - 0.24); // 自然冷却
    }
  } else {
    bike.speed = Math.max(0, bike.speed - NATURAL_FRICTION);
    bike.temp = Math.max(0, bike.temp - 0.24);
  }

  // 空中か接地かの判定と垂直物理
  if (bike.grounded) {
    bike.z = 0;
    bike.vz = 0;
    bike.y = currentBaseY + surface.heightOffset;

    // 接地中のピッチ制御 (地上ではウイリー可能)
    if (isGameActive && input.left && bike.speed > 2) {
      // ウイリー (前輪上げ)
      bike.pitch = Math.min(32, bike.pitch + 2.8);
      bike.wheelie = bike.pitch > 15;
    } else if (isGameActive && input.right) {
      // 前傾 (前輪下げ)
      bike.pitch = Math.max(-15, bike.pitch - 2.8);
      bike.wheelie = false;
    } else {
      // 地形のスロープ角度へ自然に戻る
      bike.pitch += (surface.slopeAngle - bike.pitch) * 0.25;
      bike.wheelie = false;
    }

    // ジャンプのトリガー判定:
    // ランプからドロップした瞬間 (スロープから突然フラットに戻った時など)
    // または急なスロープを高速で駆け上がった時
    if (surface.segmentType === 'ramp_drop' || (surface.slopeAngle < -20 && bike.speed > 9)) {
      // 飛び出し判定
      const jumpPower = surface.segmentType === 'ramp_drop' ? 0.65 : 0.45;
      const pitchBonus = 1 + (bike.pitch > 10 ? 0.25 : 0);
      bike.vz = -Math.max(5.5, bike.speed * jumpPower * pitchBonus);
      bike.grounded = false;
      bike.airTime = 0;
      bike.jumpStartX = bike.x;
      if (bike.isPlayer) {
        exciteAudio.playJump();
      }
    }

    // 排気煙パーティクル
    if (bike.speed > 3 && Math.random() < 0.3) {
      particles.push({
        x: bike.x - 14,
        y: bike.y - 2,
        vx: -1 - Math.random() * 2,
        vy: -0.5 - Math.random() * 1,
        color: 'rgba(200, 200, 200, 0.6)',
        size: 3 + Math.random() * 2,
        alpha: 0.6,
        life: 0,
        maxLife: 20,
      });
    }
  } else {
    // === 空中 (AIRBORNE) ===
    bike.airTime += dt;
    bike.vz += GRAVITY;
    bike.z -= bike.vz; // zが正のとき滞空
    bike.y = currentBaseY + surface.heightOffset - Math.max(0, bike.z);

    // 空中でのピッチ制御 (姿勢制御)
    if (isGameActive) {
      if (input.left) {
        // ウイリー方向 (上を向く)
        bike.pitch = Math.min(48, bike.pitch + 2.0);
      } else if (input.right) {
        // 前傾方向 (下を向く)
        bike.pitch = Math.max(-48, bike.pitch - 2.0);
      }
    }

    // 空気の揚力・抵抗微調整
    if (bike.pitch > 15) {
      // 上を向くとわずかに浮遊時間延長
      bike.vz -= 0.05;
    } else if (bike.pitch < -20) {
      // 前傾すると急降下
      bike.vz += 0.08;
    }

    // 着地判定: z が 0 以下になった
    if (bike.z <= 0) {
      bike.z = 0;
      bike.grounded = true;

      // 着地角度のチェック
      const angleDiff = Math.abs(bike.pitch - surface.slopeAngle);

      if (angleDiff <= 18) {
        // ★ ナイス着地！ (NICE LANDING)
        bike.niceLandingTimer = 30;
        bike.speed = Math.min(MAX_SPEED_B, bike.speed + 0.8); // 着地加速ボーナス！
        bike.pitch = surface.slopeAngle;
        if (bike.isPlayer) {
          exciteAudio.playNiceLanding();
        }
        // 着地火花パーティクル
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: bike.x + (Math.random() - 0.5) * 15,
            y: bike.y + 4,
            vx: (Math.random() - 0.5) * 4,
            vy: -1 - Math.random() * 2,
            color: '#fbbf24',
            size: 3,
            alpha: 1,
            life: 0,
            maxLife: 15,
          });
        }
      } else if (angleDiff <= 32) {
        // サス沈み込み (少し減速)
        bike.speed = Math.max(2, bike.speed * 0.8);
        bike.pitch = surface.slopeAngle;
      } else {
        // ✘ クラッシュ！角度不一致による大転倒
        const isEndo = bike.pitch < surface.slopeAngle; // 前傾しすぎ＝前転
        triggerCrash(bike, isEndo, particles);
        return;
      }
    }
  }

  // 水平移動
  bike.x += bike.speed;

  // ゴールライン判定
  if (bike.x >= totalLength - 100 && !bike.finished) {
    bike.finished = true;
    if (bike.isPlayer) {
      exciteAudio.playGoalFanfare();
    }
  }
}

// クラッシュ発生
export function triggerCrash(bike: BikeState, isEndo: boolean, particles: Particle[]) {
  bike.crashed = true;
  bike.crashTimer = 0;
  bike.crashEndo = isEndo;
  bike.isReturning = false;
  bike.grounded = true;
  bike.z = 0;
  bike.vz = 0;

  // ライダーが放り出される位置 (前方へ40〜70px吹き飛ぶ)
  const throwDist = isEndo ? 55 + bike.speed * 1.5 : 35;
  bike.riderX = bike.x + throwDist;
  bike.riderY = bike.y + (Math.random() - 0.5) * 10;

  if (bike.isPlayer) {
    exciteAudio.stopEngine();
    exciteAudio.playCrash();
  }

  // 激突火花 & 煙パーティクル
  for (let i = 0; i < 16; i++) {
    particles.push({
      x: bike.x + (Math.random() - 0.5) * 20,
      y: bike.y - 5 + (Math.random() - 0.5) * 15,
      vx: (Math.random() - 0.5) * 7,
      vy: -2 - Math.random() * 5,
      color: i % 2 === 0 ? '#ef4444' : '#f59e0b',
      size: 4 + Math.random() * 3,
      alpha: 1,
      life: 0,
      maxLife: 28,
    });
  }
}

// バイク同士の追突・接触衝突判定 (MODE B)
export function checkBikeCollisions(bikes: BikeState[], particles: Particle[]) {
  for (let i = 0; i < bikes.length; i++) {
    const a = bikes[i];
    if (a.crashed || a.finished) continue;

    for (let j = 0; j < bikes.length; j++) {
      if (i === j) continue;
      const b = bikes[j];
      if (b.crashed || b.finished) continue;

      // 同じレーンかつ地上
      if (Math.abs(a.lane - b.lane) < 0.55 && a.grounded && b.grounded) {
        // a が b の後ろから追突した判定
        const dist = b.x - a.x;
        if (dist > 0 && dist < 36) {
          if (a.speed > b.speed + 2.5) {
            // 後ろのバイク a が前輪を引っ掛けて転倒！
            triggerCrash(a, true, particles);
          } else {
            // 押し戻されて減速
            a.speed = Math.max(1, b.speed * 0.7);
            // 接触火花
            particles.push({
              x: a.x + 18,
              y: a.y,
              vx: -1,
              vy: -2,
              color: '#f59e0b',
              size: 3,
              alpha: 1,
              life: 0,
              maxLife: 10,
            });
          }
        }
      }
    }
  }
}

// CPUライバルAIの入力決定
export function updateRivalAI(
  rival: BikeState,
  segments: TrackSegment[],
  _totalLength: number,
  allBikes: BikeState[]
): InputState {
  const input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    accelA: true,
    accelB: false,
  };

  if (rival.crashed || rival.finished) {
    return input;
  }

  const lookAheadSurface = getSurfaceInfo(rival.x + 80, segments);

  // ターボ使用 (温度が50未満ならたまにターボ)
  if (rival.temp < 55 && Math.random() < 0.4) {
    input.accelB = true;
    input.accelA = false;
  }

  // 空中の姿勢制御
  if (!rival.grounded) {
    // 地面のスロープ角度に合わせる
    const targetAngle = lookAheadSurface.slopeAngle;
    if (rival.pitch < targetAngle - 5) {
      input.left = true;
    } else if (rival.pitch > targetAngle + 5) {
      input.right = true;
    }
  } else {
    // 障害物回避のためのレーン変更
    if (lookAheadSurface.isMud || lookAheadSurface.isHurdle) {
      if (Math.random() < 0.05) {
        if (rival.targetLane > 0 && Math.random() < 0.5) {
          input.up = true;
        } else if (rival.targetLane < 3) {
          input.down = true;
        }
      }
    }

    // 前方に他のバイクがいるかチェック
    const aheadBike = allBikes.find(
      (b) =>
        b.id !== rival.id &&
        Math.abs(b.lane - rival.lane) < 0.5 &&
        b.x > rival.x &&
        b.x - rival.x < 60
    );
    if (aheadBike && Math.random() < 0.1) {
      // 追い越しのためにレーンチェンジ
      if (rival.targetLane > 0) input.up = true;
      else if (rival.targetLane < 3) input.down = true;
    }
  }

  return input;
}
