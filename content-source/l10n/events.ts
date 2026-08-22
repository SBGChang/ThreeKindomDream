export const eventTexts: Record<string, string> = {
  // ── 居民委託（模板，含佔位符）─────────────────────
  'event.resident.errand.title': '託書',
  'event.resident.errand.body': '{patron}託你將一封書信送往{place}，說是要緊事。',
  'event.resident.errand.opt.deliver': '如期送到',
  'event.resident.errand.opt.open': '先拆開看看寫了什麼',

  'event.resident.festival.title': '鄉里之會',
  'event.resident.festival.body': '{place}的鄉里正辦{festival}，人人都在。',
  'event.resident.festival.opt.join': '混在人群裡湊個熱鬧',
  'event.resident.festival.opt.host': '出面主持，張羅諸事',

  'event.resident.strays.title': '流寇之患',
  'event.resident.strays.body': '{place}近來有{bandit}出沒，鄉民不敢下田。',
  'event.resident.strays.opt.drive': '擊退了便算',
  'event.resident.strays.opt.slay': '一個不留，掛頭於道旁示眾',

  'event.resident.trade.title': '市易',
  'event.resident.trade.body': '{patron}想購入一批{goods}，苦於不通行情。',
  'event.resident.trade.opt.fair': '按實價替他張羅',
  'event.resident.trade.opt.gouge': '從中抬價，餘利自留',

  // ── 陣營委託（魏）─────────────────────────────────
  'event.wei.subdue.title': '討匪',
  'event.wei.subdue.body': '{place}有{bandit}作亂，{patron}命你前去清剿。',
  'event.wei.subdue.opt.strike': '領兵直擊',
  'event.wei.subdue.opt.pacify': '先招撫，能不戰則不戰',

  'event.wei.procure.title': '採買',
  'event.wei.procure.body': '軍中缺{goods}，{patron}撥你錢帛，限期購足。',
  'event.wei.procure.opt.buy': '走市價，帳目分明',
  'event.wei.procure.opt.requisition': '就地徵發，省下錢帛',

  'event.wei.reclaim.title': '拓荒',
  'event.wei.reclaim.body': '{place}地荒人稀，{patron}命你前往安置流民。',
  'event.wei.reclaim.opt.settle': '劃田授種，立屯田之制',
  'event.wei.reclaim.opt.conscript': '編為軍戶，充作丁壯',

  // ── 名士事件（唯一）───────────────────────────────
  'event.notable.caocao.trust.title': '深夜相召',
  'event.notable.caocao.trust.body':
    '燈還亮著。他把一卷未署名的文書推到你面前。「這個，你怎麼看？」',
  'event.notable.caocao.trust.opt.loyal': '據實直言，該諫的諫',
  'event.notable.caocao.trust.opt.ambitious': '順著他的意思往下說',

  'event.notable.xunyu.counsel.title': '尚書台的夜',
  'event.notable.xunyu.counsel.body':
    '他把兩份幾乎相同的簿冊並排放下。「你看得出哪一份是真的嗎？」',
  'event.notable.xunyu.counsel.opt.accept': '照他的方法重算一遍',
  'event.notable.xunyu.counsel.opt.dissent': '指出他的方法本身就錯了',

  'event.notable.guojia.gambit.title': '一個賭',
  'event.notable.guojia.gambit.body':
    '「三成勝算。」他笑得很輕。「但贏了，整個河北都是我們的。你敢不敢押？」',
  'event.notable.guojia.gambit.opt.gamble': '押',
  'event.notable.guojia.gambit.opt.safe': '不押，穩著走',
};
