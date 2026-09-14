import { useEffect, useRef, useState } from 'react';
import { CLIPS, clamp, phaseAt, type UnitClip } from './unit-motion.js';
import { UnitRigArt } from './UnitRigArt.js';
import './unit-motion-review.css';

const notes: Record<UnitClip, string> = {
  charge: '騎手坐骨固定於馬鞍。馬匹前後腿分層，四足錯相跑動；槍、手與護腕共用握持位置。',
  ignite: '雙腳保留落地點，屈膝後伸手。火把固定於手掌，接觸引線後點燃，再收手起身。',
  volley: '握弓手固定弓柄，另一手拉弦。蓄力停頓後鬆弦，箭離弦飛出，弓弦回彈再收勢。',
};
export function UnitMotionReview(): React.ReactElement {
  const [clip, setClip] = useState<UnitClip>('charge');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [bones, setBones] = useState(false);
  const [grid, setGrid] = useState(false);
  const [light, setLight] = useState(false);
  const [scale, setScale] = useState(1.25);
  const clock = useRef(0);
  const duration = CLIPS[clip].duration;
  const seek = (value: number) => { clock.current = clamp(value, 0, duration); setTime(clock.current); setPlaying(false); };
  const play = () => { if (clock.current >= duration) { clock.current = 0; setTime(0); } setPlaying(true); };
  const choose = (next: UnitClip) => { setClip(next); clock.current = 0; setTime(0); setPlaying(false); };
  useEffect(() => {
    if (!playing) return;
    let raf = 0, previous = performance.now();
    const draw = (now: number) => {
      clock.current += Math.min((now - previous) / 1000, .1) * speed;
      previous = now;
      if (clock.current >= duration) {
        if (loop) clock.current %= duration;
        else { clock.current = duration; setTime(duration); setPlaying(false); return; }
      }
      setTime(clock.current); raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, speed, loop]);
  useEffect(() => { const hide = () => { if (document.hidden) setPlaying(false); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, []);
  return <main className="unit-review">
    <header className="unit-review-heading"><div><span>三國夢 · 動作試作</span><h1>單位演武場</h1></div><a href="./">返回遊戲</a></header>
    <div className="unit-review-tabs" role="group" aria-label="選擇單位動作">{(Object.keys(CLIPS) as UnitClip[]).map((key, i) => <button key={key} aria-pressed={clip === key} onClick={() => choose(key)}><small>0{i+1}</small>{CLIPS[key].name}<span>{CLIPS[key].duration.toFixed(1)} 秒</span></button>)}</div>
    <section className={`unit-review-stage ${light ? 'light' : ''}`} aria-label="單位動作預覽">
      <div className="unit-stage-label"><span>{CLIPS[clip].name}</span><b>{phaseAt(clip, time)}</b></div>
      <div className="unit-stage-tools"><button aria-pressed={light} onClick={() => setLight(!light)}>深／淺底</button><button aria-pressed={grid} onClick={() => setGrid(!grid)}>格線</button><button aria-pressed={bones} onClick={() => setBones(!bones)}>骨架</button><label>顯示比例<select aria-label="顯示比例" value={scale} onChange={e => setScale(Number(e.target.value))}><option value=".55">戰場大小</option><option value="1">原尺寸</option><option value="1.25">放大檢查</option></select></label></div>
      <UnitRigArt clip={clip} time={time} bones={bones} light={light} grid={grid} scale={scale}/>
      <div className="unit-stage-caption">{bones ? '青色：骨骼與樞軸' : '2D 分件骨架 · 無遮罩特效'}<span>{playing ? '播放中' : time >= duration ? '動作結束' : '已暫停'}</span></div>
    </section>
    <section className="unit-playback" aria-label="動畫播放控制">
      <div className="unit-playback-main"><button className="unit-play" onClick={() => playing ? setPlaying(false) : play()}>{playing ? '暫停' : time >= duration ? '重播動作' : '播放動作'}</button><button aria-label="重設至第一格" onClick={() => seek(0)}>回到開頭</button><button aria-label="上一格" onClick={() => seek(time - 1/30)}>◀ 上一格</button><button aria-label="下一格" onClick={() => seek(time + 1/30)}>下一格 ▶</button><label>速度<select aria-label="播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value=".25">0.25× 慢放</option><option value=".5">0.5× 慢放</option><option value="1">1× 正常</option></select></label><button aria-pressed={loop} onClick={() => setLoop(!loop)}>循環</button><output>{time.toFixed(2)} / {duration.toFixed(2)} 秒</output></div>
      <input type="range" aria-label="動作時間軸" min="0" max={duration} step={1/60} value={time} onChange={e => seek(Number(e.target.value))}/>
      <div className="unit-phase-marks">{CLIPS[clip].phases.map(([at, text]) => <button key={at} aria-label={`跳到${text}`} aria-pressed={phaseAt(clip, time) === text} onClick={() => seek(at)}><small>{at.toFixed(2)}s</small>{text}</button>)}</div>
    </section>
    <p className="unit-review-note">{notes[clip]}<span>本頁為可操作的自製骨架原型，並非 Spine 專案檔；不讀寫遊戲存檔。</span></p>
  </main>;
}
