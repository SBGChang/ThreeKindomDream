import type { EventDef } from '../src/contracts/core/definitions.js';
import type {
  DialogueBeat,
  DialogueMove,
  EventDialogueDef,
} from '../src/contracts/core/dialogue.js';
import { asKey } from './authoring.js';

export const dialogueTexts: Record<string, string> = {
  'dialogue.commission.ask': '情況就是如此。這件事，就請你拿個主意吧。',
  'dialogue.notable.ask': '若換作是你，又會怎麼做？',
  'dialogue.term.report': '軍報',
  'dialogue.term.messenger': '信使',
  'dialogue.term.east': '東',
  'dialogue.term.west': '西',
};
const beat = (
  key: string,
  speaker: number | null,
  text: string,
  moves?: readonly DialogueMove[],
): DialogueBeat => {
  dialogueTexts['dialogue.' + key] = text;
  return {
    speaker,
    textKey: asKey('dialogue.' + key),
    ...(moves ? { moves } : {}),
  };
};
const move = (
  actor: number,
  duration: number,
  xs: readonly number[],
  fall = false,
): DialogueMove => ({
  actor,
  duration,
  path: xs.map((x, i) => ({
    x,
    ...(fall ? { y: i ? 440 : 0, rotate: i ? 65 : 0, opacity: i ? 0 : 1 } : {}),
  })),
});
const scripts: Record<string, EventDialogueDef> = {
  'event:work.12': {
    keywords: ['report', 'messenger', 'east', 'west'].map((key) =>
      asKey('dialogue.term.' + key),
    ),
    intro: [
      beat('report.arrive', 1, '這封軍報……究竟寫的是東，還是西？', [
        move(1, 900, [77, 66]),
      ]),
      beat(
        'report.inspect',
        null,
        '軍吏將塗成一團的軍報遞過來。送信的人已經走遠，再晚就追不上了。',
      ),
      beat('report.hero', 0, '先別急。讓我看看，還有什麼能核實的線索。'),
    ],
    outcomes: [
      {
        option: 2,
        beats: [
          beat(
            'report.chase',
            null,
            '你與軍吏追出營門，沿著左右彎折的小路追趕信使。',
            [
              move(0, 2400, [28, 63, 24, 70, 33]),
              move(1, 2400, [66, 91, 49, 97, 72]),
            ],
          ),
          beat('report.return', 1, '總算趕上了！這回一定問個明白。'),
        ],
      },
    ],
  },
  'event:wei.lejin-meeting': {
    intro: [
      beat(
        'ladder.arrive',
        null,
        '樂進試著架穩一把短梯。他剛踩上第一級，梯腳卻忽然一滑。',
      ),
      beat('ladder.fall', 1, '哎——！', [move(1, 850, [77, 111], true)]),
      beat('ladder.return', 1, '人沒事。看來第一步，還得再穩一穩。', [
        move(1, 900, [117, 74]),
      ]),
      beat('ladder.help', 0, '我來搭把手。'),
    ],
  },
  'event:wei.caocao-summon': {
    intro: [
      beat('summon.night', null, '夜深，曹操屏退左右，示意你留步。'),
      beat('summon.approach', 1, '再近些。這件事，我想聽你親口說。', [
        move(1, 2200, [77, 62, 49]),
      ]),
      beat('summon.answer', 0, '請說，我聽著。'),
    ],
  },
};
// Unique voices for the first meetings; the original narration is kept before each line.
const firstMeetings: Record<string, string> = {
  caocao: '先替自己煮粥，還是先替巡夜的人燒水？',
  zhangliao: '這張圖缺了一角。你看，哪裡最容易走散？',
  yujin: '尺在這裡。你來量，我在旁邊看著。',
  xiahoudun: '傷兵還等著喝水。這桶水，咱們得想辦法送到。',
  dianwei: '你還沒領飯吧？這塊留給你。',
  guojia: '半盤棋還沒下完。你願意坐下，陪我走幾步嗎？',
  jiaxu: '先別忙著下定論。你看見的，可是全部？',
  chengyu: '事情得有人辦。你若有法子，就說來聽聽。',
  xunyu: '不急，先把眼前這一步想清楚。',
  chenqun: '規矩寫在紙上，辦事卻在人。你會如何處理？',
  maojie: '東西不多，更要分得妥當。你有什麼主意？',
};
export function withDialogue(def: EventDef): EventDef {
  const authored = scripts[String(def.eventDefId)];
  if (authored) return { ...def, dialogue: authored };
  const first = Object.entries(firstMeetings).find(
    ([name]) => String(def.eventDefId) === 'event:wei.' + name + '-meeting',
  );
  return {
    ...def,
    dialogue: {
      intro: [
        { speaker: null, textKey: def.bodyKey },
        first
          ? beat('meeting.' + first[0], 1, first[1])
          : {
              speaker: 1,
              textKey: asKey(
                def.trigger.kind === 'notable'
                  ? 'dialogue.notable.ask'
                  : 'dialogue.commission.ask',
              ),
            },
      ],
    },
  };
}
