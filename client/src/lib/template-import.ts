import type { ProjectTemplate } from "./project-template";

type ImportedCapture=ProjectTemplate["captures"][number];
export type ImportedTemplate={areas:ProjectTemplate["areas"];captures:ImportedCapture[];sheetOptions:string[];sheetName:string};
const clean=(value:unknown)=>String(value??"").trim();
const norm=(value:unknown)=>clean(value).toLowerCase().replace(/[^a-z0-9]/g,"");
function findColumn(headers:string[],names:string[]){return headers.findIndex(h=>names.includes(h));}
function findTable(rows:unknown[][],required:string[][]){
 for(let i=0;i<Math.min(25,rows.length);i++){
  const headers=(rows[i]||[]).map(norm);
  if(required.every(names=>findColumn(headers,names)>=0))return {headers,rows:rows.slice(i+1)};
 }
 return null;
}
const value=(row:unknown[],headers:string[],aliases:string[])=>{const index=findColumn(headers,aliases);return index<0?"":row[index];};
const numeric=(v:unknown):number|null=>v===""||v==null?null:Number.isFinite(Number(v))?Number(v):null;
const ratingAliases=[
 ["condc1perc","c1","c1verygood"],["condc2perc","c2","c2good"],
 ["condc3perc","c3","c3fair"],["condc4perc","c4","c4poor"],["condc5perc","c5","c5verypoor"],
];
export async function importFcaTemplate(file:File,discipline:string,selectedSheet?:string):Promise<ImportedTemplate>{
 if(file.size>10_000_000||!file.size)throw Error("Choose a workbook or CSV up to 10 MB.");
 if(!/\.(xlsx|xlsb|csv)$/i.test(file.name))throw Error("Choose an .xlsx, .xlsb or .csv file.");
 const XLSX=await import("@e965/xlsx");
 const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",bookVBA:false,cellFormula:false,cellHTML:false,sheetRows:12000});
 const sheets=new Map(workbook.SheetNames.map(name=>[norm(name),XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name],{header:1,defval:"",raw:true}) as unknown[][]]));
 const requirements=[["assignedfunctionalarea","functionalarea","area","functionalareaname"],["element"],["component","components"]];
 const sheetOptions=workbook.SheetNames.filter(name=>findTable(sheets.get(norm(name))||[],requirements));
 if(selectedSheet&&!sheetOptions.includes(selectedSheet))throw Error("The selected assessment sheet was not found in this file.");
 const sheetName=selectedSheet||sheetOptions[0]||"";
 const areaRows=sheets.get("functionalareas")||[];
 const captureRows=sheetName?sheets.get(norm(sheetName))||[]:sheets.get("functionalareacaptureforms")||sheets.get("captureform")||sheets.get("capture")||sheets.get("components")||sheets.get("assessment")||sheets.get(norm(workbook.SheetNames[0]))||[];
 const areas:ImportedTemplate["areas"]=[],captures:ImportedCapture[]=[];
 const areaTable=findTable(areaRows,[["functionalareanumber","code","functionalareaid"],["functionalareaname","functionalarea","area"]]);
 if(areaTable)for(const row of areaTable.rows){
  const name=clean(value(row,areaTable.headers,["functionalareaname","functionalarea","area"]));
  if(!name||areas.some(a=>a.name===name))continue;
  areas.push({code:clean(value(row,areaTable.headers,["functionalareanumber","code","functionalareaid"]))||`FA-${areas.length+1}`,unit:clean(value(row,areaTable.headers,["physicalunitid","physicalunit"])),type:clean(value(row,areaTable.headers,["functionalareatype","areatype"]))||name,name,sqm:numeric(value(row,areaTable.headers,["sqm","areaextent","floorarea"]))});
 }
 let table=findTable(captureRows,[["assignedfunctionalarea","functionalarea","area","functionalareaname"],["element"],["component","components"]]);
 if(!table){for(const rows of sheets.values()){table=findTable(rows,[["assignedfunctionalarea","functionalarea","area","functionalareaname"],["element"],["component","components"]]);if(table)break;}}
 if(table)for(const row of table.rows){
  const area=clean(value(row,table.headers,["assignedfunctionalarea","functionalarea","area","functionalareaname"]));
  const element=clean(value(row,table.headers,["element"])),component=clean(value(row,table.headers,["component","components"]));
  if(!area||!element||!component)continue;
  if(!areas.some(a=>a.name===area))areas.push({code:`FA-${areas.length+1}`,unit:"",type:"Imported",name:area,sqm:null});
  const source=ratingAliases.map(aliases=>numeric(value(row,table!.headers,aliases))||0);
  const rawTotal=source.reduce((sum,v)=>sum+v,0),ratings=source.map(v=>Math.round(v*(rawTotal>0&&rawTotal<=1.001?100:1)*100)/100);
  captures.push({area,section:clean(value(row,table.headers,["section"])),element,component,type:clean(value(row,table.headers,["componenttype","type"])),exists:clean(value(row,table.headers,["exists","present"])),extent:numeric(value(row,table.headers,["extent","quantity"])),extentUnit:clean(value(row,table.headers,["extentunit","unit","uom"])),remedialCost:numeric(value(row,table.headers,["remedialcost","cost","amount"])),remedialQuantity:numeric(value(row,table.headers,["remedialquantity","repairquantity"])),unitRate:numeric(value(row,table.headers,["unitrate","rate"])),priority:clean(value(row,table.headers,["priority"])),measuredScope:clean(value(row,table.headers,["measuredscope","scope","remedialaction"])),workType:clean(value(row,table.headers,["worktype"])),maintenanceWork:clean(value(row,table.headers,["maintenancework","maintenance","workmaintenance"])),ratings,comment:clean(value(row,table.headers,["oshacomments","comments","description"])),discipline:clean(value(row,table.headers,["discipline"]))||discipline});
  if(captures.length>10000)throw Error("Too many component rows. Limit imports to 10,000 items.");
 }
 if(!areas.length&&!captures.length)throw Error("No functional areas or component rows found. Use a workbook with FunctionalAreas and FunctionalAreaCaptureForms sheets, or a CSV with Functional Area, Element and Component columns.");
 return {areas,captures,sheetOptions,sheetName};
}
