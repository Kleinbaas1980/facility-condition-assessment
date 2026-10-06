import * as deletions from "../controllers/admin.controller.js";
import { Router } from "express";
import { z } from "zod";
import * as projects from "../controllers/project.controller.js";
import * as uploads from "../controllers/upload.controller.js";
import * as reports from "../controllers/report.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import {
  projectSchema,
  restoreSchema,
  syncSchema,
} from "../src/validation/project.js";
import { HttpError } from "../src/utils/errors.js";

export const projectRoutes = Router();

projectRoutes.use(requireAuth, rateLimit("projects", 300, 60));
projectRoutes.get("/", projects.list);
projectRoutes.post("/", requireAdmin, validate(projectSchema), projects.create);
projectRoutes.post("/restore", validate(restoreSchema), projects.restore);
projectRoutes.param("id", (req, _res, next, id) => {
  if (!z.string().uuid().safeParse(id).success)
    return next(new HttpError(400, "Invalid project ID."));
  next();
});
projectRoutes.post("/:id/sync", validate(syncSchema), projects.sync);
projectRoutes.get("/:id/changes", projects.changes);
projectRoutes.post("/:id/deletion-requests", deletions.create);
// projectRoutes.get("/:id/status", projects.status);
projectRoutes.get("/:id/assignments", requireAdmin, projects.listAssignments);
projectRoutes.post("/:id/assignments", requireAdmin, projects.assign);
projectRoutes.delete(
  "/:id/assignments/:userId",
  requireAdmin,
  projects.unassign,
);
projectRoutes.get("/:id", projects.get);
// projectRoutes.patch("/:id", validate(updateProjectSchema), projects.update);
projectRoutes.delete("/:id", projects.archive);
projectRoutes.get("/:id/audit", projects.audit);
projectRoutes.get("/:id/boq.csv", reports.boq);
projectRoutes.post(
  "/:id/report/email",
  rateLimit("report-email", 10, 3600),
  upload,
  reports.email,
);
projectRoutes.post(
  "/:id/photos",
  rateLimit("uploads", 60, 60),
  upload,
  uploads.uploadPhoto,
);
projectRoutes.param("photoId", (_req, _res, next, value) => {
  if (!z.string().uuid().safeParse(value).success)
    return next(new HttpError(400, "Invalid photo ID."));
  next();
});
projectRoutes.get("/:id/photos/:photoId", uploads.download);
projectRoutes.delete("/:id/photos/:photoId", uploads.remove);
projectRoutes.param("kind", (req, _res, next, value) => {
  if (
    ![
      "site-plan",
      "facility-logo",
      "company-logo",
      "assessor-signature",
    ].includes(value)
  )
    return next(new HttpError(404, "Route not found."));
  next();
});
projectRoutes.get("/:id/:kind", uploads.download);
projectRoutes.post(
  "/:id/:kind",
  (req, res, next) =>
    req.params.kind === "assessor-signature"
      ? next()
      : requireAdmin(req, res, next),
  rateLimit("uploads", 60, 60),
  upload,
  uploads.uploadAsset,
);
projectRoutes.delete("/:id/:kind", uploads.remove);
