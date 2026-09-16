import type { TraitId } from '../contracts/core/ids.js';

// Trait art uses stable content IDs so translated names do not affect the asset.
export const TRAIT_ILLUSTRATIONS: Readonly<Record<string, string>> = {
  'danshi': 'danshi',
  'chenyi': 'chenyi',
  'liande': 'liande',
  'jimin': 'jimin',
  'linzhen': 'linzhen',
  'zhechong': 'zhechong',
  'liaodi': 'liaodi',
  'wanrendi': 'wanrendi',
  'jingwei': 'jingwei',
  'gangbi': 'gangbi',
  'trigger-backwater': 'trigger-backwater',
  'trigger-breakline': 'trigger-breakline',
  'trigger-hunters': 'trigger-hunters',
  'trigger-fervor': 'trigger-fervor',
  'trigger-frugal': 'trigger-frugal',
  'trigger-aftershock': 'trigger-aftershock',
  'trigger-relief': 'trigger-relief',
  'trigger-laststand': 'trigger-laststand',
  'trigger-sighting': 'trigger-sighting',
  'trigger-exploit': 'trigger-exploit',
  'trigger-drill': 'trigger-drill',
  'trigger-supply': 'trigger-supply',
};

export function TraitArt({ id }: { id: TraitId }): React.ReactElement {
  return <img className="trait-art" src={'./art/ui/traits/' + TRAIT_ILLUSTRATIONS[String(id).split(':')[1]??''] + '-v1.png'} alt="" draggable={false} />;
}
