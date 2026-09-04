import { MicrogameDef, MicrogameId, MicrogameInstance, InputState, MicrogameResult } from './types';
import { warioAudio } from './WarioAudio';

export const MICROGAMES: MicrogameDef[] = [
  {
    id: 'pluck',
    name: 'はな毛を ぬけ！',
    nameEn: 'Nose Hair Pluck',
    instruction: 'ぬけ！',
    instructionEn: 'PLUCK!',
    icon: '👃',
    hint: '鼻毛をクリック/タップ！',
    category: 'timing',
  },
  {
    id: 'dodge',
    name: 'タライを よけろ！',
    nameEn: 'Washbasin Dodge',
    instruction: 'よけろ！',
    instructionEn: 'DODGE!',
    icon: '🪨',
    hint: '左右に動いて落下物を回避！',
    category: 'action',
  },
  {
    id: 'catch',
    name: 'ものさしを つかめ！',
    nameEn: 'Ruler Snatch',
    instruction: 'つかめ！',
    instructionEn: 'CATCH!',
    icon: '📏',
    hint: '落ちてきたらクリック/Space！',
    category: 'reflex',
  },
  {
    id: 'insert',
    name: 'いとを とおせ！',
    nameEn: 'Thread the Needle',
    instruction: 'いれろ！',
    instructionEn: 'INSERT!',
    icon: '🪡',
    hint: '揺れる糸を針の穴に通せ！',
    category: 'timing',
  },
  {
    id: 'press',
    name: 'めざましを とめろ！',
    nameEn: 'Alarm Clock Stop',
    instruction: 'おせ！',
    instructionEn: 'PRESS!',
    icon: '⏰',
    hint: '素早くボタンを連打！',
    category: 'mash',
  },
  {
    id: 'match',
    name: 'えがおを あわせろ！',
    nameEn: 'Smile Matcher',
    instruction: 'あわせろ！',
    instructionEn: 'MATCH!',
    icon: '🎰',
    hint: 'タイミングよく止めて笑顔を揃えろ！',
    category: 'timing',
  },
  {
    id: 'cut',
    name: 'いあいぎり！',
    nameEn: 'Samurai Slash',
    instruction: 'きれ！',
    instructionEn: 'CUT!',
    icon: '⚔️',
    hint: '「！」が出た瞬間に素早く切れ！',
    category: 'reflex',
  },
  {
    id: 'stop',
    name: 'ジャストで とまれ！',
    nameEn: 'Precision Stop',
    instruction: 'とまれ！',
    instructionEn: 'STOP!',
    icon: '🎯',
    hint: '緑のゾーンで針を止めろ！',
    category: 'timing',
  },
];

// --- 1. ぬけ！ (Pluck) ---
class PluckGame implements MicrogameInstance {
  id: MicrogameId = 'pluck';
  level: number = 1;
  hairs: { x: number; y: number; length: number; plucked: boolean; angle: number; speed: number }[] = [];
  nostrilX = 240;
  nostrilY = 120;

  init(level: number, width: number) {
    this.level = level;
    this.nostrilX = width / 2;
    const count = level === 3 ? 2 : 1;
    this.hairs = [];
    for (let i = 0; i < count; i++) {
      this.hairs.push({
        x: this.nostrilX + (i === 0 ? -15 : 15),
        y: this.nostrilY + 45,
        length: 65,
        plucked: false,
        angle: 0,
        speed: (Math.random() * 2 + 1.5) * (level > 1 ? 1.5 : 0),
      });
    }
  }

