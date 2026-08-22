import type { DefByKind, DefinitionKind } from '../contracts/core/definitions.js';
import type { EffectDef, FuncType } from '../contracts/core/effects.js';
import type { PackId } from '../contracts/core/ids.js';

export interface TypedReader<K extends DefinitionKind> {
  /** 查不到即 throw —— 引用完整性已由載入驗證保證（02 §4）。 */
  get(id: string): DefByKind[K];
  tryGet(id: string): DefByKind[K] | null;
  all(): readonly DefByKind[K][];
  allIds(): readonly string[];
  where(pred: (d: DefByKind[K]) => boolean): readonly DefByKind[K][];
}

export interface DefinitionRegistry {
  reader<K extends DefinitionKind>(kind: K): TypedReader<K>;
  /** 該 kind 必須恰好一筆，否則 throw。用於全域單例表，避免在 code 寫死 ID。 */
  single<K extends DefinitionKind>(kind: K): DefByKind[K];
  effect(funcType: FuncType, referId: number): EffectDef;
  text(key: string): string;
  hasText(key: string): boolean;
  allTextKeys(): readonly string[];
  installedPacks(): readonly PackId[];
  hasPack(id: PackId): boolean;
  contentHash(): string;
}

export interface RegistryInput {
  readonly byKind: ReadonlyMap<DefinitionKind, readonly Record<string, unknown>[]>;
  readonly effects: ReadonlyMap<FuncType, ReadonlyMap<number, EffectDef>>;
  readonly texts: ReadonlyMap<string, string>;
  readonly packs: readonly PackId[];
  readonly hash: string;
}

export function createRegistry(input: RegistryInput): DefinitionRegistry {
  // Registry 內部一律以 unknown 儲存，在 Reader 邊界一次性窄化。
  // 這是全專案唯一合法的型別窄化點：validateAll 已保證形狀，而
  // 一個泛型 Map 無法同時是 26 種 Definition。窄化集中在此，不外流。
  const indexed = new Map<DefinitionKind, Map<string, unknown>>();
  for (const [kind, list] of input.byKind) {
    const m = new Map<string, unknown>();
    for (const d of list) m.set(String(d['id']), d);
    indexed.set(kind, m);
  }

  const readerCache = new Map<DefinitionKind, unknown>();

  function reader<K extends DefinitionKind>(kind: K): TypedReader<K> {
    const cached = readerCache.get(kind);
    if (cached !== undefined) return cached as TypedReader<K>;
    const m = indexed.get(kind) ?? new Map<string, unknown>();
    const values = (): DefByKind[K][] => [...m.values()] as DefByKind[K][];
    const r: TypedReader<K> = {
      get(id) {
        const v = m.get(id);
        if (v === undefined) throw new Error(`Definition 不存在: kind=${kind} id=${id}`);
        return v as DefByKind[K];
      },
      tryGet(id) {
        const v = m.get(id);
        return v === undefined ? null : (v as DefByKind[K]);
      },
      all() { return values(); },
      allIds() { return [...m.keys()]; },
      where(pred) { return values().filter(pred); },
    };
    readerCache.set(kind, r);
    return r;
  }

  return {
    reader,
    single(kind) {
      const all = reader(kind).all();
      if (all.length !== 1) {
        throw new Error(`single(${kind}) 期望恰好一筆，實得 ${all.length} 筆`);
      }
      const v = all[0];
      if (v === undefined) throw new Error('unreachable');
      return v;
    },
    effect(funcType, referId) {
      const table = input.effects.get(funcType);
      if (table === undefined) throw new Error(`效果表不存在: ${funcType}`);
      const def = table.get(referId);
      if (def === undefined) throw new Error(`效果不存在: ${funcType}#${referId}`);
      return def;
    },
    text(key) {
      const v = input.texts.get(key);
      return v === undefined ? `⟦MISSING ${key}⟧` : v;
    },
    hasText(key) { return input.texts.has(key); },
    allTextKeys() { return [...input.texts.keys()]; },
    installedPacks() { return input.packs; },
    hasPack(id) { return input.packs.includes(id); },
    contentHash() { return input.hash; },
  };
}
