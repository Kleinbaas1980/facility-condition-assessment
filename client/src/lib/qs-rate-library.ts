import { budgetRate } from "./qs-budget-rates";
import { catalog as bca } from "./catalog";
import {
  calculateBuildUp,
  emptyBuildUp,
  type CostBuildUp,
  type CostResource,
} from "./qs-cost-model";
export const workOptions = [
  "Repair",
  "Replacement",
  "Routine maintenance",
  "Preventative maintenance",
  "Refurbishment",
] as const;
export type RateTemplate = {
  id: string;
  discipline: string;
  element: string;
  component: string;
  work: string;
  unit: string;
  build: CostBuildUp;
};
export type CostItem = {
  exists?: string;
  discipline?: string;
  element: string;
  component: string;
  maintenanceWork?: string;
  extentUnit?: string;
  costTemplateId?: string | null;
  costBuildUp?: CostBuildUp | null;
  unitRate?: number | null;
  remedialQuantity?: number | null;
  remedialCost?: number | null;
};
const normal = (s: string) => s.trim().toLowerCase();
export const componentKey = (r: {
  discipline?: string;
  element: string;
  component: string;
}) =>
  [r.discipline || "Architect", r.element, r.component].map(normal).join("|");
export const templateId = (
  r: { discipline?: string; element: string; component: string },
  work: string,
) => componentKey(r) + "|" + normal(work);
export function presetBuild(component: string, work: string): CostBuildUp {
  const descriptions =
    work === "Replacement"
      ? [
          `${component} — supply replacement`,
          `${component} — remove existing and install replacement`,
          `${component} — cart away removed materials`,
        ]
      : work.includes("maintenance")
        ? [
            `${component} — maintenance consumables`,
            `${component} — inspect, service and test`,
          ]
        : work === "Refurbishment"
          ? [
              `${component} — refurbishment materials`,
              `${component} — prepare and refurbish`,
              `${component} — remove waste and clean`,
            ]
          : [
              `${component} — repair materials`,
              `${component} — prepare and repair`,
              `${component} — remove waste and clean`,
            ];
  const resources: CostResource[] = descriptions.map((description, i) => ({
    id: `preset-${i}`,
    category: i === 0 ? "Material" : i === 1 ? "Labour" : "Other",
    description,
    unit: i === 1 ? "hour" : "",
    quantity: null,
    rate: null,
    wastePercent: 0,
  }));
  return { ...emptyBuildUp(), resources };
}
const professionalComponents: CostItem[] = [
  ["Plumber", "Water supply", "Water supply pipework"],
  ["Plumber", "Drainage", "Waste and soil pipework"],
  ["Plumber", "Plumbing", "Sanitary fittings"],
  ["Plumber", "Hot water", "Water heaters and geysers"],
  ["Plumber", "Water supply", "Valves and taps"],
  ["Electrician", "Electrical installation", "Distribution boards"],
  ["Electrician", "Electrical installation", "Cabling and containment"],
  ["Electrician", "Lighting", "Light fittings"],
  ["Electrician", "Electrical installation", "Socket outlets and switches"],
  ["Electrician", "Electrical installation", "Earthing and bonding"],
  ["Structural Engineer", "Substructure", "Foundations"],
  ["Structural Engineer", "Structure", "Concrete columns and beams"],
  ["Structural Engineer", "Structure", "Structural steelwork"],
  ["Structural Engineer", "Structure", "Load-bearing walls"],
  ["Structural Engineer", "Structure", "Concrete slabs"],
  ["Fire Engineer", "Fire protection", "Fire extinguishers"],
  ["Fire Engineer", "Fire protection", "Fire hose reels"],
  ["Fire Engineer", "Fire protection", "Fire hydrants"],
  ["Fire Engineer", "Fire detection", "Fire alarm and detection"],
  ["Fire Engineer", "Fire protection", "Fire doors"],
  ["Mechanical Engineer", "HVAC", "Air conditioning units"],
  ["Mechanical Engineer", "Ventilation", "Fans and ductwork"],
  ["Mechanical Engineer", "Mechanical plant", "Pumps"],
  ["Mechanical Engineer", "HVAC", "Filters and controls"],
  ["Mechanical Engineer", "Vertical transport", "Lifts"],
  ["Civil Engineer", "External works", "Paving and roads"],
  ["Civil Engineer", "Stormwater", "Stormwater drains"],
  ["Civil Engineer", "Drainage", "Manholes"],
  ["Civil Engineer", "External works", "Kerbs and channels"],
  ["Civil Engineer", "External works", "Retaining walls"],
].map(([discipline, element, component]) => ({
  discipline,
  element,
  component,
}));
function defaultTemplate(row: CostItem, work: string): RateTemplate {
  const discipline = row.discipline || "Architect";
  const basis = budgetRate(row.component, discipline, work);
  return {
    id: templateId(row, work),
    discipline,
    element: row.element,
    component: row.component,
    work,
    ...(basis || { unit: "", build: presetBuild(row.component, work) }),
  };
}
export function componentTemplates(
  captures: CostItem[],
  saved: RateTemplate[] = [],
): RateTemplate[] {
  const components = new Map<string, CostItem>();
  for (const row of [...bca.captures, ...professionalComponents, ...captures])
    if (row.element && row.component) components.set(componentKey(row), row);
  const templates = new Map<string, RateTemplate>();
  for (const row of components.values())
    for (const work of workOptions) {
      const template = defaultTemplate(row, work);
      templates.set(template.id, template);
    }
  for (const row of saved) templates.set(row.id, row);
  return [...templates.values()].sort((a, b) =>
    [a.discipline, a.element, a.component, a.work]
      .join()
      .localeCompare([b.discipline, b.element, b.component, b.work].join()),
  );
}
export const readyTemplate = (t: RateTemplate) =>
  !!t.unit.trim() && calculateBuildUp(t.build).complete;