  update(_progress: number, input: InputState): MicrogameResult {
    // 鼻毛の揺れ
    this.hairs.forEach((h, idx) => {
      if (!h.plucked) {
        h.angle = Math.sin(Date.now() * 0.005 * h.speed + idx) * (this.level > 1 ? 0.35 : 0.05);
      }
    });

    if (input.pointer.justPressed) {
      const px = input.pointer.x;
      const py = input.pointer.y;
      for (const h of this.hairs) {
        if (!h.plucked) {
          const tipX = h.x + Math.sin(h.angle) * h.length;
          const tipY = h.y + Math.cos(h.angle) * h.length;
          const dist = Math.hypot(px - tipX, py - tipY);
          // 鼻毛の先端付近をクリック
          if (dist < 55) {
            h.plucked = true;
            warioAudio.playPop();
          }
        }
      }
    }

    if (this.hairs.every((h) => h.plucked)) {
      return 'success';
    }
    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    // 背景
    ctx.fillStyle = isDark ? '#1e1b4b' : '#fef2f2';
    ctx.fillRect(0, 0, width, height);

    // 巨大な鼻の輪郭
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(this.nostrilX, this.nostrilY - 30, 90, 0, Math.PI);
    ctx.fill();

    // 鼻の穴（左と右）
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.ellipse(this.nostrilX - 35, this.nostrilY + 30, 26, 32, -0.2, 0, Math.PI * 2);
    ctx.ellipse(this.nostrilX + 35, this.nostrilY + 30, 26, 32, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 鼻筋ハイライト
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(this.nostrilX, this.nostrilY - 40, 18, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 鼻毛の描画
    this.hairs.forEach((h) => {
      if (!h.plucked) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        const tipX = h.x + Math.sin(h.angle) * h.length;
        const tipY = h.y + Math.cos(h.angle) * h.length;
        ctx.quadraticCurveTo(h.x + Math.sin(h.angle) * (h.length * 0.5) + 10, h.y + h.length * 0.5, tipX, tipY);
        ctx.stroke();

        // 掴みやすさのポインターヒントリング
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // 抜けた後の痛快スプラッシュ
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(h.x - 30, h.y - 40, 8, 0, Math.PI * 2);
        ctx.arc(h.x + 30, h.y - 40, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

// --- 2. よけろ！ (Dodge) ---
class DodgeGame implements MicrogameInstance {
  id: MicrogameId = 'dodge';
  level: number = 1;
  playerX = 240;
  playerY = 290;
  playerWidth = 40;
  hazards: { x: number; y: number; r: number; speed: number; hit: boolean; emoji: string }[] = [];
  isHit = false;

  init(level: number, width: number) {
    this.level = level;
    this.playerX = width / 2;
    this.isHit = false;
    this.hazards = [];

    const count = level === 1 ? 1 : level === 2 ? 2 : 3;
    const emojis = ['🪨', '🍉', '🛢️', '💣'];
    for (let i = 0; i < count; i++) {
      this.hazards.push({
        x: Math.random() * (width - 100) + 50,
        y: -50 - i * 90,
        r: 28,
        speed: 4.5 + level * 1.5,
        hit: false,
        emoji: emojis[i % emojis.length],
      });
    }
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isHit) return 'failure';

    // プレイヤー移動（矢印キー、A/D、またはマウス/タッチ追従）
    const speed = 7;
    if (input.keys['ArrowLeft'] || input.keys['a'] || input.keys['A']) {
      this.playerX -= speed;
    }
    if (input.keys['ArrowRight'] || input.keys['d'] || input.keys['D']) {
      this.playerX += speed;
    }
    if (input.pointer.isDown) {
      this.playerX += (input.pointer.x - this.playerX) * 0.2;
    }
    this.playerX = Math.max(30, Math.min(450, this.playerX));

    // 落下物の更新＆衝突判定
    for (const h of this.hazards) {
      h.y += h.speed;
      if (Math.hypot(h.x - this.playerX, h.y - this.playerY) < h.r + 20) {
        this.isHit = true;
        warioAudio.playFailure();
        return 'failure';
      }
    }

    // 時間切れまで耐え切ったら大成功！
    if (_progress >= 0.98 && !this.isHit) {
      warioAudio.playSuccess();
      return 'success';
    }

    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#0f172a' : '#ecfdf5';
    ctx.fillRect(0, 0, width, height);

    // 地面
    ctx.fillStyle = isDark ? '#334155' : '#86efac';
    ctx.fillRect(0, 320, width, 40);

    // 落下物
    this.hazards.forEach((h) => {
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, h.x, h.y);
    });

    // プレイヤーキャラクター
    ctx.save();
    ctx.translate(this.playerX, this.playerY);
    if (this.isHit) {
      // ペシャンコやられ顔
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('😵', 0, 10);
    } else {
      ctx.font = '38px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏃', 0, 0);
    }
    ctx.restore();
  }
}

// --- 3. つかめ！ (Catch) ---
class CatchGame implements MicrogameInstance {
  id: MicrogameId = 'catch';
  level: number = 1;
  rulerY = -80;
  rulerSpeed = 6;
  isCaught = false;
  isMissed = false;
  catchZoneY = 240;
  catchZoneHeight = 50;

  init(level: number) {
    this.level = level;
    this.rulerY = -80;
    this.rulerSpeed = 5.5 + level * 2.2;
    this.isCaught = false;
    this.isMissed = false;
    this.catchZoneHeight = Math.max(35, 65 - level * 10);
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isCaught) return 'success';
    if (this.isMissed) return 'failure';

    this.rulerY += this.rulerSpeed;

    if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
      const tipY = this.rulerY + 120;
      if (tipY >= this.catchZoneY && tipY <= this.catchZoneY + this.catchZoneHeight) {
        this.isCaught = true;
        warioAudio.playSuccess();
        return 'success';
      } else {
        this.isMissed = true;
        warioAudio.playFailure();
        return 'failure';
      }
    }

    // 通り過ぎたら失敗
    if (this.rulerY > 360) {
      this.isMissed = true;
      return 'failure';
    }

    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#1e1b4b' : '#fffbeb';
    ctx.fillRect(0, 0, width, height);

    // キャッチゾーンのガイドライン
    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(160, this.catchZoneY, 160, this.catchZoneHeight);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(160, this.catchZoneY, 160, this.catchZoneHeight);
    ctx.setLineDash([]);

    // 落下するものさし（定規）
    ctx.save();
    ctx.translate(width / 2, this.rulerY);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-15, 0, 30, 140);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(-15, 0, 30, 140);

    // 目盛り
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.5;
    for (let y = 10; y < 140; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-15, y);
      ctx.lineTo(y % 24 === 0 ? 5 : -5, y);
      ctx.stroke();
    }
    ctx.restore();

    // 待ち受ける手
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    if (this.isCaught) {
      ctx.fillText('✊', width / 2 + 5, this.catchZoneY + 30);
    } else {
      ctx.fillText('✋', width / 2 + 5, this.catchZoneY + 30);
    }
  }
}

