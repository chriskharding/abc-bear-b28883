// The bear is drawn, not animated video. He has exactly three expressions and
// he only moves in direct response to a tap - nothing here plays on its own.

export type Mood = 'calm' | 'roar' | 'think' | 'sleep';

export function Bear({ mood, size = 260 }: { mood: Mood; size?: number }) {
  const roaring = mood === 'roar';

  return (
    <svg
      className={`bear bear--${mood}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
    >
      {/* Ears */}
      <circle cx="44" cy="50" r="27" fill="#A9713F" />
      <circle cx="156" cy="50" r="27" fill="#A9713F" />
      <circle cx="44" cy="50" r="14" fill="#D99B8A" />
      <circle cx="156" cy="50" r="14" fill="#D99B8A" />

      {/* Head */}
      <ellipse cx="100" cy="112" rx="73" ry="67" fill="#A9713F" />

      {/* Brow shading, gives him a bit of weight */}
      <ellipse cx="100" cy="86" rx="60" ry="30" fill="#B57B47" />

      {/* Eyes */}
      {mood === 'sleep' ? (
        // Softly closed - asleep, not squeezed shut like the roar
        <>
          <path d="M62 94 q12 9 24 0" stroke="#4A3222" strokeWidth="6"
            fill="none" strokeLinecap="round" />
          <path d="M114 94 q12 9 24 0" stroke="#4A3222" strokeWidth="6"
            fill="none" strokeLinecap="round" />
        </>
      ) : roaring ? (
        <>
          <path d="M62 92 q12 -11 24 0" stroke="#4A3222" strokeWidth="6"
            fill="none" strokeLinecap="round" />
          <path d="M114 92 q12 -11 24 0" stroke="#4A3222" strokeWidth="6"
            fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="74" cy="92" r="9" fill="#3A2618" />
          <circle cx="126" cy="92" r="9" fill="#3A2618" />
          <circle cx="77" cy="89" r="3" fill="#fff" />
          <circle cx="129" cy="89" r="3" fill="#fff" />
        </>
      )}

      {/* Muzzle */}
      <ellipse cx="100" cy="137" rx="44" ry="33" fill="#E8C9A0" />

      {/* Nose */}
      <path d="M88 118 h24 a7 7 0 0 1 6 10 l-12 12 a6 6 0 0 1 -12 0 l-12 -12 a7 7 0 0 1 6 -10 z"
        fill="#4A3222" />

      {roaring ? (
        <>
          {/* Wide open roar */}
          <ellipse cx="100" cy="155" rx="27" ry="25" fill="#7A2F3A" />
          <ellipse cx="100" cy="168" rx="16" ry="11" fill="#E07A87" />
          <path d="M85 133 l7 12 l7 -12 z" fill="#fff" />
          <path d="M115 133 l-7 12 l-7 -12 z" fill="#fff" />
        </>
      ) : (
        <>
          {/* Closed, faintly pleased */}
          <path d="M100 140 v6" stroke="#4A3222" strokeWidth="5"
            strokeLinecap="round" />
          <path d="M100 146 q-13 12 -22 1" stroke="#4A3222" strokeWidth="5"
            fill="none" strokeLinecap="round" />
          <path d="M100 146 q13 12 22 1" stroke="#4A3222" strokeWidth="5"
            fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
