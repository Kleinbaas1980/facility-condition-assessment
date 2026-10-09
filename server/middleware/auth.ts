import { professionFor } from "../models/assignment.model.js";
import type { RequestHandler } from "express";
import { pool } from "../configs/database.js";
import { verifyToken } from "../src/utils/tokens.js";
import { HttpError } from "../src/utils/errors.js";

type Role = "admin" | "assessor";

async function loadRole(sid: string, sub: string): Promise<Role> {
  const result = await pool.query(
    "SELECT s.id,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.email_verified_at IS NOT NULL",
    [sid, sub],
  );
  if (!result.rowCount)
    throw new HttpError(401, "Please sign in again.", "UNAUTHENTICATED");
  await professionFor(pool, sub);
  return result.rows[0].role as Role;
}

// Short-lived cache of "this session is valid". Used ONLY by requireAuthLight.
const roleCache = new Map<string, { role: Role; until: number }>();
const CACHE_MS = 90_000;
export const forgetSession = (sid: string) => {
  for (const key of roleCache.keys())
    if (key.startsWith(sid + ":")) roleCache.delete(key);
};

function authenticate(cached: boolean): RequestHandler {
  return async (req, _res, next) => {
    try {
      const token = req.cookies?.fca_access;
      if (typeof token !== "string")
        throw new HttpError(401, "Sign in to continue.", "UNAUTHENTICATED");
      const claims = verifyToken(token, "access"); // signature + expiry, no database
      const key = claims.sid + ":" + claims.sub;
      let role: Role;
      const hit = cached ? roleCache.get(key) : undefined;
      if (hit && hit.until > Date.now()) role = hit.role;
      else {
        role = await loadRole(claims.sid, claims.sub);
        if (cached) {
          roleCache.set(key, { role, until: Date.now() + CACHE_MS });
          if (roleCache.size > 5_000)
            for (const [k, v] of roleCache)
              if (v.until < Date.now()) roleCache.delete(k);
        }
      }
      req.auth = {
        role:
          role === "admin" && req.cookies?.fca_workspace_view === "assessor"
            ? "assessor"
            : role,
        userId: claims.sub,
        sessionId: claims.sid,
        accessExpiresAt: claims.exp * 1000,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = authenticate(false); // every normal route: always checks the database
export const requireAuthLight = authenticate(true); // polling route only
// Authoritative re-check, used before any real data leaves on the light route
export const reverifyAuth = (userId: string, sessionId: string) =>
  loadRole(sessionId, userId).then(() => undefined);

export const requireAdmin: RequestHandler = (req, _res, next) =>
  req.auth?.role === "admin"
    ? next()
    : next(
        new HttpError(
          403,
          "Only an admin can manage platform files.",
          "ADMIN_REQUIRED",
        ),
      );
