import type { NotableDef } from '../src/contracts/core/definitions.js';
import { skillId,traitId } from '../src/contracts/core/ids.js';
/** New teaching repertoire, while the old skill definitions remain valid in existing saves. */
const lessons:Record<string,readonly string[]>={
 caocao:['pincer','inspire','lure'],zhangliao:['cavalry','pursue','sweep'],yujin:['longshot','shield','reform'],xiahoudun:['cavalry','pursue','sweep'],dianwei:['cavalry','shield','sweep'],lejin:['pincer','toinfantry','crossbow'],guojia:['infighting','rocks','ambush'],jiaxu:['infighting','taunt','turncoat'],chengyu:['misreport','water','thunder'],xunyu:['misreport','reform','reinforce'],chenqun:['misreport','toarcher','divide'],maojie:['longshot','toinfantry','reinforce'],
 liubei:['pincer','inspire','reinforce'],guanyu:['cavalry','pursue','sweep'],zhangfei:['pincer','taunt','sweep'],zhaoyun:['cavalry','mounted','crossbow'],zhugeliang:['fire','water','thunder'],jiangwan:['misreport','reform','reinforce'],
 sunjian:['pincer','shield','sweep'],sunce:['cavalry','pursue','ambush'],sunquan:['longshot','inspire','reinforce'],zhouyu:['fire','water','thunder'],lusu:['misreport','reform','divide'],lumeng:['infighting','toarcher','turncoat'],luxun:['fire','rocks','lure'],taishici:['cavalry','mounted','crossbow'],ganning:['cavalry','volley','ambush'],huanggai:['pincer','shield','reinforce'],zhangzhao:['misreport','taunt','divide'],buzhi:['longshot','toinfantry','reinforce']};
const triggers=['backwater','breakline','hunters','fervor','frugal','aftershock','relief','laststand','sighting','exploit','drill','supply'];
export function withTactics(n:NotableDef):NotableDef {
 const slug=String(n.notableId).replace('notable:',''),list=lessons[slug];if(!list)return n;
 const index=Object.keys(lessons).indexOf(slug);
 return {...n,abilities:{...n.abilities,skills:list.map((id,i)=>({star:[0,2,4][i]!,skillId:skillId('skill:tactic-'+id)})),traits:[...n.abilities.traits,traitId('trait:trigger-'+triggers[index%triggers.length])]}};
}
