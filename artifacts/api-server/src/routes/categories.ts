import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { asc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));

  // Get sample counts per category
  const result = await db.execute(sql`
    SELECT c.*, COUNT(s.id)::int as sample_count
    FROM categories c
    LEFT JOIN samples s ON s.category = c.slug AND s.status = 'approved'
    GROUP BY c.id
    ORDER BY c.sort_order ASC
  `);

  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    icon: r.icon,
    description: r.description,
    sampleCount: r.sample_count ?? 0,
  })));
});

export default router;
