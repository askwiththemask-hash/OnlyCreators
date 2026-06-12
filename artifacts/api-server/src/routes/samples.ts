import { Router, type IRouter } from "express";
import { db, samplesTable, creatorProfilesTable, likesTable, commentsTable, reviewsTable } from "@workspace/db";
import { eq, and, desc, or, ilike, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateSampleBody, UpdateSampleBody } from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import type { AnyUser } from "../middlewares/auth";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

function formatSample(r: Record<string, unknown>) {
  return {
    id: r.id,
    creatorId: r.creator_id ?? r.creatorId,
    title: r.title,
    description: r.description ?? null,
    category: r.category,
    gameType: r.game_type ?? r.gameType ?? null,
    budget: r.budget ?? null,
    previewImageUrl: r.preview_image_url ?? r.previewImageUrl ?? null,
    previewVideoUrl: r.preview_video_url ?? r.previewVideoUrl ?? null,
    fileUrl: r.file_url ?? r.fileUrl ?? null,
    experience: r.experience ?? null,
    tags: r.tags ?? null,
    status: r.status,
    likeCount: Number(r.like_count ?? r.likeCount ?? 0),
    commentCount: Number(r.comment_count ?? r.commentCount ?? 0),
    isLiked: r.is_liked === true || r.is_liked === "true" || r.isLiked === true,
    isFavorited: r.is_favorited === true || r.is_favorited === "true" || r.isFavorited === true,
    creatorName: r.creator_name ?? r.creatorName ?? null,
    creatorAvatarUrl: r.creator_avatar_url ?? r.creatorAvatarUrl ?? null,
    creatorVerified: r.creator_verified === true || r.creator_verified === "true",
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  };
}

router.get("/samples", async (req, res): Promise<void> => {
  const { category, gameType, search, creatorId, status, limit = "20", offset = "0", featured } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  let userId: number | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = await import("../middlewares/auth");
      const payload = verifyToken(authHeader.slice(7));
      userId = payload?.userId;
    } catch { /* anonymous */ }
  }

  const conditions: string[] = [];
  if (category) conditions.push(`s.category = '${category.replace(/'/g, "''")}'`);
  if (gameType) conditions.push(`s.game_type = '${gameType.replace(/'/g, "''")}'`);
  if (search) conditions.push(`(s.title ILIKE '%${search.replace(/'/g, "''")}%' OR s.description ILIKE '%${search.replace(/'/g, "''")}%')`);
  if (creatorId) conditions.push(`s.creator_id = ${parseInt(creatorId, 10)}`);
  if (status === "all" && creatorId) { /* show all statuses for own profile */ }
  else if (status && status !== "all") conditions.push(`s.status = '${status.replace(/'/g, "''")}'`);
  else conditions.push(`s.status = 'approved'`);
  if (featured === "true") conditions.push(`cp.is_featured = true`);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const likedJoin = userId
    ? `LEFT JOIN likes ul ON ul.sample_id = s.id AND ul.user_id = ${userId}`
    : "";
  const favJoin = userId
    ? `LEFT JOIN favorites uf ON uf.sample_id = s.id AND uf.user_id = ${userId}`
    : "";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name,
      cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
      ${userId ? ", (ul.id IS NOT NULL)::boolean as is_liked" : ", false::boolean as is_liked"}
      ${userId ? ", (uf.id IS NOT NULL)::boolean as is_favorited" : ", false::boolean as is_favorited"}
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    ${likedJoin}
    ${favJoin}
    ${where}
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status ${userId ? ", ul.id, uf.id" : ""}
    ORDER BY s.created_at DESC
    LIMIT ${lim} OFFSET ${off}
  `));

  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatSample));
});

router.get("/samples/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  let userId: number | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { verifyToken } = await import("../middlewares/auth");
      const payload = verifyToken(authHeader.slice(7));
      userId = payload?.userId;
    } catch { /* anonymous */ }
  }

  const likedJoin = userId ? `LEFT JOIN likes ul ON ul.sample_id = s.id AND ul.user_id = ${userId}` : "";
  const favJoin = userId ? `LEFT JOIN favorites uf ON uf.sample_id = s.id AND uf.user_id = ${userId}` : "";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name,
      cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
      COUNT(DISTINCT l.id)::int as like_count,
      COUNT(DISTINCT c.id)::int as comment_count
      ${userId ? ", (ul.id IS NOT NULL)::boolean as is_liked" : ", false::boolean as is_liked"}
      ${userId ? ", (uf.id IS NOT NULL)::boolean as is_favorited" : ", false::boolean as is_favorited"}
    FROM samples s
    JOIN creator_profiles cp ON cp.id = s.creator_id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    ${likedJoin}
    ${favJoin}
    WHERE s.id = ${id}
    GROUP BY s.id, cp.display_name, cp.avatar_url, cp.verification_status ${userId ? ", ul.id, uf.id" : ""}
    LIMIT 1
  `));

  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatSample(rows[0]));
});

router.post("/samples", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSampleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const [profile] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, authUser.id));
  if (!profile) { res.status(403).json({ error: "Creator profile required" }); return; }

  const [sample] = await db.insert(samplesTable).values({
    creatorId: profile.id,
    ...parsed.data,
  }).returning();

  res.status(201).json(formatSample({ ...sample, creator_name: null, creator_avatar_url: null, creator_verified: false, is_liked: false, is_favorited: false, like_count: 0, comment_count: 0 }));
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

  // Clean up associated files from object storage (fire and forget errors)
  const filesToDelete = [existing.fileUrl, existing.previewImageUrl, existing.previewVideoUrl].filter(Boolean) as string[];
  await Promise.allSettled(filesToDelete.map(url => {
    const path = storageService.normalizeObjectEntityPath(url);
    if (path.startsWith("/objects/")) return storageService.deleteObjectEntity(path);
    return Promise.resolve();
  }));

  await db.delete(samplesTable).where(eq(samplesTable.id, id));
  res.sendStatus(204);
});

export default router;