// --- 4. いれろ！ (Insert) ---
class InsertGame implements MicrogameInstance {
  id: MicrogameId = 'insert';
  level: number = 1;
  threadAngle = 0;
  threadSwingSpeed = 0.06;
  isInserted = false;
  isDropping = false;
  threadY = 60;
  needleX = 240;
  needleY = 270;

  init(level: number, width: number) {
    this.level = level;
    this.needleX = width / 2;
    this.needleY = 270;
    this.threadAngle = 0;
    this.threadSwingSpeed = 0.05 + level * 0.025;
    this.isInserted = false;
    this.isDropping = false;
    this.threadY = 60;
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isInserted) return 'success';

    if (!this.isDropping) {
      this.threadAngle = Math.sin(Date.now() * this.threadSwingSpeed) * 0.75;
      if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
        this.isDropping = true;
      }
    } else {
      this.threadY += 14;
      const tipX = 240 + Math.sin(this.threadAngle) * 140;
      // 針穴の判定
      if (this.threadY >= this.needleY - 15 && this.threadY <= this.needleY + 15) {
        if (Math.abs(tipX - this.needleX) < (this.level === 3 ? 12 : 20)) {
          this.isInserted = true;
          warioAudio.playSuccess();
          return 'success';
        } else {
          warioAudio.playFailure();
          return 'failure';
        }
      }
      if (this.threadY > 340) {
        return 'failure';
      }
    }
    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#022c22' : '#f0fdf4';
    ctx.fillRect(0, 0, width, height);

    // 針
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.needleX, this.needleY - 40);
    ctx.lineTo(this.needleX, this.needleY + 50);
    ctx.stroke();

    // 針の穴
    ctx.fillStyle = isDark ? '#022c22' : '#f0fdf4';
    ctx.beginPath();
    ctx.ellipse(this.needleX, this.needleY - 10, 4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 糸
    const tipX = width / 2 + Math.sin(this.threadAngle) * 140;
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(width / 2, this.threadY - 50);
    ctx.lineTo(tipX, this.threadY + 80);
    ctx.stroke();
  }
}

