import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId, SkillId } from '../contracts/core/ids.js';
import type { CommanderSlot } from '../contracts/core/state.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { StatusBar } from './StatusBar.js';

interface Props { readonly s: Session; readonly bump: () => void }

const skillName = (id: SkillId): string =>
  t(defs.reader('skill').get(String(id)).nameKey);
const notableName = (id: NotableId): string =>
  t(defs.reader('notable').get(String(id)).nameKey);

/** 一條軍勢、一條糧秣。走留決策要一眼可讀 —— 這就是這個功能的核心畫面。 */
function Bar({ label, now, max, tone }: {
  readonly label: string; readonly now: number;
  readonly max: number; readonly tone: string;
}): React.ReactElement {
  const pct = Math.max(0, Math.min(100, (now / Math.max(1, max)) * 100));
  return (
    <div style={{ margin: '4px 0' }}>
      <span className="mono">{`${label} ${now} / ${max}`}</span>
      <div style={{ background: '#2a2a2a', height: 10, borderRadius: 5, marginTop: 2 }}>
        <div style={{
          width: `${pct}%`, height: 10, borderRadius: 5, background: tone,
        }}
        />
      </div>
    </div>
  );
}

export function ScreenCampaign({ s, bump }: Props): React.ReactElement {
  const st = s.current.campaign;
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const learned = s.current.abilities.skills;
  const eligible = s.eligibleCommanders();

  const [picked, setPicked] = useState<readonly SkillId[]>(() => learned.slice(0, 3));
  const [cmd, setCmd] = useState<readonly CommanderSlot[]>(() => eligible.slice(0, 3)
    .flatMap((id) => {
      const opt = s.commanderSkills(id).at(-1);
      return opt === undefined ? [] : [{ notableId: id, skillId: opt }];
    }));

  if (st === null) return <p>沒有進行中的戰役。</p>;

  // ── 戰前配置 ───────────────────────────────────
  if (st.phase === 'configuring') {
    const lim = s.hostLimits();
    const toggleSkill = (id: SkillId): void => {
      setPicked((cur) => (cur.includes(id)
        ? cur.filter((x) => x !== id)
        : (cur.length < 3 ? [...cur, id] : cur)));
    };
    const setCommanderSkill = (nid: NotableId, sid: SkillId): void => {
      setCmd((cur) => cur.map((c) => (c.notableId === nid ? { ...c, skillId: sid } : c)));
    };
    const toggleCommander = (id: NotableId): void => {
      setCmd((cur) => {
        if (cur.some((c) => c.notableId === id)) return cur.filter((c) => c.notableId !== id);
        if (cur.length >= 3) return cur;
        const opt = s.commanderSkills(id).at(-1);
        return opt === undefined ? cur : [...cur, { notableId: id, skillId: opt }];
      });
    };

    return (
      <>
        <h1>{`戰役 · ${t(chapter.titleKey)}`}</h1>
        <p className="sub">
          七關。<b>你不操作</b> —— 驗收的是這裡的配置。
          每一關打完都可以收兵，帶著已到手的獎勵走；輸了則夢醒。
        </p>
        <StatusBar s={s} />

        <h2>我軍</h2>
        <Bar label="兵量" now={lim.troopsMax} max={lim.troopsMax} tone="#7ea6ff" />
        <Bar label="糧量" now={lim.supplyMax} max={lim.supplyMax} tone="#8fd18f" />
        <p className="sub">
          {ATTRS.map((a) => `${t(`attr.${a}.short`)} ${s.current.attributes.values[a]}`
            + `(${s.gradeOf(a)})`).join('　')}
          {s.current.abilities.traits.length === 0 ? '' : `　特質 ${s.current.abilities.traits
            .map((x) => t(defs.reader('trait').get(String(x)).nameKey)).join('／')}`}
        </p>

        <h2>{`帶哪三招（已選 ${picked.length}/3）`}</h2>
        {learned.length === 0
          ? <p className="warn">你還沒學會任何一招 —— 這樣打不出傷害。先回去學。</p>
          : (
            <div className="row">
              {learned.map((id) => (
                <button
                  key={String(id)}
                  className={picked.includes(id) ? 'sel' : ''}
                  onClick={() => { toggleSkill(id); }}
                >
                  {skillName(id)}
                </button>
              ))}
            </div>
          )}
        <p className="sub">
          每回合<b>保底發一招</b>，第二招 60%、第三招 30%；<b>先擲次數再抽哪一招</b>，
          所以三格是等權的 —— 要的是一組能互相成立的組合，不是排優先序。
        </p>

        <h2>{`指揮（最多 3 位 · 已選 ${cmd.length}）`}</h2>
        <div className="row">
          {eligible.map((id) => (
            <button
              key={String(id)}
              className={cmd.some((c) => c.notableId === id) ? 'sel' : ''}
              onClick={() => { toggleCommander(id); }}
            >
              {`${notableName(id)}(${t(`affinity.${s.commanderStage(id)}`)})`}
            </button>
          ))}
        </div>
        {cmd.map((c) => {
          const opts = s.commanderSkills(c.notableId);
          return (
            <p key={String(c.notableId)} className="sub">
              {`${notableName(c.notableId)} 帶：`}
              {opts.map((sid) => (
                <button
                  key={String(sid)}
                  className={sid === c.skillId ? 'sel' : ''}
                  onClick={() => { setCommanderSkill(c.notableId, sid); }}
                >
                  {skillName(sid)}
                </button>
              ))}
            </p>
          );
        })}
        <p className="sub">
          他們不在場上 —— 他們是<b>傳令</b>。每回合各自獨立擲一次，
          <b>好感決定他多常出手</b>；星階決定他有幾招可選。
        </p>

        <button
          className="primary"
          onClick={() => { s.configureCampaign({ skills: picked, commanders: cmd }); bump(); }}
        >
          出陣
        </button>
      </>
    );
  }

  // ── 走還留 ─────────────────────────────────────
  const nx = s.nextStage();
  const done = nx === null;
  const banked = st.banked
    .filter((r) => r.kind === 'merit')
    .reduce((n, r) => n + (r.kind === 'merit' ? r.amount : 0), 0);
  const forgone = nx === null ? [] : nx.rewards.flatMap((r) => {
    if (r.kind === 'merit') return [`功績 ${r.amount}`];
    if (r.kind === 'unlock') {
      if (r.trait !== null) return [t(defs.reader('trait').get(String(r.trait)).nameKey)];
      if (r.skill !== null) return [skillName(r.skill)];
    }
    return [];
  });

  return (
    <>
      <h1>{`戰役 · ${t(chapter.titleKey)}`}</h1>
      <p className="sub">{`已通過 ${st.clearedStages} / ${s.stageCount()} 關`}</p>
      <StatusBar s={s} />

      <h2>我軍</h2>
      <Bar label="軍勢" now={st.host.troops} max={st.host.troopsMax} tone="#7ea6ff" />
      <Bar label="糧秣" now={st.host.supply} max={st.host.supplyMax} tone="#8fd18f" />
      {st.host.buffs.length === 0 ? null : (
        <p className="sub">
          {st.host.buffs.map((b) => `${t(b.sourceKey)}（${b.remaining} 回合）`).join('　')}
        </p>
      )}

      {st.log.length === 0 ? null : (
        <>
          <h2>戰報</h2>
          <div style={{ maxHeight: 260, overflowY: 'auto', fontSize: 13 }}>
            {st.log.map((e, i) => (
              <div key={`${e.turn}-${i}`} className="mono">
                {`R${e.turn} `}
                {e.actor === 'enemy' ? '敵 ' : (e.actor === 'commander' ? '令 ' : '我 ')}
                {e.actorKey === null ? '' : `${t(e.actorKey)} `}
                {e.skillKey === null ? '' : `〈${t(e.skillKey)}〉`}
                {e.kind === null ? '' : ` ${t(`skillKind.${e.kind}`)}`}
                {` ${e.amount}`}
                {e.why.length === 0 ? '' : `　（${e.why.join('・')}）`}
                {`　軍勢 ${e.troopsAfter}　敵 ${e.enemyAfter}`}
              </div>
            ))}
          </div>
        </>
      )}

      {done ? <p className="ok">七關已打完。這一章的故事到這裡。</p> : (
        <>
          <h2>{`下一關 · 第 ${(nx.index) + 1} 關`}</h2>
          <p>{t(nx.brief)}</p>
          <p className="mono">
            {`對面 ${nx.boss === null ? '雜兵' : t(nx.boss.nameKey)}`}
            {`　兵力 ${nx.enemyTroops}　每回合輸出 ${nx.enemyDamage}`}
          </p>
          <p className="sub">
            這裡<b>不給勝率</b> —— 你打過前幾關，剩多少血、上一關花了多少，你看得到。
          </p>
        </>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        {done ? null : (
          <button className="primary" onClick={() => { s.engage(); bump(); }}>
            再打一關
          </button>
        )}
        {/*
          收兵按鈕上【必須寫著你放棄了什麼】（D14）——
          這是 GDD §9.5 已立的原則。看不見代價的「走」會讓 push-your-luck
          退化成隨便按。
        */}
        <button onClick={() => { s.withdraw(); bump(); }}>
          {`收兵（保住 ${banked} 功績`}
          {forgone.length === 0 ? '' : `，放棄：${forgone.join('、')}`}
          {'）'}
        </button>
      </div>
    </>
  );
}
