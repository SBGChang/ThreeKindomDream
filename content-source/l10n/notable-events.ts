// 魏的人物事件與人物委託文案。
//
// ── 人物事件的兩個選項【沒有高下】★ ────────────────────
//
// 它是性格分歧不是難度階梯：兩邊的功績與道具完全相同，差別只在
// 磨練到哪幾維。因此文字不能寫成「穩妥 vs 冒險」——
// 那會讓玩家去找「正確答案」，而這裡沒有正確答案。
//
// ── 人物委託的三檔【是】階梯 ──────────────────────────
//
// 與一般委託同一條軸線：費力程度。低／中／高在難度、功績、磨練
// 三項上同向遞增，最難檔多一份獎勵。
export const notableEventTexts: Record<string, string> = {
  // ══ 入門 · 十二則 ════════════════════════════════
  'event.wei.caocao-summon.title': '深夜相召',
  'event.wei.caocao-summon.body': '燈還亮著。他把一卷剛送到的軍報推過來，問你怎麼看。沒有旁人。',
  'event.wei.caocao-summon.opt.a': '就軍報論軍報，把幾路人馬的位置說清楚',
  'event.wei.caocao-summon.opt.b': '先問他為什麼此刻要問',

  'event.wei.zhangliao-eight-hundred.title': '八百人',
  'event.wei.zhangliao-eight-hundred.body': '他在點名。八百個名字，一個一個唸，唸完抬頭看你：「夠了。」',
  'event.wei.zhangliao-eight-hundred.opt.a': '問他打算怎麼用這八百人',
  'event.wei.zhangliao-eight-hundred.opt.b': '什麼都不問，替他把陣列排好',

  'event.wei.yujin-camp.title': '連營',
  'event.wei.yujin-camp.body': '雨下了三天。他繞著營走第四圈，把每一道排水溝重新量過。',
  'event.wei.yujin-camp.opt.a': '陪他量完最後一段',
  'event.wei.yujin-camp.opt.b': '勸他先歇，明日再量',

  'event.wei.xiahoudun-arrow.title': '拔矢',
  'event.wei.xiahoudun-arrow.body': '軍醫的手在抖。他自己伸手把箭桿折斷，然後看向站在門口的你。',
  'event.wei.xiahoudun-arrow.opt.a': '走上前按住他的肩',
  'event.wei.xiahoudun-arrow.opt.b': '退出去，把門帶上',

  'event.wei.dianwei-halberds.title': '雙戟',
  'event.wei.dianwei-halberds.body': '他把兩把短戟並排放在地上，讓你試著提一提。',
  'event.wei.dianwei-halberds.opt.a': '兩手各提一把',
  'event.wei.dianwei-halberds.opt.b': '先問這東西該怎麼用',

  'event.wei.lejin-vanguard.title': '先登',
  'event.wei.lejin-vanguard.body': '攻城的名冊要報上去。他把自己的名字寫在第一行，寫得很小。',
  'event.wei.lejin-vanguard.opt.a': '把他的名字挪到該在的位置',
  'event.wei.lejin-vanguard.opt.b': '照他寫的報上去',

  'event.wei.guojia-wager.title': '一個賭',
  'event.wei.guojia-wager.body': '他病著，卻笑得很開心：「我押他三日內必走。你押什麼？」',
  'event.wei.guojia-wager.opt.a': '押他不走',
  'event.wei.guojia-wager.opt.b': '問他憑什麼這麼篤定',

  'event.wei.jiaxu-one-word.title': '一句話',
  'event.wei.jiaxu-one-word.body': '議事散了。他最後才開口，只說了一句，然後所有人都改了主意。',
  'event.wei.jiaxu-one-word.opt.a': '追出去問那句話的來由',
  'event.wei.jiaxu-one-word.opt.b': '留下來，把改過的方案重寫一遍',

  'event.wei.chengyu-three-days.title': '三日糧',
  'event.wei.chengyu-three-days.body': '倉裡只剩三日的糧。他把帳冊闔上，說：「還撐得住。」',
  'event.wei.chengyu-three-days.opt.a': '問他這三日打算怎麼撐',
  'event.wei.chengyu-three-days.opt.b': '自己去把附近的存糧再清一遍',

  'event.wei.xunyu-night.title': '尚書台的夜',
  'event.wei.xunyu-night.body': '公文堆到了膝蓋。他一份一份看完，看到你進來也沒抬頭。',
  'event.wei.xunyu-night.opt.a': '坐下來，從另一頭幫他看',
  'event.wei.xunyu-night.opt.b': '把最急的那幾份挑出來遞給他',

  'event.wei.chenqun-grading.title': '品第',
  'event.wei.chenqun-grading.body': '他在給一批人定品。名冊上有一個名字，他停了很久。',
  'event.wei.chenqun-grading.opt.a': '問他為什麼停在那裡',
  'event.wei.chenqun-grading.opt.b': '把那個人的來歷查清楚給他',

  'event.wei.maojie-recommend.title': '舉士',
  'event.wei.maojie-recommend.body': '他遞來一份名單：「這幾個人，你去見一見。」名單上沒有一個是有名的。',
  'event.wei.maojie-recommend.opt.a': '照單全見',
  'event.wei.maojie-recommend.opt.b': '先問他為什麼選這幾個',

  // ══ 第二則 · 知交 60 ══════════════════════════════
  'event.wei.zhangliao-persuade.title': '勸降',
  'event.wei.zhangliao-persuade.body': '對面的守將是他的舊識。他要單騎過去，只帶一句話。',
  'event.wei.zhangliao-persuade.opt.a': '陪他過去',
  'event.wei.zhangliao-persuade.opt.b': '在後面把接應排好',

  'event.wei.yujin-changxi.title': '昌豨',
  'event.wei.yujin-changxi.body': '降將是他多年的朋友。軍法寫得清清楚楚。他把刀擦了很久。',
  'event.wei.yujin-changxi.opt.a': '什麼都不說，站在他旁邊',
  'event.wei.yujin-changxi.opt.b': '替他把軍法再唸一遍',

  'event.wei.xiahoudun-farmland.title': '太壽陂',
  'event.wei.xiahoudun-farmland.body': '他脫了甲，自己下田挑土。旁邊的士兵一開始沒認出他。',
  'event.wei.xiahoudun-farmland.opt.a': '也脫了甲下去',
  'event.wei.xiahoudun-farmland.opt.b': '去把水道的圖重新畫過',

  'event.wei.lejin-no-boast.title': '不言功',
  'event.wei.lejin-no-boast.body': '報功的文書送到他手上。他看了一眼，把自己那一段劃掉了。',
  'event.wei.lejin-no-boast.opt.a': '問他為什麼劃掉',
  'event.wei.lejin-no-boast.opt.b': '把那一段補回去，署上你的名字作證',

  'event.wei.chengyu-hundred-thousand.title': '十萬之眾',
  'event.wei.chengyu-hundred-thousand.body': '他報上來的數字比實際多了一倍。你查出來了，他知道你查出來了。',
  'event.wei.chengyu-hundred-thousand.opt.a': '當面問他',
  'event.wei.chengyu-hundred-thousand.opt.b': '把真的數字另抄一份留著',

  'event.wei.chenqun-nine-ranks.title': '九品',
  'event.wei.chenqun-nine-ranks.body': '他把整套品第的條文攤開，從第一條開始講給你聽。講了一整夜。',
  'event.wei.chenqun-nine-ranks.opt.a': '聽到最後一條',
  'event.wei.chenqun-nine-ranks.opt.b': '中途開始記筆記，一條一條問',

  'event.wei.maojie-pure-talk.title': '清議',
  'event.wei.maojie-pure-talk.body': '有人在背後說他選人太苛。他聽見了，還是照原樣報上去。',
  'event.wei.maojie-pure-talk.opt.a': '替他把話擋回去',
  'event.wei.maojie-pure-talk.opt.b': '把他選的那幾個人的政績整理成冊',

  // ══ 單人鏈 · 中段與鏈末 ═══════════════════════════
  'event.wei.caocao-green-plum.title': '青梅',
  'event.wei.caocao-green-plum.body': '雨要來了。他指著天邊那一片雲，問你當今誰算得上英雄。',
  'event.wei.caocao-green-plum.opt.a': '照實說出幾個名字',
  'event.wei.caocao-green-plum.opt.b': '把話題引開，只談那片雲',

  'event.wei.caocao-merit-only.title': '唯才是舉',
  'event.wei.caocao-merit-only.body': '他要下一道令。有人勸他改幾個字，他不肯。他把筆遞給你：「你寫。」',
  'event.wei.caocao-merit-only.opt.a': '照他的意思一字不改',
  'event.wei.caocao-merit-only.opt.b': '把那幾個字改了，然後告訴他你改了',

  'event.wei.guojia-ten-wins.title': '十勝十敗',
  'event.wei.guojia-ten-wins.body': '他把袁紹與曹操逐條並列，一共十條。說完他咳了很久。',
  'event.wei.guojia-ten-wins.opt.a': '把那十條記下來',
  'event.wei.guojia-ten-wins.opt.b': '去替他請醫',

  'event.wei.guojia-last-plan.title': '遺計定遼東',
  'event.wei.guojia-last-plan.body': '他已經不能起身了。手邊有一封信，封好的，寫著「北歸之後再拆」。',
  'event.wei.guojia-last-plan.opt.a': '收下，照他說的等',
  'event.wei.guojia-last-plan.opt.b': '請他把裡面的意思先說一遍',

  'event.wei.xunyu-deep-root.title': '深根固本',
  'event.wei.xunyu-deep-root.body': '諸將都想往前打。他鋪開一張圖，講的是後方的糧與人。',
  'event.wei.xunyu-deep-root.opt.a': '站到他那一邊',
  'event.wei.xunyu-deep-root.opt.b': '替他把後方的數字重算一遍再說',

  'event.wei.xunyu-empty-box.title': '空盒',
  'event.wei.xunyu-empty-box.body': '一個食盒送到他案上。他開了，裡面什麼都沒有。他看了很久，然後笑了一下。',
  'event.wei.xunyu-empty-box.opt.a': '把盒子收起來，什麼都不問',
  'event.wei.xunyu-empty-box.opt.b': '問他這是什麼意思',

  // ══ 遺物鏈末 ═════════════════════════════════════
  'event.wei.xiahoudun-one-eye.title': '獨眼',
  'event.wei.xiahoudun-one-eye.body': '軍中都叫他「盲夏侯」。他把鏡子摔了。今天他自己把鏡子撿回來，擺正。',
  'event.wei.xiahoudun-one-eye.opt.a': '什麼都不說，遞給他一把劍',
  'event.wei.xiahoudun-one-eye.opt.b': '陪他把那面鏡子重新掛上',

  'event.wei.zhangliao-hefei.title': '合肥',
  'event.wei.zhangliao-hefei.body': '木匣是主公離開時留下的，上面寫著「賊至乃發」。孫權來了。他把匣子推到你面前。',
  'event.wei.zhangliao-hefei.opt.a': '請他先拆',
  'event.wei.zhangliao-hefei.opt.b': '自己動手拆開，唸出來',

  // ══ 多人 ═════════════════════════════════════════
  'event.wei.wancheng-gate.title': '轅門之外',
  'event.wei.wancheng-gate.body': '降兵在夜裡反了。主公還在帳中。轅門只剩一個人守著。',
  'event.wei.wancheng-gate.opt.a': '衝去轅門',
  'event.wei.wancheng-gate.opt.b': '先把主公的馬牽出來',

  'event.wei.wancheng-halberds.title': '雙戟不還',
  'event.wei.wancheng-halberds.body': '天亮了。轅門還立著一個人的樣子，手裡的兩把戟都斷了。誰都不敢先過去。',
  'event.wei.wancheng-halberds.opt.a': '走過去，把他放下來',
  'event.wei.wancheng-halberds.opt.b': '讓全軍列隊，從他面前走過',

  'event.wei.two-reckonings.title': '王佐與毒士',
  'event.wei.two-reckonings.body': '同一件事，兩個人算出兩套辦法。一套是正的，一套是奇的。他們都看著你。',
  'event.wei.two-reckonings.opt.a': '照正的那一套走',
  'event.wei.two-reckonings.opt.b': '把兩套接起來用',

  'event.wei.five-generals.title': '五子良將',
  'event.wei.five-generals.body': '五個名字要刻在同一方印上。你手邊只有三個人，而印已經在刻了。',
  'event.wei.five-generals.opt.a': '照三個人刻',
  'event.wei.five-generals.opt.b': '留下另外兩個位置',

  // ══ 人物委託 · 十二則 ════════════════════════════
  'event.wei.nc.edict.title': '求賢令',
  'event.wei.nc.edict.body': '主公要你替他辦一件事：把散在各處、名聲不好卻真有本事的人找出來。',
  'event.wei.nc.edict.opt.low': '照名冊上的走一遍',
  'event.wei.nc.edict.opt.mid': '逐郡訪過，把該見的都見了',
  'event.wei.nc.edict.opt.high': '連被人罵過的那幾個也一併請來',

  'event.wei.nc.liaocomes.title': '遼來',
  'event.wei.nc.liaocomes.body': '張遼要你替他挑一批人。他只說了一個條件：「敢在天亮之前出門的。」',
  'event.wei.nc.liaocomes.opt.low': '從現有的隊裡挑',
  'event.wei.nc.liaocomes.opt.mid': '設一場夜行，篩過一遍',
  'event.wei.nc.liaocomes.opt.high': '親自帶他們走完一趟夜路',

  'event.wei.nc.stockade.title': '立寨',
  'event.wei.nc.stockade.body': '于禁要在此地立一座寨。他把尺遞給你：「量。」',
  'event.wei.nc.stockade.opt.low': '照舊例的尺寸立',
  'event.wei.nc.stockade.opt.mid': '按地勢重畫一版',
  'event.wei.nc.stockade.opt.high': '連排水與哨位一起算進去',

  'event.wei.nc.oversee.title': '督軍',
  'event.wei.nc.oversee.body': '夏侯惇要你替他督一路人馬。他只交代一句：「別讓他們回頭看我。」',
  'event.wei.nc.oversee.opt.low': '照令行事，不多問',
  'event.wei.nc.oversee.opt.mid': '走在隊前，把該擋的擋下來',
  'event.wei.nc.oversee.opt.high': '一路壓到底，把落隊的也帶回來',

  'event.wei.nc.nightguard.title': '宿衛',
  'event.wei.nc.nightguard.body': '典韋要你陪他值一夜。他不說為什麼，只把一把戟靠在你腳邊。',
  'event.wei.nc.nightguard.opt.low': '值到換班',
  'event.wei.nc.nightguard.opt.mid': '把整圈崗哨都走過一遍',
  'event.wei.nc.nightguard.opt.high': '值到天亮，一步沒離開',

  'event.wei.nc.breach.title': '陷陣',
  'event.wei.nc.breach.body': '樂進要先登。他問你要不要一起，問得很平常，像在問要不要添飯。',
  'event.wei.nc.breach.opt.low': '在後面接應',
  'event.wei.nc.breach.opt.mid': '跟在他後面上',
  'event.wei.nc.breach.opt.high': '和他並排',

  'event.wei.nc.foresee.title': '料敵',
  'event.wei.nc.foresee.body': '郭嘉把三種可能寫在紙上，讓你去證實其中一種。',
  'event.wei.nc.foresee.opt.low': '查最容易查的那一種',
  'event.wei.nc.foresee.opt.mid': '三種都查一遍',
  'event.wei.nc.foresee.opt.high': '再加上他沒寫的第四種',

  'event.wei.nc.counsel.title': '獻計',
  'event.wei.nc.counsel.body': '賈詡把一件小事說成了大事。他說：「照著做，你會看見它變大。」',
  'event.wei.nc.counsel.opt.low': '照小事辦',
  'event.wei.nc.counsel.opt.mid': '照他說的辦',
  'event.wei.nc.counsel.opt.high': '照他說的辦，而且辦到底',

  'event.wei.nc.scout.title': '斥候',
  'event.wei.nc.scout.body': '程昱要一份實數。不是報上來的那種，是真的那種。',
  'event.wei.nc.scout.opt.low': '照現有的簿冊核一遍',
  'event.wei.nc.scout.opt.mid': '派人出去實地清點',
  'event.wei.nc.scout.opt.high': '自己走一趟，連隱戶都算進去',

  'event.wei.nc.recommend.title': '舉薦',
  'event.wei.nc.recommend.body': '荀彧要你替他寫一份薦書。他把人選給了你，理由沒給。',
  'event.wei.nc.recommend.opt.low': '照格式寫完',
  'event.wei.nc.recommend.opt.mid': '把這個人的事蹟查清楚再寫',
  'event.wei.nc.recommend.opt.high': '寫完之後，自己也去見那個人一面',

  'event.wei.nc.rank.title': '定品',
  'event.wei.nc.rank.body': '陳群要重定一批人的品第。他把名冊給你：「你先看，看完我們再談。」',
  'event.wei.nc.rank.opt.low': '照原品照抄',
  'event.wei.nc.rank.opt.mid': '逐個查過再定',
  'event.wei.nc.rank.opt.high': '把每個人的評語都當面問過本人',

  'event.wei.nc.select.title': '察舉',
  'event.wei.nc.select.body': '毛玠要辦一次察舉。他只有一個條件：「清的先，濁的後。」',
  'event.wei.nc.select.opt.low': '照舊例辦完',
  'event.wei.nc.select.opt.mid': '把該退的退掉',
  'event.wei.nc.select.opt.high': '連舉薦人的底一起查',
};
