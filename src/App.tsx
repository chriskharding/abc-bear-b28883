import { useState, useCallback, useEffect, useRef } from 'react';
import { Bear, type Mood } from './Bear';
import { buildSession, soundFor, type Round } from './curriculum';
import { roar, grumble, say, wakeAudio } from './audio';
import { playClip, stopAll, clipDuration, unlockPlayer, listRoarIds } from './audioBank';
import { OFFER_IDS } from './clips';
import { recordLetterAnswer, recordSession, recordWordRead } from './stats';
import { BlendStrip } from './BlendStrip';
import { Recorder } from './Recorder';
import { RoarBoard } from './RoarBoard';
import { ParentPage } from './ParentPage';

type Phase = 'start' | 'play' | 'done' | 'record' | 'roars' | 'parent';

const TOKEN_KEY = 'abc-bear-roar-tokens';
const MAX_TOKENS = 10;

const loadTokens = (): number => {
  const raw = Number(localStorage.getItem(TOKEN_KEY));
  return Number.isFinite(raw) && raw >= 0 ? Math.min(raw, MAX_TOKENS) : MAX_TOKENS;
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recorded clip if there is one, robot voice if there isn't. Every sound in
 *  the app goes through here, so the bank can be filled in a bit at a time. */
async function play(id: string, fallback: () => void, fallbackMs = 700) {
  if (await playClip(id)) return;
  fallback();
  await wait(fallbackMs);
}

/** Pick a roar. The kid's own roar wins half of all draws - being your own
 *  reward beats any bear - and everyone else (dad's takes, mommy bear,
 *  guests) splits the rest so nothing turns into wallpaper. Falls through
 *  the list until something plays. */
async function playRoar() {
  const kid = 'sfx:roar:kid';
  const pool = await listRoarIds();
  const others = pool.filter((id) => id !== kid).sort(() => Math.random() - 0.5);
  const order = pool.includes(kid) && Math.random() < 0.5
    ? [kid, ...others]
    : [...others, kid];
  for (const id of order) {
    if (await playClip(id)) return;
  }
  roar();
  await wait(1400);
}

export default function App() {
  // Adult doors: long-press the title on device, or /?record and /?parent
  // by URL on the laptop.
  const [phase, setPhase] = useState<Phase>(() =>
    window.location.search.includes('record') ? 'record'
    : window.location.search.includes('parent') ? 'parent'
    : 'start',
  );
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<Mood>('calm');
  const [locked, setLocked] = useState(false);
  /** The 3-2-1 of the start ritual; null when not counting. */
  const [count, setCount] = useState<number | null>(null);
  /** Soundboard currency: roar plays cost one, finishing a session refills. */
  const [tokens, setTokens] = useState(loadTokens);
  const setTokensPersist = (n: number) => {
    const clamped = Math.max(0, Math.min(MAX_TOKENS, n));
    setTokens(clamped);
    localStorage.setItem(TOKEN_KEY, String(clamped));
  };

  const round = rounds[index];

  /** One roar, then move on. Everything good that happens goes through here.
   *  Waits for the roar to actually finish so a long recording isn't cut off. */
  const celebrate = useCallback(async (next: () => void) => {
    setLocked(true);
    setMood('roar');
    await Promise.all([
      playRoar(),
      wait(1400), // the roar animation, so he never advances mid-pounce
    ]);
    setMood('calm');
    setLocked(false);
    next();
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= rounds.length) setPhase('done');
      return next;
    });
  }, [rounds.length]);

  /** The start ritual, Chris's design - and it ALWAYS opens with the roar.
   *  Tap, count down 3-2-1, everyone screams I CAN READ and roars together,
   *  then the bear explains what his roar means, then straight into rounds. */
  const begin = async () => {
    if (locked) return;
    // Both unlocks must happen inside the tap itself, or iOS stays silent:
    // one for the synth fallbacks, one for the recorded-clip player.
    wakeAudio();
    unlockPlayer();
    setLocked(true);
    setRounds(buildSession());
    setIndex(0);

    // Land the numbers on the recorded "3… 2… 1…" wherever the parent put it:
    // assume the count is the last ~3 seconds of however they paced the take.
    const dur = (await clipDuration('phrase:countdown')) ?? 3.8;
    [3, 2, 1].forEach((n, i) =>
      setTimeout(() => setCount(n), Math.max(0, (dur - 3 + i) * 1000)),
    );
    await play(
      'phrase:countdown',
      () => say('Scream I can read, and roar with me! 3... 2... 1...', { rate: 0.9 }),
      3800,
    );
    setCount(null);

    setMood('roar');
    await play('phrase:i-can-read', () => say('I can read!', { rate: 0.8, pitch: 1.1 }), 1100);
    await playRoar();

    // Right after his first roar of the day: what the roar means. The kid
    // just heard one, so "it means great job" lands on a fresh example.
    await play(
      'phrase:roar-means-happy',
      () => say("When I'm happy, I roar! If you hear me roar, it means great job!", { rate: 0.9 }),
      3400,
    );
    setMood('calm');
    setLocked(false);
    setPhase('play');
  };

  if (phase === 'record') {
    return (
      <div className="app">
        <Recorder onExit={() => { stopAll(); setPhase('start'); }} />
      </div>
    );
  }

  return (
    <div className="app">
      {phase === 'play' && (
        <div className="progress" aria-label="progress">
          {rounds.map((_, i) => (
            <span key={i} className={`pip ${i < index ? 'pip--done' : ''}`} />
          ))}
        </div>
      )}

      {phase === 'start' && (
        <StartScreen
          mood={mood}
          onStart={begin}
          onSecret={() => setPhase('parent')}
          onRoars={() => {
            // Also a first tap sometimes - unlock here too or iOS stays mute.
            wakeAudio();
            unlockPlayer();
            setPhase('roars');
          }}
        />
      )}

      {phase === 'parent' && (
        <ParentPage onExit={() => setPhase('start')} onRecorder={() => setPhase('record')} />
      )}

      {phase === 'roars' && (
        <RoarBoard
          tokens={tokens}
          onSpend={() => setTokensPersist(tokens - 1)}
          onBack={() => setPhase('start')}
        />
      )}


      {/* key re-triggers the pop for each number */}
      {count !== null && <div className="countdown" key={count}>{count}</div>}

      {phase === 'play' && round?.kind === 'sound' && (
        <SoundRound
          key={index}
          round={round}
          mood={mood}
          locked={locked}
          onRight={() => celebrate(advance)}
        />
      )}

      {phase === 'play' && round?.kind === 'word' && (
        <WordRound
          key={index}
          word={round.word}
          mood={mood}
          locked={locked}
          setMood={setMood}
          onRead={() => celebrate(advance)}
        />
      )}

      {phase === 'done' && (
        <DoneScreen
          onComplete={() => {
            setTokensPersist(MAX_TOKENS);
            recordSession();
          }}
          onMore={() => {
            setRounds(buildSession());
            setIndex(0);
            setPhase('play');
          }}
          words={rounds.filter((r) => r.kind === 'word').length}
          onAgain={() => setPhase('start')}
        />
      )}
    </div>
  );
}

