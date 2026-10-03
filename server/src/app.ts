import { adminRoutes } from "../routes/admin.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { env } from "../configs/env.js";
import { logger } from "../configs/logger.js";
import { pool } from "../configs/database.js";
import { authRoutes } from "../routes/auth.routes.js";
import { projectRoutes } from "../routes/project.routes.js";
import { protectMutations } from "../middleware/csrf.js";
import { errorHandler } from "../middleware/errors.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  }),
);
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-ID", req.requestId);
  res.set("Cache-Control", "no-store");
  const start = Date.now();
  res.on("finish", () =>
    logger.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      },
      "HTTP request",
    ),
  );
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/ready", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ready" });
  } catch (error) {
    next(error);
  }
});
app.use("/api", protectMutations);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", adminRoutes);
app.use((_req, res) =>
  res.status(404).json({ error: "Route not found.", code: "NOT_FOUND" }),
);
app.use(errorHandler);

// test
