import type { GlowTier } from '../contracts/core/primitives.js';
import type { RunState } from '../contracts/core/state.js';
import { attributeProgress } from '../contracts/core/attribute-progress.js';
import type { DefinitionRegistry } from '../data-runtime/registry.js';
import type { CareerPresentation } from './career-presentation.js';
import type { RewardLine } from './event-receipt.js';

export interface TrainingReceipt { title: string; text: string; lines: readonly RewardLine[] }
export const trainingOutcome = (tier: GlowTier): 0 | 1 | 2 => tier === 'none' ? 0 : tier === 'silver' ? 1 : 2;
// Each fixed action has an unfavorable, ordinary and successful ending. No light-tier labels.
const endings = {
  lead: [
    ['糧車陷進泥地，幾番推挽才送抵營中。雖多費了力氣，也摸清了沿途難處。','糧車按時抵營，清點交割無誤，今日的差事平穩完成。','你改走乾燥的近道，糧車提前抵营，運送安排也越發熟練。'],
    ['糧袋數目幾次對不上，你逐項重查才理清帳目，進展比預期慢了些。','糧秣逐一點清，出入數目相符，今日的盤點順利告一段落。','你一眼找出糧帳的疏漏，將收發次序重新排妥，省下不少工夫。'],
    ['新編隊伍配合生疏，幾次調整才勉強站穩陣列，仍需多加磨合。','各隊依序歸建，職責分派清楚，整編按部就班完成。','你調開互相牽制的隊列，眾人迅速各就其位，配合比先前緊密許多。'],
    ['軍令傳遞幾度受阻，你親自補上疏漏，才讓各營跟上調度。','各營依令行動，軍紀整齊，今日督軍未出差池。','軍令層層傳達，諸營應變如一，你的調度贏得將士信服。'],
  ],
  war: [
    ['步法與出槍總慢了半拍，幾番重練才抓到要領，汗水沒有白費。','你依序練完步法與槍式，動作比昨日熟練，今日操練告一段落。','幾次交手讓你忽然掌握發力訣竅，槍勢連貫，進境格外明顯。'],
    ['隊伍節奏始終難齊，你拆開動作反覆示範，總算穩住陣腳。','你帶著士兵逐項操練，隊列與招式都達到今日要求。','你抓住眾人失誤的關鍵，稍作點撥，整隊的攻防便流暢起來。'],
    ['受閱隊伍接連露出破綻，你逐一記下，這次校閱仍有不少待改之處。','各隊操演完畢，你核對裝備與陣形，完成今日校閱。','你從細微動作看出陣形弱點，當場調整後，各隊攻守立刻更有章法。'],
    ['隊列銜接不如預期，你壓住躁動重新整隊，才完成閱兵。','旗鼓號令整齊，各營依序受閱，將士展現平日所練。','旗鼓一動，諸軍進退如一，整場閱兵氣勢昂揚，將士士氣大振。'],
  ],
  int: [
    ['字跡模糊的舊卷讓你反覆核對，抄錄雖慢，仍從疑難處學到一些門道。','你將今日的文書逐頁抄妥，字句清楚，卷冊也整理齊備。','核對舊卷時，你串起幾處原先不明的記載，抄錄之外更有新的領會。'],
    ['幾筆舊帳混雜不清，你來回查證，才勉強補齊缺漏。','收支逐筆登錄，帳目相符，今日文務平穩完成。','你找出藏在帳目中的錯項，順手理清往來款項，記帳也更有條理。'],
    ['商戶對新安排各有疑慮，你耐心協調，市務才逐漸恢復秩序。','貨價與交易逐一核實，市集運作平穩，今日市務完成。','你看準貨物流向調整安排，商戶往來暢順，市集比往日更有生氣。'],
    ['鹽鐵轉運處處牽連，你反覆核對，才穩住眼前的供應。','鹽鐵收支與轉運安排妥當，各處供應維持有序。','你打通收運環節的阻礙，鹽鐵調度順暢起來，政務上的見識也更進一層。'],
  ],
  pol: [
    ['土質比想像中板結，你費了不少力氣才翻好田地，也漸漸摸清了農事。','你依時翻土播種，田畦整理妥當，今日農務平穩完成。','你看準土壤乾濕調整耕法，田地很快整理齊整，農事要領也豁然明白。'],
    ['田界模糊引起爭執，你重新丈量比對，才逐漸釐清分界。','田界與畝數逐項核實，丈量結果清楚，今日度田完成。','你比對地勢找出丈量疏漏，田界一次釐清，也讓鄉民心服。'],
    ['淤泥比預期更深，你幾次改換工序，水道才勉強疏通。','渠段逐一修整，水流恢復暢通，田間灌溉有了著落。','你順著地勢調整水道，一舉疏通阻塞，鄰近田地也一同受益。'],
    ['人手與農具分配不均，你四處協調，才穩住屯田進度。','人手、田地與糧種分配妥當，屯田依計畫推進。','你將農時與人手安排得宜，各屯配合緊密，田間一派勃勃生機。'],
  ],
} as const;

/** Receipts use committed deltas, so caps, affinity and promotions cannot be overstated. */
export function trainingReceipt(before: RunState, after: RunState, profile: CareerPresentation, defs: DefinitionRegistry): TrainingReceipt {
  const result = after.turn.training;
  if (!result) throw new Error('固定行動尚未結算');
  const lines: RewardLine[] = [];
  const add = (label: string, amount: number, note?: string) => {
    const value = Math.round(amount * 100) / 100;
    if (value) lines.push({ label, amount: value, ...(note ? { note } : {}) });
  };
  for (const attr of ['lead','war','int','pol'] as const) {
    add(defs.text('attr.'+attr+'.short')+'經驗', (after.attributes.values[attr]-before.attributes.values[attr])*100);
    add(defs.text('attr.'+attr+'.short'), attributeProgress(after.attributes.values[attr]).level-attributeProgress(before.attributes.values[attr]).level, '能力');
  }
  add('金幣', after.economy.money-before.economy.money);
  for (const line of ['civil','martial'] as const) {
    add(defs.text('merit.'+line), after.currencies.merit[line]-before.currencies.merit[line]);
    if (after.career[line]>before.career[line]) lines.push({label:line==='civil'?'文官晉升':'武官晉升',promoted:before.career[line]+' → '+after.career[line]});
  }
  for (const member of after.roster.members) add(defs.text(String(defs.reader('notable').get(String(member.notableId)).nameKey)),member.affinity-(before.roster.members.find(m=>m.notableId===member.notableId)?.affinity??0),'好感');
  return {title:profile.label+'・'+profile.action,text:endings[profile.attr][profile.tier][trainingOutcome(result.finalGlow)],lines};
}
