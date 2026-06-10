import { Router, type IRouter } from "express";
import { db, usersTable, creatorProfilesTable, samplesTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuth, requireCreator, optionalAuth } from "../middlewares/auth";
import { CreateSampleBody, UpdateSampleBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AnyUser = typeof usersTable.$inferSelect;

function formatSample(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    creatorId: r.creator_id,
    title: r.title,
    description: r.description ?? null,
    category: r.category,
    gameType: r.game_type ?? null,
    budget: r.budget ?? null,
    previewImageUrl: r.preview_image_url ?? null,
    previewVideoUrl: r.preview_video_url ?? null,
    tags: r.tags ?? null,
    status: r.status,
    likeCount: Number(r.like_count ?? 0),
    commentCount: Number(r.comment_count ?? 0),
    isLiked: r.is_liked === true || r.is_liked === "true" || r.is_liked === 1,
    isFavorited: r.is_favorited === true || r.is_favorited === "true" || r.is_favorited === 1,
    creatorName: r.creator_name ?? null,
    creatorAvatarUrl: r.creator_avatar_url ?? null,
    creatorVerified: r.creator_verified === true || r.creator_verified === "true" || r.creator_verified === 1,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  };
}

router.get("/samples", optionalAuth, async (req, res): Promise<void> => {
  const { category, game, budget, search, creatorId, status = "approved", limit = "20", offset = "0" } = req.query as Record<string, string>;
  const userId = ((req as typeof req & { user?: AnyUser }).user)?.id ?? null;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  const conditions: string[] = [];
  const statuses = status === "all" ? ["pending", "approved", "rejected"] : [status];
  conditions.push(`s.status = ANY(ARRAY[${statuses.map(s => `'${s}'`).join(",")}])`);
  if (category) conditions.push(`s.category = '${category.replace(/'/g, "''")}'`);
  if (game) conditions.push(`s.game_type = '${game.replace(/'/g, "''")}'`);
  if (budget) conditions.push(`s.budget <= ${parseInt(budget, 10)}`);
  if (search) conditions.push(`(s.title ILIKE '%${search.replace(/'/g, "''")}%' OR s.description ILIKE '%${search.replace(/'/g, "''")}%')`);
  if (creatorId) conditions.push(`s.creator_id = ${parseInt(creatorId, 10)}`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const isLikedSql = userId ? `EXISTS(SELECT 1 FROM likes l2 WHERE l2.user_id = ${userId} AND l2.sample_id = s.id)` : "FALSE";
  const isFavSql = userId ? `EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id = ${userId} AND fv.sample_id = s.id)` : "FALSE";

  const query = `
    SELECT s.*,
      cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      ${isLikedSql} as is_liked,
      ${isFavSql} as is_favorited,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    ${where}
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status
    ORDER BY s.created_at DESC
    LIMIT ${lim} OFFSET ${off}
  `;
  const result = await db.execute(sql.raw(query));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatSample));
});

router.get("/samples/trending", optionalAuth, async (req, res): Promise<void> => {
  const { limit = "10" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 10, 50);
  const userId = ((req as typeof req & { user?: AnyUser }).user)?.id ?? null;
  const isLikedSql = userId ? `EXISTS(SELECT 1 FROM likes l2 WHERE l2.user_id = ${userId} AND l2.sample_id = s.id)` : "FALSE";
  const isFavSql = userId ? `EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id = ${userId} AND fv.sample_id = s.id)` : "FALSE";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      ${isLikedSql} as is_liked,
      ${isFavSql} as is_favorited,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    WHERE s.status = 'approved'
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status
    ORDER BY like_count DESC, s.created_at DESC
    LIMIT ${lim}
  `));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatSample));
});

router.get("/samples/recent", optionalAuth, async (req, res): Promise<void> => {
  const { limit = "10" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 10, 50);
  const userId = ((req as typeof req & { user?: AnyUser }).user)?.id ?? null;
  const isLikedSql = userId ? `EXISTS(SELECT 1 FROM likes l2 WHERE l2.user_id = ${userId} AND l2.sample_id = s.id)` : "FALSE";
  const isFavSql = userId ? `EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id = ${userId} AND fv.sample_id = s.id)` : "FALSE";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      ${isLikedSql} as is_liked,
      ${isFavSql} as is_favorited,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    WHERE s.status = 'approved'
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status
    ORDER BY s.created_at DESC
    LIMIT ${lim}
  `));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatSample));
});

router.get("/samples/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = ((req as typeof req & { user?: AnyUser }).user)?.id ?? null;
  const isLikedSql = userId ? `EXISTS(SELECT 1 FROM likes l2 WHERE l2.user_id = ${userId} AND l2.sample_id = s.id)` : "FALSE";
  const isFavSql = userId ? `EXISTS(SELECT 1 FROM favorites fv WHERE fv.user_id = ${userId} AND fv.sample_id = s.id)` : "FALSE";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      ${isLikedSql} as is_liked,
      ${isFavSql} as is_favorited,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    WHERE s.id = ${id}
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status
  `));
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  if (!rows.length) { res.status(404).json({ error: "Sample not found" }); return; }
  res.json(formatSample(rows[0]));
});

router.post("/samples", requireAuth, requireCreator, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const parsed = CreateSampleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [profile] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, authUser.id));
  if (!profile) { res.status(400).json({ error: "Creator profile required" }); return; }

  const [sample] = await db.insert(samplesTable).values({ ...parsed.data, creatorId: profile.id, status: "approved" }).returning();
  res.status(201).json(formatSample({ ...sample, creator_name: profile.displayName, creator_avatar_url: profile.avatarUrl, creator_verified: profile.verificationStatus !== "normal", is_liked: false, is_favorited: false, like_count: 0, comment_count: 0 }));
});

router.patch("/samples/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const parsed = UpdateSampleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [profile] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, authUser.id));
  const [existing] = await db.select().from(samplesTable).where(eq(samplesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Sample not found" }); return; }
  if (authUser.role !== "admin" && (!profile || existing.creatorId !== profile.id)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [sample] = await db.update(samplesTable).set({ ...parsed.data }).where(eq(samplesTable.id, id)).returning();
  res.json(formatSample({ ...sample, creator_name: null, creator_avatar_url: null, creator_verified: false, is_liked: false, is_favorited: false, like_count: 0, comment_count: 0 }));
});

router.delete("/samples/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const [profile] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, authUser.id));
  const [existing] = await db.select().from(samplesTable).where(eq(samplesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Sample not found" }); return; }
  if (authUser.role !== "admin" && (!profile || existing.creatorId !== profile.id)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(samplesTable).where(eq(samplesTable.id, id));
  res.sendStatus(204);
});

export default router;