/** Long-press the title to reach the recorder. Deliberately undiscoverable
 *  by a four-year-old, and no visible button for him to hammer. */
function useLongPress(onLongPress: () => void, ms = 900) {
  const timer = useRef<number | null>(null);
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: () => {
      cancel();
      timer.current = window.setTimeout(onLongPress, ms);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
}

function StartScreen({
  mood, onStart, onSecret, onRoars,
}: { mood: Mood; onStart: () => void; onSecret: () => void; onRoars: () => void }) {
  const press = useLongPress(onSecret);
  return (
    <div className="screen screen--start">
      <h1 className="title" {...press}>ABC BEAR</h1>
      <Bear mood={mood} size={260} />
      <button className="big-btn" onClick={onStart}>I CAN READ!</button>
      {/* The soundboard door: kid-findable but clearly second billing */}
      <button className="roars-door" onClick={onRoars} aria-label="roar soundboard">
        🐻🔊
      </button>
      <p className="buildtag">{__BUILD__}</p>
    </div>
  );
}

function SoundRound({
  round, mood, locked, onRight,
}: {
  round: Extract<Round, { kind: 'sound' }>;
  mood: Mood;
  locked: boolean;
  onRight: () => void;
}) {
  const [wrong, setWrong] = useState<string | null>(null);
  const misses = useRef(0);
  const letter = round.target.letter;

  /** Just the sound - what the big speaker button repeats on demand. */
  const playPrompt = useCallback(() => {
    play(`phoneme:${letter}`, () => say(soundFor(letter).say, { rate: 0.6 }));
  }, [letter]);

  // He can't read, so the round explains itself out loud: the spoken
  // instruction first, then the sound to find. Skipped if he's already
  // answered before it fires - a fast tap otherwise had the intro barging in
  // over the celebration.
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (lockedRef.current) return;
      await play('phrase:which-one', () => say('Touch the one that says...', { rate: 0.85 }), 1200);
      if (!cancelled && !lockedRef.current) playPrompt();
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [playPrompt]);

  const choose = (l: string) => {
    if (locked) return;
    recordLetterAnswer(letter, l === letter);
    if (l === letter) {
      onRight();
    } else {
      setWrong(l);
      misses.current += 1;
      // First miss is just a soft "hmm?". Only nudge with words if he's stuck,
      // so the guidance doesn't turn into nagging.
      void (async () => {
        await play('sfx:grumble', grumble, 500);
        if (misses.current >= 2) {
          await play('phrase:try-again', () => say('Try again.', { rate: 0.85 }), 800);
          playPrompt();
        }
      })();
      setTimeout(() => setWrong(null), 500);
    }
  };

  return (
    <div className="screen">
      <Bear mood={mood} size={170} />
      {/* Big and wordless - the one control a non-reader needs is "hear it
          again", so it gets kid-finger size and no label to decode. */}
      <button className="hear-btn" onClick={playPrompt} aria-label="hear the sound again">
        🔊
        <span className="hear-btn__badge" aria-hidden="true">↻</span>
      </button>
      <p className="prompt">Touch the one that says that sound.</p>
      <div className="cards">
        {round.choices.map((c) => (
          <button
            key={c.letter}
            className={`card ${wrong === c.letter ? 'card--wrong' : ''}`}
            onClick={() => choose(c.letter)}
          >
            {c.letter}
          </button>
        ))}
      </div>
    </div>
  );
}

