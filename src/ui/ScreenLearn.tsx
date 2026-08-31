import type { Session } from '../app/session.js';
import type { AbilityCost } from '../contracts/core/definitions.js';
import type { Attr } from '../contracts/core/primitives.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { StatusBar } from './StatusBar.js';

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
export function ScreenLearn({ s, bump, onBack }: Props): React.ReactElement {
  const traits = s.traitOffers();
  const skills = s.skillOffers();
  const learnedSkills = s.current.abilities.skills.length;

  const nameOf = (id: unknown): string =>
    t(defs.reader('notable').get(String(id)).nameKey);

  return (
    <>
      <h1>養成</h1>
      <p className="sub">
        鍛鍊產出的是<b>經驗</b>，四類不共用。屬性、特質、技能都要在這裡花掉它。
        學習隨時可做，不佔回合。
      </p>
      <StatusBar s={s} />

      <h2>四維 · 花經驗買</h2>
      <table>
        <thead>
          <tr>
            <th>維</th><th>現值</th><th>評</th>
            <th className="n">經驗</th><th>下一級</th><th className="n">價碼</th><th />
          </tr>
        </thead>
        <tbody>
          {ATTRS.map((a: Attr) => {
            const ng = s.nextGrade(a);
            const exp = s.expOf(a);
            const afford = ng !== null && exp >= ng.cost;
            return (
              <tr key={a}>
                <td><b>{t(`attr.${a}.short`)}</b></td>
                <td className="n mono">{s.current.attributes.values[a]}</td>
                <td className="mono"><b>{s.gradeOf(a)}</b></td>
                <td className="n mono">{exp}</td>
                <td className="mono">{ng === null ? '已達頂' : `${ng.grade}（${ng.at}）`}</td>
                <td className={`n mono ${afford ? 'ok' : 'warn'}`}>{ng?.cost ?? '—'}</td>
                <td>
                  <button
                    className="primary"
                    disabled={ng === null || !afford}
                    onClick={() => { if (ng !== null) { s.learnAttr(a, ng.at); bump(); } }}
                  >
                    升一級
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>{`技能（戰役中的行動 · 已學 ${learnedSkills}，帶 3 招上場）`}</h2>
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

      <h2>特質（常駐 · 不佔格，買得起就一直帶著）</h2>
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
      <button onClick={onBack}>回到回合</button>
    </>
  );
}
