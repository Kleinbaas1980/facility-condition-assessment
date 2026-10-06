import { professionFor, scoped, merge } from "./assignment.model.js";
import { randomUUID } from "node:crypto";
import { pool, type Db } from "../configs/database.js";
import { HttpError } from "../src/utils/errors.js";
import type {
  Project,
  ProjectInput,
  Payload,
  Capture,
} from "../types/domain.js";

const canAccess = (alias: string, user: string) => `(
  ${alias}.owner_id=${user}
  OR EXISTS(SELECT 1 FROM users WHERE id=${user} AND role='admin')
  OR EXISTS(SELECT 1 FROM project_assignments pa WHERE pa.project_id=${alias}.id AND pa.user_id=${user})
)`;

export async function ownedProject(
  db: Db,
  id: string,
  userId: string,
  lock = false,
  includeArchived = false,
) {
  const result = await db.query(
    `SELECT p.* FROM projects p
   WHERE p.id=$1 AND ${canAccess("p", "$2")}
   ${includeArchived ? "" : "AND p.deleted_at IS NULL"}
   ${lock ? "FOR UPDATE OF p" : ""}`,
    [id, userId],
  );
  if (!result.rows[0])
    throw new HttpError(404, "Project not found.", "PROJECT_NOT_FOUND");
  return result.rows[0];
}
export async function list(
  userId: string,
  opts: { limit?: number; offset?: number; q?: string } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  const like = opts.q ? `%${opts.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const result = await pool.query(
    `SELECT p.id,p.name,p.asset_number AS "assetNumber",p.client,p.discipline,
            p.assessor_name AS "assessorName",p.version,
            extract(epoch FROM p.updated_at)*1000 AS "updatedAt"
     FROM projects p
     WHERE ${canAccess("p", "$1")} AND p.deleted_at IS NULL
       AND ($2::text IS NULL OR p.name ILIKE $2 OR p.asset_number ILIKE $2 OR p.client ILIKE $2)
     ORDER BY p.updated_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, like, limit, opts.offset ?? 0],
  );
  return result.rows.map((row) => ({
    ...row,
    updatedAt: Number(row.updatedAt),
  }));
}
export async function read(
  db: Db,
  id: string,
  userId: string,
  full = false,
): Promise<Project> {
  const row = await ownedProject(db, id, userId);
  const areas = (
    await db.query(
      "SELECT id,code,unit,area_type AS type,name,sqm FROM functional_areas WHERE project_id=$1 ORDER BY position",
      [id],
    )
  ).rows;
  const elements = (
    await db.query(
      "SELECT e.id,e.name,a.name AS area FROM elements e JOIN functional_areas a ON a.id=e.area_id WHERE e.project_id=$1 ORDER BY e.name",
      [id],
    )
  ).rows;
  const captures = (
    await db.query(
      'SELECT c.id,a.name AS area,c.section,e.name AS element,c.component,c.component_type AS type,c.present AS exists,c.extent,c.extent_unit AS "extentUnit",c.remedial_quantity AS "remedialQuantity",c.unit_rate AS "unitRate",c.remedial_cost AS "remedialCost",c.priority,c.measured_scope AS "measuredScope",c.work_type AS "workType",c.maintenance_work AS "maintenanceWork",c.ratings,c.comment,c.discipline FROM captures c JOIN elements e ON e.id=c.element_id JOIN functional_areas a ON a.id=e.area_id WHERE c.project_id=$1 ORDER BY c.position',
      [id],
    )
  ).rows as Capture[];
  const attachments = (
    await db.query(
      "SELECT id,capture_id,kind,original_name AS name,content_type AS type FROM attachments WHERE project_id=$1 ORDER BY created_at",
      [id],
    )
  ).rows;
  for (const capture of captures) {
    for (const key of [
      "extent",
      "remedialQuantity",
      "unitRate",
      "remedialCost",
    ] as const) {
      const value = capture[key];
      capture[key] = value == null ? null : Number(value);
    }
  }
  for (const area of areas)
    area.sqm = area.sqm == null ? null : Number(area.sqm);
  for (const capture of captures)
    capture.photos = attachments
      .filter((file) => file.capture_id === capture.id)
      .map((file) => ({ id: file.id, name: file.name, type: file.type }));
  const pricing = (
    await db.query(
      "SELECT pg,fees,contingency,vat FROM project_pricing WHERE project_id=$1",
      [id],
    )
  ).rows[0] || { pg: 0, fees: 0, contingency: 0, vat: 0 };
  const project: Project = {
    id,
    seq: Number(row.seq),
    name: row.name,
    assetNumber: row.asset_number,
    client: row.client,
    companyName: row.company_name,
    companyAddress: row.company_address,
    clientAddress: row.client_address,
    discipline: row.discipline,
    assessorName: row.assessor_name,
    assessorRole: row.assessor_role,
    assessorRegistration: row.assessor_registration,

    updatedAt: new Date(row.updated_at).getTime(),
    version: row.version,
    payload: {
      areas,
      elements: elements.map((value) => ({
        area: value.area,
        name: value.name,
      })),
      captures,
      pricing,
    },
  };
  const keys = {
    "site-plan": "sitePlanName",
    "facility-logo": "facilityLogoName",
    "company-logo": "companyLogoName",
    "assessor-signature": "assessorSignatureName",
  } as const;
  for (const file of attachments)
    if (file.kind in keys)
      project[keys[file.kind as keyof typeof keys]] = file.name;
  const profession = await professionFor(db, userId);
  if (profession && !full)
    project.payload = scoped(project.payload, profession);
  return project;
}
export async function audit(
  db: Db,
  userId: string,
  projectId: string,
  action: string,
) {
  await db.query(
    "INSERT INTO audit_events(actor_id,project_id,action) VALUES($1,$2,$3)",
    [userId, projectId, action],
  );
}
async function bulk(
  db: Db,
  table: string,
  definition: string,
  updates: string[],
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;
  // Only constant table/column definitions from the model are interpolated.
  const columns = definition
    .split(",")
    .map((value) => value.trim().split(/\s+/)[0]);
  const conflict = updates.length
    ? "DO UPDATE SET " +
      updates.map((column) => `${column}=EXCLUDED.${column}`).join(",")
    : "DO NOTHING";
  await db.query(
    `INSERT INTO ${table}(${columns.join(",")}) SELECT ${columns.join(",")} FROM jsonb_to_recordset($1::jsonb) AS input(${definition}) ON CONFLICT(id) ${conflict}`,
    [JSON.stringify(rows)],
  );
}
export async function writePayload(
  db: Db,
  id: string,
  payload: Payload,
  actorId?: string,
) {
  if (actorId) {
    const profession = await professionFor(db, actorId);
    if (profession)
      payload = merge(
        (await read(db, id, actorId, true)).payload,
        payload,
        profession,
      );
  }
  const oldAreas = (
    await db.query("SELECT * FROM functional_areas WHERE project_id=$1", [id])
  ).rows;
  const oldCaptures = (
    await db.query("SELECT id FROM captures WHERE project_id=$1", [id])
  ).rows;
  const oldElements = (
    await db.query("SELECT id,area_id,name FROM elements WHERE project_id=$1", [
      id,
    ])
  ).rows;
  const areaIds = new Map<string, string>(),
    keepAreas: string[] = [],
    keepElements: string[] = [],
    keepCaptures: string[] = [];
  const areaBatch: Record<string, unknown>[] = [],
    elementBatch: Record<string, unknown>[] = [],
    captureBatch: Record<string, unknown>[] = [];
  // Defer area-name/code uniqueness until the end to support edits and swaps.
  await db.query(
    "SET CONSTRAINTS functional_areas_project_id_name_key, functional_areas_project_id_code_key DEFERRED",
  );
  for (const [position, area] of payload.areas.entries()) {
    if (area.id && !oldAreas.some((value) => value.id === area.id))
      throw new HttpError(400, "Unknown functional area ID.");
    const areaId =
      area.id ||
      oldAreas.find((value) => value.code === area.code)?.id ||
      randomUUID();
    if (keepAreas.includes(areaId))
      throw new HttpError(400, "Duplicate functional area ID.");
    areaIds.set(area.name, areaId);
    keepAreas.push(areaId);
    areaBatch.push({
      id: areaId,
      project_id: id,
      code: area.code,
      unit: area.unit,
      area_type: area.type,
      name: area.name,
      sqm: area.sqm,
      position,
    });
  }
  await bulk(
    db,
    "functional_areas",
    "id uuid,project_id uuid,code text,unit text,area_type text,name text,sqm numeric,position integer",
    ["code", "unit", "area_type", "name", "sqm", "position"],
    areaBatch,
  );
  const elementIds = new Map<string, string>();
  for (const element of [
    ...(payload.elements || []),
    ...payload.captures.map((capture) => ({
      area: capture.area,
      name: capture.element,
    })),
  ]) {
    const areaId = areaIds.get(element.area);
    if (!areaId) throw new HttpError(400, "Unknown functional area.");
    const key = JSON.stringify([areaId, element.name]);
    if (elementIds.has(key)) continue;
    const elementId =
      oldElements.find(
        (value) => value.area_id === areaId && value.name === element.name,
      )?.id || randomUUID();
    elementIds.set(key, elementId);
    keepElements.push(elementId);
    elementBatch.push({
      id: elementId,
      project_id: id,
      area_id: areaId,
      name: element.name,
    });
  }
  await bulk(
    db,
    "elements",
    "id uuid,project_id uuid,area_id uuid,name text",
    [],
    elementBatch,
  );
  for (const [position, capture] of payload.captures.entries()) {
    if (capture.id && !oldCaptures.some((value) => value.id === capture.id))
      throw new HttpError(400, "Unknown component ID.");
    const captureId = capture.id || randomUUID();
    if (keepCaptures.includes(captureId))
      throw new HttpError(400, "Duplicate component ID.");
    keepCaptures.push(captureId);
    const elementId = elementIds.get(
      JSON.stringify([areaIds.get(capture.area), capture.element]),
    );
    captureBatch.push({
      id: captureId,
      project_id: id,
      element_id: elementId,
      section: capture.section,
      component: capture.component,
      component_type: capture.type,
      present: capture.exists,
      extent: capture.extent,
      extent_unit: capture.extentUnit || "",
      remedial_quantity: capture.remedialQuantity ?? null,
      unit_rate: capture.unitRate ?? null,
      remedial_cost: capture.remedialCost ?? null,
      priority: capture.priority || "",
      measured_scope: capture.measuredScope || "",
      work_type: capture.workType || "",
      maintenance_work:
        capture.workType === "Compliance" ? "" : capture.maintenanceWork || "",
      ratings: capture.ratings,
      comment: capture.comment,
      discipline: capture.discipline,
      position,
    });
  }
  await bulk(
    db,
    "captures",
    "id uuid,project_id uuid,element_id uuid,section text,component text,component_type text,present text,extent numeric,extent_unit text,remedial_quantity numeric,unit_rate numeric,remedial_cost numeric,priority text,measured_scope text,work_type text,maintenance_work text,ratings double precision[],comment text,discipline text,position integer",
    [
      "element_id",
      "section",
      "component",
      "component_type",
      "present",
      "extent",
      "extent_unit",
      "remedial_quantity",
      "unit_rate",
      "remedial_cost",
      "priority",
      "measured_scope",
      "work_type",
      "maintenance_work",
      "ratings",
      "comment",
      "discipline",
      "position",
    ],
    captureBatch,
  );
  if (
    actorId &&
    (await db.query("SELECT role FROM users WHERE id=$1", [actorId])).rows[0]
      ?.role !== "admin"
  ) {
    const removed =
      oldAreas.some((a) => !keepAreas.includes(a.id)) ||
      oldCaptures.some((a) => !keepCaptures.includes(a.id)) ||
      oldElements.some((a) => !keepElements.includes(a.id));
    if (removed)
      throw new HttpError(
        403,
        "Request admin approval before removing an area, element or component.",
        "ADMIN_APPROVAL_REQUIRED",
      );
  }
  await db.query(
    "INSERT INTO blob_deletions(blob_key) SELECT blob_key FROM attachments WHERE project_id=$1 AND capture_id IS NOT NULL AND NOT(capture_id=ANY($2::uuid[])) ON CONFLICT DO NOTHING",
    [id, keepCaptures],
  );
  await db.query(
    "DELETE FROM captures WHERE project_id=$1 AND NOT(id=ANY($2::uuid[]))",
    [id, keepCaptures],
  );
  await db.query(
    "DELETE FROM elements WHERE project_id=$1 AND NOT(id=ANY($2::uuid[]))",
    [id, keepElements],
  );
  await db.query(
    "DELETE FROM functional_areas WHERE project_id=$1 AND NOT(id=ANY($2::uuid[]))",
    [id, keepAreas],
  );
  const pricing = payload.pricing || { pg: 0, fees: 0, contingency: 0, vat: 0 };
  await db.query(
    "INSERT INTO project_pricing(project_id,pg,fees,contingency,vat) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id) DO UPDATE SET pg=EXCLUDED.pg,fees=EXCLUDED.fees,contingency=EXCLUDED.contingency,vat=EXCLUDED.vat",
    [id, pricing.pg, pricing.fees, pricing.contingency, pricing.vat],
  );
}
export async function insert(db: Db, userId: string, input: ProjectInput) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO projects(id,owner_id,name,asset_number,client,discipline,assessor_name,assessor_role,assessor_registration) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id,
      userId,
      input.name,
      input.assetNumber,
      input.client,
      input.discipline,
      input.assessorName || "",
      input.assessorRole || "",
      input.assessorRegistration || "",
    ],
  );
  await db.query(
    "UPDATE projects SET company_name=$1,company_address=$2,client_address=$3 WHERE id=$4",
    [
      input.companyName || "",
      input.companyAddress || "",
      input.clientAddress || "",
      id,
    ],
  );
  await writePayload(db, id, input.payload, userId);
  await audit(db, userId, id, "project.created");
  return read(db, id, userId);
}
// export async function update(
//   db: Db,
//   id: string,
//   userId: string,
//   input: ProjectInput,
// ) {
//   const old = await ownedProject(db, id, userId, true);
//   if (input.version !== old.version)
//     throw new HttpError(
//       409,
//       "This project changed in another window. Reopen it before saving to avoid overwriting changes.",
//       "VERSION_CONFLICT",
//     );
//   await db.query(
//     "UPDATE projects SET company_name=$1,company_address=$2,client_address=$3 WHERE id=$4",
//     [
//       input.companyName || "",
//       input.companyAddress || "",
//       input.clientAddress || "",
//       id,
//     ],
//   );
//   await writePayload(db, id, input.payload, userId);
//   await db.query(
//     "UPDATE projects SET name=$1,asset_number=$2,client=$3,discipline=$4,assessor_name=$5,assessor_role=$6,assessor_registration=$7,version=version+1,updated_at=now() WHERE id=$8",
//     [
//       input.name,
//       input.assetNumber,
//       input.client,
//       input.discipline,
//       input.assessorName || "",
//       input.assessorRole || "",
//       input.assessorRegistration || "",
//       id,
//     ],
//   );
//   await audit(db, userId, id, "project.updated");
//   return read(db, id, userId);
// }
