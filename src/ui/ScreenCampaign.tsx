import { useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId, SkillId } from '../contracts/core/ids.js';
import type { CommanderSlot } from '../contracts/core/state.js';
import { ATTRS } from '../contracts/core/primitives.js';
import { defs, t } from '../app/bootstrap.js';
import { Hud } from './Hud.js';

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
  // 戰報預設收起（D15）：七場自動戰鬥第一輪好看、第五輪是阻礙。
  // 玩家真正在讀的是「軍勢剩幾成」與「下一關是誰」。
  const [showLog, setShowLog] = useState(false);
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
          每一關打完都可以收兵，帶著已到手的獎勵走；
          <b>輸了不會夢醒，但已到手的獎勵只剩一半</b>。
        </p>
        <Hud s={s} />

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
      <Hud s={s} />

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
          <h2>
            {`上一關的戰報（${st.log.length} 條）`}
            <button onClick={() => { setShowLog((v) => !v); }} style={{ marginLeft: 8 }}>
              {showLog ? '收起' : '展開'}
            </button>
          </h2>
          {!showLog ? null : (
            <div style={{ maxHeight: 300, overflowY: 'auto', fontSize: 13 }}>
              {st.log.map((e, i) => (
                <div key={`${e.turn}-${i}`}>
                  <div className="mono">
                    {`R${e.turn} `}
                    {e.actor === 'enemy' ? '敵 ' : (e.actor === 'commander' ? '令 ' : '我 ')}
                    {e.actorKey === null ? '' : `${t(e.actorKey)} `}
                    {e.skillKey === null ? '' : `〈${t(e.skillKey)}〉`}
                    {e.kind === null ? '' : ` ${t(`skillKind.${e.kind}`)}`}
                    {` ${e.amount}`}
                    {e.why.length === 0 ? '' : `　（${e.why.join('・')}）`}
                    {`　軍勢 ${e.troopsAfter}　敵 ${e.enemyAfter}`}
                  </div>
                  {/* 完整歸因只有〈慧眼識人〉看得到（33 §7.1）。沒有它時是空陣列。 */}
                  {e.trace.length === 0 ? null : (
                    <div className="sub mono" style={{ paddingLeft: 24, fontSize: 12 }}>
                      {e.trace.map((x, j) => (
                        <span key={`${x.sourceId}-${j}`} style={{ marginRight: 10 }}>
                          {`${x.sourceId} ${x.op} ${x.value}`}
                          {x.applied ? '' : '（未生效）'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
          {/*
            往前的代價也要寫在按鈕旁邊（D14 的原則，兩個方向都適用）。
            「輸了會怎樣」與「走了放棄什麼」是同一個決定的兩半。
          */}
          <p className="warn">
            {`打輸了不會夢醒 —— 但已保住的 ${banked} 功績會剩一半（${Math.floor(banked / 2)}）。`}
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
          掃蕩（D15）：一路打到「開始需要想」為止。
          它不繞過任何規則 —— 每一關都真的跑一次，只是不停下來問你。
          按鈕只在戰力明顯超過時出現，所以它的消失本身就是一個訊號。
        */}
        {done || !s.canSweep() ? null : (
          <button onClick={() => { s.sweep(); bump(); }}>
            掃蕩（打到吃緊為止）
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
