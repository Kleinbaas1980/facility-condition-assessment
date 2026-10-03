"use client";
import { useRef, useState } from "react";

export default function SignaturePad({onSave,busy}:{onSave:(file:File)=>Promise<void>;busy:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const drawing=useRef(false);
 const [hasInk,setHasInk]=useState(false);
 function point(e:React.PointerEvent<HTMLCanvasElement>){const bounds=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-bounds.left)*e.currentTarget.width/bounds.width,y:(e.clientY-bounds.top)*e.currentTarget.height/bounds.height}}
 function start(e:React.PointerEvent<HTMLCanvasElement>){const element=canvas.current,ctx=element?.getContext("2d");if(!element||!ctx)return;element.setPointerCapture(e.pointerId);drawing.current=true;const p=point(e);ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#142d40";ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();setHasInk(true)}
 function move(e:React.PointerEvent<HTMLCanvasElement>){if(!drawing.current)return;const ctx=canvas.current?.getContext("2d");if(!ctx)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke()}
 function clear(){canvas.current?.getContext("2d")?.clearRect(0,0,canvas.current.width,canvas.current.height);setHasInk(false)}
 async function save(){const element=canvas.current;if(!element||!hasInk)return;const blob=await new Promise<Blob|null>(resolve=>element.toBlob(resolve,"image/png"));if(blob)await onSave(new File([blob],"assessor-signature.png",{type:"image/png"}))}
 return <div className="signature-pad"><label>Sign on the screen with your finger, mouse or stylus</label><canvas ref={canvas} width={720} height={220} aria-label="Assessor signature pad" onPointerDown={start} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false} /><div className="actions"><button type="button" className="btn outline" onClick={clear} disabled={busy||!hasInk}>Clear</button><button type="button" className="btn" onClick={()=>void save()} disabled={busy||!hasInk}>Save signature</button></div></div>
}
