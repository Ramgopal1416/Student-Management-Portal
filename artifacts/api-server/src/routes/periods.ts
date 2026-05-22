import { Router, type Request, type Response } from "express";
import { db, periodsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { department, section } = req.query as Record<string, string>;
  try {
    let conditions = [];
    if (department) conditions.push(eq(periodsTable.department, department));
    if (section) conditions.push(eq(periodsTable.section, section));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const periods = await db.select().from(periodsTable).where(where).orderBy(periodsTable.name);
    res.json(periods.map(mapPeriod));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireTeacher, async (req: Request, res: Response) => {
  const { name, subject, startTime, endTime, department, year, section } = req.body;
  if (!name || !subject || !startTime || !endTime || !department || !year || !section) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const [period] = await db.insert(periodsTable).values({ name, subject, startTime, endTime, department, year, section }).returning();
    res.status(201).json(mapPeriod(period));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, subject, startTime, endTime } = req.body;
  try {
    const [updated] = await db.update(periodsTable).set({ name, subject, startTime, endTime }).where(eq(periodsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Period not found" }); return; }
    res.json(mapPeriod(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db.delete(periodsTable).where(eq(periodsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Period not found" }); return; }
    res.json({ message: "Period deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapPeriod(p: any) {
  return {
    id: p.id, name: p.name, subject: p.subject,
    startTime: p.startTime, endTime: p.endTime,
    department: p.department, year: p.year, section: p.section,
    createdAt: p.createdAt?.toISOString(),
  };
}

export default router;
