import {z} from 'zod';
import {disciplines,costBuildUpSchema} from './project.js';
const name=z.string().trim().min(1).max(160).refine(s=>!s.includes('|'));
const component=z.object({discipline:z.enum(disciplines),element:name,component:name}).strict();
export const rateLibraryInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('add'),component}).strict(),
 z.object({action:z.literal('save'),rate:component.extend({id:z.string().max(1000).optional(),work:z.enum(['Repair','Replacement','Routine maintenance','Preventative maintenance','Refurbishment']),unit:z.string().trim().max(40),build:costBuildUpSchema}).strict()}).strict()
]);
