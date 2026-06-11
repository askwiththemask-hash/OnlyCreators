import { Router, type IRouter } from "express";
import { db, usersTable, samplesTable, creatorProfilesTable, creatorPinsTable, reviewsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { RejectSampleBody } from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";

const storageService = new ObjectStorageService();

const router: IRouter = Router();

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
    isLiked: false,
    isFavorited: false,
    creatorName: r.creator_name ?? null,
    creatorAvatarUrl: r.creator_avatar_url ?? null,
    creatorVerified: r.creator_verified === true || r.creator_verified === "true",
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  };
}

router.get("/admin/samples", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { status, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;
  const where = status ? `WHERE s.status = '${status.replace(/'/g, "''")}'` : "";

  const result = await db.execute(sql.raw(`
    SELECT s.*,
      cp.display_name as creator_name, cp.avatar_url as creator_avatar_url,
      cp.verification_status != 'normal' as creator_verified,
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
  `));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatSample));
});

router.post("/admin/samples/:id/approve", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [sample] = await db.update(samplesTable).set({ status: "approved" }).where(eq(samplesTable.id, id)).returning();
  if (!sample) { res.status(404).json({ error: "Sample not found" }); return; }
  res.json(formatSample({ ...sample, creator_name: null, creator_avatar_url: null, creator_verified: false, like_count: 0, comment_count: 0 }));
});

router.post("/admin/samples/:id/reject", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = RejectSampleBody.safeParse(req.body ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;
  const [sample] = await db.update(samplesTable).set({ status: "rejected", rejectionReason: reason }).where(eq(samplesTable.id, id)).returning();
  if (!sample) { res.status(404).json({ error: "Sample not found" }); return; }
  res.json(formatSample({ ...sample, creator_name: null, creator_avatar_url: null, creator_verified: false, like_count: 0, comment_count: 0 }));
});

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { search, role, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  const conditions: string[] = [];
  if (search) conditions.push(`(username ILIKE '%${search.replace(/'/g, "''")}%' OR email ILIKE '%${search.replace(/'/g, "''")}%')`);
  if (role) conditions.push(`role = '${role.replace(/'/g, "''")}'`);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute(sql.raw(`
    SELECT id, username, email, account_type, avatar_url, bio, role, is_banned, created_at
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT ${lim} OFFSET ${off}
  `));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(r => ({
    id: r.id,
    username: r.username,
    email: r.email,
    accountType: r.account_type,
    avatarUrl: r.avatar_url ?? null,
    bio: r.bio ?? null,
    role: r.role,
    isBanned: r.is_banned,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  })));
});

router.post("/admin/users/:id/ban", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const [user] = await db.update(usersTable).set({ isBanned: !existing.isBanned }).where(eq(usersTable.id, id)).returning();
  const { passwordHash: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post("/admin/creators/:id/feature", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Creator not found" }); return; }

  const [profile] = await db.update(creatorProfilesTable).set({ isFeatured: !existing.isFeatured }).where(eq(creatorProfilesTable.id, id)).returning();
  res.json({
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    gmailAddress: profile.gmailAddress ?? null,
    discordUsername: profile.discordUsername ?? null,
    servicesOffered: profile.servicesOffered ?? null,
    experienceLevel: profile.experienceLevel ?? null,
    portfolioUrl: profile.portfolioUrl ?? null,
    socialLinks: profile.socialLinks ?? null,
    verificationStatus: profile.verificationStatus,
    level: profile.level,
    isFeatured: profile.isFeatured,
    totalLikes: 0,
    totalSamples: 0,
    followerCount: 0,
    username: null,
    joinedAt: null,
    createdAt: profile.createdAt.toISOString(),
  });
});

router.delete("/admin/samples/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(samplesTable).where(eq(samplesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Sample not found" }); return; }

  const filesToDelete = [existing.fileUrl, existing.previewImageUrl, existing.previewVideoUrl].filter(Boolean) as string[];
  await Promise.allSettled(filesToDelete.map(url => {
    const path = storageService.normalizeObjectEntityPath(url);
    if (path.startsWith("/objects/")) return storageService.deleteObjectEntity(path);
    return Promise.resolve();
  }));

  await db.delete(samplesTable).where(eq(samplesTable.id, id));
  res.sendStatus(204);
});

router.delete("/admin/reviews/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Review not found" }); return; }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/pins", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT cp.pin, cp.used, cp.used_by_user_id, cp.created_at,
           u.username as used_by_username, u.email as used_by_email
    FROM creator_pins cp
    LEFT JOIN users u ON u.id = cp.used_by_user_id
    ORDER BY cp.used ASC, cp.pin ASC
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  res.json(rows.map(r => ({
    pin: r.pin,
    used: r.used,
    usedByUserId: r.used_by_user_id ?? null,
    usedByUsername: r.used_by_username ?? null,
    usedByEmail: r.used_by_email ?? null,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  })));
});

router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) as total_users,
      (SELECT COUNT(*)::int FROM creator_profiles) as total_creators,
      (SELECT COUNT(*)::int FROM samples) as total_samples,
      (SELECT COUNT(*)::int FROM samples WHERE status = 'pending') as pending_approvals,
      (SELECT COUNT(*)::int FROM likes) as total_likes
  `);
  const row = (result as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};
  res.json({
    totalUsers: Number(row.total_users ?? 0),
    totalCreators: Number(row.total_creators ?? 0),
    totalSamples: Number(row.total_samples ?? 0),
    pendingApprovals: Number(row.pending_approvals ?? 0),
    totalLikes: Number(row.total_likes ?? 0),
  });
});

export default router;
