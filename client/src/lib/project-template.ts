import { catalog } from './catalog';
import type { ProjectTemplate } from '@/types/project';
export function standardTemplate(discipline:string):ProjectTemplate{
 const areas=catalog.areas.map(area=>({...area}));
 const captures=discipline==='Architect'?catalog.captures.map(row=>({...row,ratings:[0,0,0,0,0],extentUnit:'',remedialCost:null,remedialQuantity:null,unitRate:null,priority:'',measuredScope:'',workType:'',maintenanceWork:'',discipline})):[];
 return {areas,captures};
}

export type { ProjectTemplate } from "@/types/project";
