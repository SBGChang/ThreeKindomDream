// 作者層的型別骨架。
// 這一層用真實 Definition 型別標註，因此 `tsc` 就是內容的 Schema 驗證器
// （ARCHITECTURE §2.3）。這裡是**內容 ID 字面值唯一合法的位置**。
import type {
  DefByKind, DefHeader, DefinitionKind,
} from '../src/contracts/core/definitions.js';
import type { EffectDef, FuncType } from '../src/contracts/core/effects.js';
import type { L10nKey, PackId } from '../src/contracts/core/ids.js';

export type AnyDef = DefByKind[DefinitionKind];
export type EffectTableInput = Partial<Record<FuncType, Readonly<Record<number, EffectDef>>>>;

export interface AuthoredPack {
  readonly packId: PackId;
  readonly version: string;
  readonly requiredPacks: readonly PackId[];
  readonly loadOrder: number;
  readonly defs: readonly AnyDef[];
  readonly effects: EffectTableInput;
  readonly texts: Readonly<Record<string, string>>;
}

export interface AuthoredManifest {
  readonly runtimeVersion: string;
  readonly packs: readonly AuthoredPack[];
}

type Body<K extends DefinitionKind> = Omit<DefByKind[K], keyof DefHeader>;

/**
 * Definition 建構子。省掉 id/kind/schemaVersion/packId 四個欄位的重複。
 * 型別由 Body<K> 保證 —— 少一個欄位或打錯名字，tsc 當場失敗。
 */
export function defBuilder(packId: PackId) {
  return function make<K extends DefinitionKind>(
    kind: K, id: string, body: Body<K>,
  ): DefByKind[K] {
    return { id, kind, schemaVersion: 1, packId, ...body } as unknown as DefByKind[K];
  };
}

/** 文案表建構子。回傳的物件同時是 key 對照與字串來源。 */
export function textTable<T extends Record<string, string>>(t: T): T {
  return t;
}

export const asKey = (s: string): L10nKey => s as L10nKey;
