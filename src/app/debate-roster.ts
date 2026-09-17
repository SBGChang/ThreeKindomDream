import core from '../../content/core/defs.json';
import wei from '../../content/wei/defs.json';
import shu from '../../content/shu/defs.json';
import wu from '../../content/wu/defs.json';
/** Use the authored officer intellect/politics; debate profiles never overwrite campaign stats. */
export const DEBATE_OFFICER_STATS:Record<string,{int:number;pol:number}>=Object.fromEntries(
 ([...core,...wei,...shu,...wu] as unknown as {id:string;notableId?:string;abilities?:{attrs?:{int?:number;pol?:number}}}[])
 .filter(d=>d.notableId===d.id&&d.abilities?.attrs?.int!==undefined)
 .map(d=>[d.id.split(':')[1]!,{int:d.abilities!.attrs!.int!,pol:d.abilities!.attrs!.pol??50}])
);
