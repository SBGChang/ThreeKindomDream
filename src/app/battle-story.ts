import {validDuelBuild} from '../data-runtime/duel-build-validation.js';
import {createRally,actRally} from './debate-rally-model.js';
import {validRallyBuild} from './rally-validation.js';
import type {RallyAction,RallySide} from '../contracts/core/debate-rally.js';
import {ACTION_NAME,actionBlock,createDuel,duelHealth,resolveDuel,DUEL_ACTIONS} from './duel-model.js';
import type {DuelAction} from '../contracts/core/duel.js';
import type {BattleStory,StoryRun,StoryCombat,StoryCombatant,StoryLine} from '../contracts/core/battle-story.js';

/** Preview interpreter: no Session, campaign clock, persistence, or economy writes. */
export function validateBattleStory(value:unknown):BattleStory {
 const fail=(s:string):never=>{throw new Error('戰場劇本資料：'+s);};
 const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 const text=(x:unknown)=>typeof x==='string'&&x.trim().length>0;
 const lines=(x:unknown)=>Array.isArray(x)&&x.every(l=>obj(l)&&text(l.speaker)&&text(l.text)&&(l.thought===undefined||typeof l.thought==='boolean'));
 if(!obj(value)||value.version!==1||!text(value.id)||!text(value.title)||!text(value.subtitle)||!obj(value.actors)||!obj(value.nodes)||!obj(value.playerStats)||!num(value.statCap)||(value.statCap as number)<=0)fail('缺少版本、標題、角色、節點或能力上限');
 const d=value as unknown as BattleStory;
 if(!d.nodes[d.entry])fail('入口不存在');
 if(!obj(d.field)||!num(d.field.troops)||d.field.troops<50||d.field.troops>600||!d.actors[d.field.enemy]||!Number.isInteger(d.field.wave)||d.field.wave<1)fail('戰場觸發配置');
 for(const k of ['lead','war','int','pol'] as const)if(!num(d.playerStats[k])||d.playerStats[k]<0||d.playerStats[k]>d.statCap)fail('主角能力越界');
 for(const [id,a] of Object.entries(d.actors))if(!obj(a)||!text(a.name)||!text(a.art)||!obj(a.build)||!num(a.build.war)||!num(a.build.lead)||a.build.war<1||a.build.war>100||a.build.lead<1||a.build.lead>100||!validDuelBuild(a.build))fail('角色 '+id);
 const refs:string[]=[];const rewardIds=new Set<string>();
 const strings=(x:unknown)=>Array.isArray(x)&&x.every(text);
 const combatant=(x:StoryCombatant)=>obj(x)&&!!d.actors[x.actor]&&num(x.health)&&x.health>0&&x.health<=1&&Array.isArray(x.modifiers)&&x.modifiers.every(m=>obj(m)&&text(m.label)&&(m.power===undefined||num(m.power)&&m.power>0)&&(m.attack===undefined||num(m.attack)&&m.attack>0));
 for(const [id,n] of Object.entries(d.nodes)){
  if(!obj(n))fail('節點 '+id);
  if(n.kind==='dialogue'){if(!lines(n.lines)||!n.lines.length)fail('對話 '+id);refs.push(n.next);}
  else if(n.kind==='choice'){if(!text(n.prompt)||!Array.isArray(n.options)||n.options.length<2||n.options.some(o=>!obj(o)||!text(o.id)||!text(o.label)||!text(o.detail))||new Set(n.options.map(o=>o.id)).size!==n.options.length)fail('選項 '+id);refs.push(...n.options.map(o=>o.next));}
  else if(n.kind==='combat'){
   if(!text(n.title)||!['auto','player'].includes(n.mode)||!combatant(n.ally)||!combatant(n.enemy)||!Number.isInteger(n.seed)||!Number.isInteger(n.aiSeed)||!obj(n.next)||!lines(n.opening)||!obj(n.aiWeights)||DUEL_ACTIONS.some(a=>!num(n.aiWeights[a])||n.aiWeights[a]<=0)||!Array.isArray(n.cues))fail('戰鬥 '+id);
   const ids=new Set<string>();for(const c of n.cues){if(!obj(c)||!text(c.id)||ids.has(c.id)||!lines(c.lines)||!c.lines.length||(c.round===undefined&&c.enemyHealthBelow===undefined)||(c.round!==undefined&&(!Number.isInteger(c.round)||c.round<1))||(c.enemyHealthBelow!==undefined&&(!num(c.enemyHealthBelow)||c.enemyHealthBelow<0||c.enemyHealthBelow>1)))fail('戰中對話 '+id);ids.add(c.id);}
   refs.push(n.next.win,n.next.lose,n.next.draw);
  }else if(n.kind==='check'){if(!['lead','war','int','pol'].includes(n.attr)||!num(n.dc)||!Number.isInteger(n.seed)||!text(n.tag)||!obj(n.next))fail('檢定 '+id);refs.push(n.next.win,n.next.lose);
  }else if(n.kind==='debate'){
   if(!text(n.title)||!obj(n.ally)||!obj(n.enemy)||!Number.isInteger(n.seed)||!obj(n.next))fail('舌戰 '+id);
   for(const b of [n.ally,n.enemy])if(!validRallyBuild(b))fail('舌戰能力 '+id);
   refs.push(n.next.win,n.next.lose);
  }else if(n.kind==='reward'){
   const r=n.reward;if(!obj(r)||!text(r.id)||rewardIds.has(r.id)||!text(r.title)||!num(r.allStats)||r.allStats<0||!num(r.gold)||r.gold<0||!strings(r.items)||!strings(r.unlocks))fail('獎勵 '+id);rewardIds.add(r.id);refs.push(n.next);
  }else if(n.kind==='end'){if(!text(n.title)||!text(n.text))fail('結尾 '+id);}
  else fail('未知節點 '+id);
 }
 if(refs.some(r=>!text(r)||!d.nodes[r]))fail('存在斷裂出口');
 return d;
}

