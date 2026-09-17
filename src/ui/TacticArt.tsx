import type { SkillId } from '../contracts/core/ids.js';
import { defs, t } from '../app/bootstrap.js';
import {battleSkillArt} from './battle-ui-art.js';
export function TacticArt({ id }: { id: SkillId }): React.ReactElement {
  const skill = defs.reader('skill').get(String(id));
  return <img className="prep-tactic-art" src={battleSkillArt(t(skill.nameKey),skill.battleMechanic)} alt="" />;
}
