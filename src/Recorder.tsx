// Parent-facing recording studio. Opens on a library of every clip - what's
// recorded, what's missing - with play and re-record on each row, plus
// unlimited guest-roar slots (mommy bear, grandma bear, friends). The
// card-by-card flow remains for actually recording, reachable per-row or via
// "record all missing".

import { useCallback, useEffect, useRef, useState } from 'react';
import { CLIPS, ESSENTIAL_COUNT, extraRoarClip, type Clip } from './clips';
import {
  putClip, deleteClip, recordedIds, playClip, forget, exportIds, exportAllZip, hasClip, listRoarIds,
} from './audioBank';
import { trimSilence, peakOf } from './trim';

function pickMimeType(): string {
  // Safari only does mp4; Chrome and Firefox prefer webm/opus.
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

type View = 'library' | 'mic' | 'card';

export function Recorder({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<View>('library');
  const [micOn, setMicOn] = useState(false);
  const [index, setIndex] = useState(0);
  /** Ids with audio available anywhere - local recording or shipped file. */
  const [have, setHave] = useState<Set<string>>(new Set());
  /** Ids recorded on this machine (deletable/re-recordable takes). */
  const [done, setDone] = useState<Set<string>>(new Set());
  /** Clips recorded but not yet exported. Persisted, because a page reload
   *  mid-session once wiped this list and looked like lost recordings. */
  const [newIds, setNewIdsRaw] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('abc-bear-new-takes') ?? '[]'));
    } catch { return new Set(); }
  });
  const setNewIds = (fn: (s: Set<string>) => Set<string>) => {
    setNewIdsRaw((s) => {
      const next = fn(s);
      try { localStorage.setItem('abc-bear-new-takes', JSON.stringify([...next])); } catch { /* best effort */ }
      return next;
    });
  };
  /** How many guest-roar slots exist so far. */
  const [extras, setExtras] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [diag, setDiag] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const logLine = (m: string) =>
    setLog((l) => [...l.slice(-11), `${new Date().toLocaleTimeString()}  ${m}`]);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const allClips: Clip[] = [
    ...CLIPS,
    ...Array.from({ length: extras }, (_, k) => extraRoarClip(k + 1)),
  ];
  const clip = allClips[Math.min(index, allClips.length - 1)];
  const hasAudio = (id: string) => done.has(id) || have.has(id);
  const essentialDone = CLIPS.filter((c) => c.essential && hasAudio(c.id)).length;

  // Discover what exists: local takes, shipped files, and guest-roar slots.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = await recordedIds();
      if (!alive) return;
      setDone(new Set(ids));

      const roars = await listRoarIds();
      const extraNs = roars
        .filter((id) => id.startsWith('sfx:roar:extra:'))
        .map((id) => Number(id.split(':').pop()));
      if (alive && extraNs.length) setExtras(Math.max(...extraNs));

      const shipped = new Set<string>();
      await Promise.all(
        [...CLIPS.map((c) => c.id), ...roars].map(async (id) => {
          if (await hasClip(id)) shipped.add(id);
        }),
      );
      if (alive) setHave(shipped);
    })();
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
    };
  }, []);

  /** Row tap in the library: go record that clip (via the mic gate if the
   *  mic isn't on yet). */
  const goRecord = (i: number) => {
    setWarn(null);
    setIndex(i);
    setView(micOn ? 'card' : 'mic');
  };

  const addRoar = () => {
    const n = extras + 1;
    setExtras(n);
    // The new slot is the last clip in allClips once state settles.
    setIndex(CLIPS.length + n - 1);
    setView(micOn ? 'card' : 'mic');
  };

  const openMic = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        `The browser is blocking the mic because this page is on "${window.location.hostname}". ` +
        'Microphones only work on localhost or https. Open http://localhost:5180/?record on this ' +
        'computer instead — recording has to happen here anyway, not on the phone.',
      );
      return;
    }

    setAsking(true);
    logLine('checking permission state…');
    let permState = 'unknown';
    try {
      const p = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permState = p.state; // Safari throws on this; 'unknown' is fine
      logLine(`permission state: ${p.state}`);
      p.onchange = () => logLine(`permission CHANGED to: ${p.state}`);
    } catch {
      logLine('permission query unsupported (Safari) - proceeding blind');
    }
    let inputs = '?';
    try {
      const devs = await Promise.race([
        navigator.mediaDevices.enumerateDevices(),
        new Promise<never[]>((r) => setTimeout(() => r([]), 2500)),
      ]);
      inputs = String(devs.filter((d) => d.kind === 'audioinput').length);
    } catch { /* leave '?' */ }
    setDiag(`permission: ${permState} · inputs: ${inputs}`);
    logLine(`audio inputs visible: ${inputs}`);
    logLine('calling getUserMedia - a prompt should appear NOW');

    const startedAt = Date.now();
    const heartbeat = window.setInterval(
      () => logLine(`…still waiting, no answer from the browser (${Math.round((Date.now() - startedAt) / 1000)}s)`),
      3000,
    );
    const hangTimer = window.setTimeout(() => {
      setError(
        permState === 'prompt'
          ? 'The browser meant to show a permission prompt but never did. Look for a mic icon ' +
            'in the address bar, or try Safari at the same address.'
          : 'The mic request is hanging at the system level. Usual culprit: a Bluetooth mic ' +
            '(AirPods) macOS can\'t wake. System Settings → Sound → Input → choose ' +
            '"MacBook Microphone", disconnect AirPods, then reload.',
      );
    }, 8000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      clearTimeout(hangTimer);
      clearInterval(heartbeat);
      logLine(`GOT THE MIC: ${stream.getAudioTracks()[0]?.label || 'unnamed input'}`);
      setError(null);
      streamRef.current = stream;
      setDiag(`recording from: ${stream.getAudioTracks()[0]?.label || 'microphone'}`);

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
        }
        if (meterRef.current) {
          meterRef.current.style.transform = `scaleX(${Math.min(1, peak * 1.8)})`;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setAsking(false);
      setMicOn(true);
      setView('card');
    } catch (e) {
      clearTimeout(hangTimer);
      clearInterval(heartbeat);
      logLine(`REJECTED: ${(e as DOMException)?.name ?? 'unknown'}`);
      setAsking(false);
      const name = (e as DOMException)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Blocked. Two places to check: (1) the icon at the left of the address bar → ' +
            'Microphone → Allow, and (2) System Settings → Privacy & Security → Microphone → ' +
            'turn on your browser. Then reload this page.'
        : name === 'NotFoundError'
          ? 'No microphone found. Check System Settings → Sound → Input, then reload.'
        : name === 'NotReadableError'
          ? 'Another app is holding the microphone. Quit Zoom, FaceTime, or Voice Memos and reload.'
          : `Could not open the microphone (${name ?? 'unknown error'}). Reload and try again.`,
      );
    }
  };

  const start = () => {
    if (!streamRef.current || busy) return;
    setWarn(null);
    const id = clip.id; // capture now - index may move before onstop fires
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      setBusy(true);
      const raw = new Blob(chunks, { type: rec.mimeType });
      const trimmed = await trimSilence(raw);
      const peak = await peakOf(trimmed);
      if (peak < 0.08) setWarn('That came out very quiet — move closer to the mic and try again.');
      else if (peak > 0.99) setWarn('That clipped — back off the mic a little and try again.');
      forget(id);
      await putClip(id, trimmed);
      setDone((d) => new Set(d).add(id));
      setNewIds((s) => new Set(s).add(id));
      setBusy(false);
      if (autoAdvance && peak >= 0.08 && peak <= 0.99) {
        setIndex((i) => Math.min(allClips.length - 1, i + 1));
      }
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  };

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  }, []);

  const move = useCallback((delta: number) => {
    setWarn(null);
    setIndex((i) => Math.min(allClips.length - 1, Math.max(0, i + delta)));
  }, [allClips.length]);

  const redo = async () => {
    await deleteClip(clip.id);
    forget(clip.id);
    setDone((d) => { const n = new Set(d); n.delete(clip.id); return n; });
    setNewIds((s) => { const n = new Set(s); n.delete(clip.id); return n; });
  };

  const jumpToNextMissing = () => {
    const next = allClips.findIndex((c, i) => i > index && !hasAudio(c.id));
    const first = allClips.findIndex((c) => !hasAudio(c.id));
    const target = next >= 0 ? next : first;
    if (target >= 0) {
      setIndex(target);
      setView(micOn ? 'card' : 'mic');
    }
  };

  // Keyboard drives the card view - a long session should never need the mouse.
  useEffect(() => {
    if (view !== 'card') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); recording ? stop() : start(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { if (recording) stop(); move(1); }
      else if (e.key === 'ArrowLeft') { if (recording) stop(); move(-1); }
      else if (e.key.toLowerCase() === 'p') { void playClip(clip.id); }
      else if (e.key === 'Escape') { if (recording) stop(); setView('library'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exportNew = async () => {
    // A handful downloads as loose files; a big batch goes as one zip,
    // because browsers silently drop long runs of downloads.
    if (newIds.size > 8) await exportAllZip([...newIds]);
    else await exportIds([...newIds]);
    setNewIds(() => new Set());
  };

  /* ---------- library ---------- */

  if (view === 'library') {
    const groups = [...new Set(allClips.map((c) => c.group))];
    return (
      <div className="screen rec rec--lib">
        <div className="rec__top">
          <button className="quiet-btn" onClick={onExit}>← back to app</button>
          <span className="rec__count">
            {essentialDone}/{ESSENTIAL_COUNT} core · {allClips.filter((c) => hasAudio(c.id)).length}/{allClips.length} total
          </span>
        </div>

        <div className="rec__row">
          <button className="rec__btn rec__btn--slim" onClick={jumpToNextMissing}>
            record all missing
          </button>
          <button className="quiet-btn" disabled={newIds.size === 0} onClick={exportNew}>
            export new takes ({newIds.size})
          </button>
          <button className="quiet-btn" onClick={() => exportAllZip()}>
            download everything (.zip)
          </button>
        </div>

        <div className="lib">
          {/* Everything unrecorded, gathered in one place so nothing has to
              be hunted for across sections. */}
          {allClips.some((c) => !hasAudio(c.id)) && (
            <div>
              <p className="lib__group lib__group--todo">
                still needed ({allClips.filter((c) => !hasAudio(c.id)).length})
              </p>
              {allClips.map((c, i) => hasAudio(c.id) ? null : (
                <div key={`todo-${c.id}`} className="lib__row">
                  <span className="lib__dot lib__dot--missing" />
                  <span className="lib__label" title={c.direction}>{c.label}</span>
                  <button className="lib__act" onClick={() => goRecord(i)}>●</button>
                </div>
              ))}
            </div>
          )}
          {groups.map((g) => (
            <div key={g}>
              <p className="lib__group">{g}</p>
              {allClips.map((c, i) => c.group !== g ? null : (
                <div key={c.id} className="lib__row">
                  <span className={`lib__dot ${hasAudio(c.id) ? 'lib__dot--have' : 'lib__dot--missing'}`} />
                  <span className="lib__label" title={c.direction}>{c.label}</span>
                  <button className="lib__act" disabled={!hasAudio(c.id)} onClick={() => playClip(c.id)}>
                    ▶
                  </button>
                  <button className="lib__act" onClick={() => goRecord(i)}>
                    {hasAudio(c.id) ? '↻' : '●'}
                  </button>
                </div>
              ))}
              {g === 'Bear' && (
                <button className="lib__add" onClick={addRoar}>
                  ＋ add a roar (mommy, grandma, a friend…)
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- mic gate ---------- */

  if (view === 'mic') {
    return (
      <div className="screen rec">
        <h2 className="rec__label">Turn on the mic</h2>
        <ul className="rec__tips">
          <li>Quiet room. Laptop's built-in mic, about a foot away.</li>
          <li>Takes are trimmed automatically — pause a beat before speaking.</li>
          <li><b>Space</b> records/stops · <b>→</b> next · <b>P</b> plays back · <b>Esc</b> back to the library.</li>
        </ul>
        {error && <p className="rec__error">{error}</p>}
        <button className="rec__btn" onClick={openMic}>
          {asking ? 'waiting for the mic…' : 'turn on the mic'}
        </button>
        {asking && (
          <p className="rec__warn">
            Still waiting. If no permission prompt appeared, macOS may be holding it —
            check System Settings → Privacy &amp; Security → Microphone, then reload.
          </p>
        )}
        <button className="quiet-btn" onClick={() => setView('library')}>← library</button>
        <p className="rec__diag">
          {location.hostname} · {window.isSecureContext ? 'secure' : 'NOT secure'} ·
          mic api {navigator.mediaDevices ? 'available' : 'MISSING'}
          {diag ? ` · ${diag}` : ''}
        </p>
        {log.length > 0 && <pre className="rec__log">{log.join('\n')}</pre>}
      </div>
    );
  }

  /* ---------- card (recording) ---------- */

  return (
    <div className="screen rec">
      <div className="rec__top">
        <button className="quiet-btn" onClick={() => { if (recording) stop(); setView('library'); }}>
          ← library
        </button>
        <span className="rec__count">
          <b>{allClips.filter((c) => !hasAudio(c.id)).length} left</b> · {newIds.size} recorded this sitting
        </span>
      </div>

      <p className="rec__group">
        {clip.group}
        {!clip.essential && <span className="rec__bonus">bonus</span>}
      </p>
      <h2 className="rec__label">{clip.label}</h2>
      <p className="rec__direction">{clip.direction}</p>

      <div className="rec__meter" aria-hidden="true">
        <div className="rec__meter-fill" ref={meterRef} />
      </div>

      {warn && <p className="rec__warn">{warn}</p>}
      {error && <p className="rec__error">{error}</p>}

      <button
        className={`rec__btn ${recording ? 'rec__btn--live' : ''}`}
        onClick={recording ? stop : start}
        disabled={busy}
      >
        {busy ? 'trimming…' : recording ? '■ stop  (space)' : hasAudio(clip.id) ? '● record again' : '● record  (space)'}
      </button>

      {/* The roar-party flow: like the take, hand the mic to the next person,
          press this. A take is saved the moment recording stops - exporting
          happens ONCE at the end, never per roar. */}
      {clip.id.startsWith('sfx:roar:extra:') && hasAudio(clip.id) && !recording && (
        <button className="rec__btn rec__btn--slim rec__btn--good" onClick={addRoar}>
          ✓ good! add another roar
        </button>
      )}

      <div className="rec__row">
        <button className="replay" disabled={!hasAudio(clip.id)} onClick={() => playClip(clip.id)}>
          ▶ play
        </button>
        <button className="replay" disabled={!done.has(clip.id)} onClick={redo}>✕ delete take</button>
      </div>

      <div className="rec__row">
        <button className="replay" onClick={() => move(-1)} disabled={index === 0}>← prev</button>
        <span className="rec__pos">{index + 1} of {allClips.length}</span>
        <button className="replay" onClick={() => move(1)} disabled={index === allClips.length - 1}>
          next →
        </button>
      </div>

      <label className="rec__toggle">
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(e) => setAutoAdvance(e.target.checked)}
        />
        move on automatically after a good take
      </label>

      <div className="rec__row">
        <button className="quiet-btn" onClick={jumpToNextMissing}>skip to next missing</button>
        <button className="quiet-btn" disabled={newIds.size === 0} onClick={exportNew}>
          export new takes ({newIds.size})
        </button>
      </div>
    </div>
  );
}
