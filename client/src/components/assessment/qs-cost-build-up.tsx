"use client";
import { presetBuild } from "@/lib/qs-rate-library";
import { useState } from "react";
import {
  calculateBuildUp,
  emptyBuildUp,
  resourceAmount,
  resourceCategories,
  type CostBuildUp,
  type CostResource,
} from "@/lib/qs-cost-model";
const money = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    n,
  );
export type BuildUpCapture = {
  id?: string;
  area: string;
  element: string;
  component: string;
  discipline?: string;
  measuredScope?: string;
  remedialQuantity?: number | null;
  extentUnit?: string;
  unitRate?: number | null;
  remedialCost?: number | null;
  maintenanceWork?: string;
  costTemplateId?: string | null;
  costBuildUp?: CostBuildUp;
};
export function Editor({
  row,
  onApply,
  onDirty,
  initialRate,
  librarySaving = false,
  library = false,
}: {
  row: BuildUpCapture;
  onApply: (patch: Partial<BuildUpCapture>) => void | Promise<boolean>;
  onDirty: (dirty: boolean) => void;
  initialRate?: import("@/lib/qs-rate-library").RateTemplate;
  library?: boolean;
  librarySaving?: boolean;
}) {
  const [build, setBuild] = useState<CostBuildUp>(() =>
    row.costBuildUp
      ? JSON.parse(JSON.stringify(row.costBuildUp))
      : initialRate?.build ||
        presetBuild(row.component, row.maintenanceWork || "Repair"),
  );
  const [quantity, setQuantity] = useState<number | null>(
      row.remedialQuantity ?? null,
    ),
    [unit, setUnit] = useState(row.extentUnit || initialRate?.unit || "");
  const [dirty, setDirty] = useState(false),
    [status, setStatus] = useState("");
  const result = calculateBuildUp(build),
    validQuantity =
      quantity !== null && Number.isFinite(quantity) && quantity >= 0;
  const canApply =
    library || (result.complete && validQuantity && !!unit.trim());
  const current = row.costBuildUp
    ? calculateBuildUp(row.costBuildUp).rate
    : null;
  const mismatch = current !== null && row.unitRate !== current;
  const edited = () => {
    setDirty(true);
    onDirty(true);
    setStatus("");
  };
  const change = (patch: Partial<CostBuildUp>) => {
    setBuild((b) => ({ ...b, ...patch }));
    edited();
  };
  function resource(id: string, patch: Partial<CostResource>) {
    setBuild((b) => ({
      ...b,
      resources: b.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    edited();
  }
  const number = (text: string) => (text === "" ? null : Number(text));
  return (
    <>
      {library && !result.complete && (
        <p className="notice">
          This breakdown can be saved as a draft. It becomes available to
          assessors when the work unit and all resource quantities and prices
          are complete.
        </p>
      )}
      <section className="card qs-card">
        <div className="section-label">
          {row.area} · {row.discipline || "Profession not set"}
        </div>
        <h2>
          {row.element} / {row.component}
        </h2>
        <p>
          {row.measuredScope ||
            "No remedial scope entered. Add the work description in item pricing."}
        </p>
        <div className="cost-basis">
          {!library && (
            <label>
              Quantity requiring work
              <input
                type="number"
                min="0"
                step="any"
                value={quantity ?? ""}
                onChange={(e) => {
                  setQuantity(number(e.target.value));
                  edited();
                }}
              />
            </label>
          )}
          <label>
            Finished work unit
            <input
              value={unit}
              placeholder="m², LM, No. or sum"
              onChange={(e) => {
                setUnit(e.target.value);
                edited();
              }}
            />
          </label>
          {!library && (
            <div>
              <span className="muted">Current BOQ rate</span>
              <p>
                <strong>
                  {row.unitRate == null ? "Unpriced" : money(row.unitRate)} /{" "}
                  {row.extentUnit || "unit"}
                </strong>
              </p>
            </div>
          )}
        </div>
        <p className="muted">
          Resource quantities below are for{" "}
          <strong>one {unit || "finished work unit"}</strong>. For lump-sum
          pricing, use quantity 1 and unit “sum”.
        </p>
        {mismatch && (
          <p className="notice">
            The BOQ rate has been edited since this build-up was applied. Apply
            the build-up again to replace it.
          </p>
        )}
      </section>
      <section className="card qs-card">
        <div className="toolbar">
          <div>
            <h2>Resource costs</h2>
            <p className="muted">
              Add the inputs needed to produce one unit of finished work. Prices
              exclude VAT.
            </p>
          </div>
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              change({
                resources: [
                  ...build.resources,
                  {
                    id: crypto.randomUUID(),
                    category: "Material",
                    description: "",
                    unit: "",
                    quantity: null,
                    rate: null,
                    wastePercent: 0,
                  },
                ],
              })
            }
          >
            Add resource
          </button>
        </div>
        {!build.resources.length ? (
          <p className="muted">
            No resources yet. Add material, labour, plant or subcontractor lines
            to start.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="cost-resource-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Resource unit</th>
                  <th>Qty / work unit</th>
                  <th>Rate (R)</th>
                  <th>Wastage (%)</th>
                  <th>Amount (R)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {build.resources.map((r, i) => (
                  <tr key={r.id}>
                    <td>
                      <select
                        aria-label={`Resource ${i + 1} category`}
                        value={r.category}
                        onChange={(e) =>
                          resource(r.id, {
                            category: e.target
                              .value as CostResource["category"],
                          })
                        }
                      >
                        {resourceCategories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Resource ${i + 1} description`}
                        value={r.description}
                        placeholder="e.g. Paint, artisan, scaffold"
                        onChange={(e) =>
                          resource(r.id, { description: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Resource ${i + 1} unit`}
                        value={r.unit}
                        placeholder="L, hour, day"
                        onChange={(e) =>
                          resource(r.id, { unit: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Resource ${i + 1} quantity`}
                        type="number"
                        min="0"
                        step="any"
                        value={r.quantity ?? ""}
                        onChange={(e) =>
                          resource(r.id, { quantity: number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Resource ${i + 1} rate`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.rate ?? ""}
                        onChange={(e) =>
                          resource(r.id, { rate: number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Resource ${i + 1} wastage`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={r.wastePercent}
                        onChange={(e) =>
                          resource(r.id, {
                            wastePercent:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <strong>
                        {resourceAmount(r) === null
                          ? "Incomplete"
                          : money(resourceAmount(r)!)}
                      </strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        aria-label={`Remove resource ${i + 1}`}
                        onClick={() =>
                          change({
                            resources: build.resources.filter(
                              (x) => x.id !== r.id,
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          Line amount = resource quantity × resource rate × (1 + wastage %).
          Leave wastage at zero for labour, plant and subcontractors unless
          required.
        </p>
      </section>
      <div className="cost-panels">
        <section className="card qs-card">
          <h2>Rate allowances</h2>
          <div className="two">
            <label>
              Overheads (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={build.overheadPercent}
                onChange={(e) =>
                  change({ overheadPercent: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Profit markup (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={build.profitPercent}
                onChange={(e) =>
                  change({ profitPercent: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label>
            Supplier / quotation reference
            <input
              value={build.reference}
              onChange={(e) => change({ reference: e.target.value })}
            />
          </label>
          <label>
            Pricing assumptions
            <textarea
              value={build.notes}
              onChange={(e) => change({ notes: e.target.value })}
            />
          </label>
          <p className="muted">
            Overheads apply to resource costs. Profit is a markup on resource
            costs plus overheads. Project P&amp;G, fees, contingency and VAT
            remain in Pricing allowances; avoid duplicating allowances in both
            places.
          </p>
        </section>
        <section className="card qs-card cost-total">
          <h2>Build-up summary</h2>
          <dl>
            {resourceCategories.map((category) => (
              <div key={category}>
                <dt>{category}</dt>
                <dd>
                  {money(
                    build.resources
                      .filter((r) => r.category === category)
                      .reduce((sum, r) => sum + (resourceAmount(r) ?? 0), 0),
                  )}
                </dd>
              </div>
            ))}
            <div>
              <dt>Direct resource cost / unit</dt>
              <dd>{money(result.direct)}</dd>
            </div>
            <div>
              <dt>Overheads</dt>
              <dd>{money(result.overhead)}</dd>
            </div>
            <div>
              <dt>Profit markup</dt>
              <dd>{money(result.profit)}</dd>
            </div>
            <div className="cost-grand">
              <dt>Calculated rate / {unit || "unit"}</dt>
              <dd>
                {result.rate === null ? "Incomplete" : money(result.rate)}
              </dd>
            </div>
            {!library && (
              <div className="cost-grand">
                <dt>
                  Total for {quantity ?? "—"} {unit}
                </dt>
                <dd>
                  {result.rate !== null && validQuantity
                    ? money(Math.round(result.rate * quantity! * 100) / 100)
                    : "Incomplete"}
                </dd>
              </div>
            )}
          </dl>
          {!canApply && (
            <p className="notice">
              Complete every resource description, unit, quantity and rate, then
              enter the finished work quantity and unit.
            </p>
          )}
          <button
            type="button"
            className="btn"
            disabled={!canApply || librarySaving}
            onClick={async () => {
              const applied = await onApply({
                costTemplateId: undefined,
                costBuildUp: JSON.parse(JSON.stringify(build)),
                remedialQuantity: quantity,
                extentUnit: unit.trim(),
                unitRate: result.rate,
                remedialCost: null,
              });
              if (applied === false) return;
              setDirty(false);
              onDirty(false);
              setStatus(
                library
                  ? "Platform rate saved."
                  : "Applied to the BOQ. Select Save pricing to store your changes.",
              );
            }}
          >
            {library
              ? librarySaving
                ? "Saving…"
                : "Save platform rate"
              : "Apply rate to BOQ"}
          </button>
          <p className="muted" role="status">
            {dirty
              ? "Unapplied edits. Apply the rate before saving or leaving this item."
              : status ||
                (library
                  ? "Saved rates are available across projects."
                  : "Apply the calculated rate, then save pricing.")}
          </p>
        </section>
      </div>
    </>
  );
}
