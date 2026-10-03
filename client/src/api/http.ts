import axios, { AxiosError,AxiosHeaders,type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
const baseURL=process.env.NEXT_PUBLIC_API_BASE_URL||'/api';
// Images, downloads and the API share authenticated same-origin cookies.
if(baseURL!=='/api')throw new Error('NEXT_PUBLIC_API_BASE_URL must be /api. Configure API_PROXY_TARGET on the Next.js server.');
export type ApiErrorBody={error:string;code?:string;fields?:Record<string,string[]>;requestId?:string};
export class ApiError extends Error{constructor(public status:number,public data:ApiErrorBody){super(data.error);this.name='ApiError'}}
export const http=axios.create({baseURL,withCredentials:true,timeout:30_000});
const sessionHttp=axios.create({baseURL,withCredentials:true,timeout:30_000});
let csrfPromise:Promise<string>|undefined;
export function clearCsrf(){csrfPromise=undefined}
export async function csrf(){if(!csrfPromise)csrfPromise=sessionHttp.get<{csrfToken:string}>('/auth/csrf').then(response=>response.data.csrfToken).catch(error=>{csrfPromise=undefined;throw error});return csrfPromise}
async function withCsrf(config:InternalAxiosRequestConfig){if(!['get','head','options'].includes(config.method||'get'))config.headers.set('X-CSRF-Token',await csrf());return config}
http.interceptors.request.use(withCsrf);
let refreshing:Promise<void>|null=null;
function announceExpiry(data:unknown){if(typeof window!=='undefined'&&data&&typeof data==='object'&&'accessExpiresAt' in data&&typeof data.accessExpiresAt==='number')window.dispatchEvent(new CustomEvent('fca:token-expiry',{detail:data.accessExpiresAt}))}
export async function refreshSession(){if(!refreshing)refreshing=(async()=>{try{const response=await sessionHttp.post('/auth/refresh',{}, {headers:{'X-CSRF-Token':await csrf()}});announceExpiry(response.data)}catch(error){const response=axios.isAxiosError(error)?error.response:undefined;throw new ApiError(response?.status||0,response?.data?.error?response.data:{error:'Could not renew your session.'})}})().finally(()=>{refreshing=null});return refreshing}
type RetryConfig=InternalAxiosRequestConfig&{_authRetry?:boolean;_csrfRetry?:boolean};
const unauthPaths=['/auth/login','/auth/register','/auth/refresh','/auth/forgot-password','/auth/reset-password','/auth/verify-email','/auth/resend-verification'];
http.interceptors.response.use(response=>{announceExpiry(response.data);return response},async(error:AxiosError<ApiErrorBody>)=>{
 const config=error.config as RetryConfig|undefined,status=error.response?.status;
 if(config&&status===403&&error.response?.data?.code==='CSRF_INVALID'&&!config._csrfRetry){config._csrfRetry=true;clearCsrf();config.headers.set('X-CSRF-Token',await csrf());return http(config)}
 if(config&&status===401&&!config._authRetry&&!unauthPaths.some(path=>config.url?.startsWith(path))){config._authRetry=true;try{await refreshSession();return http(config)}catch{if(typeof window!=='undefined')window.dispatchEvent(new Event('fca:unauthenticated'))}}
 const body=error.response?.data;
 throw new ApiError(status||0,body&&typeof body.error==='string'?body:{error:status?'The request failed.':'Cannot reach the API. Check your connection.'});
});
// Adapter for the migrated assessment UI; all traffic is Axios, never native fetch.
// Typed feature clients below can be used when extending the app.
export type ApiResult<T>={ok:boolean;status:number;json:()=>Promise<T>;blob:()=>Promise<Blob>};
export async function request<T=unknown>(url:string,options:{method?:string;headers?:Record<string,string>;body?:string|FormData}={}):Promise<ApiResult<T>>{
 const relative=url.startsWith('/api/')?url.slice(4):url;
 const data=typeof options.body==='string'?JSON.parse(options.body):options.body;
 const binary=(options.method||'GET').toUpperCase()==='GET'&&/^\/projects\/[^/]+\/(site-plan|facility-logo|company-logo|assessor-signature|photos\/[^/?]+)(?:\?|$)/.test(relative);
 try{const response=await http.request<T|Blob>({url:relative,method:options.method||'GET',headers:options.headers,data,responseType:binary?'blob':'json'});return {ok:true,status:response.status,json:async()=>response.data as T,blob:async()=>{if(response.data instanceof Blob)return response.data;throw new Error('This endpoint does not return a file.')}}}
 catch(error){if(error instanceof ApiError)return {ok:false,status:error.status,json:async()=>error.data as T,blob:async()=>{throw error}};throw error}
}
