import { RealmIcon } from './RealmArt.js';
const standalone: Record<string, string> = { '行軍簿': 'ledger', '行军簿': 'ledger', '乾糧袋': 'rations', '干粮袋': 'rations' };
export function ItemArt({ name, className = 'market-relic' }: { name: string; className?: string }): React.ReactElement {
  const asset = standalone[name];
  return asset
    ? <img className={className + ' realm-icon'} src={'./art/items/' + asset + '-v1.png'} alt={name} draggable={false}/>
    : <RealmIcon relic name={name} className={className}/>;
}
