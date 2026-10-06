type Rec = Record<string, any>;
export const CAPTURE_FIELDS = [
  "section",
  "element",
  "component",
  "type",
  "exists",
  "extent",
  "extentUnit",
  "remedialQuantity",
  "unitRate",
  "remedialCost",
  "priority",
  "measuredScope",
  "workType",
  "maintenanceWork",
  "ratings",
  "comment",
] as const;
export const CREATE_FIELDS = ["area", ...CAPTURE_FIELDS, "discipline"] as const;
export const DETAIL_FIELDS = [
  "name",
  "assetNumber",
  "client",
  "discipline",
  "assessorName",
  "assessorRole",
  "assessorRegistration",
  "companyName",
  "companyAddress",
  "clientAddress",
] as const;
export const PRICING_FIELDS = ["pg", "fees", "contingency", "vat"] as const;

const DECIMALS: Record<string, number> = {
  extent: 4,
  remedialQuantity: 4,
  unitRate: 2,
  remedialCost: 2,
};
const NUMERIC = new Set([...Object.keys(DECIMALS), ...PRICING_FIELDS]);
const num = (f: string, v: unknown) =>
  Number(Number(v).toFixed(DECIMALS[f] ?? 10));

// MUST behave exactly like same() in the server sync.model.ts
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

export const pick = (o: Rec, fields: readonly string[]) =>
  Object.fromEntries(fields.map((f) => [f, o[f]]));

const orEmpty = (f: string, v: unknown) =>
  v === undefined ? (NUMERIC.has(f) ? null : "") : v;

export function diffFields(fields: readonly string[], row: Rec, base: Rec) {
  const out: Record<string, { base: unknown; value: unknown }> = {};
  for (const f of fields)
    if (!same(f, row[f], base[f]))
      out[f] = { base: orEmpty(f, base[f]), value: orEmpty(f, row[f]) };
  return out;
}

// Folds a server copy into the local row WITHOUT losing local edits.
export function fold(
  fields: readonly string[],
  local: Rec,
  base: Rec,
  remote: Rec,
  sent: Record<string, { value: unknown }> = {},
) {
  const row: Rec = { ...local },
    nextBase: Rec = { ...base },
    conflicts: Rec = {};
  let adopted = 0;
  for (const f of fields) {
    if (same(f, remote[f], base[f])) continue; // server unchanged since our base
    if (f in sent && same(f, remote[f], sent[f].value)) {
      nextBase[f] = remote[f];
      continue;
    } // our write landed
    if (same(f, local[f], base[f]) || same(f, local[f], remote[f])) {
      // I never touched it
      row[f] = remote[f];
      nextBase[f] = remote[f];
      adopted++;
    } else conflicts[f] = remote[f]; // both changed it: keep mine, flag
  }
  if ("photos" in remote) {
    row.photos = remote.photos;
    nextBase.photos = remote.photos;
  }
  return { row, base: nextBase, conflicts, adopted };
}

// For project details / pricing: on conflict the server value wins and we report what was lost.
export function foldPlain(
  fields: readonly string[],
  local: Rec,
  base: Rec,
  remote: Rec,
  sent: Record<string, { value: unknown }> = {},
) {
  const r = fold(fields, local, base, remote, sent);
  const lost = Object.entries(r.conflicts).map(([field, theirs]) => ({
    field,
    mine: local[field],
    theirs,
  }));
  for (const l of lost) {
    r.row[l.field] = l.theirs;
    r.base[l.field] = l.theirs;
  }
  return { row: r.row, base: r.base, lost };
}
