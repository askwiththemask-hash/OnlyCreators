import { Router, type IRouter } from "express";
import { db, usersTable, creatorProfilesTable, samplesTable } from "@workspace/db";
import { eq, sql, desc, ilike, or } from "drizzle-orm";
import { requireAuth, requireCreator } from "../middlewares/auth";
import { CreateCreatorProfileBody, UpdateCreatorProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

type CreatorRow = Record<string, unknown>;

function formatCreator(r: CreatorRow) {
  const createdAt = r.created_at ?? r.createdAt;
  return {
    id: r.id,
    userId: r.user_id ?? r.userId,
    displayName: r.display_name ?? r.displayName ?? null,
    bio: r.bio ?? null,
    avatarUrl: r.avatar_url ?? r.avatarUrl ?? null,
    gmailAddress: r.gmail_address ?? r.gmailAddress ?? null,
    discordUsername: r.discord_username ?? r.discordUsername ?? null,
    servicesOffered: r.services_offered ?? r.servicesOffered ?? null,
    experienceLevel: r.experience_level ?? r.experienceLevel ?? null,
    portfolioUrl: r.portfolio_url ?? r.portfolioUrl ?? null,
    socialLinks: r.social_links ?? r.socialLinks ?? null,
    verificationStatus: r.verification_status ?? r.verificationStatus ?? "normal",
    level: r.level ?? "Newcomer",
    isFeatured: r.is_featured ?? r.isFeatured ?? false,
    totalLikes: Number(r.total_likes ?? 0),
    totalSamples: Number(r.total_samples ?? 0),
    followerCount: Number(r.follower_count ?? 0),
    username: r.username ?? null,
    joinedAt: r.joined_at ? (typeof r.joined_at === "string" ? r.joined_at : (r.joined_at as Date).toISOString()) : null,
    createdAt: createdAt ? (typeof createdAt === "string" ? createdAt : (createdAt as Date).toISOString()) : null,
  };
}

router.get("/creators", async (req, res): Promise<void> => {
  const { search, category, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  let query = `
    SELECT cp.*, u.username,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id AND s.status = 'approved'
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN follows f ON f.creator_id = cp.id
  `;
  const conditions: string[] = [];
  if (search) conditions.push(`(cp.display_name ILIKE '%${search.replace(/'/g, "''")}%' OR u.username ILIKE '%${search.replace(/'/g, "''")}%')`);
  if (category) conditions.push(`cp.services_offered ILIKE '%${category.replace(/'/g, "''")}%'`);
  if (conditions.length) query += ` WHERE ${conditions.join(" AND ")}`;
  query += ` GROUP BY cp.id, u.username ORDER BY total_likes DESC LIMIT ${lim} OFFSET ${off}`;

  const result = await db.execute(sql.raw(query));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map((r) => formatCreator(r as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number })));
});

router.get("/creators/top", async (req, res): Promise<void> => {
  const { limit = "10" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 10, 50);

  const result = await db.execute(sql`
    SELECT cp.*, u.username,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id AND s.status = 'approved'
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN follows f ON f.creator_id = cp.id
    GROUP BY cp.id, u.username
    ORDER BY total_likes DESC
    LIMIT ${lim}
  `);
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map((r) => formatCreator(r as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number })));
});

router.get("/creators/featured", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT cp.*, u.username,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id AND s.status = 'approved'
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN follows f ON f.creator_id = cp.id
    WHERE cp.is_featured = true
    GROUP BY cp.id, u.username
    ORDER BY total_likes DESC
    LIMIT 12
  `);
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map((r) => formatCreator(r as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number })));
});

router.get("/creators/me", requireAuth, requireCreator, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const result = await db.execute(sql`
    SELECT cp.*, u.username,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id
    LEFT JOIN likes l ON l.sample_id = s.id AND s.status = 'approved'
    LEFT JOIN follows f ON f.creator_id = cp.id
    WHERE cp.user_id = ${authUser.id}
    GROUP BY cp.id, u.username
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  if (!rows.length) { res.status(404).json({ error: "Creator profile not found" }); return; }
  res.json(formatCreator(rows[0] as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number }));
});

router.post("/creators/me", requireAuth, requireCreator, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const parsed = CreateCreatorProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(creatorProfilesTable).where(eq(creatorProfilesTable.userId, authUser.id));
  if (existing.length > 0) { res.status(400).json({ error: "Creator profile already exists" }); return; }

  const [profile] = await db.insert(creatorProfilesTable).values({ ...parsed.data, userId: authUser.id }).returning();
  const result = await db.execute(sql`SELECT cp.*, u.username, 0::int AS total_likes, 0::int AS total_samples, 0::int AS follower_count FROM creator_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ${profile.id}`);
  res.status(201).json(formatCreator((result as { rows: Array<Record<string, unknown>> }).rows[0] as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number }));
});

router.patch("/creators/me", requireAuth, requireCreator, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const parsed = UpdateCreatorProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [profile] = await db.update(creatorProfilesTable).set(parsed.data).where(eq(creatorProfilesTable.userId, authUser.id)).returning();
  if (!profile) { res.status(404).json({ error: "Creator profile not found" }); return; }

  const result = await db.execute(sql`
    SELECT cp.*, u.username,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id
    LEFT JOIN likes l ON l.sample_id = s.id AND s.status = 'approved'
    LEFT JOIN follows f ON f.creator_id = cp.id
    WHERE cp.id = ${profile.id} GROUP BY cp.id, u.username
  `);
  res.json(formatCreator((result as { rows: Array<Record<string, unknown>> }).rows[0] as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number }));
});

router.get("/creators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const result = await db.execute(sql`
    SELECT cp.*, u.username, u.created_at as joined_at,
      COALESCE(COUNT(DISTINCT l.id), 0)::int AS total_likes,
      COALESCE(COUNT(DISTINCT s.id), 0)::int AS total_samples,
      COALESCE(COUNT(DISTINCT f.id), 0)::int AS follower_count
    FROM creator_profiles cp JOIN users u ON u.id = cp.user_id
    LEFT JOIN samples s ON s.creator_id = cp.id AND s.status = 'approved'
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN follows f ON f.creator_id = cp.id
    WHERE cp.id = ${id} GROUP BY cp.id, u.username, u.created_at
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  if (!rows.length) { res.status(404).json({ error: "Creator not found" }); return; }
  res.json(formatCreator(rows[0] as typeof creatorProfilesTable.$inferSelect & { username?: string; total_likes?: number; total_samples?: number; follower_count?: number }));
});

export default router;
