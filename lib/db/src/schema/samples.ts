import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const samplesTable = pgTable("samples", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(), // references creator_profiles.id
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  gameType: text("game_type"),
  budget: integer("budget"),
  previewImageUrl: text("preview_image_url"),
  previewVideoUrl: text("preview_video_url"),
  fileUrl: text("file_url"),
  experience: text("experience"),
  tags: text("tags"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSampleSchema = createInsertSchema(samplesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSample = z.infer<typeof insertSampleSchema>;
export type Sample = typeof samplesTable.$inferSelect;
