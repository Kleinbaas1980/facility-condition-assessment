import { randomUUID } from "node:crypto";
import type { Db } from "../configs/database.js";
import { HttpError } from "../src/utils/errors.js";
import {
  capture as captureSchema,
  type SyncInput,
} from "../src/validation/project.js";
import { professionFor } from "./assignment.model.js";
import { ownedProject, audit, canAccess } from "./project.model.js";

const DECIMALS: Record<string, number> = {
  extent: 4,
  remedialQuantity: 4,
  unitRate: 2,
  remedialCost: 2,
};

const NUMERIC = new Set([
  ...Object.keys(DECIMALS),
  "pg",
  "fees",
  "contingency",
  "vat",
]);

const num = (f: string, v: unknown) =>
  Number(Number(v).toFixed(DECIMALS[f] ?? 10));
// MUST behave exactly like same() in the client lib/sync.ts
export function same(field: string, a: unknown, b: unknown) {
  if (field === "ratings") {
    const x = a as unknown[],
      y = b as unknown[];
    return (
      Array.isArray(x) &&
      Array.isArray(y) &&
      x.length === y.length &&
      x.every((v, i) => Number(v) === Number(y[i]))
    );
  }
  if (NUMERIC.has(field))
    return a == null || b == null
      ? a == null && b == null
      : num(field, a) === num(field, b);
  return String(a ?? "").trim() === String(b ?? "").trim();
}

const CAPTURE_COLUMNS: Record<string, string> = {
  section: "section",
  component: "component",
  type: "component_type",
  exists: "present",
  extent: "extent",
  extentUnit: "extent_unit",
  remedialQuantity: "remedial_quantity",
  unitRate: "unit_rate",
  remedialCost: "remedial_cost",
  priority: "priority",
  measuredScope: "measured_scope",
  workType: "work_type",
  maintenanceWork: "maintenance_work",
  ratings: "ratings",
  comment: "comment",
};
const DETAIL_COLUMNS: Record<string, string> = {
  name: "name",
  assetNumber: "asset_number",
  client: "client",
  discipline: "discipline",
  assessorName: "assessor_name",
  assessorRole: "assessor_role",
  assessorRegistration: "assessor_registration",
  companyName: "company_name",
  companyAddress: "company_address",
  clientAddress: "client_address",
};
const ASSESSOR_DETAILS = new Set([
  "assessorName",
  "assessorRole",
  "assessorRegistration",
]);
const PRICING = ["pg", "fees", "contingency", "vat"];

const SELECT_CAPTURE = `SELECT c.id,a.name AS area,c.section,e.name AS element,c.component,
 c.component_type AS type,c.present AS exists,c.extent,c.extent_unit AS "extentUnit",
 c.remedial_quantity AS "remedialQuantity",c.unit_rate AS "unitRate",c.remedial_cost AS "remedialCost",
 c.priority,c.measured_scope AS "measuredScope",c.work_type AS "workType",
 c.maintenance_work AS "maintenanceWork",c.ratings,c.comment,c.discipline
 FROM captures c JOIN elements e ON e.id=c.element_id JOIN functional_areas a ON a.id=e.area_id`;

function clean(rows: any[]) {
  for (const r of rows)
    for (const k of Object.keys(DECIMALS))
      r[k] = r[k] == null ? null : Number(r[k]);
  return rows;
}

export async function fetchRows(
  db: Db,
  projectId: string,
  profession: string,
  opts: { ids?: string[]; since?: number } = {},
) {
  const rows = clean(
    (
      await db.query(
        `${SELECT_CAPTURE} WHERE c.project_id=$1 AND ($2::text='' OR c.discipline=$2::text)
       AND ($3::uuid[] IS NULL OR c.id=ANY($3::uuid[]))
       AND ($4::bigint IS NULL OR c.seq>$4::bigint) ORDER BY c.position`,
        [projectId, profession, opts.ids ?? null, opts.since ?? null],
      )
    ).rows,
  );
  if (!rows.length) return rows;
  const photos = (
    await db.query(
      "SELECT id,capture_id,original_name AS name,content_type AS type FROM attachments WHERE project_id=$1 AND kind='photo' AND capture_id=ANY($2::uuid[]) ORDER BY created_at",
      [projectId, rows.map((r) => r.id)],
    )
  ).rows;
  for (const r of rows)
    r.photos = photos
      .filter((p) => p.capture_id === r.id)
      .map((p) => ({ id: p.id, name: p.name, type: p.type }));
  return rows;
}

