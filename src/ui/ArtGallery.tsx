import { CharacterArt, CHARACTERS } from './CharacterArt.js';
import { OfficerPortrait } from './GameFrame.js';
export function ArtGallery():React.ReactElement {
 return <div className="art-gallery"><h1>三國夢 · 美術素材覽</h1><p>同一造型的頭像與半身立繪</p><div className="art-gallery-grid">{Object.keys(CHARACTERS).filter(n=>n!=='敵軍').map(name=><figure key={name}><CharacterArt name={name}/><OfficerPortrait name={name}/><figcaption>{name}</figcaption></figure>)}</div><h2>介面素材</h2><div className="art-gallery-ui"><img src="./art/ui/ui-paper.png" alt="木框紙面"/><img src="./art/ui/ui-button.png" alt="銅邊深紅按鈕"/></div><h2>背景</h2><div className="art-gallery-backgrounds">{['destiny','hall','drill','study','field','battle-1','battle-2','battle-3','battle-4'].map(id=><figure key={id}><img src={`./art/backgrounds/bg-${id}.png`} alt={id}/><figcaption>{id}</figcaption></figure>)}</div></div>;
}
