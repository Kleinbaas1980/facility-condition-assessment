import { BlobServiceClient } from '@azure/storage-blob';
import { put,get,del,list } from '@vercel/blob';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { env } from './env.js';
const azure=env.BLOB_PROVIDER==='azure'?BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING!).getContainerClient(env.AZURE_STORAGE_CONTAINER):undefined;
const token=env.BLOB_READ_WRITE_TOKEN;
export const storage={
 async put(key:string,buffer:Buffer,contentType:string){
  if(azure){await azure.getBlockBlobClient(key).uploadData(buffer,{blobHTTPHeaders:{blobContentType:contentType,blobCacheControl:'private, no-store'}});return}
  const result=await put(key,buffer,{access:'private',token,contentType,addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:60});
  if(!new URL(result.url).hostname.endsWith('.private.blob.vercel-storage.com')){await del(result.url,{token});throw new Error('Only private Vercel Blob storage is allowed.');}
 },
 async read(key:string):Promise<{stream:NodeJS.ReadableStream;size:number|undefined}>{
  if(azure){const result=await azure.getBlobClient(key).download();if(!result.readableStreamBody)throw new Error('Blob body unavailable');return {stream:result.readableStreamBody,size:result.contentLength}}
  const result=await get(key,{access:'private',token,useCache:false});
  if(!result||result.statusCode!==200||!result.stream)throw new Error('Blob unavailable');
  return {stream:Readable.fromWeb(result.stream as ReadableStream<Uint8Array>),size:result.blob.size??undefined};
 },
 async remove(key:string){if(azure)await azure.getBlobClient(key).deleteIfExists();else await del(key,{token})}
};
export async function verifyBlobStore(){
 if(azure){const properties=await azure.getProperties();if(properties.blobPublicAccess)throw new Error('The FCA Azure blob container must be private.');return}
 const result=await list({token,limit:1});
 if(result.blobs.some(blob=>!new URL(blob.url).hostname.endsWith('.private.blob.vercel-storage.com')))throw new Error('Select a private Vercel Blob store.');
 // Empty stores have no URL to inspect. Every write still requires access:'private',
 // so a public store cannot be used to upload any assessment file.
}
