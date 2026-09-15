import type { StoryChapterDef, StoryRequirement, StoryScene, StoryTeaching } from '../../src/contracts/core/story.js';
import { chapterId, skillId, traitId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { shuDef } from './pack-id.js';
import { shuScript } from './script.js';
import { storyWriter } from '../story-authoring.js';
import { shuSpeakers } from './speakers.js';

export const shuStoryTexts: Record<string, string> = {};
const text = (key: string, body: string) => { shuStoryTexts[key] = body; return asKey(key); };
const writer = storyWriter(shuStoryTexts);
/** Lessons are awarded by completed story scenes, never by merely sharing an action slot. */
const chapterLessons: Readonly<Record<string, StoryTeaching>> = {
  S1: { skill: skillId('skill:tuzhen'), trait: null },
  S2: { skill: null, trait: traitId('trait:liande') },
  S3: { skill: skillId('skill:huoji'), trait: null },
  S4: { skill: null, trait: traitId('trait:liaodi') },
  S5: { skill: skillId('skill:tuntian'), trait: null },
  S6: { skill: skillId('skill:xianzhen'), trait: null },
};
const scene = (id: string, title: string, body: string): StoryScene => writer.scene(id, title, body, shuSpeakers[id]);
export const choice = (node: string, option: string): StoryRequirement => ({ kind: 'choice', node, option });
export const milestone = (id: string): StoryRequirement => ({ kind: 'milestone', id });
export const rescuePrep = [choice('S4.A', 'pact'), choice('S6.A', 'corridor')];
export const rescueActive = [...rescuePrep, choice('S7.A', 'rescue')];
export const dawnPrep = [choice('S5.B', 'handover'), choice('S6.B', 'handover')];
export const dawnActive = [...dawnPrep, choice('S8.A', 'delegate')];

const aftermath = [
  '夜裡，你們圍著小小的火。劉備問你願不願同行，張飛搶著說：「飯都吃了，還問！」關羽替你把鬆掉的槍纓重新繫好。你終於有了一面願意跟隨的旗。',
  '徐州的城門漸漸消失在身後。劉備望著離去的人潮，你將名簿交給他：「地方還能再找，這些人，我們帶出來了。」趙雲領著失散的隊伍從另一條路追了上來。',
  '趙雲自煙塵中奔回，看見你留的旗，勒馬笑了一下：「就知道你在。」船隊在下游重新集合，你們一個個點起歸來的名字。',
  '江上的火終於熄了。你與江東兵將同一條船推上岸，誰也沒先問旗號。兩家的傷兵同坐一灶。魯肅將航路圖交給你：「這條路，往後也留著。」',
  '成都終於開門。劉備邀你在府衙吃飯，卻仍習慣把餅分開。空下的席位留給未能走到這裡的龐統；眾人舉杯後，把他未完的地圖攤開。',
  '黃忠的箭旗在山頂展開。你與劉備並肩望向北方，後方的接應隊陸續抵達。黃忠笑著向你招手：「這座山拿下了，後面的路，也一起走！」',
  '關羽未能從荊州歸來。其後數年，劉備東征，夷陵受挫；你將歸來的部曲重新編整，把傷兵送回家。失去的人不能忘，活著的人還需要你。未接通援路的缺口，已留在行旅手記。',
  '五丈原的軍帳漸漸安靜。孔明未能親眼看見那張地圖走到最後，你與下一代將領把它繼續攤平。天色將亮，新的接應隊仍會依約出發。',
];

const optionHints: Readonly<Record<string, string>> = {
  'S4.A.pact': '預備改命：訂下互援與通航，為日後荊州接應留下通道。',
  'S6.A.corridor': '預備改命：接通援路。與赤壁盟約一同完成，才能在荊州救回關羽。',
  'S7.A.rescue': '若已備盟約與援路：第 5 關可接回關羽。若準備不足，本次只能救援散兵。',
  'S7.B.pact': '戰後承諾：若接回關羽，重立盟約，讓兄弟重聚的未來延續。',
  'S5.B.handover': '預備改命：培養官署接班人，替孔明接住軍政重擔。',
  'S6.B.handover': '預備改命：建立可輪替的糧運班底，與入蜀交接共同支撐北伐。',
  'S8.A.delegate': '若已備兩次交接：本章第 5 關可穩住補給，讓孔明真正休養。',
  'S8.B.handover': '戰後承諾：公開交接、執行輪休，讓續燈的成果持續。',
};

const nodeBodies: Readonly<Record<string, string>> = {
  'S1.A': '傳令兵從盟軍大帳出來，連你們的名字都沒念。張飛氣得一拍桌，關羽卻看向遠處斷掉的旗：「等他們分軍功，那邊的人就回不來了。」你攤開殘缺的軍圖，決定先做一件誰也攔不住的事。',
  'S1.B': '幾名傷兵扶著彼此走到營前，原來的隊伍已經散了。有人小聲問：「這裡……還收人嗎？」劉備把位置讓出來。大戰將至，你要先安排他們的去處，或教會新隊長接防。',
  'S2.A': '府衙的鑰匙交到手裡，桌上立刻堆滿求援的木牘。倉頂漏雨、城門缺守，哪一件都不能等。趙雲已備好馬：「你先辦哪件，我就跟你去哪裡。」',
  'S2.B': '城上的號角急促起來，最壞的消息終於送到。張飛提矛要去城門，卻被你攔住：「你守住後面，我把人帶出去。」撤退將至，你在名簿上圈出第一批應受護送的人。',
  'S3.A': '斷軸的車橫在道中央，身後的塵頭越來越近。趙雲翻身上馬，問你：「後面還有人，接不接？」你望向兩側山坡；回頭接人與搶先護住側翼，都得有人立即動身。',
  'S3.B': '渡口的船一艘艘離岸，遠處還有旗影在奔跑。船夫催你上船，你卻把纜繩又握緊了一分。此刻得先定好接應：留下最後一艘舟，或讓新隊長接手混亂的渡序。',
  'S4.A': '兩家的旗第一次插在同一張地圖旁。有人只談分守哪段江岸，魯肅卻問：「若有一日是你們受困，我們從哪裡來？」你提起筆，這紙約定可以只管眼前，也可以替將來留一條路。',
  'S4.B': '火船還沒離岸，江風已把軍旗吹得獵獵作響。周瑜說，進攻的人都有了，還差接人的船。你將燈掛上船頭：「火一起，總得有人往回走。」船隊由你親領，還是先教兩軍副將共同調度？',
  'S5.A': '山口後是等待春耕的田，軍報旁卻壓著武庫的清單。劉備看了許久：「得有地方站穩，也得讓人願意讓我們站在這裡。」你準備先去修復糧籍與水利，或安定山口和軍械。',
  'S5.B': '孔明案上的燈比別處都晚熄。你抱來新一疊文書，他揉了揉眉心，仍伸手要接。你把木牘按住：「丞相，這些事不能永遠只有您會。」是安排新舊官吏交接，還是先由你巡迴承擔？',
  'S6.A': '黃忠指著山頂的敵旗，笑說自己還能先登。你卻發現，漢中到荊州的報信仍會斷在兩處山道。眼前要奪山，遠處也有人等著援手；這一回，你想先把哪條路打開？',
  'S6.B': '糧隊的老隊長連走三夜，靠著糧車就睡著了。孔明要叫醒他問路，你拿起木牌：「路不能只記在一個人腦裡。」你可以建立輪替班底，也可以親自守住這段最吃緊的倉道。',
  'S7.A': '急報濕透了半張紙，剩下的字仍看得清：關將軍受困。你展開赤壁的約章與漢中的路簿；能不能把它們接成一條援路，就看這些年留了什麼。出發之前，先定今晚的目標。',
  'S7.B': '救援隊正在點燈，劉備站在江邊，沒有催你。他只問：「若接得回來，往後還讓兄弟走到這一步嗎？」人尚未歸來，你先把戰後的承諾說清：重修盟約，或交託下一代整軍。',
  'S8.A': '軍帳裡的燈又亮了一夜。孔明伸手去拿下一封軍報，你先接住了它：「我們跟著您走了這麼遠，不是只學會等您的命令。」你要啟用早先培養的輪值班底，還是將力量壓向前線？',
  'S8.B': '黎明前，孔明把軍令推到你面前：「這一仗之後，你想怎麼走？」你知道接住一夜還不夠，還要有人接得住明天。是正式交接軍政、落實輪休，還是親領先鋒決戰？',
};

export const shuStories: readonly StoryChapterDef[] = shuScript.map((raw, index) => {
  const prefix = `story.shu.${raw.slug}`;
  const milestones: StoryChapterDef['milestones'] = raw.code === 'S7' ? [{
    id: 'shu.guanyu-rescued', minCleared: 5, requirements: rescueActive,
    hintKey: text(`${prefix}.hint`, '麥城回馬｜赤壁訂盟約、漢中備援路，本章選救援並通過第 5 關。'),
    scene: scene(`${prefix}.rescue`, '二哥，援軍到了！', '河道旁的旗號終於亮起。你把槍杆探向岸邊：「二哥！別看後面，看這裡！」關羽躍上船，你們並肩擋開追兵。\n\n關羽已救出。繼續挑戰或收兵，都不會失去這份成果。'),
  }] : raw.code === 'S8' ? [{
    id: 'shu.kongming-rested', minCleared: 5, requirements: dawnActive,
    hintKey: text(`${prefix}.hint`, '五丈原續燈｜入蜀與漢中皆選交接，本章啟用輪值並通過第 5 關。'),
    scene: scene(`${prefix}.dawn`, '丞相，這次換我們撐住', '接應隊依約越過渭水，前後軍完成輪換。你把批示簿按下：「您教我們這麼久，也該讓我們真的會一回。」孔明看著營外的旗，終於把筆交到你手上。\n\n指揮接力已穩住。這份成果不會因後續敗退被抹去。'),
  }] : [];
  const variants: StoryChapterDef['aftermaths'][number][] = [];
  if (raw.code === 'S7') {
    variants.push({ requirements: [milestone('shu.guanyu-rescued'), choice('S7.B', 'pact')],
      scene: scene(`${prefix}.reunion`, '這一次，我們一起回去', '關羽朝你深深一揖，隨後與你一同重訂盟約。劉備親自出營迎接，張飛的笑聲遠遠傳來。這條夢中的道路不再走向夷陵復仇，你們要帶著活著的人繼續向前。') });
    variants.push({ requirements: [milestone('shu.guanyu-rescued')],
      scene: scene(`${prefix}.alive`, '人回來了，約還未定', '關羽平安歸營，兄弟先聚在一桌。荊州的爭端尚未化解，這一輪你沒有完成重修盟約的承諾。救回他的成果保留；後續仍須整軍與協商。') });
  }
  if (raw.code === 'S8') {
    variants.push({ requirements: [milestone('shu.kongming-rested'), choice('S8.B', 'handover'), milestone('shu.guanyu-rescued')],
      scene: scene(`${prefix}.both`, '晨光裡的兩面旗', '清晨，你在營外找到孔明，他正笑著將風箏線交給孩子。關羽在不遠處等下一次軍議，看見你便抬手相招。這一次，你們都能等到明天。') });
    variants.push({ requirements: [milestone('shu.kongming-rested'), choice('S8.B', 'handover')],
      scene: scene(`${prefix}.rest`, '天亮了，丞相', '清晨，孔明第一次沒有獨坐案前。軍署與糧隊依新令輪值，年輕將領來向你回報。他站在帳外，看著晨光說：「看來，真的可以交給你們了。」') });
    variants.push({ requirements: [milestone('shu.kongming-rested')],
      scene: scene(`${prefix}.partial`, '接住這一夜', '你穩住本次補給，孔明得以暫歇。長期輪值尚未正式交接，他仍須回到軍案前。這一夜的接力會留下紀錄，但尚未完成續燈的全部承諾。') });
    variants.push({ requirements: [milestone('shu.guanyu-rescued')],
      scene: scene(`${prefix}.carry`, '替故人把路走完', '孔明未能走過這一夜。關羽與你並肩站在軍帳外，接過他未完成的圖：「前頭的路，咱們一起走。」你保住的重聚並未失去，而新的承諾仍在。') });
  }
  variants.push({ requirements: [], scene: { ...scene(`${prefix}.after`, raw.title, aftermath[index]!),
    ...(chapterLessons[raw.code] ? { teachings: [chapterLessons[raw.code]!] } : {}),
  } });
  const normalStages = raw.code === 'S7'
    ? ['漢水哨線', '斷信驛', '江陵外道', '夜渡口', '散兵接應', '西岸撤離', '退軍接應'] : [...raw.stages];
  return shuDef('storyChapter', `story:shu.${raw.slug}`, {
    chapterId: chapterId(`ch:shu.${raw.slug}`),
    opening: scene(`${prefix}.opening`, raw.title, raw.opening),
    nodes: raw.nodes.map(n => ({ id: n.id, turn: n.turn,
      responseTiming: n.turn === 6 ? 'chapterEnd' : 'immediate',
      titleKey: text(`${prefix}.${n.id}.title`, n.title),
      bodyKey: text(`${prefix}.${n.id}.body`, nodeBodies[n.id]!),
      beats: writer.beats(`${prefix}.${n.id}`, nodeBodies[n.id]!, shuSpeakers[n.id]),
      options: (n.id.endsWith('.B') ? [...n.options].reverse() : n.options).map(o => ({ id: o.id,
        ...(n.turn === 2 && !['S7','S8'].includes(raw.code) || n.turn === 6 && !['S7','S8'].includes(raw.code) ? {
          response: writer.scene(`${prefix}.${n.id}.${o.id}.response`, n.title, o.consequence.split(/結果：|；|記護民|記交接/)[0]!.trim(),
            n.id === 'S1.A' ? [o.id === 'rescue' ? '關羽' : '張飛'] : n.id === 'S1.B' && o.id === 'shelter' ? ['劉備'] : n.id === 'S3.B' && o.id === 'shelter' ? ['你'] : []),
        } : {}),
        labelKey: text(`${prefix}.${n.id}.${o.id}.label`, o.label),
        consequenceKey: text(`${prefix}.${n.id}.${o.id}.hint`, optionHints[`${n.id}.${o.id}`]
          ?? (o.id === 'handover' ? '把責任交給下一代，留下本章的交接紀錄。' : '留下這一章的選擇，讓歸營後的承諾有跡可循。')),
      })),
    })), milestones, aftermaths: variants,
    battleVariants: [
      ...(raw.code === 'S7' ? [{ requirements: rescueActive, briefKeys: [
        '漢水哨線', '斷信驛', '江陵外道', '夜渡口', '接回關羽', '麥城外圍・同袍接應', '與關羽並肩斷後',
      ].map((label, i) => text(`${prefix}.rescue.stage.${i}`, label)) }] : []),
      { requirements: [], briefKeys: normalStages.map((label, i) => text(`${prefix}.stage.${i}`, label)) },
    ],
  });
});
