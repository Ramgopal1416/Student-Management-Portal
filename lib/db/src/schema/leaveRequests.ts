import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaveRequestsTable = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  leaveDate: text("leave_date").notNull(),
  reason: text("reason").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").notNull().default("pending"),
  remarks: text("remarks"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequestsTable).omit({
  id: true, createdAt: true, updatedAt: true, status: true, remarks: true, reviewedBy: true,
});
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;
