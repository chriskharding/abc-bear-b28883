// The alphabet press board: every letter, tap to hear its sound. Free play,
// no tokens - hearing letter sounds IS the lesson, so it's never rationed.
// Tiles go gray if a sound has no recording yet (q, until qu is recorded).

import { useEffect, useRef, useState } from 'react';
import { Bear, type Mood } from './Bear';
import { playClip, hasClip } from './audioBank';

const LETTERS = [
  ...'abcdefghijklmnopqrstuvwxyz'.split(''),
  // The pairs: two letters, one sound.
  'sh', 'ch', 'th', 'ng', 'qu',
];
/** q's sound is recorded as "qu". */
const clipFor = (letter: string) => (letter === 'q' ? 'phoneme:qu' : `phoneme:${letter}`);

export function AbcBoard({ onBack }: { onBack: () => void }) {
  const [ready, setReady] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('calm');
  const playing = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = new Set<string>();
      await Promise.all(LETTERS.map(async (l) => {
        if (await hasClip(clipFor(l))) ok.add(l);
      }));
      if (alive) setReady(ok);
    })();
    return () => { alive = false; };
  }, []);

  const press = async (letter: string) => {
    if (!ready.has(letter) || playing.current) return;
    playing.current = true;
    setActive(letter);
    setMood('think');
    await playClip(clipFor(letter));
    setMood('calm');
    setActive(null);
    playing.current = false;
  };

  return (
    <div className="screen roars">
      <div className="rec__top">
        <button className="hear-btn hear-btn--back" onClick={onBack} aria-label="back">
          ⬅️
        </button>
        <Bear mood={mood} size={80} />
      </div>

      <div className="abc__grid">
        {LETTERS.map((l) => (
          <button
            key={l}
            className={[
              'abc__tile',
              active === l ? 'abc__tile--active' : '',
              ready.has(l) ? '' : 'abc__tile--off',
            ].join(' ')}
            onClick={() => press(l)}
            aria-label={`sound of ${l}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
