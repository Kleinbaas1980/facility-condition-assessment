import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
// Works from both server/src and server/dist/src without relying on shell cwd.
dotenv.config({
  quiet: true,
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});
dotenv.config({
  quiet: true,
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
});
const flag = z.enum(["true", "false"]).transform((value) => value === "true");
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z
    .string()
    .url()
    .transform((value) => new URL(value).origin),
  DATABASE_URL: z.string().min(1),
  DATABASE_DIRECT_URL: z.string().min(1).optional(),
  DATABASE_SSL: flag.default("true"),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  JWT_ACCESS_SECRET: z.string().min(48),
  JWT_REFRESH_SECRET: z.string().min(48),
  CSRF_SECRET: z.string().min(48),
  JWT_ISSUER: z.string().default("facility-condition-assessment"),
  JWT_AUDIENCE: z.string().default("fca-client"),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  COOKIE_SECURE: flag.default("false"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  BLOB_PROVIDER: z.enum(["vercel", "azure"]).default("vercel"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_STORAGE_CONTAINER: z.string().default("fca-private"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: flag.default("false"),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(3),
  LOG_LEVEL: z.string().default("info"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    "Invalid server environment: " +
      parsed.error.issues
        .map((issue) => issue.path.join(".") + ": " + issue.message)
        .join("; "),
  );
export const env = parsed.data;
if (
  new Set([env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.CSRF_SECRET])
    .size !== 3
)
  throw new Error("Authentication secrets must be different.");
if (
  env.NODE_ENV === "production" &&
  (!env.COOKIE_SECURE ||
    !env.DATABASE_SSL ||
    !env.CLIENT_ORIGIN.startsWith("https://"))
)
  throw new Error(
    "Production requires HTTPS, secure cookies and PostgreSQL TLS.",
  );
if (env.COOKIE_SAME_SITE === "none" && !env.COOKIE_SECURE)
  throw new Error("SameSite=None requires secure cookies.");

if (env.BLOB_PROVIDER === "vercel" && !env.BLOB_READ_WRITE_TOKEN)
  throw new Error(
    "Set BLOB_READ_WRITE_TOKEN for your private Vercel Blob store.",
  );
if (
  env.BLOB_PROVIDER === "azure" &&
  (!env.AZURE_STORAGE_CONNECTION_STRING || !env.AZURE_STORAGE_CONTAINER)
)
  throw new Error(
    "Set the Azure storage connection string and private container.",
  );
