import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faceDataTable = pgTable("face_data", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  imageData: text("image_data"),
  accuracy: real("accuracy"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFaceDataSchema = createInsertSchema(faceDataTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertFaceData = z.infer<typeof insertFaceDataSchema>;
export type FaceData = typeof faceDataTable.$inferSelect;
