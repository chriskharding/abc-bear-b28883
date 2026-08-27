// Drag a finger across the word to sound it out. The movement is the lesson:
// left-to-right is the direction of reading, and how long the finger rests on
// a letter is how long that sound is held. Slow drag, stretched sounds. Faster
// drag, and they run together into the word.

import { useEffect, useRef, useState } from 'react';
import { soundFor } from './curriculum';
import { startPhoneme, stopPhoneme, preload, wakeSustain } from './sustain';
import { playClip } from './audioBank';
import { say } from './audio';

export function BlendStrip({
  word, disabled, onComplete,
}: {
  word: string;
  disabled: boolean;
  onComplete: () => void;
}) {
  const letters = word.split('');
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
    preload(letters.map((l) => `phoneme:${l}`));
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

    const sound = soundFor(letters[i]);
    const ok = await startPhoneme(`phoneme:${letters[i]}`, sound.continuant);
    if (!ok) say(sound.say, { rate: 0.6 }); // nothing recorded yet

    // Only forward movement counts, so he can't blend a word backwards.
    if (i === progressRef.current) {
      progressRef.current = i + 1;
      setProgress(i + 1);
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
    } else if (touched.current) {
      // Lifted early, or started somewhere other than the first letter.
      // Reset to the start and nudge - the orange ring shows where to begin.
      touched.current = false;
      progressRef.current = 0;
      setProgress(0);
      void playClip('phrase:try-again').then((ok) => {
        if (!ok) say('Try again.', { rate: 0.85 });
      });
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
            ].join(' ')}
          >
            {l}
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