function WordRound({
  word, mood, locked, setMood, onRead,
}: {
  word: string;
  mood: Mood;
  locked: boolean;
  setMood: (m: Mood) => void;
  onRead: () => void;
}) {
  const [reading, setReading] = useState(false);

  // Spoken instruction here too - the text below is for the parent.
  useEffect(() => {
    const t = setTimeout(
      () => play('phrase:slide', () => say('Slide your finger across and read it.', { rate: 0.85 }), 1400),
      400,
    );
    return () => clearTimeout(t);
  }, []);

  /** He got all the way across. Say the word back whole - hearing the sounds
   *  he just stretched snap together is the moment the blend lands. */
  const finish = async () => {
    if (locked || reading) return;
    setReading(true);
    setMood('think');
    recordWordRead(word);
    await wait(220);
    await play(`word:${word}`, () => say(word, { rate: 0.75 }), 900);
    setReading(false);
    onRead();
  };

  return (
    <div className="screen">
      <Bear mood={mood} size={150} />
      <p className="prompt">Slide your finger across.</p>
      <BlendStrip word={word} disabled={locked || reading} onComplete={finish} />
    </div>
  );
}

/** Speak a sentence stitched from recorded fragments ("5 minus 2 is 3!").
 *  Each part falls back to the robot voice individually, so a half-recorded
 *  set of atoms still produces a complete sentence. */
async function speakParts(parts: { id: string; fb: string }[]) {
  for (const p of parts) {
    await play(p.id, () => say(p.fb, { rate: 0.85 }), 900);
    await wait(90);
  }
}

const num = (n: number) => ({ id: `count:${n}`, fb: String(n) });
const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pickOne = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type EndGame =
  | { kind: 'count'; total: number }
  | { kind: 'takeaway'; start: number; remove: number }
  | { kind: 'addition'; a: number; b: number };

function rollEndGame(): EndGame {
  const kind = pickOne(['count', 'takeaway', 'addition'] as const);
  if (kind === 'count') return { kind, total: rand(3, 15) };
  if (kind === 'takeaway') {
    const start = rand(3, 7);
    return { kind, start, remove: rand(1, start - 1) };
  }
  return { kind, a: rand(2, 5), b: rand(1, 4) };
}

/** Three digit choices: the answer plus two near-misses. */
function digitChoices(answer: number): number[] {
  const opts = new Set<number>([answer]);
  while (opts.size < 3) {
    const d = answer + rand(-3, 3);
    if (d >= 1 && d <= 15) opts.add(d);
  }
  return [...opts].sort(() => Math.random() - 0.5);
}

/** The session still hard-stops into the feeding scene - the bear never says
 *  goodbye or goodnight (Charlie's rules). The scene is one of three little
 *  number games: count the berries, take-away, or addition. Caretaking plus
 *  arithmetic, no parting. */
