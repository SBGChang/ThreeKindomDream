import type { StoryChapterDef,StoryRequirement,StoryMilestone,StoryScene } from '../../src/contracts/core/story.js';
import { chapterId,skillId } from '../../src/contracts/core/ids.js';
import { asKey } from '../authoring.js';
import { storyWriter } from '../story-authoring.js';
import { wuDef } from './pack-id.js';
import { wuScript } from './script.js';
export const wuStoryTexts:Record<string,string>={};
const k=(id:string,body:string)=>{wuStoryTexts[id]=body;return asKey(id);};
const writer=storyWriter(wuStoryTexts),scene=(id:string,title:string,body:string):StoryScene=>writer.scene(id,title,body,[]);
export const choice=(node:string,option:string):StoryRequirement=>({kind:'choice',node,option});
export const milestone=(id:string):StoryRequirement=>({kind:'milestone',id});
const rescue=[choice('U2.A','scouts'),choice('U3.A','escort')];
const hearing=[choice('U7.A','charter'),choice('U7.B','handover'),choice('U8.A','hearing')];
const after=[
 '孫堅先令護送百姓出城，才接過捷報。黃蓋點齊歸隊的人，你把護送旗插在营門。',
 '孫策從馬上跳下，把你與周瑜一把攬住：「真讓我們過來了！」新城開始卸糧，江東有了新的起點。',
 '孫策傷重辭世。孫權接過印，手指還在發抖。你走到他身邊，把整齊的軍報一封封攤開。接應未能抵達的缺口，留在行旅手記裡。',
 '周瑜輕敲船沿：「最後一拍，到了。」火光漸遠，救援舟在夜色中逐一回來。你替最後一名傷兵披上乾衣。',
 '合肥受挫後，時間流轉至荊州戰事。荊州易手、關羽殞命的消息傳来，孫權沒有設盛宴：「贏來的地方，得守得住。」你走進重新開市的街道。',
 '昨日質疑陸遜的將領首先起身行禮。你送出止追令，漫山鼓聲依次停下，還活著的人終於能回家。',
 '陸遜請年輕副將宣讀捷報，兩代將領同席慶功。多年過去，朝議與接班的責任，也來到你們案前。',
 '朝局風波仍留遺憾。你把護送平安的人安頓下來，將未能及時呈上的文書留存。守住的成果與尚待改變的明天，都在你手裡。'
];
const hints:Record<string,string>={
 'U2.A.scouts':'建立情報網，才能在獵場提前找出伏擊。',
 'U3.A.escort':'已建情報網時，本章推進至第 5 關可接回孫策。',
 'U3.B.handover':'救援成功後，讓兄弟分工，留下雙璧同舟的未來。',
 'U7.A.charter':'建立可核對的呈議程序，為日後保護朝議做準備。',
 'U7.B.handover':'明定輔政與儲位，與議事程序共同支撐繼承安排。',
 'U8.A.hearing':'已完成兩項制度準備時，本章第 5 關可接通朝議。',
 'U8.B.handover':'接通朝議後，公開新令，才能讓改命的成果延續。'
};
export const wuStories:readonly StoryChapterDef[]=wuScript.map((r,i)=>{
 const prefix='story.wu.'+r.slug;
 const milestones:StoryMilestone[]=i===2?[{id:'wu.sunce-rescued',minCleared:5,requirements:rescue,scene:scene(prefix+'.rescue','人回來了','你架著孫策回營，孫權幾乎撞翻案桌。孫策還想逞強，被你和周瑜一起按回座位：「坐好。這次聽我們的。」'),hintKey:k(prefix+'.rescue.hint','渡江建情報網 → 獵場部署護衛 → 本章第 5 關。')}]:i===7?[{id:'wu.hearing-restored',minCleared:5,requirements:hearing,scene:scene(prefix+'.hearing','把話完整說完','證人、文書與外鎮回函送進朝堂。孫權讀完奏疏，走下座位，向陸遜與群臣承認處置失當。'),hintKey:k(prefix+'.hearing.hint','石亭完成呈議與輔政準備 → 依程序保護朝議 → 本章第 5 關。')}]:[];
 const variants:StoryChapterDef['aftermaths'][number][]=[];
 if(i===2)variants.push({requirements:[milestone('wu.sunce-rescued')],scene:scene(prefix+'.alive','江東的印','孫策平安歸來，孫權終於鬆開緊握的手。你把兩人的椅子並在一張地圖前。救回的人已在這裡，往後如何分工，仍由你們的承諾決定。')});
 if(i===7)variants.push({requirements:[milestone('wu.hearing-restored'),choice('U8.B','handover')],scene:scene(prefix+'.dawn','江東的明天','孫權公開繼承與輔政新令，撤回違反程序的處分。陸遜合上奏疏，与你一同看向亮起歸航燈的江面。')},{requirements:[milestone('wu.hearing-restored')],scene:scene(prefix+'.partial','話已送達','完整陳述終於送到孫權面前，牽連者得到喘息。你選擇外任江防，朝議接通的成果留下，長期安排仍待落實。')});
 variants.push({requirements:[],scene:{...scene(prefix+'.after',r.title,after[i]!),teachings:[{skill:skillId('skill:'+['tuzhen','guwu','jiezhi','huoji','shuiyan','xianzhen','zhirong','lianhuan'][i]),trait:null}]}});
 return wuDef('storyChapter','story:wu.'+r.slug,{chapterId:chapterId('ch:wu.'+r.slug),opening:scene(prefix+'.opening',r.title,r.opening),
 nodes:r.nodes.map(n=>({id:n.id,turn:n.turn,responseTiming:n.turn===6?'chapterEnd':'immediate',titleKey:k(n.id+'.title',n.title),bodyKey:k(n.id+'.body','軍議的聲音漸漸安靜。眾人看向你，等你定下這一步。'),beats:writer.beats(n.id,'你攤開軍報，與同行的人一同作出選擇。',[]),options:n.options.map(o=>({id:o.id,labelKey:k(n.id+'.'+o.id+'.label',o.label),consequenceKey:k(n.id+'.'+o.id+'.hint',hints[n.id+'.'+o.id]??(o.id==='handover'?'讓下一代接住這一章的責任。':o.id==='shelter'?'護送居民與傷兵，保留回家的路。':'留下本章的選擇，歸營後繼續完成承諾。'))}))})),
 milestones,aftermaths:variants,battleVariants:[...(i===2?[{requirements:rescue,briefKeys:r.stages.map((v,j)=>k(prefix+'.rescue.stage.'+j,v))}]:[]),{requirements:[],briefKeys:(i===2?['城外哨點','清剿小徑','林外敵伏','山澗','護眷道','糧倉','城門']:r.stages).map((v,j)=>k(prefix+'.stage.'+j,v))}]
 });
});
