import type { CareerInitDef, CareerRankDef } from '../../../src/contracts/core/definitions.js';
import type { CareerLine } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

// GREYBOX：全部階級都是軍閥可自封的職務（GDD §12.1）。
// 不含三公、九卿、尚書、侍中 —— 那些是結局稱號，不是局內可爬的階級。
const REQUIRED = [0, 30, 70, 130, 210, 320, 460, 640, 860, 1130, 1450, 1830];

// checkBonus 是【門檻貨幣換成檢定力】的唯一管道（18 §2、21 §3）。
//
// 舊值 [0,2,4,7,…,82] 是雙槽制的遺物：那時事件不花回合，功績純屬白賺，
// 所以加值多小都無所謂。單動作回合制下，做事要用掉一個鍛鍊回合 ——
// 若功績換不到檢定力，事件就被鍛鍊完全支配，門檻貨幣淪為純懲罰。
//
// 新值的訂法：在玩家【自然會持有該階】的那一章，加值約為其四維檢定值的兩成。
//   參考檢定值（專精、三成回合做事）ch3 ≈ 400 / ch4 ≈ 620
//   該階自然出現的章節         rank 3 → ch3 ／ rank 5 → ch4
// 兩成夠讓升官有感，又不足以取代鍛鍊 —— 檢定值的主體仍必須靠練。
const BONUS = [0, 25, 50, 85, 130, 190, 265, 360, 480, 630, 810, 1030];

const line = (l: CareerLine): readonly CareerRankDef[] =>
  REQUIRED.map((requiredMerit, i) =>
    coreDef('careerRank', `rank:${l}.${i + 1}`, {
      line: l,
      level: i + 1,
      nameKey: k(`career.${l}.${i + 1}`),
      requiredMerit,
      checkBonus: BONUS[i] ?? 0,
    }));

export const careerRanks: readonly CareerRankDef[] = [...line('civil'), ...line('martial')];

// 入朝初始階級由南華村篇的總名聲決定（GDD §12.1 / 21 §2.1）。
//
// 舊門檻（100/200/320/460）反推自「16 回合都做居民委託」—— 雙槽制下事件不花回合，
// 16 回合就是 16 則委託。單動作回合制下要練也要做事，南華村篇實際只做得到
// 6–8 則，最高階永遠碰不到，整張表等於只有第一列有效。
//
// 新門檻反推自：8 則居民委託 × 約 14 名聲 × 章節倍率 1.15 ≈ 130，
// 加上兩場大檢定的名聲獎勵 ≈ 60 → 五成回合做事者約 190。
// 於是「一半回合拿去做事」剛好換到文三武三入朝，全押鍛鍊者則是白身起步。
export const careerInit: CareerInitDef = coreDef('careerInit', 'careerInit:main', {
  byTotalFame: [
    { minTotalFame: 0, civilLevel: 1, martialLevel: 1 },
    { minTotalFame: 50, civilLevel: 2, martialLevel: 1 },
    { minTotalFame: 100, civilLevel: 2, martialLevel: 2 },
    { minTotalFame: 160, civilLevel: 3, martialLevel: 3 },
    { minTotalFame: 230, civilLevel: 4, martialLevel: 4 },
  ],
});
