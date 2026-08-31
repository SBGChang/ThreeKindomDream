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

// hostScale：兵量／糧量的係數（33 §5.1）★ 取代了舊的 checkBonus。
//
// 大檢定不再是單次判定，所以「官階給檢定值加成」這條沒有意義了。
// 官階的產出改為【規模】——你能帶多少兵、養多久：
//
//   兵量 = 1.0 x hostScale[武階] + 0.5 x hostScale[文階]
//   糧量 = 0.5 x hostScale[武階] + 1.0 x hostScale[文階]
//
// 數值直接沿用 `eventYieldCurve.tierMultiplier` —— 那條曲線的節奏
// （約三則委託升一階）已經跟一章八回合對齊過，因此兵量的成長速度
// 自動跟上章節推進，不必再校一次。
//
// 驗算（灰盒四章，單線約 2200 功績 → rank 7；對分則兩線各約 1100 → rank 5/5）：
//   純武 7/1  兵量 7.7  糧量 4.6  合計 12.3
//   雙修 5/5  兵量 6.3  糧量 6.3  合計 12.6
//   純文 1/7  兵量 4.6  糧量 7.7  合計 12.3
// **總量幾乎相等，差別只在形狀** —— 專一與雙修是形狀之爭，不是強弱之爭。
const HOST_SCALE = [1.0, 1.5, 2.2, 3.1, 4.2, 5.6, 7.2, 9.1, 11.3, 13.8, 16.6, 19.8];

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
      hostScale: HOST_SCALE[i] ?? 1,
      trainingBaseAdd: BASE_ADD[i] ?? 0,
    }));

export const careerRanks: readonly CareerRankDef[] = [...line('civil'), ...line('martial')];

// careerInit 已刪除：名聲退場之後，官階從第一回合起就只由功績決定（21 §2.1）。
// 舊制在入朝那一刻讀一次總名聲來定起始階級 —— 那是名聲唯一的消費端，
// 也是「前十六回合的事件報酬看不出作用」的根源。
