import type {StoryChapterDef,StoryRequirement,StoryNode} from '../src/contracts/core/story.js';
import type {ChapterDef,CampaignDef,EndingDef} from '../src/contracts/core/definitions.js';
import {chapterId,campaignId,endingId,factionId,traitId} from '../src/contracts/core/ids.js';
import {weiDef} from './wei/pack-id.js';
import {shuDef} from './shu/pack-id.js';
import {wuDef} from './wu/pack-id.js';
import {asKey} from './authoring.js';
import {storyWriter} from './story-authoring.js';
import {buildStages} from './core/campaigns/build.js';
import {encounter,withBattleStories} from './battle-stories.js';

export const expansionTexts:Record<string,string>={};
const w=storyWriter(expansionTexts);
const c=(node:string,option:string):StoryRequirement=>({kind:'choice',node,option});
const depth=(id:string,min=7):StoryRequirement=>({kind:'depth',chapter:'ch:'+id,min});
type Options=readonly [string,string,string,string];
const node=(id:string,turn:number,title:string,opts:Options,scope=id):StoryNode=>({id,turn,titleKey:w.text('exp.'+scope+'.'+id+'.title',title),bodyKey:w.text('exp.'+scope+'.'+id+'.body','軍議已定，請將接應與責任一併寫明。'),beats:w.beats('exp.'+scope+'.'+id+'.beats','軍議已定，請將接應與責任一併寫明。'),options:[0,2].map(i=>({id:opts[i]!,response:w.scene('exp.'+scope+'.'+id+'.'+opts[i]+'.response','軍議回應','你將「'+opts[i+1]+'」寫入軍令，副將逐一復述接應位置與交令時刻。'),labelKey:w.text('exp.'+scope+'.'+id+'.'+opts[i]+'.label',opts[i+1]!),consequenceKey:w.text('exp.'+scope+'.'+id+'.'+opts[i]+'.hint','本次安排影響後續劇情；不增加養成回合。')}))});
function script(base:StoryChapterDef,id:string,title:string,body:string,stages:string[],a:Options,b:Options):StoryChapterDef{
 const prefix=base.nodes[0]!.id.split('.')[0]!;
 return {...base,opening:w.scene(id+'.open',title,body),nodes:[node(prefix+'.A',2,title+' · 部署',a,id),node(prefix+'.B',6,title+' · 交令',b,id)],
  milestones:base.milestones,aftermaths:[{requirements:[],scene:w.scene(id+'.after',title+' · 收兵','這一章的戰果已記入軍簿。完成的接應與承諾不會因其後失利消失；未完成的目標，仍須由下一代接續。')}],battleVariants:[{requirements:[],briefKeys:stages.map((label,i)=>w.text(id+'.stage.'+i,label))}]};
}
const charter:Options=['charter','公開軍政章程','mobilize','集中軍事動員'];
const handover:Options=['handover','分工並交接指揮','retain','主帥統一掌令'];
const weiRows=[
 ['chibi','赤壁：把撤路留給所有人','火船正在逼近。曹操看著相連的戰船，請你決定如何保住軍隊與反攻的機會。',['病營安置','分舟警戒','火船截斷','江面反攻','烏林奪岸','聯軍退路','江防接管'],['boats','分舟防火、保留機動艦','assault','集中艦隊強攻'],['counterfire','化解火攻後反攻','evacuate','優先全軍撤離']],
 ['tongguan','潼關：西面的門','關中未定，西進便會腹背受敵。先讓軍隊與糧運都有能回來的路。',['關中前哨','西線糧道','渡口爭奪','潼關對陣','分軍接應','關內整備','西線交接'],charter,handover],
 ['hanzhong','漢中：山路與退路','山路狹長，前軍每向前一步，後方都要有人接住。',['山口斥候','棧道護運','山地前軍','守軍對陣','糧道輪替','撤路接應','山口收兵'],['register','公開安民與降附條款','siege','先封鎖軍事要道'],['divide','分別議降','press','合軍進攻']],
 ['dynasty','新朝：把承諾寫成誰都能看的字','權位開始交替。你將軍政承諾攤開，請眾人決定它能否約束下一位掌權者。',['郡縣名冊','屯田安置','護送章程','軍政對質','官署交接','地方輪調','公開新制'],charter,handover],
 ['gaoping','高平陵：輪到你攔住這場風暴','城門換了守軍，朝臣仍不知道誰能發令。你帶著上一章留下的名冊走向宮門。',['城外回報','護送朝臣','軍令核驗','要道對峙','朝議護持','禁軍交令','制度交接'],['audit','公示軍政名冊','conceal','秘密控制要道'],['handover','依法交接','centralize','集中權力']],
] as const;
export const extraWeiChapters:ChapterDef[]=weiRows.map((r,i)=>weiDef('chapter','ch:wei.'+r[0],{chapterId:chapterId('ch:wei.'+r[0]),factionId:factionId('faction:wei'),order:i+4,length:8,titleKey:w.text('chapter.wei.'+r[0]+'.title',r[1]),onPass:null}));
export const extraWeiCampaigns:CampaignDef[]=weiRows.map(r=>{
 r[3].forEach((label,i)=>w.text('campaign.wei.'+r[0]+'.stage.'+i,label));
 return weiDef('campaign','campaign:wei.'+r[0],{campaignId:campaignId('campaign:wei.'+r[0]),chapterId:chapterId('ch:wei.'+r[0]),enemyNotables:[],stages:buildStages({slug:'wei.'+r[0],bosses:[],deepUnlocks:[null,null,null,null,null,null,{kind:'unlock',trait:traitId('trait:chenyi'),skill:null}]})});
});
export const extraWeiStories:StoryChapterDef[]=weiRows.map((r,i)=>{
 const bare=weiDef('storyChapter','story:wei.'+r[0],{chapterId:chapterId('ch:wei.'+r[0]),opening:w.scene('new.W'+i,'軍議','眾將入帳。'),nodes:[node('W'+(i+4)+'.A',2,r[1],r[4]),node('W'+(i+4)+'.B',6,r[1],r[5])],milestones:[],aftermaths:[],battleVariants:[]});
 return script(bare,'base.W'+(i+4),r[1],r[2],[...r[3]],r[4],r[5]);
});
const redCliffs=[c('W4.A','boats'),c('W4.B','counterfire'),depth('wei.chibi')];
const chengdu=[...redCliffs,depth('wei.hanzhong')];
const northern=[...chengdu,depth('wei.dynasty')];
const alliance=[c('S4.A','pact'),c('S6.A','corridor'),depth('shu.hanzhong')];
const restoreHan=[...alliance,c('S7.B','pact'),depth('shu.jingzhou')];
const brothers:StoryRequirement[]=[{kind:'any',requirements:[[c('U2.A','scouts'),c('U3.A','escort'),depth('wu.hunt',5)],[{kind:'roster',id:'notable:sunce',present:true}]]},c('U3.B','handover')];
const hefei=[...brothers,c('U4.A','pact'),c('U4.B','handover'),depth('wu.chibi')];
const huaisi=[...hefei,depth('wu.jinghuai')];
const coast=[...huaisi,depth('wu.yiling')];
const voyage=[...coast,c('U7.A','charter'),c('U7.B','handover'),depth('wu.shiting')];

