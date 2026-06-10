import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, sql, and, or, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;

  const result = await db.execute(sql`
    SELECT DISTINCT ON (other_id)
      other_id,
      other_username,
      other_avatar,
      last_content,
      last_at,
      unread_count
    FROM (
      SELECT
        CASE WHEN m.sender_id = ${authUser.id} THEN m.recipient_id ELSE m.sender_id END AS other_id,
        CASE WHEN m.sender_id = ${authUser.id} THEN ru.username ELSE su.username END AS other_username,
        NULL::text AS other_avatar,
        m.content AS last_content,
        m.created_at AS last_at,
        SUM(CASE WHEN m.recipient_id = ${authUser.id} AND m.is_read = false THEN 1 ELSE 0 END)::int AS unread_count
      FROM messages m
      JOIN users su ON su.id = m.sender_id
      JOIN users ru ON ru.id = m.recipient_id
      WHERE m.sender_id = ${authUser.id} OR m.recipient_id = ${authUser.id}
      GROUP BY m.id, m.sender_id, m.recipient_id, m.content, m.created_at, ru.username, su.username
    ) sub
    ORDER BY other_id, last_at DESC
  `);

  res.json((result as { rows: unknown[] }).rows);
});

router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const otherId = parseInt(raw, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.senderId, otherId), eq(messagesTable.recipientId, authUser.id)));

  const result = await db.execute(sql`
    SELECT m.*, su.username AS sender_username, ru.username AS recipient_username
    FROM messages m
    JOIN users su ON su.id = m.sender_id
    JOIN users ru ON ru.id = m.recipient_id
    WHERE (m.sender_id = ${authUser.id} AND m.recipient_id = ${otherId})
       OR (m.sender_id = ${otherId} AND m.recipient_id = ${authUser.id})
    ORDER BY m.created_at ASC
    LIMIT 100
  `);

  res.json((result as { rows: unknown[] }).rows);
});

router.post("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const authUser = (req as typeof req & { user: typeof usersTable.$inferSelect }).user;
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const recipientId = parseInt(raw, 10);
  if (isNaN(recipientId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "Message content required" }); return; }

  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, recipientId));
  if (!recipient) { res.status(404).json({ error: "User not found" }); return; }

  const [msg] = await db.insert(messagesTable).values({
    senderId: authUser.id,
    recipientId,
    content: content.trim(),
  }).returning();

  res.status(201).json(msg);
});

export default router;
