import type { Db } from "../configs/database.js";
import { professionFor } from "./assignment.model.js";
import { ownedProject } from "./project.model.js";
import { HttpError } from "../src/utils/errors.js";
import { touch } from "./sync.model.js";

export async function getAttachment(
  db: Db,
  projectId: string,
  userId: string,
  kind: string,
  photoId?: string,
) {
  await ownedProject(db, projectId, userId);
  const result = photoId
    ? await db.query(
        "SELECT * FROM attachments WHERE project_id=$1 AND id=$2 AND kind='photo'",
        [projectId, photoId],
      )
    : await db.query(
        "SELECT * FROM attachments WHERE project_id=$1 AND kind=$2",
        [projectId, kind],
      );
  if (!result.rows[0]) throw new HttpError(404, "Attachment not found.");
  const file = result.rows[0];
  const profession = await professionFor(db, userId);
  if (profession && file.capture_id) {
    const capture = (
      await db.query(
        "SELECT discipline FROM captures WHERE id=$1 AND project_id=$2",
        [file.capture_id, projectId],
      )
    ).rows[0];
    if (capture?.discipline !== profession)
      throw new HttpError(404, "Attachment not found.");
  }
  return file;
}

export async function remove(
  db: Db,
  projectId: string,
  userId: string,
  kind: string,
  photoId?: string,
) {
  await ownedProject(db, projectId, userId, true);
  const file = await getAttachment(db, projectId, userId, kind, photoId);
  await db.query(
    "INSERT INTO blob_deletions(blob_key) VALUES($1) ON CONFLICT DO NOTHING",
    [file.blob_key],
  );
  await db.query("DELETE FROM attachments WHERE id=$1", [file.id]);
  await touch(db, projectId, file.capture_id ?? null);
  return (
    await db.query(
      "UPDATE projects SET updated_at=now(),version=version+1 WHERE id=$1 RETURNING version",
      [projectId],
    )
  ).rows[0].version as number;
}
