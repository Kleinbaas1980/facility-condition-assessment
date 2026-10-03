import {http} from './http';
export type DeletionRequest={id:string;project_name:string;target_name:string;target_kind:string;requester_name:string;requester_email:string;status:string;reason:string;requested_at:string;review_note:string};
export const adminApi={list:async()=>(await http.get<DeletionRequest[]>('/admin/deletion-requests')).data,review:async(id:string,decision:'approved'|'rejected',note:string)=>{await http.post(`/admin/deletion-requests/${id}/review`,{decision,note})}};
