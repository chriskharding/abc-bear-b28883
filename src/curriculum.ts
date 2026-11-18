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

/** Set 3 and 4: the rest of the single letters, in standard phonics order.
 *  (qu and the digraphs - sh, ch, th, ck, ng - wait for the sound-tile
 *  engine; they're two letters, one sound.) */
export const SET_THREE: Sound[] = [
  { letter: 'e', say: 'eh', keyword: 'egg', continuant: true },
  { letter: 'u', say: 'uh', keyword: 'umbrella', continuant: true },
  { letter: 'r', say: 'rrr', keyword: 'rabbit', continuant: true },
  { letter: 'h', say: 'hh', keyword: 'hat', continuant: false },
  { letter: 'b', say: 'buh', keyword: 'ball', continuant: false },
  { letter: 'f', say: 'fff', keyword: 'fish', continuant: true },
  { letter: 'l', say: 'lll', keyword: 'leg', continuant: true },
];

export const SET_FOUR: Sound[] = [
  { letter: 'j', say: 'juh', keyword: 'jam', continuant: false },
  { letter: 'v', say: 'vvv', keyword: 'van', continuant: true },
  { letter: 'w', say: 'wuh', keyword: 'water', continuant: false },
  { letter: 'x', say: 'ks', keyword: 'box', continuant: false },
  { letter: 'y', say: 'yuh', keyword: 'yes', continuant: false },
  { letter: 'z', say: 'zzz', keyword: 'zebra', continuant: true },
];

export const ALL_SOUNDS = [...SET_ONE, ...SET_TWO, ...SET_THREE, ...SET_FOUR];

/** The letter pairs: two letters, one sound. Recorded; they join the sound
 *  rounds and ABC board as tap-and-hear. (Sliding them inside words needs
 *  the sound-tile engine - still to come.) */
export const DIGRAPH_SOUNDS: Sound[] = [
  { letter: 'sh', say: 'shh', keyword: 'ship', continuant: true },
  { letter: 'ch', say: 'ch', keyword: 'chip', continuant: false },
  { letter: 'th', say: 'th', keyword: 'bath', continuant: true },
  { letter: 'ng', say: 'ng', keyword: 'ring', continuant: true },
  { letter: 'qu', say: 'kw', keyword: 'queen', continuant: false },
];

/** ck is a spelling of the k sound, not a sound of its own - it gets a tile
 *  but never a sound-round card, and its audio is the k clip. */
export const CK_SOUND: Sound = { letter: 'ck', say: 'k', keyword: 'duck', continuant: false };

/** The sounds gameplay may deal. Full alphabet since 2026-11-17 - every
 *  letter has a recording, and the pairs play too. */
export const PLAYABLE_SOUNDS = [...ALL_SOUNDS, ...DIGRAPH_SOUNDS];

/** Split a word into sound-tiles: two-letter teams stay together, so "ship"
 *  is sh·i·p and "duck" is d·u·ck. Greedy left-to-right is correct for every
 *  word in the app's pools. */
const TEAMS = ['sh', 'ch', 'th', 'ng', 'qu', 'ck'];
export function graphemes(word: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    const two = word.slice(i, i + 2).toLowerCase();
    if (TEAMS.includes(two)) {
      out.push(word.slice(i, i + 2));
      i += 2;
    } else {
      out.push(word[i]);
      i += 1;
    }
  }
  return out;
}

/** The words the recorded digraph bank covers - all three sound-tiles each,
 *  so they sit at the same difficulty as the CVC words. */
export const DIGRAPH_WORDS = [
  'ship', 'shop', 'shut', 'shed', 'fish', 'dish', 'wish', 'rush', 'mash', 'cash',
  'chip', 'chat', 'chin', 'chop', 'much', 'such', 'rich',
  'thin', 'thud', 'moth', 'bath', 'path',
  'duck', 'sock', 'kick', 'pack', 'neck', 'rock', 'lick', 'lock', 'sick', 'pick',
  'ring', 'king', 'song', 'long', 'sing', 'wing', 'hang', 'bang',
];

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

/** Words unlocked by Sets 3 and 4 - short-vowel, honestly spelled, all
 *  picturable or known to a four-year-old. These join gameplay when their
 *  letters do. */
export const SET_THREE_WORDS = [
  'red', 'run', 'rub', 'rat', 'rug', 'rip',
  'hen', 'hat', 'hit', 'hug', 'hot', 'hop', 'him', 'hum',
  'bed', 'bat', 'bin', 'bus', 'big', 'bug', 'bun', 'bad', 'bit',
  'fun', 'fit', 'fan', 'fed', 'fig',
  'leg', 'let', 'lap', 'lot', 'lip', 'log', 'lid',
  'egg', 'elf', 'end',
  'up', 'us', 'cup', 'cut', 'mud', 'nut', 'sun', 'gum', 'but',
  'pet', 'pen', 'ten', 'net', 'men', 'get', 'set', 'bet',
];

export const SET_FOUR_WORDS = [
  'jet', 'jam', 'jog', 'jab', 'jig', 'job', 'jug',
  'vet', 'van',
  'wet', 'win', 'web', 'wig', 'wag',
  'box', 'fix', 'mix', 'six', 'fox', 'wax',
  'yes', 'yet', 'yum', 'yak', 'yap',
  'zip', 'zap', 'zig', 'zag',
];

/** The book-building bank: four-letter words using the full alphabet
 *  (Sets 1-4), start-blends and end-blends, all short vowels, all honestly
 *  spelled - no digraphs, no doubled letters, nothing irregular. These are
 *  the nouns and verbs the first decodable books get written from. Join
 *  gameplay when Sets 3-4 do. */
