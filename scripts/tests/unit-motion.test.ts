import assert from 'node:assert/strict';
import { add, archerPose, CLIPS, distance, engineerPose, horsePose, rotate, solveLimb } from '../../src/ui/unit-motion.js';

const almost = (a: number, b: number, label: string) => assert.ok(Math.abs(a - b) < .001, `${label}: ${a} vs ${b}`);
let samples = 0;
for (let t = 0; t <= 5; t += 1/120) {
  const p = engineerPose(t);
  const hand = solveLimb({ x: 23, y: 9 }, p.hand, 54, 55, 1);
  almost(distance(hand.start, hand.joint), 54, '工兵上臂固定長度');
  almost(distance(hand.joint, hand.end), 55, '工兵前臂固定長度');
  almost(distance(hand.end, p.hand), 0, '工兵握點可達');
  for (const [hip, foot] of [[{ x: -19, y: 58 }, { x: 380, y: 470 }], [{ x: 19, y: 58 }, { x: 470, y: 470 }]] as const) {
    const start = add(p.root, rotate(hip, p.lean));
    const leg = solveLimb(start, foot, 55, 56, -1);
    almost(distance(leg.end, foot), 0, '工兵屈膝仍保持腳掌落點');
  }
  if (t < CLIPS.volley.duration) {
    const a = archerPose(t);
    for (const [shoulder, target, upper, lower] of [[{ x: 22, y: 10 }, a.grip, 49, 49], [{ x: -19, y: 12 }, a.hand, 57, 58]] as const) {
      const arm = solveLimb(shoulder, target, upper, lower, -1);
      almost(distance(arm.end, target), 0, '弓手兩手皆可達握點');
      almost(distance(arm.start, arm.joint), upper, '弓手上臂不伸長');
      almost(distance(arm.joint, arm.end), lower, '弓手前臂不伸長');
    }
    if (!a.released) almost(distance(a.hand, add(a.grip, rotate({ x: -a.pull, y: 0 }, a.angle))), 0, '弦與拉弦手重合');
  }
  samples++;
}
assert.equal(archerPose(1.8999).released, false);
assert.equal(archerPose(1.9).released, true);
almost(distance(archerPose(0).hand, archerPose(3.6).hand), 0, '弓手收勢復位');
const contact = engineerPose(2.35);
const tip = add(add(contact.root, rotate(contact.hand, contact.lean)), rotate({ x: 70, y: 0 }, contact.torchAngle));
assert.ok(Math.abs(tip.y - 488) < 2, '火把接觸地面引線');
assert.equal(engineerPose(2.3499).lit, false);
assert.equal(engineerPose(2.35).lit, true);
almost(engineerPose(5).crouch, 0, '工兵起身');
almost(horsePose(0).running, 0, '騎兵開始靜止');
almost(horsePose(3.6).running, 0, '騎兵結束靜止');
almost(horsePose(3.6).bob, 0, '馬匹結束落地');
for (const target of [{ x: 999, y: 1000 }, { x: 0, y: 0 }]) {
  const limb = solveLimb({ x: 0, y: 0 }, target, 40, 60);
  almost(distance(limb.start, limb.joint), 40, '不可達目标不拉伸上段');
  almost(distance(limb.joint, limb.end), 60, '不可達目标不拉伸下段');
}
console.log(`單位動作驗收通過：${samples} 個時間取樣，握點、弓弦、固定肢長、工兵腳掌落點、點火接觸與收勢。`);
