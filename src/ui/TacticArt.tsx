import type { SkillId } from '../contracts/core/ids.js';
import { defs, t } from '../app/bootstrap.js';
const illustrations: Readonly<Record<string, string>> = { '突陣': 'charge-v4', '陷陣': 'breakthrough-v4', '萬人敵': 'mighty-v4', '火計': 'fire-v5', '水淹': 'water-v5', '連環計': 'chain-v5', '撫民': 'soothe-v8', '屯田': 'farm-v8', '王佐': 'advisor-v8', '號令': 'command-v8', '亂辭': 'discord-v8', '鼓舞': 'inspire-v8', '節制': 'discipline-v8', '治戎': 'marshal-v8' };
export function TacticArt({ id }: { id: SkillId }): React.ReactElement {
  const skill = defs.reader('skill').get(String(id)), illustration = illustrations[t(skill.nameKey)];
  return illustration ? <img className="prep-tactic-art" src={'/art/ui/campaign/tactic-' + illustration + '.png'} alt="" /> : <span className="prep-tactic-fallback"><span className={'prep-skill-icon prep-attr-' + skill.action.actorAttr} aria-hidden="true" /></span>;
}
