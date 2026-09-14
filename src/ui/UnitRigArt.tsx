import { useId } from 'react';
import { add, archerPose, ease, engineerPose, horsePose, mix, rotate, solveLimb, type Point, type UnitClip } from './unit-motion.js';

type Limb = ReturnType<typeof solveLimb>;
const deg = (n: number) => n * 180 / Math.PI;
const tr = (p: Point) => `translate(${p.x} ${p.y})`;

function Bones({ limb }: { limb: Limb }) {
  return <g className="unit-bones" fill="none" stroke="#74ffe0" strokeWidth="2"><path d={`M${limb.start.x},${limb.start.y}L${limb.joint.x},${limb.joint.y}L${limb.end.x},${limb.end.y}`}/>{[limb.start, limb.joint, limb.end].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#153945"/>)}</g>;
}
function Link({ a, b, width, fill, armor = true }: { a: Point; b: Point; width: number; fill: string; armor?: boolean }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return <g transform={`${tr(a)} rotate(${deg(Math.atan2(b.y - a.y, b.x - a.x))})`}>
    <path d={`M0 ${-width}Q${len * .6} ${-width - 3} ${len} ${-width * .7}Q${len + width * .65} 0 ${len} ${width * .7}Q${len * .5} ${width + 3} 0 ${width}Q${-width} 0 0 ${-width}Z`} fill={fill}/>
    {armor && <><path d={`M${len * .3} ${-width}L${len * .33} ${width}M${len * .62} ${-width}L${len * .65} ${width}`} fill="none" stroke="#bd9147" strokeWidth="3"/><path d={`M8 ${-width + 4}L${len - 7} ${-width * .7 + 4}`} fill="none" stroke="#89b9c8" strokeWidth="2" opacity=".6"/></>}
  </g>;
}
function Arm({ limb, id, far = false, bones }: { limb: Limb; id: string; far?: boolean; bones: boolean }) {
  return <g data-part="arm" stroke="#281b16" strokeWidth="3.5" strokeLinejoin="round">
    <Link a={limb.start} b={limb.joint} width={13} fill={`url(#${id}-${far ? 'blueDark' : 'blue'})`}/>
    <circle cx={limb.joint.x} cy={limb.joint.y} r="11" fill="#22394c"/>
    <Link a={limb.joint} b={limb.end} width={10} fill={`url(#${id}-gold)`}/>
    <g transform={tr(limb.end)}><path d="M-10-6Q-7-14 2-12L11-6Q17 4 6 12L-4 11Q-15 6-10-6Z" fill={`url(#${id}-skin)`}/><path d="M-2-6L5-1M-4 0L4 5" stroke="#9c5832" strokeWidth="1.5"/></g>
    {bones && <Bones limb={limb}/>}
  </g>;
}
function Leg({ limb, id, far = false, bones, horse = false }: { limb: Limb; id: string; far?: boolean; bones: boolean; horse?: boolean }) {
  return <g data-part={horse ? 'horse-leg' : 'leg'} stroke="#281b16" strokeWidth="3.5" strokeLinejoin="round">
    <Link a={limb.start} b={limb.joint} width={horse ? 13 : 17} fill={`url(#${id}-${horse ? far ? 'horseDark' : 'horse' : 'blueDark'})`} armor={!horse}/>
    <circle cx={limb.joint.x} cy={limb.joint.y} r={horse ? 10 : 14} fill={horse ? '#9c6340' : '#a98645'}/>
    <Link a={limb.joint} b={limb.end} width={horse ? 8 : 12} fill={`url(#${id}-${horse ? 'horse' : 'blue'})`} armor={!horse}/>
    <g transform={tr(limb.end)}>{horse ? <path d="M-10-10L9-9 16 4Q1 11-14 5Z" fill="#38353b"/> : <><path d="M-12-11L10-10 13-1Q34 0 32 13L-16 13Q-18 3-12-11Z" fill="#423933"/><path d="M-12-6L10-5 16 1-13 2Z" fill={`url(#${id}-gold)`}/><path d="M-15 10L31 10" stroke="#cab382" strokeWidth="2"/></>}</g>
    {bones && <Bones limb={limb}/>}
  </g>;
}
function Head({ id, tilt = 0, plume = 0, worker = false }: { id: string; tilt?: number; plume?: number; worker?: boolean }) {
  return <g transform={`translate(0 -4) rotate(${tilt})`} data-part="head" stroke="#261b17" strokeWidth="3.5" strokeLinejoin="round">
    {!worker && <g transform={`rotate(${plume} -20 -106)`}><path d="M-10-116Q-27-173-88-145L-70-139Q-112-133-109-104L-81-111Q-109-99-97-78Q-52-105-23-93Z" fill={`url(#${id}-blue)`}/><path d="M-24-121Q-56-143-83-131M-29-110Q-67-122-89-107" stroke="#6797cd" strokeWidth="3" fill="none"/></g>}
    <path d="M-42-77Q-60-27-27-11L28-10Q60-18 59-58L42-97Z" fill={`url(#${id}-skin)`}/>
    <path d="M-25-16Q17 0 45-19L32-9-16-7Z" fill="#ce8050" stroke="none"/>
    <path d="M-36-65Q-55-76-58-57Q-60-37-35-34" fill={`url(#${id}-skin)`}/><path d="M-45-59Q-51-60-47-47" fill="none" stroke="#af633d" strokeWidth="2"/>
    <path d="M-40-78Q-34-37-22-35L-20-63 5-89Z" fill="#3c2920"/>
    <path d="M-15-63Q-1-68 12-56L9-37Q-3-28-13-42Z" fill="#fffdf1"/><ellipse cx="3" cy="-49" rx="7" ry="12" fill="#362922" stroke="none"/><circle cx="5" cy="-53" r="3" fill="white" stroke="none"/>
    <path d="M25-59Q39-67 49-61L48-42Q33-33 27-42Z" fill="#fffdf1"/><ellipse cx="41" cy="-49" rx="6.5" ry="11" fill="#362922" stroke="none"/><circle cx="43" cy="-53" r="2.6" fill="white" stroke="none"/>
    <path d="M-17-70L14-62M24-63L50-72" stroke="#38231a" strokeWidth="7"/>
    <path d="M28-40L34-34 28-32M16-21Q27-16 36-24" stroke="#88492c" strokeWidth="2.5" fill="none"/>
    <path d="M-55-75Q-56-129-9-139Q42-141 57-91L52-77Q19-89-13-74L-39-54Z" fill={`url(#${id}-${worker ? 'blueDark' : 'metal'})`}/>
    <path d="M-51-87Q-1-108 52-87L55-75Q4-91-46-69Z" fill={`url(#${id}-gold)`}/>
    <path d="M-15-137Q-5-112-10-90L2-87Q12-120 1-139Z" fill={`url(#${id}-gold)`}/>
    <path d="M-40-111Q-32-126-23-127M19-124L32-111" fill="none" stroke="#a9c6d3" strokeWidth="4" opacity=".8"/>
    <path d="M-48-70L-58-37-38-25-27-52Z" fill={`url(#${id}-metal)`}/><path d="M-45-62L-48-40-39-36-34-53Z" fill="#244861" stroke="#c5a268" strokeWidth="2"/>
    <path d="M-4-105L5-118 16-105 7-88Z" fill={`url(#${id}-gold)`}/><path d="M4-106L8-112 12-105 8-99Z" fill="#4085a4" strokeWidth="1.5"/>
  </g>;
}
function Torso({ id, worker = false }: { id: string; worker?: boolean }) {
  return <g data-part="torso" stroke="#281b16" strokeWidth="3.5" strokeLinejoin="round">
    <path d="M-28-3Q-49 16-38 56L-49 86-18 97 0 76 30 95 45 80 32 51Q43 13 22-4Z" fill={`url(#${id}-blue)`}/>
    <path d="M-31 5L-26 50 30 50 27 2 0 18Z" fill={`url(#${id}-${worker ? 'leather' : 'metal'})`}/>
    {[22, 34, 46].map(y => <path key={y} d={`M-25 ${y}L28 ${y}M-15 ${y-8}V${y}M0 ${y-8}V${y}M15 ${y-8}V${y}`} stroke="#c7a466" strokeWidth="2" fill="none"/>)}
    <path d="M-39 52Q1 62 36 52L39 66Q-3 74-41 66Z" fill="#6c3d24"/>
    <path d="M-10 52L10 52 14 68-11 68Z" fill={`url(#${id}-gold)`}/><path d="M-3 57H6V64H-3Z" fill="#362a23" strokeWidth="1.5"/>
    <path d="M-30 70L-37 83-22 87-10 73M20 72L32 83 24 86 12 75" fill="none" stroke="#cca052" strokeWidth="3"/>
    <path d="M-25-6Q-5 5 22-6L20 9Q-2 25-25 9Z" fill="#b93e32"/><path d="M-14 14L-24 37-12 32-6 11" fill="#952c28"/>
  </g>;
}
function Shoulder({ id, x = 22, y = 9 }: { id: string; x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`} stroke="#281b16" strokeWidth="3"><path d="M-18-7Q0-27 20-5L19 12Q1 4-18 13Z" fill={`url(#${id}-gold)`}/><path d="M-12-4Q2-15 14-3L13 5-12 5Z" fill={`url(#${id}-blue)`}/><circle cx="2" cy="-2" r="3" fill="#ffdfa0" strokeWidth="1.5"/></g>;
}
function Flame({ t, size = 1 }: { t: number; size?: number }) {
  const sway = Math.sin(t * 22) * 3;
  return <g transform={`scale(${size})`} strokeLinejoin="round"><path d={`M0 2Q-22-10-8-30Q-9-18-2-22Q${sway+10}-37 1-54Q29-30 14-15Q27-21 23-5Q19 8 0 2Z`} fill="#e84c20" stroke="#862916" strokeWidth="2"/><path d={`M3 1Q-6-11 4-25L6-35Q18-19 11-9L17-13Q20 5 3 1Z`} fill="#ffb82b"/><path d="M6 0Q3-8 9-18Q15-6 12 0Z" fill="#fff3a6"/></g>;
}
function Bow({ id, pull }: { id: string; pull: number }) {
  const tip = -18 - Math.max(0, (pull - 16) / 73) * 13;
  return <g strokeLinejoin="round"><path d={`M${tip}-80Q38-52 5-13Q-4 0 5 13Q38 52 ${tip} 80L${tip+6} 69Q23 46-2 12Q-11 0-2-12Q23-46 ${tip+6}-69Z`} fill={`url(#${id}-gold)`} stroke="#342019" strokeWidth="3"/><path d={`M${tip}-79L${-pull} 0 ${tip} 79`} stroke="#fff0cc" strokeWidth="2" fill="none"/><path d="M-5-10L8-9 8 10-5 10Z" fill="#603624" stroke="#251a16" strokeWidth="2"/></g>;
}
function Arrow({ length = 160 }: { length?: number }) {
  return <g stroke="#34241a" strokeWidth="2" strokeLinejoin="round"><path d={`M0 0H${length}`} stroke="#e9cf8d" strokeWidth="3"/><path d={`M${length-1}-6L${length+17} 0 ${length-1} 6 ${length+3} 0Z`} fill="#e3e4ce"/><path d="M0 0L-9-8 13-5 22 0 13 5-9 8Z" fill="#b6d3d6"/></g>;
}

function Archer({ time, id, bones }: { time: number; id: string; bones: boolean }) {
  const p = archerPose(time);
  const near = solveLimb({ x: 22, y: 10 }, p.grip, 49, 49, 1);
  const far = solveLimb({ x: -19, y: 12 }, p.hand, 57, 58, -1);
  return <g transform="translate(420 319)" data-unit="archer">
    <Leg limb={solveLimb({ x: -18, y: 60 }, { x: -42, y: 151 }, 54, 55, 1)} id={id} far bones={bones}/>
    <Leg limb={solveLimb({ x: 18, y: 60 }, { x: 50, y: 151 }, 54, 55, -1)} id={id} bones={bones}/>
    <g transform="translate(-39 1) rotate(16)" stroke="#281b16" strokeWidth="3"><path d="M-16-32L16-32 18 49-17 49Z" fill="#65442d"/>{[-8, 0, 8].map(x => <path key={x} d={`M${x} 0V-65M${x}-51l-5-8M${x}-51l5-8`} stroke="#d3bd81" strokeWidth="3"/>)}</g>
    <Torso id={id}/><Head id={id} tilt={mix(1, -3, p.lift)} plume={p.recoil * .4}/><Arm limb={far} id={id} far bones={bones}/>
    <Arm limb={near} id={id} bones={bones}/><Shoulder id={id}/>
    <g transform={`${tr(near.end)} rotate(${deg(p.angle)})`}><Bow id={id} pull={p.pull}/>{!p.released && <g transform={`translate(${-p.pull} 0)`}><Arrow length={155}/></g>}</g>
    {/* Fingers pass in front of the grip; forearm and bow share the same solved endpoint. */}
    <path d={`M${near.end.x-4} ${near.end.y-4}l9 2m-9 3 9 2`} fill="none" stroke="#efbd83" strokeWidth="4" strokeLinecap="round"/>
    {p.released && time < 2.8 && <g transform={`translate(${12.6+(time-1.9)*930} ${-23.2-(time-1.9)*179}) rotate(${-deg(.19)})`}><Arrow length={155}/></g>}
    {bones && <g className="unit-bones"><circle cx="0" cy="-4" r="5"/><path d="M0-4V60"/></g>}
  </g>;
}

function Engineer({ time, id, bones }: { time: number; id: string; bones: boolean }) {
  const p = engineerPose(time);
  const world = (v: Point) => add(p.root, rotate(v, p.lean));
  const near = solveLimb({ x: 23, y: 9 }, p.hand, 54, 55, 1);
  const far = solveLimb({ x: -20, y: 9 }, { x: 5, y: 87 }, 49, 49, 1);
  const tip = add(world(near.end), rotate({ x: 70, y: 0 }, p.torchAngle));
  const contactPose = engineerPose(2.35);
  const contact = add(add(contactPose.root, rotate(contactPose.hand, contactPose.lean)), rotate({ x: 70, y: 0 }, contactPose.torchAngle));
  return <g data-unit="engineer">
    <path d={`M${contact.x} ${contact.y+7}Q${contact.x+35} ${contact.y+6} ${contact.x+76} ${contact.y+12}`} stroke="#675339" strokeWidth="5" fill="none"/>
    <Leg limb={solveLimb(world({ x: -19, y: 58 }), { x: 380, y: 470 }, 55, 56, -1)} id={id} far bones={bones}/>
    <Leg limb={solveLimb(world({ x: 19, y: 58 }), { x: 470, y: 470 }, 55, 56, -1)} id={id} bones={bones}/>
    <g transform={`${tr(p.root)} rotate(${deg(p.lean)})`}>
      <Arm limb={far} id={id} far bones={bones}/><Torso id={id} worker/><Head id={id} tilt={9 * p.crouch} worker/>
      <path d="M-32 31L-54 28-58 62-34 68Z" fill="#8c6338" stroke="#281b16" strokeWidth="3"/><path d="M-47 33L-39 34-42 51-50 49Z" fill="#e1b465" stroke="#281b16" strokeWidth="2"/>
      <Arm limb={near} id={id} bones={bones}/><Shoulder id={id}/>
    </g>
    <g transform={`${tr(world(near.end))} rotate(${deg(p.torchAngle)})`} stroke="#301e16" strokeWidth="3"><path d="M-15-4H60L63 4H-15Z" fill="#ab7440"/><path d="M52-8L74-10 77 9 52 8Z" fill="#d3b689"/><path d="M55-7L58 7M63-8L66 8M70-9L73 8" fill="none" stroke="#6e4c30" strokeWidth="2"/></g>
    <g transform={tr(tip)}><Flame t={time} size={.68}/></g>
    {p.lit && <g transform={`translate(${contact.x + Math.min(65, (time-2.35)*36)} ${contact.y+5})`}><Flame t={time} size={.36}/><circle r="8" fill="#ffb52a" opacity=".2"/></g>}
    {bones && <g className="unit-bones"><circle cx={contact.x} cy={contact.y} r="7"/><circle cx={tip.x} cy={tip.y} r="4"/></g>}
  </g>;
}

function Cavalry({ time, id, bones }: { time: number; id: string; bones: boolean }) {
  const p = horsePose(time);
  const root = { x: 430, y: 358 + p.bob };
  const leg = (front: boolean, far: boolean): Limb => {
    const phase = p.cycle + (front ? .8 : 3.6) + (far ? .7 : 0);
    const x = (front ? 73 : -65) - (far ? 7 : 0);
    return solveLimb({ x, y: 16 }, { x: x - (far ? 12 : 0) + Math.cos(phase) * 60 * p.running, y: 120 - Math.max(0, Math.sin(phase)) * 69 * p.running - p.bob }, 65, 67, front ? -1 : 1);
  };
  const riderY = -105;
  const nearHand = { x: 45, y: -4 };
  return <g transform={tr(root)} data-unit="cavalry">
    <Leg limb={leg(false, true)} id={id} far bones={bones} horse/><Leg limb={leg(true, true)} id={id} far bones={bones} horse/>
    <g transform={`rotate(${Math.sin(p.cycle+.9)*12*p.running} -83 -12)`} stroke="#2b1c18" strokeWidth="4"><path d="M-81-13Q-155-59-165-1L-150-14Q-160 16-138 24Q-140-5-123 1L-130 13Q-101 16-83 1Z" fill="#3e2a25"/><path d="M-100-6Q-141-35-146-4" fill="none" stroke="#896045" strokeWidth="3"/></g>
    <g stroke="#281b16" strokeWidth="4" strokeLinejoin="round">
      <path d="M-95-5Q-101-65-15-58Q64-58 85-28Q128 31 48 46L-59 42Q-98 29-95-5Z" fill={`url(#${id}-horse)`}/>
      <path d="M-74 18Q-8 46 67 12Q66 46-10 46L-61 39Z" fill="#71432c" stroke="none"/>
      <path d="M-65-47Q-12-72 57-46L61 10Q-3 36-68 6Z" fill={`url(#${id}-blue)`}/><path d="M-64-36L-57 0Q-6 21 51 2L51-39" fill="none" stroke="#d8b568" strokeWidth="5"/>
      <path d="M-54-51Q-16-67 33-51L31-31Q-11-40-53-31Z" fill="#633321"/><path d="M-39-50Q-15-60 22-48" stroke="#c08a53" fill="none"/>
    </g>
    <Leg limb={leg(false, false)} id={id} bones={bones} horse/><Leg limb={leg(true, false)} id={id} bones={bones} horse/>
    <g transform={`rotate(${Math.sin(p.cycle)*3*p.running} 62 -19)`} stroke="#281b16" strokeWidth="4" strokeLinejoin="round">
      <path d="M44-42Q60-102 84-116L115-95 151-41 164-17Q151 6 125-4L98-22 92 19Q62 35 47 2Z" fill={`url(#${id}-horse)`}/>
      <path d="M79-98L70-139Q84-144 96-112M99-106L103-140Q120-139 118-99" fill={`url(#${id}-horse)`}/><path d="M79-122L84-111M110-125V-111" stroke="#e0b690" strokeWidth="4"/>
      <path d="M49-51Q35-75 68-108L79-119Q109-114 106-86L96-93 100-68 82-78 83-53 67-66 61-35Z" fill="#3e2a25"/>
      <path d="M107-63Q123-67 127-52L116-45Q107-45 107-63Z" fill="#fff6dc"/><ellipse cx="121" cy="-54" rx="4" ry="7" fill="#2c211c"/>
      <path d="M136-31L154-26M143-12L154-14" stroke="#633620" strokeWidth="3"/>
      <path d="M92-97L125-63 136-24M116-23L158-37" stroke="#3d281c" strokeWidth="11" fill="none"/><path d="M92-97L125-63 136-24M116-23L158-37" stroke="#d4ab5c" strokeWidth="5" fill="none"/><circle cx="135" cy="-22" r="5" fill="#fae1a4"/>
    </g>
    {/* Pelvis is attached to the saddle transform, not to a separately bobbing sprite. */}
    <g transform={`translate(-12 ${riderY}) scale(.88) rotate(${9*p.running} 0 60)`}>
      <Leg limb={solveLimb({ x: -12, y: 56 }, { x: 24, y: 124 }, 43, 44, 1)} id={id} far bones={bones}/>
      <Arm limb={solveLimb({ x: -18, y: 9 }, { x: 50, y: 17 }, 44, 44, 1)} id={id} far bones={bones}/>
      <Torso id={id}/><Head id={id} tilt={4*p.running} plume={Math.sin(p.cycle+1)*7*p.running}/>
      <Leg limb={solveLimb({ x: 16, y: 59 }, { x: 45, y: 126 }, 43, 44, 1)} id={id} bones={bones}/>
      <path d="M34 122V139H61V120" fill="none" stroke="#2a211a" strokeWidth="6"/><path d="M34 123V137H61V121" fill="none" stroke="#caa468" strokeWidth="3"/>
      <g transform={`${tr(nearHand)} rotate(${-22+13*p.running})`} stroke="#302018" strokeWidth="3"><path d="M-83 0H210" stroke="#6a4027" strokeWidth="8"/><path d="M-83-2H210" stroke="#d2ac69" strokeWidth="2"/><path d="M206-10L258 0 205 11 215 0Z" fill={`url(#${id}-metal)`}/><path d="M206-1H246" stroke="#eaf3ea" strokeWidth="2"/><path d="M199 4Q188 21 162 20L180 7 162 2Z" fill="#3c6caa"/></g>
      <Arm limb={solveLimb({ x: 22, y: 10 }, nearHand, 44, 44, 1)} id={id} bones={bones}/><Shoulder id={id}/>
    </g>
    <path d="M122-18Q39-17 12-19" stroke="#33241c" strokeWidth="3" fill="none"/>
    {bones && <g className="unit-bones"><path d="M-12-105V-52H50"/><circle cx="-12" cy="-52" r="5"/></g>}
  </g>;
}

export function UnitRigArt({ clip, time, bones, scale = 1, light = false, grid = false }: { clip: UnitClip; time: number; bones: boolean; scale?: number; light?: boolean; grid?: boolean }) {
  const id = `unit${useId().replaceAll(':', '')}`;
  return <svg className="unit-rig-art" viewBox="0 0 1100 580" role="img" aria-label={`${clip === 'charge' ? '騎兵衝鋒' : clip === 'ignite' ? '工兵點火' : '弓箭手射箭'}，${time.toFixed(2)} 秒${bones ? '，顯示骨架' : ''}`}>
    <defs>
      {([['blue', '#739cc6', '#315c86', '#19344d'], ['blueDark', '#3f6683', '#263c53', '#152c40'], ['metal', '#a9bfc7', '#5b7888', '#304653'], ['gold', '#fff0b1', '#cfaa5f', '#8b612f'], ['skin', '#ffe8ba', '#f1bd86', '#d28c57'], ['horse', '#d8a36a', '#b77c4b', '#815333'], ['horseDark', '#aa764e', '#815131', '#553321'], ['leather', '#bf955e', '#84613d', '#624326']] as const).map(([name, a, b, c]) => <linearGradient id={`${id}-${name}`} key={name} x1="0" y1="0" x2=".65" y2="1"><stop stopColor={a}/><stop offset=".55" stopColor={b}/><stop offset="1" stopColor={c}/></linearGradient>)}
      <pattern id={`${id}-grid`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" stroke={light ? '#765e421c' : '#abc9bf12'} fill="none"/></pattern>
    </defs>
    {grid && <rect width="1100" height="580" fill={`url(#${id}-grid)`}/>}
    <path d="M80 488H1020" stroke={light ? '#937b5b' : '#53635d'} strokeWidth="2"/>
    <g opacity=".25" stroke={light ? '#8b7355' : '#a4b9a2'}>{Array.from({ length: 22 }, (_, i) => <path key={i} d={`M${75+i*46} 488l-14 5`}/>)}</g>
    <ellipse cx="448" cy="489" rx={clip === 'charge' ? 158 : 106} ry="11" fill="#101b18" opacity=".2"/>
    <g transform={`translate(470 475) scale(${scale}) translate(-470 -475)`}>
      {clip === 'charge' ? <Cavalry time={time} id={id} bones={bones}/> : clip === 'ignite' ? <Engineer time={time} id={id} bones={bones}/> : <Archer time={time} id={id} bones={bones}/>}
    </g>
  </svg>;
}
