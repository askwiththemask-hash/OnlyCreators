import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const creatorPinsTable = pgTable("creator_pins", {
  pin: text("pin").primaryKey(),
  used: boolean("used").notNull().default(false),
  usedByUserId: integer("used_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
