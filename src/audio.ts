// All sound is generated or synthesised - no audio files, nothing to download,
// works offline the moment the page is cached.

let ctx: AudioContext | null = null;

/** iOS will not make a sound until an AudioContext is created inside a real
 *  tap, so this gets called from the very first button press. */
export function wakeAudio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** The reward. Low sawtooth swooping down, plus filtered noise for the growl,
 *  shaped by an envelope so it starts sharp and trails off. */
export function roar() {
  const ac = wakeAudio();
  const now = ac.currentTime;
  const dur = 1.3;

  const out = ac.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(0.9, now + 0.08);
  out.gain.setValueAtTime(0.9, now + 0.7);
  out.gain.exponentialRampToValueAtTime(0.001, now + dur);
  out.connect(ac.destination);

  // Growl body
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);
  osc.frequency.exponentialRampToValueAtTime(48, now + dur);

  // Wobble, so it sounds like an animal and not a synth
  const wobble = ac.createOscillator();
  wobble.frequency.value = 22;
  const wobbleDepth = ac.createGain();
  wobbleDepth.gain.value = 18;
  wobble.connect(wobbleDepth).connect(osc.frequency);

  const shaper = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 3);
  }
  shaper.curve = curve;

  osc.connect(shaper).connect(out);

  // Breath / rasp
  const noiseBuf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ac.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(900, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(300, now + dur);
  noiseFilter.Q.value = 1.2;
  const noiseGain = ac.createGain();
  noiseGain.gain.value = 0.35;
  noise.connect(noiseFilter).connect(noiseGain).connect(out);

  osc.start(now); wobble.start(now); noise.start(now);
  osc.stop(now + dur); wobble.stop(now + dur); noise.stop(now + dur);
}

/** Wrong answer. Deliberately soft and low - a "hmm", not a buzzer.
 *  Nothing here should feel like losing. */
export function grumble() {
  const ac = wakeAudio();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(120, now + 0.35);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

/** Chris's rule: NO robot voices, ever. This used to be the speech-synthesis
 *  fallback; now a missing clip means a quiet beat and a console note, never
 *  a synthetic voice. Every call site stays as-is - the last-resort layer is
 *  simply silence. Fix a silent moment by recording the named clip. */
export function say(text: string, _opts: { rate?: number; pitch?: number } = {}) {
  console.warn(`[abc-bear] missing recording, staying silent instead of TTS: "${text}"`);
}
