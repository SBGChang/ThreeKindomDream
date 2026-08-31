// 十一件道具。名字、一句話定位，以及逐階解放的敘述。
//
// 【敘述照著資料寫】—— 每一行對應 content-source/core/items/index.ts
// 裡的一個 ItemTierDef，順序也一樣。
//
// 道具的文案要能讓玩家一眼讀出兩件事：
//   一 · 它改的是【規則】不是數值（沒有一件寫「智 +40」）
//   二 · 它的限制有多窄（限制越窄，效果越強）
export const itemTexts: Record<string, string> = {
  // ══ 廣域 · 不限對象 ══════════════════════════════
  'item.bamboo.name': '竹簡',
  'item.bamboo.desc': '抄了一半的舊書。看得懂的人不多，肯看的人更少。',
  'item.bamboo.tier.0': '智的基礎值 +2',
  'item.bamboo.tier.1': '智的成長量 +8%',
  'item.bamboo.tier.2': '文功結算 +5%',
  'item.bamboo.tier.3': '智的基礎值再 +3',
  'item.bamboo.tier.4': '智格的保底光階提高一檔',
  'item.bamboo.tier.5': '智的成長量再 +15%',

  'item.spear.name': '鐵槍',
  'item.spear.desc': '軍中最常見的一桿。用久了，手自己記得它的重量。',
  'item.spear.tier.0': '武的基礎值 +2',
  'item.spear.tier.1': '武的成長量 +8%',
  'item.spear.tier.2': '武功結算 +5%',
  'item.spear.tier.3': '武的基礎值再 +3',
  'item.spear.tier.4': '武格的保底光階提高一檔',
  'item.spear.tier.5': '武的成長量再 +15%',

  // ══ 分類限定 · 限某維或某類名士 ══════════════════
  'item.bow.name': '良弓',
  'item.bow.desc': '好弓要人配。它不會讓你更強，它會讓能用它的人站到你面前。',
  'item.bow.tier.0': '武系名士站武格的權重 10 → 13',
  'item.bow.tier.1': '武的成長量 +10%',
  'item.bow.tier.2': '武系名士的同框加成再 +10%',
  'item.bow.tier.3': '武的基礎值 +3',
  'item.bow.tier.4': '武格的升階機率 +10%',
  'item.bow.tier.5': '武系名士的好感成長 +25%',

  'item.seal.name': '印綬',
  'item.seal.desc': '一方銅印，一條絲帶。份量不在銅上。',
  'item.seal.tier.0': '文功獲取量 +8%',
  'item.seal.tier.1': '政的基礎值 +2',
  'item.seal.tier.2': '委託機率 +8%',
  'item.seal.tier.3': '文功獲取量再 +10%',
  'item.seal.tier.4': '政系名士站政格的權重 10 → 13',
  'item.seal.tier.5': '委託稀有度位移 +0.2 檔',

  'item.qinggang.name': '青釭劍',
  'item.qinggang.desc': '削鐵如泥。這種東西不會傳到你手上，除非有人在戰場上把它讓給你。',
  'item.qinggang.tier.0': '武的基礎值 +5',
  'item.qinggang.tier.1': '武系名士站武格的權重 10 → 16',
  'item.qinggang.tier.2': '武的成長量 +20%',
  'item.qinggang.tier.3': '武功獲取量 +15%',
  'item.qinggang.tier.4': '武格的保底光階提高一檔',
  'item.qinggang.tier.5': '武格【必定】觸發委託',

  // ══ 點名限定 · 只對指定的人生效 ══════════════════
  'item.mengde.name': '孟德新書',
  'item.mengde.desc': '他親手寫的兵法。陣中沒有他，這本書有一半是死的。',
  'item.mengde.tier.0': '曹操出現在統御格的權重 10 → 18',
  'item.mengde.tier.1': '統御的成長量 +15%',
  'item.mengde.tier.2': '曹操的同框加成再 +25%',
  'item.mengde.tier.3': '統御的基礎值 +4',
  'item.mengde.tier.4': '曹操的起始好感 +20',
  'item.mengde.tier.5': '委託稀有度位移 +0.6 檔',

  'item.halberd.name': '短戟',
  'item.halberd.desc': '他慣用的那一對。「賊來十步，乃呼我。」',
  'item.halberd.tier.0': '典韋出現在任何格的權重 10 → 16',
  'item.halberd.tier.1': '武的基礎值 +4',
  'item.halberd.tier.2': '典韋的同框加成再 +25%',
  'item.halberd.tier.3': '典韋的好感成長 +80%',
  'item.halberd.tier.4': '人物事件機率 +20%',
  'item.halberd.tier.5': '典韋所站的格【必定】觸發人物事件',

  'item.fengxiao.name': '奉孝遺書',
  'item.fengxiao.desc': '他死後才拆開的那一封。裡面寫的是還沒發生的事。',
  'item.fengxiao.tier.0': '郭嘉出現在智格的權重 10 → 18',
  'item.fengxiao.tier.1': '郭嘉的好感成長 +80%',
  'item.fengxiao.tier.2': '郭嘉的起始好感 +20',
  'item.fengxiao.tier.3': '人物事件機率 +25%',
  'item.fengxiao.tier.4': '郭嘉的同框加成再 +25%',
  'item.fengxiao.tier.5': '智格【必定】觸發人物事件',

  'item.wangzuo.name': '王佐印綬',
  'item.wangzuo.desc': '他從來沒有掛上去過。那個位子他讓給了別人。',
  'item.wangzuo.tier.0': '文功獲取量 +15%',
  'item.wangzuo.tier.1': '荀彧的起始好感 +20',
  'item.wangzuo.tier.2': '大檢定通過的獎勵 +20%',
  'item.wangzuo.tier.3': '荀彧的好感成長 +80%',
  'item.wangzuo.tier.4': '荀彧出現在任何格的權重 10 → 16',
  'item.wangzuo.tier.5': '委託稀有度位移 +0.5 檔',

  'item.xiaoyaojin.name': '逍遙津令',
  'item.xiaoyaojin.desc': '合肥那個木匣裡的一片木牘：「若孫權至者，張遼李典出戰。」',
  'item.xiaoyaojin.tier.0': '張遼出現在統御格的權重 10 → 18',
  'item.xiaoyaojin.tier.1': '張遼的好感成長 +80%',
  'item.xiaoyaojin.tier.2': '該格【只有一位】名士時，他的加成再 +20%',
  'item.xiaoyaojin.tier.3': '張遼的同框加成再 +25%',
  'item.xiaoyaojin.tier.4': '統御的成長量 +20%',
  'item.xiaoyaojin.tier.5': '該格只有一位名士時，加成再 +40%',

  'item.wuzi.name': '五子印',
  'item.wuzi.desc': '五個人的名字刻在同一方印上。你只湊到了三個。',
  'item.wuzi.tier.0': '張遼／于禁／樂進出現在任何格的權重 10 → 18',
  'item.wuzi.tier.1': '三人的好感成長 +60%',
  'item.wuzi.tier.2': '三人的同框加成再 +20%',
  'item.wuzi.tier.3': '武功獲取量 +20%',
  'item.wuzi.tier.4': '三人的起始好感 +30',
  'item.wuzi.tier.5': '三人任一所站的格，【必定】觸發委託',
};
