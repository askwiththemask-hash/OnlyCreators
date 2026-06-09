import { Router, type IRouter } from "express";
import { db, usersTable, likesTable, favoritesTable, followsTable, commentsTable, samplesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AddCommentBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AnyUser = typeof usersTable.$inferSelect;

// LIKES
router.post("/samples/:id/like", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const existing = await db.select().from(likesTable).where(
    and(eq(likesTable.userId, authUser.id), eq(likesTable.sampleId, sampleId))
  );

  if (existing.length > 0) {
    await db.delete(likesTable).where(and(eq(likesTable.userId, authUser.id), eq(likesTable.sampleId, sampleId)));
  } else {
    await db.insert(likesTable).values({ userId: authUser.id, sampleId });
  }

  const [countResult] = await db.execute(sql`SELECT COUNT(*)::int as count FROM likes WHERE sample_id = ${sampleId}`) as { rows: Array<{ count: number }> };
  res.json({ liked: existing.length === 0, likeCount: countResult?.count ?? 0 });
});

// COMMENTS
router.get("/samples/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);

  const result = await db.execute(sql`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.sample_id = ${sampleId}
    ORDER BY c.created_at DESC
  `);
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(r => ({
    id: r.id,
    sampleId: r.sample_id,
    userId: r.user_id,
    content: r.content,
    username: r.username ?? null,
    avatarUrl: r.avatar_url ?? null,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  })));
});

router.post("/samples/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [comment] = await db.insert(commentsTable).values({ sampleId, userId: authUser.id, content: parsed.data.content }).returning();
  res.status(201).json({
    id: comment.id,
    sampleId: comment.sampleId,
    userId: comment.userId,
    content: comment.content,
    username: authUser.username,
    avatarUrl: authUser.avatarUrl ?? null,
    createdAt: comment.createdAt.toISOString(),
  });
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
  if (comment.userId !== authUser.id && authUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.sendStatus(204);
});

// FAVORITES
router.post("/samples/:id/favorite", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const existing = await db.select().from(favoritesTable).where(
    and(eq(favoritesTable.userId, authUser.id), eq(favoritesTable.sampleId, sampleId))
  );

  if (existing.length > 0) {
    await db.delete(favoritesTable).where(and(eq(favoritesTable.userId, authUser.id), eq(favoritesTable.sampleId, sampleId)));
    res.json({ favorited: false });
  } else {
    await db.insert(favoritesTable).values({ userId: authUser.id, sampleId });
    res.json({ favorited: true });
  }
});

// FOLLOWS
router.post("/creators/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const creatorId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const existing = await db.select().from(followsTable).where(
    and(eq(followsTable.followerId, authUser.id), eq(followsTable.creatorId, creatorId))
  );

  if (existing.length > 0) {
    await db.delete(followsTable).where(and(eq(followsTable.followerId, authUser.id), eq(followsTable.creatorId, creatorId)));
  } else {
    await db.insert(followsTable).values({ followerId: authUser.id, creatorId });
  }

  const [countResult] = await db.execute(sql`SELECT COUNT(*)::int as count FROM follows WHERE creator_id = ${creatorId}`) as { rows: Array<{ count: number }> };
  res.json({ following: existing.length === 0, followerCount: countResult?.count ?? 0 });
});

export default router;
