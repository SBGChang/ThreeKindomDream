import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CHARACTERS } from '../../src/ui/CharacterArt.js';
import { CHARACTER_FRAMING, portraitCrop, portraitFaceGuide, drawPortrait } from '../../src/ui/portrait-framing.js';
import { PORTRAIT_LAYOUTS, type PortraitContext } from '../../src/ui/portrait-layouts.js';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const id of Object.values(CHARACTERS))assert.ok(CHARACTER_FRAMING[id],`${id}: missing measurements`);
for(const [id,data] of Object.entries(CHARACTER_FRAMING)) {
  const source=new URL('../../public/'+data.source,import.meta.url);
  assert.ok(existsSync(source));
  const png=readFileSync(source),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  const {face}=data;
  const center={x:face.x+face.width/2,y:face.y+face.height/2};
  assert.ok(face.x>=0&&face.y>=0&&face.width>0&&face.height>0);
  assert.ok(face.x+face.width<=1&&face.y+face.height<=1);
  for(const context of Object.keys(PORTRAIT_LAYOUTS) as PortraitContext[]) {
    const crop=portraitCrop(width,height,id,context),guide=portraitFaceGuide(width,height,id,context);
    close((center.x*width-crop.x)/crop.width,.5);
    close((center.y*height-crop.y)/crop.height,.5);
    assert.ok(guide.width<=.5+1e-8&&guide.height<=.5+1e-8);
    close(Math.max(guide.width,guide.height),.5);
    close(guide.x+guide.width/2,.5);close(guide.y+guide.height/2,.5);
    close(guide.width/guide.height,(face.width*width)/(face.height*height));
    close(crop.width,crop.height);
    close(portraitCrop(width*2,height*2,id,context).x,crop.x*2);
    assert.deepEqual(crop,portraitCrop(width,height,id),'same rule for every context');
  }
  // Verify the actual renderer places the face center at 128,128 in a 256px canvas.
  let args:unknown[]=[];
  const ctx={canvas:{width:0,height:0},drawImage:(...values:unknown[])=>{args=values;}};
  drawPortrait(ctx as unknown as CanvasRenderingContext2D,{width,height} as HTMLCanvasElement,id);
  if(!data.sourceRegion) {
    assert.equal(args.length,5);
    const [,dx,dy,dw,dh]=args as number[];
    close(dx!+center.x*dw!,128);close(dy!+center.y*dh!,128);
    close(dw!/dh!,width/height);
  } else {
    assert.equal(args.length,9,'atlas stays inside one actor cell');
    const [,sx,sy,sw,sh,dx,dy,dw,dh]=args as number[];
    close(dx!+(center.x*width-sx!)*dw!/sw!,128);
    close(dy!+(center.y*height-sy!)*dh!/sh!,128);
  }
}
assert.deepEqual(portraitCrop(600,900,'unknown'),portraitCrop(600,900,'npc_soldier'));
// User-reported mismatch: both characters' pure faces use the same 50% limit.
for(const id of ['guanyu','zhangfei']) {
  const g=portraitFaceGuide(1024,1536,id);close(Math.max(g.width,g.height),.5);
}
console.log(`Portraits: ${Object.keys(CHARACTER_FRAMING).length} sources, face centered, pure face <=50% on both axes, uniform contexts, no distortion, atlas isolation passed.`);
