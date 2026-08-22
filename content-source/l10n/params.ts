// 委託模板的參數池。池越大，同一模板重複出現時的辨識度越低（17 §2）。
const list = (prefix: string, items: readonly string[]): Record<string, string> =>
  Object.fromEntries(items.map((v, i) => [`${prefix}.${i}`, v]));

export const paramTexts: Record<string, string> = {
  ...list('param.place', [
    '白馬津', '延津', '南陽', '汝南', '陳留', '譙縣',
    '許昌', '濮陽', '定陶', '烏巢', '官渡', '黎陽',
  ]),
  ...list('param.patron', [
    '夏侯將軍', '曹氏族老', '許縣令', '陳留張氏', '汝南許氏',
    '屯田都尉', '軍中糧曹', '譙縣鄉紳', '南陽賈人', '潁川荀氏',
  ]),
  ...list('param.bandit', [
    '白波賊', '黑山餘黨', '汝南流寇', '黃巾殘部',
    '山越亡人', '烏桓遊騎', '劫道群盜', '嘯聚饑民',
  ]),
  ...list('param.goods', [
    '軍糧', '弓矢', '布帛', '鹽鐵',
    '戰馬', '藥材', '皮甲', '木材',
  ]),
  ...list('param.festival', [
    '社日祭', '上巳修禊', '中元醮會',
    '秋收賽神', '鄉飲酒禮', '臘日集市',
  ]),
};
