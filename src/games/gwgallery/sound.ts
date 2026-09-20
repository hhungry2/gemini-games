// Game & Watch ピエゾ圧電ブザー音シンセサイザー (Web Audio API)

class GwSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // ユーザーインタラクション時に初期化
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * 基本のピエゾ矩形波ビープ音を再生
   */
  private playBeep(freq: number, durationSec: number, volume: number = 0.15, type: OscillatorType = 'square') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // ピエゾ特有の鋭いアタック＆カットオフ
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime + durationSec * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // AudioContext未初期化などのエラーを抑制
    }
  }

  /** ボタンクリック・UI操作音 */
  public click() {
    this.playBeep(2400, 0.02, 0.08);
  }

  /** 一歩進む・歩行・足音 (LCDのステップ音) */
  public tick() {
    this.playBeep(1800, 0.025, 0.1);
  }

  /** 低めのステップ音（オクトパスの足の動きなど） */
  public octoStep() {
    this.playBeep(980, 0.03, 0.09);
  }

  /** マンホール配置・バウンド・キャッチ音 */
  public catch() {
    this.playBeep(2700, 0.035, 0.15);
  }

  /** 得点獲得音（救急車収容、宝箱回収、オイルドラム缶キャッチ） */
  public score() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      this.playBeep(2200, 0.03, 0.12);
      setTimeout(() => this.playBeep(3300, 0.04, 0.14), 40);
    } catch {}
  }

  /** オイル滴下・落下音 */
  public drop() {
    this.playBeep(1400, 0.03, 0.1);
  }

  /** オイルを窓から流す（スプラッシュ前） */
  public dump() {
    this.playBeep(1100, 0.04, 0.12);
  }

  /** 警告・ピンチ音 */
  public warn() {
    this.playBeep(1200, 0.05, 0.14);
  }

  /** ミス音（LCDゲーム独特の「プーッ」というブザー） */
  public miss() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /** ゲームオーバー メロディ */
  public gameOver() {
    if (this.isMuted) return;
    const notes = [
      { f: 523, d: 0.1 },  // C5
      { f: 440, d: 0.1 },  // A4
      { f: 392, d: 0.1 },  // G4
      { f: 330, d: 0.25 }, // E4
    ];
    let offset = 0;
    notes.forEach((n) => {
      setTimeout(() => {
        this.playBeep(n.f, n.d, 0.18);
      }, offset * 1000);
      offset += n.d + 0.04;
    });
  }

  /** 300点ボーナス / ミス消去ファンファーレ */
  public bonus() {
    if (this.isMuted) return;
    const notes = [
      { f: 1046, d: 0.05 }, // C6
      { f: 1318, d: 0.05 }, // E6
      { f: 1568, d: 0.05 }, // G6
      { f: 2093, d: 0.12 }, // C7
    ];
    let offset = 0;
    notes.forEach((n) => {
      setTimeout(() => {
        this.playBeep(n.f, n.d, 0.15);
      }, offset * 1000);
      offset += n.d + 0.02;
    });
  }

  /** 時計・アラームベル音 */
  public alarm() {
    this.playBeep(2048, 0.03, 0.15);
    setTimeout(() => this.playBeep(2048, 0.03, 0.15), 60);
    setTimeout(() => this.playBeep(2048, 0.03, 0.15), 120);
  }
}

export const gwSound = new GwSoundEngine();
