import type {DuelAction,DuelBuild,DuelState} from './duel.js';

export interface StoryLine {speaker:string;text:string;thought?:boolean}
export interface StoryActor {name:string;art:string;build:DuelBuild}
export interface StoryModifier {label:string;power?:number;attack?:number}
export interface StoryCombatant {actor:string;health:number;modifiers:StoryModifier[]}
export interface StoryCue {id:string;round?:number;enemyHealthBelow?:number;lines:StoryLine[]}
export interface StoryCombat {
 kind:'combat';title:string;mode:'auto'|'player';ally:StoryCombatant;enemy:StoryCombatant;
 seed:number;aiSeed:number;aiWeights:Record<DuelAction,number>;opening:StoryLine[];cues:StoryCue[];
 next:{win:string;lose:string;draw:string};
}
export interface StoryReward {id:string;title:string;allStats:number;gold:number;items:string[];unlocks:string[]}
export type StoryNode =
 | {kind:'check';attr:'lead'|'war'|'int'|'pol';tag:string;dc:number;seed:number;next:{win:string;lose:string}}
 | {kind:'dialogue';lines:StoryLine[];next:string}
 | {kind:'choice';prompt:string;options:{id:string;label:string;detail:string;next:string}[]}
 | StoryCombat
 | {kind:'debate';title:string;ally:import('./debate-rally.js').RallyBuild;enemy:import('./debate-rally.js').RallyBuild;enemyName:string;seed:number;next:{win:string;lose:string}}
 | {kind:'reward';reward:StoryReward;next:string}
 | {kind:'end';title:string;text:string};
export interface BattleStory {
 progressMarks?:{visited:Record<string,string>;rewards:Record<string,string>};
 checkBonuses?:Record<string,number>;
 requirements?: readonly import('./story.js').StoryRequirement[];
 returnToBattle?:boolean;
 intel?:string;
 equipment?:{duelDamage:number;retreatSpeed:number;healThreshold:number;healRatio:number};
 version:1;id:string;title:string;subtitle:string;entry:string;
 field:{troops:number;enemy:string;wave:number};
 playerStats:Record<'lead'|'war'|'int'|'pol',number>;statCap:number;
 actors:Record<string,StoryActor>;nodes:Record<string,StoryNode>;
}
export interface StoryRun {
 rally?:import('./debate-rally.js').RallyState|null;
 healed?:boolean;
 node:string;revision:number;line:number;duel:DuelState|null;aiRng:number;
 speech:StoryLine[];speechIndex:number;seenCues:string[];
 stats:BattleStory['playerStats'];gold:number;items:string[];unlocks:string[];granted:string[];
 log:string[];visited:string[];
}

export interface StoryField {encounter:import('./confrontation.js').EncounterDemo;story:StoryRun;mode:'field'|'story'|'finished';triggered:boolean;paused:boolean;combatNode:string|null;outcome:'ally'|'enemy'|'draw'|null;contactTime:number|null;}
