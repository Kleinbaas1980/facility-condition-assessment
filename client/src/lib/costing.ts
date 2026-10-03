export type CostedCapture={remedialQuantity?:number|null;unitRate?:number|null;remedialCost?:number|null};
export function itemAmount(row:CostedCapture):number|null{
 const extent=Number(row.remedialQuantity),rate=Number(row.unitRate);
 if(row.remedialQuantity!=null&&row.unitRate!=null&&Number.isFinite(extent)&&Number.isFinite(rate)&&extent>=0&&rate>=0)return Math.round(extent*rate*100)/100;
 const amount=Number(row.remedialCost);
 return row.remedialCost!=null&&Number.isFinite(amount)&&amount>=0?amount:null;
}
export function allocation(areaCode:string|undefined):string{
 const match=(areaCode||"").match(/(?:^|-)B\d{2}[A-Z](?:-|$)/i);
 return match?match[0].replace(/-/g,"").toUpperCase():"Other / shared";
}
