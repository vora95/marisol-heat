// WebAudio synth sound effects. Everything is generated with oscillators
// and noise buffers — no audio files, no network.

let ctx = null;
let master = null;
let sirenOn = false;
let sirenNodes = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, lowpass) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let node = src;
  if (lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    src.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(master);
  src.start(t);
}

export const sfx = {
  punch() {
    noise(0.09, 0.35, 900);
    tone(140, 0.08, 'sine', 0.3, 60);
  },
  shot() {
    noise(0.14, 0.5, 2600);
    tone(220, 0.1, 'sawtooth', 0.2, 50);
  },
  crash() {
    noise(0.3, 0.45, 500);
    tone(90, 0.25, 'sine', 0.35, 40);
  },
  pickup() {
    tone(660, 0.09, 'sine', 0.25);
    setTimeout(() => tone(990, 0.12, 'sine', 0.25), 90);
  },
  mission() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.3), i * 110));
  },
  fail() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.2), i * 130));
  },
  click() {
    tone(880, 0.05, 'sine', 0.15);
  },
  engine(on) {
    if (!ctx) return;
    if (on && !sirenNodes) {
      // Soft engine hum while driving: low sawtooth + LFO wobble.
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 55;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(master);
      o.start();
      sirenNodes = { o, g };
    } else if (!on && sirenNodes) {
      try {
        sirenNodes.o.stop();
      } catch { /* already stopped */ }
      sirenNodes = null;
    }
  },
};

export function setSiren(on) {
  if (!ctx || on === sirenOn) return;
  sirenOn = on;
  if (!on) {
    if (sirenNodes && sirenNodes.siren) {
      try {
        sirenNodes.siren.stop();
      } catch { /* noop */ }
      sirenNodes.siren = null;
    }
    return;
  }
  // Two-tone police siren, LFO-driven.
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 750;
  lfo.type = 'square';
  lfo.frequency.value = 0.9;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain);
  lfoGain.connect(o.frequency);
  g.gain.value = 0.05;
  o.connect(g);
  g.connect(master);
  o.start();
  lfo.start();
  sirenNodes = sirenNodes || {};
  sirenNodes.siren = o;
  sirenNodes.sirenLfo = lfo;
}
