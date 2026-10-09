import { requestDeletion } from "../models/deletion.model.js";
import type { Request, Response } from "express";
import { pool, transaction } from "../configs/database.js";
import * as model from "../models/project.model.js";
import type { ProjectInput } from "../types/domain.js";
import { HttpError } from "../src/utils/errors.js";
import { z } from "zod";
import * as syncModel from "../models/sync.model.js";
import type { SyncInput } from "../src/validation/project.js";
import { reverifyAuth } from "../middleware/auth.js";

//.
const id = (req: Request) => String(req.params.id);

export async function list(req: Request, res: Response) {
  const q = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(30),
      offset: z.coerce.number().int().min(0).default(0),
      q: z.string().max(100).optional(),
    })
    .parse(req.query);
  res.json(await model.list(req.auth!.userId, q));
}

export async function get(req: Request, res: Response) {
  // read() already checks access. The old version took FOR UPDATE on a GET,
  // so every poll locked the project row and could block a concurrent save.
  res.json(await model.read(pool, id(req), req.auth!.userId));
}

export async function sync(req: Request, res: Response) {
  res.json(
    await transaction((db) =>
      syncModel.applySync(
        db,
        id(req),
        req.auth!.userId,
        req.validated as SyncInput,
        req.auth!.role === "admin",
      ),
    ),
  );
}

export async function changes(req: Request, res: Response) {
  const since = z.coerce
    .number()
    .int()
    .min(0)
    .parse(req.query.since ?? 0);
  const head = await syncModel.headSeq(pool, id(req), req.auth!.userId); // live access check
  if (head === since) {
    res.json({ seq: since });
    return;
  } // the common case: 1 query
  await reverifyAuth(req.auth!.userId, req.auth!.sessionId); // data is leaving: full check
  res.json(
    await syncModel.changesSince(pool, id(req), req.auth!.userId, since),
  );
}

// Tiny payload for polling
// export async function status(req: Request, res: Response) {
//   const row = await model.ownedProject(pool, id(req), req.auth!.userId);
//   res.json({ version: row.version });
// }

export async function listAssignments(req: Request, res: Response) {
  await model.ownedProject(pool, id(req), req.auth!.userId);
  const r = await pool.query(
    `SELECT u.id AS "userId",u.name,u.email,a.profession
     FROM project_assignments pa JOIN users u ON u.id=pa.user_id
     LEFT JOIN assessor_assignments a ON a.email=u.email
     WHERE pa.project_id=$1 ORDER BY u.name`,
    [id(req)],
  );
  res.json(r.rows);
}

export async function assign(req: Request, res: Response) {
  const { email } = z
    .object({ email: z.string().email().max(254) })
    .parse(req.body);
  await transaction(async (db) => {
    await model.ownedProject(db, id(req), req.auth!.userId, true);
    const user = (
      await db.query("SELECT id FROM users WHERE email=lower($1)", [email])
    ).rows[0];
    if (!user) throw new HttpError(404, "No registered user has that email.");
    await db.query(
      "INSERT INTO project_assignments(project_id,user_id,assigned_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [id(req), user.id, req.auth!.userId],
    );
    await model.audit(db, req.auth!.userId, id(req), "project.assigned");
  });
  res.status(201).json({ ok: true });
}

export async function unassign(req: Request, res: Response) {
  const userId = z.string().uuid().parse(req.params.userId);
  await transaction(async (db) => {
    await model.ownedProject(db, id(req), req.auth!.userId, true);
    await db.query(
      "DELETE FROM project_assignments WHERE project_id=$1 AND user_id=$2",
      [id(req), userId],
    );
    await model.audit(db, req.auth!.userId, id(req), "project.unassigned");
  });
  res.json({ ok: true });
}

export async function create(req: Request, res: Response) {
  res
    .status(201)
    .json(
      await transaction((db) =>
        model.insert(db, req.auth!.userId, req.validated as ProjectInput),
      ),
    );
}

// export async function update(req: Request, res: Response) {
//   res.json(
//     await transaction(async (db) => {
//       const input = req.validated as ProjectInput;
//       if (req.auth!.role !== "admin") {
//         const stored = await model.read(db, id(req), req.auth!.userId);
//         for (const key of [
//           "name",
//           "assetNumber",
//           "client",
//           "discipline",
//           "companyName",
//           "companyAddress",
//           "clientAddress",
//         ] as const)
//           Object.assign(input, { [key]: stored[key] });
//       }
//       return model.update(db, id(req), req.auth!.userId, input);
//     }),
//   );
// }

export async function archive(req: Request, res: Response) {
  if (req.auth!.role !== "admin") {
    const pending = await transaction(async (db) => {
      const row = await model.ownedProject(db, id(req), req.auth!.userId, true);
      return requestDeletion(
        db,
        id(req),
        req.auth!.userId,
        "project",
        id(req),
        row.name,
      );
    });
    res.status(202).json(pending);
    return;
  }

  await transaction(async (db) => {
    await model.ownedProject(db, id(req), req.auth!.userId, true);
    await db.query(
      "UPDATE projects SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=$1",
      [id(req)],
    );
    await model.audit(db, req.auth!.userId, id(req), "project.archived");
  });
  res.json({ ok: true });
}

export async function restore(req: Request, res: Response) {
  const { assetNumber, projectName } = req.validated as {
    assetNumber: string;
    projectName?: string;
  };
  const result = await transaction(async (db) => {
    const rows = (
      await db.query(
        "SELECT id FROM projects WHERE owner_id=$1 AND lower(trim(asset_number))=lower($2) AND deleted_at IS NOT NULL AND ($3::text IS NULL OR name=$3) ORDER BY deleted_at DESC FOR UPDATE",
        [req.auth!.userId, assetNumber, projectName || null],
      )
    ).rows;
    if (!rows.length)
      throw new HttpError(
        404,
        "No archived project was found for this asset number.",
      );
    if (rows.length > 1)
      throw new HttpError(
        409,
        "More than one archived project uses this asset number. Enter the project name as well.",
        "AMBIGUOUS_ASSET",
        { needsProjectName: true },
      );
    await db.query(
      "UPDATE projects SET deleted_at=NULL,updated_at=now(),version=version+1 WHERE id=$1",
      [rows[0].id],
    );
    await model.audit(db, req.auth!.userId, rows[0].id, "project.restored");
    return model.read(db, rows[0].id, req.auth!.userId);
  });
  res.json(result);
}

export async function audit(req: Request, res: Response) {
  await model.ownedProject(pool, id(req), req.auth!.userId);
  const rows = await pool.query(
    'SELECT action,occurred_at AS "occurredAt" FROM audit_events WHERE project_id=$1 ORDER BY occurred_at DESC LIMIT 200',
    [id(req)],
  );
  res.json({ events: rows.rows });
}
