// What the bear eats. Charlie's list. Raspberries and blackberries have no
// emoji, so they're drawn - a cluster of drupelets with a leaf, same flat
// style as the bear.

import type { ReactNode } from 'react';

export type Fruit = {
  name: string;
  one: string;
  render: () => ReactNode;
};

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
  { name: 'bananas', one: 'banana', render: () => '🍌' },
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
];
