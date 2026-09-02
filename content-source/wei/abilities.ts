// 魏十二人的能力表（33 §3）。
//
// ── 這張表同時是【教學表】★ ─────────────────────────
// 他能教你的，就是他自己表上有的（32 §5.1）。不另立一張「誰能教什麼」——
// 否則同一件事會有兩份可能互相漂移的資料，而漂移不會讓任何測試失敗。
//
// 推論出一個很好的性質：**你能學什麼，取決於你這輩子跟誰共處過。**
// 想學〈萬人敵〉就得跟典韋或張遼熟；想學〈王佐〉只有荀彧教得起。
//
// ── 數值在 0–100，與玩家同尺（D40）★ ────────────────
// 戰前配置畫面上四個人擺在一起可以直接比 —— 驗收型的資訊層靠這個成立。
// 分配原則：主維按稀有度給（★5 ≈ 95、★1 ≈ 76），副維按史實性格鋪開。
// 他的數值決定他【傳令時的效果強度】，不決定他多常傳令（那是好感）。
//
// ── star-0 那一招 ＝ 他的定位 ★ ──────────────────────
// 四職能（武物理／智法術／政恢復／統 Buff）約束的是【名士】，
// 所以每個人的 star-0 一定是他本行那一招 —— 未升星的他就是他的定位。
// 統與政的輸出招（號令／亂辭）掛在 star 1 以上：它們的職責是
// 給【主角】一條輸出路（RFC-01 D19），名士只是順便會。
//
// ── skills 的 star ＝ 他有幾招可選（33 §3.1）★ ───────
// 星階開放選項、好感決定頻率、玩家挑一招。三件事各管一塊，都不碰他的數值。
// 於是兩種跨局投資有了不同的產品：
//   記憶碎片（→星階）買【這一仗更強的夥伴】
//   好感            買【你自己永久變強】（他教你）
import type { NotableAbilityDef } from '../../src/contracts/core/definitions.js';
import type { Attr } from '../../src/contracts/core/primitives.js';
import { skillId, traitId } from '../../src/contracts/core/ids.js';

const T = (slug: string) => traitId(`trait:${slug}`);
const S = (slug: string) => skillId(`skill:${slug}`);

const attrs = (
  lead: number, war: number, int: number, pol: number,
): Readonly<Record<Attr, number>> => ({ lead, war, int, pol });

const abil = (
  a: Readonly<Record<Attr, number>>,
  traits: readonly string[],
  skills: readonly (readonly [number, string])[],
): NotableAbilityDef => ({
  attrs: a,
  traits: traits.map(T),
  skills: skills.map(([star, slug]) => ({ star, skillId: S(slug) })),
});

export const WEI_ABILITIES = {
  // ══ 統 ══════════════════════════════════════════════
  /** 曹操 ★5 · 全能偏統。他是唯一教得起〈治戎〉的人。 */
  caocao: abil(attrs(95, 72, 88, 90), ['chenyi', 'linzhen'],
    [[0, 'guwu'], [1, 'haoling'], [2, 'jiezhi'], [4, 'zhirong']]),
  /** 張遼 ★4 · 統武兼備。〈萬人敵〉的兩個師父之一。 */
  zhangliao: abil(attrs(88, 92, 70, 55), ['danshi', 'linzhen'],
    [[0, 'tuzhen'], [2, 'xianzhen'], [4, 'wanrenzhi']]),
  /** 于禁 ★2 · 持軍嚴整。低星就給得起〈節制〉—— 他的價值在早期。 */
  yujin: abil(attrs(80, 78, 60, 62), ['chenyi'],
    [[0, 'guwu'], [1, 'haoling'], [3, 'jiezhi']]),

  // ══ 武 ══════════════════════════════════════════════
  xiahoudun: abil(attrs(78, 90, 55, 50), ['danshi'],
    [[0, 'tuzhen'], [2, 'xianzhen']]),
  /** 典韋 ★3 · 全表最高武。〈萬人之敵〉這條特質只有他有。 */
  dianwei: abil(attrs(60, 94, 40, 38), ['danshi', 'wanrendi'],
    [[0, 'tuzhen'], [3, 'wanrenzhi']]),
  /** 樂進 ★1 · 只有一招。他是「便宜但夠用」那一格。 */
  lejin: abil(attrs(66, 76, 48, 45), ['danshi'],
    [[0, 'tuzhen']]),

  // ══ 智 ══════════════════════════════════════════════
  guojia: abil(attrs(62, 42, 96, 68), ['jimin', 'liaodi'],
    [[0, 'huoji'], [2, 'shuiyan'], [4, 'lianhuan']]),
  /** 賈詡 ★5 · 他同時教得起〈剛愎〉—— 負面特質是角色刻畫，不是懲罰。 */
  jiaxu: abil(attrs(66, 45, 97, 80), ['liaodi', 'gangbi'],
    [[0, 'huoji'], [2, 'lianhuan']]),
  chengyu: abil(attrs(60, 52, 84, 76), ['jimin'],
    [[0, 'huoji'], [3, 'shuiyan']]),

  // ══ 政 ══════════════════════════════════════════════
  /** 荀彧 ★5 · 王佐之才。〈王佐〉與〈經緯之才〉只有他教得起。 */
  xunyu: abil(attrs(70, 40, 95, 92), ['liande', 'zhechong', 'jingwei'],
    [[0, 'fumin'], [1, 'luanci'], [2, 'tuntian'], [4, 'wangzuo']]),
  chenqun: abil(attrs(58, 35, 82, 90), ['liande', 'zhechong'],
    [[0, 'fumin'], [3, 'tuntian']]),
  maojie: abil(attrs(55, 40, 74, 82), ['liande'],
    [[0, 'fumin'], [2, 'luanci'], [3, 'tuntian']]),
} as const satisfies Readonly<Record<string, NotableAbilityDef>>;
