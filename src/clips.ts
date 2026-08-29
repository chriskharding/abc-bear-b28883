// Every sound the app needs, in one list. The recorder walks this list and the
// player looks clips up by id, so adding an entry here appears in both.
//
// Order matters: everything the app needs to work today comes first, and Set 2
// trails at the end as a bonus. A recording session can stop at any point and
// what's already done is immediately live.

import { SET_ONE, SET_TWO, SET_ONE_WORDS, SET_TWO_WORDS } from './curriculum';

export type Clip = {
  id: string;
  /** What appears on screen while recording. */
  label: string;
  /** How to say it - written for a human, not a speech engine. */
  direction: string;
  group: string;
  /** False for Set 2, which the app doesn't use yet. */
  essential: boolean;
};

/** Several takes so a kid hearing it twenty times a day doesn't learn it by
 *  heart. The app picks one at random - including the kid's own roar, once
 *  it's recorded. Beyond these, any number of guest roars can exist as
 *  sfx:roar:extra:N - mommy bear, grandma bear, friends - and the player
 *  discovers them at runtime (see listRoarIds in audioBank). */
export const ROAR_IDS = ['sfx:roar:1', 'sfx:roar:2', 'sfx:roar:3', 'sfx:roar:kid'];

/** The roar collection - named slots that make the soundboard a collector's
 *  album. Filled slots are buttons; empty ones are gray "?" cards begging to
 *  be collected. Recording into one happens in the parent studio, or right
 *  on the board by tapping the empty card. */
export const ROAR_SLOTS = [
  { id: 'sfx:roar:kid', label: 'My Roar', emoji: '🦁' },
  { id: 'sfx:roar:who:mommy', label: 'Mommy Bear', emoji: '👩' },
  { id: 'sfx:roar:who:daddy', label: 'Daddy Bear', emoji: '👨' },
  { id: 'sfx:roar:who:baby', label: 'Baby Bear', emoji: '👶' },
  { id: 'sfx:roar:who:grandma', label: 'Grandma Bear', emoji: '👵' },
  { id: 'sfx:roar:who:grandpa', label: 'Pops Bear', emoji: '👴' },
  { id: 'sfx:roar:who:unclecharlie', label: 'Uncle Charlie Bear', emoji: '🧔' },
  { id: 'sfx:roar:who:unclealex', label: 'Uncle Alex Bear', emoji: '👨‍🦱' },
  { id: 'sfx:roar:who:aupair', label: 'Au Pair Bear', emoji: '🧑‍🍼' },
  { id: 'sfx:roar:who:friend1', label: 'Friend Bear', emoji: '🧒' },
  { id: 'sfx:roar:who:friend2', label: 'Friend Bear 2', emoji: '🧑' },
  { id: 'sfx:roar:who:pet', label: 'Pet Bear', emoji: '🐶' },
];

/** A guest-roar slot. These are created on demand in the recorder - there is
 *  no fixed count, that's the point. */
/** The tired-bear openings; the ending draws one at random. */
export const OFFER_IDS = ['phrase:blueberries-offer', 'phrase:blueberries-offer:2'];

/** Every take-away the game can roll (start 3-10, remove any smaller). */
export const TAKEAWAY_COMBOS: [number, number][] = [];
for (let s = 3; s <= 10; s++) for (let m = 1; m < s; m++) TAKEAWAY_COMBOS.push([s, m]);

/** Every addition the game can roll (sums up to 10). */
export const ADDITION_COMBOS: [number, number][] = [];
for (let a = 1; a <= 9; a++) for (let b = 1; b <= 10 - a; b++) ADDITION_COMBOS.push([a, b]);

export const extraRoarClip = (n: number): Clip => ({
  id: `sfx:roar:extra:${n}`,
  label: `ROAR — guest #${n}`,
  direction: 'Anyone who loves him: mommy bear, grandma bear, a friend. Every roar joins the rotation.',
  group: 'Bear',
  essential: false,
});

const soundClip = (s: typeof SET_ONE[number], essential: boolean): Clip => ({
  id: `phoneme:${s.letter}`,
  label: s.letter,
  direction: s.continuant
    // Held sounds get looped while his finger rests on the letter, so they
    // need a long, steady take with no wobble - the middle is what repeats.
    ? `The sound in "${s.keyword}". HOLD IT for a full second, steady and even — this one stretches while he drags.`
    // The schwa is the classic mistake: "tuh" instead of "t" gives you
    // "tuh-a-puh", which never blends into "tap".
    : `The sound in "${s.keyword}". One short burst — no "uh" on the end. This one can't be stretched.`,
  group: essential ? 'Sounds — Set 1' : 'Sounds — Set 2',
  essential,
});

