// 委託文案。ID 的座標是 (維 × 稀有度)，文案也照這個順序排 ——
// 缺哪一桶用肉眼就看得出來。
//
// ── 三檔的軸線是【費力程度】，不是善惡 ★ ──────────────
//
//   低  交差了事：做完該做的最小份量
//   中  照規矩辦：正經處理這件事
//   高  做到底  ：多走一步，把事情整個解決掉
//
// 舊版的文案帶著善惡色彩（掛頭示眾、偽造書信、哄抬、就地徵發）——
// 那是善惡名還在時寫的。善惡名退場之後，「做壞事」在機制上沒有任何代價，
// 那些文字只是在假裝有取捨。現在三檔一律只差在【肯花多少力氣】。
//
// 三檔要讀得出份量差別：文字撐不起差別，決定就是假的。
export const eventTexts: Record<string, string> = {
  // ── 統 · 帶兵治軍 ─────────────────────────────────
  'event.lead.1.muster.title': '點閱',
  'event.lead.1.muster.body': '{place}的屯所久未點閱，簿冊上的人數與站在你面前的對不上。',
  'event.lead.1.muster.opt.count': '照冊點清，缺的據實上報',
  'event.lead.1.muster.opt.purge': '逐隊校驗，補足缺額',

  'event.lead.2.escort.title': '押運',
  'event.lead.2.escort.body': '{patron}託你把一批{goods}押往{place}。這一路，近來不甚安寧。',
  'event.lead.2.escort.opt.slow': '多帶護衛，走得慢些也無妨',
  'event.lead.2.escort.opt.fast': '輕裝疾行，趕在賊人合圍之前過去',

  'event.lead.3.quell.title': '平亂',
  'event.lead.3.quell.body': '{place}有{bandit}嘯聚為亂。郡中撥你一部人馬，如何用是你的事。',
  'event.lead.3.quell.opt.encircle': '分兵圍堵，逼其自散',
  'event.lead.3.quell.opt.assault': '合兵一擊，正面破之',

  'event.lead.4.campaign.title': '獨當一面',
  'event.lead.4.campaign.body': '大軍北上，{place}一路無人可領。上面問你：敢不敢自己帶一軍？',
  'event.lead.4.campaign.opt.accept': '領一軍出征，按令而行',
  'event.lead.4.campaign.opt.deep': '深入敵境，斷其後路',

  // ── 武 · 廝殺 ─────────────────────────────────────
  'event.war.1.strays.title': '流寇之患',
  'event.war.1.strays.body': '{place}近來有{bandit}出沒，鄉民不敢下田。',
  'event.war.1.strays.opt.drive': '擊退了便算',
  'event.war.1.strays.opt.slay': '追到山口，逐盡而返',

  'event.war.2.stronghold.title': '山塢',
  'event.war.2.stronghold.body': '{bandit}據{place}的山塢為寨，屢劫商旅。寨門只有一條路上去。',
  'event.war.2.stronghold.opt.starve': '圍而不攻，斷水絕糧待其自潰',
  'event.war.2.stronghold.opt.storm': '強攻上寨，天亮之前結束',

  'event.war.3.duel.title': '搦戰',
  'event.war.3.duel.body': '兩軍對峙於{place}。敵陣中有人出馬，指名叫陣。',
  'event.war.3.duel.opt.hold': '按兵不動，不與匹夫爭一時之勇',
  'event.war.3.duel.opt.answer': '出陣應之',

  'event.war.4.banner.title': '奪旗',
  'event.war.4.banner.body': '{place}城下，敵將的大旗就在望。左右都在看你。',
  'event.war.4.banner.opt.array': '整陣而前，穩穩推過去',
  'event.war.4.banner.opt.charge': '直取那面旗',

  // ── 智 · 謀劃 ─────────────────────────────────────
  'event.int.1.archive.title': '校書',
  'event.int.1.archive.body': '{patron}送來一批文書，其中數處前後矛盾，看不出是誰抄錯了。',
  'event.int.1.archive.opt.collate': '逐條校對，改正錯處',
  'event.int.1.archive.opt.rewrite': '追出原本，逐處比對',

  'event.int.2.ledger.title': '核簿',
  'event.int.2.ledger.body': '{place}的{goods}帳目與實存差得離譜。經手的人已經不在了。',
  'event.int.2.ledger.opt.cover': '先把數目對齊，差額另冊記下',
  'event.int.2.ledger.opt.audit': '一筆一筆查到底',

  'event.int.3.counsel.title': '軍議',
  'event.int.3.counsel.body': '{place}該怎麼打，帳中眾說紛紜。所有人都轉頭看你。',
  'event.int.3.counsel.opt.silence': '附議一策，不另生枝節',
  'event.int.3.counsel.opt.speak': '陳一策，成敗自負',

  'event.int.4.stratagem.title': '離間',
  'event.int.4.stratagem.body': '敵營中有人可用。事若成，{place}不戰而下。',
  'event.int.4.stratagem.opt.envoy': '遣使遞話，探其意向',
  'event.int.4.stratagem.opt.forge': '許以重利，約期舉事',

  // ── 政 · 治理 ─────────────────────────────────────
  'event.pol.1.dispute.title': '爭訟',
  'event.pol.1.dispute.body': '{place}兩姓為一塊地爭了三代，如今鬧到你這裡來。',
  'event.pol.1.dispute.opt.mediate': '勸兩家各讓一步',
  'event.pol.1.dispute.opt.rule': '查明地界，按律判定',

  'event.pol.2.farming.title': '勸農',
  'event.pol.2.farming.body': '春耕在即，{place}的丁壯多半被徵走了。田裡只剩老弱。',
  'event.pol.2.farming.opt.press': '按原額徵發，餘事不動',
  'event.pol.2.farming.opt.release': '放一批人回去下田',

  'event.pol.3.survey.title': '度田',
  'event.pol.3.survey.body': '{place}的田籍多年未理，豪強隱田甚多，人人心裡都清楚。',
  'event.pol.3.survey.opt.trade': '照舊籍抄報，不動現狀',
  'event.pol.3.survey.opt.measure': '重新丈量，該補的補上',

  'event.pol.4.pacify.title': '撫定',
  'event.pol.4.pacify.body': '{place}新附，人心未定。上面把這一郡交給你。',
  'event.pol.4.pacify.opt.garrison': '設營戍守，先維持不亂',
  'event.pol.4.pacify.opt.appease': '安撫人心，賦稅緩徵',

  // ── 陣營委託（魏）─────────────────────────────────
  'event.wei.subdue.title': '討匪',
  'event.wei.subdue.body': '{place}有{bandit}作亂，{patron}命你前去清剿。',
  'event.wei.subdue.opt.strike': '領兵直擊',
  'event.wei.subdue.opt.pacify': '先招撫，能不戰則不戰',

  'event.wei.procure.title': '採買',
  'event.wei.procure.body': '軍中缺{goods}，{patron}撥你錢帛，限期購足。',
  'event.wei.procure.opt.buy': '走市價，帳目分明',
  'event.wei.procure.opt.requisition': '就近採辦，數目足即可',

  'event.wei.reclaim.title': '拓荒',
  'event.wei.reclaim.body': '{place}地荒人稀，{patron}命你前往安置流民。',
  'event.wei.reclaim.opt.settle': '劃田授種，立屯田之制',
  'event.wei.reclaim.opt.conscript': '就地安置，先讓人活下來',

  'event.wei.review.title': '校閱',
  'event.wei.review.body': '{patron}要親自校閱你帶的那一部。三日後。',
  'event.wei.review.opt.drill': '這三天把陣列操熟',
  'event.wei.review.opt.borrow': '照常操演，不特意加練',

  // ── 高檔選項（17 §5）─────────────────────────────
  // 每則委託的第三個選項：要官階才開得了，最難，報酬最多。
  // 它們刻意都是「多做一步」而不是「換個做法」—— 高條件買到的是
  // 把事情做到底的權限。
  'event.lead.1.muster.opt.rebuild': '重編全屯，連編制帶器械一併理清',
  'event.lead.2.escort.opt.ambush': '分兵設伏，把整條路清出來再走',
  'event.lead.3.quell.opt.enlist': '親自入寨招降，收其眾為部曲',
  'event.lead.4.campaign.opt.seize': '連夜奔襲，一戰取其城',
  'event.war.1.strays.opt.hunt': '追至其巢穴，連根拔了',
  'event.war.2.stronghold.opt.climb': '夜間攀崖而上，從背面破寨',
  'event.war.3.duel.opt.wager': '出陣應之，並約：敗者退兵三十里',
  'event.war.4.banner.opt.alone': '單騎入陣，穿透兩重陣列取旗',
  'event.int.1.archive.opt.recompile': '重修全卷，附上自己的考證',
  'event.int.2.ledger.opt.impeach': '上溯三年，把整條帳路重建出來',
  'event.int.3.counsel.opt.refute': '當眾駁倒滿帳之議，另立一策',
  'event.int.4.stratagem.opt.parley': '親自入敵營，當面說降',
  'event.pol.1.dispute.opt.deeds': '翻出三代舊契，一次斷絕爭端',
  'event.pol.2.farming.opt.petition': '上書請免本郡今年賦稅',
  'event.pol.3.survey.opt.seize': '逐鄉重丈，隱田盡數入籍',
  'event.pol.4.pacify.opt.granary': '開倉賑濟，並簡其豪右為吏',
  'event.wei.review.opt.contest': '請主公改校演陣，當場對抗鄰部',
  'event.wei.subdue.opt.capture': '生擒其首領，解送許都',
  'event.wei.procure.opt.route': '另闢商路，此後不必再求人',
  'event.wei.reclaim.opt.office': '立屯田都尉府，自成一制',

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
