import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { db, usersTable, creatorPinsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "only-creators-salt").digest("hex");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, email, password, accountType } = parsed.data;
  const { creatorPin } = req.body as { creatorPin?: string };

  if (accountType === "creator") {
    if (!creatorPin || !/^\d{6}$/.test(creatorPin)) {
      res.status(400).json({ error: "A valid 6-digit Creator PIN is required to register as a creator" });
      return;
    }
    const [pinRow] = await db.select().from(creatorPinsTable).where(eq(creatorPinsTable.pin, creatorPin));
    if (!pinRow) {
      res.status(400).json({ error: "Invalid Creator PIN. Contact the admin to receive your PIN." });
      return;
    }
    if (pinRow.used) {
      res.status(400).json({ error: "This Creator PIN has already been used." });
      return;
    }
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const existingUsername = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    username,
    email,
    passwordHash,
    accountType,
  }).returning();

  if (accountType === "creator" && creatorPin) {
    await db.update(creatorPinsTable).set({ used: true }).where(eq(creatorPinsTable.pin, creatorPin));
  }

  const token = signToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ user: safeUser, token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.isBanned) {
    res.status(401).json({ error: "Account banned" });
    return;
  }

  const token = signToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
