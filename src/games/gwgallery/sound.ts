// Game & Watch ピエゾ圧電ブザー音シンセサイザー (Web Audio API)
// 高調波ノイズ・ポップノイズ・多重再生音割れを防止した高品質レトロ音源

class GwSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastPlayTime: number = 0;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;

  constructor() {}

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // マスターゲインとローパスフィルター（実機のピエゾブザー周波数特性）
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 2800; // キンキンする高周波クリップノイズをカット
        this.filter.Q.value = 1.2; // レトロなレゾナンス感

        this.filter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
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
   * ポップノイズ・クリッピングを防止したピエゾ電子ビープ音
   */
  private playBeep(
    freq: number,
    durationSec: number,
    volume: number = 0.08,
    type: OscillatorType = 'square',
    throttleMs: number = 25
  ) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.filter) return;

    const now = ctx.currentTime;
    // 多重発音によるバリバリ音割れ（過密再生）をスロットル
    if (now - this.lastPlayTime < throttleMs / 1000) {
      return;
    }
    this.lastPlayTime = now;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      // クリックノイズを防ぐエンベロープ（3msアタック、5msリリース）
      const attackTime = 0.003;
      const releaseTime = Math.min(0.008, durationSec * 0.2);
      const sustainTime = Math.max(0, durationSec - attackTime - releaseTime);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attackTime);
      gain.gain.setValueAtTime(volume, now + attackTime + sustainTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // AudioContext未初期化などのエラーを抑制
    }
  }

  /** ボタンクリック・UI操作音 */
  public click() {
    this.playBeep(1800, 0.025, 0.07, 'square', 20);
  }

  /** 一歩進む・歩行・足音 (LCDのステップ音: 軽快なピコッ) */
  public tick() {
    this.playBeep(1350, 0.028, 0.065, 'square', 40);
  }

  /** タコの足の伸縮音（少し低めのレトロビープ） */
  public octoStep() {
    this.playBeep(850, 0.035, 0.06, 'square', 45);
  }

  /** マンホール配置・バウンド・キャッチ音 */
  public catch() {
    this.playBeep(1650, 0.04, 0.09, 'square', 30);
  }

  /** 得点獲得音（救急車収容、宝箱回収、オイルドラム缶キャッチ: ピポッ） */
  public score() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      this.playBeep(1500, 0.035, 0.08, 'square', 0);
      setTimeout(() => this.playBeep(2200, 0.045, 0.09, 'square', 0), 45);
    } catch {}
  }

  /** オイル滴下・落下音 */
  public drop() {
    this.playBeep(1100, 0.03, 0.06, 'square', 40);
  }

  /** オイルを窓から流す */
  public dump() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      this.playBeep(1200, 0.04, 0.08, 'square', 0);
      setTimeout(() => this.playBeep(900, 0.05, 0.08, 'square', 0), 45);
    } catch {}
  }

  /** 警告・ピンチ音 */
  public warn() {
    this.playBeep(1150, 0.06, 0.09, 'square', 30);
  }

  /** ミス音（LCDゲーム独特の「プーッ」という下降ブザー） */
  public miss() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx || !this.filter) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.32);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
      gain.gain.setValueAtTime(0.12, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /** ゲームオーバー メロディ */
  public gameOver() {
    if (this.isMuted) return;
    const notes = [
      { f: 523, d: 0.12 }, // C5
      { f: 440, d: 0.12 }, // A4
      { f: 392, d: 0.14 }, // G4
      { f: 330, d: 0.3 },  // E4
    ];
    let offset = 0;
    notes.forEach((n) => {
      setTimeout(() => {
        this.playBeep(n.f, n.d, 0.1, 'square', 0);
      }, offset * 1000);
      offset += n.d + 0.04;
    });
  }

  /** 300点ボーナス / ミス消去ファンファーレ */
  public bonus() {
    if (this.isMuted) return;
    const notes = [
      { f: 880, d: 0.06 },  // A5
      { f: 1108, d: 0.06 }, // C#6
      { f: 1318, d: 0.06 }, // E6
      { f: 1760, d: 0.16 }, // A6
    ];
    let offset = 0;
    notes.forEach((n) => {
      setTimeout(() => {
        this.playBeep(n.f, n.d, 0.1, 'square', 0);
      }, offset * 1000);
      offset += n.d + 0.03;
    });
  }
}

export const gwSound = new GwSoundEngine();
