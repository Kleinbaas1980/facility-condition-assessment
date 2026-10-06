import { professionFor } from "../models/assignment.model.js";
import type { RequestHandler } from "express";
import { pool } from "../configs/database.js";
import { verifyToken } from "../src/utils/tokens.js";
import { HttpError } from "../src/utils/errors.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.fca_access;
    if (typeof token !== "string")
      throw new HttpError(401, "Sign in to continue.", "UNAUTHENTICATED");
    const claims = verifyToken(token, "access");
    const result = await pool.query(
      "SELECT s.id,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.email_verified_at IS NOT NULL",
      [claims.sid, claims.sub],
    );
    if (!result.rowCount)
      throw new HttpError(401, "Please sign in again.", "UNAUTHENTICATED");
    await professionFor(pool, claims.sub);
    req.auth = {
      role:
        result.rows[0].role === "admin" &&
        req.cookies?.fca_workspace_view === "assessor"
          ? "assessor"
          : result.rows[0].role,
      userId: claims.sub,
      sessionId: claims.sid,
      accessExpiresAt: claims.exp * 1000,
    };
    next();
  } catch (error) {
    next(error);
  }
};

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
