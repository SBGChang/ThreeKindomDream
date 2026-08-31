// 四維 × 兩階段的換皮（GDD §5.1）。
//   camp     皇甫嵩帳下的新兵：操練與雜務
//   faction  諸侯幕下的仕途：治軍與治民
export const phaseTexts: Record<string, string> = {
  'phase.camp': '皇甫嵩帳下',
  'phase.faction': '幕下',
};

export const attrTexts: Record<string, string> = {
  'attr.war.camp.label': '演武',
  'attr.war.camp.sub.0': '習劍',
  'attr.war.camp.sub.1': '騎射',
  'attr.war.camp.sub.2': '角力',
  'attr.int.camp.label': '讀書',
  'attr.int.camp.sub.0': '誦經',
  'attr.int.camp.sub.1': '推演',
  'attr.int.camp.sub.2': '觀星',
  'attr.pol.camp.label': '治事',
  'attr.pol.camp.sub.0': '記帳',
  'attr.pol.camp.sub.1': '斷案',
  'attr.pol.camp.sub.2': '耕作',
  'attr.lead.camp.label': '領眾',
  'attr.lead.camp.sub.0': '聚眾',
  'attr.lead.camp.sub.1': '列陣',
  'attr.lead.camp.sub.2': '巡守',

  'attr.war.faction.label': '練兵',
  'attr.war.faction.sub.0': '操演',
  'attr.war.faction.sub.1': '校閱',
  'attr.war.faction.sub.2': '演武',
  'attr.int.faction.label': '經商',
  'attr.int.faction.sub.0': '通商',
  'attr.int.faction.sub.1': '市易',
  'attr.int.faction.sub.2': '鹽鐵',
  'attr.pol.faction.label': '開墾',
  'attr.pol.faction.sub.0': '屯田',
  'attr.pol.faction.sub.1': '修渠',
  'attr.pol.faction.sub.2': '度田',
  'attr.lead.faction.label': '治軍',
  'attr.lead.faction.sub.0': '點閱',
  'attr.lead.faction.sub.1': '整編',
  'attr.lead.faction.sub.2': '督糧',

  'attr.lead.short': '統',
  'attr.war.short': '武',
  'attr.int.short': '智',
  'attr.pol.short': '政',
  'glow.none': '無光',
  'glow.silver': '銀光',
  'glow.gold': '金光',
  'glow.red': '紅光',
  // 大檢定的路線標籤。與官階的文武雙軌同一個軸 —— 走武路憑的就是武功那條官階。
  'careerLine.civil': '文',
  'careerLine.martial': '武',

  // 委託選項的三檔。UI 直接把「高條件高報酬」說出來（17 §5）。
  'optionTier.low': '低',
  'optionTier.mid': '中',
  'optionTier.high': '高',

  'difficulty.safe': '穩',
  'difficulty.normal': '進',
  'difficulty.hard': '險',
  'stage.stranger': '陌生',
  'stage.acquainted': '相識',
  'stage.friendly': '友好',
  'stage.close': '知交',
  'stage.sworn': '莫逆',
  // 名聲與善惡名都已刪除（GDD §7 改版）。只剩功績。
  'merit.civil': '文功',
  'merit.martial': '武功',
};
