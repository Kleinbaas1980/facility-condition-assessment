import type { RequestHandler } from 'express';
import { env } from '../configs/env.js';
import { hmac,randomToken,constantEqual } from '../src/utils/crypto.js';
import { HttpError } from '../src/utils/errors.js';
import { cookieOptions } from '../src/utils/cookies.js';
export function newCsrf(){const nonce=randomToken();return `${nonce}.${hmac(nonce,env.CSRF_SECRET)}`}
export function validCsrf(token:string){const [nonce,signature,...rest]=token.split('.');return !!nonce&&!!signature&&!rest.length&&constantEqual(signature,hmac(nonce,env.CSRF_SECRET))}
export const csrfToken:RequestHandler=(req,res)=>{const existing=req.cookies?.fca_csrf;const token=typeof existing==='string'&&validCsrf(existing)?existing:newCsrf();res.cookie('fca_csrf',token,{...cookieOptions,httpOnly:false,maxAge:24*60*60_000});res.json({csrfToken:token})};
export const protectMutations:RequestHandler=(req,_res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const cookie=req.cookies?.fca_csrf,header=req.get('X-CSRF-Token');if(req.get('Origin')!==env.CLIENT_ORIGIN||typeof cookie!=='string'||!header||!constantEqual(cookie,header)||!validCsrf(cookie))return next(new HttpError(403,'Request verification failed. Reload and try again.','CSRF_INVALID'));next()};
