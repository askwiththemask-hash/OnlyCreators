import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "../middlewares/auth";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

interface AuthenticatedWS extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

interface WSMsg {
  type: string;
  [key: string]: unknown;
}

// In-memory state
export const connections = new Map<number, AuthenticatedWS>();
export const onlineUsers = new Set<number>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function send(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastOnlineStatus(userId: number, isOnline: boolean): void {
  const msg = JSON.stringify({ type: "online_status", userId, isOnline });
  connections.forEach((ws, id) => {
    if (id !== userId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  // Heartbeat — detect dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as AuthenticatedWS;
      if (ws.isAlive === false) {
        if (ws.userId) {
          connections.delete(ws.userId);
          onlineUsers.delete(ws.userId);
          broadcastOnlineStatus(ws.userId, false);
        }
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  wss.on("connection", (rawWs) => {
    const ws = rawWs as AuthenticatedWS;
    ws.isAlive = true;

    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("error", (err) => logger.error({ err }, "WebSocket client error"));

    ws.on("message", async (data) => {
      let msg: WSMsg;
      try { msg = JSON.parse(data.toString()) as WSMsg; }
      catch { return; }

      // ── AUTH ────────────────────────────────────────────────────────────
      if (msg.type === "auth") {
        const token = msg.token as string | undefined;
        if (!token) { send(ws, { type: "error", message: "Token required" }); ws.close(); return; }
        const decoded = verifyToken(token);
        if (!decoded) { send(ws, { type: "error", message: "Invalid token" }); ws.close(); return; }

        const userId = decoded.userId;
        // Close any previous connection for this user
        const existing = connections.get(userId);
        if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
          existing.close();
        }
        ws.userId = userId;
        connections.set(userId, ws);
        onlineUsers.add(userId);

        send(ws, { type: "authenticated", userId });
        send(ws, { type: "online_users", userIds: Array.from(onlineUsers) });
        broadcastOnlineStatus(userId, true);
        return;
      }

      // All subsequent messages require auth
      if (!ws.userId) {
        send(ws, { type: "error", message: "Not authenticated" });
        return;
      }

      // ── MESSAGE ─────────────────────────────────────────────────────────
      if (msg.type === "message") {
        const recipientId = msg.recipientId as number | undefined;
        const content = (msg.content as string | undefined) ?? "";
        const fileUrl = (msg.fileUrl as string | null | undefined) ?? null;
        const fileType = (msg.fileType as string | null | undefined) ?? null;

        if (!recipientId || (!content.trim() && !fileUrl)) return;
        if (recipientId === ws.userId) return; // block self-messages

        const [recipient] = await db.select({ id: usersTable.id, username: usersTable.username })
          .from(usersTable).where(eq(usersTable.id, recipientId));
        if (!recipient) return;

        const [sender] = await db.select({ id: usersTable.id, username: usersTable.username })
          .from(usersTable).where(eq(usersTable.id, ws.userId));
        if (!sender) return;

        const [saved] = await db.insert(messagesTable).values({
          senderId: ws.userId,
          recipientId,
          content: content.trim(),
          fileUrl,
          fileType,
        }).returning();

        const msgData = {
          ...saved,
          sender_id: saved.senderId,
          recipient_id: saved.recipientId,
          is_read: saved.isRead,
          file_url: saved.fileUrl,
          file_type: saved.fileType,
          created_at: saved.createdAt,
          sender_username: sender.username,
          recipient_username: recipient.username,
        };

        // Deliver to recipient
        const recipientWs = connections.get(recipientId);
        if (recipientWs) send(recipientWs, { type: "message", message: msgData });

        // Echo back to sender
        send(ws, { type: "message", message: msgData });

        // Stop any typing indicator for this pair
        const typingKey = `${ws.userId}:${recipientId}`;
        const timer = typingTimers.get(typingKey);
        if (timer) { clearTimeout(timer); typingTimers.delete(typingKey); }
        if (recipientWs) send(recipientWs, { type: "typing", senderId: ws.userId, isTyping: false });
        return;
      }

      // ── TYPING ──────────────────────────────────────────────────────────
      if (msg.type === "typing") {
        const recipientId = msg.recipientId as number | undefined;
        const isTyping = msg.isTyping as boolean | undefined;
        if (!recipientId) return;

        const key = `${ws.userId}:${recipientId}`;
        const existing = typingTimers.get(key);
        if (existing) { clearTimeout(existing); typingTimers.delete(key); }

        const recipientWs = connections.get(recipientId);
        if (recipientWs) send(recipientWs, { type: "typing", senderId: ws.userId, isTyping: !!isTyping });

        if (isTyping) {
          const timer = setTimeout(() => {
            const rws = connections.get(recipientId);
            if (rws) send(rws, { type: "typing", senderId: ws.userId, isTyping: false });
            typingTimers.delete(key);
          }, 4000);
          typingTimers.set(key, timer);
        }
        return;
      }

      // ── READ RECEIPT ────────────────────────────────────────────────────
      if (msg.type === "read") {
        const senderId = msg.senderId as number | undefined;
        if (!senderId) return;

        await db.update(messagesTable)
          .set({ isRead: true })
          .where(and(
            eq(messagesTable.senderId, senderId),
            eq(messagesTable.recipientId, ws.userId),
          ));

        const senderWs = connections.get(senderId);
        if (senderWs) send(senderWs, { type: "read_receipt", readBy: ws.userId });
        return;
      }

      // ── PING ────────────────────────────────────────────────────────────
      if (msg.type === "ping") {
        send(ws, { type: "pong" });
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        connections.delete(ws.userId);
        onlineUsers.delete(ws.userId);
        broadcastOnlineStatus(ws.userId, false);
      }
    });
  });

  return wss;
}
