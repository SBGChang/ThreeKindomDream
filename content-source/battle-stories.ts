import hulao from '../public/demo/hulao-story.json';
import type {BattleStory,StoryNode} from '../src/contracts/core/battle-story.js';
import type {StoryChapterDef} from '../src/contracts/core/story.js';

const itemNames:Record<string,string>={'方天化戟':'item:fangtian','赤兔馬':'item:chitu','青虹劍':'item:qinggang','倚天劍':'item:yitian'};
function tiger():BattleStory {
 const d=structuredClone(hulao) as BattleStory;d.id='battle:hulao';d.returnToBattle=true;
 d.requirements=[{kind:'roster',id:'notable:lvbu',present:false}];
 for(const n of Object.values(d.nodes))if(n.kind==='reward'){n.reward.items=n.reward.items.map(i=>itemNames[i]??i);n.reward.unlocks=n.reward.unlocks.map(()=> 'notable:lvbu');}
 return d;
}
export function encounter(id:string,wave:number,title:string,speaker:string,line:string,mode:'combat'|'debate'|'check',items:string[]=[],winText='你們將約定寫入軍簿，接應的旗幟重新升起。',intel?:string):BattleStory {
 const next={win:'success',lose:'failure',draw:'failure'};
 const enemyName=mode==='combat'?'追軍先鋒':speaker;
 const challenge:StoryNode=mode==='check'?{kind:'check',attr:'lead',tag:'escape',dc:65,seed:771,next}:mode==='combat'?{kind:'combat',title,mode:'player',ally:{actor:'player',health:1,modifiers:[]},enemy:{actor:'enemy',health:1,modifiers:[]},seed:771,aiSeed:97,aiWeights:{attack:4,defend:3,rest:2},opening:[{speaker:'你',text:'這一陣，我來接。'}],cues:[{id:'turn3',round:3,lines:[{speaker:enemyName,text:'你能接下這幾合，倒不是只憑一時血氣。'}]}],next}:{kind:'debate',title,ally:{int:50,pol:50,special:null,passives:[]},enemy:{int:72,pol:68,special:null,passives:[]},enemyName:speaker,seed:771,next};
 const terms=mode==='debate'&&(id==='battle:alliance'||title.includes('議降'));if(terms)challenge.next.win='terms';
 return {version:1,id,title,subtitle:'接戰後觸發；對話與對決暫停主戰場',entry:'opening',returnToBattle:true,...(intel?{intel}:{}),field:{troops:400,enemy:'enemy',wave},statCap:100,playerStats:{lead:50,war:50,int:50,pol:50},actors:{player:{name:'你',art:'lord',build:{lead:50,war:50,trait:'none'}},guide:{name:speaker,art:'npc_soldier',build:{lead:60,war:50,trait:'none'}},enemy:{name:enemyName,art:'npc_soldier',build:{lead:70,war:75,trait:'none'}}},nodes:{
  opening:{kind:'dialogue',lines:[{speaker,text:line}],next:'choose'},
  choose:{kind:'choice',prompt:'前軍等待你的決定。',options:[{id:'accept',label:mode==='combat'?'上前接戰':mode==='check'?'指揮救援':'據理交涉',detail:mode==='combat'?'親自單挑，勝負後回到本陣。':mode==='check'?'統御檢定；啟用赤兔馬可改善撤離接應。':'進入輪流接牌舌戰，結果決定這次交涉。',next:'challenge'},{id:'decline',label:'維持原定部署',detail:'繼續本關戰鬥，不領特殊挑戰獎勵。',next:'declined'}]},
  ...(terms?{terms:{kind:'check' as const,attr:'pol' as const,tag:id==='battle:alliance'?'alliance':'surrender',dc:65,seed:941,next:{win:'success',lose:'failure'}}}:{}),
  challenge,success:{kind:'dialogue',lines:[{speaker,text:winText}],next:'reward'},
  reward:{kind:'reward',reward:{id:id+'/prize',title:'戰場約定完成',items,allStats:0,gold:0,unlocks:[]},next:'end'},
  failure:{kind:'dialogue',lines:[{speaker:'你',text:'這次未能做成，先回本陣，不能再讓接應的人空等。'}],next:'end'},
  declined:{kind:'dialogue',lines:[{speaker:'你',text:'依原定部署行動，各隊相互照應。'}],next:'end'},
  end:{kind:'end',title:'回到本陣',text:'軍鼓再次響起，本關戰鬥繼續。'},
 }};
}
export function withBattleStories(d:StoryChapterDef):StoryChapterDef {
 const chapter=String(d.chapterId),events:BattleStory[]=[];
 if(chapter==='ch:wu.hulao')events.push(encounter('battle:sishui',3,'汜水關前','孫堅','華雄守住關口，糧車卻遲遲未到。你替前軍接住這一陣，我去找回糧隊。','combat',['item:spear'],'糧旗到了。這支鐵槍，交給肯替前軍守路的人。'));
 else if(chapter.endsWith('.hulao')){
  events.push(tiger());const ally=encounter('battle:hulao-ally',1,'聯軍同旗','呂布','這回我與你同陣。董卓的守將交給我，你照看兩翼。','combat',[],'聯軍已打開缺口，我們並肩破關。');
  ally.requirements=[{kind:'roster',id:'notable:lvbu',present:true}];ally.nodes.opening={kind:'dialogue',lines:[{speaker:'呂布',text:'上一場夢的邀戰，這一次換成並肩。守關的已不是我，我先去打開缺口。'}],next:'end'};events.push(ally);
 }else if(chapter==='ch:wei.guandu'){
  events.push(encounter('battle:wancheng',2,'宛城斷後','典韋','營門還守得住！你接住追將，我替傷兵開路。','combat',['item:halberd'],'接應到了！這對短戟，留給肯回頭的人。'));
  events.push(encounter('battle:guandu',5,'許攸問路','許攸','糧營在此。你若不信，便問清守衛輪替與沿途暗哨。','debate',['item:bamboo','item:mengde'],'你問到了要害。我將暗哨位置一併告訴你。'));
 }else if(chapter.endsWith('.changban'))events.push(encounter('battle:changban',3,'長坂回身','趙雲','渡口還有人沒到。你替我攔住追將，我再回去找一遍。','combat',['item:white-horse'],'最後一批百姓已登船。這枚護符，謝你替他們留下時間。'));
 else if(chapter.endsWith('.jingzhou'))events.push(encounter('battle:maicheng',5,'麥城接應','關羽','前面的路還走得通嗎？莫為我一人，折了整隊弟兄。','combat',[],'接應旗還在。若有來世，願能更早與你相識。'));
 else if(chapter==='ch:wu.jinghuai')events.push(encounter('battle:hefei',4,'合肥救陣','魏軍先鋒','江東前軍已退，誰來接我這一陣？','combat',['item:bow'],'追兵暫止，你的部隊趁隙撤回渡口。'));
 else if(chapter==='ch:wu.shiting')events.push(encounter('battle:survey',5,'航路勘察','船隊領航','遠海不能只憑膽量。先查清風向、淡水與回航的路。','debate',['item:sea-chart'],'這張海圖記著今日的航路，也記著該在哪裡回頭。','前方逆風且淡水不足；先停靠補給港，再決定遠航。'));
 else if(chapter==='ch:wu.succession')events.push(encounter('battle:hearing',5,'朝議護送','陸遜','不必替我爭一時意氣。請將完整奏疏送入朝堂，讓眾人有申辯的地方。','debate',[],'奏疏已當眾宣讀，朝臣不能再以一句傳言定罪。'));
 else if(specific[chapter]){const [title,speaker,line,win]=specific[chapter]!;events.push(encounter('battle:'+chapter,4,title,speaker,line,'debate',[],win));}
 else events.push(encounter('battle:'+chapter,4,'陣前相議','前軍使者','兩军相接，傷兵與糧隊仍在後面。這一刻，你打算如何回應？','debate',[],'我們先把撤路講清楚，再議誰先出陣。'));
 return {...d,fieldStories:events};
}

