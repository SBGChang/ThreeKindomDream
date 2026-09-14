import { statQuery } from '../../src/modules/stats.js';
import { describe, it, eq, near, ok, throws } from '../lib/tinytest.js';
import { newSession, defs, wiring, META } from './harness.js';
import { Session } from '../../src/app/session.js';
import { transact, economyRule } from '../../src/modules/economy.js';
import * as market from '../../src/modules/market.js';
import * as stories from '../../src/modules/stories.js';
import * as roster from '../../src/modules/roster.js';
import * as item from '../../src/modules/item.js';
import { awardNotableFragments } from '../../src/modules/notable-codex.js';
import { grantUnlock, grantGrowth, previewGrowth } from '../../src/modules/growth.js';
import { createRng } from '../../src/kernel/rng.js';
import { emptyDraft } from '../../src/modules/dream-entry.js';
import { seed, turnIndex, chapterIndex } from '../../src/contracts/core/ids.js';
import {
  optionStates,
  resolveHead,
  encounterPool,
  drawCommission,
} from '../../src/modules/commission.js';
import { restoreRun, saveRun } from '../../src/app/save.js';
import { preview as previewTraining } from '../../src/modules/training.js';
import { projectGrowth } from '../../src/ui/growth-preview.js';
import { successRate, rollTotal } from '../../src/modules/check.js';
export function run() {
  describe('RFC-02 · 經濟、事件與章末休整', () => {
    it('基礎加值不吃倍率額度，竹簡最高階仍提升固定成長', () => {
      const base = newSession(77).current;
      const gains = [4, 5].map((tier) => {
        const state = {
          ...base,
          items: { ...base.items, count: { 'item:bamboo': 1 } },
          metaSnapshot: {
            ...base.metaSnapshot,
            itemCodex: { 'item:bamboo': { tier, fragments: 0 } },
          },
          turn: {
            ...base.turn,
            slots: base.turn.slots.map((slot) => ({
              ...slot,
              baseGlow: 'none' as const,
              notables: [],
            })),
          },
        };
        return previewTraining(2, { defs, state }, wiring.fx).expectedGain;
      });
      ok(gains[1]! > gains[0]!, '第五階成長加成不能因基礎加值早已觸顶而失效');
    });
    it('讀檔重新核對待辦選項價錢與資格，不重抽事件或商品', () => {
      const base = newSession(77),
        def = defs
          .reader('event')
          .all()
          .find((e) => e.mechanic === 'investment')!;
      if (def.trigger.kind !== 'commission') throw new Error('fixture');
      const options = optionStates(
        def,
        def.trigger.rarity,
        base.ctx,
        wiring.fx,
      );
      const state = {
        ...base.current,
        turn: {
          ...base.current.turn,
          pending: [
            {
              eventDefId: def.eventDefId,
              rarity: def.trigger.rarity,
              params: {},
              optionStates: options.map((o) => ({ ...o, moneyCost: 1 })),
            },
          ],
        },
      };
      const restored = Session.restore(wiring, state);
      eq(restored.pendingEvent!.eventDefId, def.eventDefId);
      eq(restored.pendingEvent!.optionStates, options);
      eq(restored.current.rngCursors, state.rngCursors);
      eq(restored.marketShelf(), state.economy.market);
    });
    it('投入型委託用較少淨薪水換確定成果，不同時支配免費解法', () => {
      const s = newSession(77);
      for (const event of defs
        .reader('event')
        .all()
        .filter((e) => e.mechanic === 'investment')) {
        if (event.trigger.kind !== 'commission') continue;
        const options = optionStates(
            event,
            event.trigger.rarity,
            s.ctx,
            wiring.fx,
          ),
          low = options[0]!,
          high = options[2]!;
        eq(event.options[2]!.check, null);
        ok(high.salary! - high.moneyCost! < low.salary!, '付費有收入取捨');
        ok(
          high.meritPreview.reduce((n, m) => n + m.amount, 0) >
            low.meritPreview.reduce((n, m) => n + m.amount, 0),
          '付費有功績回報',
        );
      }
    });
    it('帳本拒絕透支、小數與重複交易，貸借可核對', () => {
      const s = newSession(77),
        a = transact('test', -100, '測試', s.ctx),
        ctx = { ...s.ctx, state: a };
      eq(a.economy.money, 20);
      eq(transact('test', -100, '重播', ctx), a);
      eq(transact('over', -21, '透支', ctx), a);
      eq(transact('fraction', 0.5, '零錢', ctx), a);
      eq(a.economy.earned - a.economy.spent, a.economy.money);
    });
    it('技能與特性 Lv3 封頂且未達條件不扣款', () => {
      const base = newSession(77).current,
        skill = base.abilities.skills[0]!;
      const s = Session.restore(wiring, {
        ...base,
        progress: { ...base.progress, chapter: chapterIndex(4) },
        attributes: { values: { lead: 95, war: 95, int: 95, pol: 95 } },
        economy: { ...base.economy, money: 5000 },
      });
      ok(s.upgradeAbility(skill), '升至二級');
      ok(s.upgradeAbility(skill), '升至三級');
      const before = s.current;
      ok(!s.upgradeAbility(skill), '不得超過三級');
      eq(s.current, before);
    });
    it('學習第五條特性不超過四條啟用，可自由替換', () => {
      let state = newSession(77).current;
      for (const d of defs.reader('trait').all())
        state = grantUnlock(d.traitId, null, { state, defs });
      const s = Session.restore(wiring, {
        ...state,
        progress: { ...state.progress, chapter: chapterIndex(4) },
        attributes: { values: { lead: 95, war: 95, int: 95, pol: 95 } },
        economy: { ...state.economy, money: 10000 },
      });
      const traits = defs.reader('trait').all().slice(0, 5);
      for (const d of traits) ok(s.upgradeAbility(d.traitId), '學習特性');
      eq(s.current.abilities.traits.length, 5);
      eq(s.current.abilities.activeTraits?.length, 4);
      s.toggleTrait(traits[0]!.traitId);
      s.toggleTrait(traits[4]!.traitId);
      eq(s.current.abilities.activeTraits?.length, 4);
      ok(
        s.current.abilities.activeTraits?.includes(traits[4]!.traitId) === true,
        '替換生效',
      );
    });
    it('能力跨越軟上限時拆段計算，預覽不超過資質上限', () => {
      const base = newSession(77).current,
        ctx = {
          defs,
          state: {
            ...base,
            attributes: { values: { ...base.attributes.values, war: 39.5 } },
          },
        };
      near(previewGrowth('war', 2, ctx), 1.7, 0.00001);
      eq(previewGrowth('war', 10000, ctx), 35.5);
    });
    it('陌生角色只有一星初遇，角色本身五星也不跳深交故事', () => {
      const base = newSession(77).current,
        ctx = {
          defs,
          state: {
            ...base,
            progress: { ...base.progress, chapter: chapterIndex(4) },
            roster: {
              members: base.roster.members.map((m) => ({
                ...m,
                affinity: 0,
                cooperations: 99,
              })),
            },
          },
        };
      const pool = encounterPool(ctx);
      ok(pool.length > 0, '初遇池存在');
      ok(
        pool.every((e) => stories.storyRarity(e) === 1),
        '陌生不得進高星池',
      );
    });
    it('好感滿值仍要前置與共事，高補償不越過故事門檻', () => {
      const base = newSession(77).current,
        e = defs
          .reader('event')
          .all()
          .find(
            (e) => e.trigger.kind === 'notable' && e.progression?.rarity === 5,
          )!;
      if (e.trigger.kind !== 'notable') throw new Error('fixture');
      const state = {
        ...base,
        progress: { ...base.progress, chapter: chapterIndex(4) },
        roster: {
          members: e.trigger.cast.map((c) => ({
            notableId: c.notableId,
            origin: 'superior' as const,
            affinity: 100,
            cooperations: 0,
          })),
        },
      };
      const blocked = stories.blockers(e, { defs, state });
      ok(
        blocked.some((x) => x.includes('先完成')),
        '必須前置',
      );
      ok(
        blocked.some((x) => x.includes('共事')),
        '必須共事',
      );
    });
    it('完成同一步數的別條鏈不能代替指定前置，冷卻需跨兩回合', () => {
      const base = newSession(77).current,
        who = base.roster.members[0]!.notableId;
      const chain = defs
        .reader('event')
        .all()
        .filter(
          (e) =>
            e.trigger.kind === 'notable' &&
            e.trigger.cast[0]?.notableId === who &&
            e.progression?.rarity! <= 2,
        );
      const first = chain.find((e) => e.progression?.rarity === 1)!,
        second = chain.find((e) => e.progression?.rarity === 2)!;
      let state = {
        ...base,
        roster: {
          members: base.roster.members.map((m) => ({ ...m, cooperations: 2 })),
        },
      };
      ok(
        stories
          .blockers(second, { defs, state })
          .some((x) => x.includes('先完成')),
        '前置被擋',
      );
      const other = defs
        .reader('event')
        .all()
        .find(
          (e) =>
            e.trigger.kind === 'notable' &&
            e.progression?.rarity === 1 &&
            e.eventDefId !== first.eventDefId,
        )!;
      state = stories.record(other, 0, true, { defs, state }) as typeof state;
      ok(
        stories
          .blockers(second, { defs, state })
          .some((x) => x.includes('先完成')),
        '別條鏈不能代替前置',
      );
      state = stories.record(first, 0, true, { defs, state }) as typeof state;
      ok(
        stories
          .blockers(second, { defs, state })
          .some((x) => x.includes('稍後')),
        '同回合不能接下一段',
      );
      state = {
        ...state,
        progress: {
          ...state.progress,
          turn: turnIndex(state.progress.turn + 2),
        },
      };
      eq(stories.blockers(second, { defs, state }), []);
    });
    it('關注只對合法候選累積等待，不替不合格故事保底', () => {
      const s = newSession(77),
        who = s.current.roster.members[0]!.notableId;
      let state = stories.track(who, s.ctx);
      state = stories.updateWait(encounterPool({ ...s.ctx, state }), {
        ...s.ctx,
        state,
      });
      const after = {
        ...state,
        progress: {
          ...state.progress,
          turn: turnIndex(state.progress.turn + 3),
        },
      };
      ok(stories.pityDue({ ...s.ctx, state: after }), '等待三回合後保底');
      const reset = stories.updateWait([], { ...s.ctx, state: after });
      ok(!stories.pityDue({ ...s.ctx, state: reset }), '無候選不累积');
    });
    it('入隊補償隨天命與錯過回合縮放，舊同伴不重複加成', () => {
      const faction = defs.reader('faction').all()[0]!,
        bond = defs
          .reader('shopItem')
          .all()
          .find((i) => i.levels.some((l) => l.grant.kind === 'factionBond'))!;
      const starts = [];
      for (const level of [0, 3]) {
        const base = newSession(77).current,
          state = {
            ...base,
            faction: faction.faction,
            progress: { ...base.progress, turn: turnIndex(17) },
            metaSnapshot: {
              ...base.metaSnapshot,
              shop: { purchased: { [String(bond.item)]: level } },
            },
          };
        const next = roster.assignSuperiors(
          [],
          { state, defs, rng: createRng(base.seed, base.rngCursors) },
          wiring.fx,
        );
        eq(
          next.roster.members.slice(0, base.roster.members.length),
          base.roster.members,
        );
        starts.push(next.roster.members.at(-1)!.affinity);
        eq(next.roster.members.at(-1)!.cooperations, 0);
      }
      eq(starts, [32, 68]);
    });
    it('新人未互動零碎片，互動上限在圓夢倍率之前套用', () => {
      const id = defs.reader('notable').all()[0]!.notableId;
      const none = awardNotableFragments(
        [{ notableId: id, finalStage: 'sworn', interactionCap: 0 }],
        true,
        META,
        defs,
      );
      eq(none.gained, {});
      const small = awardNotableFragments(
        [{ notableId: id, finalStage: 'sworn', interactionCap: 5 }],
        true,
        META,
        defs,
      );
      eq(
        small.gained[String(id)],
        5 * defs.single('affinityCurve').fullDreamMultiplier,
      );
    });
    it('攜帶或購物不吃天然掉落次數，重复取得只加碎片', () => {
      const s = newSession(77),
        d = defs
          .reader('item')
          .all()
          .find((d) => d.perRunCap === 1)!;
      const first = item.acquire(d.itemId, s.ctx, 'market').state;
      ok(
        item.canAcquire(d.itemId, { ...s.ctx, state: first }),
        '購物不吃天然上限',
      );
      const second = item.acquire(d.itemId, { ...s.ctx, state: first }).state;
      eq(
        item.pendingFragments({ ...s.ctx, state: second })[String(d.itemId)],
        1,
      );
      ok(
        !item.canAcquire(d.itemId, { ...s.ctx, state: second }),
        '天然一次後封頂',
      );
    });
    it('滿天命章一固定六件道具不重複，不刷出高章節珍品', () => {
      const base = newSession(77).current,
        purchased = Object.fromEntries(
          defs
            .reader('shopItem')
            .all()
            .filter((i) =>
              i.levels.some(
                (l) =>
                  l.grant.kind === 'marketSlots' ||
                  l.grant.kind === 'marketQuality',
              ),
            )
            .map((i) => [String(i.item), 3]),
        );
      const state = {
          ...base,
          metaSnapshot: { ...base.metaSnapshot, shop: { purchased } },
          economy: {
            ...base.economy,
            market: { ...base.economy.market, chapter: 0 },
          },
        },
        ctx = { state, defs, rng: createRng(base.seed, base.rngCursors) };
      const first = market.refresh(ctx);
      eq(first.economy.market.offers.length, 6);
      eq(new Set(first.economy.market.offers.map((x) => x.itemId)).size, 6);
      ok(
        first.economy.market.offers.every(
          (o) => defs.reader('item').get(String(o.itemId)).rarity <= 2,
        ),
        '章節遮罩',
      );
      eq(market.refresh({ ...ctx, state: first }), first);
    });
    it('商品重複點擊不扣款；指定碎片每章一次、等待結算', () => {
      const base = newSession(77).current,
        s = Session.restore(wiring, {
          ...base,
          economy: { ...base.economy, money: 5000 },
        }),
        row = s.marketShelf().offers[0]!;
      ok(s.buyMarket(row.id), '購物成功');
      const after = s.current;
      ok(!s.buyMarket(row.id), '不得買第二次');
      eq(s.current, after);
      s.selectFragment(row.itemId);
      const beforeMeta = s.current.metaSnapshot;
      ok(s.buyFragment(), '購碎片');
      ok(!s.buyFragment(), '本章限一次');
      eq(s.current.metaSnapshot, beforeMeta);
      eq(s.current.items.fragments?.[String(row.itemId)], 1);
    });
    it('檢定預覽精確符合所有整數骰面（含低能力捨入邊界）', () => {
      const r = defs.single('checkRule');
      for (const value of [0, 15, 24, 35, 50, 82])
        for (const dc of [0, 13, 22, 30, 45, 79, 98]) {
          let hits = 0;
          for (let face = r.rollMin; face <= r.rollMax; face++)
            if (rollTotal(value, face, r) >= dc) hits++;
          eq(successRate(value, 0, dc, r), hits / (r.rollMax - r.rollMin + 1));
        }
    });
    it('失敗也有出勤薪水，預覽和結算用同一星級與能力', () => {
      const base = newSession(77).current,
        d =
          defs
            .reader('event')
            .all()
            .find(
              (e) =>
                e.trigger.kind === 'commission' &&
                e.trigger.rarity === 5 &&
                e.mechanic !== 'investment',
            ) ??
          defs
            .reader('event')
            .all()
            .find(
              (e) => e.trigger.kind === 'commission' && e.trigger.rarity === 4,
            )!;
      if (d.trigger.kind !== 'commission') throw new Error('fixture');
      const state = {
          ...base,
          attributes: { values: { lead: 0, war: 0, int: 0, pol: 0 } },
        },
        ctx = { state, defs };
      const states = optionStates(d, d.trigger.rarity, ctx, wiring.fx),
        offer = {
          eventDefId: d.eventDefId,
          rarity: d.trigger.rarity,
          params: {},
          optionStates: states,
        };
      const next = resolveHead(
        1,
        {
          ...ctx,
          state: { ...state, turn: { ...state.turn, pending: [offer] } },
          rng: createRng(base.seed, base.rngCursors),
        },
        wiring.fx,
        wiring.writer,
      );
      eq(next.turn.resolved.at(-1)?.passed, false);
      eq(next.economy.money - base.economy.money, states[1]!.failureSalary);
    });
    it('章末先休整，可購物再過章', () => {
      const s = newSession(77);
      for (let i = 0; i < 8; i++) {
        s.selectSlot(0);
        while (s.pendingEvent)
          s.resolveEvent(
            s.pendingEvent.optionStates.findIndex((o) => o.enabled),
          );
        s.advance();
      }
      const shelf = JSON.stringify(s.marketShelf());
      s.configureCampaign({
        skills: s.current.abilities.skills.slice(0, 3),
        commanders: [],
      });
      s.withdraw();
      ok(s.needsChapterCamp, '章末休整');
      eq(JSON.stringify(s.marketShelf()), shelf);
      throws(() => s.selectSlot(0), '休整時不能重複行動');
      s.continueChapter();
      ok(s.needsFactionChoice, '休整後再選陣營');
    });
    it('金紅光可抽五星委託，但起始章節與官階不可越過', () => {
      const base = newSession(88).current;
      const state = {
        ...base,
        progress: { ...base.progress, chapter: chapterIndex(4) },
        currencies: {
          ...base.currencies,
          merit: { civil: 2000, martial: 2000 },
        },
      };
      const ctx = { state, defs, rng: createRng(base.seed, base.rngCursors) },
        low = { state: base, defs, rng: createRng(base.seed, base.rngCursors) };
      let sawFive = false;
      for (let i = 0; i < 200; i++) {
        if (drawCommission('war', 'red', ctx, wiring.fx).rarity === 5)
          sawFive = true;
        ok(
          drawCommission('war', 'red', low, wiring.fx).rarity <= 2,
          '早期遮罩',
        );
      }
      ok(sawFive, '五星實際可抽到');
    });
    it('最後一章先回營且可買貨，按繼續後才結算', () => {
      const s = newSession(77);
      let camps = 0;
      for (let guard = 0; guard < 200 && !s.isOver; guard++) {
        if (s.needsChapterCamp) {
          camps++;
          ok(!s.isOver, '回營尚未結算');
          const first = s
            .marketShelf()
            .offers.find((o) => !o.bought && o.price <= s.money);
          if (first) ok(s.buyMarket(first.id), '營中可購物');
          s.continueChapter();
          continue;
        }
        if (s.needsFactionChoice) {
          s.chooseFaction(
            s.factionOptions().find((o) => o.eligible)!.factionId,
          );
          continue;
        }
        if (s.needsSuperiors) {
          s.assignSuperiors([]);
          const state = s.current;
          s.assignSuperiors([]);
          eq(s.current, state);
          continue;
        }
        if (s.needsCampaign) {
          s.configureCampaign({
            skills: s.current.abilities.skills.slice(0, 3),
            commanders: [],
          });
          s.withdraw();
          continue;
        }
        s.selectSlot(0);
        while (s.pendingEvent)
          s.resolveEvent(
            s.pendingEvent.optionStates.findIndex((o) => o.enabled),
          );
        s.advance();
      }
      eq(camps, 4);
      ok(s.isOver, '第四次離營後結算');
    });
    it('新存檔保留錢、貨架與關注；舊局保留備份但要求重新入夢', () => {
      const original = Object.getOwnPropertyDescriptor(
          globalThis,
          'localStorage',
        ),
        memory = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k: string) => memory.get(k) ?? null,
          setItem: (k: string, v: string) => memory.set(k, v),
          removeItem: (k: string) => memory.delete(k),
        },
      });
      try {
        const s = newSession(77);
        s.trackStory(s.current.roster.members[0]!.notableId);
        saveRun(s, ['測試']);
        const restored = restoreRun(wiring);
        ok(restored.session !== null, '可還原');
        eq(restored.session!.current, s.current);
        eq(restored.log, ['測試']);
        memory.set('sgd.run.v2', 'old-backup');
        memory.delete('sgd.run.v3');
        const old = restoreRun(wiring);
        eq(old.session, null);
        ok(old.notice.includes('重新入夢'), '遷移說明');
        eq(memory.get('sgd.run.v2'), 'old-backup');
        memory.set(
          'sgd.run.v3',
          JSON.stringify({
            version: 3,
            state: { ...s.current, economy: { money: 2 } },
          }),
        );
        eq(restoreRun(wiring).session, null);
      } finally {
        if (original)
          Object.defineProperty(globalThis, 'localStorage', original);
        else Reflect.deleteProperty(globalThis, 'localStorage');
      }
    });
    it('能力為整數，經驗未滿保留、滿條進位且預覽會換到下一條', () => {
      const initial = projectGrowth(36.64, 0, 75);
      eq(initial.value, 36); eq(initial.basePercent, 64);
      const partial = projectGrowth(36.64, .2, 75);
      eq(partial.value, 36); eq(partial.projectedExperience, 84); eq(partial.ghostPercent, 20);
      const full = projectGrowth(36.64, .36, 75);
      eq(full.value, 37); eq(full.projectedExperience, 0); eq(full.basePercent, 0);
      const multiple = projectGrowth(36.64, 3.5, 75);
      eq(multiple.value, 40); eq(multiple.projectedExperience, 14);
      const shown = projectGrowth(74.8, 2, 75);
      eq(shown.value, 75); eq(shown.projectedExperience, 100);
      eq(projectGrowth(75, 3, 75).ghostPercent, 0);
      eq(projectGrowth(25.1, .25, 75).value, 25);
    });
    it('未滿條的經驗不列入能力判定，持續成長不會遺失餘額', () => {
      const base = newSession(77).current;
      const state = {...base, attributes: {values: {...base.attributes.values, war: 36.64}}};
      const ctx = {state, defs};
      eq(statQuery.attr('war', ctx), 36);
      eq(statQuery.read('attr.war', ctx), 36);
      const partial = grantGrowth('war', .2, ctx);
      near(partial.attributes.values.war, 36.84, .00001);
      eq(statQuery.attr('war', {state: partial, defs}), 36);
      const full = grantGrowth('war', .16, {state: partial, defs});
      eq(statQuery.attr('war', {state: full, defs}), 37);
      eq(full.attributes.values.war, 37);
      const capped = grantGrowth('war', 100, {state: full, defs});
      eq(statQuery.attr('war', {state: capped, defs}), 75);
    });
  });
}
