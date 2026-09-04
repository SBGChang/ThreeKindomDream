const CIVIL = ['白身', '書佐', '令史', '主簿', '功曹', '治中從事',
  '別駕從事', '從事中郎', '軍謀祭酒', '長史', '軍師中郎將', '軍師將軍'];
const MARTIAL = ['白身', '什長', '屯長', '軍侯', '軍司馬', '都尉',
  '校尉', '中郎將', '偏將軍', '雜號將軍', '四征將軍', '四方將軍'];

const ranks = (line: string, names: readonly string[]): Record<string, string> =>
  Object.fromEntries(names.map((v, i) => [`career.${line}.${i + 1}`, v]));

export const careerTalentTexts: Record<string, string> = {
  ...ranks('civil', CIVIL),
  ...ranks('martial', MARTIAL),

  'talent.photographic.name': '過目不忘',
  'talent.photographic.desc': '智系行動收益 +20%',
  'talent.brawn.name': '天生神力',
  'talent.brawn.desc': '武力的保底光階提升一檔',
  'talent.diligence.name': '勤能補拙',
  'talent.diligence.desc': '無光行動額外獲得 30% 收益',
  'talent.sudden-fame.name': '一鳴驚人',
  'talent.sudden-fame.desc': '全行動升階機率 +10%',
  'talent.precocious.name': '少年老成',
  'talent.precocious.desc': '名聲獲得量 +30%',
  'talent.wide-circle.name': '廣結善緣',
  'talent.wide-circle.desc': '開局全體常駐名士初始好感 +10，好感成長 +15%',
  'talent.usurper.name': '梟雄之姿',
  'talent.usurper.desc': '功績獲得量 +20%（與〈忠義之心〉互斥）',
  'talent.destined.name': '天命所歸',
  'talent.destined.desc': '每輪一次，戰役中軍勢歸零時原地再起',
  'talent.keen-eye.name': '慧眼識人',
  'talent.keen-eye.desc': '戰報顯示每一條加成的來源與數值',

  'talent.noble-house.name': '世家門閥',
  'talent.noble-house.desc': '入伍時可自行指定一位同伴，其餘由皇甫嵩指派',
  'talent.great-clan.name': '累世公卿',
  'talent.great-clan.desc': '三位同伴全由你自己指定',

  'shop.career.name': '官途',
  'shop.career.desc': '解放本輪官階能爬到的最高階（第一輪到都尉／功曹為止）',

  'shop.aptCap.war.name': '武的資質上限',
  'shop.aptCap.war.desc': '解放武資質可分配到的最高階',
  'shop.aptCap.int.name': '智的資質上限',
  'shop.aptCap.int.desc': '解放智資質可分配到的最高階',
  'shop.aptCap.pol.name': '政的資質上限',
  'shop.aptCap.pol.desc': '解放政資質可分配到的最高階',
  'shop.aptCap.lead.name': '統的資質上限',
  'shop.aptCap.lead.desc': '解放統資質可分配到的最高階',
  'shop.aptPoints.name': '資質配點',
  'shop.aptPoints.desc': '入夢前可分配的資質點總量',
  'shop.talentPoints.name': '天賦配帶點數',
  'shop.talentPoints.desc': '入夢前可配帶的天賦點數上限',
  'shop.talents.name': '天賦解放',
  'shop.talents.desc': '逐一解放天賦，使其進入可選池',
  'shop.glowUpgrade.name': '升階機率',
  'shop.glowUpgrade.desc': '提高鍛鍊的升階判定機率',
  'shop.bond.wei.name': '魏 · 勢力緣分',
  'shop.bond.wei.desc': '入朝時可自行指定的上司名額',
};
