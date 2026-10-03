import { http } from './http';
export const reportsApi={email:async(projectId:string,email:string,file:File)=>{const form=new FormData();form.append('email',email);form.append('file',file);return (await http.post<{message:string}>(`/projects/${projectId}/report/email`,form)).data},boq:async(projectId:string)=>(await http.get<Blob>(`/projects/${projectId}/boq.csv`,{responseType:'blob'})).data};
