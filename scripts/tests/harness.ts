import { compose, type Wiring } from '../../src/app/composition.js';
import { Session } from '../../src/app/session.js';
import { seed as mkSeed } from '../../src/contracts/core/ids.js';
import type { MetaState } from '../../src/contracts/core/state.js';
import { loadContent } from '../../src/data-runtime/loader.js';
import type { DefinitionRegistry } from '../../src/data-runtime/registry.js';
import { emptyDraft, emptyMeta } from '../../src/modules/dream-entry.js';
import { diskRepository } from '../../src/platform/content-repository.js';

const loaded = loadContent(diskRepository());
if (!loaded.ok) { console.error(loaded.report); process.exit(1); }

export const defs: DefinitionRegistry = loaded.registry;
export const wiring: Wiring = compose(defs);
export const META: MetaState = emptyMeta();
export const newSession = (s: number): Session =>
  Session.start(wiring, META, emptyDraft(META, defs), mkSeed(s));
