import {
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
  createHmac,
} from "node:crypto";

export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const constantEqual = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const hmac = (text: string, secret: string) =>
  createHmac("sha256", secret).update(text).digest("base64url");

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    derive(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$1$${salt}$${(await scrypt(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const pieces = stored.split("$");
  if (
    pieces.length !== 6 ||
    pieces[0] !== "scrypt" ||
    pieces[1] !== "32768" ||
    pieces[2] !== "8" ||
    pieces[3] !== "1"
  )
    return false;
  const expected = Buffer.from(pieces[5], "hex"),
    actual = await scrypt(password, pieces[4]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
