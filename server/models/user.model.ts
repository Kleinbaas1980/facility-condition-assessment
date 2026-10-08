import { pool, type Db } from "../configs/database.js";
import type { User } from "../types/domain.js";

export type UserRow = {
  profession?: string;
  role: "admin" | "assessor";
  id: string;
  name: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  created_at: Date;
};

export async function byEmail(email: string, db: Db = pool) {
  return (
    await db.query<UserRow>(
      "SELECT u.*,CASE WHEN a.active THEN a.profession ELSE NULL END AS profession FROM users u LEFT JOIN assessor_assignments a ON a.email=u.email WHERE u.email=$1",
      [email],
    )
  ).rows[0];
}

export async function byId(id: string, db: Db = pool) {
  return (
    await db.query<UserRow>(
      "SELECT u.*,CASE WHEN a.active THEN a.profession ELSE NULL END AS profession FROM users u LEFT JOIN assessor_assignments a ON a.email=u.email WHERE u.id=$1",
      [id],
    )
  ).rows[0];
}

export const publicUser = (user: UserRow): User => ({
  profession: user.profession,
  role: user.role,
  id: user.id,
  name: user.name,
  email: user.email,
  verified: !!user.email_verified_at,
  createdAt: user.created_at.toISOString(),
});