async function structure(db: Db, projectId: string, profession: string) {
  const areas = (
    await db.query(
      "SELECT id,code,unit,area_type AS type,name,sqm FROM functional_areas WHERE project_id=$1 ORDER BY position",
      [projectId],
    )
  ).rows;
  for (const a of areas) a.sqm = a.sqm == null ? null : Number(a.sqm);
  const elements = (
    await db.query(
      `SELECT e.name,a.name AS area FROM elements e JOIN functional_areas a ON a.id=e.area_id
     WHERE e.project_id=$1 AND ($2::text='' OR EXISTS(SELECT 1 FROM captures c WHERE c.element_id=e.id AND c.discipline=$2::text))
     ORDER BY e.name`,
      [projectId, profession],
    )
  ).rows;
  return { areas, elements };
}

async function projectState(db: Db, projectId: string) {
  const p = (await db.query("SELECT * FROM projects WHERE id=$1", [projectId]))
    .rows[0];
  const details = Object.fromEntries(
    Object.entries(DETAIL_COLUMNS).map(([k, c]) => [k, p[c]]),
  );
  const pricing = (
    await db.query(
      "SELECT pg,fees,contingency,vat FROM project_pricing WHERE project_id=$1",
      [projectId],
    )
  ).rows[0] ?? { pg: 0, fees: 0, contingency: 0, vat: 0 };
  return { seq: Number(p.seq), details, pricing };
}

// Call from any code that changes a capture's visible data (photos, approvals)
export async function touch(
  db: Db,
  projectId: string,
  captureId: string | null,
) {
  const { seq } = (
    await db.query(
      "UPDATE projects SET seq=seq+1,updated_at=now() WHERE id=$1 RETURNING seq",
      [projectId],
    )
  ).rows[0];
  if (captureId)
    await db.query("UPDATE captures SET seq=$1 WHERE id=$2", [seq, captureId]);
  return Number(seq);
}

type Result = {
  id: string;
  status: "applied" | "noop" | "conflict" | "gone" | "rejected";
  error?: string;
};

