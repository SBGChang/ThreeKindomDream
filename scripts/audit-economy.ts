import { writeFileSync } from 'node:fs';
import { Session } from '../src/app/session.js';
import { driveRun } from '../src/app/run-driver.js';
import { compose } from '../src/app/composition.js';
import { loadContent } from '../src/data-runtime/loader.js';
import { diskRepository } from '../src/platform/content-repository.js';
import { emptyDraft, emptyMeta } from '../src/modules/dream-entry.js';
import { seed } from '../src/contracts/core/ids.js';
import { POLICIES } from './lib/policies.js';
const loaded = loadContent(diskRepository());
if (!loaded.ok) throw new Error(loaded.report);
interface Chapter {
  chapter: number;
  money: number;
  earned: number;
  spent: number;
  troops: number;
  power: number;
  skills: number;
  traits: number;
}
interface Sample {
  income: number;
  spent: number;
  money: number;
  attrs: number[];
  stories: number;
  marketItems: number;
  fragments: number;
  commissions: number;
  depths: readonly number[];
  chapters: Chapter[];
  merit: { civil: number; martial: number };
}
const defs = loaded.registry,
  w = compose(defs),
  runs = Number(process.argv[2] ?? 30),
  out = [];
for (const star of [0, 3, 5])
  for (const name of [
    'greedy-gain',
    'flag-chaser',
    'focus-martial',
    'balanced',
    'market-balanced',
  ]) {
    const policy = POLICIES.find(
        (p) => p.name === (name === 'market-balanced' ? 'balanced' : name),
      )!,
      samples: Sample[] = [];
    for (let i = 0; i < runs; i++) {
      const base = emptyMeta(),
        meta = {
          ...base,
          notableCodex: Object.fromEntries(
            defs
              .reader('notable')
              .all()
              .map((n) => [String(n.notableId), { star, fragments: 0 }]),
          ),
        };
      const s = Session.start(w, meta, emptyDraft(meta, defs), seed(1000 + i)),
        chapters: Chapter[] = [];
      const result = driveRun(s, {
        ...policy,
        spend: (s) => {
          if (name === 'market-balanced') {
            const offer = s
              .marketShelf()
              .offers.find(
                (o) =>
                  !o.bought &&
                  !s.current.items.count[String(o.itemId)] &&
                  s.money - o.price >= 160,
              );
            if (offer) s.buyMarket(offer.id);
            const target = s.fragmentTargets()[0];
            if (target && s.money - s.fragmentPrice(target.itemId) >= 160) {
              s.selectFragment(target.itemId);
              s.buyFragment();
            }
          }
          policy.spend(s);
          chapters.push({
            chapter: s.current.progress.chapter,
            money: s.money,
            earned: s.current.economy.earned,
            spent: s.current.economy.spent,
            troops: s.hostLimits().troopsMax,
            power: s.hostPower(),
            skills: s.current.abilities.skills.length,
            traits: s.current.abilities.traits.length,
          });
        },
      });
      samples.push({
        income: s.current.economy.earned,
        spent: s.current.economy.spent,
        money: s.money,
        attrs: Object.values(s.current.attributes.values),
        marketItems: s.current.economy.ledger.filter((x) =>
          x.id.startsWith('market/'),
        ).length,
        fragments: s.current.economy.ledger.filter((x) =>
          x.id.startsWith('fragment/'),
        ).length,
        stories: Object.keys(s.current.stories.history).filter(
          (id) => defs.reader('event').get(id).trigger.kind === 'notable',
        ).length,
        commissions: s.current.economy.ledger.filter(
          (x) =>
            x.id.startsWith('event/') &&
            defs.reader('event').get(x.id.split('/').slice(2).join('/')).trigger
              .kind === 'commission',
        ).length,
        depths: result.depths,
        chapters,
        merit: s.current.currencies.merit,
      });
    }
    const avg = (f: (x: (typeof samples)[number]) => number) =>
      Math.round((samples.reduce((n, x) => n + f(x), 0) / runs) * 100) / 100;
    out.push({
      star,
      policy: name,
      runs,
      income: avg((x) => x.income),
      spent: avg((x) => x.spent),
      money: avg((x) => x.money),
      stories: avg((x) => x.stories),
      marketItems: avg((x) => x.marketItems),
      fragments: avg((x) => x.fragments),
      commissions: avg((x) => x.commissions),
      bestAttr: avg((x) => Math.max(...x.attrs)),
      totalAttrs: avg((x) => x.attrs.reduce((a, b) => a + b, 0)),
      civilMerit: avg((x) => x.merit.civil),
      martialMerit: avg((x) => x.merit.martial),
      depths: [0, 1, 2, 3].map((i) => avg((x) => x.depths[i] ?? 0)),
      clearRate: avg((x) => x.depths.filter((n) => n === 7).length / 4),
      chapters: [0, 1, 2, 3].map((i) => ({
        earned: avg((x) => x.chapters[i]?.earned ?? 0),
        spent: avg((x) => x.chapters[i]?.spent ?? 0),
        skills: avg((x) => x.chapters[i]?.skills ?? 0),
      })),
    });
  }
writeFileSync(
  'docs/economy-audit.json',
  JSON.stringify({ seedFrom: 1000, rows: out }, null, 2),
);
console.table(
  out.map(({ chapters, ...x }) => ({ ...x, depths: x.depths.join('/') })),
);
