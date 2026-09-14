import type { Ctx, Rec } from './types.js';

export function validateStory(c: Ctx): void {
  const checkBeats = (source: Rec, id: string) => {
    if (source['beats'] === undefined) return;
    if (!Array.isArray(source['beats']) || !source['beats'].length) c.push('schema','story','beats',id,'對話至少需要一段');
    for (const beat of c.arr(source['beats'])) {
      if (beat['speaker'] !== null && (typeof beat['speaker'] !== 'string' || !beat['speaker'].trim())) c.push('schema','story','speaker',id,'旁白須為 null，台詞須有說話者');
      c.text(beat['textKey'],'story','beat.textKey',id);
    }
  };
  const nodes = new Map<string, { row: Rec; chapter: string }>();
  const milestones = new Set<string>();
  const scenes = new Set<string>();
  const chapters = new Map(c.rows('chapter').map(d => [c.s(d['chapterId']), d]));
  const storyOwners = new Set<string>();
  for (const d of c.rows('storyChapter')) {
    const id = c.s(d['id']), chapter = c.s(d['chapterId']);
    if (!chapters.has(chapter)) c.push('reference', 'story', 'chapterId', id, '主線章節不存在');
    if (storyOwners.has(chapter)) c.push('rule', 'story', 'chapterId', id, '每章只能一份主線');
    storyOwners.add(chapter);
    const turns = new Set<number>();
    for (const node of c.arr(d['nodes'])) {
      const nid = c.s(node['id']), at = c.n(node['turn']);
      if (!nid || nodes.has(nid)) c.push('rule', 'story', 'nodes.id', id, '主線節點 ID 必須唯一');
      nodes.set(nid, { row: node, chapter });
      if (!Number.isInteger(at) || at < 1 || at > c.n(chapters.get(chapter)?.['length']) || turns.has(at))
        c.push('rule', 'story', 'nodes.turn', id, '主線回合必須在章內且不重複');
      turns.add(at);
      c.text(node['titleKey'], 'story', 'node.titleKey', id);
      c.text(node['bodyKey'], 'story', 'node.bodyKey', id);
      checkBeats(node, id);
      if (node['responseTiming'] !== undefined && !['immediate','chapterEnd'].includes(c.s(node['responseTiming']))) c.push('schema','story','responseTiming',id,'回應時間無效');
      const options = c.arr(node['options']);
      if (options.length < 2 || new Set(options.map(o => c.s(o['id']))).size !== options.length)
        c.push('rule', 'story', 'options', id, '主線至少兩個不同選項');
      for (const o of options) {
        c.text(o['labelKey'], 'story', 'option.labelKey', id);
        c.text(o['consequenceKey'], 'story', 'option.consequenceKey', id);
      }
    }
    const campaign = c.rows('campaign').find(x => x['chapterId'] === chapter);
    for (const m of c.arr(d['milestones'])) {
      const mid = c.s(m['id']);
      if (!mid || milestones.has(mid)) c.push('rule', 'story', 'milestones.id', id, '里程碑 ID 必須唯一');
      milestones.add(mid);
      if (!Number.isInteger(m['minCleared']) || c.n(m['minCleared']) < 1 || c.n(m['minCleared']) > c.list(campaign?.['stages']).length)
        c.push('rule', 'story', 'minCleared', id, '改命門檻必須是戰役內可抵達的關卡');
      c.text(m['hintKey'], 'story', 'hintKey', id);
    }
    const afters = c.arr(d['aftermaths']);
    if (!afters.length || c.list(afters.at(-1)?.['requirements']).length !== 0)
      c.push('rule', 'story', 'aftermaths', id, '章末最後一筆必須是無條件場景');
    for (const s of [d['opening'], ...afters.map(x => x['scene']), ...c.arr(d['milestones']).map(x => x['scene']), ...c.arr(d['nodes']).flatMap(n => c.arr(n['options']).flatMap(o => o['response'] ? [o['response']] : []))]) {
      if (!s || typeof s !== 'object') { c.push('schema', 'story', 'scene', id, '場景格式不符'); continue; }
      const scene = s as Rec, sid = c.s(scene['id']);
      if (!sid || scenes.has(sid)) c.push('rule', 'story', 'scene.id', id, '場景 ID 必須唯一');
      scenes.add(sid);
      c.text(scene['titleKey'], 'story', 'scene.titleKey', id);
      c.text(scene['bodyKey'], 'story', 'scene.bodyKey', id);
      checkBeats(scene, id);
      if (scene['teachings'] !== undefined && !Array.isArray(scene['teachings'])) c.push('schema', 'story', 'teachings', id, '教學獎勵必須為陣列');
      for (const lesson of c.arr(scene['teachings'])) {
        if (lesson['skill'] === null && lesson['trait'] === null) c.push('schema', 'story', 'teachings', id, '教學獎勵不可為空');
        for (const kind of ['skill', 'trait']) {
          if (lesson[kind] !== null && !c.rows(kind as 'skill' | 'trait').some(d => d[kind + 'Id'] === lesson[kind]))
            c.push('reference', 'story', 'teachings.' + kind, id, '教學能力不存在');
        }
      }
    }
    const variants = c.arr(d['battleVariants']);
    if (variants.length && c.list(variants.at(-1)?.['requirements']).length !== 0)
      c.push('rule', 'story', 'battleVariants', id, '戰役情境最後一筆必須無條件');
    for (const v of variants) {
      if (c.list(v['briefKeys']).length !== c.list(campaign?.['stages']).length)
        c.push('rule', 'story', 'briefKeys', id, '戰役情境數須與實際關卡數相同');
      for (const key of c.list(v['briefKeys'])) c.text(key, 'story', 'briefKeys', id);
    }
  }
  const check = (reqs: unknown, id: string): void => {
    if (!Array.isArray(reqs)) { c.push('schema', 'story', 'requirements', id, '主線條件須為陣列'); return; }
    for (const r of c.arr(reqs)) {
      if (r['kind'] === 'choice') {
        const node = nodes.get(c.s(r['node']));
        if (!node || !c.arr(node.row['options']).some(o => o['id'] === r['option']))
          c.push('reference', 'story', 'requirements', id, `主線選項不存在: ${c.s(r['node'])}/${c.s(r['option'])}`);
      } else if (r['kind'] === 'milestone') {
        if (!milestones.has(c.s(r['id']))) c.push('reference', 'story', 'requirements', id, '里程碑不存在');
      } else c.push('schema', 'story', 'requirements.kind', id, '未知主線條件');
    }
  };
  for (const d of c.rows('storyChapter')) {
    for (const row of [...c.arr(d['milestones']), ...c.arr(d['aftermaths']), ...c.arr(d['battleVariants'])])
      check(row['requirements'], c.s(d['id']));
  }
  for (const ending of c.rows('ending')) if (ending['storyRequirements'] !== undefined)
    check(ending['storyRequirements'], c.s(ending['id']));
}
