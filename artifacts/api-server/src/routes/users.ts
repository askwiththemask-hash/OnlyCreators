import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { UpdateUserBody, GetUserParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  if (authUser.id !== id && authUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.get("/users/me/favorites", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const result = await db.execute(
    require("drizzle-orm").sql`
      SELECT s.*, 
        cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
        cp.verification_status != 'normal' as creator_verified,
        TRUE as is_favorited,
        EXISTS(SELECT 1 FROM likes l WHERE l.user_id = ${authUser.id} AND l.sample_id = s.id) as is_liked,
        COUNT(DISTINCT l2.id)::int as like_count,
        COUNT(DISTINCT cm.id)::int as comment_count
      FROM favorites f
      JOIN samples s ON s.id = f.sample_id
      JOIN creator_profiles cp ON cp.id = s.creator_id
      LEFT JOIN likes l2 ON l2.sample_id = s.id
      LEFT JOIN comments cm ON cm.sample_id = s.id
      WHERE f.user_id = ${authUser.id} AND s.status = 'approved'
      GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status
    `
  );
  res.json((result as { rows: unknown[] }).rows);
});

export default router;
