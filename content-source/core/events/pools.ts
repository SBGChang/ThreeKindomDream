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
// 小檢定只吃單一維（無副屬性），baseFloor 25。比例骰的封閉式解出：
//   成功率 79% ⇔ DC ≈ 0.72 × 檢定值
//   成功率 50% ⇔ DC ≈ 1.00 × 檢定值
//   成功率 25% ⇔ DC ≈ 1.26 × 檢定值
//
// 「該階級的期望單維值」取自實測（專精單線者 rank 8 時主維約 750–1000）：
//   rank    1   2   3   4   5   6   7   8    9    10   11   12
//   期望值 30  80 150 250 380 540 730 950 1200 1480 1790 2130
//
// 因此 low／mid／high 三檔各取 0.72 ／ 1.00 ／ 1.26 倍。
// rank 1 的 hard 是 0%（吃 baseFloor）—— 但 high 檔一律要求官階 ≥ 稀有度＋1，
// 一階時本來就開不了，兩件事對得上。
export const dcCurves: readonly DcCurveDef[] = [
  coreDef('dcCurve', 'dc:easy', {
    curveId: dcCurveId('dc:easy'),
    byTier: [22, 58, 108, 180, 274, 389, 526, 684, 864, 1066, 1289, 1534],
  }),
  coreDef('dcCurve', 'dc:normal', {
    curveId: dcCurveId('dc:normal'),
    byTier: [30, 80, 150, 250, 380, 540, 730, 950, 1200, 1480, 1790, 2130],
  }),
  coreDef('dcCurve', 'dc:hard', {
    curveId: dcCurveId('dc:hard'),
    byTier: [38, 101, 189, 315, 479, 680, 920, 1197, 1512, 1865, 2255, 2684],
  }),
];
