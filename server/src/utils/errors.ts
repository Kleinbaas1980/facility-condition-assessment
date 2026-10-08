export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
