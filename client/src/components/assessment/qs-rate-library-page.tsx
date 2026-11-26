'use client';

import {request as fetch} from '@/api/http';
import {useState,type FormEvent} from 'react';
import {disciplines} from '@/lib/disciplines';
import {Editor} from './qs-cost-build-up';
import {calculateBuildUp} from '@/lib/qs-cost-model';
import {componentTemplates,readyTemplate,templateId,type RateTemplate} from '@/lib/qs-rate-library';

const money=(n:number)=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n);

export default function RateLibrary({saved,legacy,onChange,onBack}:{saved:RateTemplate[];legacy:RateTemplate[];onChange:(rates:RateTemplate[])=>void;onBack:()=>void}){
 const templates=componentTemplates([],saved);
 const [selected,setSelected]=useState(templates[0]?.id||'');
 const [search,setSearch]=useState('');
 const [dirty,setDirty]=useState(false);
 const [adding,setAdding]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [usingLegacy,setUsingLegacy]=useState(false);
 const current=templates.find(t=>t.id===selected);
 const oldRate=legacy.find(t=>t.id===selected);
 const editing=usingLegacy?oldRate:current;
 const visible=templates.filter(t=>[t.discipline,t.element,t.component,t.work].join(' ').toLowerCase().includes(search.trim().toLowerCase()));

 function leave(action:()=>void){
  if(busy||dirty&&!window.confirm('Discard unsaved rate edits?'))return;
  setDirty(false);
  setUsingLegacy(false);
  setMessage('');
  action();
 }

 async function persist(payload:unknown){
  setBusy(true);
  setMessage('');
  try{
   const res=await fetch('/api/rate-library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await res.json();
   if(!res.ok)throw Error((data as {error?:string}).error||'Could not save the platform library.');
   onChange(data as RateTemplate[]);
   return data as RateTemplate[];
  }catch(error){
   setMessage(error instanceof Error?error.message:'Could not save the platform library.');
   return null;
  }finally{
   setBusy(false);
  }
 }

 async function add(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const fields=new FormData(event.currentTarget);
  const entry={discipline:String(fields.get('discipline')),element:String(fields.get('element')).trim(),component:String(fields.get('component')).trim()};
  const rates=await persist({action:'add',component:entry});
  if(!rates)return;
  setAdding(false);
  setSearch('');
  setSelected(templateId(entry,'Repair'));
  setMessage('Component added. Enter the work unit and resource costs to make its first rate available.');
 }

 return <div className="qs-page">
  <div className="eyebrow">Admin · Quantity surveying</div>
  <div className="toolbar qs-heading">
   <div><h1 className="title">Platform rate library</h1><p className="muted">{templates.filter(readyTemplate).length} of {templates.length} rates ready for use across projects.</p></div>
   <div className="actions">
    <button type="button" className="btn" disabled={busy} onClick={()=>leave(()=>setAdding(!adding))}>{adding?'Cancel':'Add component'}</button>
    <button type="button" className="btn outline" disabled={busy} onClick={()=>leave(onBack)}>Back to workspace</button>
   </div>
  </div>
  {message&&<p className="notice" role="status">{message}</p>}
  {adding?<form className="card qs-card stack" onSubmit={add}>
   <h2>New component</h2>
   <label>Profession<select name="discipline">{disciplines.map(value=><option key={value}>{value}</option>)}</select></label>
   <label>Element<input name="element" list="platform-elements" required maxLength={160}/></label>
   <datalist id="platform-elements">{[...new Set(templates.map(rate=>rate.element))].sort().map(value=><option key={value} value={value}/>)}</datalist>
   <label>Component name<input name="component" required maxLength={160}/></label>
   <button className="btn" disabled={busy}>{busy?'Adding…':'Create component'}</button>
  </form>:<>
   <section className="card qs-card stack">
    <p>Maintain one set of reusable rates. Findings keep the rate applied when they were priced.</p>
    <label>Find a component<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by profession, element, component or work type"/></label>
    <label>Component and work type<select value={selected} disabled={busy} onChange={e=>{const next=e.target.value;leave(()=>setSelected(next));}}>
     {!visible.some(t=>t.id===selected)&&editing&&<option value={selected}>{editing.component} · {editing.work}</option>}
     {visible.map(t=><option key={t.id} value={t.id}>{readyTemplate(t)?'Ready':'Draft'} · {t.discipline} · {t.element} · {t.component} · {t.work}</option>)}
    </select></label>
    {!visible.length&&<p>No matching components.</p>}
    {editing&&readyTemplate(editing)&&<p><strong>{money(calculateBuildUp(editing.build).rate!)} / {editing.unit}</strong>{editing.build.reference.startsWith('Indicative 1C')?' · Indicative, excl. VAT':' · Excl. VAT'}</p>}
    {legacy.length>0&&<label>Review a rate from this project's old library<select value={usingLegacy?selected:''} disabled={busy} onChange={e=>{const next=e.target.value;leave(()=>{if(next){setSelected(next);setUsingLegacy(true);setMessage('Review this project rate. Saving it here makes it the platform rate for this component and work type.');}});}}>
     <option value="">Select project rate</option>
     {legacy.map(rate=><option key={rate.id} value={rate.id}>{rate.discipline} · {rate.element} · {rate.component} · {rate.work}</option>)}
    </select></label>}
   </section>
   {editing&&<Editor key={editing.id+(usingLegacy?'-legacy':'')} library librarySaving={busy}
    row={{area:'Platform rate library',element:editing.element,component:editing.component,discipline:editing.discipline,measuredScope:editing.work,extentUnit:editing.unit,costBuildUp:editing.build}}
    onDirty={setDirty} onApply={async patch=>{
     const rates=await persist({action:'save',rate:{...editing,unit:patch.extentUnit,build:patch.costBuildUp}});
     if(!rates)return false;
     setUsingLegacy(false);
     setMessage('Rate saved to the platform library.');
     return true;
    }}/>}
  </>}
 </div>;
}
