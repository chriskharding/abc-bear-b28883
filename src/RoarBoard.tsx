// The roar collection - Charlie's soundboard as a collector's album. Named
// cards for everyone who loves him: filled cards play their roar (costing a
// token), empty cards are gray "?"s that record on the spot when tapped, so
// "go get grandma's roar" is a quest with a visible reward. Guest roars from
// the early days show as bear cards, and the bear's own takes lead the grid.
// Rationed: plays cost tokens, tokens come from reading. Recording is free -
// adding a voice is a gift, not a purchase.

import { useEffect, useRef, useState } from 'react';
import { Bear, type Mood } from './Bear';
import { playClip, putClip, forget, listRoarIds } from './audioBank';
import { ROAR_SLOTS } from './clips';
import { trimSilence } from './trim';

type Card = {
  key: string;
  emoji: string;
  label: string;
  /** Ids to draw from when played; empty card = nothing recorded yet. */
  ids: string[];
  empty: boolean;
};

export function RoarBoard({
  tokens, onSpend, onBack,
}: {
  tokens: number;
  onSpend: () => void;
  onBack: () => void;
}) {
  const [pool, setPool] = useState<string[]>([]);
  const [mood, setMood] = useState<Mood>('calm');
  const [capturingKey, setCapturingKey] = useState<string | null>(null);
  const playing = useRef(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const empty = tokens <= 0;
  // Mic needs a secure context - true on localhost and https.
  const canRecord = !!navigator.mediaDevices?.getUserMedia;

  const refresh = () => listRoarIds().then(setPool);
  useEffect(() => {
    void refresh();
    return () => recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  // Out of tokens: the bear explains the bargain out loud (recorded voice
  // only - if the clip were missing this stays a visual).
  useEffect(() => {
    if (!empty) return;
    const t = setTimeout(() => void playClip('phrase:earn-roars'), 400);
    return () => clearTimeout(t);
  }, [empty]);

  // The bear's own takes lead, then the named collection, then legacy guests.
  const bearIds = ['sfx:roar:1', 'sfx:roar:2', 'sfx:roar:3'].filter((id) => pool.includes(id));
  const cards: Card[] = [
    ...(bearIds.length
      ? [{ key: 'bear', emoji: '🐻', label: 'Bear', ids: bearIds, empty: false }]
      : []),
    ...ROAR_SLOTS.map((s) => ({
      key: s.id,
      emoji: s.emoji,
      label: s.label,
      ids: [s.id],
      empty: !pool.includes(s.id),
    })),
    ...pool
      .filter((id) => id.startsWith('sfx:roar:extra:'))
      .map((id) => ({
        key: id,
        emoji: '🐻',
        label: `Guest ${id.split(':').pop()}`,
        ids: [id],
        empty: false,
      })),
  ];
  const collected = ROAR_SLOTS.filter((s) => pool.includes(s.id)).length;

  const playCard = async (card: Card) => {
    if (playing.current) return;
    if (empty) return; // grid is visually locked; the READ button is the exit
    playing.current = true;
    onSpend();
    setMood('roar');
    const id = card.ids[Math.floor(Math.random() * card.ids.length)];
    await playClip(id);
    setMood('calm');
    playing.current = false;
  };

  /** Tap an empty card: record straight into that slot. Free - a new voice
   *  is a gift for the collection, not a purchase. */
  const captureInto = async (card: Card) => {
    if (capturingKey === card.key) {
      recRef.current?.stop();
      return;
    }
    if (capturingKey) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setCapturingKey(null);
        const trimmed = await trimSilence(new Blob(chunks, { type: rec.mimeType }));
        const id = card.ids[0];
        forget(id);
        await putClip(id, trimmed);
        await refresh();
        // Play it right back - the new card announces itself.
        setMood('roar');
        await playClip(id);
        setMood('calm');
      };
      rec.start();
      recRef.current = rec;
      setCapturingKey(card.key);
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 4000);
    } catch {
      setCapturingKey(null);
    }
  };

  return (
    <div className="screen roars">
      <div className="rec__top">
        {/* Big and wordless - this is the kid's back button */}
        <button className="hear-btn hear-btn--back" onClick={onBack} aria-label="back">
          ⬅️
        </button>
        <div className="roars__meta">
          <span className="roars__collected">{collected}/{ROAR_SLOTS.length} collected</span>
          <div className="roars__tokens" aria-label={`${tokens} roars left`}>
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`pip ${i < tokens ? 'pip--token' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <Bear mood={mood} size={130} />

      <div className={`roars__grid ${empty ? 'roars__grid--empty' : ''}`}>
        {cards.map((card) => (
          <div key={card.key} className="roar-card">
            <button
              className={[
                'roar-btn',
                card.empty ? 'roar-btn--hollow' : '',
                capturingKey === card.key ? 'roar-btn--live' : '',
              ].join(' ')}
              onClick={() => (card.empty ? (canRecord && captureInto(card)) : playCard(card))}
              aria-label={card.empty ? `record ${card.label}` : `play ${card.label}`}
            >
              {capturingKey === card.key ? '🔴' : card.empty ? '?' : card.emoji}
            </button>
            <span className={`roar-card__label ${card.empty ? 'roar-card__label--empty' : ''}`}>
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {empty && (
        <>
          <p className="prompt">No more roars! Read to earn more!</p>
          <button className="big-btn" onClick={onBack}>READ!</button>
        </>
      )}
    </div>
  );
}
