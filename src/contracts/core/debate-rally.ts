export type RallySide='ally'|'enemy';
export type RallyColor='reason'|'evidence'|'presence';
export type RallySpecial='induct'|'shout'|'concentrate'|'reflect'|'wild';
export type RallyPassive='composure'|'eloquence'|'precision'|'adaptable'|'momentum'|'resourceful'|'renewal'|'scholar';
export interface RallyBuild {int:number;pol:number;special:RallySpecial|null;passives:RallyPassive[]}
export type RallyCard={id:number;kind:'normal';color:RallyColor;value:number}|{id:number;kind:'special';special:RallySpecial};
export interface RallyFighter {build:RallyBuild;heart:number;maxHeart:number;hand:RallyCard[];combo:number;double:boolean;reflect:boolean;wild:boolean;skip:boolean}
export interface RallyEvent {side:RallySide;kind:'normal'|'special'|'pass'|'restart';card:RallyCard|null;damage:number;reflected:boolean;before:Record<RallySide,number>;after:Record<RallySide,number>;combo:number}
export interface RallyState {ally:RallyFighter;enemy:RallyFighter;turn:RallySide;table:Extract<RallyCard,{kind:'normal'}>|null;rng:number;nextId:number;turnNumber:number;restarts:number;specialUsed:boolean;lastPass:RallySide|null;last:RallyEvent|null;history:RallyEvent[];winner:RallySide|null}
export type RallyAction={kind:'normal';id:number}|{kind:'special';id:number;targets?:number[]}|{kind:'pass'};
