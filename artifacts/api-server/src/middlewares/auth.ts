import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";

export type AnyUser = typeof usersTable.$inferSelect;

const SECRET = process.env.SESSION_SECRET ?? "only-creators-secret-key-2024";

export function signToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): { userId: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
  if (!user || user.isBanned) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { user: typeof user }).user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
      if (user && !user.isBanned) {
        (req as Request & { user: typeof user }).user = user;
      }
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: { role: string } }).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireCreator(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: { accountType: string } }).user;
  if (!user || user.accountType !== "creator") {
    res.status(403).json({ error: "Creator account required" });
    return;
  }
  next();
}
