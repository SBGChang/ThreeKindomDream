import type { Session } from '../app/session.js';
import { defs, t } from '../app/bootstrap.js';
import { CharacterArt } from './CharacterArt.js';
import { RealmIcon } from './RealmArt.js';
import './wave-briefing.css';

interface Props { s: Session; wave: ReturnType<Session['stageRows']>[number]; onClose: () => void }
/** All figures use the same campaign preview data as the outer route. */
export function WaveBriefing({ s, wave, onClose }: Props): React.ReactElement {
  const name = wave.boss ? t(wave.boss.nameKey) : '敵軍';
  const duration = defs.single('battleRule').realtime.duration;
  return <div className="wave-briefing">
    <section className="wave-general" aria-label={name + '軍情'}>
      <div className="wave-general-art">{wave.boss || s.current.progress.chapter !== 1 ? <CharacterArt name={name} /> : <img src="./art/ui/campaign/enemy-squad-v1.png" alt="敵軍" />}</div>
      <h3>{name}</h3><p>{t(wave.brief)}</p>
    </section>
    <div className={'wave-facts' + (wave.unique ? ' has-loot' : '')}>
      <div className="wave-fact wave-troops"><img src="./art/ui/campaign/troops-icon-v1.png" alt="" /><span><b>敵軍兵力</b><strong>{s.campaignWaveTroops(wave.index).toLocaleString('zh-TW')}</strong></span></div>
      <div className="wave-fact wave-duration"><img src="./art/ui/campaign/hourglass-v1.png" alt="" /><span><b>全戰役交戰</b><strong>{duration}<small> 秒</small></strong></span></div>
      <div className="wave-fact wave-money"><RealmIcon name="currency" /><span><b>本關金錢</b><strong>{wave.salary}<small> 錢</small></strong><em>按擊退比例結算</em></span></div>
      {wave.unique && <div className="wave-fact wave-loot"><RealmIcon name="chest" /><span><b>特殊戰利品</b><strong>破陣獲得</strong></span></div>}
    </div>
    <div className="wave-notes"><p>擊退後接續下一波；{s.stageRows().length} 關後援軍持續抵達。</p><p>倒數僅計交戰時間；換波不補兵，軍糧持續回復。</p><p>完整破陣獲得成長與戰利品；戰敗獎勵減半。</p></div>
    <button className="wave-confirm" onClick={onClose}>確定</button>
  </div>;
}
