import type { Request, Response } from "express";
import { z } from "zod";
import { pool, transaction } from "../configs/database.js";
import { read, ownedProject, audit } from "../models/project.model.js";
import { validateFile } from "../src/services/blob.service.js";
import { sendReport } from "../src/services/mail.service.js";
import { HttpError } from "../src/utils/errors.js";
//.
export async function email(req: Request, res: Response) {
  const project = await transaction(async (db) => {
    await ownedProject(db, String(req.params.id), req.auth!.userId, true);
    return read(db, String(req.params.id), req.auth!.userId);
  });
  const parsed = z.string().email().max(254).safeParse(req.body.email);
  if (!parsed.success)
    throw new HttpError(400, "Enter a valid recipient email address.");
  await validateFile(req.file, "report");
  await sendReport(parsed.data, project.name, req.file!.buffer);
  await audit(pool, req.auth!.userId, project.id, "report.emailed");
  res.json({ message: "The PDF report has been emailed." });
}

export async function boq(req: Request, res: Response) {
  const project = await transaction(async (db) => {
    await ownedProject(db, String(req.params.id), req.auth!.userId, true);
    return read(db, String(req.params.id), req.auth!.userId);
  });
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    [
      "Project",
      "Asset number",
      "Functional area",
      "Element",
      "Component",
      "Component type",
      "Discipline",
      "Measured remedial scope",
      "Unit",
      "Quantity",
      "Rate excl VAT (R)",
      "Amount excl VAT (R)",
      "Priority",
      "Work type",
      "Maintenance work",
      "C1 %",
      "C2 %",
      "C3 %",
      "C4 %",
      "C5 %",
      "Pricing status",
    ],
    ...project.payload.captures.map((row) => {
      const amount =
        row.unitRate != null && row.remedialQuantity != null
          ? row.unitRate * row.remedialQuantity
          : (row.remedialCost ?? null);
      return [
        project.name,
        project.assetNumber,
        row.area,
        row.element,
        row.component,
        row.type,
        row.discipline,
        row.measuredScope || row.comment,
        row.extentUnit,
        row.remedialQuantity,
        row.unitRate,
        amount,
        row.priority,
        row.workType,
        row.maintenanceWork,
        ...row.ratings,
        amount === null ? "Unpriced" : "Priced",
      ];
    }),
  ];
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="FCA-QS-BOQ.csv"',
  });
  res.send("\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"));
}
