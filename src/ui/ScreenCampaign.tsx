import { useEffect, useState } from 'react';
import type { Session } from '../app/session.js';
import type { NotableId, SkillId } from '../contracts/core/ids.js';
import type { CommanderSlot } from '../contracts/core/state.js';

import { ATTRS } from '../contracts/core/primitives.js';
import {
  defs, t,
} from '../app/bootstrap.js';


import { Hud } from './Hud.js';

interface Props {
  readonly onLearn: () => void;
  readonly s: Session;
  readonly bump: () => void;
  /** 交給 App 去播 —— 戰敗時本畫面會當場卸載，見 BattleTheater 的 ReplayData。 */
  readonly onDepart: () => void;
}

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

export function ScreenCampaign({ s, bump, onDepart, onLearn }: Props): React.ReactElement {
  const st = s.current.campaign;
  const chapter = defs.reader('chapter').get(String(s.current.progress.chapterId));
  const learned = s.current.abilities.skills;
  const eligible = s.eligibleCommanders();

  const [picked, setPicked] = useState<readonly SkillId[]>(() => st?.loadout?.skills ?? learned.slice(0, 3));
  const [cmd, setCmd] = useState<readonly CommanderSlot[]>(() => st?.loadout?.commanders ?? eligible.slice(0, 3)
    .flatMap((id) => {
      const opt = s.commanderSkills(id).at(-1);
      return opt === undefined ? [] : [{ notableId: id, skillId: opt }];
    }));
  useEffect(() => {
    if (s.campaignState()?.phase === 'configuring') {
      s.rememberCampaign({ skills: picked, commanders: cmd });
      bump();
    }
  }, [s, picked, cmd, bump]);

  useEffect(() => { if (s.campaignState()?.phase !== 'configuring' && s.campaignState() !== null) onDepart(); }, [s, onDepart]);

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
        <div className="page-heading"><div><span className="eyebrow">戰前整備 · 配置確認後出陣</span><h1>{t(chapter.titleKey)}</h1></div><button className="primary" onClick={onLearn}>戰前修習 · {s.learningExp} 點 →</button></div>
        <p className="sub">
          選好三招與同行指揮，軍隊將自動迎戰七關。
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
                  aria-pressed={picked.includes(id)}
                  onClick={() => { toggleSkill(id); }}
                >
                  {skillName(id)} <span className="level-label">Lv.{s.abilityLevel(id)}</span>
                </button>
              ))}
            </div>
          )}
        <p className="sub">
          每回合至少施放一招，另有 60% 機會施放第二招、30% 機會施放第三招。
          招式隨機選用，選擇能互相配合的組合。
        </p>

        <h2>{`指揮（最多 3 位 · 已選 ${cmd.length}）`}</h2>
        <div className="row">
          {eligible.map((id) => (
            <button
              key={String(id)}
              className={cmd.some((c) => c.notableId === id) ? 'sel' : ''}
              aria-pressed={cmd.some((c) => c.notableId === id)}
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
                  aria-pressed={sid === c.skillId}
                  onClick={() => { setCommanderSkill(c.notableId, sid); }}
                >
                  {skillName(sid)}
                </button>
              ))}
            </p>
          );
        })}
        <p className="sub">
          指揮會在戰鬥中傳令支援。好感越高，出手越頻繁；提升星階可解放更多指揮招式。
        </p>

        <button
          className="primary"
          onClick={() => { s.configureCampaign({ skills: picked, commanders: cmd }); onDepart(); bump(); }}
        >
          確認配置，出陣 →
        </button>
      </>
    );
  }

  return <p>全軍出陣……</p>;
}
