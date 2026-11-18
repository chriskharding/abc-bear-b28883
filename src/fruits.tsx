// What the bear eats. Charlie's list. Raspberries and blackberries have no
// emoji, so they're drawn - a cluster of drupelets with a leaf, same flat
// style as the bear.

import type { ReactNode } from 'react';

export type Fruit = {
  name: string;
  one: string;
  render: () => ReactNode;
  /** What's left after eating, when the fruit deserves better than the
   *  generic squashed look (bananas leave a peel). */
  renderEaten?: () => ReactNode;
};

/** The classic splayed banana peel. */
function BananaPeel() {
  return (
    <svg width="38" height="40" viewBox="0 0 40 42" aria-hidden="true">
      <ellipse cx="20" cy="18" rx="7" ry="5" fill="#F7EBC8" />
      <path d="M20 16 q-3 -8 -1 -12 q3 -1 4 1 q2 5 -1 11 z" fill="#8a6a2f" />
      <path d="M17 18 q-12 2 -14 18 q7 -1 10 -8 q2 -6 4 -10 z" fill="#F5D14A" />
      <path d="M23 18 q12 2 14 18 q-7 -1 -10 -8 q-2 -6 -4 -10 z" fill="#F5D14A" />
      <path d="M20 20 q-1 12 0 18 q4 -4 4 -12 q0 -4 -4 -6 z" fill="#EFC53F" />
    </svg>
  );
}

function BerryCluster({ body, shine }: { body: string; shine: string }) {
  // Drupelets packed into a rounded berry shape, leaf on top.
  const drupelets: [number, number][] = [
    [15, 13], [22, 13],
    [11, 20], [18.5, 20], [26, 20],
    [13, 27], [24, 27],
    [18.5, 33],
  ];
  return (
    <svg width="38" height="42" viewBox="0 0 37 42" aria-hidden="true">
      <path d="M13 7 q5 -6 12 -4 q-2 5 -7 6 z" fill="#4B9B5F" />
      {drupelets.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.4" fill={body} />
      ))}
      {drupelets.slice(0, 5).map(([x, y], i) => (
        <circle key={`s${i}`} cx={x - 1.5} cy={y - 1.5} r="1.4" fill={shine} />
      ))}
    </svg>
  );
}

export const FRUITS: Fruit[] = [
  { name: 'blueberries', one: 'blueberry', render: () => '🫐' },
  { name: 'bananas', one: 'banana', render: () => '🍌', renderEaten: () => <BananaPeel /> },
  {
    name: 'raspberries',
    one: 'raspberry',
    render: () => <BerryCluster body="#D64560" shine="#F08CA0" />,
  },
  {
    name: 'blackberries',
    one: 'blackberry',
    render: () => <BerryCluster body="#3D2B4F" shine="#6E548C" />,
  },
  { name: 'apples', one: 'apple', render: () => '🍎' },
  { name: 'strawberries', one: 'strawberry', render: () => '🍓' },
  { name: 'oranges', one: 'orange', render: () => '🍊' },
  { name: 'grapes', one: 'grape', render: () => '🍇' },
  { name: 'cherries', one: 'cherry', render: () => '🍒' },
  { name: 'watermelons', one: 'watermelon', render: () => '🍉' },
  { name: 'broccoli', one: 'broccoli', render: () => '🥦' },
];

/** Plural + singular name pairs, for generating per-fruit voice lines. */
export const FRUIT_NAMES = FRUITS.map((f) => ({ name: f.name, one: f.one }));
