import { Router, type IRouter } from "express";
import { db, usersTable, likesTable, favoritesTable, followsTable, commentsTable, samplesTable, reviewsTable, notificationsTable, creatorProfilesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { AddCommentBody } from "@workspace/api-zod";

const router: IRouter = Router();
type AnyUser = typeof usersTable.$inferSelect;

async function createNotif(userId: number, type: string, message: string, actorId?: number, actorUsername?: string, sampleId?: number) {
  try {
    await db.insert(notificationsTable).values({ userId, type, message, actorId: actorId ?? null, actorUsername: actorUsername ?? null, sampleId: sampleId ?? null });
  } catch { /* non-critical */ }
}

// ─── LIKES ────────────────────────────────────────────────────────────────────
router.post("/samples/:id/like", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  // Fetch sample + owner upfront for self-like check
  const [sample] = await db.select().from(samplesTable).where(eq(samplesTable.id, sampleId));
  if (!sample) { res.status(404).json({ error: "Sample not found" }); return; }
  const [cp] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, sample.creatorId));
  if (cp && cp.userId === authUser.id) { res.status(400).json({ error: "You cannot like your own content" }); return; }

  const existing = await db.select().from(likesTable).where(
    and(eq(likesTable.userId, authUser.id), eq(likesTable.sampleId, sampleId))
  );

  if (existing.length > 0) {
    await db.delete(likesTable).where(and(eq(likesTable.userId, authUser.id), eq(likesTable.sampleId, sampleId)));
  } else {
    await db.insert(likesTable).values({ userId: authUser.id, sampleId });
    if (cp && cp.userId !== authUser.id) {
      await createNotif(cp.userId, "like", `${authUser.username} liked your sample`, authUser.id, authUser.username, sampleId);
    }
  }

  const _r1 = await db.execute(sql`SELECT COUNT(*)::int as count FROM likes WHERE sample_id = ${sampleId}`) as { rows: Array<{ count: number }> };
  const r = _r1.rows[0];
  res.json({ liked: existing.length === 0, likeCount: r?.count ?? 0 });
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
router.get("/samples/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);

  const result = await db.execute(sql`
    SELECT c.*, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.sample_id = ${sampleId}
    ORDER BY c.created_at ASC
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

  // Notify sample owner
  const [sample] = await db.select().from(samplesTable).where(eq(samplesTable.id, sampleId));
  if (sample) {
    const [cp] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, sample.creatorId));
    if (cp && cp.userId !== authUser.id) {
      await createNotif(cp.userId, "comment", `${authUser.username} commented on your sample`, authUser.id, authUser.username, sampleId);
    }
  }

  res.status(201).json({
    id: comment.id, sampleId: comment.sampleId, userId: comment.userId,
    content: comment.content, username: authUser.username,
    avatarUrl: authUser.avatarUrl ?? null, createdAt: comment.createdAt.toISOString(),
  });
});

router.patch("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const { content } = req.body as { content?: string };

  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
  if (comment.userId !== authUser.id && authUser.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(commentsTable).set({ content: content.trim() }).where(eq(commentsTable.id, id)).returning();
  res.json({ id: updated.id, content: updated.content, username: authUser.username });
});

router.delete("/comments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
  if (comment.userId !== authUser.id && authUser.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));
  res.sendStatus(204);
});

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
router.get("/samples/:id/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);

  const result = await db.execute(sql`
    SELECT r.*, u.username, u.avatar_url
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.sample_id = ${sampleId}
    ORDER BY r.created_at DESC
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  const reviews = rows.map(r => ({
    id: r.id, sampleId: r.sample_id, userId: r.user_id,
    rating: r.rating, content: r.content ?? null,
    username: r.username ?? null, avatarUrl: r.avatar_url ?? null,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  }));
  const avg = reviews.length ? reviews.reduce((a, r) => a + Number(r.rating), 0) / reviews.length : null;
  res.json({ reviews, average: avg ? Math.round(avg * 10) / 10 : null, total: reviews.length });
});

router.post("/samples/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const { rating, content } = req.body as { rating?: number; content?: string };

  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1-5" }); return; }

  // Block self-reviews
  const [sampleCheck] = await db.select().from(samplesTable).where(eq(samplesTable.id, sampleId));
  if (sampleCheck) {
    const [cpCheck] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, sampleCheck.creatorId));
    if (cpCheck && cpCheck.userId === authUser.id) { res.status(400).json({ error: "You cannot review your own content" }); return; }
  }

  const existing = await db.select().from(reviewsTable).where(
    and(eq(reviewsTable.userId, authUser.id), eq(reviewsTable.sampleId, sampleId))
  );
  let review;
  if (existing.length > 0) {
    [review] = await db.update(reviewsTable)
      .set({ rating, content: content?.trim() || null, updatedAt: new Date() })
      .where(and(eq(reviewsTable.userId, authUser.id), eq(reviewsTable.sampleId, sampleId)))
      .returning();
  } else {
    [review] = await db.insert(reviewsTable).values({ sampleId, userId: authUser.id, rating, content: content?.trim() || null }).returning();
    // Notify sample owner
    const [sample] = await db.select().from(samplesTable).where(eq(samplesTable.id, sampleId));
    if (sample) {
      const [cp] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, sample.creatorId));
      if (cp && cp.userId !== authUser.id) {
        await createNotif(cp.userId, "review", `${authUser.username} left a ${rating}★ review on your sample`, authUser.id, authUser.username, sampleId);
      }
    }
  }
  res.status(existing.length ? 200 : 201).json({ ...review, username: authUser.username });
});

router.delete("/samples/:id/reviews", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sampleId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;
  await db.delete(reviewsTable).where(and(eq(reviewsTable.userId, authUser.id), eq(reviewsTable.sampleId, sampleId)));
  res.sendStatus(204);
});

// ─── FAVORITES ────────────────────────────────────────────────────────────────
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

// ─── FOLLOWS ──────────────────────────────────────────────────────────────────
router.post("/creators/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const creatorId = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  // Block self-follows
  const [selfCp] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, creatorId));
  if (selfCp && selfCp.userId === authUser.id) { res.status(400).json({ error: "You cannot follow yourself" }); return; }

  const existing = await db.select().from(followsTable).where(
    and(eq(followsTable.followerId, authUser.id), eq(followsTable.creatorId, creatorId))
  );

  if (existing.length > 0) {
    await db.delete(followsTable).where(and(eq(followsTable.followerId, authUser.id), eq(followsTable.creatorId, creatorId)));
  } else {
    await db.insert(followsTable).values({ followerId: authUser.id, creatorId });
    // Notify creator
    const [cp] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, creatorId));
    if (cp && cp.userId !== authUser.id) {
      await createNotif(cp.userId, "follow", `${authUser.username} started following you`, authUser.id, authUser.username);
    }
  }

  const _r2 = await db.execute(sql`SELECT COUNT(*)::int as count FROM follows WHERE creator_id = ${creatorId}`) as { rows: Array<{ count: number }> };
  const r = _r2.rows[0];
  res.json({ following: existing.length === 0, followerCount: r?.count ?? 0 });
});

export default router;
