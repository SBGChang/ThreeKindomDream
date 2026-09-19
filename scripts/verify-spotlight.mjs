import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5182';
const out = 'artifacts/spotlight';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true});
const page = await browser.newPage({viewport: {width: 1366, height: 900}});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
async function aligned(expected) {
  await page.waitForFunction(n => document.querySelectorAll('[data-spotlight-raised]').length === n, expected);
  await page.waitForTimeout(300);
  const result = await page.locator('[data-spotlight-raised]').evaluateAll(nodes => nodes.map(el => {
    const a = el.getBoundingClientRect(), b = el.nextElementSibling.getBoundingClientRect();
    return {open: el.matches(':popover-open'), error: Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y), Math.abs(a.width-b.width), Math.abs(a.height-b.height))};
  }));
  assert(result.every(r => r.open && r.error < 1), JSON.stringify(result));
}
async function clean() {
  await page.waitForFunction(() => !document.querySelector('[data-spotlight-raised],[data-spotlight-placeholder],[data-spotlight-mask]:popover-open'));
}
try {
  await page.goto(base+'/scripts/fixtures/spotlight.html');
  await page.getByRole('textbox').fill('文字保持 123');
  await page.getByRole('button', {name: '計數 0', exact: true}).click();
  const before = await page.locator('.probe-neighbor').boundingBox();
  await page.getByRole('textbox').focus();
  await page.evaluate(() => {
    window.probeOriginal = document.querySelector('.probe-card');
    window.probeInput = document.querySelector('#probe-text');
    window.probeStyle = window.probeOriginal.getAttribute('style');
    [...document.querySelectorAll('button')].find(el=>el.textContent==='啟動高光').click();
  });
  await aligned(2);
  assert.equal(await page.evaluate(()=>document.activeElement===window.probeInput), true);
  assert.deepEqual(await page.locator('.probe-neighbor').boundingBox(), before);
  assert.equal(await page.locator('#probe-text').count(), 1);
  assert.equal(await page.locator('[name=probe-text]').count(), 1);
  for (const size of [{width:960,height:640},{width:1600,height:1000},{width:1366,height:900}]) {
    await page.setViewportSize(size); await aligned(2);
    assert.equal(await page.evaluate(()=>document.querySelector('[data-spotlight-raised].probe-card')===window.probeOriginal && document.querySelector('#probe-text')===window.probeInput), true);
    assert.equal(await page.getByRole('textbox').inputValue(), '文字保持 123');
  }
  await page.getByRole('slider').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('slider').inputValue(), '21');
  const slider = await page.getByRole('slider').boundingBox();
  await page.mouse.move(slider.x+slider.width*.5,slider.y+slider.height/2); await page.mouse.down();
  await page.mouse.move(slider.x+slider.width*.75,slider.y+slider.height/2-slider.width*.25*Math.tan(7*Math.PI/180),{steps:10}); await page.mouse.up();
  assert(Number(await page.getByRole('slider').inputValue())>65);
  await page.getByRole('button',{name:'另一目標 1',exact:true}).click();
  await page.getByRole('button',{name:'計數 2',exact:true}).waitFor();
  const outside = await page.getByRole('button',{name:'外部 0',exact:true}).boundingBox();
  await page.mouse.click(outside.x+outside.width/2,outside.y+outside.height/2);
  assert.equal(await page.getByRole('button',{name:'外部 0',exact:true}).count(),1);
  for(let i=0;i<12;i++) {
    await page.keyboard.press(i%3===0?'Shift+Tab':'Tab');
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[data-spotlight-raised]')),true);
  }
  await page.keyboard.press('Escape'); await aligned(2);
  await page.screenshot({path:out+'/native-controls.png'});
  await page.getByRole('button',{name:'結束高光',exact:true}).click(); await clean();
  assert.equal(await page.evaluate(()=>window.probeOriginal.getAttribute('style')===window.probeStyle),true);
  assert.equal(await page.getByRole('textbox').inputValue(),'文字保持 123');
  await page.getByRole('combobox').selectOption('dim');
  await page.getByRole('button',{name:'啟動高光',exact:true}).click(); await aligned(2);
  await page.getByRole('button',{name:'外部 0',exact:true}).click();
  await page.getByRole('button',{name:'外部 1',exact:true}).waitFor();
  await page.getByRole('button',{name:'卸載目標',exact:true}).click(); await clean();
  assert.deepEqual(errors,[]);
  console.log('PASS: original nodes, layout, native inputs/drag, multiple/nested targets, resize, rotation, keyboard gate, dim interaction and unmount cleanup.');

  await page.setViewportSize({width:1280,height:720});
  await page.goto(base+'/?art=confrontation-demo&seed=17092026');
  await page.locator('.ct-mode-cards>button').first().click({timeout:60000});
  const phase=()=>page.locator('.ct-battle').getAttribute('data-contest-phase');
  const ready=()=>page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='read',null,{timeout:60000});
  await ready(); await clean();
  assert.equal(await page.getByRole('button',{name:'出招',exact:true}).count(),0);
  assert.equal(await page.getByRole('complementary',{name:'敵方出招推演',exact:true}).count(),0);
  await page.keyboard.press('Enter');assert.equal(await phase(),'read','no central confirmation step');
  await page.screenshot({path:out+'/duel-choice.png'});
  for(const size of [{width:960,height:640},{width:1600,height:1000},{width:1280,height:720}]) {
    await page.setViewportSize(size);await clean();
    const geometry=await page.locator('.dw-wheel').evaluate(el=>{
      const a=el.getBoundingClientRect(),b=el.closest('.ct-battle').getBoundingClientRect(),unit=b.width/100;
      const nodes=[...el.querySelectorAll('.dw-node')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
      return {left:(a.x-b.x)/unit,bottom:(b.bottom-a.bottom)/unit,width:a.width/unit,nodeWidths:nodes.map(n=>n.w/unit),inside:nodes.every(n=>n.x>=b.x&&n.y>=b.y&&n.x+n.w<=b.right&&n.y+n.h<=b.bottom),overflow:b.height+1<el.closest('.ct-battle').scrollHeight};
    });
    assert(Math.abs(geometry.left-3.5)<.02&&Math.abs(geometry.bottom-2.5)<.02&&Math.abs(geometry.width-21)<.02,JSON.stringify(geometry));
    assert(geometry.nodeWidths.every(w=>Math.abs(w-7.56)<.02),'keep original action button size');
    assert(geometry.inside&&!geometry.overflow,'all controls fit the battlefield');
  }
  await page.getByRole('button',{name:'出招：攻擊',exact:true}).hover();
  assert.equal(await phase(),'read','hover must not submit');
  await page.keyboard.press('h');
  await page.getByRole('dialog',{name:'單挑規則',exact:true}).waitFor(); await clean();
  await page.keyboard.press('1');assert.equal(await phase(),'read','help traps action shortcuts');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog',{name:'演武暫停',exact:true}).waitFor(); await clean();
  await page.keyboard.press('1');assert.equal(await phase(),'read','pause prevents submission');
  await page.getByRole('button',{name:'繼續遊戲',exact:true}).click();
  await page.getByRole('button',{name:'出招：攻擊',exact:true}).evaluate(el=>{el.click();el.click();});
  await page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='clash');
  assert.equal(await page.locator('.dw-wheel').count(),0,'one click starts the reveal');
  await ready();await page.keyboard.press('h');
  assert.equal(await page.locator('.dx-history-turn').count(),1,'double click settles exactly one turn');
  await page.keyboard.press('Escape');
  await page.keyboard.press('3');
  await page.waitForFunction(()=>document.querySelector('.ct-battle')?.getAttribute('data-contest-phase')==='clash');
  await ready();await page.keyboard.press('h');
  assert.equal(await page.locator('.dx-history-turn').count(),2,'shortcut directly settles one more turn');
  await page.keyboard.press('Escape');
  await page.mouse.click(500,650,{button:'right'});
  await page.getByRole('dialog',{name:'演武暫停',exact:true}).waitFor();
  await page.getByRole('button',{name:'返回試玩選擇',exact:true}).click();await clean();
  assert.deepEqual(errors,[]);
  console.log('PASS: undimmed lower-left wheel, reduced platter with original button sizes, no confirm step, direct mouse/keyboard actions, double-click guard, help/pause and responsive bounds.');

} catch (error) {
  await page.screenshot({path:out+'/failure.png'});
  console.error(errors);
  throw error;
} finally {await browser.close();}