export const BLEND_WORDS_2 = [
  // start blends
  'frog', 'crab', 'drum', 'drip', 'drop', 'drag', 'trip', 'trap',
  'grin', 'grab', 'grip', 'brag', 'plum', 'plan', 'plus', 'clap',
  'clip', 'club', 'clam', 'flag', 'flip', 'flat', 'flop', 'glad',
  'slip', 'slam', 'sled', 'slug', 'slot', 'snug', 'swim', 'twin',
  'stem', 'step', 'spun', 'stun',
  // end blends
  'nest', 'best', 'rest', 'fast', 'last', 'lost', 'list', 'fist',
  'must', 'just', 'dust', 'hand', 'land', 'sand', 'band', 'bend',
  'send', 'mend', 'tent', 'went', 'bent', 'sent', 'hunt', 'mint',
  'soft', 'left', 'gift', 'lift', 'raft', 'desk', 'dusk', 'task',
  'help', 'belt', 'felt', 'melt', 'milk', 'lamp', 'limp', 'jump',
  'bump', 'dump', 'pump', 'lump', 'ramp', 'vest', 'west', 'pest',
  'next',
];

/** Phase 3a: four-letter words from the same 12 letters - consonant blends
 *  (spin, stop) and voiceless plural-s (cats, tops; voiced plurals like
 *  "dogs", where s says /z/, are deliberately left out). Not yet dealt into
 *  sessions - recordings come first, gameplay wiring after. */
export const BLEND_WORDS = [
  'and', 'ant', 'spin', 'snap', 'snip', 'stop', 'spot', 'spit',
  'skip', 'skin', 'scan', 'mist', 'camp', 'damp', 'gasp', 'past',
  'pond', 'pant', 'cats', 'tops', 'caps', 'naps', 'pots', 'maps',
  'mats', 'pits',
];

export const soundFor = (letter: string): Sound =>
  [...ALL_SOUNDS, ...DIGRAPH_SOUNDS, CK_SOUND].find((s) => s.letter === letter.toLowerCase())!;

/** Which recording speaks this tile (ck borrows k's sound). */
export const phonemeClipFor = (tile: string) =>
  `phoneme:${tile.toLowerCase() === 'ck' ? 'k' : tile.toLowerCase()}`;

/** Words gameplay may deal: everything whose letters AND recording exist.
 *  Sets 3-4 words join when their sounds and clips land. */
export const PLAYABLE_WORDS = [
  ...SET_ONE_WORDS, ...SET_TWO_WORDS, ...SET_THREE_WORDS, ...SET_FOUR_WORDS,
  ...DIGRAPH_WORDS,
];

/** Four-letter finale pool: the original blends plus the book bank. */
export const PLAYABLE_BLENDS = [...BLEND_WORDS, ...BLEND_WORDS_2];

export type Round =
  | { kind: 'sound'; target: Sound; choices: Sound[] }
  | { kind: 'word'; word: string }
  | { kind: 'sight'; target: string; choices: string[] };

/** Words used in the previous session, so back-to-back sessions (READ MORE
 *  chains especially) don't serve the same words again. */
let lastSessionWords: string[] = [];

import { TRICKY_WORDS as SIGHT_WORDS } from './books';

/** Build one short session. Deliberately fixed-length - the session ends,
 *  and that is the point. There is no "one more level".
 *
 *  No letter is targeted twice in a session, no word appears twice in a
 *  session, and the previous session's words sit at the back of the deck so
 *  they only return once everything fresher has had a turn. */
export function buildSession(roundCount = 6): Round[] {
  const rounds: Round[] = [];
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  // Deal sounds from every letter with a recording - all 12 today, the rest
  // of the alphabet as soon as those clips land.
  const letterDeck = shuffle(PLAYABLE_SOUNDS);
  const wordDeck = [
    ...shuffle(PLAYABLE_WORDS.filter((w) => !lastSessionWords.includes(w))),
    ...shuffle(lastSessionWords.filter((w) => PLAYABLE_WORDS.includes(w))),
  ];
  const blendDeck = [
    ...shuffle(PLAYABLE_BLENDS.filter((w) => !lastSessionWords.includes(w))),
    ...shuffle(PLAYABLE_BLENDS.filter((w) => lastSessionWords.includes(w))),
  ];

  const usedWords: string[] = [];
  for (let i = 0; i < roundCount; i++) {
    // Alternate, starting with sounds so he warms up before blending. The
    // third "sound" slot becomes a sight-word round - the/is/we picked out
    // whole, same tap-the-right-one shape as the sound game.
    if (i === 4) {
      const deck = shuffle(SIGHT_WORDS);
      rounds.push({ kind: 'sight', target: deck[0], choices: shuffle(deck.slice(0, 3)) });
    } else if (i % 2 === 0) {
      const target = letterDeck[(i / 2) % letterDeck.length];
      const distractors = shuffle(PLAYABLE_SOUNDS.filter((s) => s.letter !== target.letter)).slice(0, 2);
      rounds.push({
        kind: 'sound',
        target,
        choices: shuffle([target, ...distractors]),
      });
    } else {
      // The last word of every session is a four-letter blend - the stretch
      // round, after two three-letter warmups.
      const isFinale = i === roundCount - 1;
      const word = isFinale
        ? blendDeck[0]
        : wordDeck[usedWords.length % wordDeck.length];
      usedWords.push(word);
      rounds.push({ kind: 'word', word });
    }
  }
  lastSessionWords = usedWords;
  return rounds;
}
