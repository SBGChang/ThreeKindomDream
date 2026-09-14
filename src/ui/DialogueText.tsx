import { defs, t } from '../app/bootstrap.js';
const words = [
  ...defs.reader('notable').all(),
  ...defs.reader('item').all(),
  ...defs.reader('skill').all(),
  ...defs.reader('trait').all(),
].map((d) => t(d.nameKey));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Literal glossary matching: no HTML markup is accepted from story text. */
export function DialogueText({
  text,
  keywords = [],
}: {
  text: string;
  keywords?: readonly string[];
}): React.ReactElement {
  const dictionary = [...new Set([...words, ...keywords].filter(Boolean))].sort(
      (a, b) => b.length - a.length,
    ),
    pattern = new RegExp(
      '(' + dictionary.map(escape).join('|') + '|[+＋−-]\\d+(?:\\.\\d+)?%?)',
      'g',
    );
  return (
    <>
      {text.split(pattern).map((part, i) =>
        dictionary.includes(part) ? (
          <span className="dialogue-keyword" key={i}>
            {part}
          </span>
        ) : /^[+＋−-]\d/.test(part) ? (
          <span
            className={/^[+＋]/.test(part) ? 'dialogue-gain' : 'dialogue-loss'}
            key={i}
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