function enter(d:BattleStory,s:StoryRun,id:string,hops=0):void {
 if(hops>64)throw Error('戰場節點循環');
 s.node=id;s.line=0;s.duel=null;s.rally=null;s.healed=false;s.speech=[];s.speechIndex=0;s.seenCues=[];s.visited.push(id);
 const n=d.nodes[id]!;
 if(n.kind==='combat'){
  const ally=d.actors[n.ally.actor]!.build;
  s.duel=createDuel({...ally,comboEnabled:ally.comboEnabled??n.mode==='player'},d.actors[n.enemy.actor]!.build,n.seed);s.aiRng=n.aiSeed>>>0;
  for(const side of ['ally','enemy'] as const){const f=s.duel[side],spec=n[side];f.injury=f.injuryLimit*(1-spec.health);
   for(const m of spec.modifiers){f.attack*=m.power??1;f.defense*=m.power??1;f.attack*=m.attack??1;}
  }
  if(n.mode==='player'&&d.equipment){s.duel.ally.equipmentDamage=d.equipment.duelDamage;s.duel.ally.retreatSpeed=d.equipment.retreatSpeed;if(d.equipment.healRatio>0)s.duel.ally.emergencyHeal={threshold:d.equipment.healThreshold,ratio:d.equipment.healRatio,used:false};}
  s.speech=structuredClone(n.opening);
 }else if(n.kind==='check'){const roll=((Math.imul(n.seed,1664525)+1013904223)>>>0)%21-10,total=s.stats[n.attr]+(d.checkBonuses?.[n.tag]??0)+roll;s.log.push('檢定 '+n.tag+'：'+total+'/'+n.dc);enter(d,s,total>=n.dc?n.next.win:n.next.lose,hops+1);
 }else if(n.kind==='debate'){s.rally=createRally(n.ally,n.enemy,n.seed);
 }else if(n.kind==='reward'&&!s.granted.includes(n.reward.id)){
  const r=n.reward;s.granted.push(r.id);s.gold+=r.gold;
  for(const k of ['lead','war','int','pol'] as const)s.stats[k]=Math.min(d.statCap,s.stats[k]+r.allStats);
  s.items=[...new Set([...s.items,...r.items])];s.unlocks=[...new Set([...s.unlocks,...r.unlocks])];s.log.push(r.title);
 }
}
export function createStoryRun(d:BattleStory):StoryRun {
 const s:StoryRun={node:d.entry,revision:0,line:0,duel:null,aiRng:0,speech:[],speechIndex:0,seenCues:[],stats:{...d.playerStats},gold:0,items:[],unlocks:[],granted:[],log:[],visited:[]};enter(d,s,d.entry);return s;
}
export function storySpeech(d:BattleStory,s:StoryRun):StoryLine|undefined {
 const n=d.nodes[s.node]!;return n.kind==='dialogue'?n.lines[s.line]:s.speech[s.speechIndex];
}
/** Revision is a one-use input token: double clicks cannot skip dialogue or grant twice. */
export function advanceStory(d:BattleStory,s:StoryRun,revision:number,choice?:string):boolean {
 if(s.revision!==revision)return false;const n=d.nodes[s.node]!;
 if(n.kind==='dialogue'){s.line++;if(s.line>=n.lines.length)enter(d,s,n.next);}
 else if(n.kind==='choice'){const option=n.options.find(o=>o.id===choice);if(!option)return false;enter(d,s,option.next);}
 else if(n.kind==='reward')enter(d,s,n.next);
 else if(n.kind==='combat'){
  if(storySpeech(d,s))s.speechIndex++;
  else if(s.duel?.result)enter(d,s,n.next[s.duel.result==='ally'?'win':s.duel.result==='enemy'?'lose':'draw']);
  else return false;
 }else if(n.kind==='debate'&&s.rally?.winner)enter(d,s,n.next[s.rally.winner==='ally'?'win':'lose']);
 else return false;
 s.revision++;return true;
}
/** NPC chooses from public stamina/taunt state; never reads the committed enemy action. */
function autoAction(s:StoryRun,n:StoryCombat):DuelAction|null {
 const f=s.duel!.ally;if(f.fainted)return null;
 const legal=DUEL_ACTIONS.filter(a=>!actionBlock(f,a));
 s.aiRng=(Math.imul(s.aiRng,1664525)+1013904223)>>>0;
 let r=s.aiRng/0x100000000*legal.reduce((sum,a)=>sum+n.aiWeights[a],0);
 for(const a of legal){r-=n.aiWeights[a];if(r<0)return a;}return legal.at(-1)??'rest';
}
export function stepStoryCombat(d:BattleStory,s:StoryRun,revision:number,action?:DuelAction):boolean {
 const n=d.nodes[s.node]!;if(s.revision!==revision||n.kind!=='combat'||!s.duel||s.duel.result||storySpeech(d,s))return false;
 const a=n.mode==='auto'?autoAction(s,n):s.duel.ally.fainted?null:action;
 if(a===undefined||!resolveDuel(s.duel,a))return false;
 const t=s.duel.last!;s.log.push(`${d.actors[n.ally.actor]!.name}：${t.ally?ACTION_NAME[t.ally]:'昏厥'}／${d.actors[n.enemy.actor]!.name}：${t.enemy?ACTION_NAME[t.enemy]:'昏厥'}（傷害 ${t.damageToEnemy}／${t.damageToAlly}）`);
 const cue=n.cues.find(c=>!s.seenCues.includes(c.id)&&(c.round===undefined||s.duel!.round>=c.round)&&(c.enemyHealthBelow===undefined||duelHealth(s.duel!.enemy)/s.duel!.enemy.injuryLimit<=c.enemyHealthBelow));
 if(cue){s.seenCues.push(cue.id);s.speech=structuredClone(cue.lines);s.speechIndex=0;}
 s.revision++;return true;
}

export function answerStoryDebate(d:BattleStory,s:StoryRun,side:RallySide,action:RallyAction):boolean {
 if(d.nodes[s.node]?.kind!=='debate'||!s.rally||s.rally.winner)return false;
 if(!actRally(s.rally,side,action))return false;s.revision++;return true;
}
