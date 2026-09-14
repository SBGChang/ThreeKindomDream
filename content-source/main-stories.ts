import type { StoryChapterDef, StoryNode, StoryRequirement } from '../src/contracts/core/story.js';
import { chapterId, traitId } from '../src/contracts/core/ids.js';
import { coreDef } from './core/pack-id.js';
import { weiDef } from './wei/pack-id.js';
import { storyWriter } from './story-authoring.js';

export const mainStoryTexts: Record<string, string> = {};
const w = storyWriter(mainStoryTexts);
w.text('story.ending.title', '這一夢，留下什麼');
w.text('story.ending.body', '有些人終於等到重逢，有些人看見了新的黎明。你完成的救援都會留下；此刻，選一段最想銘記的故事，為這一夢落款。');
w.text('story.ending.hint', '紀念這段已完成的改命；其他救援成果仍會保留。');
type Option = readonly [id: string, label: string, hint: string];
const responses: Readonly<Record<string, readonly [string, readonly string[]]>> = {
  'C0.A.shelter': ['你帶人拆開堵門的車架，阿禾守住出口。你朝倉裡喊：「先過人，再過糧！」百姓陸續脫困，追擊的隊伍稍稍慢了下來。', ['你']],
  'C0.A.secure': ['你先奪下外寨通道，再向倉中喊話：「路在我們手裡，誰也不必死守這道門。」潰兵放下兵器，軍需也保住了。', ['你']],
  'W1.A.vanguard': ['你領兵換下久戰的隊伍。曹操看見前線重新立起的旗：「好！先讓他們知道，有人肯來。」', ['曹操']],
  'W1.A.supply': ['你徵集車馬、重排運糧班次。荀彧在新路旁停下：「肯把路修好的人，比肯喊衝的人少。」', ['荀彧']],
  'W1.B.shelter': ['你把車陣轉向人群，將流民送至後營。曹操收下你呈報的人口冊，讓軍吏逐一安排住處。', []],
  'W1.B.handover': ['副將獨立掌管援糧令，依約送來最後一隊車馬。親兵不再件件事都等你的命令，你替他留好了回營的熱食。', []],
  'W2.A.granary': ['你把徵糧改成有定額的輪供，另留出來年的種糧。屯倉旁的新名簿，寫清了每一戶應交與應留的數目。', []],
  'W2.A.raid': ['夜襲小隊帶回轉運情報。你在軍圖上標出路線，敵方不得不分兵看守。', []],
  'W2.B.verify': ['你沿線驗明暗哨，將報信的人逐一帶回。曹操看完回報：「路驗明了，我與你去。」那張查過的路圖，成了這次突擊的依據。', ['曹操']],
  'W2.B.handover': ['你把分路接應講到每隊都能復述。當你的隊伍被阻在岔路，副將依約接上了另一段路。', []],
  'W3.A.relay': ['前鋒少領一批快馬，後路增設接應與病卒轉送。郭嘉看過新畫的驛站：「行，你替我把回程也算上。」', ['郭嘉']],
  'W3.A.pursuit': ['你集中輕騎，搶下前方關隘。正面追擊縮短了一段路，醫隊卻仍須跟著主力奔走。', []],
};
const node = (id: string, turn: number, title: string, body: string, speakers: readonly string[], options: readonly Option[]): StoryNode => ({
  id, turn, titleKey: w.text(`${id}.title`, title), bodyKey: w.text(`${id}.body`, body), beats: w.beats(id, body, speakers),
  responseTiming: turn === 6 ? 'chapterEnd' : 'immediate',
  options: options.map(([oid, label, hint]) => {
    const response = responses[`${id}.${oid}`];
    return {id: oid, labelKey: w.text(`${id}.${oid}.label`, label), consequenceKey: w.text(`${id}.${oid}.hint`, hint),
      ...(response ? {response:w.scene(`${id}.${oid}.response`,title,response[0],response[1])} : {})};
  }),
});
const choice = (node: string, option: string): StoryRequirement => ({kind: 'choice', node, option});
const rescue = [choice('W3.A', 'relay'), choice('W3.B', 'rest')];

