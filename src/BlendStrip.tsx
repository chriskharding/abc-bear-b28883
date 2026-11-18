// Drag a finger across the word to sound it out. The movement is the lesson:
// left-to-right is the direction of reading, and how long the finger rests on
// a letter is how long that sound is held. Slow drag, stretched sounds. Faster
// drag, and they run together into the word.

import { useEffect, useRef, useState } from 'react';
import { soundFor, graphemes, phonemeClipFor } from './curriculum';
import { startPhoneme, stopPhoneme, preload, wakeSustain } from './sustain';
import { playClip } from './audioBank';
import { recordWordMiss } from './stats';
import { say } from './audio';

export function BlendStrip({
  word, disabled, onComplete, silent = false, display,
}: {
  word: string;
  disabled: boolean;
  onComplete: () => void;
  /** Sight-word mode: the slide works identically, but no letter sounds play
   *  - tricky words aren't letter-decodable, and sounding "is" as ih-sss
   *  would teach the wrong thing. The whole word speaks on completion. */
  silent?: boolean;
  /** What the tiles SHOW (keeps capitals: "The" renders T-h-e). Audio always
   *  uses the lowercase `word`. */
  display?: string;
}) {
  // Sound-tiles, not characters: "ship" is sh·i·p, "duck" is d·u·ck. The
  // display split mirrors the audio split so capitals survive (Sh·i·p).
  const letters = graphemes(word);
  const dispTiles = (() => {
    const src = display ?? word;
    const out: string[] = [];
    let at = 0;
    for (const g of letters) {
      out.push(src.slice(at, at + g.length) || g);
      at += g.length;
    }
    return out;
  })();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Which letter the finger is on right now.
  const [active, setActive] = useState<number | null>(null);
  // How far left-to-right he has got THIS drag. One clean slide is the skill,
  // so lifting early resets to the start instead of resuming - a resumed
  // half-blend taught nothing, and a wrong first touch looked like a dead app.
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const activeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  /** Did this drag actually land on any letter? Gates the try-again nudge. */
  const touched = useRef(false);

  useEffect(() => {
    preload(letters.map(phonemeClipFor));
    return () => stopPhoneme();
  }, [word]);

  /** Ignores vertical position on purpose - a four-year-old's drag wanders,
   *  and the only thing that should matter is how far across he has got. */
  const letterAt = (clientX: number): number | null => {
    for (let i = 0; i < cellRefs.current.length; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return i;
    }
    return null;
  };

  const enter = async (i: number | null) => {
    if (i === activeRef.current) return;
    activeRef.current = i;
    setActive(i);

    if (i === null) {
      stopPhoneme();
      return;
    }
    touched.current = true;

    // Sound follows the READING, not the finger: only the next-expected
    // letter speaks. A little finger landing mid-word gets quiet and the
    // glowing first tile as the cue - never the middle sound first.
    if (i !== progressRef.current) return;
    // Claim the slot BEFORE any await: during a fast sweep the next letter's
    // enter() fires while this one is still loading audio, and checking a
    // stale progress value made it bail - dead letters mid-word.
    progressRef.current = i + 1;
    setProgress(i + 1);

    if (!silent) {
      const sound = soundFor(letters[i]);
      const ok = await startPhoneme(phonemeClipFor(letters[i]), sound.continuant);
      if (!ok) say(sound.say, { rate: 0.6 }); // nothing recorded yet
    }
  };

  /** The last letter the finger actually touched. A fast finger LEAPS -
   *  the browser samples its position, and between two samples it can clear
   *  a whole letter without ever being "on" it. Sweeping the skipped letters
   *  in order is what keeps a fast swipe sounding out s-i-p, not s-p. */
  const lastIdx = useRef<number | null>(null);

  const sweepTo = (j: number | null) => {
    if (j === null) {
      void enter(null); // finger in a gap: release sound, keep the trail
      return;
    }
    const from = lastIdx.current;
    if (from !== null && Math.abs(j - from) > 1) {
      const step = j > from ? 1 : -1;
      for (let k = from + step; k !== j; k += step) void enter(k);
    }
    lastIdx.current = j;
    void enter(j);
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    wakeSustain();
    // A sight word says itself as the slide begins - shape and sound
    // together, since its letters don't spell its sound.
    if (silent) void playClip(`word:${word}`);
    // Capture keeps the drag alive if his finger strays off the strip. It
    // throws on an already-released pointer, and losing capture is far less
    // bad than losing the whole gesture.
    try {
      stripRef.current?.setPointerCapture(e.pointerId);
    } catch { /* keep going uncaptured */ }
    setDragging(true);
    lastIdx.current = null;
    sweepTo(letterAt(e.clientX));
  };

  const onMove = (e: React.PointerEvent) => {
    if (disabled || !dragging) return;
    sweepTo(letterAt(e.clientX));
  };

  const onUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      stripRef.current?.releasePointerCapture?.(e.pointerId);
    } catch { /* already released */ }
    lastIdx.current = null;
    setDragging(false);
    stopPhoneme();
    activeRef.current = null;
    setActive(null);

    // Made it all the way across - that's the word read.
    if (progressRef.current >= letters.length) {
      onComplete();
    } else if (touched.current && progressRef.current > 0) {
      // A real attempt was abandoned mid-word: reset and nudge. (A fumbled
      // touch that never progressed stays quiet - toddler fingers wander,
      // and scolding a stray tap teaches nothing.)
      touched.current = false;
      progressRef.current = 0;
      setProgress(0);
      recordWordMiss(word); // the report card counts the try-agains too
      void playClip('phrase:try-again').then((ok) => {
        if (!ok) say('Try again.', { rate: 0.85 });
      });
    } else {
      touched.current = false;
    }
  };

  const finished = progress >= letters.length;

  return (
    <div className="blend">
      <div
        className={`blend__strip ${dragging ? 'blend__strip--live' : ''}`}
        ref={stripRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {letters.map((l, i) => (
          <div
            key={i}
            ref={(el) => { cellRefs.current[i] = el; }}
            className={[
              'blend__cell',
              i < progress ? 'blend__cell--done' : '',
              i === active ? 'blend__cell--active' : '',
              i === progress && !dragging ? 'blend__cell--next' : '',
              l.length > 1 ? 'blend__cell--team' : '',
            ].join(' ')}
          >
            {dispTiles[i]}
          </div>
        ))}
      </div>

      {/* A static cue, not a looping animation - nothing here plays by itself. */}
      <div className={`blend__hint ${finished ? 'blend__hint--done' : ''}`}>
        {finished ? '✓' : '→'}
      </div>
    </div>
  );
}
