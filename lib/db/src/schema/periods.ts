import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const periodsTable = pgTable("periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  department: text("department").notNull(),
  year: text("year").notNull(),
  section: text("section").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPeriodSchema = createInsertSchema(periodsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type Period = typeof periodsTable.$inferSelect;
