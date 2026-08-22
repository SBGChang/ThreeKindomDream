import type { DefinitionKind } from '../contracts/core/definitions.js';
import type { EffectDef, FuncType } from '../contracts/core/effects.js';
import { FUNC_TYPES } from '../contracts/core/effects.js';
import type { PackId } from '../contracts/core/ids.js';
import { createRegistry, type DefinitionRegistry } from './registry.js';
import { formatErrors, validateAll, type ValidationError } from './validate/index.js';

/** 平台層實作：從 bundle、磁碟或測試 fixture 讀產物。modules/ 永不讀檔。 */
export interface ContentRepository {
  read(path: string): string;
}

interface ManifestPack {
  readonly packId: PackId;
  readonly version: string;
  readonly requiredPacks: readonly PackId[];
  readonly loadOrder: number;
  readonly dir: string;
  readonly defCount: number;
}
interface Manifest {
  readonly runtimeVersion: string;
  readonly packs: readonly ManifestPack[];
}

export type LoadResult =
  | { readonly ok: true; readonly registry: DefinitionRegistry }
  | { readonly ok: false; readonly errors: readonly ValidationError[]; readonly report: string };

const err = (
  layer: ValidationError['layer'], file: string, path: string,
  id: string | null, message: string, hint: string | null = null,
): ValidationError => ({ layer, file, jsonPath: path, definitionId: id, message, hint });

export function loadContent(repo: ContentRepository): LoadResult {
  const errors: ValidationError[] = [];
  const manifest = JSON.parse(repo.read('manifest.json')) as Manifest;
  const packs = [...manifest.packs].sort((a, b) => a.loadOrder - b.loadOrder);

  // ── Pack 相依與載入順序（02 §2.1）─────────────────
  const versionOf = new Map(packs.map((p) => [p.packId, p.version]));
  for (const p of packs) {
    for (const req of p.requiredPacks) {
      if (!versionOf.has(req)) {
        errors.push(err('reference', 'manifest.json', p.packId, null,
          `相依的 pack 未安裝: ${req}`, `安裝 ${req} 或移除 ${p.packId}`));
      }
      const reqPack = packs.find((x) => x.packId === req);
      if (reqPack !== undefined && reqPack.loadOrder >= p.loadOrder) {
        errors.push(err('rule', 'manifest.json', p.packId, null,
          `載入順序錯誤：${p.packId} 相依 ${req}，但 loadOrder 未排在其後`));
      }
    }
  }

  // ── 讀取並合併 ───────────────────────────────────
  const byKind = new Map<DefinitionKind, Record<string, unknown>[]>();
  const seenIds = new Map<string, PackId>();
  const effects = new Map<FuncType, Map<number, EffectDef>>();
  const texts = new Map<string, string>();

  for (const p of packs) {
    const defs = JSON.parse(repo.read(`${p.dir}/defs.json`)) as Record<string, unknown>[];
    if (defs.length !== p.defCount) {
      errors.push(err('schema', `${p.dir}/defs.json`, 'length', null,
        `manifest 宣告 ${p.defCount} 筆，實際 ${defs.length} 筆`,
        '重新執行 npm run content:build'));
    }
    for (const d of defs) {
      const id = String(d['id']);
      const owner = seenIds.get(id);
      if (owner !== undefined) {
        errors.push(err('rule', `${p.dir}/defs.json`, id, id,
          `Definition ID 跨 pack 重複：${owner} 與 ${p.packId} 都定義了它`));
        continue;
      }
      seenIds.set(id, p.packId);
      const kind = String(d['kind']) as DefinitionKind;
      const list = byKind.get(kind) ?? [];
      list.push(d);
      byKind.set(kind, list);
    }

    const rawEffects = JSON.parse(repo.read(`${p.dir}/effects.json`)) as
      Record<string, Record<string, EffectDef>>;
    for (const ft of Object.keys(rawEffects)) {
      if (!(FUNC_TYPES as readonly string[]).includes(ft)) {
        errors.push(err('reference', `${p.dir}/effects.json`, ft, null,
          `未知 FuncType: ${ft}`, `合法值：${FUNC_TYPES.join(', ')}`));
        continue;
      }
      const table = rawEffects[ft] ?? {};
      const target = effects.get(ft as FuncType) ?? new Map<number, EffectDef>();
      for (const rid of Object.keys(table)) {
        const num = Number(rid);
        const def = table[rid];
        if (def === undefined) continue;
        if (target.has(num)) {
          errors.push(err('rule', `${p.dir}/effects.json`, `${ft}.${rid}`, null,
            `效果 referId 跨 pack 重複: ${ft}#${rid}`));
          continue;
        }
        target.set(num, def);
      }
      effects.set(ft as FuncType, target);
    }

    const rawTexts = JSON.parse(repo.read(`${p.dir}/texts.json`)) as Record<string, string>;
    for (const key of Object.keys(rawTexts)) {
      const value = rawTexts[key];
      if (value === undefined) continue;
      if (texts.has(key)) {
        errors.push(err('rule', `${p.dir}/texts.json`, key, null,
          `l10n key 跨 pack 重複: ${key}`));
        continue;
      }
      texts.set(key, value);
    }
  }

  for (const ft of FUNC_TYPES) if (!effects.has(ft)) effects.set(ft, new Map());

  errors.push(...validateAll({
    byKind, effects, textKeys: new Set(texts.keys()), bodies: texts,
  }));

  if (errors.length > 0) return { ok: false, errors, report: formatErrors(errors) };

  return {
    ok: true,
    registry: createRegistry({
      byKind,
      effects,
      texts,
      packs: packs.map((p) => p.packId),
      hash: manifest.runtimeVersion,
    }),
  };
}
