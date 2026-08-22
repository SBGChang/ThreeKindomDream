import type { Session } from '../app/session.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { careerService, defs, stageOf, t } from '../app/bootstrap.js';

export function StatusBar({ s }: { readonly s: Session }): React.ReactElement {
  const st = s.current;
  const civil = careerService.rankOf('civil', s.ctx);
  const martial = careerService.rankOf('martial', s.ctx);

  return (
    <>
      <div className="bar mono">
        {ATTRS.map((a) => (
          <span key={a}>{t(`attr.${a}.short`)} <b>{st.attributes.values[a]}</b></span>
        ))}
        <span>文名 <b>{st.currencies.fame.civil}</b></span>
        <span>武名 <b>{st.currencies.fame.martial}</b></span>
        <span>善惡 <b>{st.currencies.fame.moral}</b></span>
        {st.faction !== null && (
          <>
            <span>文功績 <b>{st.currencies.merit.civil}</b></span>
            <span>武功績 <b>{st.currencies.merit.martial}</b></span>
            <span>官階 <b>{t(civil.nameKey)}</b> / <b>{t(martial.nameKey)}</b></span>
          </>
        )}
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
