import type { CareerRankDef } from '../../../src/contracts/core/definitions.js';
import type { CareerLine } from '../../../src/contracts/core/primitives.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;

// GREYBOX：全部階級都是軍閥可自封的職務（GDD §12.1）。
// 不含三公、九卿、尚書、侍中 —— 那些是結局稱號，不是局內可爬的階級。
//
// ── 三張表全部照新制重訂（實測 200 輪）★ ──────────────
//
// 新制的功績流量比舊制大一個數量級：每個回合都給（固定事件 6 ／ 委託 22–30，
// 再乘章節與稀有度倍率），實測單線 32 回合累積約 2200。舊表頂端 1830
// 在灰盒中段就爬完了，整條階梯失去意義。
//
// requiredMerit：按「九章走完剛好爬到頂」反推。
//   單線總量 ≈ 8 回合 × 約 34 ／回合 × Σ章節倍率 28.2 ≈ 7700
//   因此頂端訂在 6400 —— 專精單線者走完全程摸得到，兼顧兩線者摸不到。
//   灰盒（四章、約 2200）落在 rank 8 附近，仍有頭上空間。
const REQUIRED = [0, 105, 245, 455, 735, 1120, 1610, 2240, 3010, 3955, 5075, 6405];

// checkBonus：舊值（頂端 1030）在新制下會【蓋過四維】——
// 實測 rank 12 的加值 1030 對照四維 990，檢定值一半來自官階，
// 那會讓「練哪一維」失去意義。縮到約四維的一成，作為次要貢獻。
//
// 官階的主要回報不在這裡，而在 trainingBaseAdd（見下）。
const BONUS = [0, 6, 13, 22, 34, 50, 70, 95, 126, 165, 213, 271];

// trainingBaseAdd：官階的主要回報 —— 抬高該線四維的固定事件基礎值。
//
// ── 已從凸曲線攤平為線性 ★ ────────────────────────
// 舊值 [0,1,2,3,5,7,9,12,15,19,23,28] 在後段加速（rank 12 → ×3.8），
// 疊上 chapterMultiplier 6.2 之後後期成長幅度過高；更糟的是它讓
// 「轉換道路」的代價隨階級擴大 —— 高階武官想改練文政時落差最大。
//
// 線性 ＋ `trainingCurve.crossLineRatio` 兩件事一起解：
//   rank 4  → 10+3 = 13（×1.3）
//   rank 8  → 10+7 = 17（×1.7）
//   rank 12 → 10+11 = 21（×2.1）
// 而另一線的官階再算一半進來，換路不再是從新兵重來。
//
// 這是【相加】不是相乘：名士單格已可到 ×8，再乘一層官階會在後段爆掉。
const BASE_ADD = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const line = (l: CareerLine): readonly CareerRankDef[] =>
  REQUIRED.map((requiredMerit, i) =>
    coreDef('careerRank', `rank:${l}.${i + 1}`, {
      line: l,
      level: i + 1,
      nameKey: k(`career.${l}.${i + 1}`),
      requiredMerit,
      checkBonus: BONUS[i] ?? 0,
      trainingBaseAdd: BASE_ADD[i] ?? 0,
    }));

export const careerRanks: readonly CareerRankDef[] = [...line('civil'), ...line('martial')];

// careerInit 已刪除：名聲退場之後，官階從第一回合起就只由功績決定（21 §2.1）。
// 舊制在入朝那一刻讀一次總名聲來定起始階級 —— 那是名聲唯一的消費端，
// 也是「前十六回合的事件報酬看不出作用」的根源。
