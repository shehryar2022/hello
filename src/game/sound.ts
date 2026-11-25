let audioCtx: AudioContext | null = null;

export type SfxKind = 'coin' | 'buy' | 'deal' | 'win' | 'err' | 'tap';

const FREQS: Record<SfxKind, number[]> = {
  coin: [880, 1320],
  buy: [660, 880],
  deal: [523, 659, 784],
  win: [523, 659, 784, 1047],
  err: [196, 147],
  tap: [440],
};

export function playSfx(kind: SfxKind, enabled: boolean): void {
  if (!enabled) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const freqs = FREQS[kind] || [440];
    osc.type = 'sine';
    osc.frequency.value = freqs[0];
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 * freqs.length);
    freqs.forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.08));
    osc.start(now);
    osc.stop(now + 0.15 * freqs.length);
  } catch {
    // Ignore audio context errors when autoplay is blocked
  }
}

export function triggerBuzz(ms: number, enabled: boolean): void {
  if (!enabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // Ignore vibration unsupported
  }
}
