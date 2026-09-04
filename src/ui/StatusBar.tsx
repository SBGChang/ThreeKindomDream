import type { Session } from '../app/session.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { careerService, defs, stageOf, t } from '../app/bootstrap.js';

export function StatusBar({ s }: { readonly s: Session }): React.ReactElement {
  const st = s.current;
  const held = s.heldItems();
  const civil = careerService.rankOf('civil', s.ctx);
  const martial = careerService.rankOf('martial', s.ctx);

  /**
   * 下一階還差多少。功績的好處【只在跨過門檻的那一刻】兌現，
   * 若不顯示距離，那條階梯對玩家而言就是不存在的（HANDOFF：門檻貨幣無感）。
   */
  const cap = careerService.maxLevel('martial', s.ctx);
  const nextOf = (line: 'civil' | 'martial'): string => {
    const level = line === 'civil' ? st.career.civil : st.career.martial;
    // **到頂就說到頂**，不要繼續報一個買不到的門檻（14 §2）。
    // 官階的天花板是跨輪貨幣買的，所以它是玩家該看見的東西，
    // 不是一個「怎麼練都差 N 功績」的謎。
    if (level >= cap) return `${t(`merit.${line}`)} 已達本輪上限`;
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
        {/*
          四維要【三個數字一起看】：現值、等級、還沒花的經驗（32 §3.1）。
          少了經驗那一欄，玩家不知道自己手上有多少可花的東西 ——
          而那是這個系統唯一的貨幣。
        */}
        {ATTRS.map((a) => {
          const exp = s.expOf(a);
          return (
            <span key={a}>
              {t(`attr.${a}.short`)}
              {' '}
              <b>{st.attributes.values[a]}</b>
              <span className="sub">{`(${s.gradeOf(a)})`}</span>
              {exp > 0 ? <span className="ok">{` +${exp}`}</span> : ''}
            </span>
          );
        })}
        {/* 功績與官階從第一回合就顯示。名聲退場之後這是唯一的門檻貨幣，
            而它從第一回合就在動 —— 藏起來玩家就看不出自己在爬哪一條。 */}
        <span>文功 <b>{st.currencies.merit.civil}</b></span>
        <span>武功 <b>{st.currencies.merit.martial}</b></span>
        <span>
          官階 <b>{t(civil.nameKey)}</b> / <b>{t(martial.nameKey)}</b>
          <span className="sub">{`（本輪上限 第${cap}階）`}</span>
        </span>
        <span className="mono sub">{nextRank}</span>
      </div>
      {/*
        **身上有什麼要看得到** ★ 舊版道具只在回合紀錄裡閃過一個 `◆`，
        沒有清單、沒有效果 —— 於是一整套【碎片升階】的跨輪成長，
        玩家玩完一輪也不知道自己拿過東西。
      */}
      {held.length === 0 ? null : (
        <div className="bar">
          <span className="sub">隨身</span>
          {held.map((h) => (
            <span key={String(h.itemId)} title={h.desc}>
              {`◆${h.name}`}
              {h.count > 1 ? <span className="ok">{`×${h.count}`}</span> : ''}
              <span className="sub">{`　${h.desc}`}</span>
            </span>
          ))}
        </div>
      )}
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
