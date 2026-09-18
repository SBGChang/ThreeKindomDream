import { useEffect,useRef } from 'react';
import { groundIcon } from './ground-icon.js';
import { RealmIcon } from './RealmArt.js';
const standalone: Record<string, string> = {
 '行軍簿':'ledger','行军簿':'ledger','乾糧袋':'rations','干粮袋':'rations',
 '方天化戟':'fangtian','赤兔馬':'chitu','赤兔马':'chitu','倚天劍':'yitian','倚天剑':'yitian',
 '白馬護符':'white-horse','白马护符':'white-horse','荊襄盟書':'alliance','荆襄盟书':'alliance',
 '四海航圖':'sea-chart','四海航图':'sea-chart','通商文牒':'trade-pass',
};
export function ItemArt({ name, className = 'market-relic', grounded = false }: { name: string; className?: string; grounded?: boolean }): React.ReactElement {
  const asset = standalone[name];
  return asset
    ? <ItemImage grounded={grounded} className={className + ' realm-icon'} src={'./art/items/' + asset + (asset==='ledger'||asset==='rations'?'-v1.png':'-v2.png')} alt={name}/>
    : <RealmIcon relic name={name} className={className} grounded={grounded}/>;
}
function ItemImage({src,alt,className,grounded}:{src:string;alt:string;className:string;grounded:boolean}):React.ReactElement {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(!grounded)return;let live=true;const img=new Image();img.onload=()=>{if(!live||!ref.current)return;const c=ref.current,ctx=c.getContext('2d')!;ctx.clearRect(0,0,160,160);ctx.drawImage(img,0,0,160,160);groundIcon(c);};img.src=src;return()=>{live=false;};},[src,grounded]);
 return grounded?<canvas ref={ref} width={160} height={160} className={className} role="img" aria-label={alt}/>:<img src={src} alt={alt} className={className} draggable={false}/>;
}
