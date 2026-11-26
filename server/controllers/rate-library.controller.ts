import type { Request, Response } from "express";
import { pool, transaction } from "../configs/database.js";
import {
  loadPlatformRates,
  savePlatformRate,
} from "../models/rate-library.model.js";
import { rateLibraryInput } from "../src/validation/rate-library.js";
export async function list(_req: Request, res: Response) {
  res.json(await loadPlatformRates(pool));
}
export async function save(req: Request, res: Response) {
  const input = rateLibraryInput.parse(req.body);
  res.json(
    await transaction((db) => savePlatformRate(db, req.auth!.userId, input)),
  );
}
