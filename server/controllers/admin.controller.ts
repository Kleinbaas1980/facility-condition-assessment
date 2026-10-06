import type { Request, Response } from "express";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { ownedProject, audit } from "../models/project.model.js";
import { requestDeletion } from "../models/deletion.model.js";
import * as attachments from "../models/attachment.model.js";
import { professionFor } from "../models/assignment.model.js";
import { HttpError } from "../src/utils/errors.js";
//test
export async function list(req: Request, res: Response) {
  const status = z
    .enum(["pending", "approved", "rejected"])
    .optional()
    .parse(req.query.status);
  const rows = await pool.query(
    `SELECT d.*,p.name AS project_name,u.name AS requester_name,u.email AS requester_email
   FROM deletion_requests d JOIN projects p ON p.id=d.project_id JOIN users u ON u.id=d.requested_by
   WHERE ($1='admin' OR d.requested_by=$2) AND ($3::text IS NULL OR d.status=$3)
   ORDER BY d.requested_at DESC LIMIT 500`,
    [req.auth!.role, req.auth!.userId, status ?? null],
  );
  res.json(rows.rows);
}
export async function create(req: Request, res: Response) {
  const body = z
    .object({
      kind: z.enum(["capture", "area", "element"]),
      targetId: z.string().uuid(),
      reason: z.string().max(1000).default(""),
    })
    .parse(req.body);
  const pending = await transaction(async (db) => {
    const id = String(req.params.id);
    await ownedProject(db, id, req.auth!.userId, true);
    const table = {
      capture: "captures",
      area: "functional_areas",
      element: "elements",
    }[body.kind];
    const row = (
      await db.query(`SELECT * FROM ${table} WHERE id=$1 AND project_id=$2`, [
        body.targetId,
        id,
      ])
    ).rows[0];
    if (!row) throw new HttpError(404, "Item not found.");
    const profession = await professionFor(db, req.auth!.userId);
    if (profession) {
      const match =
        body.kind === "capture"
          ? row.discipline === profession
          : !!(
              await db.query(
                `SELECT 1 FROM captures c JOIN elements e ON e.id=c.element_id WHERE c.project_id=$1 AND c.discipline=$2 AND ${body.kind === "element" ? "c.element_id=$3" : "e.area_id=$3"} LIMIT 1`,
                [id, profession, body.targetId],
              )
            ).rowCount;
      if (!match)
        throw new HttpError(
          403,
          "Only assigned profession items can be requested for removal.",
          "PROFESSION_RESTRICTED",
        );
    }
    return requestDeletion(
      db,
      id,
      req.auth!.userId,
      body.kind,
      body.targetId,
      row.name || row.component,
      body.reason,
    );
  });
  res.status(202).json(pending);
}
export async function review(req: Request, res: Response) {
  const requestId = z.string().uuid().parse(req.params.id),
    body = z
      .object({
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(1000).default(""),
      })
      .parse(req.body);
  await transaction(async (db) => {
    const d = (
      await db.query("SELECT * FROM deletion_requests WHERE id=$1 FOR UPDATE", [
        requestId,
      ])
    ).rows[0];
    if (!d) throw new HttpError(404, "Request not found.");
    if (d.status !== "pending")
      throw new HttpError(409, "This request has already been reviewed.");
    // Role is re-read under the same transaction; clients cannot elevate JWT claims.
    if (
      (
        await db.query("SELECT role FROM users WHERE id=$1 FOR SHARE", [
          req.auth!.userId,
        ])
      ).rows[0]?.role !== "admin"
    )
      throw new HttpError(403, "Admin access required.");
    await ownedProject(db, d.project_id, req.auth!.userId, true, true);
    if (body.decision === "approved") {
      if (d.target_kind === "project")
        await db.query(
          "UPDATE projects SET deleted_at=now(),version=version+1,updated_at=now() WHERE id=$1",
          [d.project_id],
        );
      else if (d.target_kind === "attachment") {
        const file = (
          await db.query(
            "SELECT * FROM attachments WHERE id=$1 AND project_id=$2",
            [d.target_id, d.project_id],
          )
        ).rows[0];
        if (!file) throw new HttpError(409, "File is no longer available.");
        await attachments.remove(
          db,
          d.project_id,
          req.auth!.userId,
          file.kind,
          file.kind === "photo" ? file.id : undefined,
        );
      } else {
        const table = {
          capture: "captures",
          area: "functional_areas",
          element: "elements",
        }[d.target_kind as "capture" | "area" | "element"];
        const row = (
          await db.query(
            `SELECT id FROM ${table} WHERE id=$1 AND project_id=$2`,
            [d.target_id, d.project_id],
          )
        ).rows[0];
        if (!row) throw new HttpError(409, "Item is no longer available.");
        const predicate =
          d.target_kind === "capture"
            ? "c.id=$2"
            : d.target_kind === "element"
              ? "c.element_id=$2"
              : "e.area_id=$2";
        await db.query(
          `INSERT INTO blob_deletions(blob_key) SELECT a.blob_key FROM attachments a JOIN captures c ON c.id=a.capture_id JOIN elements e ON e.id=c.element_id WHERE a.project_id=$1 AND ${predicate} ON CONFLICT DO NOTHING`,
          [d.project_id, d.target_id],
        );

        const { seq } = (
          await db.query(
            "UPDATE projects SET seq=seq+1,updated_at=now() WHERE id=$1 RETURNING seq",
            [d.project_id],
          )
        ).rows[0];
        await db.query(
          `INSERT INTO change_tombstones(project_id,seq,capture_id)
   SELECT $1,$3::bigint,c.id FROM captures c JOIN elements e ON e.id=c.element_id
   WHERE c.project_id=$1 AND ${predicate}`,
          [d.project_id, d.target_id, seq],
        );

        await db.query(`DELETE FROM ${table} WHERE id=$1 AND project_id=$2`, [
          d.target_id,
          d.project_id,
        ]);
      }
      if (d.target_kind !== "project" && d.target_kind !== "attachment")
        await db.query(
          "UPDATE projects SET version=version+1,updated_at=now() WHERE id=$1",
          [d.project_id],
        );
    }
    await db.query(
      "UPDATE deletion_requests SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3 WHERE id=$4",
      [body.decision, req.auth!.userId, body.note, requestId],
    );
    await audit(
      db,
      req.auth!.userId,
      d.project_id,
      "deletion." + body.decision,
    );
  });
  res.json({ ok: true });
}
