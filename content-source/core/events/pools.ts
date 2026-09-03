import type { DcCurveDef, ParamPoolDef } from '../../../src/contracts/core/definitions.js';
import { dcCurveId, paramPoolId } from '../../../src/contracts/core/ids.js';
import { asKey } from '../../authoring.js';
import { coreDef } from '../pack-id.js';

const k = asKey;
const range = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => k(`${prefix}.${i}`));

// 委託模板的參數池。池越大，同一模板重複出現時的辨識度越低。
export const paramPools: readonly ParamPoolDef[] = [
  coreDef('paramPool', 'pool:place', { poolId: paramPoolId('pool:place'), entries: range('param.place', 12) }),
  coreDef('paramPool', 'pool:patron', { poolId: paramPoolId('pool:patron'), entries: range('param.patron', 10) }),
  coreDef('paramPool', 'pool:bandit', { poolId: paramPoolId('pool:bandit'), entries: range('param.bandit', 8) }),
  coreDef('paramPool', 'pool:goods', { poolId: paramPoolId('pool:goods'), entries: range('param.goods', 8) }),
  coreDef('paramPool', 'pool:festival', { poolId: paramPoolId('pool:festival'), entries: range('param.festival', 6) }),
];

// ── 小檢定 DC：索引是【官階階級】不是章節 ★ ────────────
//
// 舊版按章節索引。實測抓到的缺陷：一個到第 4 章才開始練文政的玩家，
// 拿第 1 章水準的政去對第 4 章的 DC —— 成功率恆為 0%，
// 「後期轉換道路」在制度上不可能，那條路等於封死。
//
// 改由該委託所屬官階線的階級索引之後，文武兩軌各自獨立計時：
//   文官一階 → 朝廷派給你的文事就是一階的難度（你也真的只有一階的政）
//   武官八階 → 武事就是八階的難度
// 報酬用同一個索引（`eventYieldCurve.tierMultiplier`），因此壓低某一線的
// 官階不會變成「刷簡單高報酬」的農場 —— 難度與報酬一起長。
//
// ── 三檔的反推 ────────────────────────────────────
// 小檢定只吃單一維（無副屬性）。比例骰的封閉式解出：
//   成功率 99% ⇔ DC ≈ 0.50 × 檢定值   ← 低檔（已從 0.72 改）
//   成功率 51% ⇔ DC ≈ 1.00 × 檢定值   ← 中檔
//   成功率 25% ⇔ DC ≈ 1.26 × 檢定值   ← 高檔
//
// ── 低檔改成【幾乎必過】★ 玩家的要求 ────────────────
// 「我希望簡單是幾乎 100% 會過，但功績跟經驗真的不多。」
// 舊的 79% 讓低檔變成一個要考慮的賭注 —— 那不是「交差了事」該有的樣子。
// 交差了事應該是【不用想】：它換走的是報酬（3 功績、Σweight 0.6），
// 不是你的注意力。
//
// ── 已改為 0–100 尺度（RFC-01 D30）★ ─────────────────
//
// 舊值反推自「四維上限 999、鍛鍊直接加屬性」。兩個前提都不成立了：
// 屬性上限是 100，而且要花經驗買，所以同一個官階下的期望單維值低得多。
//
// 「該階級的期望單維值」改用新制反推 —— 專精者在該階自然練到的主維：
//   rank    1   2   3   4   5   6   7   8   9  10  11  12
//   期望值 22  26  33  45  55  63  70  76  82  87  92  96
// （階梯計價讓高段越來越貴，因此曲線在後段趨平 —— 這正是 32 §3.1 的形狀。）
//
// ── 前兩階已改（原 12／22）★ 實測畫面抓到的 ─────────
// 起始四維是 15–30（D41，平均 22.5），所以 rank 1 的期望單維值就是
// 【你剛擲到的那個數】，不是 12。舊值之下第一回合的畫面是
// 「低 100% ／ 中 100%」—— 兩檔一樣，那一格的決定不存在。
// rank 2 同理往上讓一點，讓兩階的斜率接得上第三階。
//
// 三檔仍取 0.72 ／ 1.00 ／ 1.26 倍。GREYBOX：未實測。
export const dcCurves: readonly DcCurveDef[] = [
  coreDef('dcCurve', 'dc:easy', {
    curveId: dcCurveId('dc:easy'),
    byTier: [11, 13, 17, 23, 28, 32, 35, 38, 41, 44, 46, 48],
  }),
  coreDef('dcCurve', 'dc:normal', {
    curveId: dcCurveId('dc:normal'),
    byTier: [22, 26, 33, 45, 55, 63, 70, 76, 82, 87, 92, 96],
  }),
  coreDef('dcCurve', 'dc:hard', {
    curveId: dcCurveId('dc:hard'),
    byTier: [28, 33, 42, 57, 69, 79, 88, 96, 103, 110, 116, 121],
  }),
];
