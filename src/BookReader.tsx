// The bookshelf and the book reader. A book page shows its picture and
// sentence; tapping the page reads it aloud - the recorded whole sentence if
// it exists, else word-by-word from the word clips (every word in every book
// is chosen to have one). Tapping any single word says just that word.
// Finishing a book roars, stars the cover on the shelf, and counts on the
// parent report card.

import { useEffect, useRef, useState } from 'react';
import { Bear, type Mood } from './Bear';
import { BOOKS, pageClipId, titleClipId, type Book } from './books';
import { playClip } from './audioBank';
import { recordBookFinished, loadStats } from './stats';

const wordId = (w: string) => `word:${w.toLowerCase().replace(/[^a-z]/g, '')}`;

/** Sentence -> speakable word ids, punctuation dropped. */
const pageWords = (text: string) =>
  text.split(/\s+/).map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);

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
  /** Bumped on every interruption (page turn, word tap, finish) so an
   *  in-flight word-by-word read stops instead of talking over the future.
   *  Taps always win - a reading never blocks the buttons. */
  const seq = useRef(0);

  // The cover announces the title once on open.
  useEffect(() => {
    const t = setTimeout(() => void playClip(titleClipId(book.id)), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readPage = async (i: number) => {
    if (i < 0) return;
    const my = ++seq.current;
    setMood('think');
    // Whole recorded sentence first; else word-by-word in family voices.
    if (!(await playClip(pageClipId(book.id, i)))) {
      for (const w of pageWords(book.pages[i].text)) {
        if (seq.current !== my) return; // something interrupted - stop talking
        await playClip(wordId(w));
        if (seq.current !== my) return;
        await new Promise((r) => setTimeout(r, 160));
      }
    }
    if (seq.current === my) setMood('calm');
  };

  const sayWord = async (w: string) => {
    seq.current++;
    await playClip(wordId(w));
  };

  const next = async () => {
    seq.current++;
    if (page >= book.pages.length - 1) {
      // The end: roar, star the cover, back to the shelf.
      recordBookFinished(book.id);
      setMood('roar');
      await playClip('sfx:roar:1');
      setMood('calm');
      onDone();
      return;
    }
    const n = page + 1;
    setPage(n);
    void readPage(n);
  };

  const cur = page >= 0 ? book.pages[page] : null;

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
          <div className="book__cover">{book.cover}</div>
          <h2 className="title title--sm">{book.title}</h2>
          <Bear mood={mood} size={120} />
        </>
      ) : (
        <>
          {cur?.pic && <div className="book__pic">{cur.pic}</div>}
          {/* Each word is its own button: tap a word to hear just it, tap the
              speaker to hear the page. */}
          <div className="book__text">
            {cur?.text.split(/\s+/).map((w, k) => (
              <button key={k} className="book__word" onClick={() => sayWord(w)}>
                {w}
              </button>
            ))}
          </div>
          <button className="hear-btn" onClick={() => readPage(page)} aria-label="read the page">
            🔊<span className="hear-btn__badge" aria-hidden="true">↻</span>
          </button>
        </>
      )}

      <button className="big-btn" onClick={next}>
        {page < 0 ? 'READ!' : page >= book.pages.length - 1 ? 'THE END!' : 'NEXT →'}
      </button>
    </div>
  );
}
