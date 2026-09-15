import {DEBATE_CARDS,debateDamage,focusRecovery,type Debater,type DebateCard} from '../app/card-debate-model.js';
import type {DebateResource} from '../contracts/core/card-debate.js';
export const CARD_ORDER:DebateCard[]=['claim','proof','question','rebut','borrow','focus','pressure'];
export const RESOURCE_NAMES:Record<DebateResource,string>={heart:'心防',mind:'心力',evidence:'論據',momentum:'聲勢'};
export function DebateIcon({card}:{card:DebateCard}):React.ReactElement {
 const n=CARD_ORDER.indexOf(card);
 return <span aria-hidden="true" className={`cb-icon ${card==='pressure'?'db-pressure':''}`} style={card==='pressure'?undefined:{backgroundPosition:`${n%3*50}% ${Math.floor(n/3)*100}%`}}/>;
}
export function ResourceIcon({kind}:{kind:DebateResource}):React.ReactElement {const n=['heart','mind','evidence','momentum'].indexOf(kind);return <span className="cv-resource" aria-hidden="true" style={{backgroundPosition:`${n%2*100}% ${Math.floor(n/2)*100}%`}}/>;}
export function ResourceValue({kind,value}:{kind:DebateResource;value:string|number}):React.ReactElement {return <span className={`cv-value ${String(value).startsWith('+')?'db-plus':/^[−-]/.test(String(value))?'db-minus':''}`} aria-label={`${RESOURCE_NAMES[kind]} ${value}`}><ResourceIcon kind={kind}/><strong>{value}</strong></span>;}
export type Effect={kind:DebateResource;value:string};
export const CARD_PURPOSE:Record<DebateCard,string>={claim:'蓄據',proof:'論據爆發',question:'拆據耗心',rebut:'反击蓄勢',borrow:'奪勢',focus:'恢復與沉著',pressure:'聲勢爆發'};
export function cardEffects(card:DebateCard,f:Debater,target:Debater,fallback=false):{enemy:Effect[];self:Effect[];note:string} {
 const enemy:Effect[]=[],self:Effect[]=[];let note='';
 const cost=DEBATE_CARDS[card].cost;if(cost)self.push({kind:'mind',value:'−'+cost});
 const damage=debateDamage(f,target,card);
 if(damage)enemy.push({kind:'heart',value:'約 −'+damage});
 if(card==='claim'){self.push({kind:'evidence',value:'+'+(f.build.trait==='scholar'?3:2)});note='先蓄竹簡，再用舉證。';}
 if(card==='proof'){self.push({kind:'evidence',value:'全耗'});note='至少 2 論據；對手質疑會先拆據。';}
 if(card==='question'){enemy.push({kind:'evidence',value:'−2'},{kind:'mind',value:'−10'});note='先拆論據；耗心影響對手後續出牌。';}
 if(card==='rebut'){enemy.push({kind:'heart',value:'反擊'});self.push({kind:'momentum',value:'成功 +2'});note=`擋 ${f.build.trait==='counter'?85:70}%，回敬擋下量的 ${f.build.trait==='counter'?60:40}%；擋不住喝斥。`;}
 if(card==='borrow'){const stolen=Math.min(2,target.momentum);if(stolen)enemy.push({kind:'momentum',value:'−'+stolen});self.push({kind:'momentum',value:'+'+(stolen||1)});note='先奪聲勢；可讓當合喝斥失勢。';}
 if(card==='focus'){self.push({kind:'mind',value:'+'+focusRecovery(f,fallback)});note=fallback?'換最左牌、占用本合；喝斥減半。':'喝斥傷害減半；仍怕舉證重擊。';}
 if(card==='pressure'){self.push({kind:'momentum',value:'全耗'});note='至少 2 聲勢；穿過反駁，遇整思減半。';}
 return {enemy,self,note};
}
export function CardDebateGuide({onClose}:{onClose:()=>void}):React.ReactElement {
 const paths:[string,DebateCard[],string][]=[['蓄據爆發',['claim','proof'],'竹簡越多越痛；小心質疑拆據。'],['反擊爆發',['rebut','pressure'],'反駁成功蓄勢，喝斥穿過防線。'],['資源壓制',['question','borrow'],'拆據、耗心、奪勢，拖慢兩種爆發。'],['誘招回復',['focus','proof'],'整思接住喝斥；對方整思時用舉證。']];
 return <section className="cb-rules db-guide" role="dialog" aria-modal="true" aria-label="舌戰圖解"><button className="cb-close" onClick={onClose} aria-label="關閉舌戰玩法">×</button><h2>看對手準備，換一種打法</h2><div className="db-legend">{(['heart','mind','evidence','momentum'] as const).map(kind=><span key={kind}><ResourceIcon kind={kind}/>{RESOURCE_NAMES[kind]}</span>)}</div><div className="db-paths">{paths.map(([name,cards,note])=><article key={name}><h3>{name}</h3><div>{cards.map((card,i)=><span key={card}>{i>0&&<b>→</b>}<DebateIcon card={card}/><strong>{DEBATE_CARDS[card].name}</strong></span>)}</div><p>{note}</p></article>)}</div><div className="db-intellect"><b>智力 → 手牌</b>{[[1,39,3],[40,59,4],[60,79,5],[80,100,6]].map(([min,max,count])=><span key={min}><i className="db-card-back">{count}</i>{min}–{max}</span>)}</div><footer>選牌 → 查看敵／我變化 → 出牌。1–6 選牌，Enter 出牌；R 選整思換牌。<br/>每合補 1 張、恢復少量心力；傷害會蓄 1 聲勢。25 秒未出牌自動整思換牌。<br/>心防歸零即敗；最多 20 合，比心防剩餘比例。效果受資源上限及對手出牌影響。</footer></section>;
}
