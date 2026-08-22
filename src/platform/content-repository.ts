import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ContentRepository } from '../data-runtime/loader.js';

/** Node 側實作（腳本、模擬器、測試）。UI 側由 Vite 的 glob import 提供。 */
export function diskRepository(root?: string): ContentRepository {
  const base = root ?? join(resolve(import.meta.dirname, '..', '..'), 'content');
  return { read: (path) => readFileSync(join(base, path), 'utf8') };
}
