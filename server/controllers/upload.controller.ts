import { requestDeletion } from "../models/deletion.model.js";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { pool, transaction } from "../configs/database.js";
import { storage } from "../configs/blob.js";
import {
  ownedProject,
  read,
  audit,
  writePayload,
} from "../models/project.model.js";
import * as attachments from "../models/attachment.model.js";
import {
  validateFile,
  putBlob,
  deleteBlob,
} from "../src/services/blob.service.js";
import { payloadSchema } from "../src/validation/project.js";
import { HttpError } from "../src/utils/errors.js";
import type { AssetKind } from "../types/domain.js";
import { logger } from "../configs/logger.js";
import { z } from "zod";
import { professionFor } from "../models/assignment.model.js";
import { touch } from "../models/sync.model.js";

const projectId = (req: Request) => String(req.params.id);
const kind = (req: Request) => req.params.kind as AssetKind;

async function compensate(key: string) {
  try {
    await deleteBlob(key);
  } catch {
    await pool.query(
      "INSERT INTO blob_deletions(blob_key) VALUES($1) ON CONFLICT DO NOTHING",
      [key],
    );
  }
}

export async function uploadAsset(req: Request, res: Response) {
  const id = projectId(req),
    userId = req.auth!.userId,
    assetKind = kind(req);
  await ownedProject(pool, id, userId);
  const file = await validateFile(req.file, assetKind);
  const key = await putBlob(id, req.file!.buffer, file.contentType);
  try {
    await transaction(async (db) => {
      await ownedProject(db, id, userId, true);
      const old = (
        await db.query(
          "SELECT * FROM attachments WHERE project_id=$1 AND kind=$2",
          [id, assetKind],
        )
      ).rows[0];
      if (old && req.auth!.role !== "admin")
        throw new HttpError(
          403,
          "Request admin approval before replacing the existing file.",
          "ADMIN_APPROVAL_REQUIRED",
        );
      if (old) {
        await db.query(
          "INSERT INTO blob_deletions(blob_key) VALUES($1) ON CONFLICT DO NOTHING",
          [old.blob_key],
        );
        await db.query("DELETE FROM attachments WHERE id=$1", [old.id]);
      }
      await db.query(
        "INSERT INTO attachments(id,project_id,kind,blob_key,original_name,content_type,size_bytes,sha256,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          randomUUID(),
          id,
          assetKind,
          key,
          file.name,
          file.contentType,
          req.file!.size,
          file.sha256,
          userId,
        ],
      );
      await db.query("UPDATE projects SET updated_at=now() WHERE id=$1", [id]);
      await audit(db, userId, id, "attachment.uploaded");
    });
    const names = {
      "site-plan": "sitePlanName",
      "facility-logo": "facilityLogoName",
      "company-logo": "companyLogoName",
      "assessor-signature": "assessorSignatureName",
    } as const;
    res
      .status(201)
      .json({ [names[assetKind as keyof typeof names]]: file.name });
  } catch (error) {
    await compensate(key);
    throw error;
  }
}

export async function uploadPhoto(req: Request, res: Response) {
  const id = projectId(req),
    userId = req.auth!.userId;
  await ownedProject(pool, id, userId);
  const file = await validateFile(req.file, "photo");
  const captureId = z.string().uuid().parse(req.body.captureId);
  const key = await putBlob(id, req.file!.buffer, file.contentType);
  try {
    const photo = await transaction(async (db) => {
      await ownedProject(db, id, userId, true);
      const profession = await professionFor(db, userId);
      const cap = (
        await db.query(
          "SELECT discipline FROM captures WHERE id=$1 AND project_id=$2",
          [captureId, id],
        )
      ).rows[0];
      if (!cap) throw new HttpError(400, "Component not found. Save it first.");
      if (profession && cap.discipline !== profession)
        throw new HttpError(
          403,
          "Only assigned profession findings may be captured.",
          "PROFESSION_RESTRICTED",
        );
      const count = (
        await db.query(
          "SELECT count(*)::int AS total FROM attachments WHERE capture_id=$1",
          [captureId],
        )
      ).rows[0].total;
      if (count >= 10)
        throw new HttpError(400, "A component can have at most 10 photos.");
      const photoId = randomUUID();
      await db.query(
        "INSERT INTO attachments(id,project_id,capture_id,kind,blob_key,original_name,content_type,size_bytes,sha256,created_by) VALUES($1,$2,$3,'photo',$4,$5,$6,$7,$8,$9)",
        [
          photoId,
          id,
          captureId,
          key,
          file.name,
          file.contentType,
          req.file!.size,
          file.sha256,
          userId,
        ],
      );
      await touch(db, id, captureId);
      await audit(db, userId, id, "photo.uploaded");
      return { id: photoId, name: file.name, type: file.contentType };
    });
    res.status(201).json({ photo });
  } catch (error) {
    await compensate(key);
    throw error;
  }
}

export async function download(req: Request, res: Response) {
  const file = await attachments.getAttachment(
    pool,
    projectId(req),
    req.auth!.userId,
    req.params.photoId ? "photo" : String(req.params.kind),
    req.params.photoId ? String(req.params.photoId) : undefined,
  );
  const blob = await storage.read(file.blob_key);
  res.set({
    "Content-Type": file.content_type,
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${file.content_type.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
    "X-Content-Type-Options": "nosniff",
  });
  if (blob.size != null) res.set("Content-Length", String(blob.size));
  try {
    await pipeline(blob.stream, res);
  } catch (error) {
    logger.warn(
      {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : "Stream failed",
      },
      "Attachment stream interrupted",
    );
    if (!res.headersSent) throw error;
  }
}

export async function remove(req: Request, res: Response) {
  const result = await transaction(async (db) => {
    const id = projectId(req),
      userId = req.auth!.userId;
    await ownedProject(db, id, userId, true);
    const file = await attachments.getAttachment(
      db,
      id,
      userId,
      req.params.photoId ? "photo" : String(req.params.kind),
      req.params.photoId ? String(req.params.photoId) : undefined,
    );
    if (req.auth!.role !== "admin") {
      return requestDeletion(
        db,
        id,
        userId,
        "attachment",
        file.id,
        file.original_name,
      );
    }
    const version = await attachments.remove(
      db,
      id,
      userId,
      file.kind,
      file.kind === "photo" ? file.id : undefined,
    );
    await audit(db, userId, id, "attachment.removed");
    return { ok: true, version };
  });
  res.status("pending" in result ? 202 : 200).json(result);
}
