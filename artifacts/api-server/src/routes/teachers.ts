import { Router, type Request, type Response } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/me", requireTeacher, async (req: Request, res: Response) => {
  try {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, req.session.userId!)).limit(1);
    if (!teacher) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ id: teacher.id, name: teacher.name, email: teacher.email, employeeId: teacher.employeeId, department: teacher.department, phone: teacher.phone, createdAt: teacher.createdAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/me", requireTeacher, async (req: Request, res: Response) => {
  const { name, phone, department } = req.body;
  try {
    const [updated] = await db.update(teachersTable)
      .set({ name, phone: phone || null, department })
      .where(eq(teachersTable.id, req.session.userId!))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    req.session.userName = updated.name;
    res.json({ id: updated.id, name: updated.name, email: updated.email, employeeId: updated.employeeId, department: updated.department, phone: updated.phone, createdAt: updated.createdAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
