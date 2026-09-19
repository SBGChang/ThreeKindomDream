import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Spotlight, spotlightTarget} from '../../src/ui/Spotlight.js';

// Memory-only native-browser fixture: no game boot or persistence.
function Probe() {
  const [active, setActive] = useState(false), [mode, setMode] = useState<'dim'|'lock'>('lock');
  const [visible, setVisible] = useState(true), [count, setCount] = useState(0), [outside, setOutside] = useState(0);
  const [text, setText] = useState(''), [amount, setAmount] = useState(20);
  return <main>
    <style>{`
      body{margin:0;background:#193c42;color:#fff;font:16px sans-serif}
      main{padding:25px}button,input,select{font:inherit;margin:6px;padding:8px}
      .probe-stage{position:relative;width:800px;height:640px;margin:25px;transform:scale(.8);transform-origin:0 0;container-type:inline-size;overflow:hidden;isolation:isolate}
      .probe-grid{display:flex;align-items:flex-start;gap:24px;padding:50px 25px}
      .probe-card{flex:0 0 380px;padding:18px;box-sizing:border-box;transform:rotate(-7deg);background:#efd9ab;color:#312016;border:3px solid #b67c38;font-size:2cqw}
      .probe-card input{max-width:85%}.probe-summary{position:absolute;right:25px;top:455px;width:130px;padding:15px;background:#e7be6b;color:#302018}
      @media(max-width:1000px){.probe-stage{transform:scale(.65)}}
    `}</style>
    <section className="probe-stage">
      <label>模式<select aria-label="高光模式" value={mode} onChange={e=>setMode(e.target.value as 'dim'|'lock')}><option value="lock">鎖定</option><option value="dim">壓暗</option></select></label>
      <button onClick={()=>setActive(true)}>啟動高光</button>
      <button onClick={()=>setOutside(n=>n+1)}>外部 {outside}</button>
      <div className="probe-grid">
        {visible&&<article className="probe-card" {...spotlightTarget(active)}>
          <strong>原物件與原生控制項</strong>
          <label htmlFor="probe-text">文字<input id="probe-text" name="probe-text" aria-label="保留文字" value={text} onChange={e=>setText(e.target.value)}/></label>
          <input type="range" aria-label="數量" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><output>{amount}</output>
          <div {...spotlightTarget(active)}><button onClick={()=>setCount(n=>n+1)}>計數 {count}</button></div>
          <button onClick={()=>setActive(false)}>結束高光</button>
          <button onClick={()=>setVisible(false)}>卸載目標</button>
        </article>}
        <div className="probe-neighbor">固定相鄰物件</div>
      </div>
      {visible&&<aside className="probe-summary" {...spotlightTarget(active)}><button onClick={()=>setCount(n=>n+1)}>另一目標 {count}</button></aside>}
      <Spotlight active={active} mode={mode}/>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Probe/>);
