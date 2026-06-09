import { Router, type IRouter } from "express";
import { db, usersTable, requestsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import { CreateRequestBody } from "@workspace/api-zod";

const router: IRouter = Router();
type AnyUser = typeof usersTable.$inferSelect;

function formatRequest(r: Record<string, unknown>): unknown {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description ?? null,
    category: r.category,
    gameType: r.game_type ?? null,
    budget: r.budget ?? null,
    deadline: r.deadline ?? null,
    referenceImageUrl: r.reference_image_url ?? null,
    status: r.status,
    username: r.username ?? null,
    createdAt: typeof r.created_at === "string" ? r.created_at : (r.created_at as Date)?.toISOString?.() ?? null,
  };
}

router.get("/requests", optionalAuth, async (req, res): Promise<void> => {
  const { category, status, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const off = parseInt(offset, 10) || 0;

  const conditions: string[] = [];
  if (category) conditions.push(`r.category = '${category.replace(/'/g, "''")}'`);
  if (status) conditions.push(`r.status = '${status.replace(/'/g, "''")}'`);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.execute(sql.raw(`
    SELECT r.*, u.username
    FROM requests r JOIN users u ON u.id = r.user_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ${lim} OFFSET ${off}
  `));
  res.json((result as { rows: Array<Record<string, unknown>> }).rows.map(formatRequest));
});

router.post("/requests", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: AnyUser }).user;
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [request] = await db.insert(requestsTable).values({ ...parsed.data, userId: authUser.id }).returning();
  res.status(201).json(formatRequest({ ...request, username: authUser.username }));
});

router.get("/requests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const result = await db.execute(sql`
    SELECT r.*, u.username FROM requests r JOIN users u ON u.id = r.user_id WHERE r.id = ${id}
  `);
  const rows = (result as { rows: Array<Record<string, unknown>> }).rows;
  if (!rows.length) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(formatRequest(rows[0]));
});

export default router;
