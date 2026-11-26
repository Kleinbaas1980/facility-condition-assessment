import { calculateBuildUp } from "../src/costing/qs-cost-model.js";
import type { Db } from "../configs/database.js";
import type { RateTemplate } from "../src/costing/qs-rate-library.js";
import {
  componentTemplates,
  componentKey,
  presetBuild,
  templateId,
  workOptions,
} from "../src/costing/qs-rate-library.js";
import { rateLibraryInput } from "../src/validation/rate-library.js";
import type { z } from "zod";
import { HttpError } from "../src/utils/errors.js";
export async function loadPlatformRates(db: Db): Promise<RateTemplate[]> {
  return (
    await db.query("SELECT payload FROM platform_rates ORDER BY id")
  ).rows.map((r) => r.payload as RateTemplate);
}
export async function savePlatformRate(
  db: Db,
  userId: string,
  input: z.infer<typeof rateLibraryInput>,
): Promise<RateTemplate[]> {
  if (input.action === "add") {
    if (
      componentTemplates([]).some(
        (r) => componentKey(r) === componentKey(input.component),
      )
    )
      throw new HttpError(
        409,
        "This component already exists. Search for it in the library.",
      );
    const rates = workOptions.map((work) => ({
      ...input.component,
      id: templateId(input.component, work),
      work,
      unit: "",
      build: presetBuild(input.component.component, work),
    }));
    // Advisory lock serializes creation of the five work variants for this component.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      componentKey(input.component),
    ]);
    if (
      (
        await db.query(
          "SELECT id FROM platform_rates WHERE id=ANY($1::text[])",
          [rates.map((r) => r.id)],
        )
      ).rowCount
    )
      throw new HttpError(409, "This component already exists.");
    for (const rate of rates)
      await db.query(
        "INSERT INTO platform_rates(id,payload,updated_by) VALUES($1,$2::jsonb,$3)",
        [rate.id, JSON.stringify(rate), userId],
      );
    return rates;
  }
  const rate = { ...input.rate, id: templateId(input.rate, input.rate.work) };
  const total = calculateBuildUp(rate.build).rate;
  if (total !== null && total > 1e12)
    throw new HttpError(
      400,
      "Calculated rate exceeds the supported per-unit amount.",
    );
  await db.query(
    "INSERT INTO platform_rates(id,payload,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_by=EXCLUDED.updated_by,updated_at=now()",
    [rate.id, JSON.stringify(rate), userId],
  );
  return [rate];
}
