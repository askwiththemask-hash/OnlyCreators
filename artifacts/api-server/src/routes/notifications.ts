import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
type AnyUser = typeof usersTable.$inferSelect;

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const notifs = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, authUser.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json(notifs);
});

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, authUser.id));
  const count = rows.filter(n => !n.isRead).length;
  res.json({ count });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, authUser.id));
  res.json({ ok: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

export default router;
