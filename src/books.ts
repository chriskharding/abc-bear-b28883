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
      { text: 'I run.', pic: '🏃' },
      { text: 'A frog!', pic: '🐸' },
      { text: 'It can jump.', pic: '🤸' },
      { text: 'I swim fast.', pic: '🏊' },
      { text: 'We nap.', pic: '😴' },
    ],
  },
  {
    id: 'book2',
    title: 'The Lost Egg',
    cover: '🥚',
    pages: [
      { text: 'A hen sat.', pic: '🐔' },
      { text: 'The egg is lost!', pic: '🥚' },
      { text: 'The fox got it?', pic: '🦊' },
      { text: 'No!', pic: '🙅' },
      { text: 'In the sand!', pic: '🏖️' },
      { text: 'The hen can dig.', pic: '⛏️' },
      { text: 'The hen got it!', pic: '🐣' },
      { text: 'The end.', pic: '💛' },
    ],
  },
  {
    id: 'book3',
    title: 'The Red Sled',
    cover: '🛷',
    pages: [
      { text: 'I got a sled.', pic: '🛷' },
      { text: 'It is red.', pic: '🔴' },
      { text: 'We go up, up.', pic: '⬆️' },
      { text: 'We zip!', pic: '⚡' },
      { text: 'A bump!', pic: '💥' },
      { text: 'We spin and spin.', pic: '💫' },
      { text: 'I am glad.', pic: '😊' },
    ],
  },
];

/** Words that can't be sounded out and are learned whole - the glue of every
 *  sentence. Recorded as ordinary word clips. */
export const TRICKY_WORDS = ['the', 'a', 'i', 'is', 'to', 'we', 'go', 'no', 'my', 'see'];

export const pageClipId = (bookId: string, pageIndex: number) =>
  `book:${bookId}:p${pageIndex + 1}`;
export const titleClipId = (bookId: string) => `book:${bookId}:title`;
