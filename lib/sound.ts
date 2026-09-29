/** One-shot notification sounds using Web Audio — no asset files needed. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function beep(
  ac: AudioContext,
  at: number,
  freq: number,
  duration = 0.22,
  type: OscillatorType = "sine",
  gain = 0.18
): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/** Played exactly once when a pomodoro phase ends. */
export function playPhaseSound(phase: "focus" | "short" | "long"): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime + 0.05;
  if (phase === "focus") {
    // bright two-tone chime: focus complete
    beep(ac, now, 880);
    beep(ac, now + 0.28, 1174.66);
  } else if (phase === "short") {
    // soft single tone: break over
    beep(ac, now, 659.25, 0.3);
  } else {
    // warm triple tone: long break over
    beep(ac, now, 523.25);
    beep(ac, now + 0.25, 659.25);
    beep(ac, now + 0.5, 783.99, 0.35);
  }
}
