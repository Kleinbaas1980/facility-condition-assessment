import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../configs/env.js";
import { HttpError } from "./errors.js";
export type Claims = {
  sub: string;
  sid: string;
  kind: "access" | "refresh";
  jti: string;
  exp: number;
};

export function issueAccess(userId: string, sessionId: string) {
  return jwt.sign({ sid: sessionId, kind: "access" }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    subject: userId,
    jwtid: randomUUID(),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_MINUTES * 60,
  });
}

export function issueRefresh(
  userId: string,
  sessionId: string,
  expiresAt: Date,
) {
  return jwt.sign(
    {
      sid: sessionId,
      kind: "refresh",
      exp: Math.floor(expiresAt.getTime() / 1000),
    },
    env.JWT_REFRESH_SECRET,
    {
      algorithm: "HS256",
      subject: userId,
      jwtid: randomUUID(),
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );
}

export function verifyToken(token: string, kind: "access" | "refresh"): Claims {
  try {
    const value = jwt.verify(
      token,
      kind === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET,
      {
        algorithms: ["HS256"],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      },
    );
    if (
      typeof value === "string" ||
      value.kind !== kind ||
      typeof value.sub !== "string" ||
      typeof value.sid !== "string" ||
      typeof value.jti !== "string" ||
      typeof value.exp !== "number"
    )
      throw new Error();
    return value as Claims;
  } catch {
    throw new HttpError(401, "Please sign in again.", "UNAUTHENTICATED");
  }
}
