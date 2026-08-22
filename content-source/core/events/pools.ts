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

// GREYBOX：小檢定 DC 依章節縮放。9 章對應 chapterMultiplier 的長度。
// 設計意圖：easy 幾乎必過、normal 要練過、hard 要偏科才過得去。
//
// ── 重新反推（單動作回合制）──────────────────────────
// 舊的 normal／hard 是照【專精單維】訂的（ch1 73／94）。實際遊玩時
// 第 1 章四維還是 0（吃 baseFloor 25），高風險選項成功率恆為 0% ——
// 選項看得到卻永遠不能選，等於死內容（HANDOFF 問題 3）。
//
// 新基準改用【章中的單一相關維】，由 chapterMultiplier 的累積比放大：
//   累積比 1.0 / 2.3 / 4.0 / 6.2 / 9.0 / 12.5 / 16.8 / 22.0 / 28.2
//   ch1 基準 30 → ref = 30 × 累積比
// 三檔各取 ref 的 0.6 ／ 1.0 ／ 1.35 倍。
//
// 這條曲線在單動作回合制下比以前重要得多：事件要花掉一整個鍛鍊回合，
// 若成功率不可及，玩家就不會去做事，整條事件線會空轉。
export const dcCurves: readonly DcCurveDef[] = [
  coreDef('dcCurve', 'dc:easy', {
    curveId: dcCurveId('dc:easy'),
    byChapter: [18, 41, 72, 112, 162, 225, 302, 396, 508],
  }),
  coreDef('dcCurve', 'dc:normal', {
    curveId: dcCurveId('dc:normal'),
    byChapter: [30, 69, 120, 186, 270, 375, 504, 660, 846],
  }),
  coreDef('dcCurve', 'dc:hard', {
    curveId: dcCurveId('dc:hard'),
    byChapter: [41, 93, 162, 251, 365, 506, 680, 891, 1142],
  }),
];
