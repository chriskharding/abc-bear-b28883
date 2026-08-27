// The roar soundboard - Charlie's treat screen. Every recorded roar (daddy
// bear, his own, mommy bear, guests) is a big button. Rationed: roar plays
// cost tokens, and tokens come from reading. Ten in the bank, refilled by
// finishing a session - so the soundboard is the dessert and reading is how
// you order more.

import { useEffect, useRef, useState } from 'react';
import { Bear, type Mood } from './Bear';
import { playClip, putClip, forget, listRoarIds } from './audioBank';
import { trimSilence } from './trim';
import { say } from './audio';

const FACES = ['🐻', '🧸', '🦁', '🐯', '🐨', '🐼', '🦊', '🐮', '🐷', '🐸'];

export function RoarBoard({
  tokens, onSpend, onBack,
}: {
  tokens: number;
  onSpend: () => void;
  onBack: () => void;
}) {
  const [pool, setPool] = useState<string[]>([]);
  const [mood, setMood] = useState<Mood>('calm');
  const [capturing, setCapturing] = useState(false);
  const playing = useRef(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const empty = tokens <= 0;
  // Mic needs a secure context - true on localhost and https, false on the
  // plain-http LAN address, where the button simply doesn't render.
  const canRecord = !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    void listRoarIds().then(setPool);
    return () => recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  /** A guest roars straight into the game: tap, roar, done - the roar
   *  becomes a button immediately and joins the reading rewards. */
  const captureRoar = async () => {
    if (capturing) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setCapturing(false);
        const trimmed = await trimSilence(new Blob(chunks, { type: rec.mimeType }));
        // Next free guest slot after whatever the pool already knows about.
        const maxN = pool
          .filter((id) => id.startsWith('sfx:roar:extra:'))
          .reduce((m, id) => Math.max(m, Number(id.split(':').pop())), 0);
        const id = `sfx:roar:extra:${maxN + 1}`;
        forget(id);
        await putClip(id, trimmed);
        setPool(await listRoarIds());
        // Play it right back - the payoff of roaring into a phone.
        setMood('roar');
        await playClip(id);
        setMood('calm');
      };
      rec.start();
      recRef.current = rec;
      setCapturing(true);
      // Roars are short; stop on tap or after 4 seconds, whichever first.
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 4000);
    } catch {
      say('The microphone is not working here.', { rate: 0.9 });
    }
  };

  // The out-of-roars message is spoken - he can't read the screen.
  useEffect(() => {
    if (!empty) return;
    const t = setTimeout(
      () => play_earn(),
      400,
    );
    return () => clearTimeout(t);
  }, [empty]);

  const play_earn = async () => {
    if (!(await playClip('phrase:earn-roars'))) {
      say('No more roars! Do some reading to earn more!', { rate: 0.9 });
    }
  };

  const roar = async (id: string) => {
    if (playing.current) return;
    if (empty) {
      void play_earn();
      return;
    }
    playing.current = true;
    onSpend();
    setMood('roar');
    await playClip(id);
    setMood('calm');
    playing.current = false;
  };

  return (
    <div className="screen roars">
      <div className="rec__top">
        {/* Big and wordless - this is the kid's back button */}
        <button className="hear-btn hear-btn--back" onClick={onBack} aria-label="back">
          ⬅️
        </button>
        <div className="roars__tokens" aria-label={`${tokens} roars left`}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`pip ${i < tokens ? 'pip--token' : ''}`} />
          ))}
        </div>
      </div>

      <Bear mood={mood} size={150} />

      <div className={`roars__grid ${empty ? 'roars__grid--empty' : ''}`}>
        {pool.map((id, i) => (
          <button
            key={id}
            className="roar-btn"
            onClick={() => roar(id)}
            aria-label={`play roar ${i + 1}`}
          >
            {FACES[i % FACES.length]}
          </button>
        ))}
      </div>

      {/* Roar INTO the game - free (recording is a gift, playing costs).
          Renders only where the mic can actually work. */}
      {canRecord && (
        <button
          className={`roar-btn roar-btn--mic ${capturing ? 'roar-btn--live' : ''}`}
          onClick={captureRoar}
          aria-label="record a new roar"
        >
          {capturing ? '🔴' : '🎤'}
        </button>
      )}

      {empty && (
        <>
          <p className="prompt">No more roars! Read to earn more!</p>
          <button className="big-btn" onClick={onBack}>READ!</button>
        </>
      )}
    </div>
  );
}