export function matchingTemplates(row: CostItem, saved: RateTemplate[]) {
  const overrides = saved.filter((t) => componentKey(t) === componentKey(row));
  return workOptions
    .map(
      (work) =>
        overrides.find((t) => t.work === work) || defaultTemplate(row, work),
    )
    .filter(readyTemplate);
}
export function templatePatch(
  t: RateTemplate,
  row?: CostItem,
): Partial<CostItem> {
  const differentUnit = row?.extentUnit && !sameUnit(t.unit, row.extentUnit);
  return {
    costTemplateId: t.id,
    costBuildUp: structuredClone(t.build),
    unitRate: calculateBuildUp(t.build).rate,
    extentUnit: t.unit,
    maintenanceWork: t.work,
    remedialCost: null,
    ...(differentUnit ? { remedialQuantity: null } : {}),
  };
}
export function measuredRate(row: CostItem, saved: RateTemplate[]) {
  const { remedialQuantity, extentUnit, maintenanceWork } = row;
  if (
    row.exists?.toLowerCase() === "no" ||
    row.unitRate != null ||
    row.remedialCost != null ||
    !maintenanceWork ||
    !extentUnit ||
    remedialQuantity == null ||
    !Number.isFinite(remedialQuantity) ||
    remedialQuantity <= 0
  )
    return null;
  return (
    matchingTemplates(row, saved).find(
      (t) => t.work === maintenanceWork && sameUnit(t.unit, extentUnit),
    ) ?? null
  );
}
// Copy a rate into an item. Later library edits never silently change an existing BOQ.
export function measurementPatch(
  row: CostItem,
  patch: Partial<CostItem>,
  saved: RateTemplate[],
): Partial<CostItem> {
  if ("costTemplateId" in patch) return patch;
  if ("unitRate" in patch)
    return { ...patch, costTemplateId: undefined, costBuildUp: undefined };
  if (
    !(
      "remedialQuantity" in patch ||
      "extentUnit" in patch ||
      "maintenanceWork" in patch ||
      "component" in patch ||
      "element" in patch
    )
  )
    return patch;
  const next = { ...row, ...patch };
  if (row.costTemplateId) {
    if (
      "component" in patch ||
      "element" in patch ||
      ("maintenanceWork" in patch &&
        patch.maintenanceWork !== row.maintenanceWork) ||
      ("extentUnit" in patch && patch.extentUnit !== row.extentUnit)
    )
      return {
        ...patch,
        costTemplateId: undefined,
        costBuildUp: undefined,
        unitRate: null,
        remedialCost: null,
      };
    return { ...patch, remedialCost: null };
  }
  const rate = measuredRate(next, saved);
  return rate
    ? { ...templatePatch(rate), ...patch, extentUnit: next.extentUnit }
    : patch;
}

export function sameUnit(a: string, b: string) {
  const canonical = (value: string) =>
    ({ m: "lm", m2: "m²", m3: "m³", no: "no." })[normal(value)] ??
    normal(value);
  return canonical(a) === canonical(b);
}
