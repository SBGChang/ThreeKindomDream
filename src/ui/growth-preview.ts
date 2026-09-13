/** Project expected experience without mutating the session or consuming randomness. */
export function projectGrowth(value:number,exp:number,gain:number,cap:number,cost:(value:number)=>number):{value:number;exp:number;basePercent:number;ghostPercent:number}{
 const next=cost(value+1),basePercent=value>=cap?100:Math.min(100,exp/next*100);
 let finalValue=value,remaining=exp+Math.max(0,gain);
 while(finalValue<cap){const required=cost(finalValue+1);if(required<=0||remaining<required)break;remaining-=required;finalValue++;}
 return {value:finalValue,exp:finalValue>=cap?0:remaining,basePercent,ghostPercent:value>=cap?0:Math.max(0,Math.min(100,(exp+Math.max(0,gain))/next*100)-basePercent)};
}
