import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const creatorPinsTable = pgTable("creator_pins", {
  pin: text("pin").primaryKey(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
