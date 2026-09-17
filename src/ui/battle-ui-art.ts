/** Shared by preparation and combat: a tactic keeps its illustration on departure. */
const named: Readonly<Record<string,string>> = {
 '突陣':'charge-v4','衝鋒':'charge-v4','陷陣':'breakthrough-v4','萬人敵':'mighty-v4',
 '火計':'fire-v5','水淹':'water-v5','連環計':'chain-v5','撫民':'soothe-v8',
 '屯田':'farm-v8','王佐':'advisor-v8','號令':'command-v8','亂辭':'discord-v8',
 '鼓舞':'inspire-v8','節制':'discipline-v8','治戎':'marshal-v8','騎射':'mounted-v1',
};
const mechanics: Readonly<Record<string,string>> = {
 pincer:'chain-v5',cavalry:'charge-v4',longshot:'command-v8',infighting:'discord-v8',
 misreport:'advisor-v8',fire:'fire-v5',inspire:'inspire-v8',shield:'discipline-v8',
 reform:'marshal-v8',toarcher:'command-v8',toinfantry:'discipline-v8',pursue:'breakthrough-v4',
 mounted:'mounted-v1',volley:'command-v8',water:'water-v5',rocks:'mighty-v4',
 taunt:'discord-v8',ambush:'advisor-v8',reinforce:'soothe-v8',divide:'chain-v5',
 turncoat:'advisor-v8',lure:'discord-v8',sweep:'mighty-v4',crossbow:'command-v8',thunder:'mighty-v4',
};
export function battleSkillArt(name:string,mechanic?:string):string {
 const illustration=named[name]??(mechanic?mechanics[mechanic]:undefined)??'book-v5';
 return `./art/ui/campaign/tactic-${illustration}.png`;
}
