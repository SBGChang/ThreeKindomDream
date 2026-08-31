import type { Session } from '../app/session.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { careerService, defs, stageOf, t } from '../app/bootstrap.js';

export function StatusBar({ s }: { readonly s: Session }): React.ReactElement {
  const st = s.current;
  const civil = careerService.rankOf('civil', s.ctx);
  const martial = careerService.rankOf('martial', s.ctx);

  /**
   * 下一階還差多少。功績的好處【只在跨過門檻的那一刻】兌現，
   * 若不顯示距離，那條階梯對玩家而言就是不存在的（HANDOFF：門檻貨幣無感）。
   */
  const nextOf = (line: 'civil' | 'martial'): string => {
    const level = line === 'civil' ? st.career.civil : st.career.martial;
    const next = defs.reader('careerRank').all()
      .find((r) => r.line === line && r.level === level + 1);
    if (next === undefined) return '';
    const have = st.currencies.merit[line];
    return `${t(`merit.${line}`)}→${t(next.nameKey)} 差 ${Math.max(0, next.requiredMerit - have)}`;
  };
  const nextRank = [nextOf('civil'), nextOf('martial')].filter((x) => x !== '').join('　');

  return (
    <>
      <div className="bar mono">
        {ATTRS.map((a) => (
          <span key={a}>{t(`attr.${a}.short`)} <b>{st.attributes.values[a]}</b></span>
        ))}
        {/* 功績與官階從第一回合就顯示。名聲退場之後這是唯一的門檻貨幣，
            而它從第一回合就在動 —— 藏起來玩家就看不出自己在爬哪一條。 */}
        <span>文功 <b>{st.currencies.merit.civil}</b></span>
        <span>武功 <b>{st.currencies.merit.martial}</b></span>
        <span>官階 <b>{t(civil.nameKey)}</b> / <b>{t(martial.nameKey)}</b></span>
        <span className="mono sub">{nextRank}</span>
      </div>
      <div className="bar">
        {st.roster.members.map((m) => {
          const nd = defs.reader('notable').get(String(m.notableId));
          return (
            <span key={String(m.notableId)}>
              {t(nd.nameKey)}
              <b>{` ${t(`stage.${stageOf(m.notableId, s.ctx)}`)}`}</b>
              <span className="mono">{` ${m.affinity}`}</span>
              {m.origin === 'superior' ? ' ·上司' : ''}
            </span>
          );
        })}
      </div>
    </>
  );
}
