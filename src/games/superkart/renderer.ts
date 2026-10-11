import { at, DRIVERS, project } from './tracks';
import type { Kart, Race, Track } from './types';

const W = 640,
  H = 360,
  HORIZON = 112,
  FOCAL = 310,
  CAMERA_HEIGHT = 52;
const palette = [
  '#f7729d',
  '#fdc466',
  '#f1e96b',
  '#75d49b',
  '#73c3ec',
  '#ac94e7',
];
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function kartSprite(
  driverIndex: number,
  front = false,
): HTMLCanvasElement {
  const c = canvas(40, 42),
    g = c.getContext('2d')!,
    d = DRIVERS[driverIndex];
  const rect = (color: string, x: number, y: number, w: number, h: number) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  rect('#172438', 3, 26, 7, 13);
  rect('#172438', 30, 26, 7, 13);
  rect('#71838b', 4, 29, 3, 7);
  rect('#71838b', 33, 29, 3, 7);
  rect('#273a4b', 7, 26, 26, 12);
  rect(d.color, 8, 27, 24, 8);
  rect('#fff3d8', 10, 34, 20, 3);
  rect('#1e3444', 12, 37, 16, 3);
  rect(d.accent, 12, 19, 16, 11);
  rect('#ffcc94', 7, 22, 6, 5);
  rect('#ffcc94', 27, 22, 6, 5);
  rect('#724a3c', 13, 12, 14, 8);
  rect('#ffce99', 14, 9, 13, 11);
  if (driverIndex === 2) {
    rect('#f8ce60', 11, 7, 18, 15);
    rect('#ffd998', 15, 9, 10, 10);
    rect('#ffca45', 15, 2, 3, 5);
    rect('#ffca45', 21, 1, 3, 6);
  } else if (driverIndex === 6) {
    rect('#f6f1df', 9, 5, 22, 10);
    rect('#f6f1df', 12, 2, 16, 13);
    rect('#e94842', 16, 3, 8, 7);
    rect('#e94842', 9, 8, 4, 5);
    rect('#e94842', 27, 8, 4, 5);
  } else if ([3, 4, 7].includes(driverIndex)) {
    rect(d.color, 11, 5, 18, 15);
    rect(d.accent, 14, 17, 13, 9);
    rect('#f5f3d6', 24, 8, 7, 9);
    if (driverIndex === 4) {
      rect('#f55c38', 15, 2, 10, 5);
      rect('#ffeed2', 10, 19, 4, 5);
      rect('#ffeed2', 26, 19, 4, 5);
    }
  } else {
    rect(d.color, 11, 5, 18, 8);
    rect(d.color, 8, 10, 24, 4);
    rect(d.color, 14, 3, 12, 5);
  }
  if (front) {
    rect('#fff3dc', 15, 10, 4, 5);
    rect('#fff3dc', 22, 10, 4, 5);
    rect('#20354b', 17, 11, 2, 4);
    rect('#20354b', 22, 11, 2, 4);
    if (driverIndex < 2) rect('#633d33', 15, 17, 11, 3);
  } else {
    rect(d.accent, 13, 21, 14, 8);
    rect('#ffe0a1', 16, 23, 8, 4);
  }
  rect('#ffe695', 10, 30, 4, 3);
  rect('#ffe695', 26, 30, 4, 3);
  return c;
}

type Scenery = {
  x: number;
  y: number;
  type: 'tree' | 'pipe' | 'ghost' | 'crystal';
  size: number;
};
export class KartRenderer {
  private ground = canvas(W, H - HORIZON);
  private pixels = this.ground
    .getContext('2d')!
    .createImageData(W, H - HORIZON);
  private buffer = new Uint32Array(this.pixels.data.buffer);
  private texture!: Uint32Array;
  private trackId = '';
  private sprites = DRIVERS.map((_, i) => kartSprite(i));
  private scenery: Scenery[] = [];
  private cameraAngle: number | null = null;
  private cameraX = 0;
  private cameraY = 0;
  private skyStars = Array.from({ length: 50 }, (_, i) => ({
    x: (i * 173.17) % W,
    y: 8 + ((i * 79.37) % 105),
    s: i % 3 === 0 ? 2 : 1,
  }));

