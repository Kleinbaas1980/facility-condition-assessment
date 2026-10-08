import { Dispatch, SetStateAction } from "react";
import { catalog as bca } from "@/lib/catalog";
import {
  Area,
  Capture,
  labels,
  Payload,
  Photo,
  Project,
  ratingColors,
} from "@/types/workspace";
import { disciplines } from "@/lib/disciplines";
import { componentDefinitions } from "@/lib/catalog";
import { priorities } from "@/lib/priorities";
import { itemAmount } from "@/lib/costing";
import { request } from "@/api/http";

interface WorkspaceProps {
  assignedProfession: string;
  setAddingArea: Dispatch<SetStateAction<boolean>>;
  addingArea: boolean;
  addArea(e: React.SubmitEvent): void;
  setNewAreaName: Dispatch<SetStateAction<string>>;
  setNewAreaType: Dispatch<SetStateAction<string>>;
  setNewAreaUnit: Dispatch<SetStateAction<string>>;
  setNewAreaSqm: Dispatch<SetStateAction<string>>;
  setNewAreaProfession: Dispatch<SetStateAction<string>>;
  setFirstAreaElement: Dispatch<SetStateAction<string>>;
  setFirstAreaComponent: Dispatch<SetStateAction<string>>;
  newAreaName: string;
  newAreaType: string;
  newAreaProfession: string;
  project: Project | null;
  newAreaUnit: string;
  newAreaSqm: string;
  firstAreaElement: string;
  catalogElements: string[];
  firstAreaComponent: string;
  catalog: Capture[];
  professionFilter: string;
  setProfessionFilter: Dispatch<SetStateAction<string>>;
  setElement: Dispatch<SetStateAction<string>>;
  setAddingComponent: Dispatch<SetStateAction<boolean>>;
  setAddingElement: Dispatch<SetStateAction<boolean>>;
  professionals: string[];
  visibleAreaIndices: number[];
  areas: Area[];
  selectedAreaIndex: number;
  setAreaIndex: Dispatch<SetStateAction<number>>;
  area: Area;
  deleteArea(): Promise<void>;
  isAdmin: boolean;
  setNewElement: Dispatch<SetStateAction<string>>;
  setCustomElement: Dispatch<SetStateAction<string>>;
  addingElement: boolean;
  addElement(): void;
  newElement: string;
  customElement: string;
  element: string;
  elements: string[];
  setNewComponent: Dispatch<SetStateAction<string>>;
  addingComponent: boolean;
  addComponent(): void;
  newComponent: string;
  catalogComponents: string[];
  customComponent: string;
  setCustomComponent: Dispatch<SetStateAction<string>>;
  current: {
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
    index: number;
  }[];
  customElementFor: number | null;
  setCustomElementFor: Dispatch<SetStateAction<number | null>>;
  update(index: number, patch: Partial<Capture>): void;
  customComponentFor: number | null;
  setCustomComponentFor: Dispatch<SetStateAction<number | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  photoBusy: number | null;
  addPhoto(index: number, file: File): Promise<void>;
  removePhoto(index: number, photoId: string): Promise<void>;
  saving: boolean;
  message: string;
  save(): Promise<boolean>;
  conflicts: Record<string, Record<string, unknown>>;
  resolveConflict(id: string, field: string, choice: "mine" | "theirs"): void;
}

