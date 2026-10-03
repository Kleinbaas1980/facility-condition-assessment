import { http } from './http';
export type AssetKind='site-plan'|'facility-logo'|'company-logo'|'assessor-signature';
export const uploadsApi={download:async(projectId:string,kind:AssetKind)=>(await http.get<Blob>(`/projects/${projectId}/${kind}`,{responseType:'blob'})).data,upload:async(projectId:string,kind:AssetKind,file:File)=>{const form=new FormData();form.append('file',file);return (await http.post<Record<string,string>>(`/projects/${projectId}/${kind}`,form)).data},remove:async(projectId:string,kind:AssetKind)=>{await http.delete(`/projects/${projectId}/${kind}`)}};
