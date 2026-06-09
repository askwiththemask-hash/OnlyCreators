import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creatorProfilesTable = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  gmailAddress: text("gmail_address"),
  discordUsername: text("discord_username"),
  servicesOffered: text("services_offered"),
  experienceLevel: text("experience_level").default("Beginner"),
  portfolioUrl: text("portfolio_url"),
  socialLinks: text("social_links"),
  verificationStatus: text("verification_status").notNull().default("normal"), // normal | verified | premium
  level: text("level").notNull().default("Beginner"), // Beginner | Skilled | Professional | Expert | Legendary
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCreatorProfileSchema = createInsertSchema(creatorProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type CreatorProfile = typeof creatorProfilesTable.$inferSelect;
