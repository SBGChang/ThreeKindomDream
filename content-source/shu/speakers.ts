/** Speaker of each quoted passage, in script order. Null retains system narration. */
export const shuSpeakers: Readonly<Record<string, readonly (string | null)[]>> = {
  'S1.A': ['關羽'], 'S1.B': ['傷兵'], 'S2.A': ['趙雲'], 'S2.B': ['你'],
  'S3.A': ['趙雲'], 'S4.A': ['魯肅'], 'S4.B': ['你'], 'S5.A': ['劉備'],
  'S5.B': ['你'], 'S6.B': ['你'], 'S7.B': ['劉備'], 'S8.A': ['你'], 'S8.B': ['諸葛亮'],
  'story.shu.hulao.opening': ['劉備'], 'story.shu.xuzhou.opening': [null, '趙雲'],
  'story.shu.changban.opening': ['趙雲'], 'story.shu.chibi.opening': ['魯肅'],
  'story.shu.yizhou.opening': ['龐統', '劉備'], 'story.shu.hanzhong.opening': ['黃忠'],
  'story.shu.northern.opening': ['你'],
  'story.shu.hulao.after': ['張飛'], 'story.shu.xuzhou.after': ['你'],
  'story.shu.changban.after': ['趙雲'], 'story.shu.chibi.after': ['魯肅'],
  'story.shu.hanzhong.after': ['黃忠'], 'story.shu.jingzhou.rescue': ['你'],
  'story.shu.northern.dawn': ['你'], 'story.shu.northern.rest': ['諸葛亮'],
  'story.shu.northern.carry': ['關羽'],
};
