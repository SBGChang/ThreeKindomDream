import { useState } from 'react';
import type { MetaState, DreamEntryConfig } from '../contracts/core/state.js';
import type { AptitudeGrade, Attr } from '../contracts/core/primitives.js';
import { APTITUDE_GRADES, ATTRS } from '../contracts/core/primitives.js';
import type { ItemId, NotableId, TalentId } from '../contracts/core/ids.js';
import {
  defs, designateQuota, draftCost, draftLimits, emptyDraft, t, validateDraft,
} from '../app/bootstrap.js';

interface Props {
  readonly meta: MetaState;
  readonly onEnter: (config: DreamEntryConfig) => void;
  readonly onBack: () => void;
}

const has = <T,>(xs: readonly T[], x: T): boolean => xs.some((y) => String(y) === String(x));
const toggle = <T,>(xs: readonly T[], x: T, cap: number): readonly T[] => {
  if (has(xs, x)) return xs.filter((y) => String(y) !== String(x));
  return xs.length >= cap ? xs : [...xs, x];
};

/**
 * ⑭ 入夢配置 —— **Meta 與 Run 的唯一橋樑**（14 §1）。
 *
 * ── 為什麼這個畫面是補上來的 ★★ ─────────────────────
 * 在它出現之前，`startRun` 直接吃 `emptyDraft`，於是天命商店賣的四樣東西
 * **全部沒有出口**：
 *
 *   資質配點  買了不能花    → 四維的天花板永遠停在預設的 D（75）
 *   天賦      解放了不能帶  → 十一個天賦一個都上不了場
 *   攜帶道具  `carriedItems` 寫死 `[]`
 *   指定玩伴  `designatedCompanions` 寫死 `[]`，全部由 RNG 派
 *
 * 那正是「買了東西卻沒有變強」的真正來源 —— 比任何數值都嚴重，
 * 因為它讓整條跨輪成長在【介面層】斷掉，而數值層一直是對的。
 *
 * 攜帶道具那一條最要緊：高階道具 `perRunCap = 1`，那唯一一次是
 * 「首次獲得」而不是重複 —— **不帶進場就永遠拿不到碎片**（23 §5）。
 * 沒有這個畫面，道具的跨輪成長是一個閉環外的孤島。
 *
 * ── 草稿與確認分離（14 §4.2）★ ──────────────────────
 * 這裡只編輯**草稿**；超支不自動修正，而是把錯誤列出來、把「入夢」停用。
 * 自動修正會讓玩家看不懂自己剛剛失去了什麼（14 §3.1）。
 */
