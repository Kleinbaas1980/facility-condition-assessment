import test from 'node:test';
import assert from 'node:assert/strict';
import { payloadSchema,updateProjectSchema } from '../src/validation/project.js';
test('empty new projects are valid without seed data',()=>{assert.equal(payloadSchema.safeParse({areas:[],captures:[]}).success,true)});
test('components outside a functional area are rejected',()=>{assert.equal(payloadSchema.safeParse({areas:[],elements:[{area:'absent',name:'Roof'}],captures:[]}).success,false)});
test('save requires optimistic version',()=>{assert.equal(updateProjectSchema.safeParse({name:'Project',assetNumber:'',client:'',discipline:'Architect',payload:{areas:[],captures:[]}}).success,false)});
