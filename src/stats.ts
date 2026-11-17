// Progress tracking for the parent page. Everything lives in localStorage on
// the device the kid plays on - no accounts, no cloud, nothing leaves the
// phone. The parent page says as much.

export type Stats = {
  /** word -> times read successfully via the blend strip */
  words: Record<string, number>;
  /** word -> times the slide was abandoned/reset (the try-agains) */
  wordMisses: Record<string, number>;
  /** letter -> [right, wrong] across sound rounds */
  letters: Record<string, [number, number]>;
  /** book id -> times finished */
  books: Record<string, number>;
  sessions: number;
  /** ISO date of last play, for the parent page header */
  lastPlayed: string | null;
};

const KEY = 'abc-bear-stats';

const empty = (): Stats => ({
  words: {}, wordMisses: {}, letters: {}, books: {}, sessions: 0, lastPlayed: null,
});

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

function save(mutate: (s: Stats) => void) {
  const s = loadStats();
  mutate(s);
  s.lastPlayed = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* storage full or blocked - stats are best-effort */ }
}

export const recordWordRead = (word: string) =>
  save((s) => { s.words[word] = (s.words[word] ?? 0) + 1; });

export const recordLetterAnswer = (letter: string, right: boolean) =>
  save((s) => {
    const cur = s.letters[letter] ?? [0, 0];
    s.letters[letter] = right ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1];
  });

export const recordSession = () => save((s) => { s.sessions += 1; });

export const recordWordMiss = (word: string) =>
  save((s) => { s.wordMisses[word] = (s.wordMisses[word] ?? 0) + 1; });

export const recordBookFinished = (bookId: string) =>
  save((s) => { s.books[bookId] = (s.books[bookId] ?? 0) + 1; });
