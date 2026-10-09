import type { RequestHandler } from "express";
import { pool } from "../configs/database.js";
import { digest } from "../src/utils/crypto.js";

const windows = new Map<string, { start: number; hits: number; ttl: number }>();
// PostgreSQL-backed limits work across multiple Express instances.
export function rateLimit(
  scope: string,
  limit: number,
  seconds: number,
): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = scope + ":" + (req.auth?.userId || req.ip || "unknown");
    let w = windows.get(key);
    if (!w || now - w.start > seconds * 1000) {
      w = { start: now, hits: 0, ttl: seconds * 1000 };
      windows.set(key, w);
    }
    if (++w.hits > limit) {
      res.set("Retry-After", String(seconds));
      res
        .status(429)
        .json({
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMITED",
        });
      return;
    }
    if (windows.size > 10_000)
      for (const [k, v] of windows)
        if (now - v.start > v.ttl) windows.delete(k);
    next();
  };
}