export const commonStories: readonly StoryChapterDef[] = [coreDef('storyChapter', 'story:camp.yellowturban', {
  chapterId: chapterId('ch:camp.yellowturban'),
  opening: w.scene('C0.opening', '第一個要帶回來的人', '鼓聲裡，你發現自己的手正在發抖。旁邊的新兵阿禾把槍往你掌心一塞：「握住。等會兒誰先跑，誰請吃飯。」皇甫嵩巡營走過，停了一步：「怕很正常。別把身旁的人忘了。」', ['阿禾', '皇甫嵩']),
  nodes: [
    node('C0.A', 2, '倉門裡的人', '潰兵藏入糧倉，裡面還有避難百姓。車架堵住側門，外寨的追兵仍在靠近。阿禾握住槍，看向你：「先救人，還是先把外面的路拿下來？」', ['阿禾'], [
      ['shelter', '開側門接人', '拆開車架，阿禾守住出口；優先護送百姓。'],
      ['secure', '奪外寨斷援', '先控制通道，再令倉中潰兵交械，保全軍需。'],
    ]),
    node('C0.B', 6, '缺席的點名', '清點時，一隊運糧兵始終沒有應聲。你在名簿上留下一行空白。新伍長捧著令旗等你安排，遠處還有未熄的烽火。', [], [
      ['return', '親自循旗尋人', '親領接應隊；尋人的結果在戰後回收。'],
      ['handover', '教新伍長循號接應', '教他辨認旗號，由他分隊接回散兵；留下交接紀錄。'],
    ]),
  ], milestones: [],
  aftermaths: [
    {requirements: [choice('C0.B','return')], scene: w.scene('C0.after.return', '點名之後', '你循旗找到運糧隊，帶著落隊的人一同回營。阿禾掏出被壓扁的乾餅：「欠你的飯，先付一半。」皇甫嵩把你的名字補進功簿：「現在算是我帳下的人了。」袁紹的討董檄書隨軍令到來，各家使者在營外招募。你將選擇第一面真正跟隨的旗。', ['阿禾','皇甫嵩'], [{trait:traitId('trait:chenyi'),skill:null}])},
    {requirements: [], scene: w.scene('C0.after', '第一次接過令旗', '新伍長照著你教的旗號，分隊接回散兵。他把令旗交還時，手已不再發抖。皇甫嵩把你的名字補進功簿：「現在算是我帳下的人了。」袁紹的討董檄書隨軍令到來，各家使者在營外招募。你將選擇第一面真正跟隨的旗。', ['皇甫嵩'], [{trait:traitId('trait:chenyi'),skill:null}])},
  ], battleVariants: [{requirements: [], briefKeys: ['村外哨卡','運糧小道','柵門','黃巾前寨','被圍車隊','主營旗陣','張角夢影'].map((v,i)=>w.text(`C0.stage.${i}`,v))}],
})];

