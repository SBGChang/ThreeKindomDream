// 瀏覽器側的 ContentRepository：用 Vite 的 glob import 讀產物。
// modules/ 永不讀檔 —— 平台差異收斂在這一層（02 §1）。
import type { ContentRepository } from '../data-runtime/loader.js';

const raw = import.meta.glob('../../content/**/*.json', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const table = new Map<string, string>();
for (const key of Object.keys(raw)) {
  const rel = key.replace(/^.*\/content\//, '');
  const text = raw[key];
  if (text !== undefined) table.set(rel, text);
}

export const browserRepository: ContentRepository = {
  read(path) {
    const v = table.get(path);
    if (v === undefined) {
      throw new Error(`內容檔不存在: ${path}（已載入 ${[...table.keys()].join(', ')}）`);
    }
    return v;
  },
};
