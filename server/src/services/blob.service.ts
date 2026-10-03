import { fileTypeFromBuffer } from 'file-type';
import { createHash,randomUUID } from 'node:crypto';
import { storage } from '../../configs/blob.js';
import { HttpError } from '../utils/errors.js';
import type { AssetKind } from '../../types/domain.js';
export async function validateFile(file:Express.Multer.File|undefined,kind:AssetKind|'report'){
 if(!file)throw new HttpError(400,'Choose a file to upload.');
 if(kind!=='site-plan'&&file.size>5*1024*1024&&kind!=='report')throw new HttpError(400,'Images must be smaller than 5 MB.');
 const detected=await fileTypeFromBuffer(file.buffer);const mime=detected?.mime;
 const images=['image/png','image/jpeg','image/webp'];
 if(kind==='report'&&mime!=='application/pdf')throw new HttpError(400,'Upload a valid PDF report.');
 if(kind!=='site-plan'&&kind!=='report'&&(!mime||!images.includes(mime)))throw new HttpError(400,'Choose a PNG, JPEG or WebP image.');
 let contentType=mime||'';
 if(kind==='site-plan'&&(!mime||![...images,'application/pdf'].includes(mime))){const header=file.buffer.subarray(0,12).toString('ascii');const dxf=/^(?:\s*0\s*\r?\n\s*SECTION\s*\r?\n)/.test(file.buffer.subarray(0,100).toString('ascii'));if(/^AC10[0-9]{2}/.test(header))contentType='application/acad';else if(dxf)contentType='application/dxf';else throw new HttpError(400,'Choose a PDF, image, DWG or ASCII DXF site plan.');}
 const name=file.originalname.replace(/[\r\n\x00-\x1f/\\]/g,'_').slice(0,255)||'attachment';
 return {name,contentType,sha256:createHash('sha256').update(file.buffer).digest('hex')};
}
export async function putBlob(projectId:string,buffer:Buffer,contentType:string){const key=`projects/${projectId}/${randomUUID()}`;await storage.put(key,buffer,contentType);return key}
export async function deleteBlob(key:string){await storage.remove(key)}
