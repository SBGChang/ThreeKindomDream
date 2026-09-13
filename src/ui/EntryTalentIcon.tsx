const IDS=['photographic','brawn','diligence','sudden-fame','noble-house','great-clan','precocious','wide-circle','usurper','destined','keen-eye'];
export function EntryTalentIcon({id}:{id:string}):React.ReactElement{
 const index=IDS.indexOf(id.slice(id.indexOf(':')+1)),i=index<0?11:index;
 return <span aria-hidden="true" className="entry-talent-icon" style={{backgroundPosition:((i%4)/3*100)+'% '+(Math.floor(i/4)/2*100)+'%'}}/>;
}
