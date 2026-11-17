// The first decodable books. Every non-tricky word is one Charlie can sound
// out with his current letters, and every word already has a recording - so
// a page can speak word-by-word in family voices even before the whole
// sentence is recorded. A recorded sentence clip (book:<id>:p<n>) upgrades a
// page to natural storytime speech, same layering as the math.

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
      { text: 'I run to the pond.', pic: '🏃' },
      { text: 'A frog can jump.', pic: '🐸' },
      { text: 'I swim fast.', pic: '🏊' },
      { text: 'The frog and I nap in the sun.', pic: '😴' },
    ],
  },
  {
    id: 'book2',
    title: 'The Lost Egg',
    cover: '🥚',
    pages: [
      { text: 'A hen sat on an egg.', pic: '🐔' },
      { text: 'The egg is lost!', pic: '🥚' },
      { text: 'The fox got the egg?', pic: '🦊' },
      { text: 'No! It is in the sand.', pic: '🏖️' },
      { text: 'The hen can dig fast.', pic: '⛏️' },
      { text: 'The hen got the egg. The end.', pic: '🐣' },
    ],
  },
  {
    id: 'book3',
    title: 'The Red Sled',
    cover: '🛷',
    pages: [
      { text: 'I got a red sled.', pic: '🛷' },
      { text: 'We go up, up, up.', pic: '⬆️' },
      { text: 'We zip past the camp.', pic: '🏕️' },
      { text: 'The sled hit a bump!', pic: '💥' },
      { text: 'We spin and spin.', pic: '💫' },
      { text: 'I am glad. We go up and up.', pic: '😊' },
    ],
  },
];

/** Words that can't be sounded out and are learned whole - the glue of every
 *  sentence. Recorded as ordinary word clips. */
export const TRICKY_WORDS = ['the', 'a', 'i', 'is', 'to', 'we', 'go', 'no', 'my', 'see'];

export const pageClipId = (bookId: string, pageIndex: number) =>
  `book:${bookId}:p${pageIndex + 1}`;
export const titleClipId = (bookId: string) => `book:${bookId}:title`;
