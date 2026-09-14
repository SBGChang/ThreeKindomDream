import { useState } from 'react';
import type { MetaState } from '../contracts/core/state.js';
export type MetaView = 'destiny' | 'entry' | 'shop' | 'notables' | 'items';
export function ScreenDestiny({meta,onGo,onReset,onResume}:{readonly meta:MetaState; readonly onGo:(v:MetaView)=>void;readonly onReset:()=>void; readonly onResume?:()=>void}):React.ReactElement {
 const [reset,setReset]=useState(false);
 return <div className="title-screen"><div className="title-inscription"><span>一夢三國 · 萬世留名</span><h1>三國夢</h1><p>山河未定，此生由你落筆。</p><small>魏 國 篇</small></div><div className="title-menu"><button className="primary" onClick={onResume ?? (()=>onGo('entry'))}>{onResume ? '繼續遊戲' : `入夢 · 第 ${meta.runIndex+1} 世`}</button><button onClick={()=>onGo('notables')}>故人 · 風雲錄</button><button onClick={()=>onGo('shop')}>天命 · 輪迴養成</button><span>已走過 {meta.runIndex} 世　·　已見 {meta.collection.reachedEndings.length} 種結局</span></div>{!onResume && <button className="reset-save" onClick={()=>setReset(true)}>存檔管理</button>}{reset&&<div className="game-modal" role="dialog" aria-modal="true" aria-label="存檔管理"><div className="settings-paper"><h2>清除輪迴記憶？</h2><p>所有天命、名士記憶與結局紀錄都會清除。</p><button autoFocus onClick={()=>setReset(false)}>保留存檔</button><button className="danger" onClick={()=>{onReset();setReset(false);}}>確定清除</button></div></div>}</div>;
}
