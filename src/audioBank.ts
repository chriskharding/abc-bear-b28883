// Recorded clips live in IndexedDB, so a recording is playable the instant it
// is made - no build step, no dropping files into folders. `exportAll` writes
// them out as real files for checking into the repo or porting to a native app.
//
// Anything not yet recorded falls back to the speech synthesiser, so the app
// is always playable even with an empty bank.

import { ROAR_IDS } from './clips';

const DB = 'abc-bear-audio';
const STORE = 'clips';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  });
}

export const putClip = (id: string, blob: Blob) =>
  tx<void>('readwrite', (s) => s.put(blob, id));

export const getClip = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));

export const deleteClip = (id: string) => tx<void>('readwrite', (s) => s.delete(id));

export const recordedIds = () => tx<string[]>('readonly', (s) => s.getAllKeys() as IDBRequest);

/** Where an exported clip lives once it's committed to the repo. IndexedDB is
 *  per-browser and per-machine, so recordings made on a laptop only reach a
 *  phone by being exported to these files and served with the app. */
export const filePathFor = (id: string) =>
  // BASE_URL keeps this working both at the domain root (dev server) and
  // under a subpath (GitHub Pages).
  `${import.meta.env.BASE_URL}audio/${id.replace(/:/g, '_')}.wav`;

// Object URLs are cached so repeat plays don't re-read the database.
const urlCache = new Map<string, string>();
// Clips with no shipped file, so a missing one is only ever fetched once.
const missingFiles = new Set<string>();

export async function urlFor(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;

  // A local recording always wins - it's the take being worked on right now.
  const blob = await getClip(id);
  if (blob) {
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  }

  // Otherwise fall back to a shipped file, which is what a phone will use.
  if (missingFiles.has(id)) return null;
  const path = filePathFor(id);
  try {
    const res = await fetch(path, { method: 'HEAD' });
    // Many static hosts answer a missing file with index.html and a 200, so
    // trusting res.ok alone would hand back a page pretending to be audio.
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || type.includes('text/html')) {
      missingFiles.add(id);
      return null;
    }
    urlCache.set(id, path);
    return path;
  } catch {
    missingFiles.add(id);
    return null;
  }
}

export function forget(id: string) {
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
}

// iOS only lets an <audio> element start playing inside a real tap. One
// element gets unlocked during the first tap and is reused for every clip
// after that - a fresh element per clip (the obvious approach) is blocked the
// moment playback drifts outside the gesture, which is why round intros went
// silent and roars fell back to the synth on the phone.
let player: HTMLAudioElement | null = null;

/** Call from inside a user gesture (the start button). Safe to call again. */
export function unlockPlayer() {
  if (player) return;
  player = new Audio();
  // Shortest valid silent wav: playing it inside the tap unlocks the element.
  player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  void player.play().then(() => player?.pause()).catch(() => { /* desktop doesn't care */ });
}

/** Play a recorded clip. Resolves true if one existed, false if the caller
 *  should fall back. Resolves when playback finishes so callers can sequence. */
export async function playClip(id: string): Promise<boolean> {
  const url = await urlFor(id);
  if (!url) return false;

  if (!player) player = new Audio(); // desktop path where no unlock is needed
  const el = player;
  // Whoever was mid-play gets settled as done, not orphaned. An abandoned
  // promise here freezes whatever await chain was riding on it - tap a card
  // fast enough and the whole round used to hang on exactly that.
  settleCurrent?.(true);
  el.pause();
  el.src = url;
  // Report failure honestly - a clip that won't decode has to fall through to
  // the speech synthesiser, otherwise that step of the lesson is just silent.
  return new Promise<boolean>((res) => {
    const settle = (ok: boolean) => {
      if (settleCurrent === settle) settleCurrent = null;
      res(ok);
    };
    settleCurrent = settle;
    el.onended = () => settle(true);
    el.onerror = () => {
      missingFiles.add(id);
      urlCache.delete(id);
      settle(false);
    };
    el.play().catch(() => settle(false));
  });
}

/** The resolver of the clip currently in the player, so an interrupting play
 *  can settle it instead of stranding its caller. */
let settleCurrent: ((ok: boolean) => void) | null = null;

/** Is there anything to play for this id - a local recording or a shipped file? */
export const hasClip = async (id: string) => (await urlFor(id)) !== null;

/** Every roar the app can currently play: the built-in takes, the kid's own,
 *  and any number of guest roars (sfx:roar:extra:N - mommy bear, grandma
 *  bear, friends). Guests are discovered, not declared, so the pool grows the
 *  moment someone records one. */
export async function listRoarIds(): Promise<string[]> {
  const pool: string[] = [];
  for (const id of ROAR_IDS) {
    if (await hasClip(id)) pool.push(id);
  }
  // Scan guest slots until the trail goes cold; gaps from deletions are fine.
  let misses = 0;
  for (let n = 1; n <= 50 && misses < 3; n++) {
    const id = `sfx:roar:extra:${n}`;
    if (await hasClip(id)) {
      pool.push(id);
      misses = 0;
    } else {
      misses++;
    }
  }
  return pool;
}

export function stopAll() {
  settleCurrent?.(true);
  player?.pause();
}

/** Length of a clip in seconds, or null if it isn't recorded. Lets the
 *  countdown numbers land on the "3… 2… 1…" however the parent paced it. */
export async function clipDuration(id: string): Promise<number | null> {
  const url = await urlFor(id);
  if (!url) return null;
  return new Promise((res) => {
    const a = new Audio(url);
    a.onloadedmetadata = () => res(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => res(null);
    setTimeout(() => res(null), 1500); // don't let a bad file stall the start
  });
}

/** Download the given clips, named by id, for committing to the repo. */
export async function exportIds(ids: string[]): Promise<number> {
  for (const id of ids) {
    const blob = await getClip(id);
    if (!blob) continue;
    const ext = blob.type.includes('wav') ? 'wav'
      : blob.type.includes('mp4') ? 'm4a'
      : 'webm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${id.replace(/:/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    await new Promise((r) => setTimeout(r, 120)); // browsers throttle bulk downloads
  }
  return ids.length;
}

/** Every local recording, one zip, one download. The per-file exporter drops
 *  files silently in Safari past a handful - this cannot. */
export async function exportAllZip(onlyIds?: string[]): Promise<number> {
  const { buildZip } = await import('./zip');
  const ids = onlyIds ?? await recordedIds();
  const files: { name: string; data: Uint8Array }[] = [];
  for (const id of ids) {
    const blob = await getClip(id);
    if (!blob) continue;
    const ext = blob.type.includes('wav') ? 'wav'
      : blob.type.includes('mp4') ? 'm4a'
      : 'webm';
    files.push({
      name: `${id.replace(/:/g, '_')}.${ext}`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
  }
  if (!files.length) return 0;
  const zip = buildZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zip);
  a.download = 'abc-bear-recordings.zip';
  a.click();
  URL.revokeObjectURL(a.href);
  return files.length;
}
