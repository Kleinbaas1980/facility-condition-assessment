export {};
declare global {
  namespace Express {
    interface Request {
      auth?: {
        role: "admin" | "assessor";
        userId: string;
        sessionId: string;
        accessExpiresAt: number;
      };
      requestId: string;
      validated?: unknown;
    }
  }
}
