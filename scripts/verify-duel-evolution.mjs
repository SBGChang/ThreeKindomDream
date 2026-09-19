import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out='artifacts/duel-wheel';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:774}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:5182')+'/scripts/fixtures/duel-evolution.html');
 await page.getByText('已載入',{exact:true}).waitFor({timeout:60000});
 const hashes=[];
 for(const [action,title] of [['attack','攻其不備'],['defend','借力打力'],['rest','蓄勢待發']]){
  await page.getByLabel('升變動作').selectOption(action);
  await page.getByText(title,{exact:true}).waitFor();
  await page.waitForFunction(()=>{const c=document.querySelector('.du-evolved canvas');return c&&c.width>1000;});
  assert.equal(await page.locator('.du-evolution-halo').count(),1);
  const result=await page.locator('.du-evolved canvas').evaluate(c=>{
   const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let transparent=0,soft=0,opaque=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)transparent++;else if(d[i]>=250)opaque++;else soft++;}
   return {transparent,soft,opaque,width:c.width,height:c.height,hash:c.toDataURL().slice(-200)};
  });
  assert(result.transparent>1000&&result.soft>1000&&result.opaque>1000,JSON.stringify(result));hashes.push(result.hash);
  await page.screenshot({path:`${out}/evolution-${action}.png`});
  console.log(action,result.width,result.height,'alpha transparent/soft/opaque',result.transparent,result.soft,result.opaque);
 }
 assert.equal(new Set(hashes).size,3,'three unique evolution assets');
 await page.getByLabel('演出時間').fill('0.2');
 await page.waitForFunction(()=>document.querySelector('.du-evolution-emblem canvas')?.width===256);
 assert.equal(await page.locator('.du-evolution-halo').count(),0,'extra halo only after transformation');
 // Inspect the raw delivered alpha on both light and dark backgrounds at UI size.
 await page.setContent(`<body style="margin:0;background:#152722"><div style="display:flex;gap:30px;padding:30px">${['attack','defend','rest'].map(a=>`<img width="160" height="160" src="http://127.0.0.1:5182/art/duel/evolution-${a}-v1.png">`).join('')}</div><div style="display:flex;gap:30px;padding:30px;background:#fff5db">${['attack','defend','rest'].map(a=>`<img width="160" height="160" src="http://127.0.0.1:5182/art/duel/evolution-${a}-v1.png">`).join('')}</div></body>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
 await page.screenshot({path:`${out}/alpha-light-dark.png`,clip:{x:0,y:0,width:620,height:440}});
 assert.deepEqual(errors,[]);console.log('PASS: all three real resolved evolution reveals, unique art, alpha, base-to-evolved change, post-transform halo and no browser errors.');
}finally{await browser.close();}
