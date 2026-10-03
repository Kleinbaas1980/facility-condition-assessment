import type { Response } from 'express';
import { env } from '../../configs/env.js';
export const cookieOptions={httpOnly:true,secure:env.COOKIE_SECURE,sameSite:env.COOKIE_SAME_SITE,path:'/api'} as const;
export function setAuthCookies(res:Response,access:string,refresh?:string,expiresAt?:Date){res.cookie('fca_access',access,{...cookieOptions,maxAge:env.ACCESS_TOKEN_MINUTES*60_000});if(refresh&&expiresAt)res.cookie('fca_refresh',refresh,{...cookieOptions,expires:expiresAt})}
export function clearAuthCookies(res:Response){res.clearCookie('fca_access',cookieOptions);res.clearCookie('fca_refresh',cookieOptions)}
