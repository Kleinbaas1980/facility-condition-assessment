import {sameBuildUp} from './qs-cost-model.js';
import {measurementPatch,matchingTemplates,templatePatch,type CostItem,type RateTemplate} from './qs-rate-library.js';
import {HttpError} from '../utils/errors.js';
export const priceFields=['unitRate','remedialCost','costBuildUp','costTemplateId'] as const;
export const measurementFields=['element','component','discipline','maintenanceWork','extentUnit','remedialQuantity'] as const;
// Never trust assessor-supplied money or resource snapshots. Resolve approved/budget
// library entries on the server, or retain the previously applied snapshot.
export function assessorPricing(current:CostItem,patch:Partial<CostItem>,rates:RateTemplate[]):Partial<CostItem>{
 const allowed={...patch};for(const key of priceFields)delete allowed[key];
 const next={...current,...allowed};
 if(typeof patch.costTemplateId==='string'){
  const rate=matchingTemplates(next,rates).find(t=>t.id===patch.costTemplateId);
  if(!rate)throw new HttpError(403,'Select a valid rate for this component.','RATE_LOCKED');
  return {...allowed,...templatePatch(rate,next)};
 }
 const changesMeasurement=measurementFields.some(key=>key in allowed);
 if(!changesMeasurement){
  const changesPrice=priceFields.some(key=>key in patch&&!sameBuildUp(patch[key],current[key]));
  if(changesPrice)throw new HttpError(403,'Only the QS/admin can edit rates and costs.','RATE_LOCKED');
  return allowed;
 }
 return measurementPatch(current,allowed,rates);
}
