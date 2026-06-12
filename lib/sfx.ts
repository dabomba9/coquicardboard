// Tiny retro sound effects, synthesized with the Web Audio API (no audio files).
// Muted by DEFAULT — sound only plays once the user opts in via the nav toggle.
// State is module-level (singleton) and persisted in localStorage.

let ctx: AudioContext | null = null;
let muted = true;
let initialized = false;

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  muted = localStorage.getItem("cc.sfx") !== "on"; // default muted unless explicitly "on"
}

export function isMuted(): boolean {
  ensureInit();
  return muted;
}

export function setMuted(next: boolean) {
  ensureInit();
  muted = next;
  if (typeof window !== "undefined") localStorage.setItem("cc.sfx", next ? "off" : "on");
}

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume(); // satisfy autoplay policy after a gesture
  return ctx;
}

// One square-wave blip with a quick attack + exponential decay.
function blip(freq: number, dur: number, when = 0, gain = 0.06) {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Menu move/select — a single short blip. */
export function playSelect() {
  if (isMuted()) return;
  blip(660, 0.08);
}

/** Confirm / quick-add — a rising two-note chirp. */
export function playConfirm() {
  if (isMuted()) return;
  blip(523, 0.07, 0);
  blip(784, 0.1, 0.07);
}

/** Tier complete — a little victory arpeggio. */
export function playFanfare() {
  if (isMuted()) return;
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.14, i * 0.1, 0.07));
}
