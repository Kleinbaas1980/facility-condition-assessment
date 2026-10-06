import { randomUUID } from "node:crypto";
import type { Db } from "../configs/database.js";
import { audit } from "./project.model.js";
export async function requestDeletion(
  db: Db,
  projectId: string,
  userId: string,
  kind: string,
  targetId: string,
  name: string,
  reason = "",
) {
  const row = (
    await db.query(
      `INSERT INTO deletion_requests(id,project_id,requested_by,target_kind,target_id,target_name,reason) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(project_id,target_kind,target_id) WHERE status='pending' DO UPDATE SET target_name=deletion_requests.target_name RETURNING id`,
      [randomUUID(), projectId, userId, kind, targetId, name, reason],
    )
  ).rows[0];
  await audit(db, userId, projectId, "deletion.requested");
  return {
    pending: true,
    requestId: row.id,
    message: "Deletion requested. The item remains until an admin approves.",
  };
}