// --- 5. おせ！ (Press) ---
class PressGame implements MicrogameInstance {
  id: MicrogameId = 'press';
  level: number = 1;
  presses = 0;
  targetPresses = 3;
  isPressed = false;
  clockAngle = 0;

  init(level: number) {
    this.level = level;
    this.presses = 0;
    this.targetPresses = level === 1 ? 1 : level === 2 ? 3 : 5;
    this.isPressed = false;
  }

  update(_progress: number, input: InputState): MicrogameResult {
    this.clockAngle = Math.sin(Date.now() * 0.04) * 0.15;

    if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
      this.presses++;
      warioAudio.playPop();
      if (this.presses >= this.targetPresses) {
        this.isPressed = true;
        warioAudio.playSuccess();
        return 'success';
      }
    }
    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#3b0764' : '#faf5ff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2 + 10);
    if (!this.isPressed) ctx.rotate(this.clockAngle);

    // 目覚まし時計本体
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();

    // 文字盤
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();

    // ベルのツイン突起
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(-55, -55, 20, 0, Math.PI * 2);
    ctx.arc(55, -55, 20, 0, Math.PI * 2);
    ctx.fill();

    // 押しボタン（上部）
    ctx.fillStyle = this.isPressed ? '#10b981' : '#facc15';
    ctx.fillRect(-22, this.isPressed ? -78 : -90, 44, 16);

    // 時計の顔
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isPressed ? '😴' : '⏰', 0, 0);

    ctx.restore();

    // 連打カウンター表示
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.textAlign = 'center';
    ctx.fillText(`あと ${Math.max(0, this.targetPresses - this.presses)} 回！`, width / 2, 50);
  }
}

// --- 6. あわせろ！ (Match) ---
class MatchGame implements MicrogameInstance {
  id: MicrogameId = 'match';
  level: number = 1;
  faces = ['😀', '🤪', '😎', '😡', '🥳'];
  currentIdx = 0;
  targetIdx = 0;
  isStopped = false;
  speed = 100;
  timer = 0;

  init(level: number) {
    this.level = level;
    this.targetIdx = 0; // 目標はいつでも「😀」
    this.currentIdx = Math.floor(Math.random() * (this.faces.length - 1)) + 1;
    this.isStopped = false;
    this.speed = Math.max(60, 130 - level * 25);
    this.timer = 0;
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isStopped) {
      return this.currentIdx === this.targetIdx ? 'success' : 'failure';
    }

    this.timer += 16;
    if (this.timer > this.speed) {
      this.timer = 0;
      this.currentIdx = (this.currentIdx + 1) % this.faces.length;
    }

    if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
      this.isStopped = true;
      if (this.currentIdx === this.targetIdx) {
        warioAudio.playSuccess();
        return 'success';
      } else {
        warioAudio.playFailure();
        return 'failure';
      }
    }

    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#172554' : '#eff6ff';
    ctx.fillRect(0, 0, width, height);

    // 目標スロット枠
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(width / 2 - 120, 70, 240, 160);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 5;
    ctx.strokeRect(width / 2 - 120, 70, 240, 160);

    // 目標の顔
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`この顔で止めろ！ ➔ ${this.faces[this.targetIdx]}`, width / 2, 45);

    // スロットの顔
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.faces[this.currentIdx], width / 2, 150);

    // ストップボタン表示
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#2563eb';
    ctx.fillText('画面クリックで STOP!', width / 2, 280);
  }
}

// --- 7. きれ！ (Cut) ---
class CutGame implements MicrogameInstance {
  id: MicrogameId = 'cut';
  level: number = 1;
  readyTime = 1200;
  elapsed = 0;
  isSignal = false;
  isCut = false;
  isTooEarly = false;

  init(level: number) {
    this.level = level;
    this.readyTime = Math.random() * 1000 + 800 - level * 100;
    this.elapsed = 0;
    this.isSignal = false;
    this.isCut = false;
    this.isTooEarly = false;
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isCut) return 'success';
    if (this.isTooEarly) return 'failure';