function DoneScreen({
  words, onAgain, onMore, onComplete,
}: { words: number; onAgain: () => void; onMore: () => void; onComplete: () => void }) {
  const [game] = useState<EndGame>(rollEndGame);
  const totalBerries =
    game.kind === 'count' ? game.total
    : game.kind === 'takeaway' ? game.start
    : game.a + game.b;
  const answer =
    game.kind === 'count' ? game.total
    : game.kind === 'takeaway' ? game.start - game.remove
    : game.a + game.b;

  const [bearMood, setBearMood] = useState<Mood>('sleep');
  const [stage, setStage] = useState<'offer' | 'eating' | 'quiz' | 'full' | 'again'>('offer');
  const [eaten, setEaten] = useState<boolean[]>(() => Array(totalBerries).fill(false));
  const [flash, setFlash] = useState<number | null>(null);
  const [choices, setChoices] = useState<number[]>([]);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const chewing = useRef(false);
  const misses = useRef(0);

  /** A random tired voice - Charlie wanted the ending to change it up. */
  const offerSpeech = async () => {
    for (const id of [...OFFER_IDS].sort(() => Math.random() - 0.5)) {
      if (await playClip(id)) return;
    }
    say("You did a great job! I'm so tired. Should I have some blueberries to wake up?", { rate: 0.85 });
    await wait(4200);
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      await offerSpeech();
      if (game.kind === 'takeaway') {
        await speakParts([
          { id: 'math:i-have', fb: 'I have' }, num(game.start),
          { id: 'math:blueberries', fb: 'blueberries' },
          { id: 'math:take-away', fb: 'take away' }, num(game.remove),
        ]);
        setStage('eating');
      } else if (game.kind === 'addition') {
        await speakParts([
          num(game.a), { id: 'math:plus', fb: 'plus' }, num(game.b),
          { id: 'math:blueberries', fb: 'blueberries' },
          { id: 'math:how-many', fb: 'is how many?' },
        ]);
        setChoices(digitChoices(answer));
        setStage('quiz');
      } else {
        setStage('eating');
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Count game: eat ALL berries. Take-away: pop exactly `remove` of them. */
  const eat = async (i: number) => {
    if (stage !== 'eating' || eaten[i] || chewing.current) return;
    chewing.current = true;
    const n = eaten.filter(Boolean).length + 1;
    setEaten((e) => e.map((v, j) => (j === i ? true : v)));
    setFlash(n);
    setTimeout(() => setFlash(null), 700);
    await play(`count:${n}`, () => say(String(n), { rate: 0.9, pitch: 1.1 }), 700);
    chewing.current = false;

    if (game.kind === 'count' && n === totalBerries) {
      await play('math:how-many', () => say('How many blueberries did we get?', { rate: 0.85 }), 1800);
      setChoices(digitChoices(answer));
      setStage('quiz');
    } else if (game.kind === 'addition' && n === totalBerries) {
      // All popped and counted - the equation gets said back whole.
      setStage('full');
      await speakParts([
        num(game.a), { id: 'math:plus', fb: 'plus' }, num(game.b),
        { id: 'math:is', fb: 'is' }, num(answer),
      ]);
      await finishUp();
    } else if (game.kind === 'takeaway' && n === game.remove) {
      setStage('full');
      await speakParts([
        num(game.start), { id: 'math:minus', fb: 'minus' }, num(game.remove),
        { id: 'math:is', fb: 'is' }, num(answer),
      ]);
      await finishUp();
    }
  };

  /** Right answer → number, roar, feel-better. Wrong → try again; two misses
   *  earn a recount hint - the bear counts the berries back out loud. */
  const pickDigit = async (d: number) => {
    if (stage !== 'quiz' || chewing.current) return;
    if (d === answer) {
      chewing.current = true;
      await play(`count:${answer}`, () => say(String(answer), { rate: 0.9 }), 800);
      if (game.kind === 'addition') {
        // Chris's design: the right answer earns the eating. Pop and count
        // every berry, then the equation gets said back whole.
        await play(
          'phrase:eat-them',
          () => say('Great job! Now touch them to eat them!', { rate: 0.9 }),
          2200,
        );
        chewing.current = false;
        setStage('eating');
      } else {
        setStage('full');
        chewing.current = false;
        await finishUp();
      }
      return;
    }
    setWrongPick(d);
    misses.current += 1;
    chewing.current = true;
    await play('sfx:grumble', grumble, 500);
    await play('phrase:try-again', () => say('Try again.', { rate: 0.85 }), 800);
    if (misses.current >= 2) {
      // The hint re-teaches: count the whole set together, then re-ask.
      for (let k = 1; k <= answer; k++) {
        await play(`count:${k}`, () => say(String(k), { rate: 0.9 }), 650);
        await wait(120);
      }
      await play('math:how-many', () => say('How many blueberries did we get?', { rate: 0.85 }), 1800);
    }
    chewing.current = false;
    setWrongPick(null);
  };

  const finishUp = async () => {
    onComplete(); // session finished: roar tokens refill, stats tick
    setBearMood('roar');
    await playRoar();
    await play(
      'phrase:feel-better',
      () => say('Great job! I feel much better now!', { rate: 0.9 }),
      2200,
    );
    setBearMood('calm');
    // Fed bear = energy for more reading. The gate to another session is
    // the feeding ritual itself, not a lock.
    await play(
      'phrase:more',
      () => say("I have so much energy now! Let's read more!", { rate: 0.9 }),
      2200,
    );
    setStage('again');
  };

  const promptText =
    stage === 'offer' ? 'The bear is sooo tired…'
    : stage === 'eating' ? (
        game.kind === 'takeaway' ? `Pop ${game.remove} blueberr${game.remove === 1 ? 'y' : 'ies'}!`
        : game.kind === 'addition' ? 'Touch them to eat them! Count!'
        : 'Feed him! Count the blueberries!')
    : stage === 'quiz' ? 'How many did we get?'
    : stage === 'full' ? 'All better! What a good helper.'
    : 'The blueberries worked!';

  const berryBtn = (i: number, isEaten: boolean) => (
    <button
      key={i}
      className={`berry ${isEaten ? 'berry--eaten' : ''}`}
      onClick={() => eat(i)}
      aria-label="blueberry"
    >
      🫐
    </button>
  );

  return (
    <div className="screen screen--done">
      <div className="stars">⭐️⭐️⭐️</div>
      <Bear mood={bearMood} size={180} />
      {/* Once the game starts, the headline IS the math problem - the words-
          read tally only fronts the scene before the bear speaks. The
          equation completes itself when he solves it. */}
      <h2 className="title title--sm">
        {stage !== 'offer' && game.kind === 'takeaway'
          ? `${game.start} − ${game.remove}${stage === 'full' || stage === 'again' ? ` = ${answer}` : ''}`
        : stage !== 'offer' && game.kind === 'addition'
          // '?' only while unsolved; once he answers, the equation stands
          // complete through the eating and the celebration.
          ? `${game.a} + ${game.b} = ${stage === 'quiz' ? '?' : answer}`
          : `You read ${words} ${words === 1 ? 'word' : 'words'}!`}
      </h2>
      <p className="prompt">{promptText}</p>

      {/* Berries are on screen from the first word of the scene - he should
          be LOOKING at 4 blueberries while hearing "I have 4 blueberries".
          Taps only count once the eating stage opens. Take-away keeps the
          leftovers visible through the equation. Addition draws the actual
          problem: a group, a plus sign, a group. */}
      {(stage === 'offer' || stage === 'eating' || stage === 'quiz'
        || (stage === 'full' && game.kind === 'takeaway')) && (
        game.kind === 'addition' ? (
          <div className="berries berries--sum">
            <div className="berries__group">
              {eaten.slice(0, game.a).map((isEaten, i) => berryBtn(i, isEaten))}
            </div>
            <span className="berries__op" aria-hidden="true">+</span>
            <div className="berries__group">
              {eaten.slice(game.a).map((isEaten, k) => berryBtn(game.a + k, isEaten))}
            </div>
          </div>
        ) : (
          <div className="berries berries--wrap">
            {/* During "how many did we get?" the eaten berries come back on
                screen - he answers by counting what he sees, not from memory. */}
            {eaten.map((isEaten, i) => berryBtn(i, isEaten && stage !== 'quiz'))}
          </div>
        )
      )}

      {stage === 'quiz' && (
        <div className="cards">
          {choices.map((d) => (
            <button
              key={d}
              className={`card ${wrongPick === d ? 'card--wrong' : ''}`}
              onClick={() => pickDigit(d)}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {flash !== null && <div className="countdown" key={flash}>{flash}</div>}

      {stage === 'again' && (
        <button className="big-btn" onClick={onMore}>READ MORE!</button>
      )}

      {/* Small and dull on purpose - restarting from the very top, with the
          full ritual, is the parent's button, not the draw. */}
      <button className="quiet-btn" onClick={onAgain}>start over</button>
    </div>
  );
}
