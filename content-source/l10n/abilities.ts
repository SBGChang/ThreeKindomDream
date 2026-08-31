// 特質、技能、敵將、戰役關卡的文案。
//
// 技能的描述要寫得出【它在戰役裡做什麼】—— 玩家不操作，
// 所以配置畫面上的這一行是他唯一的判斷依據（33 §7）。
export const abilityTexts: Record<string, string> = {
  // ── 特質（常駐被動）────────────────────────────────
  'trait.danshi.name': '膽識',
  'trait.danshi.desc': '陣前不退。物理傷害 +8%',
  'trait.chenyi.name': '沉毅',
  'trait.chenyi.desc': '軍心不亂。兵量上限 +8%',
  'trait.liande.name': '練達',
  'trait.liande.desc': '案牘老手。恢復效率 +12%',
  'trait.jimin.name': '機敏',
  'trait.jimin.desc': '見隙即動。法術傷害 +8%',

  'trait.linzhen.name': '臨陣不亂',
  'trait.linzhen.desc': '兵量上限 +12%，物理傷害 +6%',
  'trait.zhechong.name': '折衝樽俎',
  'trait.zhechong.desc': '未戰而糧先足。糧量上限 +20%',
  'trait.liaodi.name': '料敵',
  'trait.liaodi.desc': '先知其形。法術傷害 +18%',

  'trait.wanrendi.name': '萬人之敵',
  'trait.wanrendi.desc': '一人可當一軍。物理傷害 +30%',
  'trait.jingwei.name': '經緯之才',
  'trait.jingwei.desc': '法術傷害 +25%，恢復效率 +20%',

  'trait.gangbi.name': '剛愎',
  'trait.gangbi.desc': '聽不進勸。物理傷害 +15%，恢復效率 −20%',

  // ── 技能（戰役中的行動）────────────────────────────
  'skill.tuzhen.name': '突陣',
  'skill.tuzhen.desc': '物理 · 依武力。以兵量的 30% 撞開對面的陣線。',
  'skill.xianzhen.name': '陷陣',
  'skill.xianzhen.desc': '物理 · 依武力。以兵量的 50% 鑿穿。',
  'skill.wanrenzhi.name': '萬人敵',
  'skill.wanrenzhi.desc': '物理 · 依武力。以兵量的 85% 一擊決之。',

  'skill.huoji.name': '火計',
  'skill.huoji.desc': '法術 · 依智力。以兵量的 32% 縱火焚之。',
  'skill.shuiyan.name': '水淹',
  'skill.shuiyan.desc': '法術 · 依智力。以兵量的 52% 決堤灌之。',
  'skill.lianhuan.name': '連環計',
  'skill.lianhuan.desc': '法術 · 依智力。以兵量的 88% 環環相扣。',

  'skill.fumin.name': '撫民',
  'skill.fumin.desc': '恢復 · 依政治。耗糧回復兵量的 28%。',
  'skill.tuntian.name': '屯田',
  'skill.tuntian.desc': '恢復 · 依政治。耗糧回復兵量的 46%。',
  'skill.wangzuo.name': '王佐',
  'skill.wangzuo.desc': '恢復 · 依政治。耗糧回復兵量的 75%。',

  'skill.guwu.name': '鼓舞',
  'skill.guwu.desc': '增益 · 依統御。三回合內我方傷害提升。',
  'skill.jiezhi.name': '節制',
  'skill.jiezhi.desc': '削弱 · 依統御。三回合內敵方輸出下降。',
  'skill.zhirong.name': '治戎',
  'skill.zhirong.desc': '增益 · 依統御。四回合內我方傷害大幅提升。',

  // ── 敵將 ──────────────────────────────────────────
  'enemy.bocai.name': '波才',
  'enemy.zhangliang.name': '張梁',
  'enemy.zhangjiao.name': '張角',
  'enemy.huaxiong.name': '華雄',
  'enemy.lijue.name': '李傕',
  'enemy.lvbu.name': '呂布',
  'enemy.yanliang.name': '顏良',
  'enemy.guotu.name': '郭圖',
  'enemy.yuanshao.name': '袁紹',
  'enemy.yuantan.name': '袁譚',
  'enemy.shenpei.name': '審配',
  'enemy.tadun.name': '蹋頓',

  // ── 戰役關卡 ──────────────────────────────────────
  //
  // 七關要讀得出【越走越深】。前三關是碾過去的，後面才是拚的 ——
  // 文案的節奏要跟數值的節奏一致，否則玩家會在錯的地方緊張。
  'campaign.yellowturban.stage.0': '村口的黃巾散卒。人多，但不成陣。',
  'campaign.yellowturban.stage.1': '劫糧的一隊。追上去就能奪回。',
  'campaign.yellowturban.stage.2': '波才親領的前軍。旗號整齊了起來。',
  'campaign.yellowturban.stage.3': '賊寨外圍的鹿角與壕溝。要硬鑿。',
  'campaign.yellowturban.stage.4': '張梁的本部。這一仗開始有人不回來了。',
  'campaign.yellowturban.stage.5': '中軍大帳前的最後一道柵。',
  'campaign.yellowturban.stage.6': '張角在帳中。走到這裡的人，天下都會知道名字。',

  'campaign.wei.hulao.stage.0': '關前的斥候小隊。',
  'campaign.wei.hulao.stage.1': '諸侯聯軍的側翼缺口。補上去。',
  'campaign.wei.hulao.stage.2': '李傕領兵下關。第一次真的交鋒。',
  'campaign.wei.hulao.stage.3': '關下亂軍。誰都在搶功，誰都不肯先上。',
  'campaign.wei.hulao.stage.4': '華雄挑戰。諸侯無人敢應。',
  'campaign.wei.hulao.stage.5': '關門洞開，塵頭起於西北。',
  'campaign.wei.hulao.stage.6': '那人在馬上。天下皆知此關前無人可擋。',

  'campaign.wei.guandu.stage.0': '白馬津外的哨壘。',
  'campaign.wei.guandu.stage.1': '郭圖獻計，河北軍分兵而來。',
  'campaign.wei.guandu.stage.2': '渡口爭奪。誰先站穩誰佔便宜。',
  'campaign.wei.guandu.stage.3': '顏良列陣於前。他從沒輸過。',
  'campaign.wei.guandu.stage.4': '兩軍相持。糧道開始吃緊。',
  'campaign.wei.guandu.stage.5': '審配守烏巢。火要放在他睡著的時候。',
  'campaign.wei.guandu.stage.6': '袁紹的中軍。這一戰之後，河北就是空的。',

  'campaign.wei.hebei.stage.0': '黎陽外的殘部。',
  'campaign.wei.hebei.stage.1': '鄴城四門，逐一清點。',
  'campaign.wei.hebei.stage.2': '袁譚反覆。這次不能再留他。',
  'campaign.wei.hebei.stage.3': '并州群盜。地形比人難纏。',
  'campaign.wei.hebei.stage.4': '審配死守鄴城。他不會降。',
  'campaign.wei.hebei.stage.5': '白狼山。烏桓的騎兵從山脊壓下來。',
  'campaign.wei.hebei.stage.6': '蹋頓親至。過了這一關，北方再無人可與你為敵。',

  // ── UI 用的列舉字串 ────────────────────────────────
  'abilityTier.common': '常',
  'abilityTier.fine': '良',
  'abilityTier.peerless': '絕',

  'learnState.learnable': '可學',
  'learnState.unaffordable': '經驗不足',
  'learnState.learned': '已學',
  'learnState.locked': '未解鎖',

  'affinity.stranger': '陌路',
  'affinity.acquainted': '相識',
  'affinity.friendly': '友好',
  'affinity.close': '知交',
  'affinity.sworn': '莫逆',

  'skillKind.physical': '物理',
  'skillKind.magic': '法術',
  'skillKind.heal': '恢復',
  'skillKind.buff': '增益',
  'skillKind.debuff': '削弱',
};
