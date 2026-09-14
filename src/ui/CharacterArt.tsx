import { useEffect, useRef } from 'react';
import { drawPortrait } from './portrait-framing.js';

export const CHARACTERS: Readonly<Record<string,string>> = {
  '劉備':'liubei','關羽':'guanyu','張飛':'zhangfei','趙雲':'zhaoyun','諸葛亮':'zhugeliang','孔明':'zhugeliang','蔣琬':'jiangwan','龐統':'pangtong','黃忠':'huangzhong','魯肅':'lusu',
  '阿禾':'npc_soldier','傷兵':'npc_soldier',
  '曹操':'caocao','張遼':'zhangliao','于禁':'yujin','夏侯惇':'xiahoudun','典韋':'dianwei','樂進':'lejin',
  '郭嘉':'guojia','賈詡':'jiaxu','程昱':'chengyu','荀彧':'xunyu','陳群':'chenqun','毛玠':'maojie',
  '皇甫嵩':'huangfusong','司馬懿':'simayi','波才':'bocai','張梁':'zhangliang','張角':'zhangjiao','華雄':'huaxiong',
  '李傕':'lijue','呂布':'lvbu','顏良':'yanliang','郭圖':'guotu','袁紹':'yuanshao','袁譚':'yuantan','審配':'shenpei','蹋頓':'tadun',
  '主將':'lord','軍吏':'npc_soldier','敵軍':'npc_soldier',
};
const images=new Map<string,Promise<HTMLCanvasElement>>();
const storyIds = new Set(['liubei','guanyu','zhangfei','zhaoyun','zhugeliang','jiangwan','pangtong','huangzhong','lusu']);
/** Match the source game's chroma-key convention without modifying original artwork. */
export function loadCharacterSprite(src:string):Promise<HTMLCanvasElement>{
  const cached=images.get(src);if(cached)return cached;
  const promise=new Promise<HTMLCanvasElement>((resolve,reject)=>{
    const im=new Image();im.onload=()=>{
      const c=document.createElement('canvas');const factor=Math.min(1,768/im.height);c.width=Math.round(im.width*factor);c.height=Math.round(im.height*factor);
      const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0,c.width,c.height);
      const pixels=ctx.getImageData(0,0,c.width,c.height),d=pixels.data;
      for(let i=0;i<d.length;i+=4){const r=d[i]!,g=d[i+1]!,b=d[i+2]!;if(r>100&&b>100&&g<Math.min(r,b)*.65){const a=Math.max(0,Math.min(1,(g/Math.min(r,b)-.15)/.5));d[i+3]=Math.round(d[i+3]!*a);}}
      ctx.putImageData(pixels,0,0);resolve(c);
    };im.onerror=()=>{images.delete(src);reject(new Error(`無法載入素材 ${src}`));};im.src=src;
  });images.set(src,promise);return promise;
}
export function CharacterArt({name,portrait=false}:{name:string;portrait?:boolean}):React.ReactElement{
  const ref=useRef<HTMLCanvasElement>(null),id=CHARACTERS[name]??'npc_soldier';
  const src=`./art/${storyIds.has(id)?'characters-story':'characters-v2'}/${id}.png`;
  useEffect(()=>{let active=true;void loadCharacterSprite(src).then(im=>{
    if(!active||!ref.current)return;const c=ref.current,ctx=c.getContext('2d')!;
    if(portrait){drawPortrait(ctx,im,id);}
    else {c.width=im.width;c.height=im.height;ctx.drawImage(im,0,0);}
  }).catch(()=>{if(active&&ref.current){const c=ref.current;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#ffe2aa';ctx.font='36px serif';ctx.fillText(name,10,50);}});return()=>{active=false;};},[src,portrait,id,name]);
  return <canvas ref={ref} className={portrait?'character-face':'character-halfbody'} role="img" aria-label={name}/>;
}