export function ScreenEntry({ meta, onEnter, onBack }: Props): React.ReactElement {
  const [draft, setDraft] = useState<DreamEntryConfig>(() => emptyDraft(meta, defs));
  const lim = draftLimits(meta, defs);
  const c = draftCost(draft, meta, defs);
  const errors = validateDraft(draft, meta, defs);
  const aptCost = defs.single('aptitudeCost');
  const grades = defs.reader('aptitudeGrade').all();
  const capOf = (a: Attr): number =>
    grades.find((g) => g.grade === draft.aptitudes[a])?.attrCap ?? 0;

  const setApt = (a: Attr, g: AptitudeGrade): void => {
    setDraft((d) => ({ ...d, aptitudes: { ...d.aptitudes, [a]: g } }));
  };

  const quota = designateQuota(draft, defs);

  return (
    <>
      <h1>入夢</h1>
      <p className="sub">
        天命買到的東西<b>在這裡分配</b>。這一輪的四維天花板、帶哪些天賦、
        帶哪幾件道具、指定誰當玩伴 —— 全部只在入夢這一刻決定，夢裡改不了。
      </p>

      {/* ── 資質：它同時是產量倍率與【天花板】（14 §2.1.1）── */}
      <h2>{`資質　已用 ${c.aptitudePointsUsed} / ${lim.aptitudePoints} 點`}</h2>
      <p className="sub">
        資質決定兩件事：鍛鍊的<b>產量倍率</b>，以及那一維<b>這一輪的上限</b>。
        砍低一維可以退回點數 —— 想把一維推到 S，就得讓另外三維當廢材。
      </p>
      <table>
        <thead>
          <tr>
            <th>維</th><th>資質</th><th className="n">本輪上限</th>
            <th className="n">累計點數</th><th>可選（受天命解放限制）</th>
          </tr>
        </thead>
        <tbody>
          {ATTRS.map((a) => (
            <tr key={a}>
              <td><b>{t(`attr.${a}.short`)}</b></td>
              <td className="mono"><b>{draft.aptitudes[a]}</b></td>
              <td className="n mono"><b>{capOf(a)}</b></td>
              <td className="n mono">{aptCost.cumulativeCost[draft.aptitudes[a]] ?? 0}</td>
              <td>
                <div className="row">
                  {APTITUDE_GRADES.map((g) => {
                    const overCap = APTITUDE_GRADES.indexOf(g)
                      > APTITUDE_GRADES.indexOf(lim.aptitudeCaps[a]);
                    return (
                      <button
                        key={g}
                        className={draft.aptitudes[a] === g ? 'sel' : ''}
                        disabled={overCap}
                        onClick={() => { setApt(a, g); }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 天賦 ── */}
      <h2>{`天賦　已用 ${c.talentPointsUsed} / ${lim.talentPoints} 點`}</h2>
      {lim.unlockedTalents.length === 0
        ? <p className="warn">還沒有解放任何天賦 —— 回天命商店的〈天賦解放〉。</p>
        : (
          <table>
            <tbody>
              {lim.unlockedTalents.map((id: TalentId) => {
                const d = defs.reader('talent').get(String(id));
                const on = has(draft.talents, id);
                return (
                  <tr key={String(id)}>
                    <td><b>{t(d.nameKey)}</b></td>
                    <td className="n mono">{`${d.cost} 點`}</td>
                    <td style={{ maxWidth: 380 }} className="sub">{t(d.descKey)}</td>
                    <td>
                      <button
                        className={on ? 'sel' : ''}
                        onClick={() => {
                          setDraft((x) => ({
                            ...x,
                            talents: on
                              ? x.talents.filter((y) => String(y) !== String(id))
                              : [...x.talents, id],
                          }));
                        }}
                      >
                        {on ? '已帶' : '帶上'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      {/* ── 攜帶道具（23 §5）★ 高階道具不帶就永遠拿不到碎片 ── */}
      <h2>{`攜帶道具　${draft.carriedItems.length} / ${lim.carrySlots} 格`}</h2>
      <p className="sub">
        高階道具<b>一輪最多獲得一次</b>，而那一次是「首次獲得」不是重複 ——
        <b>不帶進場就永遠拿不到它的碎片</b>。攜帶格的取捨只在高階道具上存在。
      </p>
      {lim.carriableItems.length === 0
        ? <p className="warn">圖鑑還是空的 —— 道具要先在夢裡拿到一次，才能帶進下一場夢。</p>
        : (
          <div className="row">
            {lim.carriableItems.map((id: ItemId) => {
              const d = defs.reader('item').get(String(id));
              const on = has(draft.carriedItems, id);
              return (
                <button
                  key={String(id)}
                  className={on ? 'sel' : ''}
                  title={t(d.descKey)}
                  onClick={() => {
                    setDraft((x) => ({
                      ...x,
                      carriedItems: toggle(x.carriedItems, id, lim.carrySlots),
                    }));
                  }}
                >
                  {`◆${t(d.nameKey)}`}
                </button>
              );
            })}
          </div>
        )}

      {/* ── 指定玩伴 ── */}
      <h2>{`指定玩伴　${draft.designatedCompanions.length} / ${quota} 位`}</h2>
      <p className="sub">
        {quota === 0
          ? '皇甫嵩替你指派三位。要自己挑，得先帶上〈世家門閥〉那一系的天賦。'
          : '其餘的仍由皇甫嵩指派。'}
      </p>
      {quota === 0 ? null : (
        <div className="row">
          {lim.designatable.map((id: NotableId) => {
            const d = defs.reader('notable').get(String(id));
            const on = has(draft.designatedCompanions, id);
            return (
              <button
                key={String(id)}
                className={on ? 'sel' : ''}
                onClick={() => {
                  setDraft((x) => ({
                    ...x,
                    designatedCompanions: toggle(x.designatedCompanions, id, quota),
                  }));
                }}
              >
                {t(d.nameKey)}
              </button>
            );
          })}
        </div>
      )}

      {/*
        超支【不自動修正】（14 §3.1）：自動砍掉一項會讓玩家看不懂
        自己剛剛失去了什麼。列出來、把入夢停用，讓他自己處理。
      */}
      {errors.length === 0 ? null : (
        <div className="card warn" style={{ marginTop: 12 }}>
          {errors.map((e) => <div key={e}>{e}</div>)}
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="primary"
          disabled={errors.length > 0}
          onClick={() => { onEnter(draft); }}
        >
          入夢 →
        </button>
        <button onClick={onBack}>回天命</button>
      </div>
    </>
  );
}
