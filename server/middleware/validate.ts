import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../src/utils/errors.js";

export function validate(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return next(
        new HttpError(400, "Check the submitted fields.", "VALIDATION_ERROR", {
          fields: result.error.flatten().fieldErrors,
        }),
      );
    req.validated = result.data;
    next();
  };
}
