// Dragging to blend needs sounds that hold for as long as a finger rests on a
// letter, which an <audio> element can't do. So phonemes get decoded into Web
// Audio buffers and looped, and released with a short fade so stopping doesn't
// click.

import { urlFor } from './audioBank';

let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

const buffers = new Map<string, AudioBuffer | null>();

/** Decode once and keep it - a letter gets crossed many times per session. */
export async function getBuffer(id: string): Promise<AudioBuffer | null> {
  if (buffers.has(id)) return buffers.get(id)!;
  const url = await urlFor(id);
  if (!url) {
    buffers.set(id, null);
    return null;
  }
  try {
    const res = await fetch(url);
    const buf = await ac().decodeAudioData(await res.arrayBuffer());
    buffers.set(id, buf);
    return buf;
  } catch {
    buffers.set(id, null);
    return null;
  }
}

/** Warm the cache so the first drag of a word isn't silent while it decodes. */
export async function preload(ids: string[]) {
  await Promise.all(ids.map((id) => getBuffer(id)));
}

let source: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;

/** When the currently sounding phoneme is allowed to be replaced. A fast
 *  swipe used to cut each sound off the instant the finger left it, smearing
 *  "sip" into one blur with letters missing entirely. Now every phoneme is
 *  guaranteed this many seconds before the next one may start. */
const MIN_SOUND_S = 0.32;
const FADE_S = 0.03;

let currentUntil = 0;         // earliest time the current sound may be replaced
/** Every letter crossed but not yet sounded, in order. A fast swipe pushes
 *  s-i-p faster than they can play; each still gets its full moment. */
let queue: { id: string; hold: boolean }[] = [];
let pendingTimer: number | null = null;
let lifted = false;           // finger is up - stop after the queue drains

/** For tests and debugging: every phoneme that actually made sound, in order.
 *  Mirrored onto window so it's readable regardless of module instancing. */
export const played: string[] = [];
declare global { interface Window { __sustainPlayed?: string[] } }
if (typeof window !== 'undefined') window.__sustainPlayed = played;

function playNow(id: string, buf: AudioBuffer, hold: boolean) {
  played.push(id);
  const now = ac().currentTime;

  // Fade the old sound instead of cutting it - a dead cut clicks.
  if (source && gain) {
    try {
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_S);
      source.stop(now + FADE_S + 0.01);
    } catch { /* already stopped */ }
  }

  const src = ac().createBufferSource();
  src.buffer = buf;

  // Loop the middle rather than the whole clip: the attack and the tail-off
  // would otherwise repeat as an audible pulse instead of a held note.
  if (hold && buf.duration > 0.25) {
    src.loop = true;
    src.loopStart = buf.duration * 0.35;
    src.loopEnd = buf.duration * 0.8;
  }

  const g = ac().createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(1, now + FADE_S);
  src.connect(g).connect(ac().destination);
  src.start(now);
  // A non-looping stop ends on its own; a hold gets released by whatever
  // comes next (or the lift).
  if (!(hold && buf.duration > 0.25)) src.stop(now + buf.duration);

  source = src;
  gain = g;
  currentUntil = now + MIN_SOUND_S;

  // If the finger already lifted mid-queue, release once the floor is met.
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  schedule();
}

function schedule() {
  const waitMs = Math.max(0, (currentUntil - ac().currentTime) * 1000);
  pendingTimer = window.setTimeout(async () => {
    pendingTimer = null;
    const next = queue.shift();
    if (next) {
      const buf = await getBuffer(next.id);
      // Only the letter the finger is still resting on gets held - anything
      // it already swept past plays once, briefly, like real sounding-out.
      if (buf) playNow(next.id, buf, next.hold && queue.length === 0 && !lifted);
      else if (queue.length || lifted) schedule();
    } else if (lifted) {
      releaseNow();
    }
    // else: a held continuant keeps sounding until the finger moves or lifts
  }, waitMs);
}

function releaseNow() {
  if (!source || !gain) return;
  const now = ac().currentTime;
  try {
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + FADE_S);
    source.stop(now + FADE_S + 0.01);
  } catch { /* already stopped */ }
  source = null;
  gain = null;
}

/**
 * A finger arrived on a phoneme. If the previous sound has had its minimum
 * airtime it plays immediately; otherwise it queues (replacing any earlier
 * queued sound - only the newest position matters) so a fast swipe still
 * sounds out s… i… p distinctly instead of skipping letters.
 *
 * Returns false if there's no recording yet, so the caller can fall back.
 */
export async function startPhoneme(id: string, hold: boolean): Promise<boolean> {
  const buf = await getBuffer(id);
  if (!buf) return false;
  lifted = false;

  if (ac().currentTime >= currentUntil && queue.length === 0) {
    playNow(id, buf, hold);
  } else {
    // A wiggling finger can flap between two letters; don't stack repeats.
    if (queue[queue.length - 1]?.id !== id) queue.push({ id, hold });
    if (queue.length > 8) queue.shift();
    if (!pendingTimer) schedule();
  }
  return true;
}

/** The finger lifted. Whatever is sounding (or queued) still gets its minimum
 *  airtime, then everything goes quiet. */
export function stopPhoneme() {
  lifted = true;
  if (!source && queue.length === 0) return;
  if (ac().currentTime >= currentUntil && queue.length === 0) {
    releaseNow();
  } else if (!pendingTimer) {
    schedule();
  }
}

/** iOS keeps the context suspended until a real gesture resumes it. */
export function wakeSustain() {
  if (ac().state === 'suspended') void ac().resume();
}