/** Chapter-specific exchanges stay inside the existing seven battle waves. */
const specific:Record<string,readonly [string,string,string,string]>={
 'ch:wei.hebei':['驛醫與北征','郭嘉','前線還能推進，我卻不能再用一個人的精神支撐所有軍報。醫隊、斥候與副將，你先讓誰接手？','驛站按時回報，副將接過軍圖。往後的每一步，不再只等我一人。'],
 'ch:wei.chibi':['火船之前','曹操','黃蓋的船來得太快。先說清楚解纜、截船與撤路，別讓一聲進軍把全軍困在火裡。','各船已收到分流旗號。軍議之外，能否守住江面仍要看本關戰果。'],
 'ch:wei.tongguan':['關中降使','關中使者','城中願交出兵械，但百姓怕你們入城後追究舊怨。這紙承諾，由誰來作保？','安民條款已公示，降兵與百姓分別列冊。'],
 'ch:wei.hanzhong':['山路議降','守軍使者','我們可以退讓糧道，但傷兵必須先走。你能保證前軍不趁亂追殺嗎？','雙方核對交接時刻，山路先留給傷兵。'],
 'ch:wei.dynasty':['新令公議','陳群','主帥能立一時的軍令，誰能約束下一任？把權責說給軍民聽，才算真正交接。','新令寫明覆核與申辯，軍民都能查閱。'],
 'ch:wei.gaoping':['宮門對質','禁軍校尉','我奉的是軍令，你持的是詔書。今日若人人只認自己的印，宮門永遠開不了。','兩份命令交由朝議覆核，禁軍先護送朝臣進宮。'],
 'ch:shu.xuzhou':['徐州安民','劉備','糧車已到，城門外還有流民。如何分糧、如何防亂，不能只靠一句仁義。','糧冊與護送人員一同公示，城外的人終於有路可走。'],
 'ch:shu.chibi':['江上立盟','魯肅','合兵抗曹不難，勝後如何守約才難。荊州、糧船與援路，今日都要說清。','兩軍互換使者，約定援路與交接。'],
 'ch:shu.yizhou':['落鳳坡前','龐統','山道太靜，前頭不像沒有伏兵。先把斥候回報與退路核實，再決定是否進軍。','斥候指出伏弩位置，前軍依旗號改道；能否接應到底，仍看第五關。'],
 'ch:shu.hanzhong':['定軍山軍議','法正','敵將盼我們急攻。你若能說清誘敵後的接應，我才敢讓前軍佯退。','接應時刻已核對，前軍依計換旗。'],
 'ch:shu.northern':['五丈原交令','諸葛亮','我知道你想讓我歇息。先證明軍報、糧運與前線，都有人能獨當一面。','各軍回報不再只送一張案前。軍師終於放下今晚的軍簿。'],
 'ch:wu.jiangdong':['峴山回旗','孫堅','山裡有伏兵，追進去的弟兄還沒回來。你說清楚接應路線，我帶人迎他們。','回旗與斥候相互確認，接應隊向山口展開。'],
 'ch:wu.hunt':['獵場急報','孫策','刺客未必只有眼前幾人。別只顧追敵，護送隊與醫者在哪裡？','護衛收緊陣形，醫者趕往接應點。能否護送出圍，還要守住下一關。'],
 'ch:wu.chibi':['苦肉與火船','黃蓋','皮肉傷我受得起，但船上的弟兄得有回來的路。你替我把撤船時刻說清楚。','火船與接應船分別受令，沒有人被當成必須犧牲的棋子。'],
 'ch:wu.yiling':['夷陵火候','陸遜','敵軍連營已久，火攻之外還要留出百姓的路。若只求焚盡，明日誰來守這片土地？','火攻區域與撤離通道分別標定，前軍開始轉移百姓。'],
};
