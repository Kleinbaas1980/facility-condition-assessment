export const resourceCategories = [
  "Material",
  "Labour",
  "Plant",
  "Subcontractor",
  "Other",
] as const;
export type ResourceCategory = (typeof resourceCategories)[number];
export type CostResource = {
  id: string;
  category: ResourceCategory;
  description: string;
  unit: string;
  quantity: number | null;
  rate: number | null;
  wastePercent: number;
};
export type CostBuildUp = {
  resources: CostResource[];
  overheadPercent: number;
  profitPercent: number;
  reference: string;
  notes: string;
};
export const emptyBuildUp = (): CostBuildUp => ({
  resources: [],
  overheadPercent: 0,
  profitPercent: 0,
  reference: "",
  notes: "",
});
const nonnegative = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const percent = (v: unknown) => nonnegative(v) && v <= 100;
export const roundCost = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function resourceAmount(row: CostResource): number | null {
  if (
    !row.description.trim() ||
    !row.unit.trim() ||
    !nonnegative(row.quantity) ||
    !nonnegative(row.rate) ||
    !percent(row.wastePercent)
  )
    return null;
  return roundCost(row.quantity * row.rate * (1 + row.wastePercent / 100));
}
export function calculateBuildUp(build: CostBuildUp) {
  const amounts = build.resources.map(resourceAmount);
  const complete =
    build.resources.length > 0 &&
    amounts.every((v) => v !== null) &&
    percent(build.overheadPercent) &&
    percent(build.profitPercent);
  const direct = roundCost(amounts.reduce<number>((s, v) => s + (v ?? 0), 0));
  const overhead = roundCost(
    (direct * (percent(build.overheadPercent) ? build.overheadPercent : 0)) /
      100,
  );
  const profit = roundCost(
    ((direct + overhead) *
      (percent(build.profitPercent) ? build.profitPercent : 0)) /
      100,
  );
  const rate = complete ? roundCost(direct + overhead + profit) : null;
  return { complete, direct, overhead, profit, rate, amounts };
}

// PostgreSQL JSONB may reorder object keys. Sync compares structure, not key order.
export function sameBuildUp(a: unknown, b: unknown): boolean {
  const stable = (value: unknown) =>
    JSON.stringify(value ?? null, (_key, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((key) => [key, v[key]]),
          )
        : v,
    );
  return stable(a) === stable(b);
}
