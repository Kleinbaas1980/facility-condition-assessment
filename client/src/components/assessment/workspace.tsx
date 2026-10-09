"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import QsPricing from "./qs-pricing";
import WelcomePage from "@/components/welcome-page";
import { catalog as bca } from "@/lib/catalog";
import { request } from "@/api/http";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DeletionApprovals from "./deletion-approvals";
import SummaryReport from "./summary-report";
import SignaturePad from "./signature-pad";
import { itemAmount } from "@/lib/costing";
import { disciplines } from "@/lib/disciplines";
import { standardTemplate } from "@/lib/project-template";
import {
  importFcaTemplate,
  type ImportedTemplate,
} from "@/lib/template-import";
import { downloadQsBoqCsv } from "@/lib/boq-csv";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import ProjectAssignees from "./assignees";
import { Area, Capture, Project, Summary } from "@/types/workspace";
import Header from "../Header";
import WorkspaceSection from "./workspace-section";
import {
  CAPTURE_FIELDS,
  CREATE_FIELDS,
  DETAIL_FIELDS,
  PRICING_FIELDS,
  diffFields,
  fold,
  foldPlain,
  pick,
} from "@/lib/sync";

export default function AssessmentWorkspace() {
  const { user, loading } = useAuth();
  const [workspaceView, setWorkspaceView] = useState<"admin" | "assessor">(
    "admin",
  );
  const canSwitchRole = user?.role === "admin";
  const isAdmin = canSwitchRole && workspaceView === "admin";
  useEffect(() => {
    setWorkspaceView(
      document.cookie.includes("fca_workspace_view=assessor")
        ? "assessor"
        : "admin",
    );
  }, []);
  const router = useRouter();
  const assignedProfession = !canSwitchRole ? user?.profession || "" : "";
  const [projects, setProjects] = useState<Summary[]>([]),
    [project, setProject] = useState<Project | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showQs, setShowQs] = useState(false),
    [showReport, setShowReport] = useState(false),
    [editingDetails, setEditingDetails] = useState(false),
    [setup, setSetup] = useState(false),
    [uploading, setUploading] = useState(false),
    [logoBusy, setLogoBusy] = useState(false),
    [brandingOpen, setBrandingOpen] = useState(true),
    [brandingTabVisible, setBrandingTabVisible] = useState(true),
    [photoBusy, setPhotoBusy] = useState<number | null>(null);
  const [name, setName] = useState(""),
    [asset, setAsset] = useState(""),
    [client, setClient] = useState(""),
    [discipline, setDiscipline] = useState(""),
    [templateMode, setTemplateMode] = useState<"standard" | "own" | "upload">(
      "standard",
    );
  const [templateFile, setTemplateFile] = useState<File | null>(null),
    [importedTemplate, setImportedTemplate] = useState<ImportedTemplate | null>(
      null,
    ),
    [importing, setImporting] = useState(false),
    [importError, setImportError] = useState("");
  const [restoreAsset, setRestoreAsset] = useState(""),
    [restoreName, setRestoreName] = useState(""),
    [restoreNeedsName, setRestoreNeedsName] = useState(false),
    [restoreBusy, setRestoreBusy] = useState(false),
    [restoreMessage, setRestoreMessage] = useState("");
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Summary | null>(null),
    [deleteNameConfirm, setDeleteNameConfirm] = useState(""),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  const [customElementFor, setCustomElementFor] = useState<number | null>(null),
    [customComponentFor, setCustomComponentFor] = useState<number | null>(null);
  const [addingElement, setAddingElement] = useState(false),
    [addingComponent, setAddingComponent] = useState(false),
    [newElement, setNewElement] = useState(""),
    [newComponent, setNewComponent] = useState(""),
    [customElement, setCustomElement] = useState(""),
    [customComponent, setCustomComponent] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");
  useEffect(() => {
    if (assignedProfession) {
      setProfessionFilter(assignedProfession);
      setDiscipline(assignedProfession);
    }
  }, [assignedProfession]);
  const [addingArea, setAddingArea] = useState(false),
    [newAreaName, setNewAreaName] = useState(""),
    [newAreaType, setNewAreaType] = useState(""),
    [newAreaUnit, setNewAreaUnit] = useState(""),
    [newAreaSqm, setNewAreaSqm] = useState(""),
    [newAreaProfession, setNewAreaProfession] = useState("");
  const [firstAreaElement, setFirstAreaElement] = useState("");
  const [firstAreaComponent, setFirstAreaComponent] = useState("");
  const [areaIndex, setAreaIndex] = useState(0),
    [element, setElement] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);

  const projectRef = useRef<Project | null>(null);
  const dirtyRef = useRef(false);
  const seqRef = useRef(0);
  const baseRef = useRef(new Map<string, Capture>()); // last server copy of every row
  const newIdsRef = useRef(new Set<string>()); // rows created locally, not on server yet
  const rejectedRef = useRef(new Set<string>()); // rows the server refused (until edited)
  const pendingElementsRef = useRef<{ area: string; name: string }[]>([]);
  const detailsBaseRef = useRef<Record<string, unknown>>({});
  const pricingBaseRef = useRef<Record<string, unknown>>({});
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveRef = useRef<() => Promise<boolean>>(async () => true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const conflictsRef = useRef<Record<string, Record<string, unknown>>>({});
  const [conflicts, setConflictsState] = useState<
    Record<string, Record<string, unknown>>
  >({});
  function setConflicts(next: Record<string, Record<string, unknown>>) {
    conflictsRef.current = next;
    setConflictsState(next);
  }

  // Edits go through here so the ref is current the instant a save starts.
  function mutate(fn: (p: Project) => Project) {
    const cur = projectRef.current;
    if (!cur) return;
    const next = fn(cur);
    projectRef.current = next;
    setProject(next);
  }
  // Call after loading a project from the server (open / create / restore)
  function adopt(p: Project) {
    baseRef.current = new Map(
      p.payload.captures
        .filter((c) => c.id)
        .map((c) => [c.id!, structuredClone(c)]),
    );
    newIdsRef.current = new Set();
    rejectedRef.current = new Set();
    pendingElementsRef.current = [];
    detailsBaseRef.current = pick(p, DETAIL_FIELDS);
    pricingBaseRef.current = {
      ...(p.payload.pricing ?? { pg: 0, fees: 0, contingency: 0, vat: 0 }),
    };
    seqRef.current = p.seq ?? 0;
    setConflicts({});
    dirtyRef.current = false;
    projectRef.current = p;
    setProject(p);
  }

  const PAGE = 30;
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);

  async function loadProjects(offset: number, q: string) {
    try {
      const res = await request<Summary[]>(
        `/api/projects?limit=${PAGE}&offset=${offset}&q=${encodeURIComponent(q)}`,
      );
      const d: any = await res.json();
      if (!res.ok) {
        setMessage(d.error || "Projects unavailable.");
        return;
      }
      setProjects((prev) => (offset ? [...prev, ...d] : d));
      setHasMore(d.length === PAGE);
    } catch {
      setMessage("Projects unavailable.");
    }
  }

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void loadProjects(0, search), 250);
    return () => clearTimeout(t);
  }, [user, search]);

  const areas = project?.payload.areas || [];
  const all = project?.payload.captures || [];

  const visibleAreaIndices = areas
    .map((_, i) => i)
    .filter(
      (i) =>
        !professionFilter ||
        all.some(
          (row) =>
            row.area === areas[i].name &&
            (row.discipline || project?.discipline || "Unassigned") ===
              professionFilter,
        ) ||
        (!all.some((row) => row.area === areas[i].name) &&
          professionFilter === project?.discipline),
    );
  const selectedAreaIndex = visibleAreaIndices.includes(areaIndex)
    ? areaIndex
    : (visibleAreaIndices[0] ?? -1);
  const area = areas[selectedAreaIndex];
  const current = useMemo(
    () =>
      all
        .map((row, index) => ({ ...row, index }))
        .filter(
          (row) =>
            row.area === area?.name &&
            (!element || row.element === element) &&
            (!professionFilter ||
              (row.discipline || project?.discipline || "Unassigned") ===
                professionFilter),
        ),
    [all, area, element, professionFilter, project?.discipline],
  );
  const elements = [
    ...new Set(
      [
        ...(project?.payload.elements || [])
          .filter((row) => row.area === area?.name)
          .map((row) => row.name),
        ...all
          .filter((row) => row.area === area?.name)
          .map((row) => row.element),
      ].filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const professionals = [
    ...new Set([
      ...(project?.discipline ? [project.discipline] : []),
      ...all.map(
        (row) => row.discipline || project?.discipline || "Unassigned",
      ),
    ]),
  ].sort();
  const valid = all.filter(
    (r) =>
      r.exists !== "Yes" ||
      Math.abs(r.ratings.reduce((a, b) => a + Number(b || 0), 0) - 100) < 0.01,
  ).length;
  const remedialTotal = all.reduce(
    (sum, row) => sum + (itemAmount(row) || 0),
    0,
  );
  const catalog = [...bca.captures, ...all].filter(
    (row) => !assignedProfession || row.discipline === assignedProfession,
  );
  const catalogElements = [
    ...new Set(
      [
        ...catalog.map((row) => row.element),
        ...(project?.payload.elements || []).map((row) => row.name),
      ].filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const catalogComponents = [
    ...new Set(
      catalog
        .filter((row) => row.element === element)
        .map((row) => row.component)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  async function parseTemplate(file: File, sheetName?: string) {
    setTemplateFile(file);
    setImportedTemplate(null);
    setImportError("");
    setImporting(true);
    try {
      const data = await importFcaTemplate(file, discipline, sheetName);
      setImportedTemplate(data);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Could not read template.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function create(e: React.SubmitEvent) {
    e.preventDefault();
    if (templateMode === "upload" && !importedTemplate) {
      setMessage("Choose a valid FCA template first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const payload =
        templateMode === "standard"
          ? standardTemplate(discipline)
          : templateMode === "upload"
            ? {
                areas: importedTemplate!.areas,
                captures: importedTemplate!.captures.map((row) => ({
                  ...row,
                  discipline: row.discipline || discipline,
                })),
              }
            : { areas: [], captures: [] };
      const res = await request("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          assetNumber: asset,
          client,
          discipline,
          payload,
        }),
      });

      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      adopt(data);
      setBrandingOpen(true);
      setBrandingTabVisible(true);
      setShowReport(false);
      setShowQs(false);
      setSetup(true);
      setProjects((prev) => [data, ...prev]);
      setAreaIndex(0);
      setProfessionFilter(assignedProfession);
      setName("");
      setAsset("");
      setClient("");
      setDiscipline("");
      setTemplateMode("standard");
      setTemplateFile(null);
      setImportedTemplate(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  async function open(id: string) {
    setBusy(true);
    setMessage("");
    dirtyRef.current = false;
    try {
      const res = await request(`/api/projects/${id}`);
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      adopt(data);
      setBrandingOpen(
        !(
          data.facilityLogoName &&
          data.companyLogoName &&
          data.assessorSignatureName
        ),
      );
      setBrandingTabVisible(true);
      setShowReport(false);
      setShowQs(false);
      setSetup(false);
      setEditingDetails(false);
      setAreaIndex(0);
      setElement("");
      setProfessionFilter(assignedProfession);
      setAddingComponent(false);
      setAddingElement(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not open project.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreProject(e: React.FormEvent) {
    e.preventDefault();
    setRestoreBusy(true);
    setRestoreMessage("");
    dirtyRef.current = false;
    try {
      const res = await request("/api/projects/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetNumber: restoreAsset,
          projectName: restoreName,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        if (data.needsProjectName) setRestoreNeedsName(true);
        throw Error(data.error || "Could not restore project.");
      }
      setProjects((prev) => [data, ...prev.filter((p) => p.id !== data.id)]);
      adopt(data);
      setBrandingOpen(
        !(
          data.facilityLogoName &&
          data.companyLogoName &&
          data.assessorSignatureName
        ),
      );
      setBrandingTabVisible(true);
      setShowReport(false);
      setShowQs(false);
      setSetup(false);
      setEditingDetails(false);
      setAreaIndex(0);
      setElement("");
      setProfessionFilter(assignedProfession);
      setRestoreAsset("");
      setRestoreName("");
      setRestoreNeedsName(false);
      setMessage(
        "Project restored. You can edit the findings and save your changes.",
      );
    } catch (e) {
      setRestoreMessage(
        e instanceof Error ? e.message : "Could not restore project.",
      );
    } finally {
      setRestoreBusy(false);
    }
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const res = await request(`/api/projects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      if (data.pending) {
        setMessage(data.message);
        setDeleteTarget(null);
        setSelectedDeleteId(null);
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (project?.id === deleteTarget.id) {
        projectRef.current = null;
        setProject(null);
      }
      setDeleteTarget(null);
      setSelectedDeleteId(null);
      setDeleteNameConfirm("");
      setMessage("Project deleted.");
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete project.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  function updateDetails(patch: Partial<Project>) {
    dirtyRef.current = true;
    mutate((p) => ({ ...p, ...patch }));
    setMessage("Unsaved changes");
    scheduleAutosave();
  }

  function update(index: number, patch: Partial<Capture>) {
    dirtyRef.current = true;
    mutate((p) => {
      const captures = [...p.payload.captures];
      const id = captures[index]?.id;
      if (id) rejectedRef.current.delete(id); // edited again, so try again
      captures[index] = { ...captures[index], ...patch };
      return { ...p, payload: { ...p.payload, captures } };
    });
    setMessage("Unsaved changes");
    scheduleAutosave();
  }

  async function addPhoto(index: number, file: File) {
    const row = projectRef.current?.payload.captures[index];
    if (!row?.id) return;
    setPhotoBusy(index);
    setMessage("");
    try {
      if (newIdsRef.current.has(row.id) && !(await save()))
        throw Error("Save this component first, then add photos.");
      const form = new FormData();
      form.append("file", file);
      form.append("captureId", row.id);
      const res = await request<any>(
        `/api/projects/${projectRef.current!.id}/photos`,
        { method: "POST", body: form },
      );
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      mutate((p) => ({
        ...p,
        payload: {
          ...p.payload,
          captures: p.payload.captures.map((r) =>
            r.id === row.id
              ? { ...r, photos: [...(r.photos || []), data.photo] }
              : r,
          ),
        },
      }));
      setMessage("Photo saved to this component");
      void pull();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Photo upload failed.");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function removePhoto(index: number, photoId: string) {
    if (!project) return;
    setPhotoBusy(index);
    setMessage("");
    try {
      const res = await request(
        `/api/projects/${project.id}/photos/${photoId}`,
        { method: "DELETE" },
      );
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      if (data.pending) {
        setMessage(data.message);
        return;
      }
      mutate((prev) => {
        const captures = [...prev.payload.captures];
        captures[index] = {
          ...captures[index],
          photos: (captures[index].photos || []).filter(
            (p) => p.id !== photoId,
          ),
        };
        return { ...prev, payload: { ...prev.payload, captures } };
      });
      setMessage("Photo removed");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not remove photo.");
    } finally {
      setPhotoBusy(null);
    }
  }
  async function uploadPlan(file: File) {
    if (!isAdmin) {
      setMessage("Only an admin can upload platform documents.");
      return;
    }
    if (!project) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await request(`/api/projects/${project.id}/site-plan`, {
        method: "POST",
        body: form,
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      mutate((p) => ({ ...p, sitePlanName: data.sitePlanName }));
      setMessage("Site plan uploaded");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Site plan upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removePlan() {
    if (!project) return;
    setUploading(true);
    try {
      const res = await request(`/api/projects/${project.id}/site-plan`, {
        method: "DELETE",
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error || "Could not remove site plan.");
      if (data.pending) {
        setMessage(data.message);
        return;
      }
      mutate((p) => ({ ...p, sitePlanName: undefined }));
      setMessage("Site plan removed");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not remove site plan.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function uploadProjectImage(
    kind: "company-logo" | "facility-logo" | "assessor-signature",
    file: File,
  ) {
    if (!isAdmin && kind !== "assessor-signature") {
      setMessage("Only an admin can manage platform logos.");
      return;
    }
    if (!project) return;
    setLogoBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await request(`/api/projects/${project.id}/${kind}`, {
        method: "POST",
        body: form,
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error || "Could not upload image.");
      const key =
        kind === "company-logo"
          ? "companyLogoName"
          : kind === "facility-logo"
            ? "facilityLogoName"
            : "assessorSignatureName";
      mutate((prev) => ({ ...prev, [key]: data[key] }));
      setMessage("Image uploaded");
      const cur = projectRef.current!;
      if (
        cur.facilityLogoName &&
        cur.companyLogoName &&
        cur.assessorSignatureName
      ) {
        if (await save()) setBrandingOpen(false);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeProjectImage(
    kind: "company-logo" | "facility-logo" | "assessor-signature",
  ) {
    if (!project) return;
    setLogoBusy(true);
    setMessage("");
    try {
      const res = await request(`/api/projects/${project.id}/${kind}`, {
        method: "DELETE",
      });
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error || "Could not remove image.");
      if (data.pending) {
        setMessage(data.message);
        return;
      }
      const key =
        kind === "company-logo"
          ? "companyLogoName"
          : kind === "facility-logo"
            ? "facilityLogoName"
            : "assessorSignatureName";
      mutate((prev) => ({ ...prev, [key]: undefined }));
      setBrandingOpen(true);
      setMessage("Image removed");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not remove image.");
    } finally {
      setLogoBusy(false);
    }
  }

  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [],
      field = "",
      quote = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quote && text[i + 1] === '"') {
          field += '"';
          i++;
        } else quote = !quote;
      } else if (c === "," && !quote) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quote) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    row.push(field);
    if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }

  async function importComponents(file: File) {
    if (!isAdmin) {
      setMessage("Only an admin can import platform files.");
      return;
    }
    if (!project) return;
    try {
      const rows = parseCsv(await file.text());
      const headers =
        rows.shift()?.map((h) =>
          h
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, ""),
        ) || [];
      const col = (...names: string[]) =>
        headers.findIndex((h) => names.includes(h));
      const ai = col("functionalarea", "area"),
        ei = col("element"),
        ci = col("component"),
        ti = col("type", "componenttype"),
        si = col("section");
      if (ai < 0 || ei < 0 || ci < 0)
        throw Error(
          "CSV needs Functional Area, Element and Component columns.",
        );
      const added: Capture[] = [],
        newAreas = [...areas];
      for (const row of rows) {
        const areaName = row[ai]?.trim(),
          el = row[ei]?.trim(),
          comp = row[ci]?.trim();
        if (!areaName || !el || !comp) continue;
        if (
          !newAreas.some((a) => a.name.toLowerCase() === areaName.toLowerCase())
        )
          newAreas.push({
            code: `FA-${newAreas.length + 1}`,
            unit: "",
            type: "Imported",
            name: areaName,
            sqm: null,
          });
        added.push({
          id: crypto.randomUUID(),
          area: newAreas.find(
            (a) => a.name.toLowerCase() === areaName.toLowerCase(),
          )!.name,
          section: si < 0 ? "" : row[si] || "",
          element: el,
          component: comp,
          type: ti < 0 ? "" : row[ti] || "",
          exists: "",
          extent: null,
          extentUnit: "",
          remedialCost: null,
          ratings: [0, 0, 0, 0, 0],
          comment: "",
          discipline: assignedProfession || project.discipline || "",
        });
      }
      if (!added.length) throw Error("No valid components found in the CSV.");
      dirtyRef.current = true;
      for (const r of added) newIdsRef.current.add(r.id!);
      mutate((p) => ({
        ...p,
        payload: {
          ...p.payload,
          areas: newAreas,
          captures: [...p.payload.captures, ...added],
        },
      }));
      setMessage(
        `${added.length} components added. Review them, then save the assessment.`,
      );
      scheduleAutosave();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  }

  function addArea(e: React.SubmitEvent) {
    e.preventDefault();
    if (!project) return;
    const title = newAreaName.trim(),
      type = newAreaType || "Custom",
      profession = newAreaProfession || project.discipline || "Architect";
    if (!title) return;
    if (
      (type === "Custom" || profession !== "Architect") &&
      (!firstAreaElement.trim() || !firstAreaComponent.trim())
    ) {
      setMessage("Enter an element and component to start this assessment.");
      return;
    }
    if (areas.some((item) => item.name.toLowerCase() === title.toLowerCase())) {
      setMessage("A functional area with this name already exists.");
      return;
    }
    const matching = bca.areas.find((item) => item.type === type);
    const standardRows =
      matching && profession === "Architect"
        ? bca.captures.filter((item) => item.area === matching.name)
        : [];
    let codeNumber = areas.length + 1;
    while (areas.some((item) => item.code === `FA-${codeNumber}`)) codeNumber++;
    const nextArea: Area = {
      code: `FA-${codeNumber}`,
      unit: newAreaUnit.trim(),
      type,
      name: title,
      sqm: newAreaSqm === "" ? null : Number(newAreaSqm),
    };
    const captures: Capture[] = standardRows.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      area: title,
      extent: nextArea.sqm ?? null,
      exists: "",
      ratings: [0, 0, 0, 0, 0],
      remedialQuantity: null,
      unitRate: null,
      remedialCost: null,
      priority: "",
      measuredScope: "",
      workType: "",
      maintenanceWork: "",
      comment: "",
      discipline: profession,
    }));
    if (firstAreaElement.trim() && firstAreaComponent.trim())
      captures.unshift({
        id: crypto.randomUUID(),
        area: title,
        section: "PRIMARY ELEMENTS",
        element: firstAreaElement.trim(),
        component: firstAreaComponent.trim(),
        type: "",
        exists: "",
        extent: nextArea.sqm ?? null,
        extentUnit: "",
        remedialCost: null,
        remedialQuantity: null,
        unitRate: null,
        priority: "",
        measuredScope: "",
        workType: "",
        maintenanceWork: "",
        ratings: [0, 0, 0, 0, 0],
        comment: "",
        discipline: profession,
      });
    if (!captures.length) {
      setMessage(
        "Choose an area type with standard components or enter a first element and component.",
      );
      return;
    }
    dirtyRef.current = true;
    for (const c of captures) newIdsRef.current.add(c.id!);
    mutate((p) => ({
      ...p,
      payload: {
        ...p.payload,
        areas: [...p.payload.areas, nextArea],
        captures: [...p.payload.captures, ...captures],
      },
    }));
    setAreaIndex(areas.length);
    setProfessionFilter(assignedProfession);
    setElement("");
    setAddingElement(false);
    setAddingComponent(false);
    setNewAreaName("");
    setNewAreaType("");
    setNewAreaUnit("");
    setNewAreaSqm("");
    setNewAreaProfession("");
    setFirstAreaElement("");
    setFirstAreaComponent("");
    setAddingArea(false);
    setMessage(
      `${captures.length} component${captures.length === 1 ? " is" : "s are"} ready for assessment. Save assessment when finished.`,
    );
    scheduleAutosave();
  }

  function addElement() {
    if (!project || !area) return;
    const title = (
      newElement === "__custom" ? customElement : newElement
    ).trim();
    if (!title) {
      setMessage("Choose or name an element.");
      return;
    }
    const existing = elements.find(
      (v) => v.toLowerCase() === title.toLowerCase(),
    );
    if (existing) {
      setElement(existing);
      setAddingElement(false);
      setMessage("Element selected. Add a component under it.");
      return;
    }
    dirtyRef.current = true;
    pendingElementsRef.current.push({ area: area.name, name: title });
    mutate((p) => ({
      ...p,
      payload: {
        ...p.payload,
        elements: [
          ...(p.payload.elements || []),
          { area: area.name, name: title },
        ],
      },
    }));
    setElement(title);
    setAddingElement(false);
    setNewElement("");
    setCustomElement("");
    setMessage("Element added. Add components under it, then save assessment.");
    scheduleAutosave();
  }

  function addComponent() {
    if (!project || !area) return;
    const el = element.trim();
    const title = (
      newComponent === "__custom" ? customComponent : newComponent
    ).trim();
    if (!el || !title) {
      setMessage(
        "Select an element and choose a component, or enter a new component name.",
      );
      return;
    }
    const row: Capture = {
      id: crypto.randomUUID(),
      area: area.name,
      section: "",
      element: el,
      component: title,
      type: "",
      exists: "",
      extent: null,
      extentUnit: "",
      remedialCost: null,
      remedialQuantity: null,
      unitRate: null,
      priority: "",
      measuredScope: "",
      workType: "Condition",
      maintenanceWork: "",
      ratings: [0, 0, 0, 0, 0],
      comment: "",
      discipline: assignedProfession || project.discipline || "",
    };
    dirtyRef.current = true;
    newIdsRef.current.add(row.id!);
    mutate((p) => ({
      ...p,
      payload: {
        ...p.payload,
        captures: [...p.payload.captures, row],
      },
    }));
    setElement(el);
    setAddingComponent(false);
    setNewElement("");
    setNewComponent("");
    setCustomElement("");
    setCustomComponent("");
    setMessage("Component added. Save assessment to keep it.");
    scheduleAutosave();
  }

  async function refreshApprovedProject() {
    await pull();
    void loadProjects(0, search);
  }

  async function deleteArea() {
    if (!project || !area) return;
    const targetId = area.id;
    if (!targetId) {
      setMessage(
        "Save assessment and reopen this project before requesting removal.",
      );
      return;
    }
    if (
      !window.confirm(
        `Request deletion of ${area.name} and all its elements, findings and photos? An admin must approve.`,
      )
    )
      return;
    try {
      const res = await request(
        `/api/projects/${project.id}/deletion-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "area", targetId }),
        },
      );
      const data: any = await res.json();
      if (!res.ok) throw Error(data.error);
      setMessage(data.message);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not request deletion.",
      );
    }
  }

  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    // one request at a time, never dropped
    const run = queueRef.current.then(fn);
    queueRef.current = run.catch(() => undefined);
    return run;
  }
  const save = () => exclusive(runSave);
  saveRef.current = save;

  function collect(p: Project) {
    const ops: any[] = [],
      sent = new Map<string, Record<string, any>>();
    let incomplete = 0;
    for (const row of p.payload.captures) {
      const id = row.id;
      if (!id || rejectedRef.current.has(id)) continue;
      if (!row.component?.trim() || !row.element?.trim()) {
        incomplete++;
        continue;
      }
      if (newIdsRef.current.has(id)) {
        ops.push({ kind: "create", id, row: pick(row, CREATE_FIELDS) });
        continue;
      }
      const base = baseRef.current.get(id);
      if (!base) continue;
      const changes = diffFields(CAPTURE_FIELDS, row, base);
      for (const f of Object.keys(conflictsRef.current[id] ?? {}))
        delete changes[f]; // wait for the user's decision
      if (Object.keys(changes).length) {
        ops.push({ kind: "patch", id, changes });
        sent.set(id, changes);
      }
    }
    return {
      ops,
      sent,
      incomplete,
      details: diffFields(DETAIL_FIELDS, p, detailsBaseRef.current),
      pricing: p.payload.pricing
        ? diffFields(PRICING_FIELDS, p.payload.pricing, pricingBaseRef.current)
        : {},
      areas: p.payload.areas
        .filter((a) => !a.id)
        .map(({ code, unit, type, name, sqm }) => ({
          code,
          unit,
          type,
          name,
          sqm,
        })),
      elements: pendingElementsRef.current,
    };
  }
  const hasPending = (c: ReturnType<typeof collect>) =>
    !!(
      c.ops.length ||
      c.areas.length ||
      c.elements.length ||
      Object.keys(c.details).length ||
      Object.keys(c.pricing).length
    );

  // Folds a server response (save result OR /changes poll) into local state. Never discards local edits.
  function applyServer(d: any, c?: ReturnType<typeof collect>) {
    const remote = new Map<string, Capture>(
      (d.rows ?? []).map((r: Capture) => [r.id!, r]),
    );
    const removed = new Set<string>([
      ...(d.removed ?? []),
      ...(d.results ?? [])
        .filter((r: any) => r.status === "gone")
        .map((r: any) => r.id),
    ]);
    const next = { ...conflictsRef.current };
    for (const r of d.results ?? [])
      if (r.status === "rejected") {
        rejectedRef.current.add(r.id);
        next[r.id] = { __error: r.error };
      }
    let byOthers = 0;
    const notes: string[] = [];
    mutate((p) => {
      const seen = new Set<string>();
      let captures = p.payload.captures
        .filter((r) => !removed.has(r.id!))
        .map((row) => {
          seen.add(row.id!);
          const srv = remote.get(row.id!);
          if (!srv) return row;
          if (newIdsRef.current.has(row.id!)) {
            // our create landed
            baseRef.current.set(row.id!, structuredClone(srv));
            newIdsRef.current.delete(row.id!);
            return { ...row, photos: srv.photos };
          }
          const base = baseRef.current.get(row.id!) ?? srv;
          const f = fold(CAPTURE_FIELDS, row, base, srv, c?.sent.get(row.id!));
          baseRef.current.set(row.id!, f.base as Capture);
          if (f.adopted) byOthers++;
          if (Object.keys(f.conflicts).length)
            next[row.id!] = { ...(next[row.id!] ?? {}), ...f.conflicts };
          return f.row as Capture;
        });
      for (const [id, srv] of remote) // rows other people created
        if (!seen.has(id) && !removed.has(id)) {
          captures.push(structuredClone(srv));
          baseRef.current.set(id, structuredClone(srv));
          byOthers++;
        }
      for (const id of removed) {
        baseRef.current.delete(id);
        delete next[id];
      }

      const unsaved = p.payload.areas.filter(
        (a) => !a.id && !d.areas.some((s: Area) => s.name === a.name),
      );
      const d1 = foldPlain(
        DETAIL_FIELDS,
        p,
        detailsBaseRef.current,
        d.details,
        c?.details,
      );
      detailsBaseRef.current = d1.base;
      const pr = p.payload.pricing ?? {
        pg: 0,
        fees: 0,
        contingency: 0,
        vat: 0,
      };
      const d2 = foldPlain(
        PRICING_FIELDS,
        pr,
        pricingBaseRef.current,
        d.pricing,
        c?.pricing,
      );
      pricingBaseRef.current = d2.base;
      for (const l of [...d1.lost, ...d2.lost])
        notes.push(
          `"${l.field}": your value "${l.mine}" was not saved because it was changed to "${l.theirs}" by someone else`,
        );
      return {
        ...(d1.row as Project),
        payload: {
          ...p.payload,
          captures,
          areas: [...d.areas, ...unsaved],
          elements: [...d.elements, ...pendingElementsRef.current],
          pricing: d2.row as any,
        },
      };
    });
    setConflicts(next);
    if (notes.length) setMessage(notes.join(". "));
    else if (byOthers && !c)
      setMessage(
        `${byOthers} component${byOthers === 1 ? "" : "s"} updated by other users.`,
      );
  }

  async function runSave(): Promise<boolean> {
    const p = projectRef.current;
    if (!p) return false;
    const c = collect(p);
    if (!hasPending(c)) {
      dirtyRef.current = false;
      if (c.incomplete)
        setMessage(
          `${c.incomplete} component(s) need an element and component name before they can be saved.`,
        );
      return true;
    }
    setSaving(true);
    try {
      const chunks: any[][] = [];
      for (let i = 0; i < c.ops.length; i += 200)
        chunks.push(c.ops.slice(i, i + 200));
      if (!chunks.length) chunks.push([]);
      for (const [i, ops] of chunks.entries()) {
        const body = {
          ops,
          ...(i === 0
            ? {
                areas: c.areas,
                elements: c.elements,
                details: c.details,
                pricing: c.pricing,
              }
            : {}),
        };
        const res = await request<any>(`/api/projects/${p.id}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data: any = await res.json();
        if (!res.ok) throw Error(data.error || "Save failed.");
        if (i === 0) pendingElementsRef.current = [];
        applyServer(data, c);
      }
      const now = projectRef.current!;
      dirtyRef.current = hasPending(collect(now));
      const nConflicts = Object.keys(conflictsRef.current).length;
      const badRatings = now.payload.captures.filter(
        (r) =>
          r.exists === "Yes" &&
          Math.abs(r.ratings.reduce((a, b) => a + Number(b || 0), 0) - 100) >=
            0.01,
      ).length;
      setMessage(
        nConflicts
          ? `Saved. ${nConflicts} component(s) need your decision (changed by someone else).`
          : badRatings
            ? `Saved as draft. ${badRatings} component(s) need C1–C5 ratings totaling 100%.`
            : "All changes saved",
      );
      setProjects((prev) =>
        prev.map((x) =>
          x.id === now.id
            ? {
                ...x,
                name: now.name,
                client: now.client,
                assetNumber: now.assetNumber,
                discipline: now.discipline,
              }
            : x,
        ),
      );
      setEditingDetails(false);
      void pull();
      return true;
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Save failed. Your entries are still on this screen and will be retried.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function pull() {
    return exclusive(async () => {
      const p = projectRef.current;
      if (!p) return;
      const res = await request<any>(
        `/api/projects/${p.id}/changes?since=${seqRef.current}`,
      );
      if (res.status === 404) {
        projectRef.current = null;
        setProject(null);
        setShowReport(false);
        setShowQs(false);
        setMessage("This project was removed or is no longer assigned to you.");
        return;
      }
      if (!res.ok) return;
      const d = await res.json();
      if (d.reset) {
        setMessage(
          "This project was reset on the server. Reopen it to continue.",
        );
        return;
      }
      if (!d.rows) {
        seqRef.current = d.seq;
        return;
      }
      applyServer(d);
      seqRef.current = d.seq; // ONLY advance from /changes, never from your own save
    });
  }

  function flush() {
    clearTimeout(timerRef.current);
    clearTimeout(maxTimerRef.current);
    maxTimerRef.current = undefined;
    void saveRef.current();
  }
  function scheduleAutosave() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 4_000); // 4 s after the last keystroke
    if (!maxTimerRef.current) maxTimerRef.current = setTimeout(flush, 30_000); // and at least every 30 s
  }

  useEffect(() => {
    if (!project?.id) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 15_000,
      lastInput = Date.now();

    async function loop() {
      if (stopped) return;
      const idle = Date.now() - lastInput;
      if (!document.hidden && idle < 10 * 60_000) {
        const changed = await pull();
        delay = changed! ? 15_000 : Math.min(delay * 2, 60_000);
      }
      timer = setTimeout(loop, idle > 2 * 60_000 ? 60_000 : delay);
    }
    const bump = () => {
      const asleep = Date.now() - lastInput > 10 * 60_000;
      lastInput = Date.now();
      delay = 15_000;
      if (asleep) {
        clearTimeout(timer);
        void loop();
      }
    };
    const vis = () => {
      if (document.hidden) flush();
      else {
        bump();
        void pull();
      }
    };
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };

    timer = setTimeout(loop, delay);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("beforeunload", warn);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(timerRef.current);
      clearTimeout(maxTimerRef.current);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("beforeunload", warn);
    };
  }, [project?.id]);

  function resolveConflict(
    id: string,
    field: string,
    choice: "mine" | "theirs",
  ) {
    const base = baseRef.current.get(id);
    const theirs = conflictsRef.current[id]?.[field];
    if (!base) return;
    (base as any)[field] = theirs; // either way, "theirs" becomes the new base
    if (choice === "theirs")
      mutate((p) => ({
        ...p,
        payload: {
          ...p.payload,
          captures: p.payload.captures.map((r) =>
            r.id === id ? { ...r, [field]: theirs } : r,
          ),
        },
      }));
    const { [field]: _gone, ...rest } = conflictsRef.current[id] ?? {};
    const next = { ...conflictsRef.current };
    if (Object.keys(rest).length) next[id] = rest;
    else delete next[id];
    setConflicts(next);
    dirtyRef.current = true;
    scheduleAutosave(); // "Keep mine" then saves as base=theirs, value=mine, an explicit decision
  }

  const brandingContent = project ? (
    <>
      <div className="branding-grid">
        {isAdmin && (
          <>
            <div className="company-logo-control">
              <label>
                Client / facility logo (PNG, JPG or WebP · up to 5 MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={logoBusy || !isAdmin}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProjectImage("facility-logo", file);
                    e.target.value = "";
                  }}
                />
              </label>
              {project.facilityLogoName && (
                <div className="company-logo-preview">
                  <img
                    src={`/api/projects/${project.id}/facility-logo?v=${encodeURIComponent(project.facilityLogoName)}`}
                    alt="Facility logo"
                  />
                  <span>{project.facilityLogoName}</span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void removeProjectImage("facility-logo")}
                    disabled={logoBusy}
                  >
                    Remove
                  </button>
                </div>
              )}
              {logoBusy && <span className="muted">Saving image…</span>}
            </div>
            <div className="company-logo-control">
              <label>
                Assessment company logo (PNG, JPG or WebP · up to 5 MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={logoBusy || !isAdmin}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProjectImage("company-logo", file);
                    e.target.value = "";
                  }}
                />
              </label>
              {project.companyLogoName && (
                <div className="company-logo-preview">
                  <img
                    src={`/api/projects/${project.id}/company-logo?v=${encodeURIComponent(project.companyLogoName)}`}
                    alt="Assessment company logo"
                  />
                  <span>{project.companyLogoName}</span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void removeProjectImage("company-logo")}
                    disabled={logoBusy}
                  >
                    Remove
                  </button>
                </div>
              )}
              {logoBusy && <span className="muted">Saving image…</span>}
            </div>
          </>
        )}
        <div className="company-logo-control">
          <label>
            Assessor signature (PNG, JPG or WebP · up to 5 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={logoBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProjectImage("assessor-signature", file);
                e.target.value = "";
              }}
            />
          </label>
          {project.assessorSignatureName && (
            <div className="company-logo-preview">
              <img
                src={`/api/projects/${project.id}/assessor-signature?v=${encodeURIComponent(project.assessorSignatureName)}`}
                alt="Assessor signature"
              />
              <span>{project.assessorSignatureName}</span>
              <button
                type="button"
                className="btn ghost"
                onClick={() => void removeProjectImage("assessor-signature")}
                disabled={logoBusy}
              >
                Remove
              </button>
            </div>
          )}
          {logoBusy && <span className="muted">Saving image…</span>}
        </div>
      </div>
      {isAdmin && (
        <>
          <h3>Report company and client addresses</h3>
          <div className="two">
            <div className="stack">
              <label>
                Assessment company name
                <input
                  maxLength={160}
                  value={project.companyName || ""}
                  onChange={(e) =>
                    updateDetails({ companyName: e.target.value })
                  }
                />
              </label>
              <label>
                Assessment company address
                <textarea
                  maxLength={500}
                  rows={4}
                  value={project.companyAddress || ""}
                  onChange={(e) =>
                    updateDetails({ companyAddress: e.target.value })
                  }
                  placeholder="Street address, town, province and postal code"
                />
              </label>
            </div>
            <div className="stack">
              <label>
                Prepared for · Client name
                <input
                  maxLength={160}
                  value={project.client || ""}
                  onChange={(e) => updateDetails({ client: e.target.value })}
                />
              </label>
              <label>
                Client address
                <textarea
                  maxLength={500}
                  rows={4}
                  value={project.clientAddress || ""}
                  onChange={(e) =>
                    updateDetails({ clientAddress: e.target.value })
                  }
                  placeholder="Street address, town, province and postal code"
                />
              </label>
            </div>
          </div>
        </>
      )}
      <h3>Assessor details and signature</h3>
      <div className="details assessor-fields">
        <label>
          Assessor name
          <input
            value={project.assessorName || ""}
            onChange={(e) => updateDetails({ assessorName: e.target.value })}
            placeholder="Full name"
          />
        </label>
        <label>
          Professional role
          <input
            value={project.assessorRole || ""}
            onChange={(e) => updateDetails({ assessorRole: e.target.value })}
            placeholder="Architect, fire engineer…"
          />
        </label>
        <label>
          Registration number (optional)
          <input
            value={project.assessorRegistration || ""}
            onChange={(e) =>
              updateDetails({ assessorRegistration: e.target.value })
            }
            placeholder="Professional registration"
          />
        </label>
      </div>
      <SignaturePad
        onSave={(file) => uploadProjectImage("assessor-signature", file)}
        busy={logoBusy}
      />
      <p className="muted">
        Select Save assessment to keep assessor details. Logos and signature
        save when uploaded.
      </p>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const saved = await save();
          if (saved) setBrandingOpen(false);
        }}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save assessment and close"}
      </button>
    </>
  ) : null;
  if (loading)
    return (
      <main className="auth-shell">
        <p role="status">Loading your account…</p>
      </main>
    );
  if (showWelcome)
    return (
      <WelcomePage
        workspaceControl={
          <>
            {canSwitchRole && (
              <label className="workspace-switch">
                Workspace
                <select
                  aria-label="Choose workspace"
                  value={workspaceView}
                  onChange={(e) => {
                    const view = e.target.value as "admin" | "assessor";
                    document.cookie = `fca_workspace_view=${view}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                    setWorkspaceView(view);
                    setShowReport(false);
                    setShowQs(false);
                    setEditingDetails(false);
                    setSetup(false);
                    setBrandingOpen(false);
                    setMessage(
                      view === "admin"
                        ? "Admin workspace"
                        : "Assessor workspace · capture, details and sign-off",
                    );
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="assessor">Assessor</option>
                </select>
              </label>
            )}
          </>
        }
        onEnter={() => (user ? setShowWelcome(false) : router.push("/login"))}
      />
    );
  if (!user)
    return (
      <main className="auth-shell">
        <section className="card">
          <h1>Sign in to continue</h1>
          <Link href="/login" className="btn">
            Log in
          </Link>
        </section>
      </main>
    );

  return (
    <div className="app">
      <Header
        canSwitchRole={canSwitchRole}
        workspaceView={workspaceView}
        setWorkspaceView={setWorkspaceView}
        setShowQs={setShowQs}
        setShowReport={setShowReport}
        setEditingDetails={setEditingDetails}
        setSetup={setSetup}
        setBrandingOpen={setBrandingOpen}
        setMessage={setMessage}
        setShowWelcome={setShowWelcome}
        isAdmin={isAdmin}
        project={project}
        setProject={setProject}
      />
      <main className="wrap">
        <fieldset className="assessment-fields" disabled={logoBusy}>
          {!project ? (
            <>
              {isAdmin && (
                <DeletionApprovals onReviewed={refreshApprovedProject} />
              )}
              <div className="project-hero">
                <div className="project-hero-copy">
                  <span className="hero-pill">
                    <span className="pulse-dot" /> Building assessment workspace
                  </span>
                  <h2>Capture conditions. Plan the work.</h2>
                  <p>From site findings to QS pricing and a facility report.</p>
                </div>
              </div>
              <div className="eyebrow">Project setup</div>
              <h1 className="title">Start New Project</h1>
              <p className="muted">
                Set up the assessment, then capture conditions by functional
                area. Pricing can be completed later by the QS.
              </p>
              <div className="grid">
                {isAdmin ? (
                  <form className="card stack" onSubmit={create}>
                    <h2>Project details</h2>
                    <label>
                      Project name
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. School Facility FCA"
                        required
                      />
                    </label>
                    <div className="two">
                      <label>
                        Client
                        <input
                          value={client}
                          onChange={(e) => setClient(e.target.value)}
                          placeholder="Client or organisation"
                        />
                      </label>
                      <label>
                        Asset number
                        <input
                          value={asset}
                          onChange={(e) => setAsset(e.target.value)}
                          placeholder="Facility asset reference"
                        />
                      </label>
                    </div>
                    <label>
                      Discipline
                      <select
                        value={discipline}
                        onChange={(e) => setDiscipline(e.target.value)}
                        required
                      >
                        <option value="">Select discipline</option>
                        {disciplines.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <fieldset className="template-choices">
                      <legend>Assessment structure</legend>
                      <label
                        className={
                          templateMode === "standard" ? "selected" : ""
                        }
                      >
                        <input
                          type="radio"
                          name="template-mode"
                          value="standard"
                          checked={templateMode === "standard"}
                          onChange={() => setTemplateMode("standard")}
                        />
                        <span>
                          <strong>Use FCA template</strong>
                          <small>
                            Start with functional area types
                            {discipline === "Architect"
                              ? " and blank architectural component rows"
                              : "; add components for the selected discipline"}
                            . No previous ratings or costs are copied.
                          </small>
                        </span>
                      </label>
                      <label
                        className={templateMode === "own" ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="template-mode"
                          value="own"
                          checked={templateMode === "own"}
                          onChange={() => setTemplateMode("own")}
                        />
                        <span>
                          <strong>Create my own</strong>
                          <small>
                            Start empty and add functional areas, elements and
                            components.
                          </small>
                        </span>
                      </label>
                      <label
                        className={templateMode === "upload" ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="template-mode"
                          value="upload"
                          checked={templateMode === "upload"}
                          onChange={() => setTemplateMode("upload")}
                        />
                        <span>
                          <strong>Upload existing FCA template</strong>
                          <small>
                            Import functional areas and components from an Excel
                            workbook or CSV file.
                          </small>
                        </span>
                      </label>
                    </fieldset>
                    {templateMode === "upload" && (
                      <>
                        <label>
                          Existing FCA template (.xlsx, .xlsb or .csv)
                          <input
                            type="file"
                            accept=".xlsx,.xlsb,.csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void parseTemplate(file);
                            }}
                          />
                        </label>
                        {importing && <small>Reading workbook…</small>}
                        {importError && (
                          <small className="error-text" role="alert">
                            {importError}
                          </small>
                        )}
                        {importedTemplate &&
                          importedTemplate.sheetOptions.length > 1 && (
                            <label>
                              Assessment sheet
                              <select
                                value={importedTemplate.sheetName}
                                onChange={(e) => {
                                  if (templateFile)
                                    void parseTemplate(
                                      templateFile,
                                      e.target.value,
                                    );
                                }}
                              >
                                {importedTemplate.sheetOptions.map((sheet) => (
                                  <option key={sheet} value={sheet}>
                                    {sheet}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        {importedTemplate && (
                          <small>
                            {templateFile?.name}
                            {importedTemplate.sheetName
                              ? ` · ${importedTemplate.sheetName}`
                              : ""}
                            : {importedTemplate.areas.length} functional areas,{" "}
                            {importedTemplate.captures.length} components ready
                            to import.
                          </small>
                        )}
                      </>
                    )}
                    <button className="btn" disabled={busy || importing}>
                      {busy ? "Creating…" : "Create project"}
                    </button>
                    {message && (
                      <div className="notice error" role="alert">
                        {message}
                      </div>
                    )}
                  </form>
                ) : (
                  <section className="card">
                    <h2>Assigned profession</h2>
                    <p>{assignedProfession || "Assessor preview"}</p>
                    <p>
                      Open an existing project to capture assigned findings.
                    </p>
                  </section>
                )}
                <section className="card">
                  <h2>Existing projects</h2>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, client or asset number"
                    className="mb-4"
                  />
                  <div className="project-list">
                    {projects.length ? (
                      projects.map((p) => (
                        <div
                          className={`project-list-row ${selectedDeleteId === p.id ? "selected-for-delete" : ""}`}
                          key={p.id}
                        >
                          <label className="project-select">
                            <input
                              type="checkbox"
                              checked={selectedDeleteId === p.id}
                              onChange={(e) =>
                                setSelectedDeleteId(
                                  e.target.checked ? p.id : null,
                                )
                              }
                              aria-label={`Select ${p.name} for deletion`}
                            />
                          </label>
                          <button
                            className="project-item"
                            onClick={() => void open(p.id)}
                            disabled={busy}
                          >
                            <strong>{p.name}</strong>
                            <small>
                              {p.client || "No client"}{" "}
                              {p.assetNumber && `· ${p.assetNumber}`}{" "}
                              {p.discipline && `· ${p.discipline}`} · Open and
                              edit
                            </small>
                          </button>
                          {selectedDeleteId === p.id && (
                            <button
                              type="button"
                              className="btn danger-outline"
                              disabled={busy}
                              onClick={() => {
                                setDeleteTarget(p);
                                setDeleteNameConfirm("");
                                setDeleteError("");
                              }}
                            >
                              Delete project
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        No projects yet. Create your first assessment.
                      </p>
                    )}
                  </div>
                  {hasMore && (
                    <button
                      className="btn outline"
                      onClick={() => void loadProjects(projects.length, search)}
                    >
                      Load more
                    </button>
                  )}
                  <form
                    className="restore-form"
                    onSubmit={(e) => void restoreProject(e)}
                  >
                    <h3>Recover a deleted project</h3>
                    <p className="muted">
                      Enter the asset number to restore a deleted project and
                      continue editing its findings.
                    </p>
                    <label>
                      Asset number
                      <input
                        value={restoreAsset}
                        onChange={(e) => {
                          setRestoreAsset(e.target.value);
                          setRestoreMessage("");
                          setRestoreNeedsName(false);
                        }}
                        placeholder="Enter asset number"
                        required
                      />
                    </label>
                    {restoreNeedsName && (
                      <label>
                        Project name
                        <input
                          value={restoreName}
                          onChange={(e) => setRestoreName(e.target.value)}
                          placeholder="Exact project name"
                          required
                        />
                      </label>
                    )}
                    <button
                      className="btn outline"
                      type="submit"
                      disabled={restoreBusy}
                    >
                      {restoreBusy ? "Looking up project…" : "Restore project"}
                    </button>
                    {restoreMessage && (
                      <p className="error-text" role="alert">
                        {restoreMessage}
                      </p>
                    )}
                  </form>
                </section>
              </div>
            </>
          ) : setup && isAdmin ? (
            <>
              <div className="eyebrow">Project setup · Step 2</div>
              <h1 className="title">Add the site plan</h1>
              <p className="muted">
                Upload a plan for the project before starting the assessment. An
                admin can add or replace platform documents and logos.
              </p>
              <section className="card stack" style={{ maxWidth: 650 }}>
                <h2>{project.name}</h2>
                <label>
                  Assessor name
                  <input
                    value={project.assessorName || ""}
                    onChange={(e) =>
                      updateDetails({ assessorName: e.target.value })
                    }
                    placeholder="Name for report signature"
                  />
                </label>
                <label>
                  Site plan (PDF, PNG, JPG or WebP · up to 15 MB)
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPlan(file);
                    }}
                    disabled={uploading || !isAdmin}
                  />
                </label>
                <div className="setup-branding">
                  <div className="toolbar">
                    <h3>Report logos and assessor</h3>
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => setBrandingOpen((v) => !v)}
                    >
                      {brandingOpen ? "Close" : "Edit logos & signature"}
                    </button>
                  </div>
                  {brandingOpen && brandingContent}
                </div>
                {project.sitePlanName && (
                  <div className="notice">
                    Uploaded:{" "}
                    <a
                      href={`/api/projects/${project.id}/site-plan`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {project.sitePlanName}
                    </a>{" "}
                    <button
                      className="btn ghost"
                      onClick={removePlan}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {message && (
                  <div className="notice" role="status">
                    {message}
                  </div>
                )}
                <div className="actions">
                  <button
                    className="btn"
                    onClick={() => {
                      setSetup(false);
                      void save();
                    }}
                  >
                    Continue to assessment
                  </button>
                  <span className="muted">
                    You may continue without a plan.
                  </span>
                </div>
              </section>
            </>
          ) : showReport && isAdmin ? (
            <SummaryReport
              project={project}
              onBranding={() => {
                setBrandingTabVisible(true);
                setBrandingOpen(true);
                setBrandingTabVisible(true);
                setShowReport(false);
                setTimeout(
                  () =>
                    document
                      .getElementById("project-branding")
                      ?.scrollIntoView({ behavior: "smooth" }),
                  30,
                );
              }}
              onBack={() => setShowReport(false)}
              onPricingChange={(pricing) => {
                dirtyRef.current = true;
                mutate((prev) => ({
                  ...prev,
                  payload: { ...prev.payload, pricing },
                }));
                setMessage("Unsaved changes");
                scheduleAutosave();
              }}
              onSave={async () => {
                await save();
              }}
            />
          ) : showQs && isAdmin ? (
            <QsPricing
              project={project}
              onUpdate={update}
              onPricingChange={(pricing) => {
                dirtyRef.current = true;
                mutate((prev) => ({
                  ...prev,
                  payload: { ...prev.payload, pricing },
                }));
                setMessage("Unsaved changes");
                scheduleAutosave();
              }}
              onSave={async () => {
                await save();
              }}
              saving={saving}
              message={message}
              onBack={() => setShowQs(false)}
              onReport={() => setShowReport(true)}
            />
          ) : (
            <>
              {isAdmin && (
                <DeletionApprovals onReviewed={refreshApprovedProject} />
              )}
              {brandingTabVisible && !brandingOpen && (
                <div className="branding-mini">
                  <button type="button" onClick={() => setBrandingOpen(true)}>
                    {isAdmin ? "Report setup" : "Assessor details and sign-off"}{" "}
                    <span>Edit →</span>
                  </button>
                  <button
                    type="button"
                    className="branding-mini-close"
                    aria-label="Dismiss logos and assessor tab"
                    onClick={() => setBrandingTabVisible(false)}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="project-header-logos">
                {project.facilityLogoName && (
                  <img
                    src={`/api/projects/${project.id}/facility-logo?v=${encodeURIComponent(project.facilityLogoName)}`}
                    alt="Facility logo"
                  />
                )}
                {project.companyLogoName && (
                  <img
                    src={`/api/projects/${project.id}/company-logo?v=${encodeURIComponent(project.companyLogoName)}`}
                    alt="Assessment company logo"
                  />
                )}
              </div>
              <div className="eyebrow">
                {project.client || "Facility condition assessment"}{" "}
                {project.assetNumber && `· ${project.assetNumber}`}
              </div>
              <div className="toolbar">
                <div>
                  <h1 className="title">{project.name}</h1>
                  <span className="count">
                    {project.discipline && `${project.discipline} · `}
                    {areas.length} functional areas · {all.length} components
                  </span>
                </div>
                <div className="actions">
                  <button
                    className="btn outline"
                    onClick={() => {
                      setBrandingTabVisible(true);
                      setBrandingOpen(true);
                    }}
                  >
                    {isAdmin ? "Report setup" : "Assessor details & sign-off"}
                  </button>
                  {isAdmin && (
                    <button
                      className="btn outline"
                      onClick={() => setEditingDetails((v) => !v)}
                    >
                      {editingDetails
                        ? "Close details"
                        : "Edit project details"}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn outline"
                      onClick={() => {
                        setEditingDetails(false);
                        setShowQs(true);
                      }}
                    >
                      QS pricing →
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn outline"
                      onClick={() => {
                        setEditingDetails(false);
                        setShowQs(false);
                        setShowReport(true);
                      }}
                    >
                      View summary report
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={save}
                    disabled={saving || photoBusy !== null}
                  >
                    {saving ? "Saving…" : "Save assessment"}
                  </button>
                </div>
              </div>
              {brandingOpen && (
                <section
                  className="card project-branding"
                  id="project-branding"
                >
                  <div className="toolbar">
                    <div>
                      <h2>
                        {isAdmin
                          ? "Report setup"
                          : "Assessor details and sign-off"}
                      </h2>
                      {brandingOpen && isAdmin && (
                        <p className="muted">
                          The assessment company appears on the left. The client
                          appears on the right, labelled Prepared for.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => setBrandingOpen((v) => !v)}
                    >
                      {brandingOpen ? "Close" : "Edit logos & signature"}
                    </button>
                  </div>
                  {brandingContent}
                </section>
              )}
              {editingDetails && isAdmin && (
                <section className="card project-details">
                  <h2>Edit project details</h2>
                  <div className="details">
                    <label>
                      Project name
                      <input
                        value={project.name}
                        onChange={(e) =>
                          updateDetails({ name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Client
                      <input
                        value={project.client}
                        onChange={(e) =>
                          updateDetails({ client: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Asset number
                      <input
                        value={project.assetNumber}
                        onChange={(e) =>
                          updateDetails({ assetNumber: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Discipline
                      <select
                        value={project.discipline || ""}
                        onChange={(e) =>
                          updateDetails({ discipline: e.target.value })
                        }
                      >
                        <option value="">Not assigned</option>
                        {disciplines.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="muted">
                    Select Save assessment to keep project details.
                  </p>
                </section>
              )}
              {message && (
                <div
                  className={`notice ${message.includes("failed") || message.includes("must") ? "error" : ""}`}
                  role="status"
                  style={{ marginBottom: 16 }}
                >
                  {message}
                </div>
              )}
              {isAdmin && (
                <div className="card" style={{ marginBottom: 17 }}>
                  <div className="toolbar">
                    <div>
                      <h2 style={{ margin: 0 }}>
                        Project documents and component library
                      </h2>
                      <p className="muted" style={{ margin: "5px 0" }}>
                        Site plan:{" "}
                        {project.sitePlanName ? (
                          <a
                            href={`/api/projects/${project.id}/site-plan`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {project.sitePlanName}
                          </a>
                        ) : (
                          "Not uploaded"
                        )}
                      </p>
                    </div>
                    <button
                      className="btn ghost"
                      onClick={() => setSetup(true)}
                    >
                      Manage site plan
                    </button>
                  </div>
                  <div className="actions">
                    <label
                      className="btn ghost"
                      style={{ display: "inline-flex", alignItems: "center" }}
                    >
                      Upload components CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        disabled={!isAdmin}
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void importComponents(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      className="btn outline"
                      onClick={() => downloadQsBoqCsv(project)}
                    >
                      Download QS BOQ CSV
                    </button>
                  </div>
                  <ProjectAssignees projectId={project.id} />
                  <p className="muted" style={{ fontSize: 14 }}>
                    Columns: Functional Area, Element, Component, Type, Section.
                    New functional areas are created automatically.
                  </p>
                </div>
              )}
              <div className="stat-row">
                <span className="stat">
                  Functional areas: <b>{areas.length}</b>
                </span>
                <span className="stat">
                  Components: <b>{all.length}</b>
                </span>
                <span className="stat">
                  Valid rating totals:{" "}
                  <b>
                    {valid}/{all.length}
                  </b>
                </span>
                <span className="stat">
                  Remedial cost:{" "}
                  <b>
                    {new Intl.NumberFormat("en-ZA", {
                      style: "currency",
                      currency: "ZAR",
                    }).format(remedialTotal)}
                  </b>
                </span>
              </div>
              <p className="muted">
                Prices can be left blank during assessment and completed on the
                QS pricing page.
              </p>
              <WorkspaceSection
                assignedProfession={assignedProfession}
                setAddingArea={setAddingArea}
                addingArea={addingArea}
                addArea={addArea}
                setNewAreaName={setNewAreaName}
                setNewAreaType={setNewAreaType}
                setNewAreaUnit={setNewAreaUnit}
                setNewAreaSqm={setNewAreaSqm}
                setNewAreaProfession={setNewAreaProfession}
                setFirstAreaElement={setFirstAreaElement}
                setFirstAreaComponent={setFirstAreaComponent}
                newAreaName={newAreaName}
                newAreaType={newAreaType}
                newAreaProfession={newAreaProfession}
                project={project}
                newAreaUnit={newAreaUnit}
                newAreaSqm={newAreaSqm}
                firstAreaElement={firstAreaElement}
                catalogElements={catalogElements}
                firstAreaComponent={firstAreaComponent}
                catalog={catalog}
                professionFilter={professionFilter}
                setProfessionFilter={setProfessionFilter}
                setElement={setElement}
                setAddingComponent={setAddingComponent}
                setAddingElement={setAddingElement}
                professionals={professionals}
                visibleAreaIndices={visibleAreaIndices}
                areas={areas}
                selectedAreaIndex={selectedAreaIndex}
                setAreaIndex={setAreaIndex}
                area={area}
                deleteArea={deleteArea}
                isAdmin={isAdmin}
                setNewElement={setNewElement}
                setCustomElement={setCustomElement}
                addingElement={addingElement}
                addElement={addElement}
                newElement={newElement}
                customElement={customElement}
                element={element}
                elements={elements}
                setNewComponent={setNewComponent}
                addingComponent={addingComponent}
                addComponent={addComponent}
                newComponent={newComponent}
                catalogComponents={catalogComponents}
                customComponent={customComponent}
                setCustomComponent={setCustomComponent}
                current={current}
                customElementFor={customElementFor}
                setCustomElementFor={setCustomElementFor}
                update={update}
                customComponentFor={customComponentFor}
                setCustomComponentFor={setCustomComponentFor}
                setMessage={setMessage}
                photoBusy={photoBusy}
                addPhoto={addPhoto}
                removePhoto={removePhoto}
                saving={saving}
                message={message}
                save={save}
                conflicts={conflicts}
                resolveConflict={resolveConflict}
              />
            </>
          )}
        </fieldset>
      </main>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) {
            setDeleteTarget(null);
            setDeleteNameConfirm("");
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project from Existing projects. You can restore
              its findings and photos later by entering its asset number. Enter
              the project name to confirm. Assessors submit a request; an admin
              must approve before the project is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="delete-fields">
            <label>
              Type project name
              <input
                value={deleteNameConfirm}
                onChange={(e) => setDeleteNameConfirm(e.target.value)}
                autoComplete="off"
              />
            </label>
            {deleteError && (
              <p className="error-text" role="alert">
                {deleteError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <button
              type="button"
              className="btn danger"
              disabled={deleteBusy || deleteNameConfirm !== deleteTarget?.name}
              onClick={() => void deleteProject()}
            >
              {deleteBusy
                ? "Submitting…"
                : isAdmin
                  ? "Delete project"
                  : "Request admin approval"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