  resetCamera() {
    this.cameraAngle = null;
  }
  private makeTexture(track: Track) {
    const tex = canvas(1024, 1024),
      g = tex.getContext('2d')!;
    g.fillStyle = track.ground;
    g.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 32)
      for (let x = 0; x < 1024; x += 32) {
        g.fillStyle = ((x + y) / 32) % 2 === 0 ? '#ffffff08' : '#00000005';
        g.fillRect(x, y, 32, 32);
      }
    if (track.theme === 'beach') {
      g.fillStyle = '#62abb8';
      g.beginPath();
      g.ellipse(490, 342, 85, 110, 0.4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#c3e5d4';
      g.lineWidth = 12;
      g.stroke();
    }
    const path = () => {
      g.beginPath();
      track.points.forEach((p, i) =>
        i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y),
      );
      g.closePath();
    };
    g.lineJoin = 'round';
    path();
    g.strokeStyle = track.theme === 'rainbow' ? '#e7e8ff' : '#e8e0c9';
    g.lineWidth = track.width + 9;
    g.stroke();
    path();
    g.strokeStyle = track.road;
    g.lineWidth = track.width;
    g.stroke();
    if (track.theme === 'rainbow' || track.theme === 'haunted') {
      for (let s = 0; s < track.length; s += 9) {
        const a = at(track, s, -track.width / 2),
          b = at(track, s, track.width / 2);
        const c = at(track, s + 10, track.width / 2),
          d = at(track, s + 10, -track.width / 2);
        g.fillStyle =
          track.theme === 'rainbow'
            ? palette[Math.floor(s / 36) % palette.length]
            : Math.floor(s / 9) % 2
              ? '#968895'
              : '#756d80';
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.lineTo(c.x, c.y);
        g.lineTo(d.x, d.y);
        g.fill();
      }
    } else {
      for (let s = 0; s < track.length; s += 15)
        for (const side of [-1, 1]) {
          const a = at(track, s, side * track.width * 0.5),
            b = at(track, s + 15, side * track.width * 0.5);
          g.strokeStyle = Math.floor(s / 15) % 2 ? '#f2e6cb' : '#e66d5c';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.stroke();
        }
      path();
      g.setLineDash([14, 23]);
      g.strokeStyle = '#e6e4cb66';
      g.lineWidth = 2;
      g.stroke();
      g.setLineDash([]);
    }
    const p = at(track, 0);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.angle);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 10; j++) {
        g.fillStyle = (i + j) % 2 ? '#263246' : '#fff2d9';
        g.fillRect(
          i * 6,
          -track.width / 2 + (j * track.width) / 10,
          6,
          track.width / 10 + 0.5,
        );
      }
    g.restore();
    this.texture = new Uint32Array(
      g.getImageData(0, 0, 1024, 1024).data.buffer,
    );
    this.scenery = [];
    for (let i = 0; i < 70; i++) {
      const p = at(
        track,
        (i * track.length) / 70,
        (i % 2 ? 1 : -1) * (track.width / 2 + 22 + ((i * 17) % 55)),
      );
      if (project(track, p).distance < track.width * 0.7) continue;
      this.scenery.push({
        ...p,
        type:
          track.theme === 'rainbow'
            ? 'crystal'
            : track.theme === 'haunted'
              ? 'ghost'
              : i % 4 === 0
                ? 'pipe'
                : 'tree',
        size: 15 + (i % 3) * 6,
      });
    }
    this.trackId = track.id;
  }

  draw(target: HTMLCanvasElement, race: Race, time: number) {
    if (this.trackId !== race.track.id) {
      this.makeTexture(race.track);
      this.resetCamera();
    }
    if (target.width !== W || target.height !== H) {
      target.width = W;
      target.height = H;
    }
    const g = target.getContext('2d', { alpha: false })!;
    g.imageSmoothingEnabled = false;
    const player = race.karts[0],
      track = race.track;
    if (this.cameraAngle === null) this.cameraAngle = player.angle;
    this.cameraAngle +=
      Math.atan2(
        Math.sin(player.angle - this.cameraAngle),
        Math.cos(player.angle - this.cameraAngle),
      ) * 0.16;
    const angle = this.cameraAngle,
      ca = Math.cos(angle),
      sa = Math.sin(angle);
    this.cameraX = player.x - ca * 72;
    this.cameraY = player.y - sa * 72;
    g.fillStyle = track.sky;
    g.fillRect(0, 0, W, HORIZON);
    if (track.theme === 'haunted' || track.theme === 'rainbow') {
      g.fillStyle = '#edf1ff';
      for (const star of this.skyStars)
        g.fillRect(
          (((star.x - angle * 95) % W) + W) % W,
          star.y,
          star.s,
          star.s,
        );
      g.fillStyle = track.theme === 'rainbow' ? '#cabce5' : '#e7e6bd';
      g.beginPath();
      g.arc(490, 45, 21, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = track.sky;
      g.beginPath();
      g.arc(501, 39, 20, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = '#fff3cd';
      g.beginPath();
      g.arc(497, 40, 22, 0, Math.PI * 2);
      g.fill();
      for (let i = -2; i < 7; i++) {
        const x = ((i * 148 - angle * 65 + 4000) % 1100) - 210;
        g.fillStyle = '#f4f4df';
        g.fillRect(x, 35 + (i % 2) * 18, 67, 10);
        g.fillRect(x + 15, 26 + (i % 2) * 18, 33, 14);
      }
    }
    for (let i = -2; i < 12; i++) {
      const x = ((i * 91 - angle * 48 + 6000) % 1050) - 150;
      g.fillStyle =
        track.theme === 'meadow'
          ? '#5f9e8a'
          : track.theme === 'beach'
            ? '#989aaa'
            : '#303658';
      g.beginPath();
      g.moveTo(x, HORIZON);
      g.lineTo(x + 45, HORIZON - 24 - Math.abs(i % 3) * 9);
      g.lineTo(x + 110, HORIZON);
      g.fill();
    }
    const outside =
      track.theme === 'rainbow' || track.theme === 'haunted'
        ? 0xff382018
        : 0xff588f68;
    for (let row = 0; row < H - HORIZON; row++) {
      const depth = (FOCAL * CAMERA_HEIGHT) / (row + 1),
        pixelStep = depth / FOCAL;
      let wx = this.cameraX + ca * depth + sa * W * 0.5 * pixelStep;
      let wy = this.cameraY + sa * depth - ca * W * 0.5 * pixelStep;
      const dx = -sa * pixelStep,
        dy = ca * pixelStep;
      for (let x = 0; x < W; x++) {
        const ix = wx | 0,
          iy = wy | 0;
        this.buffer[row * W + x] =
          ix >= 0 && iy >= 0 && ix < 1024 && iy < 1024
            ? this.texture[iy * 1024 + ix]
            : outside;
        wx += dx;
        wy += dy;
      }
    }
    this.ground.getContext('2d')!.putImageData(this.pixels, 0, 0);
    g.drawImage(this.ground, 0, HORIZON);
    const objects: { z: number; draw: () => void }[] = [];
    const place = (
      x: number,
      y: number,
      fn: (x: number, y: number, scale: number) => void,
    ) => {
      const dx = x - this.cameraX,
        dy = y - this.cameraY,
        z = dx * ca + dy * sa;
      if (z < 19 || z > 1000) return;
      const scale = FOCAL / z,
        sx = W / 2 + (-dx * sa + dy * ca) * scale,
        sy = HORIZON + CAMERA_HEIGHT * scale;
      if (sx < -120 || sx > W + 120) return;
      objects.push({ z, draw: () => fn(sx, sy, scale) });
    };
    for (const object of this.scenery)
      place(object.x, object.y, (x, y, s) => {
        const h = object.size * s;
        g.save();
        g.translate(x, y);
        if (object.type === 'tree') {
          g.fillStyle = '#816043';
          g.fillRect(-h * 0.1, -h * 1.35, h * 0.2, h * 1.35);
          g.fillStyle = '#28785d';
          g.beginPath();
          g.moveTo(0, -h * 2.7);
          g.lineTo(h * 0.7, -h * 0.6);
          g.lineTo(-h * 0.7, -h * 0.6);
          g.fill();
          g.fillStyle = '#68b86e';
          g.beginPath();
          g.moveTo(0, -h * 2.7);
          g.lineTo(0, -h * 0.6);
          g.lineTo(-h * 0.7, -h * 0.6);
          g.fill();
        }
        if (object.type === 'pipe') {
          g.fillStyle = '#26885b';
          g.fillRect(-h * 0.5, -h, h, h);
          g.fillStyle = '#67c681';
          g.fillRect(-h * 0.65, -h * 1.25, h * 1.3, h * 0.35);
          g.fillStyle = '#ade1a3';
          g.fillRect(-h * 0.35, -h * 0.85, h * 0.12, h * 0.85);
        }
        if (object.type === 'ghost') {
          g.globalAlpha = 0.65 + Math.sin(time * 2 + object.x) * 0.15;
          g.fillStyle = '#e1dafa';
          g.beginPath();
          g.arc(0, -h * 1.7, h * 0.7, Math.PI, Math.PI * 2);
          g.lineTo(h * 0.7, -h * 0.8);
          g.lineTo(0, -h);
          g.lineTo(-h * 0.7, -h * 0.8);
          g.fill();
          g.fillStyle = '#353253';
          g.fillRect(-h * 0.35, -h * 1.9, h * 0.18, h * 0.3);
          g.fillRect(h * 0.15, -h * 1.9, h * 0.18, h * 0.3);
        }
        if (object.type === 'crystal') {
          g.fillStyle = palette[Math.floor(object.x) % 6];
          g.beginPath();
          g.moveTo(0, -h * 2);
          g.lineTo(h * 0.5, -h);
          g.lineTo(0, 0);
          g.lineTo(-h * 0.5, -h);
          g.fill();
        }
        g.restore();
      });
    for (const pickup of race.pickups)
      if (pickup.cooldown <= 0)
        place(pickup.x, pickup.y, (x, y, s) => {
          if (pickup.kind === 'boost') {
            g.fillStyle = '#ffcb5c';
            g.beginPath();
            g.moveTo(x, y - 5 * s);
            g.lineTo(x + 12 * s, y);
            g.lineTo(x, y + 4 * s);
            g.lineTo(x - 12 * s, y);
            g.fill();
            return;
          }
          const bounce = Math.sin(time * 4 + pickup.x) * 2;
          if (pickup.kind === 'coin') {
            g.fillStyle = '#ffe67e';
            g.strokeStyle = '#d58b3e';
            g.lineWidth = Math.max(1, s);
            g.beginPath();
            g.ellipse(
              x,
              y - (8 + bounce) * s,
              3.7 * s * (0.55 + Math.abs(Math.cos(time * 3)) * 0.45),
              5.5 * s,
              0,
              0,
              Math.PI * 2,
            );
            g.fill();
            g.stroke();
          } else {
            const h = 10 * s;
            g.save();
            g.translate(x, y - (10 + bounce) * s);
            g.rotate(Math.sin(time * 2) * 0.15);
            g.fillStyle = '#8ce4e8';
            g.strokeStyle = '#f6f1d6';
            g.lineWidth = Math.max(1, s);
            g.fillRect(-h * 0.5, -h * 0.5, h, h);
            g.strokeRect(-h * 0.5, -h * 0.5, h, h);
            g.fillStyle = '#335e93';
            g.font = `bold ${Math.max(6, 9 * s)}px monospace`;
            g.textAlign = 'center';
            g.fillText('?', 0, h * 0.35);
            g.restore();
          }
        });
    for (const hazard of race.hazards)
      place(hazard.x, hazard.y, (x, y, s) => {
        g.fillStyle = hazard.kind === 'banana' ? '#ffe36b' : '#70de96';
        g.beginPath();
        g.arc(x, y - 4 * s, 5 * s, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fff9d7';
        g.lineWidth = 2 * s;
        g.stroke();
      });
    for (const p of race.particles)
      place(p.x, p.y, (x, y, s) => {
        g.fillStyle = p.color;
        g.fillRect(x, y - 4 * s, Math.max(2, s * 2), Math.max(2, s * 2));
      });
    for (const kart of race.karts)
      if (kart.id !== 0)
        place(kart.x, kart.y, (x, y, scale) =>
          this.drawKart(g, kart, x, y, scale * 0.72, time),
        );
    objects.sort((a, b) => b.z - a.z).forEach((o) => o.draw());
    const lean = player.driftDirection * 12;
    this.drawKart(
      g,
      player,
      W * 0.5 + lean,
      H -
        22 -
        (player.rescue > 0
          ? Math.sin((player.rescue / 1.25) * Math.PI) * 65
          : 0),
      2.3,
      time,
    );
    if (player.boost > 0 || player.star > 0) {
      g.strokeStyle = '#fff6c560';
      g.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 + 0.2;
        g.beginPath();
        g.moveTo(W / 2 + Math.cos(a) * 220, H / 2 + Math.sin(a) * 145);
        g.lineTo(W / 2 + Math.cos(a) * 345, H / 2 + Math.sin(a) * 220);
        g.stroke();
      }
    }
  }

  private drawKart(
    g: CanvasRenderingContext2D,
    kart: Kart,
    x: number,
    y: number,
    scale: number,
    time: number,
  ) {
    if (kart.immune > 0 && kart.star <= 0 && Math.floor(time * 12) % 2 === 0)
      g.globalAlpha = 0.55;
    if (kart.small > 0) scale *= 0.6;
    g.fillStyle = '#14263750';
    g.beginPath();
    g.ellipse(x, y - scale, 17 * scale, 4 * scale, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(x, y);
    if (kart.spin > 0) g.scale(Math.cos(kart.spin * 18), 1);
    if (kart.star > 0)
      g.filter = `hue-rotate(${time * 550}deg) brightness(1.2)`;
    if (kart.boost > 0 || kart.star > 0) {
      g.fillStyle = Math.floor(time * 20) % 2 ? '#ffe880' : '#ff9857';
      for (const offset of [-11, 11]) {
        g.beginPath();
        g.moveTo((offset - 3) * scale, -3 * scale);
        g.lineTo(offset * scale, (7 + Math.sin(time * 40) * 4) * scale);
        g.lineTo((offset + 3) * scale, -3 * scale);
        g.fill();
      }
    }
    const bounce = kart.speed > 20 ? Math.sin(time * 30) * 0.55 * scale : 0;
    g.drawImage(
      this.sprites[kart.driver],
      -20 * scale,
      -42 * scale + bounce,
      40 * scale,
      42 * scale,
    );
    g.restore();
    g.globalAlpha = 1;
  }
}
