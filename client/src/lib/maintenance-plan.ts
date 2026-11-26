import {itemAmount,type CostedCapture} from './costing';
export type MaintenanceItem=CostedCapture&{workType?:string;maintenanceWork?:string;priority?:string};
export type PlanPricing={pg:number;fees:number;contingency:number;vat:number};
export type PlanLine={label:string;years:number[];total:number;unscheduled:number;strong?:boolean};
export const escalationFactors=[1,1.07,1.07**2,1.07**3];
export const planNotes=[
 'Year 1 covers months 0–12 at current prices; Year 2 covers months 12–24 at +7%; Year 3 covers months 24–36 at +14.49%; Year 4 covers months 36–48 at +22.50%. Escalation compounds at 7% annually.',
 'P1/P2: Year 1. P3: Year 2. P4: provisional 50/50 budget split between Years 3 and 4. A four-year plan ends at month 48; work due in months 49–60 needs a Year 5 extension and programme review. Items with no recognised priority remain unscheduled at current prices.',
 'Planning classification: repair, routine maintenance and preventative maintenance are Opex; replacement and Upgrade work are Capex. Refurbishment, compliance-only and unclear scope require QS/client classification.',
 'Each captured work item is budgeted once. Recurring annual services and uncaptured future work are not assumed. QS review is required before adopting the plan.'
];
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const normal=(v:string|undefined)=>(v||'').trim().toLowerCase();
export function budgetCategory(item:MaintenanceItem):'Opex'|'Capex'|'Review classification'{
 if(normal(item.workType)==='upgrade')return 'Capex';
 if(normal(item.workType)==='compliance')return 'Review classification';
 if(normal(item.maintenanceWork)==='replacement')return 'Capex';
 if(['repair','routine maintenance','preventative maintenance'].includes(normal(item.maintenanceWork)))return 'Opex';
 return 'Review classification';
}
export function maintenancePlan(items:MaintenanceItem[],pricing:Partial<PlanPricing>={}){
 const buckets=new Map<string,number[]>(['Opex','Capex','Review classification'].map(name=>[name,[0,0,0,0,0]]));
 let unpriced=0,unscheduledItems=0,reviewItems=0;
 for(const item of items){
  const category=budgetCategory(item),amount=itemAmount(item);
  if(category==='Review classification')reviewItems++;
  const priority=normal(item.priority),year=priority==='p1'||priority==='p2'?0:priority==='p3'?1:priority==='p4'?2:4;
  if(year===4)unscheduledItems++;
  if(amount===null){unpriced++;continue;}
  if(priority==='p4'){
   const first=round(amount/2);buckets.get(category)![2]+=first;buckets.get(category)![3]+=round(amount-first);
  }else buckets.get(category)![year]+=amount;
 }
 const rows:PlanLine[]=[...buckets].map(([label,values])=>{
  const years=values.slice(0,4).map((v,i)=>round(v*escalationFactors[i]));
  return {label,years,total:round(years.reduce((s,v)=>s+v,0)),unscheduled:round(values[4])};
 });
 const direct=[0,1,2,3,4].map(i=>round(rows.reduce((s,r)=>s+(i===4?r.unscheduled:r.years[i]),0)));
 const pct=(key:keyof PlanPricing)=>{const n=pricing[key];return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100?n:0};
 const allowances=direct.map(n=>round(n*pct('pg')/100)+round(n*pct('fees')/100)+round(n*pct('contingency')/100));
 const vat=direct.map((n,i)=>round((n+allowances[i])*pct('vat')/100));
 const total=direct.map((n,i)=>round(n+allowances[i]+vat[i]));
 for(const [label,values,strong] of [['Total direct works',direct,true],['P&G + fees + contingency',allowances,false],[`VAT (${pct('vat')}%)`,vat,false],['Total maintenance budget',total,true]] as const){
  rows.push({label,years:values.slice(0,4),total:round(values.slice(0,4).reduce((s,v)=>s+v,0)),unscheduled:values[4],strong});
 }
 return {rows,unpriced,unscheduledItems,reviewItems};
}