const wordClip = (w: string, essential: boolean): Clip => ({
  id: `word:${w}`,
  label: w,
  direction: 'The whole word, normal speed, warm. Say it the way you would to him.',
  group: essential ? 'Words — Set 1' : 'Words — Set 2',
  essential,
});

export const CLIPS: Clip[] = [
  // --- Bear first. It's the fun part, and it gets levels set. ---
  {
    id: 'sfx:roar:1',
    label: 'ROAR  (take 1)',
    direction: 'A big happy roar. Not scary. This is the reward — go bigger than feels natural.',
    group: 'Bear',
    essential: true,
  },
  {
    id: 'sfx:roar:2',
    label: 'ROAR  (take 2)',
    direction: 'Different from the first — shorter and punchier, or a growly rumble.',
    group: 'Bear',
    essential: true,
  },
  {
    id: 'sfx:roar:3',
    label: 'ROAR  (take 3)',
    direction: 'One more, silliest of the three. Let your son do this one if he wants.',
    group: 'Bear',
    essential: true,
  },
  {
    id: 'sfx:roar:kid',
    label: 'ROAR  (the kid\'s own!)',
    direction: 'Hand over the mic. Their roar joins the bear\'s rotation, so sometimes the reward is themselves.',
    group: 'Bear',
    essential: false,
  },
  {
    id: 'sfx:grumble',
    label: 'hmmm?',
    direction: 'A short, gentle "hmm?" — curious, never disappointed. This plays on a wrong answer.',
    group: 'Bear',
    essential: true,
  },

  // --- Set 1 sounds: the core of the whole app ---
  ...SET_ONE.map((s) => soundClip(s, true)),

  // --- Spoken prompts ---
  // Teaches what the roar MEANS before the first one lands: the bear roars
  // because he's happy - it's praise, never scary.
  {
    id: 'phrase:roar-means-happy',
    label: 'When I\'m happy, I ROAR! If you hear me roar, it means GREAT JOB!',
    direction: 'Playful and warm. This tells him the roar is praise — land hard on GREAT JOB.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:countdown',
    label: 'Scream I CAN READ and roar with me! 3… 2… 1…',
    direction: 'Big build-up energy, then leave a full beat between each number — the screen counts down with you.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:i-can-read',
    label: 'I can read!',
    direction: 'Proud and excited — this is the scream-along right after the countdown.',
    group: 'Phrases',
    essential: true,
  },
  // Charlie can't read yet - obviously - so every instruction has to arrive
  // spoken. These two play at the start of each round type.
  {
    id: 'phrase:which-one',
    label: 'Touch the one that says…',
    direction: 'Like an invitation, and leave it hanging — the letter sound plays right after this.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:slide',
    label: 'Slide your finger across and read it.',
    direction: 'Friendly and unhurried.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:try-again',
    label: 'Try again.',
    direction: 'Light and encouraging. Nothing here should sound like a correction.',
    group: 'Phrases',
    essential: true,
  },
  // Charlie's rule: the bear NEVER says goodbye - and no goodnights either.
  // The session ends with a job: the bear is worn out, and the kid feeds him
  // blueberries to perk him up, counting each one. Caretaking, not parting.
  {
    id: 'phrase:blueberries-offer',
    label: 'You did a great job! I\'m SO tired. Should I have some blueberries to wake up?',
    direction: 'Sleepy, half-yawning voice. The blueberry question should sound hopeful.',
    group: 'Phrases',
    essential: true,
  },
  // Variant tired-voices - Charlie wanted the ending to change it up. The
  // done screen picks one at random; add more variants any time.
  {
    id: 'phrase:blueberries-offer:2',
    label: 'Baby bear is getting SO tired… can you give me some blueberries?',
    direction: 'The baby-bear voice. Sleepier and smaller than the main one.',
    group: 'Phrases',
    essential: false,
  },
  {
    id: 'phrase:yum-thanks',
    label: 'MMMM! Yummy! Thank you! I feel better!',
    direction: 'Mouth-full happy. Big grateful energy.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:earn-roars',
    label: 'No more roars! Do some reading to earn more!',
    direction: 'Cheeky, not scolding — the bear drives a fair bargain.',
    group: 'Phrases',
    essential: true,
  },
  {
    id: 'phrase:more',
    label: 'I have SO much energy now! Let\'s read more!',
    direction: 'Bursting awake — the blueberries worked!',
    group: 'Phrases',
    essential: true,
  },
  ...Array.from({ length: 15 }, (_, i) => i + 1).map<Clip>((n) => ({
    id: `count:${n}`,
    label: ['One!', 'Two!', 'Three!', 'Four!', 'Five!', 'Six!', 'Seven!', 'Eight!',
      'Nine!', 'Ten!', 'Eleven!', 'Twelve!', 'Thirteen!', 'Fourteen!', 'Fifteen!'][n - 1],
    direction: 'Excited counting, like you can\'t believe how many blueberries there are.',
    group: 'Counting',
    // 1-5 are the original core; the teens arrived with the count-to-15 game.
    essential: n <= 5,
  })),

  // --- Math atoms. Sentences like "5 minus 2 is 3!" get stitched together
  // from the number clips plus these connectors, so record them as loose
  // sentence fragments, not complete thoughts. ---
  {
    id: 'math:i-have',
    label: 'I have…',
    direction: 'Sentence fragment: "I have…" — leave it hanging, a number comes next.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:blueberries',
    label: '…blueberries…',
    direction: 'Just the word "blueberries", neutral middle-of-sentence tone.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:take-away',
    label: '…take away…',
    direction: 'Just "take away", playful — a challenge is coming.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:plus',
    label: '…plus…',
    direction: 'Just the word "plus", middle-of-sentence.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:minus',
    label: '…minus…',
    direction: 'Just the word "minus", middle-of-sentence.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:is',
    label: '…is…',
    direction: 'Just the word "is", middle-of-sentence.',
    group: 'Math',
    essential: false,
  },
  {
    id: 'math:how-many',
    label: 'How many blueberries did we get?',
    direction: 'A real question, curious and warm. Digit buttons appear while it plays.',
    group: 'Math',
    essential: true,
  },
  {
    id: 'phrase:eat-them',
    label: 'Great job! Now touch them to eat them!',
    direction: 'Right after he answers the math question — inviting, like dessert is served.',
    group: 'Math',
    essential: true,
  },
  {
    id: 'phrase:feel-better',
    label: 'Great job! I feel MUCH better now!',
    direction: 'The bear is restored. Grateful and bouncy — this caps every ending.',
    group: 'Phrases',
    essential: true,
  },

  // --- Set 1 words ---
  ...SET_ONE_WORDS.map((w) => wordClip(w, true)),

  // --- Bonus: Set 2 ---
  ...SET_TWO.map((s) => soundClip(s, false)),
  ...SET_TWO_WORDS.map((w) => wordClip(w, false)),
];

