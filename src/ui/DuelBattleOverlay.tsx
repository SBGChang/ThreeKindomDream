import type {Contest} from '../app/confrontation-demo.js';
import {DuelInterface} from './DuelHud.js';
import './confrontation-demo.css';
export function DuelBattleOverlay({contest:c,paused,onAnswer,onHelpChange}:{contest:Contest;paused:boolean;onAnswer:(choice:number)=>void;onHelpChange:(open:boolean)=>void}):React.ReactElement {
 return <>
 {c.duel&&<DuelInterface contest={c} paused={paused} onAnswer={onAnswer} onHelpChange={onHelpChange}/>}
 {c.phase==='verdict'&&<div className={`ct-verdict ${c.winner==='ally'?'ct-win':'ct-lose'}`}><span>{c.draw?'和':c.winner==='ally'?'勝':'敗'}</span><strong>{c.draw?'各自歸陣':c.winner==='ally'?'一戰破陣':'敗退收軍'}</strong></div>}</>;
}
