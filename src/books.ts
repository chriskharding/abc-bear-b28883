// The first decodable books. Rules: every non-tricky word is sound-out-able
// and recorded; FOUR WORDS MAX per page (a beginner reads a breath at a
// time); every page can show art - a generated image from
// public/book-art/<bookId>-p<N>.png when present, its emoji otherwise.
// Page audio: recorded whole sentence (book:<id>:p<n>) if it exists, else
// word-by-word in family voices.

export type BookPage = { text: string; pic?: string };
export type Book = { id: string; title: string; cover: string; pages: BookPage[] };

export const BOOKS: Book[] = [
  {
    id: 'book1',
    title: 'The Big Sun',
    cover: '☀️',
    pages: [
      { text: 'The sun is up.', pic: '☀️' },
      { text: 'It is hot.', pic: '🔥' },
      { text: 'We run to the pond.', pic: '🏃' },
      { text: 'A frog naps.', pic: '🐸' },
      { text: 'The frog can jump!', pic: '🤸' },
      { text: 'We jump in!', pic: '💦' },
      { text: 'We swim and swim.', pic: '🏊' },
      { text: 'We nap in the sun.', pic: '😴' },
    ],
  },
  {
    id: 'book2',
    title: 'The Lost Egg',
    cover: '🥚',
    pages: [
      { text: 'A hen has an egg.', pic: '🐔' },
      { text: 'The egg is lost!', pic: '🥚' },
      { text: 'A fox got it?', pic: '🦊' },
      { text: 'It is in the sand.', pic: '🏖️' },
      { text: 'The hen can dig.', pic: '⛏️' },
      { text: 'The egg went POP!', pic: '🐣' },
      { text: 'The hen is glad.', pic: '💛' },
    ],
  },
  {
    id: 'book3',
    title: 'The Red Sled',
    cover: '🛷',
    pages: [
      { text: 'I got a red sled!', pic: '🛷' },
      { text: 'We go up, up, up.', pic: '⬆️' },
      { text: 'We zip! We zag!', pic: '⚡' },
      { text: 'We hit a big bump!', pic: '💥' },
      { text: 'We spin and spin.', pic: '💫' },
      { text: 'We land in the mist!', pic: '🌫️' },
      { text: 'I am glad.', pic: '😊' },
    ],
  },
];

/** Words that can't be sounded out and are learned whole - the glue of every
 *  sentence. Recorded as ordinary word clips. */
export const TRICKY_WORDS = ['the', 'a', 'i', 'is', 'to', 'we', 'go', 'no', 'my', 'see', 'has'];

/** Tiny text fingerprint, so a rewritten sentence gets a NEW clip id and an
 *  old recording can never masquerade as the new words. */
const fp = (s: string) => {
  let x = 5381;
  for (const ch of s) x = ((x * 33) ^ (ch.codePointAt(0) ?? 0)) >>> 0;
  return x.toString(36).slice(0, 5);
};

export const pageClipId = (bookId: string, pageIndex: number, text: string) =>
  `book:${bookId}:p${pageIndex + 1}:${fp(text)}`;
export const titleClipId = (bookId: string) => `book:${bookId}:title`;
