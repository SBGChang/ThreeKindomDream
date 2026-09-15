import type {DebateCard,DebateBuild,Debater,DebateTurn,CardDebate} from '../contracts/core/card-debate.js';
export type {DebateCard,DebateTrait,DebateBuild,Debater,DebateTurn,CardDebate} from '../contracts/core/card-debate.js';
/** Outside every valid hand index; adding a fifth card must never invoke recovery. */
export const DEBATE_RECOVER=-1;
export const DEBATE_CARDS:Record<DebateCard,{name:string;cost:number;category:'攻勢'|'周旋'|'蓄勢';description:string}>={
 claim:{name:'立論',cost:8,category:'蓄勢',description:'小幅傷害，論據 +2'},
 proof:{name:'舉證',cost:20,category:'攻勢',description:'消耗全部論據重擊；會被質疑拆據'},
 question:{name:'質疑',cost:10,category:'攻勢',description:'先拆 2 論據，再削弱心防與 10 心力'},
 rebut:{name:'反駁',cost:12,category:'周旋',description:'擋下攻勢並反擊；成功蓄 2 聲勢'},
 borrow:{name:'借題',cost:8,category:'周旋',description:'先奪取 2 聲勢；無可奪時自得 1'},
 focus:{name:'整思',cost:0,category:'蓄勢',description:'恢復心力；本合喝斥傷害減半'},
 pressure:{name:'喝斥',cost:18,category:'攻勢',description:'消耗全部聲勢爆發；穿過反駁，遇整思減半'},
};
export const DEBATE_TRAITS={
 scholar:{name:'博聞',description:'立論多得 1 論據'},orator:{name:'雄辯',description:'造成說服傷害時再加 4'},
 counter:{name:'反鋒',description:'反駁擋下 85%，反擊為擋下量的 60%'},calm:{name:'調息',description:'整思多回 8 心力，每合多回 2'},
};
export const DEFAULT_DEBATE_BUILD:DebateBuild={int:70,pol:65,trait:'scholar'};
const cap=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export const debateHandSize=(int:number)=>Math.min(6,3+Math.max(0,Math.floor(((Number.isFinite(int)?int:70)-20)/20)));
const random=(s:CardDebate)=>{s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;};
function shuffle(s:CardDebate,cards:DebateCard[]):DebateCard[]{for(let i=cards.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[cards[i],cards[j]]=[cards[j]!,cards[i]!];}return cards;}
function fighter(build:DebateBuild):Debater {
 const int=cap(Math.round(Number.isFinite(build.int)?build.int:70),1,100),pol=cap(Math.round(Number.isFinite(build.pol)?build.pol:65),1,100);
 const maxHeart=100+Math.round(pol*.4),maxMind=60+Math.round(pol*.35);
 const hand:DebateCard[]=(['claim','proof','rebut','question','borrow','pressure'] as DebateCard[]).slice(0,debateHandSize(int));
 const deck:DebateCard[]=['claim','claim','claim','proof','proof','question','question','rebut','rebut','borrow','borrow','focus','focus','focus','pressure','pressure'];
 for(const card of hand)deck.splice(deck.indexOf(card),1);
 return {build:{int,pol,trait:Object.hasOwn(DEBATE_TRAITS,build.trait)?build.trait:'scholar'},heart:maxHeart,maxHeart,mind:maxMind,maxMind,evidence:0,momentum:0,hand,deck,discard:[]};
}
export function createCardDebate(ally=DEFAULT_DEBATE_BUILD,enemy:DebateBuild={...DEFAULT_DEBATE_BUILD,trait:'counter'},seed=712):CardDebate {
 const s:CardDebate={ally:fighter(ally),enemy:fighter(enemy),rng:seed>>>0,round:1,enemyChoice:0,last:null,history:[],result:null};shuffle(s,s.ally.deck);shuffle(s,s.enemy.deck);commit(s);return s;
}
export function debateBlock(f:Debater,c:DebateCard):string {return f.mind<DEBATE_CARDS[c].cost?'心力不足':c==='proof'&&f.evidence<2?'需 2 論據':c==='pressure'&&f.momentum<2?'需 2 聲勢':'';}
export const focusRecovery=(f:Debater,fallback=false)=> (fallback?12:24)+Math.floor(f.build.pol/10)+(f.build.trait==='calm'?8:0);
export const passiveMind=(f:Debater)=>4+Math.floor(f.build.pol/25)+(f.build.trait==='calm'?2:0);
export const debatePower=(f:Debater,target:Debater)=> (14+f.build.int*.22)*(1+f.momentum*.06)/(1+target.build.pol*.005);
/** Estimate before opposing interference; consumed resources are still present here. */
export function debateDamage(f:Debater,target:Debater,c:DebateCard):number {
 const ratio=c==='claim'?.32:c==='question'?.4:c==='proof'?(f.evidence>=2?1+f.evidence*.35:.35):c==='pressure'?(f.momentum>=2?.65+f.momentum*.45:.25):0;
 return ratio?Math.max(1,Math.round(debatePower(f,target)*ratio)+(f.build.trait==='orator'?4:0)):0;
}
export const debateIntent=(s:CardDebate)=>s.enemyChoice===DEBATE_RECOVER?'蓄勢':DEBATE_CARDS[s.enemy.hand[s.enemyChoice]!].category;
function commit(s:CardDebate):void {
 const f=s.enemy,t=s.ally,choices=f.hand.map((c,i)=>({i,c,w:debateBlock(f,c)?0:c==='proof'?3+f.evidence:c==='pressure'?3+f.momentum:c==='claim'?(f.evidence<3?4:1):c==='question'?(t.evidence>=2?5:2):c==='rebut'?(t.evidence>=2?4:1):c==='borrow'?(t.momentum>=2?5:.8):f.mind<f.maxMind*.5?5:t.momentum>=2?3:.3}));
 const fallback=f.mind<22?4:.15,total=choices.reduce((sum,c)=>sum+c.w,0)+fallback;let r=random(s)*total;s.enemyChoice=DEBATE_RECOVER;for(const c of choices){r-=c.w;if(r<0){s.enemyChoice=c.i;break;}}
}
function replace(s:CardDebate,f:Debater,index:number):void {
 const old=f.hand[index]!;f.discard.push(old);if(!f.deck.length)f.deck=shuffle(s,f.discard.splice(0));f.hand[index]=f.deck.shift()!;
}
export function resolveCardDebate(s:CardDebate,index:number):boolean {
 if(s.result||!Number.isInteger(index)||index<DEBATE_RECOVER||index>=s.ally.hand.length)return false;
 const a=s.ally,b=s.enemy,x=index===DEBATE_RECOVER?'focus':a.hand[index]!,ei=s.enemyChoice,y=ei===DEBATE_RECOVER?'focus':b.hand[ei]!;
 if(index!==DEBATE_RECOVER&&debateBlock(a,x))return false;
 const resources=['heart','mind','evidence','momentum'] as const,beforeA={heart:a.heart,mind:a.mind,evidence:a.evidence,momentum:a.momentum},beforeB={heart:b.heart,mind:b.mind,evidence:b.evidence,momentum:b.momentum};
 const turn:DebateTurn={ally:x,enemy:y,allyFallback:index===DEBATE_RECOVER,allyHand:[...a.hand],allyChange:{...beforeA},enemyChange:{...beforeB},damageToAlly:0,damageToEnemy:0,notes:[]};
 a.mind-=DEBATE_CARDS[x].cost;b.mind-=DEBATE_CARDS[y].cost;
 const am=a.momentum,bm=b.momentum,stealA=x==='borrow'?Math.min(2,bm):0,stealB=y==='borrow'?Math.min(2,am):0;
 a.momentum=cap(am-stealB+(x==='borrow'?(stealA||1):0),0,4);b.momentum=cap(bm-stealA+(y==='borrow'?(stealB||1):0),0,4);
 for(const [f,t,c,name] of [[a,b,x,'我方'],[b,a,y,'敵方']] as const){
  if(c==='question'){const removed=Math.min(2,t.evidence);t.evidence-=removed;t.mind=Math.max(0,t.mind-10);if(removed)turn.notes.push(name+'拆據');}
  if(c==='borrow')turn.notes.push(name+'借勢');
 }
 let toB=debateDamage(a,b,x),toA=debateDamage(b,a,y);
 for(const [f,c,name] of [[a,x,'我方'],[b,y,'敵方']] as const){
  if(c==='proof'){if(f.evidence<2)turn.notes.push(name+'舉證失勢');f.evidence=0;}
  if(c==='pressure'){if(f.momentum<2)turn.notes.push(name+'喝斥失勢');f.momentum=0;}
 }
 const defend=(f:Debater,c:DebateCard,incoming:DebateCard,damage:number,name:string)=>{
  if(incoming==='pressure'){if(c==='focus'){turn.notes.push(name+'沉著減傷');return {damage:Math.round(damage*.5),reflected:0,blocked:0};}return {damage,reflected:0,blocked:0};}
  if(c!=='rebut'||!damage)return {damage,reflected:0,blocked:0};
  const blocked=Math.round(damage*(f.build.trait==='counter'?.85:.7));turn.notes.push(name+'反擊');
  return {damage:damage-blocked,reflected:Math.round(blocked*(f.build.trait==='counter'?.6:.4)),blocked};
 };
 const aa=defend(a,x,y,toA,'我方'),bb=defend(b,y,x,toB,'敵方');toA=aa.damage+bb.reflected;toB=bb.damage+aa.reflected;
 turn.damageToAlly=Math.min(a.heart,toA);turn.damageToEnemy=Math.min(b.heart,toB);a.heart-=turn.damageToAlly;b.heart-=turn.damageToEnemy;
 for(const [f,c,damage,fallback,blocked] of [[a,x,toB,index===DEBATE_RECOVER,aa.blocked],[b,y,toA,ei===DEBATE_RECOVER,bb.blocked]] as const){
  if(c==='claim')f.evidence=cap(f.evidence+2+(f.build.trait==='scholar'?1:0),0,5);
  if(c==='focus')f.mind=Math.min(f.maxMind,f.mind+focusRecovery(f,fallback));
  f.momentum=cap(f.momentum+(blocked>0?2:damage>0?1:0),0,4);
  f.mind=Math.min(f.maxMind,f.mind+passiveMind(f));
 }
 replace(s,a,index===DEBATE_RECOVER?0:index);replace(s,b,ei===DEBATE_RECOVER?0:ei);
 for(const key of resources){turn.allyChange[key]=a[key]-beforeA[key];turn.enemyChange[key]=b[key]-beforeB[key];}
 if(!a.heart||!b.heart)s.result=!a.heart?(!b.heart?'draw':'enemy'):'ally';
 else if(s.round>=20){const diff=a.heart/a.maxHeart-b.heart/b.maxHeart;s.result=Math.abs(diff)<1e-9?'draw':diff>0?'ally':'enemy';}
 s.last=turn;s.history.push(structuredClone(turn));if(!s.result){s.round++;commit(s);}return true;
}