export const weiStories: readonly StoryChapterDef[] = [
  weiDef('storyChapter', 'story:wei.hulao', {
    chapterId: chapterId('ch:wei.hulao'),
    opening: w.scene('W1.opening','敢跟上那面旗嗎','諸侯帳中酒尚未冷，前線又抬回一面折旗。曹操把酒放下：「再議下去，洛陽就只剩灰了。」他望向你：「你帶幾個人，跟得上？」',['曹操','曹操']),
    nodes: [
      node('W1.A',2,'盟軍的空缺','前線急報與斷糧的木牘同時送到。曹操將兩份軍報推向你：「總得先有人動身。你要補哪一處？」',['曹操'],[['vanguard','補上前線','換下久戰的隊伍，穩住前線。'],['supply','修通接糧路','徵集車馬，重排運糧班次。']]),
      node('W1.B',6,'追兵與流民','追兵的塵頭逼近，流民與糧車擠在同一條路上。副將等著你的令旗，你必須先把戰後接應的安排交代清楚。',[],[['shelter','開道護送流民','將流民送至後營，留下護民紀錄。'],['handover','交副將守糧台','讓副將獨立掌管援糧令，留下交接紀錄。']]),
    ], milestones: [], aftermaths: [{requirements:[],scene:w.scene('W1.after','隨旗而行','洛陽火光照紅帳幕。曹操將各路回報壓在地圖下：「這一仗沒做完的，咱們往後自己做。」歸營的部曲重新點名，疲憊的人分到熱食。你把旗立在帳前，等候下一次出發。',['曹操'])}], battleVariants:[],
  }),
  weiDef('storyChapter','story:wei.guandu',{
    chapterId:chapterId('ch:wei.guandu'),
    opening:w.scene('W2.opening','把不可能拆成七步','迎奉天子、開墾屯田之後，北方的對峙一日比一日緊。如今，對岸營火鋪到天邊。郭嘉借你的手遮住半張地圖：「看全部，誰都怕。看這一處，就有辦法。」',['郭嘉']),
    nodes:[
      node('W2.A',2,'最後一批軍糧','最後一批軍糧將要入倉。有人催著再向百姓徵糧，有人帶回敵方轉運的消息。你望向地圖上僅剩的兩條路。',[],[['granary','軍民共保屯倉','改成定額輪供，留出種糧。'],['raid','切斷敵方轉運','組織夜襲小隊，先取轉運情報。']]),
      node('W2.B',6,'來投者的一封信','來投者把一封信放在案上，說出了敵方糧營的位置。曹操沒有立刻下令，先看向你：「這條路，怎麼走才穩？」',['曹操'],[['verify','親率精兵驗路','先驗明沿線暗哨，再交突擊方案。'],['handover','把破敵圖教給副將','讓每隊都能復述接應路線，留下交接紀錄。']]),
    ],milestones:[],aftermaths:[{requirements:[],scene:w.scene('W2.after','整張圖','北方營火一片片熄下。主攻與接應的部隊先後歸營，傷兵被送進暖帳。軍中先是寂靜，隨即歡聲奔湧。郭嘉把你的手從地圖上移開：「現在，可以看整張圖了。」',['郭嘉'])}],battleVariants:[],
  }),
  weiDef('storyChapter','story:wei.hebei',{
    chapterId:chapterId('ch:wei.hebei'),
    opening:w.scene('W3.opening','給勝利留一條回家的路','郭嘉一邊咳，一邊把北地小道畫得像酒館菜單。你按住他又要伸向酒壺的手。他笑：「怎麼，你也要管我？」',['郭嘉']),
    nodes:[
      node('W3.A',2,'前鋒催行','前鋒催著分派快馬，病卒卻還等在路邊。郭嘉伏在軍圖上畫出下一段山道，你看見他袖口下顫抖的手。',[],[['relay','建驛站、備醫隊','改命準備：快馬分給後路，建立病卒轉送與接應。'],['pursuit','集中輕騎奔襲','集中前鋒搶下關隘，郭嘉仍隨軍長征。']]),
      node('W3.B',6,'軍師不肯離營','郭嘉捲起軍圖準備出發，你攔在帳門前。他挑了挑眉：「前面還有一手，你想讓誰去下？」',['郭嘉'],[['rest','請郭嘉留後方統籌','需先建驛站與醫隊，並通過本章第 4 關，才能完成救援。'],['handover','讓副將接管前鋒','郭嘉仍隨主力；由副將獨立領兵，留下交接紀錄。']]),
    ],milestones:[{id:'wei.guojia-saved',minCleared:4,requirements:rescue,hintKey:w.text('W3.rescue.hint','先建驛站醫隊，再勸郭嘉留後方，通過第 4 關。'),scene:w.scene('W3.rescue','回程也算上了','山道的接應旗終於接通。醫隊將郭嘉送回後方，輪值的傳令兵接過軍圖。你收到報平安的木牘，才慢慢鬆開握旗的手。救援已經完成，後續收兵或敗退都不會抹去這份成果。')}],
    aftermaths:[{requirements:[{kind:'milestone',id:'wei.guojia-saved'}],scene:w.scene('W3.after.saved','這杯，算我服你','營帳傳來熟悉的咳聲。你掀簾，郭嘉把熱湯舉得像酒：「這杯，算我服你。」你接過另一碗熱湯。這一次，歸營的名簿上沒有少了他的名字。',['郭嘉'])},{requirements:[],scene:w.scene('W3.after','未喝完的酒','捷報之後，送來郭嘉病逝的消息。曹操將他未喝完的酒留在案邊。你把歸來的部曲重新點名，交出路簿。這場長征帶回了許多人，也留下了一個無法回答的名字。')}],battleVariants:[],
  }),
];
