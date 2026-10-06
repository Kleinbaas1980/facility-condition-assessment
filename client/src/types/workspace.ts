export type Photo = { id: string; name: string; type: string };
export type Capture = {
  id?: string;
  photos?: Photo[];
  area: string;
  section: string;
  element: string;
  component: string;
  type: string;
  exists: string;
  extent: number | null;
  extentUnit?: string;
  remedialCost?: number | null;
  remedialQuantity?: number | null;
  unitRate?: number | null;
  priority?: string;
  measuredScope?: string;
  workType?: string;
  maintenanceWork?: string;
  ratings: number[];
  comment: string;
  discipline: string;
};
export type Area = {
  id?: string;
  code: string;
  unit: string;
  type: string;
  name: string;
  sqm: number | null;
};
export type Payload = {
  areas: Area[];
  elements?: { area: string; name: string }[];
  captures: Capture[];
  pricing?: { pg: number; fees: number; contingency: number; vat: number };
};
export type Project = {
  companyName?: string;
  companyAddress?: string;
  clientAddress?: string;
  id: string;
  seq?: number;
  version: number;
  name: string;
  assetNumber: string;
  client: string;
  discipline: string;
  updatedAt: number;
  sitePlanName?: string;
  facilityLogoName?: string;
  companyLogoName?: string;
  assessorSignatureName?: string;
  assessorName?: string;
  assessorRole?: string;
  assessorRegistration?: string;
  payload: Payload;
};
export type Summary = Omit<Project, "payload">;
export const labels = [
  "C1 Very good",
  "C2 Good",
  "C3 Fair",
  "C4 Poor",
  "C5 Very poor",
];
export const ratingColors = [
  "#19866b",
  "#83ae43",
  "#e4aa2c",
  "#df772e",
  "#c94a47",
];
