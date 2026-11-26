import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenancePlan,budgetCategory,escalationFactors} from '../src/lib/maintenance-plan';
const row=(maintenanceWork:string,priority:string,remedialCost:number|null)=>({maintenanceWork,priority,remedialCost});
test('7 percent compounds annually with current prices in year one',()=>{
 const p=maintenancePlan([row('Repair','P1',100),row('Repair','P3',100),row('Repair','P4',100)]);
 assert.deepEqual(p.rows[0].years,[100,107,114.49,0]);assert.equal(p.rows[0].total,321.49);
 assert.equal(escalationFactors[2],1.1449);assert.equal(Number(escalationFactors[3].toFixed(6)),1.225043);
});
test('Opex and Capex follow captured scope, ambiguity remains visible',()=>{
 assert.equal(budgetCategory(row('Routine maintenance','P1',10)),'Opex');
 assert.equal(budgetCategory(row('Preventative maintenance','P1',10)),'Opex');
 assert.equal(budgetCategory(row('Replacement','P1',10)),'Capex');
 assert.equal(budgetCategory({...row('Repair','P1',10),workType:'Upgrade'}),'Capex');
 assert.equal(budgetCategory(row('Refurbishment','P1',10)),'Review classification');
 assert.equal(budgetCategory({...row('Repair','P1',10),workType:'Compliance'}),'Review classification');
});
test('unpriced and unscheduled items are not silently budgeted',()=>{
 const p=maintenancePlan([row('Repair','',200),row('Replacement','P1',null),row('','P2',50)]);
 assert.equal(p.unpriced,1);assert.equal(p.unscheduledItems,1);assert.equal(p.reviewItems,1);
 assert.equal(p.rows[0].unscheduled,200);assert.equal(p.rows[0].total,0);assert.equal(p.rows[2].years[0],50);
});
test('project allowances and VAT are added once after escalation',()=>{
 const p=maintenancePlan([row('Replacement','P3',100)],{pg:10,fees:5,contingency:5,vat:15});
 const grand=p.rows.at(-1)!;assert.equal(grand.years[1],147.66);assert.equal(grand.total,147.66);
 assert.equal(p.rows[1].years[1],107);
});
test('each item occurs once and quantity times rate takes precedence',()=>{
 const p=maintenancePlan([{...row('Routine maintenance','P1',999),remedialQuantity:2,unitRate:50}]);
 assert.deepEqual(p.rows[0].years,[100,0,0,0]);assert.equal(p.rows[0].total,100);
});

test('P4 is fully allocated to the 24–36 month year with no deferral',()=>{
 const p=maintenancePlan([row('Replacement','P4',1000),row('Replacement','',75)]);
 assert.deepEqual(p.rows[1].years,[0,0,1144.9,0]);assert.equal(p.rows[1].total,1144.9);assert.equal(p.rows[1].unscheduled,75);
 const tiny=maintenancePlan([row('Repair','P4',0.01)]);assert.equal(tiny.rows[0].total,0.01);
});

test('itemised breakdown reconciles each category, year and unscheduled amount',()=>{
 const items=[row('Repair','P3',0.05),row('Repair','P3',0.05),row('Repair','P3',0.05),row('Replacement','P4',103.17),row('Repair','',99),row('Refurbishment','P2',42),row('Repair','P1',null)];
 const plan=maintenancePlan(items,{pg:8,fees:10,contingency:10,vat:15});
 assert.equal(plan.details.length,items.length);
 for(const category of plan.rows.slice(0,3)){
  const entries=plan.details.filter(d=>d.category===category.label);
  for(let year=0;year<4;year++)assert.equal(Math.round(entries.reduce((sum,d)=>sum+d.years[year],0)*100),Math.round(category.years[year]*100));
  assert.equal(Math.round(entries.reduce((sum,d)=>sum+d.total,0)*100),Math.round(category.total*100));
  assert.equal(Math.round(entries.reduce((sum,d)=>sum+d.unscheduled,0)*100),Math.round(category.unscheduled*100));
 }
 assert.equal(plan.details[6].baseAmount,null);assert.equal(plan.details[6].total,0);
});
test('breakdown preserves measurement basis, work scope and classification source',()=>{
 const item={...row('Replacement','P4',999),area:'Building 1',element:'Doors',component:'Door set',measuredScope:'Replace damaged door',remedialQuantity:2,unitRate:150};
 const detail=maintenancePlan([item]).details[0];
 assert.equal(detail.baseAmount,300);assert.equal(detail.reason,'Replacement');assert.equal(detail.category,'Capex');assert.equal(detail.item.measuredScope,'Replace damaged door');assert.deepEqual(detail.baseYears,[0,0,300,0]);
});