    this.elapsed += 16;
    if (this.elapsed >= this.readyTime) {
      this.isSignal = true;
    }

    if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
      if (this.isSignal) {
        this.isCut = true;
        warioAudio.playSlash();
        warioAudio.playSuccess();
        return 'success';
      } else {
        this.isTooEarly = true;
        warioAudio.playFailure();
        return 'failure';
      }
    }

    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#1c1917' : '#fff7ed';
    ctx.fillRect(0, 0, width, height);

    // 竹の幹
    ctx.fillStyle = '#22c55e';
    if (!this.isCut) {
      ctx.fillRect(width / 2 - 25, 60, 50, 220);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      ctx.strokeRect(width / 2 - 25, 60, 50, 220);
    } else {
      // 斬られた竹（上下にずれる）
      ctx.fillRect(width / 2 - 40, 50, 50, 100);
      ctx.fillRect(width / 2 - 10, 160, 50, 120);

      // 閃光スラッシュライン
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 100, 120);
      ctx.lineTo(width / 2 + 100, 180);
      ctx.stroke();
    }

    // 「！」シグナル
    if (this.isSignal && !this.isCut) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'black 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('！', width / 2, 50);
    } else if (this.isTooEarly) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('おてつき！早すぎ！', width / 2, 50);
    }
  }
}

// --- 8. とまれ！ (Stop) ---
class StopGame implements MicrogameInstance {
  id: MicrogameId = 'stop';
  level: number = 1;
  angle = 0;
  targetStart = 0;
  targetEnd = 0;
  isStopped = false;
  speed = 0.08;

  init(level: number) {
    this.level = level;
    this.angle = 0;
    this.speed = 0.07 + level * 0.03;
    const targetWidth = Math.max(0.4, 0.9 - level * 0.18); // 弧度
    this.targetStart = Math.PI * 0.6;
    this.targetEnd = this.targetStart + targetWidth;
    this.isStopped = false;
  }

  update(_progress: number, input: InputState): MicrogameResult {
    if (this.isStopped) {
      const normAngle = this.angle % (Math.PI * 2);
      return normAngle >= this.targetStart && normAngle <= this.targetEnd ? 'success' : 'failure';
    }

    this.angle += this.speed;

    if (input.pointer.justPressed || input.keys[' '] || input.keys['Enter']) {
      this.isStopped = true;
      const normAngle = this.angle % (Math.PI * 2);
      if (normAngle >= this.targetStart && normAngle <= this.targetEnd) {
        warioAudio.playSuccess();
        return 'success';
      } else {
        warioAudio.playFailure();
        return 'failure';
      }
    }

    return 'pending';
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _p: number, isDark: boolean) {
    ctx.fillStyle = isDark ? '#18181b' : '#f4f4f5';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const r = 85;

    // ダイヤル円盤
    ctx.fillStyle = isDark ? '#27272a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a1a1aa';
    ctx.lineWidth = 4;
    ctx.stroke();

    // ターゲット（緑ゾーン）
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, this.targetStart, this.targetEnd);
    ctx.stroke();

    // 回転する針
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.angle) * (r - 5), cy + Math.sin(this.angle) * (r - 5));
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'center';
    ctx.fillText('緑のゾーンで止めろ！', cx, 40);
  }
}

// ファクトリ関数
export const createMicrogameInstance = (id: MicrogameId, level: number, width: number, height: number): MicrogameInstance => {
  let instance: MicrogameInstance;
  switch (id) {
    case 'pluck':
      instance = new PluckGame();
      break;
    case 'dodge':
      instance = new DodgeGame();
      break;
    case 'catch':
      instance = new CatchGame();
      break;
    case 'insert':
      instance = new InsertGame();
      break;
    case 'press':
      instance = new PressGame();
      break;
    case 'match':
      instance = new MatchGame();
      break;
    case 'cut':
      instance = new CutGame();
      break;
    case 'stop':
      instance = new StopGame();
      break;
    default:
      instance = new PluckGame();
      break;
  }
  instance.init(level, width, height);
  return instance;
};
