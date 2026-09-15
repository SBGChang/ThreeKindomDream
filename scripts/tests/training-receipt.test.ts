import assert from 'node:assert/strict';
import { newSession, defs, wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { careerPresentation } from '../../src/ui/career-presentation.js';
import { trainingOutcome, trainingReceipt } from '../../src/ui/training-receipt.js';
import type { GlowTier } from '../../src/contracts/core/primitives.js';

const base = newSession(77).current;
const atTier = (tier: GlowTier) => Session.restore(wiring, {...base, turn:{...base.turn, slots:base.turn.slots.map(s=>({...s,baseGlow:tier,notables:[],hasCommission:false,hasEncounter:false}))}});
const ordinary = atTier('silver').previewTraining(0).expectedGain;
assert.ok(ordinary>0);
for (const [tier,mul] of [['none',.8],['silver',1],['gold',1.5],['red',1.5]] as const) {
  assert.ok(Math.abs(atTier(tier).previewTraining(0).expectedGain/ordinary-mul)<1e-9, tier+' real growth multiplier');
}

const observed = new Set<number>();
for (let seed=1;seed<=60;seed++) {
  const s=newSession(seed), before=s.current, profile=careerPresentation(before.turn.slots[0]!.attr,before.career);
  s.selectSlot(0);
  const after=s.current, r=trainingReceipt(before,after,profile,defs);
  observed.add(trainingOutcome(after.turn.training!.finalGlow));
  assert.equal(r.lines.find(l=>l.label==='金幣')?.amount,after.economy.money-before.economy.money);
  assert.equal(r.lines.find(l=>l.label===defs.text('attr.'+profile.attr+'.short')+'經驗')?.amount,Math.round((after.attributes.values[profile.attr]-before.attributes.values[profile.attr])*10000)/100);
  assert.equal(s.current.progress.turn,before.progress.turn,'receipt must precede advancing the turn');
  assert.ok(!/紅光|銀光|金光|倍率/.test(r.text));
}
assert.equal(observed.size,3,'all three real outcomes reached');

const capped=atTier('red'), state=capped.current, attr=state.turn.slots[0]!.attr;
const capState={...state,attributes:{values:{...state.attributes.values,[attr]:capped.attrCap(attr)}}};
const cappedRun=Session.restore(wiring,capState);
cappedRun.selectSlot(0);
const receipt=trainingReceipt(capState,cappedRun.current,careerPresentation(attr,capState.career),defs);
assert.ok(!receipt.lines.some(l=>l.label===defs.text('attr.'+attr+'.short')+'經驗'),'capped growth is not awarded in receipt');
for (const attr of ['lead','war','int','pol'] as const) for(const rank of [0,2,4,8]) {
  const profile=careerPresentation(attr,{...base.career,civil:rank,martial:rank});
  const texts=new Set<string>();
  for(const finalGlow of ['none','silver','gold'] as const) {
    const s=atTier(finalGlow);s.selectSlot(0);
    const after={...s.current,turn:{...s.current.turn,training:{...s.current.turn.training!,finalGlow}}};
    texts.add(trainingReceipt(base,after,profile,defs).text);
  }
  assert.equal(texts.size,3,profile.action+' has three distinct endings');
}
console.log('PASS: real yield ratios, all outcomes, actual receipts, capped growth, 48 action endings');
