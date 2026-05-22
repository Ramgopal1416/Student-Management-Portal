import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";

export const announcementReadsTable = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull(),
  userId: integer("user_id").notNull(),
  userRole: text("user_role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
