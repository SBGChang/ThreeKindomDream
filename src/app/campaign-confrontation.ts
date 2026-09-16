import type {RunContext} from '../contracts/core/context.js';
import type {BattleState} from '../contracts/core/realtime-battle.js';
import type {DuelBuild,DuelParticipant,DuelTrait} from '../contracts/core/duel.js';
import type {EncounterProgress} from '../contracts/core/confrontation.js';
import type {TraitId} from '../contracts/core/ids.js';
import {activeTraits,traitDef} from '../modules/ability.js';
import {statQuery} from '../modules/stats.js';
import * as campaign from '../modules/campaign.js';
import {createEncounterDemo} from './confrontation-demo.js';
import {duelActorForName} from '../contracts/core/duel-art.js';

/** Actual selected army and learned traits drive the same encounter used by fixtures. */
export function campaignConfrontation(ctx:RunContext,battle:BattleState):EncounterProgress {
 const trait=(ids:readonly TraitId[]):DuelTrait=>ids.map(id=>traitDef(id,ctx).duelTrait).find(Boolean)??'none';
 const protagonist:DuelParticipant={id:'lord',name:'主角',build:{war:statQuery.attr('war',ctx),lead:statQuery.attr('lead',ctx),trait:trait(activeTraits(ctx))}};
 const candidates=[protagonist,...(ctx.state.campaign?.loadout?.commanders??[]).map(slot=>{const n=ctx.defs.reader('notable').get(String(slot.notableId));return {id:n.duelArtId??duelActorForName(ctx.defs.text(String(n.nameKey))),name:ctx.defs.text(String(n.nameKey)),build:{war:n.abilities.attrs.war,lead:n.abilities.attrs.lead,trait:trait(n.abilities.traits)}};})];
 const ally=candidates.reduce((best,p)=>p.build.war>best.build.war?p:best);
 const generic=ctx.defs.single('battleRule').duel.genericByChapter[Math.min(ctx.state.progress.chapter-1,ctx.defs.single('battleRule').duel.genericByChapter.length-1)]!;
 const waveOpponents=campaign.stageRows(ctx).map((_,i)=>{const row=campaign.nextStagePreview(ctx,i)!,boss=row.boss,name=boss?ctx.defs.text(String(boss.nameKey)):'陣營指揮官';const build:DuelBuild={war:boss?.attrs.war??generic,lead:boss?.attrs.lead??generic,trait:'none'};return {id:boss?.duelArtId??duelActorForName(name),name,build};});
 const enemy=waveOpponents[0]!;const runtime=createEncounterDemo('campaign',(ctx.state.seed+ctx.state.progress.chapter*7919)>>>0,{ally:ally.build,enemy:enemy.build},{ally,enemy});
 const {battle:unused,...progress}=runtime;void unused;
 return {...progress,waveOpponents,waveSeen:battle.wave};
}
