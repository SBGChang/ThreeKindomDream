import type { DefinitionKind } from '../../contracts/core/definitions.js';
import type { EffectDef, FuncType } from '../../contracts/core/effects.js';

export interface ValidationError {
  readonly layer: 'schema' | 'reference' | 'rule';
  readonly file: string;
  readonly jsonPath: string;
  readonly definitionId: string | null;
  readonly message: string;
  readonly hint: string | null;
}

export type Rec = Record<string, unknown>;

export interface ValidateInput {
  readonly byKind: ReadonlyMap<DefinitionKind, readonly Rec[]>;
  readonly effects: ReadonlyMap<FuncType, ReadonlyMap<number, EffectDef>>;
  readonly textKeys: ReadonlySet<string>;
  /** l10n key → 實際字串。用於檢查模板佔位符與 paramSlots 雙向相等。 */
  readonly bodies: ReadonlyMap<string, string>;
}

/** 每個規則檔收到的工具集。集中在此，避免各檔重複實作 coercion。 */
export interface Ctx {
  readonly input: ValidateInput;
  push(
    layer: ValidationError['layer'], file: string, path: string,
    id: string | null, message: string, hint?: string,
  ): void;
  rows(kind: DefinitionKind): readonly Rec[];
  ids(kind: DefinitionKind): ReadonlySet<string>;
  s(v: unknown): string;
  n(v: unknown): number;
  arr(v: unknown): readonly Rec[];
  list(v: unknown): readonly unknown[];
  text(key: unknown, file: string, path: string, id: string | null): void;
  effect(ft: unknown, referId: unknown, file: string, path: string, id: string): void;
}

export function createCtx(input: ValidateInput, out: ValidationError[]): Ctx {
  const idCache = new Map<DefinitionKind, Set<string>>();
  const s = (v: unknown): string => String(v);
  const n = (v: unknown): number => Number(v);
  const rows = (kind: DefinitionKind): readonly Rec[] => input.byKind.get(kind) ?? [];

  const ctx: Ctx = {
    input,
    push(layer, file, path, id, message, hint) {
      out.push({ layer, file, jsonPath: path, definitionId: id, message, hint: hint ?? null });
    },
    rows,
    ids(kind) {
      const cached = idCache.get(kind);
      if (cached !== undefined) return cached;
      const set = new Set(rows(kind).map((d) => s(d['id'])));
      idCache.set(kind, set);
      return set;
    },
    s,
    n,
    arr: (v) => (Array.isArray(v) ? (v as Rec[]) : []),
    list: (v) => (Array.isArray(v) ? (v as unknown[]) : []),
    text(key, file, path, id) {
      if (!input.textKeys.has(s(key))) {
        ctx.push('reference', file, path, id, `l10n key 不存在: ${s(key)}`,
          '在 content-source/l10n/zh-TW.ts 補上此 key');
      }
    },
    effect(ft, referId, file, path, id) {
      const table = input.effects.get(s(ft) as FuncType);
      if (table === undefined) {
        ctx.push('reference', file, path, id, `未知 FuncType: ${s(ft)}`);
        return;
      }
      if (!table.has(n(referId))) {
        ctx.push('reference', file, path, id, `效果不存在: ${s(ft)}#${n(referId)}`);
      }
    },
  };
  return ctx;
}
