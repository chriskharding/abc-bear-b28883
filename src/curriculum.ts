// Synthetic phonics, Set 1: s a t p i n
// This order is deliberate - these six letters combine into more real words
// than any other starting set, so a kid is reading "sat" after two sessions
// instead of grinding through the alphabet in A-B-C order first.

export type Sound = {
  letter: string;
  /** Spelled for the speech synthesiser, not for humans. "s" alone gets read
   *  as the letter name "ess"; "ssss" gets read as the sound. */
  say: string;
  /** Anchor word the kid can picture. */
  keyword: string;
  /** Can this sound be held? Continuants (s, m, n, and every vowel) can be
   *  stretched for as long as a finger rests on them, which is what makes
   *  dragging-to-blend work. Stops (t, p, k) are a single burst of air - they
   *  physically cannot be sustained, so they fire once and don't loop. */
  continuant: boolean;
};

export const SET_ONE: Sound[] = [
  { letter: 's', say: 'ssssss', keyword: 'sun', continuant: true },
  { letter: 'a', say: 'aah', keyword: 'apple', continuant: true },
  { letter: 't', say: 'tuh', keyword: 'tap', continuant: false },
  { letter: 'p', say: 'puh', keyword: 'pig', continuant: false },
  { letter: 'i', say: 'ih', keyword: 'igloo', continuant: true },
  { letter: 'n', say: 'nnnnn', keyword: 'nose', continuant: true },
];

/** Set 2 opens up a much bigger word pool. Not used in gameplay until the
 *  audio for it exists - recording it early just means one sitting, not two. */
export const SET_TWO: Sound[] = [
  { letter: 'm', say: 'mmmmm', keyword: 'moon', continuant: true },
  { letter: 'd', say: 'duh', keyword: 'dog', continuant: false },
  { letter: 'g', say: 'guh', keyword: 'goat', continuant: false },
  { letter: 'o', say: 'oh', keyword: 'octopus', continuant: true },
  { letter: 'c', say: 'kuh', keyword: 'cat', continuant: false },
  { letter: 'k', say: 'kuh', keyword: 'kite', continuant: false },
];

export const ALL_SOUNDS = [...SET_ONE, ...SET_TWO];

/** Every word buildable from Set 1. All decodable - nothing here has to be
 *  memorised, he can sound out all of it. */
export const SET_ONE_WORDS = [
  'sat', 'sit', 'sip', 'sap',
  'tap', 'tip', 'tin', 'tan',
  'pat', 'pit', 'pin', 'pan',
  'nap', 'nip',
];

/** Set 1 + Set 2 letters. Curated rather than exhaustive - every one of these
 *  is a real, picturable word a four-year-old already knows the meaning of. */
export const SET_TWO_WORDS = [
  'mad', 'mat', 'map', 'man', 'mom', 'mop',
  'dad', 'dig', 'dip', 'did', 'dot', 'dog',
  'got', 'gap', 'gas', 'tag', 'sag', 'nag',
  'cat', 'cap', 'can', 'cot', 'cop', 'cod',
  'kid', 'kit', 'kin', 'tam',
  'pot', 'pop', 'pod', 'pig',
  'sad', 'sod', 'not', 'nod', 'tot', 'top',
  'am', 'an', 'at', 'in', 'it', 'on',
];

export const soundFor = (letter: string): Sound =>
  SET_ONE.find((s) => s.letter === letter)!;

export type Round =
  | { kind: 'sound'; target: Sound; choices: Sound[] }
  | { kind: 'word'; word: string };

/** Words used in the previous session, so back-to-back sessions (READ MORE
 *  chains especially) don't serve the same words again. */
let lastSessionWords: string[] = [];

/** Build one short session. Deliberately fixed-length - the session ends,
 *  and that is the point. There is no "one more level".
 *
 *  No letter is targeted twice in a session, no word appears twice in a
 *  session, and the previous session's words sit at the back of the deck so
 *  they only return once everything fresher has had a turn. */
export function buildSession(roundCount = 6): Round[] {
  const rounds: Round[] = [];
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  const letterDeck = shuffle(SET_ONE);
  const wordDeck = [
    ...shuffle(SET_ONE_WORDS.filter((w) => !lastSessionWords.includes(w))),
    ...shuffle(lastSessionWords),
  ];

  const usedWords: string[] = [];
  for (let i = 0; i < roundCount; i++) {
    // Alternate, starting with sounds so he warms up before blending.
    if (i % 2 === 0) {
      const target = letterDeck[(i / 2) % letterDeck.length];
      const distractors = shuffle(SET_ONE.filter((s) => s.letter !== target.letter)).slice(0, 2);
      rounds.push({
        kind: 'sound',
        target,
        choices: shuffle([target, ...distractors]),
      });
    } else {
      const word = wordDeck[usedWords.length % wordDeck.length];
      usedWords.push(word);
      rounds.push({ kind: 'word', word });
    }
  }
  lastSessionWords = usedWords;
  return rounds;
}