export function expandStory(input:StoryChapterDef):StoryChapterDef{
 let base=withBattleStories(input);const id=String(base.chapterId);let variants:NonNullable<StoryChapterDef['variants']>=[];
 const variant=(requirements:StoryRequirement[],key:string,title:string,body:string,stages:string[],a:Options=charter,b:Options=handover)=>{
  const branch={...script(base,key,title,body,stages,a,b),milestones:[]};variants=[...variants,{requirements,chapter:branch}];return branch;
 };
 if(id==='ch:wei.guandu')base=script(base,'wancheng-guandu','宛城至官渡：接回一人，守住一軍','典韋守在火起的營門。你先決定如何接應，再與曹操共赴官渡。',['取回武器','營門斷後','典韋接應','官渡屯糧','許攸驗路','烏巢奇襲','北軍接管'],['arms','替斷後者備武器與護衛','granary','優先守護糧倉'],['gate','留下營門接應隊','handover','副將領兵護主帥']);
 if(id==='ch:wei.hanzhong')variant(redCliffs,'chengdu','成都：劉璋的城，劉備的落腳處','赤壁已定，劉備率餘部依附劉璋。劉璋仍主成都，客軍協守，彼此既需援手又存疑心。',['劍門前哨','糧道護送','涪城外圍','客軍防線','成都北門','城內止亂','劉璋議降'],['register','公布降附與安民約','siege','封鎖軍事要道'],['divide','向劉璋與客軍分別議降','press','合軍攻城']);
 if(id==='ch:wei.dynasty')variant(chengdu,'north','北拒匈奴：把北疆交給能守住它的人','成都完成交接，北疆卻傳來警報。邊地軍民與互市使者都在等待保護，不能將所有部族視為敵人。',['邊烽接報','救援村落','護送使者','截斷侵掠','守土反擊','分區交防','邊境互市'],['charter','軍民共用邊防簿','raid','機動出擊優先'],handover);
 if(id==='ch:wei.gaoping'){
  const v=variant(northern,'govern','治世之能臣','曹操仍是漢相。他將地方簿冊交到你手裡：西域要開拓，百姓也必須有能安居的明天。',['糧道護運','屯田安置','地方止亂','議政護送','邊軍交接','河西通道','西域開拓'],charter,handover);
  Object.assign(v,{fieldStories:[encounter('battle:west',7,'西域開拓','西域使者','商路要互通，糧站與旅人的安全，也要共同承擔。','debate',['item:trade-pass'],'使團已安全抵達，通商文牒由雙方共同署名。')]});
 }
 if(id==='ch:shu.yizhou')base={...base,nodes:base.nodes.map(n=>n.id==='S5.A'?node('S5.A',n.turn,'落鳳坡前的勘路',['survey','實地勘路並設回報','arsenal','優先接管軍械']):n)};
 if(id==='ch:shu.hanzhong')for(const requirements of [[c('S5.A','survey'),c('S5.B','handover'),depth('shu.yizhou',5)],[{kind:'roster',id:'notable:pangtong',present:true} as StoryRequirement]])variant(requirements,'double-'+variants.length,'雙謀漢中：鳳雛不必缺席','龐統拆解前線部署，孔明安排糧運，法正核實情報。三張圖在同一張案上接成一條路。',['山口偵察','糧道接力','雙軍誘敵','定軍山外圍','山地合擊','援軍截斷','漢中接管'],['corridor','保留通往荊州的接援線','concentrate','全力投入漢中'],handover);
 if(id==='ch:shu.jingzhou'){
  const v=variant(alliance,'jing-alliance','荊襄會盟：讓兩面旗各守其約','援路仍通，荊州尚未失守。關羽與吳軍使者共同議定邊界，這一次不必敗走麥城。',['使節護送','邊界查驗','守軍交接','互援演練','荊州保全','共同止亂','續盟署約'],['rescue','優先接應邊軍','hold','鞏固後方據點'],['pact','履行互援盟約','revenge','優先自身戰果']);
  Object.assign(v,{fieldStories:[encounter('battle:alliance',5,'荊襄議約','吳軍使者','兩面的旗都要守約，誰也不能借救援之名奪城。','debate',['item:alliance'],'盟約寫明了邊界，也寫明了彼此有難時該走的路。')]});
 }
 if(id==='ch:shu.northern')variant(restoreHan,'han-restored','中興漢室：兩路同向中原','蜀道與荊襄同時出師。前線要奪回故都，後方要準備接管郡縣，讓漢室中興不只是一面城頭的旗。',['蜀道出師','荊襄策應','糧運會合','兩軍分掌','軍師輪休','宛洛決戰','中原安定'],['delegate','分工並讓軍師輪休','exhaust','集中主帥處置'],handover);
 if(id==='ch:wu.jiangdong')base=script(base,'wu-xianshan','峴山至江東：接回虎將，渡江立足','孫堅前軍追敵入山，斥候卻帶回伏兵的消息。渡江之前，先將自己的旗接回來。',['峴山追兵','回旗接應','渡口立足','沿岸糧道','江東據點','城外整軍','太史慈對陣'],['scouts','查追兵與沿岸情報','rush','追擊奪勢'],['handover','接應與渡江分工','solo','主帥集中指揮']);
 if(id==='ch:wu.jinghuai'){
  base=script(base,'wu-jinghuai','荊淮：江岸與病榻','周瑜久戰疲憊。軍令不能永遠壓在一人肩上，先讓醫舟和輪值部隊接到岸邊。',['醫舟護運','水軍交接','荊州使節','江岸守備','互援核驗','商道清理','荊淮交接'],['medical','設醫舟、輪值軍務','press','優先推進'],handover);
  variant(hefei,'wu-hefei','合肥：從守江到跨江','孫策主外，孫權理內。江上盟約使後方得以穩固，前军開始向合肥推進。',['醫舟護運','水軍交接','濡須渡口','江北補給','合肥外圍','城門合擊','淮南立足'],['medical','設醫舟、輪值軍務','press','優先推進'],handover);
 }
 if(id==='ch:wu.yiling'){
  variant(huaisi,'huaisi','淮泗：讓江北成為能留下的地方','合肥已下，留下的軍隊必須學會護住市集與村落。守土與安置將決定北進能走多遠。',['淮口護運','郡縣接管','流民安置','城外止亂','輪調交防','商路接通','淮泗安定']);
  variant(hefei,'river-reset','江防重整','北進受阻，軍隊撤回江岸。你們要接回前軍，重建渡口與糧運，而不是重演另一場夷陵之火。',['敗軍接回','渡口重整','糧船接力','敵襲阻截','傷兵安置','輪防整備','江岸固守']);
 }
 if(id==='ch:wu.yiling')variant([{kind:'roster',id:'notable:guanyu',present:true}],'river-peace','江岸止兵：故人共守一條江','關羽就在隊中，麥城之死不曾發生。你與蜀軍使節核驗邊界、遣返戰俘，阻止前線挑釁燒成夷陵的大火。',['使節護送','戰俘交還','邊界核驗','軍糧交接','流民回鄉','兩軍退界','江岸止兵']);
 if(id==='ch:wu.shiting'){
  variant(coast,'coast','兩岸立政','江北已安，江南也需要相同的章程。陸遜提出將軍政與港口分工，為遠航準備船隊與接班的人。',['兩岸護運','港口建設','郡縣議約','軍政分掌','航路勘察','船隊輪調','兩岸交防']);
  variant(hefei,'river-army','江防整軍','前軍回到江岸，接應隊重新列名。這一章要恢復軍政秩序，為下一次出航留下餘力。',['渡口修復','糧道護送','軍籍整頓','地方聽議','船隊勘路','輪值接力','江防交接']);
 }
 if(id==='ch:wu.succession'){
  const v=variant(voyage,'voyage','大航海：讓江海通向更遠的世界','兩岸秩序已定，孫權批准遠洋船隊啟航。你們面對的不只是敵軍，還有風暴、陌生港口與必須平等對待的新朋友。',['港口整備','海陸糧運','遠洋啟航','風暴救船','異域初交','平等通商','四海歸航'],['hearing','聽取領航與使節的意見','suppress','以軍令要求服從'],handover);
  Object.assign(v,{fieldStories:[encounter('battle:ocean-rescue',4,'風暴中的另一面旗','領航官','那艘陌生船正在失去桅杆。先救人，回港後再問來處。','check',[],'繩索已接上，兩船的人一同收緊了纜。','風向正在轉南，應先靠背風側接近遇險船。'),encounter('battle:trade',6,'平等通商','異域使者','謝你在風暴裡伸手。現在我們談談，如何讓兩邊的人都平安往來。','debate',['item:trade-pass'],'文牒不是臣服，而是兩座港口彼此守信的記錄。')]});
 }
 if(id==='ch:wu.succession')variant(hefei,'wu-council','江東議局：讓眾人的聲音留下來','北進留下的軍政名冊送入朝堂。遠航尚未成行，陸遜先與你守住官署申辯的權利，讓交接有法可循。',['地方回報','郡縣聽議','軍籍核驗','朝議護送','陸遜申辯','官署交接','江東新約'],['hearing','公開聽議','suppress','集中軍令'],handover);
 const people:Record<string,readonly [string,string]>={'ch:wei.hulao':['lvbu','呂布'],'ch:shu.hulao':['lvbu','呂布'],'ch:wu.hulao':['lvbu','呂布'],'ch:wei.guandu':['dianwei','典韋'],'ch:wei.hebei':['guojia','郭嘉'],'ch:shu.yizhou':['pangtong','龐統'],'ch:shu.jingzhou':['guanyu','關羽'],'ch:shu.northern':['zhugeliang','諸葛亮'],'ch:wu.jiangdong':['sunjian','孫堅'],'ch:wu.hunt':['sunce','孫策'],'ch:wu.jinghuai':['zhouyu','周瑜'],'ch:wu.succession':['luxun','陸遜']};
 if(id==='ch:shu.yizhou')base={...base,aftermaths:[{requirements:[c('S5.A','survey'),c('S5.B','handover'),depth('shu.yizhou',5)],scene:w.scene('pangtong.saved.after','落鳳坡外，鳳雛仍在','斥候先報伏弩，接應隊按令改道。龐統回到軍帳，在圖上抹掉那條險路：「下一次，咱們仍先看清再走。」')},...base.aftermaths]};
 const attach=(chapter:StoryChapterDef,index:number):StoryChapterDef=>{
  const person=people[id];if(!person||index>0)return chapter;const [slug,name]=person,key='companion.'+id+'.'+index;
  return {...chapter,companions:[{notableId:'notable:'+slug,nodes:chapter.nodes.map(n=>({...n,bodyKey:w.text(key+'.'+n.id+'.body',name+'在軍案旁等你確認部署。你們已經並肩，這次的任務是保住前軍、完成接應與交接。'),beats:w.beats(key+'.'+n.id+'.beats',name+'在軍案旁等你確認部署。你們已經並肩，這次的任務是保住前軍、完成接應與交接。'),options:n.options.map(o=>({...o,response:w.scene(key+'.'+n.id+'.'+o.id,'並肩受令',name+'與你各領一隊，依剛才的部署接應前軍。這一回，不必再為彼此留下遺言。')}))})),...(id.endsWith('.hulao')?{}:{fieldStories:[encounter('battle:companion:'+id,4,'故人並肩',name,'我們一起去核實前軍的接應。請把撤路、輪值與交令時刻說明白，不能因為彼此相識就少問一句。','debate',[],'部署已交到各隊，我們一同回到前線。')]}),opening:w.scene(key+'.open',expansionTexts[String(chapter.opening.titleKey)]??'與故人同行',name+'已在你的隊伍。這一次，你們共同核對接應與輪調；危機落在前軍與百姓身上，必須親自去完成部署。'),aftermath:w.scene(key+'.after','故人仍在',name+'與你一同回到本陣。今天完成多少接應，就記下多少成果；尚未完成的承諾，不能僅憑故交就算做到。')}]};
 };
 return {...attach(base,0),legacy:{nodes:input.nodes,scenes:[input.opening,...input.aftermaths.map(a=>a.scene),...input.milestones.map(m=>m.scene),...input.nodes.flatMap(n=>n.options.flatMap(o=>o.response?[o.response]:[]))]},...(variants.length?{variants:variants.map((v,i)=>({...v,chapter:attach(v.chapter,i+1)}))}:{})};
}
const finish=(country:'wei'|'shu'|'wu',slug:string,title:string,body:string,requirements:StoryRequirement[]):EndingDef=>{
 const build=country==='wei'?weiDef:country==='shu'?shuDef:wuDef;
 return build('ending','ending:'+country+'.'+slug,{ending:endingId('ending:'+country+'.'+slug),endingKind:'fullDream',factionId:factionId('faction:'+country),trigger:{kind:'sequenceCompleted'},priority:900,requirements:[],storyRequirements:requirements,titleKey:w.text('ending.'+country+'.'+slug+'.title',title),bodyKey:w.text('ending.'+country+'.'+slug+'.body',body),pointsMultiplier:1.8,collectible:true});
};
export const expansionEndings=[
 finish('wei','govern','治世之能臣','曹操以漢相之名交出軍政章程。西域使團帶回通商約定，河西補給與地方官署開始按共同的制度運轉。你留下的，不只是勝仗。',[...northern,depth('wei.gaoping'),c('W8.A','charter'),c('W8.B','handover'),{kind:'milestone',id:'field:battle:west'}]),
 finish('wei','charter','魏闕長明','朝議名冊公開，軍令完成交接。宮門重新開啟，這一次，承諾有了誰都能查閱的文字。',[c('W7.A','charter'),c('W7.B','handover'),c('W8.A','audit'),c('W8.B','handover'),depth('wei.gaoping')]),
 finish('shu','restoration','中興漢室','宛洛既定，故都重開。荊襄與蜀道兩軍完成郡縣接管，新軍與官署各有承接的人。漢旗之下，百姓終於能把明年也寫入打算。',[...restoreHan,depth('shu.northern'),c('S8.B','handover')]),
 finish('wu','ocean','大航海','風暴裡救起的朋友在港口迎接歸帆。海圖不再只畫軍隊能抵達的地方，也畫出商船、使節與故事往返的航路。江東的目光，從此越過海平線。',[...voyage,depth('wu.succession'),c('U8.A','hearing'),c('U8.B','handover'),{kind:'milestone',id:'field:battle:ocean-rescue'},{kind:'milestone',id:'field:battle:trade'}]),
];

