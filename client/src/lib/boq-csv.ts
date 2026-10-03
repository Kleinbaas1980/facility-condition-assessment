import { allocation, itemAmount } from "@/lib/costing";

type Item = { area:string;section?:string;element:string;component:string;type?:string;discipline?:string;exists?:string;ratings?:number[];priority?:string;workType?:string;maintenanceWork?:string;measuredScope?:string;comment?:string;extent?:number|null;extentUnit?:string;remedialQuantity?:number|null;unitRate?:number|null;remedialCost?:number|null;photos?:{name:string}[] };
type Project = { name:string;assetNumber:string;discipline?:string;payload:{areas:{name:string;code:string}[];captures:Item[]} };

const escapeCell=(value:string|number|null|undefined)=>{
  if(value==null)return "";
  const text=String(value);
  const safe=typeof value==="number"?text:/^[\s]*[=+\-@]/.test(text)?`'${text}`:text;
  return `"${safe.replace(/"/g,'""')}"`;
};

export function downloadQsBoqCsv(project:Project){
  const codes=new Map(project.payload.areas.map(a=>[a.name,a.code]));
  const headers=["Item #","Asset number","Project","Block / allocation","Functional area","Section","Element","Component","Component type","Professional","Present","Measured remedial scope","Extent","Quantity requiring work","Unit","Rate (ZAR / unit)","Amount (ZAR)","Condition rating","C1 %","C2 %","C3 %","C4 %","C5 %","Priority","Work type","Maintenance work","Photo references"];
  const lines=[headers.map(escapeCell).join(",")];
  project.payload.captures.forEach((item,index)=>{
    const rating=item.ratings?.length===5&&Math.abs(item.ratings.reduce((sum,v)=>sum+Number(v||0),0)-100)<.01?`C${item.ratings.indexOf(Math.max(...item.ratings))+1}`:"";
    const row=[index+1,project.assetNumber,project.name,allocation(codes.get(item.area)),item.area,item.section,item.element,item.component,item.type,item.discipline||project.discipline,item.exists,item.measuredScope||item.comment||"",item.extent,item.remedialQuantity,item.extentUnit,item.unitRate,itemAmount(item),rating,...Array.from({length:5},(_,i)=>item.ratings?.[i]??""),item.priority,item.workType,item.maintenanceWork,(item.photos||[]).map(p=>p.name).join("; ")];
    lines.push(row.map(value=>escapeCell(value as string|number|null|undefined)).join(","));
  });
  const blob=new Blob(["\uFEFF",lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=`FCA-QS-BOQ-${(project.assetNumber||project.name).replace(/[^a-z0-9-]+/gi,"-")}.csv`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