export async function applySync(
  db: Db,
  projectId: string,
  userId: string,
  input: SyncInput,
  canAdmin: boolean,
) {
  await ownedProject(db, projectId, userId);
  const profession = await professionFor(db, userId); // "" = sees every profession
  // Lock the project row. All writers queue here, so seq order == commit order.
  const locked = (
    await db.query("SELECT * FROM projects WHERE id=$1 FOR UPDATE", [projectId])
  ).rows[0];
  let seq = Number(locked.seq),
    bumped = false;
  const stamp = () => {
    if (!bumped) {
      seq += 1;
      bumped = true;
    }
    return seq;
  };
  const forbid = (m: string) => new HttpError(403, m, "PROFESSION_RESTRICTED");

  // ---- areas ----
  const existingAreas = (
    await db.query(
      "SELECT id,name,code FROM functional_areas WHERE project_id=$1",
      [projectId],
    )
  ).rows;
  const areaIds = new Map<string, string>(
    existingAreas.map((r) => [r.name, r.id]),
  );
  const codes = new Set<string>(existingAreas.map((r) => r.code));
  let areaPos = (
    await db.query(
      "SELECT COALESCE(max(position),-1)+1 AS n FROM functional_areas WHERE project_id=$1",
      [projectId],
    )
  ).rows[0].n;
  for (const a of input.areas ?? []) {
    if (areaIds.has(a.name)) continue; // created already (retry or another user)
    if (!canAdmin) throw forbid("Only an admin can add functional areas.");
    let code = a.code;
    for (let n = codes.size + 1; codes.has(code); n++) code = `FA-${n}`;
    const id = randomUUID();
    await db.query(
      "INSERT INTO functional_areas(id,project_id,code,unit,area_type,name,sqm,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, projectId, code, a.unit, a.type, a.name, a.sqm, areaPos++],
    );
    areaIds.set(a.name, id);
    codes.add(code);
    stamp();
  }

  // ---- elements ----
  const elementIds = new Map<string, string>();
  const key = (areaId: string, name: string) => `${areaId}\u0000${name}`;
  for (const r of (
    await db.query("SELECT id,area_id,name FROM elements WHERE project_id=$1", [
      projectId,
    ])
  ).rows)
    elementIds.set(key(r.area_id, r.name), r.id);
  async function element(area: string, name: string) {
    const areaId = areaIds.get(area);
    if (!areaId) throw new HttpError(400, "Unknown functional area.");
    let id = elementIds.get(key(areaId, name));
    if (!id) {
      if (!canAdmin) throw forbid("Only an admin can add elements.");
      id = randomUUID();
      await db.query(
        "INSERT INTO elements(id,project_id,area_id,name) VALUES($1,$2,$3,$4)",
        [id, projectId, areaId, name],
      );
      elementIds.set(key(areaId, name), id);
      stamp();
    }
    return id;
  }
  for (const e of input.elements ?? []) await element(e.area, e.name);

  // ---- captures: one SAVEPOINT per op so a bad row never blocks the rest ----
  async function guarded(
    id: string,
    fn: () => Promise<Result>,
  ): Promise<Result> {
    await db.query("SAVEPOINT op");
    try {
      const r = await fn();
      await db.query("RELEASE SAVEPOINT op");
      return r;
    } catch (e) {
      await db.query("ROLLBACK TO SAVEPOINT op");
      await db.query("RELEASE SAVEPOINT op");
      return {
        id,
        status: "rejected",
        error: e instanceof Error ? e.message : "Rejected.",
      };
    }
  }
  let nextPos = (
    await db.query(
      "SELECT COALESCE(max(position),-1)+1 AS n FROM captures WHERE project_id=$1",
      [projectId],
    )
  ).rows[0].n;
  const results: Result[] = [];
  for (const op of input.ops ?? []) {
    results.push(
      await guarded(op.id, async () => {
        if (op.kind === "create") {
          const r = op.row;
          if (profession && r.discipline !== profession)
            throw forbid("Only assigned profession findings may be captured.");
          if (
            (
              await db.query(
                "SELECT 1 FROM captures WHERE id=$1 AND project_id=$2",
                [op.id, projectId],
              )
            ).rowCount
          )
            return { id: op.id, status: "noop" };
          const elId = await element(r.area, r.element);
          await db.query(
            `INSERT INTO captures(id,project_id,element_id,section,component,component_type,present,extent,extent_unit,
            remedial_quantity,unit_rate,remedial_cost,priority,measured_scope,work_type,maintenance_work,ratings,comment,discipline,position,seq)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
            [
              op.id,
              projectId,
              elId,
              r.section,
              r.component,
              r.type,
              r.exists,
              r.extent,
              r.extentUnit || "",
              r.remedialQuantity ?? null,
              r.unitRate ?? null,
              r.remedialCost ?? null,
              r.priority || "",
              r.measuredScope || "",
              r.workType || "",
              r.workType === "Compliance" ? "" : r.maintenanceWork || "",
              r.ratings,
              r.comment,
              r.discipline,
              nextPos++,
              stamp(),
            ],
          );
          return { id: op.id, status: "applied" };
        }
        const cur = (
          await db.query(
            `${SELECT_CAPTURE} WHERE c.id=$1 AND c.project_id=$2 FOR UPDATE OF c`,
            [op.id, projectId],
          )
        ).rows[0];
        if (!cur) return { id: op.id, status: "gone" };
        if (profession && cur.discipline !== profession)
          throw forbid("Only assigned profession findings may be captured.");
        clean([cur]);
        const sets: string[] = [],
          vals: unknown[] = [];
        let conflicted = false;
        for (const [field, ch] of Object.entries(op.changes)) {
          if (field !== "element" && !CAPTURE_COLUMNS[field])
            throw new HttpError(400, `Unknown field ${field}.`);
          const parsed = (captureSchema.shape as any)[field].safeParse(
            ch.value,
          );
          if (!parsed.success)
            throw new HttpError(400, `Invalid value for ${field}.`);
          const value = parsed.data;
          if (same(field, cur[field], value)) continue; // already applied
          if (!same(field, cur[field], ch.base)) {
            conflicted = true;
            continue;
          } // someone else changed it
          if (field === "element")
            sets.push(
              `element_id=$${vals.push(await element(cur.area, value))}`,
            );
          else sets.push(`${CAPTURE_COLUMNS[field]}=$${vals.push(value)}`);
        }
        if (sets.length)
          await db.query(
            `UPDATE captures SET ${sets.join(",")},seq=$${vals.push(stamp())} WHERE id=$${vals.push(op.id)}`,
            vals,
          );
        return {
          id: op.id,
          status: conflicted ? "conflict" : sets.length ? "applied" : "noop",
        };
      }),
    );
  }

  // ---- project details (assessors: assessor fields only) ----
  const dSets: string[] = [],
    dVals: unknown[] = [];
  for (const [field, ch] of Object.entries(input.details ?? {})) {
    const col = DETAIL_COLUMNS[field];
    if (!col) throw new HttpError(400, `Unknown field ${field}.`);
    if (!canAdmin && !ASSESSOR_DETAILS.has(field)) continue;
    const value = String(ch.value ?? "").trim();
    if (!value && (field === "name" || field === "discipline")) continue;
    if (same(field, locked[col], value) || !same(field, locked[col], ch.base))
      continue;
    dSets.push(`${col}=$${dVals.push(value)}`);
  }
  if (dSets.length) {
    await db.query(
      `UPDATE projects SET ${dSets.join(",")} WHERE id=$${dVals.push(projectId)}`,
      dVals,
    );
    stamp();
  }

  // ---- pricing (admin only) ----
  if (canAdmin && Object.keys(input.pricing ?? {}).length) {
    const cur = (
      await db.query(
        "SELECT pg,fees,contingency,vat FROM project_pricing WHERE project_id=$1 FOR UPDATE",
        [projectId],
      )
    ).rows[0] ?? { pg: 0, fees: 0, contingency: 0, vat: 0 };
    const next: Record<string, number> = { ...cur };
    let changed = false;
    for (const [field, ch] of Object.entries(input.pricing!)) {
      if (!PRICING.includes(field))
        throw new HttpError(400, `Unknown field ${field}.`);
      const v = Number(ch.value);
      if (
        !(v >= 0 && v <= 100) ||
        same(field, cur[field], v) ||
        !same(field, cur[field], ch.base)
      )
        continue;
      next[field] = v;
      changed = true;
    }
    if (changed) {
      await db.query(
        "INSERT INTO project_pricing(project_id,pg,fees,contingency,vat) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id) DO UPDATE SET pg=EXCLUDED.pg,fees=EXCLUDED.fees,contingency=EXCLUDED.contingency,vat=EXCLUDED.vat",
        [projectId, next.pg, next.fees, next.contingency, next.vat],
      );
      stamp();
    }
  }

  if (bumped) {
    await db.query("UPDATE projects SET seq=$1,updated_at=now() WHERE id=$2", [
      seq,
      projectId,
    ]);
    await audit(db, userId, projectId, "project.updated");
  }
  const rows = await fetchRows(db, projectId, profession, {
    ids: (input.ops ?? []).map((o) => o.id),
  });
  return {
    results,
    rows,
    ...(await projectState(db, projectId)),
    ...(await structure(db, projectId, profession)),
  };
}

export async function changesSince(
  db: Db,
  projectId: string,
  userId: string,
  since: number,
) {
  await ownedProject(db, projectId, userId);
  const profession = await professionFor(db, userId);
  const state = await projectState(db, projectId); // read seq FIRST: rows below can only be newer, never older
  if (state.seq === since) return { seq: since };
  if (state.seq < since) return { seq: state.seq, reset: true };
  const rows = await fetchRows(db, projectId, profession, { since });
  const removed = (
    await db.query(
      "SELECT capture_id FROM change_tombstones WHERE project_id=$1 AND seq>$2",
      [projectId, since],
    )
  ).rows.map((r) => r.capture_id);
  return {
    ...state,
    rows,
    removed,
    ...(await structure(db, projectId, profession)),
  };
}

export async function headSeq(db: Db, projectId: string, userId: string) {
  const r = await db.query(
    `SELECT p.seq FROM projects p WHERE p.id=$1 AND p.deleted_at IS NULL AND ${canAccess("p", "$2")}`,
    [projectId, userId],
  );
  if (!r.rows[0])
    throw new HttpError(404, "Project not found.", "PROJECT_NOT_FOUND");
  return Number(r.rows[0].seq);
}
