import './effect-rules.css';

// Match the parchment shop palette: gold effect terms, blue attributes and values.
const effectTerms = ['指導加成','基礎經驗','經驗加成','好感成長','起始好感','委託機率','人物事件機率','物理傷害','法術傷害','恢復效率','兵量上限','糧量上限','高品質','訓練費','學費'];
const attributes = ['統御','武力','智力','政治','文功','武功','好感'];
const tokens = new RegExp('(' + [...effectTerms, ...attributes].sort((a,b)=>b.length-a.length).join('|') + '|[+＋−–-]\\s*\\d+(?:\\.\\d+)?%?|[×→]\\s*\\d+(?:\\.\\d+)?)', 'g');

/** Inline semantic color only: no disclosure, tooltip or auxiliary rule prose. */
export function EffectText({text}:{text:string}):React.ReactElement {
 const concise=text.replace(/（(?:成長|相對權重|品質權重|品質偏移)[^）]*）/g,'').trim();
 return <>{concise.split(tokens).map((part,i)=>effectTerms.includes(part)
  ? <strong className="effect-term" key={i}>{part}</strong>
  : attributes.includes(part)||/^[+＋−–×→-]\s*\d/.test(part)
   ? <strong className="effect-stat" key={i}>{part}</strong>
   : part)}</>;
}
