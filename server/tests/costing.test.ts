import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBuildUp,sameBuildUp} from '../src/costing/qs-cost-model.js';
import {componentTemplates,templatePatch,measurementPatch,matchingTemplates,readyTemplate} from '../src/costing/qs-rate-library.js';
import {assessorPricing} from '../src/costing/assessor-pricing.js';
import {rateLibraryInput} from '../src/validation/rate-library.js';
import {capture} from '../src/validation/project.js';
const row={element:'Lighting',component:'Light fittings',discipline:'Electrician',maintenanceWork:'Replacement',extentUnit:'No.',remedialQuantity:2,unitRate:null,remedialCost:null};
test('standard components cover seven professions and five work variants',()=>{
 const entries=componentTemplates([]);assert.equal(new Set(entries.map(r=>r.discipline)).size,7);
 for(const item of entries)assert.equal(entries.filter(r=>r.discipline===item.discipline&&r.element===item.element&&r.component===item.component).length,5);
 assert(entries.some(r=>r.build.reference.startsWith('Indicative 1C')));
});
test('resource arithmetic includes wastage, overheads and profit markup',()=>{
 const r=matchingTemplates(row,[])[0];r.build={resources:[{id:'m',category:'Material',description:'Paint',unit:'L',quantity:2,rate:50,wastePercent:10},{id:'l',category:'Labour',description:'Artisan',unit:'hour',quantity:0.5,rate:100,wastePercent:0}],overheadPercent:10,profitPercent:20,reference:'Test',notes:''};
 assert.equal(calculateBuildUp(r.build).rate,211.2);r.build.resources[0].rate=null;assert.equal(calculateBuildUp(r.build).rate,null);
});
test('a draft override disables a budget rate until QS completes it',()=>{
 const t=matchingTemplates(row,[]).find(t=>t.work==='Replacement')!;t.build.resources[0].rate=null;
 assert(!readyTemplate(t));assert(!matchingTemplates(row,[t]).some(r=>r.work==='Replacement'));
});
test('rate snapshots survive library edits and clear on incompatible unit changes',()=>{
 const rate=matchingTemplates(row,[]).find(t=>t.work==='Replacement')!;
 const priced={...row,...templatePatch(rate,row)};const previous=priced.unitRate;
 rate.build.resources[0].rate=99999;assert.equal(priced.unitRate,previous);assert.notEqual(calculateBuildUp(rate.build).rate,calculateBuildUp(priced.costBuildUp!).rate);
 assert.equal(measurementPatch(priced,{extentUnit:'m²'},[]).unitRate,null);
 assert.deepEqual(templatePatch(rate,{...row,extentUnit:'m²'}),{});
});
test('assessors cannot set a manual rate or inject resource prices',()=>{
 assert.throws(()=>assessorPricing(row,{unitRate:1},[]),/Only the QS/);
 const safe=assessorPricing(row,{remedialQuantity:3,unitRate:1,remedialCost:1},[]);
 assert.notEqual(safe.unitRate,1);assert.equal(safe.remedialCost,null);
 const rate=matchingTemplates(row,[]).find(t=>t.work==='Replacement')!;
 const selection=assessorPricing(row,{costTemplateId:rate.id,unitRate:1},[]);
 assert.equal(selection.unitRate,calculateBuildUp(rate.build).rate);
 assert.throws(()=>assessorPricing(row,{costTemplateId:'unrelated'},[]),/valid rate/);
});
test('configured rates take precedence and manual BOQ prices remain unchanged',()=>{
 const rate=matchingTemplates(row,[]).find(t=>t.work==='Replacement')!;
 rate.build.overheadPercent=50;
 assert.equal(assessorPricing(row,{remedialQuantity:3},[rate]).unitRate,calculateBuildUp(rate.build).rate);
 assert.equal(measurementPatch({...row,unitRate:88},{remedialQuantity:3},[]).unitRate,undefined);
});
test('library validation rejects negative and excessive values, accepts editable drafts',()=>{
 const rate=matchingTemplates(row,[])[0];
 assert(rateLibraryInput.safeParse({action:'save',rate}).success);
 rate.build.resources[0].rate=-1;assert(!rateLibraryInput.safeParse({action:'save',rate}).success);
 rate.build.resources[0].rate=null;assert(rateLibraryInput.safeParse({action:'save',rate}).success);
 assert(capture.shape.extentUnit.safeParse('m³').success);
 assert(!capture.shape.costBuildUp.safeParse({resources:'invalid'}).success);
});

test('JSONB key ordering does not create false autosave conflicts',()=>{
 const a={resources:[{id:'r',rate:40,quantity:2}],overheadPercent:10};
 const b={overheadPercent:10,resources:[{quantity:2,rate:40,id:'r'}]};
 assert(sameBuildUp(a,b));assert(!sameBuildUp(a,{...b,overheadPercent:20}));assert(sameBuildUp(null,undefined));
});

test('chosen extent unit filters incompatible square-metre rates and keeps the library override',()=>{
 const component={discipline:'Architect',element:'External facade',component:'Finishes'};
 const override=matchingTemplates(component,[]).find(t=>t.work==='Repair')!;override.unit='LM';
 const selected={...component,extentUnit:'LM',maintenanceWork:'Repair',remedialQuantity:10};
 const rates=matchingTemplates(selected,[override]);
 assert.equal(rates.length,1);assert.equal(rates[0].unit,'LM');assert.equal(rates[0].work,'Repair');
 assert.equal(measurementPatch({...selected,extentUnit:''},{extentUnit:'LM'},[override]).extentUnit,'LM');
 assert.equal(measurementPatch({...selected,extentUnit:''},{extentUnit:'LM'},[override]).costTemplateId,override.id);
 assert(!matchingTemplates({...component,extentUnit:'No.'},[override]).length);
 const sqm=matchingTemplates(component,[]).find(t=>t.work==='Replacement')!;
 assert.deepEqual(templatePatch(sqm,selected),{});
 assert.throws(()=>assessorPricing(selected,{costTemplateId:sqm.id},[override]),/valid rate/);
});
test('equivalent measurement units retain pricing, but dimension changes require a new quantity',()=>{
 const component={discipline:'Civil Engineer',element:'External works',component:'Kerbs and channels'};
 const t=matchingTemplates(component,[]).find(t=>t.work==='Repair')!;
 const priced={...component,...templatePatch(t),remedialQuantity:12};
 const equivalent=measurementPatch(priced,{extentUnit:'m'},[]);
 assert.equal(equivalent.costTemplateId,undefined);assert(!('unitRate' in equivalent));assert(!('remedialQuantity' in equivalent));
 const changed=measurementPatch(priced,{extentUnit:'m²'},[]);
 assert.equal(changed.extentUnit,'m²');assert.equal(changed.unitRate,null);assert.equal(changed.remedialQuantity,null);
});