export default function WorkspaceSection({
  assignedProfession,
  setAddingArea,
  addingArea,
  addArea,
  setNewAreaName,
  setNewAreaType,
  setNewAreaUnit,
  setNewAreaSqm,
  setNewAreaProfession,
  setFirstAreaElement,
  setFirstAreaComponent,
  newAreaName,
  newAreaType,
  newAreaProfession,
  project,
  newAreaUnit,
  newAreaSqm,
  firstAreaElement,
  catalogElements,
  firstAreaComponent,
  catalog,
  professionFilter,
  setProfessionFilter,
  setElement,
  setAddingComponent,
  setAddingElement,
  professionals,
  visibleAreaIndices,
  areas,
  selectedAreaIndex,
  setAreaIndex,
  area,
  deleteArea,
  isAdmin,
  setNewElement,
  setCustomElement,
  addingElement,
  addElement,
  newElement,
  customElement,
  element,
  elements,
  setNewComponent,
  addingComponent,
  addComponent,
  newComponent,
  catalogComponents,
  customComponent,
  setCustomComponent,
  current,
  customElementFor,
  setCustomElementFor,
  update,
  customComponentFor,
  setCustomComponentFor,
  setMessage,
  photoBusy,
  addPhoto,
  removePhoto,
  saving,
  message,
  save,
  conflicts,
  resolveConflict,
}: WorkspaceProps) {
  return (
    <>
      {" "}
      <div className="workspace">
        <aside className="card side">
          <div className="toolbar">
            <h2>Functional areas</h2>
            <button
              className="btn ghost"
              disabled={!!assignedProfession}
              onClick={() => setAddingArea((value) => !value)}
              aria-label="Add functional area"
              aria-expanded={addingArea}
            >
              + Add
            </button>
          </div>
          {addingArea && (
            <form className="new-area-form" onSubmit={addArea}>
              <button
                className="btn outline"
                type="button"
                onClick={() => {
                  setAddingArea(false);
                  setNewAreaName("");
                  setNewAreaType("");
                  setNewAreaUnit("");
                  setNewAreaSqm("");
                  setNewAreaProfession("");
                  setFirstAreaElement("");
                  setFirstAreaComponent("");
                }}
              >
                Back to assessment
              </button>
              <h3>New functional area</h3>
              <label>
                Area name
                <input
                  autoFocus
                  required
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="e.g. Ground floor classrooms"
                />
              </label>
              <label>
                Area type
                <select
                  value={newAreaType}
                  onChange={(e) => setNewAreaType(e.target.value)}
                >
                  <option value="">Custom area</option>
                  {[...new Set(bca.areas.map((item) => item.type))]
                    .sort()
                    .map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Profession
                <select
                  value={newAreaProfession}
                  disabled={!!assignedProfession}
                  onChange={(e) => setNewAreaProfession(e.target.value)}
                >
                  <option value="">
                    {project?.discipline || "Architect"} (project default)
                  </option>
                  {disciplines.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Building / floor reference
                <input
                  value={newAreaUnit}
                  onChange={(e) => setNewAreaUnit(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                Area (m²)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newAreaSqm}
                  onChange={(e) => setNewAreaSqm(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label>
                First element
                <input
                  value={firstAreaElement}
                  onChange={(e) => setFirstAreaElement(e.target.value)}
                  list="area-element-options"
                  placeholder="e.g. External facade"
                />
                <datalist id="area-element-options">
                  {catalogElements.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <label>
                First component
                <input
                  value={firstAreaComponent}
                  onChange={(e) => setFirstAreaComponent(e.target.value)}
                  list="area-component-options"
                  placeholder="e.g. Waterproofing"
                />
                <datalist id="area-component-options">
                  {[
                    ...new Set(
                      catalog
                        .filter((item) => item.element === firstAreaElement)
                        .map((item) => item.component),
                    ),
                  ].map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <p className="muted">
                Choose a standard area type for its Architect checklist, or name
                the first element and component. The condition, remedial scope,
                priority and pricing fields open immediately.
              </p>
              <div className="actions">
                <button className="btn" type="submit">
                  Create area
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setAddingArea(false);
                    setNewAreaName("");
                    setNewAreaType("");
                    setNewAreaUnit("");
                    setNewAreaSqm("");
                    setNewAreaProfession("");
                    setFirstAreaElement("");
                    setFirstAreaComponent("");
                  }}
                >
                  Back
                </button>
              </div>
            </form>
          )}
          <label className="side-profession-filter">
            Profession
            <select
              disabled={!!assignedProfession}
              value={professionFilter}
              onChange={(e) => {
                setProfessionFilter(e.target.value);
                setElement("");
                setAddingComponent(false);
                setAddingElement(false);
              }}
            >
              <option value="">All professions</option>
              {professionals.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="area-list">
            {visibleAreaIndices.map((i) => {
              const a = areas[i];
              return (
                <button
                  key={a.code + i}
                  className={`area ${i === selectedAreaIndex ? "active" : ""}`}
                  onClick={() => {
                    setAreaIndex(i);
                    setElement("");
                    setAddingElement(false);
                    setAddingComponent(false);
                  }}
                >
                  {a.name}
                  <small>
                    {a.type}
                    {a.sqm ? ` · ${a.sqm} m²` : ""}
                  </small>
                </button>
              );
            })}
          </div>
          {!visibleAreaIndices.length && (
            <p className="muted">
              {areas.length
                ? "No functional areas have components for this profession."
                : "Add a functional area to begin."}
            </p>
          )}
        </aside>
        <section>
          <div className="card" style={{ marginBottom: 17 }}>
            <div className="toolbar">
              <div>
                <div className="section-label">Selected functional area</div>
                <h2 style={{ margin: "5px 0" }}>
                  {area?.name || "No area selected"}
                </h2>
                <span className="muted">
                  {area?.code} {area?.sqm ? `· ${area.sqm} m²` : ""}
                </span>
              </div>
              <button
                type="button"
                className="btn danger-outline"
                disabled={!area}
                onClick={() => void deleteArea()}
              >
                {isAdmin ? "Delete functional area" : "Request area deletion"}
              </button>

              <button
                className="btn ghost"
                onClick={() => {
                  setAddingElement((v) => !v);
                  setAddingComponent(false);
                  setNewElement("");
                  setCustomElement("");
                }}
                disabled={!area || !!assignedProfession}
              >
                {addingElement ? "Close" : "+ Add element"}
              </button>
            </div>
            {area && addingElement && (
              <form
                className="component-picker"
                onSubmit={(e) => {
                  e.preventDefault();
                  addElement();
                }}
              >
                <label>
                  Element
                  <select
                    value={newElement}
                    onChange={(e) => setNewElement(e.target.value)}
                    required
                  >
                    <option value="">Choose element</option>
                    {catalogElements.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="__custom">+ New element</option>
                  </select>
                </label>
                {newElement === "__custom" && (
                  <label>
                    New element name
                    <input
                      value={customElement}
                      onChange={(e) => setCustomElement(e.target.value)}
                      placeholder="Enter element"
                      required
                    />
                  </label>
                )}
                <button className="btn" type="submit">
                  Add element to this area
                </button>
                <button
                  className="btn outline"
                  type="button"
                  onClick={() => {
                    setAddingElement(false);
                    setNewElement("");
                    setCustomElement("");
                  }}
                >
                  Back
                </button>
              </form>
            )}
            {area && (
              <div className="filters">
                <label style={{ flex: 1 }}>
                  Element
                  <select
                    value={element}
                    onChange={(e) => {
                      setElement(e.target.value);
                      setAddingComponent(false);
                    }}
                  >
                    <option value="">All elements</option>
                    {elements.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn ghost"
                  disabled={!element}
                  onClick={() => {
                    setAddingComponent((v) => !v);
                    setAddingElement(false);
                    setNewComponent("");
                  }}
                >
                  {addingComponent ? "Close" : "+ Add component"}
                </button>
              </div>
            )}
            {area && addingComponent && element && (
              <form
                className="component-picker"
                onSubmit={(e) => {
                  e.preventDefault();
                  addComponent();
                }}
              >
                <div className="component-context">
                  Adding to element <strong>{element}</strong>
                </div>
                <label>
                  Component
                  <select
                    value={newComponent}
                    onChange={(e) => setNewComponent(e.target.value)}
                    required
                  >
                    <option value="">Choose component</option>
                    {catalogComponents.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="__custom">+ New component</option>
                  </select>
                </label>
                {newComponent === "__custom" && (
                  <label>
                    New component name
                    <input
                      value={customComponent}
                      onChange={(e) => setCustomComponent(e.target.value)}
                      placeholder="Enter component"
                      required
                    />
                  </label>
                )}
                <button className="btn" type="submit">
                  Add component to this element
                </button>
                <button
                  className="btn outline"
                  type="button"
                  onClick={() => {
                    setAddingComponent(false);
                    setNewComponent("");
                    setCustomComponent("");
                  }}
                >
                  Back
                </button>
              </form>
            )}
          </div>
          {current.length ? (
            current.map((row) => {
              const sum = row.ratings.reduce((a, b) => a + Number(b || 0), 0);
              const dominant = row.ratings.indexOf(Math.max(...row.ratings));
              const selectedPriority = priorities.find(
                (p) => p.code === row.priority,
              );
              return (
                <article
                  className="finding"
                  key={row.index}
                  style={{
                    borderLeft: `5px solid ${sum > 0 ? ratingColors[dominant] : "#dbe6eb"}`,
                  }}
                >
                  <div className="finding-head">
                    <div>
                      <span className="section-label">
                        {row.section} · {row.element}
                      </span>
                      <h3>{row.component}</h3>
                      <p>{row.type || "Component type not recorded"}</p>
                    </div>
                    <span className="badge">
                      {row.discipline || project?.discipline || "Assessment"}
                    </span>
                  </div>
                  {row.id &&
                    conflicts[row.id] &&
                    Object.entries(conflicts[row.id]).map(([field, theirs]) =>
                      field === "__error" ? (
                        <div className="notice error" key={field}>
                          Not saved: {String(theirs)}. Edit this component to
                          retry.
                        </div>
                      ) : (
                        <div className="notice error" key={field}>
                          <b>{field}</b> was changed by someone else to{" "}
                          <b>{JSON.stringify(theirs)}</b>. Yours:{" "}
                          <b>{JSON.stringify((row as any)[field])}</b>{" "}
                          <button
                            type="button"
                            className="btn outline"
                            onClick={() =>
                              resolveConflict(row.id!, field, "mine")
                            }
                          >
                            Keep mine
                          </button>{" "}
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() =>
                              resolveConflict(row.id!, field, "theirs")
                            }
                          >
                            Use theirs
                          </button>
                        </div>
                      ),
                    )}
                  <div className="details">
                    <label>
                      Element
                      <select
                        value={
                          customElementFor === row.index
                            ? "__custom"
                            : row.element || "__custom"
                        }
                        onChange={(e) => {
                          const custom = e.target.value === "__custom";
                          setCustomElementFor(custom ? row.index : null);
                          update(row.index, {
                            element: custom ? "" : e.target.value,
                            component: "",
                          });
                        }}
                      >
                        {catalogElements.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                        <option value="__custom">+ New element</option>
                      </select>
                      {customElementFor === row.index && (
                        <input
                          aria-label="New element name"
                          value={row.element}
                          placeholder="New element name"
                          onChange={(e) =>
                            update(row.index, {
                              element: e.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                    <label>
                      Component
                      <select
                        value={
                          customComponentFor === row.index
                            ? "__custom"
                            : row.component || "__custom"
                        }
                        onChange={(e) => {
                          const custom = e.target.value === "__custom";
                          setCustomComponentFor(custom ? row.index : null);
                          update(row.index, {
                            component: custom ? "" : e.target.value,
                          });
                        }}
                      >
                        {[
                          ...new Set(
                            catalog
                              .filter((c) => c.element === row.element)
                              .map((c) => c.component)
                              .filter(Boolean),
                          ),
                        ]
                          .sort()
                          .map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        <option value="__custom">+ New component</option>
                      </select>
                      {customComponentFor === row.index && (
                        <input
                          aria-label="New component name"
                          value={row.component}
                          placeholder="New component name"
                          onChange={(e) =>
                            update(row.index, {
                              component: e.target.value,
                            })
                          }
                        />
                      )}
                    </label>
                    <label>
                      Component type
                      <input
                        value={row.type}
                        onChange={(e) =>
                          update(row.index, { type: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Present?
                      <select
                        value={row.exists || ""}
                        onChange={(e) =>
                          update(row.index, { exists: e.target.value })
                        }
                      >
                        <option value="">Select</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Required</option>
                      </select>
                    </label>
                    <label>
                      Extent
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.extent ?? ""}
                        onChange={(e) =>
                          update(row.index, {
                            extent:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Extent unit
                      <select
                        value={row.extentUnit || ""}
                        onChange={(e) =>
                          update(row.index, {
                            extentUnit: e.target.value,
                          })
                        }
                      >
                        <option value="">Select unit</option>
                        <option value="m">Metre (m)</option>
                        <option value="No.">Number (No.)</option>
                        <option value="LM">Linear metre (LM)</option>
                        <option value="m²">Square metre (m²)</option>
                      </select>
                    </label>
                    <label>
                      Remedial quantity
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={row.remedialQuantity ?? ""}
                        onChange={(e) =>
                          update(row.index, {
                            remedialQuantity:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="Quantity requiring work"
                      />
                    </label>
                    <label>
                      Rate (R per unit)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={row.unitRate ?? ""}
                        onChange={(e) =>
                          update(row.index, {
                            unitRate:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="Optional"
                      />
                    </label>
                    <label>
                      {row.unitRate != null && row.remedialQuantity != null
                        ? "Calculated remedial amount (R)"
                        : "Remedial cost (R)"}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                          row.unitRate != null && row.remedialQuantity != null
                            ? (itemAmount(row) ?? "")
                            : (row.remedialCost ?? "")
                        }
                        disabled={
                          row.unitRate != null && row.remedialQuantity != null
                        }
                        onChange={(e) =>
                          update(row.index, {
                            remedialCost:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <div className="details">
                    <label>
                      Priority
                      <select
                        className="priority-select"
                        value={row.priority || ""}
                        style={
                          selectedPriority
                            ? {
                                borderColor: selectedPriority.color,
                                backgroundColor: `${selectedPriority.color}21`,
                                boxShadow: `inset 5px 0 ${selectedPriority.color}`,
                                fontWeight: 750,
                              }
                            : undefined
                        }
                        onChange={(e) =>
                          update(row.index, {
                            priority: e.target.value,
                          })
                        }
                      >
                        <option value="">Not assigned</option>
                        {priorities.map((p) => (
                          <option
                            key={p.code}
                            value={p.code}
                            style={{ color: p.color, fontWeight: 700 }}
                          >
                            {p.code} · {p.label} ({p.window})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Work type
                      <select
                        value={row.workType || ""}
                        onChange={(e) =>
                          update(row.index, {
                            workType: e.target.value,
                            maintenanceWork:
                              e.target.value === "Compliance"
                                ? ""
                                : row.maintenanceWork,
                          })
                        }
                      >
                        <option value="">Select type</option>
                        <option>Condition</option>
                        <option>Compliance</option>
                        <option>Preventative</option>
                        <option>Upgrade</option>
                      </select>
                    </label>
                    {row.workType !== "Compliance" && (
                      <label>
                        Maintenance work
                        <select
                          value={row.maintenanceWork || ""}
                          onChange={(e) =>
                            update(row.index, {
                              maintenanceWork: e.target.value,
                            })
                          }
                        >
                          <option value="">Select maintenance work</option>
                          <option>Repair</option>
                          <option>Replacement</option>
                          <option>Routine maintenance</option>
                          <option>Preventative maintenance</option>
                          <option>Refurbishment</option>
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="section-label">Condition rating (%)</div>
                  <div className="rating">
                    {labels.map((label, i) => (
                      <label
                        key={label}
                        className={`rating-field rating-${i + 1}`}
                      >
                        <span className="rating-label">
                          <span
                            className="rating-dot"
                            style={{ background: ratingColors[i] }}
                          />
                          {label}
                        </span>
                        <input
                          aria-label={`${row.component} ${label} percentage`}
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={row.ratings[i] === 0 ? "" : row.ratings[i]}
                          placeholder="0"
                          onChange={(e) => {
                            const ratings = [...row.ratings];
                            ratings[i] =
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value);
                            update(row.index, { ratings });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div
                    className="condition-bar"
                    role="img"
                    aria-label={`Condition mix: ${labels.map((label, i) => `${label} ${row.ratings[i] || 0}%`).join(", ")}`}
                  >
                    {row.ratings.map((value, i) => (
                      <span
                        key={i}
                        style={{
                          width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`,
                          background: ratingColors[i],
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className={`rating-summary ${row.exists === "Yes" ? (Math.abs(sum - 100) < 0.01 ? "valid" : "invalid") : ""}`}
                  >
                    Total: {sum.toFixed(1)}%{" "}
                    {row.exists === "Yes" && Math.abs(sum - 100) >= 0.01
                      ? "· Must equal 100%"
                      : ""}
                  </div>
                  <label style={{ marginTop: 13 }}>
                    Measured remedial scope
                    <textarea
                      value={row.measuredScope || row.comment || ""}
                      onChange={(e) =>
                        update(row.index, {
                          measuredScope: e.target.value,
                          comment: "No Comments",
                        })
                      }
                      placeholder="Describe the work required to remedy the finding"
                    />
                  </label>
                  {row.id && (
                    <button
                      type="button"
                      className="btn outline"
                      onClick={async () => {
                        if (
                          !project ||
                          !window.confirm(
                            "Request removal of this finding? It will remain until approved.",
                          )
                        )
                          return;
                        const res = await request(
                          `/api/projects/${project.id}/deletion-requests`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              kind: "capture",
                              targetId: row.id,
                              reason: "Requested from assessment capture",
                            }),
                          },
                        );
                        const data: any = await res.json();
                        setMessage(
                          data.message || data.error || "Request submitted.",
                        );
                      }}
                    >
                      Request finding removal
                    </button>
                  )}
                  <div className="photo-section">
                    <div className="section-label">
                      Photos · {row.photos?.length || 0}/10
                    </div>
                    <div className="actions photo-actions">
                      <label className="btn ghost photo-button">
                        Take photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={photoBusy !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void addPhoto(row.index, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <label className="btn outline photo-button">
                        Upload photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={photoBusy !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void addPhoto(row.index, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {photoBusy === row.index && (
                        <span className="muted">Saving photo…</span>
                      )}
                    </div>
                    {!!row.photos?.length && (
                      <div className="photo-grid">
                        {row.photos.map((photo) => (
                          <div className="photo-tile" key={photo.id}>
                            <a
                              href={`/api/projects/${project?.id}/photos/${photo.id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${photo.name}`}
                            >
                              <img
                                src={`/api/projects/${project?.id}/photos/${photo.id}`}
                                alt={`${row.component}: ${photo.name}`}
                                loading="lazy"
                              />
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                void removePhoto(row.index, photo.id)
                              }
                              disabled={photoBusy !== null}
                              aria-label={`Remove ${photo.name}`}
                            >
                              {isAdmin ? "Remove" : "Request removal"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card empty">
              {area
                ? "No components in this selection. Add one above."
                : "Add a functional area to begin."}
            </div>
          )}
        </section>
      </div>
      <div className="assessment-footer actions">
        <button
          type="button"
          className="btn"
          onClick={() => void save()}
          disabled={saving || photoBusy !== null}
        >
          {saving ? "Saving…" : "Save assessment"}
        </button>
        {message && (
          <span role="status" className="muted">
            {message}
          </span>
        )}
      </div>
    </>
  );
}
