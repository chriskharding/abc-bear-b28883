// Word -> picture, for the reveal after a successful slide. Curated hard:
// only pictures that unmistakably ARE the word to a four-year-old. A word
// with no entry simply skips the reveal - a wrong or vague picture teaches
// the wrong thing, so absence beats ambiguity.

export const PICTURES: Record<string, string> = {
  // set 1-2
  tap: '🚰', tin: '🥫', pin: '📌', pan: '🍳', nap: '😴', sip: '🥤',
  mad: '😠', map: '🗺️', man: '👨', mom: '👩', dad: '🧔', dig: '⛏️',
  dot: '⚫', dog: '🐶', gas: '⛽', tag: '🏷️', cat: '🐱', cap: '🧢',
  cot: '🛏️', cop: '👮', kid: '🧒', pot: '🍲', pig: '🐷', sad: '😢',
  tot: '👶',
  // set 3
  red: '🔴', run: '🏃', rat: '🐀', hen: '🐔', hat: '🎩', hug: '🤗',
  hot: '🔥', bed: '🛏️', bat: '🦇', bin: '🗑️', bus: '🚌', bug: '🐛',
  fan: '🌀', leg: '🦵', lip: '👄', log: '🪵', egg: '🥚', elf: '🧝',
  up: '⬆️', cup: '☕', cut: '✂️', nut: '🥜', sun: '☀️', pen: '🖊️',
  ten: '🔟', net: '🥅', men: '👬',
  // set 4
  jet: '✈️', jam: '🫙', van: '🚐', wet: '💧', win: '🏆', web: '🕸️',
  box: '📦', fix: '🔧', six: '6️⃣', fox: '🦊', yum: '😋', zap: '⚡',
  // blends + book bank
  frog: '🐸', crab: '🦀', drum: '🥁', drop: '💧', trap: '🪤',
  grin: '😁', plus: '➕', clap: '👏', clip: '📎', clam: '🦪',
  flag: '🚩', glad: '😊', sled: '🛷', swim: '🏊', twin: '👯',
  stem: '🌱', nest: '🪺', best: '🥇', fast: '💨', list: '📝',
  fist: '✊', hand: '✋', tent: '⛺', gift: '🎁', left: '⬅️',
  melt: '🫠', milk: '🥛', jump: '⛹️', vest: '🦺', snap: '🫰',
  stop: '🛑', mist: '🌫️', camp: '🏕️', gasp: '😮', ant: '🐜',
  cats: '🐱', caps: '🧢', maps: '🗺️', pots: '🍲',
};
