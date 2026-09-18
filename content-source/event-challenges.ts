import type {EventDef} from '../src/contracts/core/definitions.js';
import type {EventChallengeDef} from '../src/contracts/core/event-challenge.js';
import {asKey} from './authoring.js';

export const challengeTexts:Record<string,string>={};
type Entry={event:string;option:number;label:string;challenge:EventChallengeDef};
const outcomes=(win:string,lose:string)=>({win,lose,draw:'雙方收手，這次未分高下。你記住交鋒中的破綻，回去再做準備。',retreat:'你決定先退一步。這件事未能辦妥，仍可從經驗中學習。'});
const entries:Entry[]=[
 {event:'event:wei.guojia-wager',option:1,label:'與郭嘉辯明敵軍動向',challenge:{mode:'debate',opponent:'guojia',opponentName:'郭嘉',ability:58,opening:'郭嘉：我押他三日內必走。你若不信，不妨說說你的推斷。\n你：那就從他軍中的糧草說起。',outcomes:outcomes('郭嘉放下酒盞，笑著點頭：「你抓到了我沒有細想的地方。這回算你有理。」','郭嘉逐一拆開你的推斷：「只看營火可不夠。再想想，他最怕失去的是什麼？」')}},
 {event:'event:lead.2.escort',option:1,label:'親自率隊突圍，打通糧道',challenge:{mode:'battle',opponent:'npc_soldier',opponentName:'攔路賊兵',ability:30,enemySquads:3,enemyTroops:180,opening:'探子：前方幾股賊兵已經合圍！\n你：糧車不能困在這裡。留下車隊，我親自帶一隊人打通道路。號角響前，務必擊退全部賊兵！',outcomes:outcomes('你率隊衝開包圍，護著糧車穿過隘口。押運的差事辦成了。','賊兵逼住隘口，你只能退回車隊，另尋安全的道路。押運未能如期完成。')}},
 {event:'event:war.3.duel',option:1,label:'出陣應之，與敵將一決高下',challenge:{mode:'duel',opponent:'npc_soldier',opponentName:'叫陣敵將',ability:48,opening:'敵將：可有人敢出陣與我一戰？\n你：只管放馬過來！',outcomes:outcomes('敵將敗退，你收槍回陣。軍中響起喝采，這場叫陣已被你壓下。','你招架不住，只得勒馬退回。敵將仍在陣前叫罵，這口氣只能暫且記下。')}},
 {event:'event:war.3.duel',option:2,label:'賭上一戰，敗者退兵三十里',challenge:{mode:'duel',opponent:'npc_soldier',opponentName:'叫陣敵將',ability:62,opening:'敵將：既要賭，就以三十里為約！\n你：兩軍作證。接招！',outcomes:outcomes('敵將收起兵刃，依約退兵。你替同袍贏下了整備的時間。','你敗下陣來，只得履約後撤。這次失利，也讓你看清逞強的代價。')}},
 {event:'event:int.3.counsel',option:2,label:'當眾辯明利害，另立一策',challenge:{mode:'debate',opponent:'npc_soldier',opponentName:'帳中議事官',ability:50,opening:'議事官：你說此策不妥，可有確實的依據？\n你：請容我從糧道與敵情說起。',outcomes:outcomes('帳中的質疑漸息。議事官重新攤開地圖，請你將替代方案說完。','你的論據未能服眾。議事官仍採原案，你把沒有答清的問題記下。')}},
 {event:'event:shu.machao.companionship',option:1,label:'請馬超以切磋指點槍法',challenge:{mode:'duel',opponent:'machao',opponentName:'馬超',ability:55,opening:'馬超：既要請教，就讓我看看你的槍。點到即止，不必逞強。\n你：請將軍指教！',outcomes:outcomes('馬超收槍一笑：「這一招接得好。衝得進去，也要記得回來。」','馬超及時收住槍鋒：「步子別急，先站穩。我們下次再試。」')}},
 {event:'event:wu.zhangzhao.companionship',option:1,label:'向張昭辯明新辦法的利弊',challenge:{mode:'debate',opponent:'zhangzhao',opponentName:'張昭',ability:55,opening:'張昭：辦法可以新，百姓卻禁不起反覆折騰。你如何保證可行？\n你：請先聽我把施行的次序說完。',outcomes:outcomes('張昭將文書重新攤平：「你想過百姓如何承受。這份辦法，值得再議。」','張昭指出幾處疏漏，將文書推還給你：「先補齊，再來談。」')}}
];
/** Only explicitly authored options become playable challenges; other choices keep their original resolution. */
export function withEventChallenge(d:EventDef):EventDef {
 const rows=entries.filter(e=>e.event===String(d.eventDefId));if(!rows.length)return d;
 return {...d,options:d.options.map((o,i)=>{const e=rows.find(e=>e.option===i);if(!e)return o;const key=`challenge.${e.event}.${i}.label`;challengeTexts[key]=e.label;return {...o,labelKey:asKey(key),challenge:e.challenge};})};
}



