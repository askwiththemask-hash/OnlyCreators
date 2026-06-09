import { Router, type IRouter } from "express";
import { db, usersTable, creatorProfilesTable, samplesTable, categoriesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, requireCreator } from "../middlewares/auth";

const router: IRouter = Router();
type AnyUser = typeof usersTable.$inferSelect;

router.get("/dashboard/stats", requireAuth, requireCreator, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;

  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT s.id)::int as total_samples,
      COUNT(DISTINCT l.id)::int as total_likes,
      COUNT(DISTINCT c.id)::int as total_comments,
      0::int as total_views,
      COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.id END)::int as pending_samples,
      COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END)::int as approved_samples
    FROM creator_profiles cp
    LEFT JOIN samples s ON s.creator_id = cp.id
    LEFT JOIN likes l ON l.sample_id = s.id
    LEFT JOIN comments c ON c.sample_id = s.id
    WHERE cp.user_id = ${authUser.id}
  `);

  const row = (result as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};
  res.json({
    totalSamples: Number(row.total_samples ?? 0),
    totalLikes: Number(row.total_likes ?? 0),
    totalComments: Number(row.total_comments ?? 0),
    totalViews: Number(row.total_views ?? 0),
    pendingSamples: Number(row.pending_samples ?? 0),
    approvedSamples: Number(row.approved_samples ?? 0),
  });
});

router.get("/home/stats", async (_req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM creator_profiles) as total_creators,
      (SELECT COUNT(*)::int FROM samples WHERE status = 'approved') as total_samples,
      (SELECT COUNT(*)::int FROM categories) as total_categories
  `);
  const row = (result as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};
  res.json({
    totalCreators: Number(row.total_creators ?? 0),
    totalSamples: Number(row.total_samples ?? 0),
    totalCategories: Number(row.total_categories ?? 0),
  });
});

export default router;
