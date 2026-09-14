import { useEffect, useRef, useState } from 'react';
import type { UnitClip } from './unit-motion.js';
import './unit-sequence-review.css';

const sequences: Record<UnitClip, { title: string; duration: number; loop: boolean; poses: readonly string[] }> = {
  charge: { title: '騎兵衝鋒', duration: .8, loop: true, poses: ['伸展騰空', '前腿下探', '前蹄觸地', '重心前移', '後腿前收', '蜷腿騰空', '蓄力收攏', '後蹄下探', '後蹄著地', '後腿蹬地', '推進離地', '前腿伸出', '身體上提', '再次伸展', '迎向下一步', '銜接起勢'] },
  ignite: { title: '工兵點火', duration: 1.2, loop: false, poses: ['持火準備', '屈膝下沉', '蹲身前探', '火把下壓', '貼近引線', '觸地點燃', '收回火把', '點火完成'] },
  volley: { title: '弓箭手射箭', duration: 1, loop: false, poses: ['搭箭準備', '舉弓', '拉弦', '蓄力瞄準', '滿弓', '鬆弦放箭', '順勢收手', '射擊完成'] },
};
const framePath = (clip: UnitClip, frame: number) => `./art/units/sequences-v2/${clip}/${String(frame+1).padStart(2,'0')}.png`;
export function UnitSequenceReview(): React.ReactElement {
  const [clip, setClip] = useState<UnitClip>('charge');
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [size, setSize] = useState('small');
  const [backdrop, setBackdrop] = useState('scene');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const elapsed = useRef(0);
  const data = sequences[clip];
  const count = data.poses.length;
  const { loop } = data;
  const seek = (next: number) => { const value = loop ? (next + count) % count : Math.max(0, Math.min(count-1, next)); elapsed.current = value * data.duration/count; setFrame(value); setPlaying(false); };
  const replay = () => { elapsed.current = 0; setFrame(0); setPlaying(true); };
  const choose = (next: UnitClip) => { if(next !== clip){setClip(next);setReady(false);setFailed(false);} setFrame(0); elapsed.current = 0; setPlaying(true); };
  useEffect(() => {
    let alive = true;
    setReady(false); setFailed(false);
    void Promise.all(Array.from({ length: count }, (_, index) => new Promise<void>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(); img.onerror = reject; img.src = framePath(clip,index);
    }))).then(() => { if (alive) setReady(true); }).catch(() => { if (alive) { setFailed(true); setPlaying(false); } });
    return () => { alive = false; };
  }, [clip, count]);
  useEffect(() => {
    if (!ready || !playing) return;
    let raf = 0, previous = performance.now();
    const draw = (now: number) => {
      elapsed.current += Math.min(.1, (now - previous)/1000) * speed; previous = now;
      if (elapsed.current >= data.duration) {
        if (loop) elapsed.current %= data.duration;
        else { elapsed.current = data.duration; setFrame(count-1); setPlaying(false); return; }
      }
      setFrame(Math.min(count-1, Math.floor(elapsed.current / data.duration * count)));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [ready, playing, speed, loop, data.duration, count]);
  useEffect(() => { const hide = () => { if (document.hidden) setPlaying(false); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, []);
  return <main className="sequence-review">
    <header className="sequence-heading"><div><small>三國夢 · 序列動畫 第二版</small><h1>單位動作試映</h1></div><a href="?art=battle-demo">進入即時戰鬥 Demo →</a></header>
    <nav className="sequence-tabs" aria-label="選擇動作">{(Object.keys(sequences) as UnitClip[]).map(key => <button key={key} aria-pressed={clip === key} onClick={() => choose(key)}>{sequences[key].title}<small>{sequences[key].poses.length} 張 · {sequences[key].loop ? '循環' : '單次'}</small></button>)}</nav>
    <section className={`sequence-stage backdrop-${backdrop}`} aria-label="序列動畫預覽">
      <div className="sequence-stage-title"><b>{data.title}</b><span>{data.poses[frame]}</span></div>
      <div className="sequence-view-options"><label>背景<select aria-label="預覽背景" value={backdrop} onChange={e => setBackdrop(e.target.value)}><option value="dark">深色</option><option value="light">淺色</option><option value="scene">營地</option></select></label><label>大小<select aria-label="角色大小" value={size} onChange={e => setSize(e.target.value)}><option value="large">放大檢查</option><option value="small">戰場比例</option></select></label></div>
      {failed ? <p className="sequence-loading" role="alert">動作素材載入失敗，請重新整理。</p> : !ready ? <p className="sequence-loading">載入 {count} 格素材…</p> : <div className={`sequence-unit size-${size}`}><span className="sequence-shadow"/>{Array.from({length:count},(_,i)=><img key={`${clip}-${i}`} src={framePath(clip,i)} className={frame===i?'current':''} alt={frame===i?`${data.title}，第 ${i+1} 格`:''} aria-hidden={frame!==i} draggable={false}/>)}</div>}
      <div className="sequence-stage-foot"><span>{loop ? '連續衝鋒 · 第 16 格接回第 1 格' : !playing && frame===count-1 ? '動作完成 · 停留收勢' : '播放一次 · 結尾停格'}</span><output>第 {frame+1} / {count} 格</output></div>
    </section>
    <section className="sequence-controls" aria-label="序列播放控制"><button className="sequence-play" disabled={!ready} onClick={() => { if (playing) setPlaying(false); else { if(elapsed.current>=data.duration){elapsed.current=0;setFrame(0);} setPlaying(true); } }}>{playing ? '暫停' : '播放'}</button><button aria-label="上一格" disabled={!ready || (!loop && frame===0)} onClick={() => seek(frame-1)}>◀ 上一格</button><button aria-label="下一格" disabled={!ready || (!loop && frame===count-1)} onClick={() => seek(frame+1)}>下一格 ▶</button><button disabled={!ready} onClick={replay}>重新播放</button><label>速度<select aria-label="播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option></select></label><span>{(data.duration/speed).toFixed(2)} 秒／{loop ? '循環' : '次'}</span><a href={`./art/units/sequences-v2/${clip}-atlas.png`} download>下載 {count} 格圖集</a></section>
    <section className={`sequence-filmstrip frames-${count}`} aria-label={`${count} 張動作逐格對照`}>{data.poses.map((name,i)=><button key={i} onClick={() => seek(i)} aria-pressed={frame===i} aria-label={`第 ${i+1} 格：${name}`}><span className="sequence-thumbnail"><img src={framePath(clip,i)} alt="" draggable={false}/></span><b>{String(i+1).padStart(2,'0')}</b><span>{name}</span></button>)}</section>
    <footer className="sequence-note">{loop ? '點選任一格可停格檢查；騎兵持續循環衝鋒。' : '動作只播一次；可按「重新播放」再看一次。'}<a href="./art/units/unit-sequences-v2.zip" download>下載全部 32 張素材</a></footer>
  </main>;
}
