import { createHash } from 'node:crypto';
import { AUTHORED_MANIFEST } from '../../content-source/packs.js';
import type { AuthoredPack } from '../../content-source/authoring.js';
import { serializeDeterministic } from './serialize.js';

export interface CompiledFile {
  readonly path: string;
  readonly text: string;
}

export const packDirOf = (p: AuthoredPack): string => p.packId.replace('pack:', '');

const SEP = '\u0000';

export function compile(): { files: readonly CompiledFile[]; hash: string } {
  const files: CompiledFile[] = [];

  for (const pack of AUTHORED_MANIFEST.packs) {
    const dir = packDirOf(pack);
    files.push({ path: `${dir}/defs.json`, text: serializeDeterministic(pack.defs) });
    files.push({ path: `${dir}/effects.json`, text: serializeDeterministic(pack.effects) });
    files.push({ path: `${dir}/texts.json`, text: serializeDeterministic(pack.texts) });
  }

  const manifest = {
    runtimeVersion: AUTHORED_MANIFEST.runtimeVersion,
    packs: AUTHORED_MANIFEST.packs.map((p) => ({
      packId: p.packId,
      version: p.version,
      requiredPacks: p.requiredPacks,
      loadOrder: p.loadOrder,
      dir: packDirOf(p),
      defCount: p.defs.length,
    })),
  };
  files.push({ path: 'manifest.json', text: serializeDeterministic(manifest) });

  files.sort((a, b) => (a.path < b.path ? -1 : 1));
  const h = createHash('sha256');
  for (const f of files) h.update(f.path + SEP + f.text + SEP);
  return { files, hash: h.digest('hex').slice(0, 16) };
}
