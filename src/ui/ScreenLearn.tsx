import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { AbilityCost } from '../contracts/core/definitions.js';
import type { Attr } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';

interface Props {
  readonly s: Session;
  readonly bump: () => void;
  readonly onBack: () => void;
}

const costText = (c: AbilityCost): string => ATTRS
  .flatMap((a) => {
    const n = c[a];
    return n === undefined || n <= 0 ? [] : [`${t(`attr.${a}.short`)}${n}`];
  })
  .join(' ＋ ');

/**
 * 養成兌現（32）。**學習不佔行動、隨時可做** ——
 * 它不是行動決策，而且數值會擋事件門檻，玩家有理由早花。
 *
 * 畫面分三塊，順序就是玩家該想的順序：
 *   1. 我有多少經驗（四類，不共用）
 *   2. 數值買到哪一級、下一級多少錢
 *   3. 特質與技能 —— 未解鎖的【也要顯示】，並寫出誰能教
 */
type Tab = 'attr' | 'skill' | 'trait';

export function ScreenLearn({ s, bump, onBack }: Props): React.ReactElement {
  /**
   * 三個 Tab ★ **它們的稀缺不同，所以不該擠在同一頁**（32 §4）
   *
   *   基礎能力  稀缺在【天花板】—— 買不買得到看資質
   *   技能      稀缺在【格數】（只有 3 格）與【解鎖】（誰教你）
   *   特性      稀缺在【經驗總量】
   *
   * 舊版三張表垂直疊成一頁，於是「我現在該花在哪」要靠捲動去比較。
   * 分頁之後每一頁只回答一個問題，而分頁列本身就是那三種稀缺的清單。
   */
  const [tab, setTab] = useState<Tab>('attr');
  const traits = s.traitOffers();
  const skills = s.skillOffers();
  const learnedSkills = s.current.abilities.skills.length;
  const canLearn = (n: number): string => (n > 0 ? ` ·${n}` : '');
  const readyTraits = traits.filter((o) => o.state === 'learnable').length;
  const readySkills = skills.filter((o) => o.state === 'learnable').length;

  // 說明文字的兩個端點從價格帶表算出來 —— 寫死過一次，改尺度就對不上了。
  const bands = s.attrBands().filter((b) => b.max > b.min);
  const cheapest = bands.reduce((a, b) => (b.costPerPoint < a.costPerPoint ? b : a));
  const priciest = bands.reduce((a, b) => (b.costPerPoint > a.costPerPoint ? b : a));

  const nameOf = (id: unknown): string =>
    t(defs.reader('notable').get(String(id)).nameKey);

  return (
    <>
      <h1>能力提升</h1>
      <p className="sub">
        鍛鍊產出的是<b>經驗</b>，四類不共用。<b>學習隨時可做，不佔回合。</b>
      </p>
      <Hud s={s} />

      <div className="tabs">
        <button className={tab === 'attr' ? 'sel' : ''} onClick={() => { setTab('attr'); }}>
          基礎能力
        </button>
        <button className={tab === 'skill' ? 'sel' : ''} onClick={() => { setTab('skill'); }}>
          {`技能（${learnedSkills}/3）${canLearn(readySkills)}`}
        </button>
        <button className={tab === 'trait' ? 'sel' : ''} onClick={() => { setTab('trait'); }}>
          {`特性（${s.current.abilities.traits.length}）${canLearn(readyTraits)}`}
        </button>
      </div>

      {tab !== 'attr' ? null : (
      <>
      <table>
        <thead>
          <tr>
            <th>維</th><th className="n">現值</th><th>評</th>
            <th className="n">經驗</th><th>本輪上限</th><th>下一級</th><th>加點</th>
          </tr>
        </thead>
        <tbody>
          {ATTRS.map((a: Attr) => {
            const cur = s.current.attributes.values[a];
            const exp = s.expOf(a);
            const ng = s.nextGrade(a);
            const cap = s.attrCap(a);
            /*
              **一點一點加**，不是一次跳一整級。
              階梯計價的重點就是「下一點多少錢」——
              只給「升一級」會把那個階梯藏起來，玩家看不到自己正踩在哪一帶。
              升一級留著，因為它是最常用的那一步。
            */
            const step = (n: number): React.ReactElement | null => {
              const target = Math.min(cap, cur + n);
              if (target <= cur) return null;
              const cost = s.attrCost(a, target);
              return (
                <button
                  key={n}
                  disabled={exp < cost}
                  onClick={() => { s.learnAttr(a, target); bump(); }}
                >
                  {`+${target - cur}（${cost}）`}
                </button>
              );
            };
            return (
              <tr key={a}>
                <td><b>{t(`attr.${a}.short`)}</b></td>
                <td className="n mono">{cur}</td>
                <td className="mono"><b>{s.gradeOf(a)}</b></td>
                <td className={`n mono ${exp > 0 ? 'ok' : ''}`}>{exp}</td>
                {/*
                  **天花板要看得見**（14 §2）。它是這一輪爬得到哪裡的答案，
                  而它由資質決定 —— 資質是跨輪貨幣。把兩個數字寫在一起，
                  玩家才知道那道牆在哪、以及【什麼買得動它】。
                  舊版這一欄不存在，於是「練不上去」讀起來像經驗不夠，
                  其實是本輪根本到頂了。
                */}
                <td className={`n mono ${cur >= cap ? 'warn' : 'sub'}`}>
                  {`${cap}`}
                  <span className="sub">{`（資質 ${s.aptitudeOf(a)}）`}</span>
                </td>
                <td className="mono">
                  {ng === null
                    ? (cur >= cap ? '本輪到頂' : '已達頂')
                    : `${ng.grade} @${ng.at}`}
                </td>
                <td>
                  <div className="row">
                    {step(1)}
                    {step(5)}
                    {ng === null ? null : (
                      <button
                        className="primary"
                        disabled={exp < ng.cost}
                        onClick={() => { s.learnAttr(a, ng.at); bump(); }}
                      >
                        {`升到 ${ng.grade}（${ng.cost}）`}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sub">
        {`每一點的價碼隨等級帶上升（${cheapest.grade} 帶 ${cheapest.costPerPoint}／點`
          + ` → ${priciest.grade} 帶 ${priciest.costPerPoint}／點）。`}
        <b>七個價格帶就是七個等級</b> —— 看到「武 B」就知道下一階要付多少。
        天花板由<b>資質</b>決定，而資質是天命買的（山河圖那一頁分配）。
      </p>
      </>
      )}

      {tab !== 'skill' ? null : (
      <>
      <p className="sub">
        戰役中的行動，<b>只有 3 格</b>。學第四招的理由只有一個 ——
        換帶（不同章節的敵人性質不同）。
      </p>
      <table>
        <thead>
          <tr><th>技能</th><th>階</th><th>說明</th><th>消耗</th><th>狀態</th><th /></tr>
        </thead>
        <tbody>
          {skills.map((o) => (
            <tr key={String(o.def.skillId)}>
              <td><b>{t(o.def.nameKey)}</b></td>
              <td className="mono">{t(`abilityTier.${o.tier}`)}</td>
              <td style={{ maxWidth: 320 }}>{t(o.def.descKey)}</td>
              <td className="mono">{costText(o.cost)}</td>
              <td className={o.state === 'learnable' ? 'ok' : (o.state === 'locked' ? 'warn' : '')}>
                {o.state === 'locked'
                  ? (o.teachers.length === 0
                    ? '無人可教'
                    : `需 ${o.teachers.map((x) => nameOf(x.notableId)).join('／')} 更熟`)
                  : t(`learnState.${o.state}`)}
              </td>
              <td>
                <button
                  className="primary"
                  disabled={o.state !== 'learnable'}
                  onClick={() => { s.learnSkill(o.def.skillId); bump(); }}
                >
                  學
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      </>
      )}

      {tab !== 'trait' ? null : (
      <>
      <p className="sub">
        常駐被動，<b>不佔格</b> —— 買得起就一直帶著。所以它的稀缺是經驗總量。
      </p>
      <table>
        <thead>
          <tr><th>特質</th><th>階</th><th>說明</th><th>消耗</th><th>狀態</th><th /></tr>
        </thead>
        <tbody>
          {traits.map((o) => (
            <tr key={String(o.def.traitId)}>
              <td>
                <b>{t(o.def.nameKey)}</b>
                {o.def.polarity === 'negative' ? <span className="warn"> 負面</span> : ''}
              </td>
              <td className="mono">{t(`abilityTier.${o.tier}`)}</td>
              <td style={{ maxWidth: 320 }}>{t(o.def.descKey)}</td>
              <td className="mono">{costText(o.cost)}</td>
              <td className={o.state === 'learnable' ? 'ok' : (o.state === 'locked' ? 'warn' : '')}>
                {o.state === 'locked'
                  ? (o.teachers.length === 0
                    ? '無人可教'
                    : `需 ${o.teachers.map((x) => nameOf(x.notableId)).join('／')} 更熟`)
                  : t(`learnState.${o.state}`)}
              </td>
              <td>
                <button
                  className="primary"
                  disabled={o.state !== 'learnable'}
                  onClick={() => { s.learnTrait(o.def.traitId); bump(); }}
                >
                  學
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="sub" style={{ marginTop: 12 }}>
        絕階要三類經驗混合 —— 只練一維的人買不起。這是專精要付的代價。
      </p>
      </>
      )}

      <button style={{ marginTop: 12 }} onClick={onBack}>回到回合</button>
    </>
  );
}
