import { RealmIcon } from './RealmArt.js';
export function ItemArt({
  name,
  className = 'market-relic',
}: {
  name: string;
  className?: string;
}): React.ReactElement {
  if (name !== '行軍簿' && name !== '乾糧袋')
    return <RealmIcon relic name={name} className={className} />;
  return (
    <svg
      className={className + ' realm-icon'}
      viewBox="0 0 100 100"
      role="img"
      aria-label={name}
    >
      <ellipse cx="50" cy="86" rx="34" ry="7" fill="#765330" opacity=".2" />
      {name === '行軍簿' ? (
        <g stroke="#67482c" strokeWidth="3" strokeLinejoin="round">
          <path d="M18 22 68 13 83 68 31 81Z" fill="#9c4135" />
          <path d="m24 29 41-8 10 38-41 9Z" fill="#f4db9e" />
          <path d="m30 29 10 35m1-38 22-4M43 36l22-4M45 45l17-3" fill="none" />
          <path d="m28 76 50-10 3 8-51 9Z" fill="#d8bd80" />
          <path d="m67 14 8 48" stroke="#d7a84e" />
        </g>
      ) : (
        <g stroke="#654527" strokeWidth="3" strokeLinejoin="round">
          <path
            d="m37 29-5-15 19 3 17-5-6 18 17 26q15 29-27 30-39 0-34-26Z"
            fill="#c79655"
          />
          <path d="m36 27 27 1-1 8-27-1Z" fill="#704c2e" />
          <path d="M42 35 31 63m25-27 14 32" stroke="#eaca86" fill="none" />
          <path d="M39 54q12-7 23 0v17H39Z" fill="#dacc9d" />
          <path d="m45 57 13 10m-13 0 13-10" stroke="#7d6c48" />
        </g>
      )}
    </svg>
  );
}
