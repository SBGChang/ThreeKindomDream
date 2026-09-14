import { describe, it, eq, near, ok, throws } from '../lib/tinytest.js';
import { newSession, defs, wiring } from './harness.js';
import { Session } from '../../src/app/session.js';
import { eventRewardLines } from '../../src/ui/event-receipt.js';
import { optionStates } from '../../src/modules/commission.js';
import {
  createCtx,
  type ValidationError,
} from '../../src/data-runtime/validate/types.js';
import { validateDialogue } from '../../src/data-runtime/validate/dialogue.js';

function offered(value: number, rngSeed = 77) {
  const initial = newSession(rngSeed);
  initial.selectSlot(0);
  const state = initial.current,
    def = defs.reader('event').get('event:work.12');
  const s = Session.restore(wiring, {
    ...state,
    attributes: { values: { lead: value, war: value, int: value, pol: value } },
    economy: {
      ...state.economy,
      money: 500,
      earned: 500 + state.economy.spent,
    },
    turn: {
      ...state.turn,
      resolved: [],
      pending: [],
      encounterCandidates: [],
      slots: state.turn.slots.map((slot) => ({
        ...slot,
        hasEncounter: false,
        hasCommission: false,
      })),
    },
  });
  const offer = {
    eventDefId: def.eventDefId,
    rarity: 1 as const,
    params: {},
    optionStates: optionStates(def, 1, s.ctx, wiring.fx),
  };
  return Session.restore(wiring, {
    ...s.current,
    turn: { ...s.current.turn, pending: [offer] },
  });
}
export function run() {
  describe('對話演出與實得收穫', () => {
    it('所有現有事件都有對話入口，逼近、追逐、跌出演出都接入內容', () => {
      const events = defs.reader('event').all();
      ok(
        events.every((e) => (e.dialogue?.intro.length ?? 0) > 0),
        '不可漏掉事件',
      );
      ok(
        events.some((e) =>
          e.dialogue?.intro.some((b) =>
            b.moves?.some((m) => m.duration >= 2000),
          ),
        ),
        '缺少逼近',
      );
      ok(
        events.some((e) =>
          e.dialogue?.intro.some((b) =>
            b.moves?.some((m) => m.path.some((p) => p.opacity === 0)),
          ),
        ),
        '缺少跌出',
      );
      ok(
        events.some((e) =>
          e.dialogue?.outcomes?.some((o) =>
            o.beats.some((b) => b.moves?.some((m) => m.path.length > 2)),
          ),
        ),
        '缺少追逐',
      );
    });
    it('付費選項分列花費與薪水，封頂能力不顯示虛增', () => {
      const s = offered(75),
        before = s.current;
      s.resolveEvent(2);
      const result = s.current.turn.resolved.at(-1)!,
        rows = eventRewardLines(before, s.current, result, defs);
      eq(rows.find((r) => r.label === '委託投入')?.amount, -50);
      eq(rows.find((r) => r.label === '薪水')?.amount, 71);
      eq(rows.filter((r) => r.note === '能力').length, 0);
      near(
        rows
          .filter((r) => r.note === '金錢')
          .reduce((n, r) => n + (r.amount ?? 0), 0),
        s.money - before.economy.money,
        0.001,
      );
    });
    it('失敗只顯示已發薪資與實際磨練，收穫資料不改動狀態', () => {
      let checked = false;
      for (let n = 1; n <= 30; n++) {
        const s = offered(1, n),
          before = s.current,
          failure = s.pendingEvent!.optionStates[1]!.failureSalary;
        s.resolveEvent(1);
        const result = s.current.turn.resolved.at(-1)!;
        if (result.passed) continue;
        const snapshot = JSON.stringify(s.current),
          rows = eventRewardLines(before, s.current, result, defs);
        eq(rows.find((r) => r.label === '薪水')?.amount, failure);
        eq(eventRewardLines(before, s.current, result, defs), rows);
        eq(JSON.stringify(s.current), snapshot);
        checked = true;
        break;
      }
      ok(checked, '沒有驗到失敗分支');
    });
    it('讀取已結算存檔不會重複發獎，回合仍可正常推進', () => {
      const s = offered(50);
      s.resolveEvent(2);
      const restored = Session.restore(
          wiring,
          JSON.parse(JSON.stringify(s.current)),
        ),
        money = restored.money,
        turn = restored.current.progress.turn;
      throws(() => restored.resolveEvent(2), '空佇列不可再次領獎');
      ok(restored.canAdvance(), '已結算回合應可恢復');
      restored.advance();
      eq(restored.current.progress.turn, turn + 1);
      eq(restored.money, money);
    });
    it('負好感与重複道具碎片使用實際差額', () => {
      const s = offered(50),
        before = s.current;
      s.resolveEvent(0);
      const member = before.roster.members[0]!,
        item = defs.reader('item').all()[0]!;
      const after = {
        ...s.current,
        roster: {
          members: s.current.roster.members.map((m) =>
            m.notableId === member.notableId
              ? { ...m, affinity: member.affinity - 3 }
              : m,
          ),
        },
        items: { ...s.current.items, fragments: { [String(item.itemId)]: 4 } },
      };
      const rows = eventRewardLines(
        before,
        after,
        s.current.turn.resolved.at(-1)!,
        defs,
      );
      eq(
        rows.find(
          (r) =>
            r.note === '好感' &&
            r.label ===
              defs.text(
                String(
                  defs.reader('notable').get(String(member.notableId)).nameKey,
                ),
              ),
        )?.amount,
        -3,
      );
      eq(rows.find((r) => r.note === '碎片')?.amount, 4);
    });
    it('對話內容驗證拒絕不存在的角色與不合法位移', () => {
      const errors: ValidationError[] = [],
        c = createCtx(
          {
            byKind: new Map(),
            effects: new Map(),
            textKeys: new Set(['line']),
            bodies: new Map(),
          },
          errors,
        );
      validateDialogue(
        c,
        {
          trigger: { kind: 'commission' },
          options: [{}],
          dialogue: {
            intro: [
              {
                speaker: 9,
                textKey: 'line',
                moves: [{ actor: 7, duration: -1, path: [{ x: NaN }] }],
              },
            ],
          },
        },
        'bad',
      );
      ok(errors.length >= 4, '錯誤位移必須在載入時拒絕');
    });
  });
}