// --- Natural math sentences. One recorded sentence per problem the game can
// roll, so nothing has to be stitched from atoms ("5......minus......3").
// The stitched atoms remain as fallback for anything not yet recorded.
// Fruit is never named, so these cover blueberries, bananas, all of it. ---
for (const [s, m] of TAKEAWAY_COMBOS) {
  CLIPS.push({
    id: `math:ta:${s}:${m}`,
    label: `I have ${s}. Take away ${m} — that's ${s} minus ${m}!`,
    direction: 'One natural sentence, playful — "take away" AND "minus" both, so he links the words. No fruit name.',
    group: 'Math sentences',
    essential: false,
  });
  CLIPS.push({
    id: `math:tam:${s}:${m}`,
    label: `${s} minus ${m} is ${s - m}!`,
    direction: 'One natural sentence, triumphant at the end.',
    group: 'Math sentences',
    essential: false,
  });
}
for (const [a, b] of ADDITION_COMBOS) {
  CLIPS.push({
    id: `math:add:${a}:${b}`,
    label: `Let's add! ${a} plus ${b} is how many?`,
    direction: 'One natural question — "add" and "plus" both, so he links the words.',
    group: 'Math sentences',
    essential: false,
  });
  CLIPS.push({
    id: `math:addeq:${a}:${b}`,
    label: `${a} plus ${b} is ${a + b}!`,
    direction: 'One natural sentence, triumphant at the end.',
    group: 'Math sentences',
    essential: false,
  });
}

// Fruit-neutral versions of the lines that currently say "blueberries", for
// when the bear is eating strawberries or bananas instead.
CLIPS.push(
  {
    id: 'phrase:offer-snack',
    label: 'You did a great job! I\'m SO tired… can you feed me a yummy snack?',
    direction: 'Same sleepy energy as the blueberry offer, fruit-neutral.',
    group: 'Phrases',
    essential: false,
  },
  {
    id: 'math:how-many-generic',
    label: 'How many did we get?',
    direction: 'Fruit-neutral version of the how-many question.',
    group: 'Math',
    essential: false,
  },
);

// Named roar slots appear in the parent studio too (kid's own already exists).
for (const s of ROAR_SLOTS) {
  if (s.id === 'sfx:roar:kid') continue;
  CLIPS.push({
    id: s.id,
    label: `ROAR — ${s.label}!`,
    direction: `Hand ${s.label} the mic. Big and happy — their roar fills a card in the collection.`,
    group: 'Bear',
    essential: false,
  });
}

export const ESSENTIAL_COUNT = CLIPS.filter((c) => c.essential).length;

export const clipById = (id: string) => CLIPS.find((c) => c.id === id);
