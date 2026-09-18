import type { FxId } from "@system/shared";

/**
 * Original, diegetic tones. No samples, no licensed stingers. Sparse on
 * purpose — the System arrives as glass, not as a game soundtrack.
 *
 * AudioContext is created on the unmute gesture so autoplay policies hold.
 */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function unlockSfx(): void {
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();
}

function tone(
  audio: AudioContext,
  {
    freq,
    freqEnd,
    duration,
    type = "sine",
    gain = 0.07,
    delay = 0,
    filter,
  }: {
    freq: number;
    freqEnd?: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    filter?: number;
  },
): void {
  const now = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), now + duration);
  }
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  if (filter) {
    const low = audio.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = filter;
    osc.connect(low);
    low.connect(amp);
  } else {
    osc.connect(amp);
  }
  amp.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playSfx(fx: FxId[]): void {
  const audio = context();
  if (!audio || audio.state === "suspended") return;

  const ids = new Set(fx);
  if (ids.has("death")) {
    tone(audio, { freq: 180, freqEnd: 55, duration: 0.7, type: "triangle", gain: 0.05, filter: 400 });
    return;
  }
  if (ids.has("victory")) {
    tone(audio, { freq: 392, duration: 0.22, type: "sine", gain: 0.05 });
    tone(audio, { freq: 523, duration: 0.35, type: "sine", gain: 0.04, delay: 0.12 });
    return;
  }
  if (ids.has("level_up")) {
    tone(audio, { freq: 440, freqEnd: 880, duration: 0.38, type: "sine", gain: 0.06 });
    tone(audio, { freq: 660, freqEnd: 1320, duration: 0.28, type: "triangle", gain: 0.03, delay: 0.08 });
    return;
  }
  if (ids.has("item_acquire")) {
    tone(audio, { freq: 523, duration: 0.16, type: "sine", gain: 0.05 });
    tone(audio, { freq: 784, duration: 0.28, type: "triangle", gain: 0.04, delay: 0.07 });
    return;
  }
  if (ids.has("red_seal")) {
    tone(audio, { freq: 90, freqEnd: 40, duration: 0.55, type: "sawtooth", gain: 0.035, filter: 220 });
    return;
  }
  if (ids.has("system_open")) {
    tone(audio, { freq: 740, duration: 0.12, type: "triangle", gain: 0.045 });
    tone(audio, { freq: 988, duration: 0.18, type: "sine", gain: 0.03, delay: 0.05 });
    return;
  }
  if (ids.has("fail_deadly")) {
    tone(audio, { freq: 140, freqEnd: 70, duration: 0.28, type: "square", gain: 0.04, filter: 380 });
    return;
  }
  if (ids.has("fail_hit")) {
    tone(audio, { freq: 180, duration: 0.12, type: "square", gain: 0.035, filter: 500 });
    return;
  }
  if (ids.has("strike_heavy") || ids.has("strike")) {
    tone(audio, {
      freq: ids.has("strike_heavy") ? 110 : 160,
      duration: 0.09,
      type: "square",
      gain: 0.04,
      filter: 700,
    });
    return;
  }
  if (ids.has("confirm") || ids.has("lock_deny")) {
    tone(audio, { freq: ids.has("lock_deny") ? 210 : 420, duration: 0.05, type: "square", gain: 0.03, filter: 1200 });
  }
}
