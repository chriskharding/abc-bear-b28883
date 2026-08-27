// Parent-facing progress view, behind the long-press gate with the recorder.
// Deliberately plain: numbers and tables, no gamification - the audience is
// an adult deciding what to practice next.

import { loadStats } from './stats';
import { ALL_SOUNDS } from './curriculum';

export function ParentPage({ onExit, onRecorder }: { onExit: () => void; onRecorder: () => void }) {
  const stats = loadStats();
  const words = Object.entries(stats.words).sort((a, b) => b[1] - a[1]);
  const totalReads = words.reduce((sum, [, n]) => sum + n, 0);

  const letterRows = ALL_SOUNDS.map((s) => {
    const [right, wrong] = stats.letters[s.letter] ?? [0, 0];
    const total = right + wrong;
    return { letter: s.letter, right, wrong, total, pct: total ? Math.round((right / total) * 100) : null };
  });

  return (
    <div className="screen rec rec--lib parent">
      <div className="rec__top">
        <button className="quiet-btn" onClick={onExit}>← back to app</button>
        <button className="quiet-btn" onClick={onRecorder}>recording studio →</button>
      </div>

      <h2 className="rec__label">Progress</h2>
      <p className="rec__direction">
        {stats.sessions} session{stats.sessions === 1 ? '' : 's'} finished
        {stats.lastPlayed ? ` · last played ${new Date(stats.lastPlayed).toLocaleDateString()}` : ''}.
        Stats live on this device only — the phone he plays on keeps the real numbers.
      </p>

      <div className="parent__cards">
        <div className="parent__stat">
          <span className="parent__num">{words.length}</span>
          <span className="parent__cap">different words read</span>
        </div>
        <div className="parent__stat">
          <span className="parent__num">{totalReads}</span>
          <span className="parent__cap">words read in total</span>
        </div>
      </div>

      <p className="lib__group">letters — how often he gets each one right</p>
      <div className="lib parent__table">
        {letterRows.map((r) => (
          <div key={r.letter} className="lib__row">
            <span className="parent__letter">{r.letter}</span>
            <span className="parent__bar">
              {r.total > 0 && (
                <span
                  className="parent__bar-fill"
                  style={{ width: `${r.pct}%` }}
                />
              )}
            </span>
            <span className="parent__pct">
              {r.total === 0 ? 'not tried yet' : `${r.right}✓ ${r.wrong}✗ · ${r.pct}%`}
            </span>
          </div>
        ))}
      </div>

      <p className="lib__group">words he has read</p>
      <div className="lib parent__table">
        {words.length === 0 && <p className="rec__direction">None yet — they'll show up here.</p>}
        {words.map(([w, n]) => (
          <div key={w} className="lib__row">
            <span className="parent__letter">{w}</span>
            <span className="parent__pct">{n}×</span>
          </div>
        ))}
      </div>
    </div>
  );
}
