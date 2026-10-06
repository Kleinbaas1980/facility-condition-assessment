"use client";
import { useState } from "react";
import { itemAmount } from "@/lib/costing";
import { priorities } from "@/lib/priorities";

type Capture = {
  area: string;
  element: string;
  component: string;
  measuredScope?: string;
  remedialQuantity?: number | null;
  extentUnit?: string;
  unitRate?: number | null;
  remedialCost?: number | null;
  priority?: string;
};
type Pricing = { pg: number; fees: number; contingency: number; vat: number };
type Project = {
  name: string;
  payload: { captures: Capture[]; pricing?: Pricing };
};
const currency = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    n,
  );
export default function QsPricing({
  project,
  onUpdate,
  onPricingChange,
  onSave,
  onBack,
  onReport,
  saving,
  message,
}: {
  project: Project;
  onUpdate: (index: number, patch: Partial<Capture>) => void;
  onPricingChange: (pricing: Pricing) => void;
  onSave: () => Promise<void>;
  onBack: () => void;
  onReport: () => void;
  saving: boolean;
  message: string;
}) {
  const [onlyUnpriced, setOnlyUnpriced] = useState(false);
  const rows = project.payload.captures;
  const unpriced = rows.filter((r) => itemAmount(r) === null).length;
  const direct = rows.reduce((sum, r) => sum + (itemAmount(r) || 0), 0);
  const pricing = project.payload.pricing || {
    pg: 0,
    fees: 0,
    contingency: 0,
    vat: 0,
  };
  const subtotal =
    direct *
    (1 +
      (Number(pricing.pg || 0) +
        Number(pricing.fees || 0) +
        Number(pricing.contingency || 0)) /
        100);
  const total = subtotal * (1 + Number(pricing.vat || 0) / 100);
  return (
    <div className="qs-page">
      <div className="eyebrow">Final costing step · Quantity surveyor</div>
      <div className="toolbar qs-heading">
        <div>
          <h1 className="title">QS pricing</h1>
          <p className="muted">
            {project.name} · Complete prices after the assessor has captured the
            findings.
          </p>
        </div>
        <div className="actions">
          <button className="btn outline" onClick={onBack}>
            ← Assessment
          </button>
          <button
            className="btn"
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save pricing"}
          </button>
          <button className="btn outline" onClick={onReport}>
            View summary report →
          </button>
        </div>
      </div>
      {message && (
        <div
          className={`notice ${/failed|could not/i.test(message) ? "error" : ""}`}
          role="status"
        >
          {message}
        </div>
      )}
      <div className="qs-stats">
        <div>
          <span>Components</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Awaiting price</span>
          <strong>{unpriced}</strong>
        </div>
        <div>
          <span>Direct works</span>
          <strong>{currency(direct)}</strong>
        </div>
        <div>
          <span>Indicative total</span>
          <strong>{currency(total)}</strong>
        </div>
      </div>
      <section className="card qs-card">
        <div className="toolbar">
          <div>
            <h2>Item pricing</h2>
            <p className="muted">
              Enter a quantity and rate to calculate the amount, or enter a
              manual remedial cost.
            </p>
          </div>
          <label className="qs-filter">
            <input
              type="checkbox"
              checked={onlyUnpriced}
              onChange={(e) => setOnlyUnpriced(e.target.checked)}
            />
            Awaiting price only
          </label>
        </div>
        {!rows.length ? (
          <p className="muted">
            No components captured yet. Add findings in the assessment first.
          </p>
        ) : (
          <div className="qs-items">
            {rows
              .map((r, index) => ({ r, index }))
              .filter(({ r }) => !onlyUnpriced || itemAmount(r) === null)
              .map(({ r, index }) => (
                <article className="qs-item" key={index}>
                  <div className="qs-item-title">
                    <div>
                      <span className="section-label">
                        {r.area} · {r.element}
                      </span>
                      <h3>{r.component}</h3>
                      <small
                        className="qs-priority"
                        style={
                          r.priority
                            ? {
                                backgroundColor: `${priorities.find((p) => p.code === r.priority)?.color || "#647b89"}21`,
                                borderColor:
                                  priorities.find((p) => p.code === r.priority)
                                    ?.color || "#647b89",
                              }
                            : undefined
                        }
                      >
                        {r.priority || "No priority"}
                      </small>
                    </div>
                    <strong
                      className={itemAmount(r) === null ? "qs-pending" : ""}
                    >
                      {itemAmount(r) === null
                        ? "Awaiting price"
                        : currency(itemAmount(r)!)}
                    </strong>
                  </div>
                  <div className="qs-inputs">
                    <label>
                      Remedial scope
                      <input
                        value={r.measuredScope || ""}
                        onChange={(e) =>
                          onUpdate(index, { measuredScope: e.target.value })
                        }
                        placeholder="Describe the work"
                      />
                    </label>
                    <label>
                      Quantity
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.remedialQuantity ?? ""}
                        onChange={(e) =>
                          onUpdate(index, {
                            remedialQuantity:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            remedialCost:
                              e.target.value !== "" && r.unitRate != null
                                ? null
                                : r.remedialCost,
                          })
                        }
                      />
                    </label>
                    <label>
                      Unit
                      <select
                        value={r.extentUnit || ""}
                        onChange={(e) =>
                          onUpdate(index, { extentUnit: e.target.value })
                        }
                      >
                        <option value="">Select unit</option>
                        <option value="No.">No.</option>
                        <option value="m">Metre (m)</option>
                        <option value="LM">Linear metre (LM)</option>
                        <option value="m²">Square metre (m²)</option>
                        <option value="sum">Lump sum</option>
                      </select>
                    </label>
                    <label>
                      Rate (R / unit)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.unitRate ?? ""}
                        onChange={(e) =>
                          onUpdate(index, {
                            unitRate:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                            remedialCost:
                              e.target.value !== "" &&
                              r.remedialQuantity != null
                                ? null
                                : r.remedialCost,
                          })
                        }
                      />
                    </label>
                    <label>
                      Manual remedial cost (R)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.remedialCost ?? ""}
                        disabled={
                          r.remedialQuantity != null && r.unitRate != null
                        }
                        onChange={(e) =>
                          onUpdate(index, {
                            remedialCost:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="If no quantity and rate"
                      />
                    </label>
                  </div>
                </article>
              ))}
            {onlyUnpriced && unpriced === 0 && (
              <p className="muted">All captured components have prices.</p>
            )}
          </div>
        )}
      </section>
      <section className="card qs-card">
        <h2>Pricing allowances</h2>
        <div className="qs-allowances">
          {(
            [
              ["pg", "P&G"],
              ["fees", "Professional fees"],
              ["contingency", "Contingency"],
              ["vat", "VAT"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label} (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={pricing[key]}
                onChange={(e) =>
                  onPricingChange({
                    ...pricing,
                    [key]:
                      e.target.value === ""
                        ? 0
                        : Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0),
                          ),
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="muted">
          Allowances are calculated on direct works; VAT is applied to direct
          works plus allowances. Estimates remain indicative until QS review.
        </p>
      </section>
      <div className="actions qs-footer">
        <button className="btn" onClick={() => void onSave()} disabled={saving}>
          {saving ? "Saving…" : "Save pricing"}
        </button>
        <button className="btn outline" onClick={onReport}>
          View summary report →
        </button>
      </div>
    </div>
  );
}
