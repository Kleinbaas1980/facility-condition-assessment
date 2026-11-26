import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenancePlan,budgetCategory,escalationFactors} from '../src/lib/maintenance-plan';
const row=(maintenanceWork:string,priority:string,remedialCost:number|null)=>({maintenanceWork,priority,remedialCost});
test('7 percent compounds annually with current prices in year one',()=>{
 const p=maintenancePlan([row('Repair','P1',100),row('Repair','P3',100),row('Repair','P4',100)]);
 assert.deepEqual(p.rows[0].years,[100,107,114.49]);assert.equal(p.rows[0].total,321.49);
 assert.equal(escalationFactors[2],1.1449);
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
 assert.deepEqual(p.rows[0].years,[100,0,0]);assert.equal(p.rows[0].total,100);
});
