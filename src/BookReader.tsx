// The bookshelf and the book reader. A page is READ, not listened to: every
// decodable word is its own mini slider (same drag-to-blend as the game) and
// tricky words are tap-to-hear sight chips. When the last word on the page is
// done, the recorded storytime sentence plays back whole - the reward for
// reading it himself. Art: a generated image from
// public/book-art/<bookId>-p<N>.png (or -cover.png) when present, the emoji
// otherwise. Finishing a book roars, stars the cover, and counts on the
// parent report card.

import { useEffect, useRef, useState } from 'react';
import { Bear, type Mood } from './Bear';
import { BOOKS, TRICKY_WORDS, pageClipId, titleClipId, type Book } from './books';
import { playClip } from './audioBank';
import { recordBookFinished, loadStats } from './stats';
import { BlendStrip } from './BlendStrip';

const clean = (w: string) => w.toLowerCase().replace(/[^a-z]/g, '');
const wordId = (w: string) => `word:${clean(w)}`;

const artBase = `${import.meta.env.BASE_URL}book-art/`;

/** Generated art with emoji fallback. */
function PageArt({ file, emoji, big }: { file: string; emoji?: string; big?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !file) {
    return emoji ? <div className={big ? 'book__cover' : 'book__pic'}>{emoji}</div> : null;
  }
  return (
    <img
      className={big ? 'book__art book__art--big' : 'book__art'}
      src={`${artBase}${file}`}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export function BookShelf({ onBack, onOpen }: { onBack: () => void; onOpen: (b: Book) => void }) {
  const finished = loadStats().books ?? {};
  return (
    <div className="screen roars">
      <div className="rec__top">
        <button className="hear-btn hear-btn--back" onClick={onBack} aria-label="back">⬅️</button>
        <span className="roars__collected">my books</span>
      </div>
      <div className="shelf">
        {BOOKS.map((b) => (
          <button key={b.id} className="shelf__book" onClick={() => onOpen(b)}>
            <span className="shelf__cover">{b.cover}</span>
            <span className="shelf__title">{b.title}</span>
            {finished[b.id] ? <span className="shelf__star">⭐ ×{finished[b.id]}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BookReader({
  book, onDone,
}: { book: Book; onDone: () => void }) {
  const [page, setPage] = useState(-1); // -1 = cover
  const [mood, setMood] = useState<Mood>('calm');
  /** Which word slots on this page have been read. */
  const [done, setDone] = useState<Set<number>>(new Set());
  const [pageDone, setPageDone] = useState(false);
  const seq = useRef(0);

  // The cover announces the title once on open.
  useEffect(() => {
    const t = setTimeout(() => void playClip(titleClipId(book.id)), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = page >= 0 ? book.pages[page] : null;
  const words = cur ? cur.text.split(/\s+/) : [];

  /** A word slot finished (slid, or sight-chip tapped): say the word, and if
   *  it was the last one, the whole sentence comes back in storytime voice. */
  const wordFinished = async (idx: number) => {
    const my = ++seq.current;
    await playClip(wordId(words[idx]));
    const next = new Set(done).add(idx);
    setDone(next);
    if (next.size === words.length && !pageDone) {
      setPageDone(true);
      if (seq.current !== my) return;
      setMood('think');
      await playClip(pageClipId(book.id, page));
      setMood('calm');
    }
  };

  /** Replay the page: recorded sentence, else word-by-word. */
  const readPage = async () => {
    const my = ++seq.current;
    setMood('think');
    if (!(await playClip(pageClipId(book.id, page)))) {
      for (const w of words) {
        if (seq.current !== my) return;
        await playClip(wordId(w));
        if (seq.current !== my) return;
        await new Promise((r) => setTimeout(r, 160));
      }
    }
    if (seq.current === my) setMood('calm');
  };

  const next = async () => {
    seq.current++;
    if (page >= book.pages.length - 1) {
      recordBookFinished(book.id);
      setMood('roar');
      await playClip('sfx:roar:1');
      setMood('calm');
      onDone();
      return;
    }
    const n = page + 1;
    setPage(n);
    setDone(new Set());
    setPageDone(false);
  };

  return (
    <div className="screen roars">
      <div className="rec__top">
        <button className="hear-btn hear-btn--back" onClick={onDone} aria-label="back">⬅️</button>
        <span className="roars__collected">
          {page < 0 ? book.title : `${page + 1} / ${book.pages.length}`}
        </span>
      </div>

      {page < 0 ? (
        <>
          <PageArt file={`${book.id}-cover.png`} emoji={book.cover} big />
          <h2 className="title title--sm">{book.title}</h2>
          <Bear mood={mood} size={110} />
        </>
      ) : (
        <>
          <PageArt file={`${book.id}-p${page + 1}.png`} emoji={cur?.pic} />
          {/* He reads the page: sliders for decodable words, sight chips for
              tricky ones. Completing them all earns the storytime read-back. */}
          <div className="book__line">
            {words.map((w, i) => {
              const c = clean(w);
              const isDone = done.has(i);
              if (TRICKY_WORDS.includes(c)) {
                return (
                  <button
                    key={`${page}-${i}`}
                    className={`sight-chip ${isDone ? 'sight-chip--done' : ''}`}
                    onClick={() => !isDone && wordFinished(i)}
                  >
                    {w}
                  </button>
                );
              }
              return (
                <div key={`${page}-${i}`} className={`blend--mini ${isDone ? 'blend--mini-done' : ''}`}>
                  <BlendStrip
                    word={c}
                    disabled={isDone}
                    onComplete={() => wordFinished(i)}
                  />
                </div>
              );
            })}
          </div>
          {pageDone && (
            <button className="hear-btn" onClick={readPage} aria-label="read the page again">
              🔊<span className="hear-btn__badge" aria-hidden="true">↻</span>
            </button>
          )}
        </>
      )}

      <button
        className={`big-btn ${page >= 0 && !pageDone ? 'big-btn--off' : ''}`}
        onClick={next}
        disabled={page >= 0 && !pageDone}
      >
        {page < 0 ? 'READ!' : page >= book.pages.length - 1 ? 'THE END!' : 'NEXT →'}
      </button>
    </div>
  );
}
