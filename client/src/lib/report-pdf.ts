import axios from "axios";
import { uploadsApi } from "@/api/uploads";
import type { jsPDF as PdfType } from "jspdf";
import { allocation, itemAmount } from "@/lib/costing";
import { priorities } from "@/lib/priorities";

type Capture={area:string;element:string;component:string;type?:string;discipline?:string;exists:string;ratings:number[];extent?:number|null;remedialQuantity?:number|null;extentUnit?:string;unitRate?:number|null;remedialCost?:number|null;priority?:string;measuredScope?:string;comment?:string;workType?:string;maintenanceWork?:string;photos?:{id:string;name:string}[]};
type Project={companyName?:string;companyAddress?:string;clientAddress?:string;id:string;name:string;client:string;assetNumber:string;discipline?:string;facilityLogoName?:string;companyLogoName?:string;assessorSignatureName?:string;assessorName?:string;assessorRole?:string;assessorRegistration?:string;payload:{areas:{name:string;code:string}[];captures:Capture[];pricing?:{pg:number;fees:number;contingency:number;vat:number}}};
const money=(n:number)=>`R ${new Intl.NumberFormat("en-ZA",{maximumFractionDigits:2,minimumFractionDigits:2}).format(n)}`;
export async function createReportPdf(project:Project):Promise<File>{
 const {jsPDF}=await import("jspdf");
 const pdf:PdfType=new jsPDF({unit:"mm",format:"a4"});
 // Embed licensed fonts so report typography is consistent across PDF viewers.
 for(const [file,style] of [["FCA-Regular.ttf","normal"],["FCA-Bold.ttf","bold"]]){
 const blob=(await axios.get<Blob>(`/fonts/${file}`,{responseType:"blob"})).data;
 const bytes=new Uint8Array(await blob.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 pdf.addFileToVFS(file,btoa(binary));pdf.addFont(file,"helvetica",style);
 }
 const rows=project.payload.captures,priced=rows.filter(r=>itemAmount(r)!=null);
 const valid=(r:Capture)=>r.ratings?.length===5&&r.ratings.every(v=>Number.isFinite(+v)&&+v>=0&&+v<=100)&&Math.abs(r.ratings.reduce((s,v)=>s+Number(v),0)-100)<.01;
 const present=rows.filter(r=>r.exists?.trim().toLowerCase()!=="no"),rated=present.filter(valid);
 const direct=priced.reduce((s,r)=>s+(itemAmount(r)||0),0);
 const rates=project.payload.pricing||{pg:0,fees:0,contingency:0,vat:0};
 const pg=direct*rates.pg/100,fees=direct*rates.fees/100,contingency=direct*rates.contingency/100,vat=(direct+pg+fees+contingency)*rates.vat/100;
 const code=new Map(project.payload.areas.map(a=>[a.name,a.code]));
 let y=18,page=1;
 function addReportPage(){pdf.addPage();pdf.setFillColor(250,252,253);pdf.rect(0,0,210,297,"F");pdf.setFillColor(231,247,246);pdf.path([{op:"m",c:[180,0]},{op:"l",c:[210,0]},{op:"l",c:[210,28]},{op:"h",c:[]}]);pdf.fill();pdf.setFillColor(229,236,240);pdf.path([{op:"m",c:[0,272]},{op:"l",c:[25,297]},{op:"l",c:[0,297]},{op:"h",c:[]}]);pdf.fill();pdf.setDrawColor(86,207,202);pdf.setLineWidth(1);pdf.line(181,2,208,28);pdf.line(2,272,25,295);pdf.setTextColor(19,47,70);}
 function pageIf(height=8){if(y+height>275){addReportPage();page++;y=18}}
 function line(text:string,size=10,bold=false){pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(size);const parts=pdf.splitTextToSize(text||" ",174) as string[];pageIf(parts.length*size*.48+3);pdf.text(parts,18,y);y+=parts.length*size*.48+3}
 function heading(text:string){pageIf(18);y+=5;pdf.setDrawColor(21,60,83);pdf.line(18,y,192,y);y+=7;line(text,14,true)}
 function bar(label:string,count:number,total:number,color:[number,number,number]){pageIf(10);pdf.setFontSize(9);pdf.setTextColor(20,45,64);pdf.text(`${label}  ${count}`,18,y);pdf.setFillColor(232,239,242);pdf.rect(92,y-4,100,4,"F");pdf.setFillColor(...color);pdf.rect(92,y-4,total?100*count/total:0,4,"F");y+=9}
 async function addReportImage(kind:"facility-logo"|"company-logo"|"assessor-signature",x:number,top:number,maxW:number,maxH:number,alignRight=false){
  const imageBlob=await uploadsApi.download(project.id,kind);
  await addImageBlob(imageBlob,x,top,maxW,maxH,alignRight);
 }
 async function addImageBlob(blob:Blob,x:number,top:number,maxW:number,maxH:number,alignRight=false){
  const bytes=new Uint8Array(await blob.arrayBuffer());const image=pdf.getImageProperties(bytes);
  const ratio=Math.min(maxW/image.width,maxH/image.height);
  pdf.addImage(bytes,image.fileType,alignRight?x+maxW-image.width*ratio:x,top,image.width*ratio,image.height*ratio);
 }
 // Diagonal corporate template in the established FCA palette.
 pdf.setFillColor(255,255,255);pdf.rect(0,0,210,297,"F");
 function polygon(points:number[][],color:[number,number,number]){pdf.setFillColor(...color);pdf.path(points.map((c,i)=>({op:i?"l":"m",c})).concat([{op:"h",c:[]}]));pdf.fill();}
 polygon([[0,166],[168,0],[210,0],[210,43],[0,253]],[237,241,242]);polygon([[0,191],[190,1],[210,12],[210,60],[0,272]],[86,207,202]);polygon([[0,179],[177,23],[197,30],[210,47],[210,81],[34,229],[8,224],[0,213]],[11,37,58]);
 pdf.setFillColor(86,207,202);pdf.circle(19,126,7,"F");pdf.circle(96,182,3,"F");pdf.setFillColor(11,37,58);pdf.circle(69,103,3.5,"F");pdf.circle(166,153,6,"F");
 const teamBlob=(await axios.get<Blob>("/images/fca-assessment-team.png",{responseType:"blob"})).data;const teamBytes=new Uint8Array(await teamBlob.arrayBuffer());const teamProperties=pdf.getImageProperties(teamBytes);
 for(const [cx,cy,radius] of [[37,185,24],[105,128,35],[173,71,24]]){pdf.setFillColor(255,255,255);pdf.circle(cx,cy,radius+2,"F");pdf.saveGraphicsState();pdf.circle(cx,cy,radius,null);pdf.clip();pdf.discardPath();pdf.addImage(teamBytes,teamProperties.fileType,cx-radius*1.5,cy-radius,radius*3,radius*2);pdf.restoreGraphicsState();}
 pdf.setFont("helvetica","bold");pdf.setTextColor(11,37,58);pdf.setFontSize(13.5);pdf.text("FACILITY CONDITION",18,60);pdf.setFontSize(27);pdf.text("ASSESSMENT",18,76);pdf.setTextColor(8,125,128);pdf.text("REPORT",18,92);
 if(project.companyLogoName)await addReportImage("company-logo",18,16,82,35);
 function fitted(text:string,x:number,top:number,width:number,height:number,size:number,align:"left"|"right"="left"){pdf.setFontSize(size);const lines=pdf.splitTextToSize(text,width) as string[];pdf.setFontSize(Math.min(size,height/Math.max(1,lines.length)/.48));if(lines.length)pdf.text(lines,x,top,{align,lineHeightFactor:1.2});}
 // A fixed bottom-right details block always fits inside the cover page.
 pdf.setFillColor(255,255,255);pdf.rect(69,181,125,103,"F");pdf.setTextColor(8,125,128);pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.text(String(new Date().getFullYear()),192,190,{align:"right"});pdf.setFont("helvetica","bold");pdf.setTextColor(11,37,58);fitted(project.name,192,199,118,12,14.5,"right");
 const draft=!rows.length||rated.length<present.length||priced.length<rows.length||rows.some(r=>!r.priority);
 const details=["Summary report and bill of quantities",draft?"DRAFT - review incomplete entries":"Assessment summary","",`Prepared by: ${project.companyName||project.assessorName||"Assessor not entered"}`,project.companyName?project.assessorName:"",project.companyAddress,"",`Prepared for: ${project.client||"Client not entered"}`,project.clientAddress,"",project.assetNumber?`Asset number: ${project.assetNumber}`:"",project.discipline?`Profession: ${project.discipline}`:"",project.assessorRole?`Professional role: ${project.assessorRole}`:"",project.assessorRegistration?`Registration: ${project.assessorRegistration}`:"",`Report issued: ${new Date().toLocaleDateString("en-ZA")}`].filter(v=>v!==undefined).join("\n");pdf.setFont("helvetica","normal");pdf.setTextColor(83,107,121);fitted(details,192,217,118,65,10,"right");
 addReportPage();page++;y=18;pdf.setTextColor(19,47,70);
 line("Assessment dashboard & BOQ",18,true);line(project.name,14,true);
 heading("Assessment overview");line(`Indicative total: ${money(direct+pg+fees+contingency+vat)}`,14,true);line(`Direct remedial works: ${money(direct)}  |  Captured items: ${rows.length}  |  Priced BOQ items: ${priced.length}`,10);line(`Poor condition: ${rated.filter(r=>+r.ratings[3]>0).length}  |  Very poor: ${rated.filter(r=>+r.ratings[4]>0).length}  |  Complete ratings: ${rated.length}/${present.length}`,10);line(`P1 urgent items: ${rows.filter(r=>r.priority?.trim().toUpperCase()==="P1").length}`,10);
 heading("Condition rating of captured items");const colors:[[number,number,number],...Array<[number,number,number]>]=[[25,134,107],[131,174,67],[228,170,44],[223,119,46],[201,74,71]];["Very good","Good","Fair","Poor","Very poor"].forEach((label,i)=>bar(label,rated.filter(r=>r.ratings.indexOf(Math.max(...r.ratings))===i).length,rated.length,colors[i]));
 heading("Priority and response window");priorities.forEach((p,i)=>bar(`${p.code} ${p.window}`,rows.filter(r=>r.priority?.trim().toUpperCase()===p.code).length,rows.length,colors[Math.min(i+2,4)]));
 heading("Pricing build-up");[["Direct remedial works",direct],[`P&G (${rates.pg}%)`,pg],[`Professional fees (${rates.fees}%)`,fees],[`Contingency (${rates.contingency}%)`,contingency],[`VAT (${rates.vat}%)`,vat],["Indicative total",direct+pg+fees+contingency+vat]].forEach(([label,value])=>line(`${label}: ${money(value as number)}`,10,label==="Indicative total"));
 heading("Direct works by block / allocation");[...new Set(priced.map(r=>allocation(code.get(r.area))))].forEach(block=>line(`${block}: ${money(priced.filter(r=>allocation(code.get(r.area))===block).reduce((s,r)=>s+(itemAmount(r)||0),0))}`,10));
 heading("Captured items and bill of quantities");rows.forEach((r,i)=>{pageIf(27);line(`${i+1}. ${allocation(code.get(r.area))} / ${r.area} / ${r.element} / ${r.component}`,10,true);line(`${r.type||"Component type not set"}  |  ${r.discipline||project.discipline||"Profession not set"}`,9);line(`${r.measuredScope||r.comment||r.component}  |  Qty ${r.remedialQuantity??"—"} ${r.extentUnit||""}  |  Rate ${r.unitRate==null?"—":money(r.unitRate)}  |  Amount ${itemAmount(r)==null?"For QS review":money(itemAmount(r)!)}`,9);line(`${r.priority||"No priority"}  |  ${r.workType||"Type not set"}${r.workType!=="Compliance"&&r.maintenanceWork?` / ${r.maintenanceWork}`:""}  |  ${valid(r)?`C${r.ratings.indexOf(Math.max(...r.ratings))+1}`:"Unrated"}  |  ${r.photos?.length||0} photo(s)`,9);y+=2});
 heading("Assessor sign-off");if(project.assessorSignatureName){pageIf(31);await addReportImage("assessor-signature",18,y,65,24);y+=29}line(`Assessor: ${project.assessorName||"Not entered"}`,10);if(project.assessorRole)line(`Professional role: ${project.assessorRole}`,9);if(project.assessorRegistration)line(`Registration: ${project.assessorRegistration}`,9);
 heading("Pricing disclaimer");line("Costs are indicative assessment estimates, not a final quotation or measured bill of quantities. Confirm scope, quantities, specifications, site access, contractor rates, fees, contingency and VAT before procurement. Blank cost fields are excluded. A zero total does not mean no remedial work is required.",9);
 const pages=pdf.getNumberOfPages();for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setFontSize(8);pdf.setTextColor(...(i===1?[167,201,206]:[100,117,130]) as [number,number,number]);pdf.text(`Facility Condition Assessment  |  ${project.name}  |  Page ${i} of ${pages}`,18,289)}
 const filename=`FCA-${project.name.replace(/[^a-z0-9-]+/gi,"-").replace(/^-|-$/g,"")||"Report"}.pdf`;
 return new File([pdf.output("blob")],filename,{type:"application/pdf"});
}
