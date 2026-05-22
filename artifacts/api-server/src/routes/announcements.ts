import { Router, type Request, type Response } from "express";
import { db, announcementsTable, teachersTable, announcementReadsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { priority } = req.query as Record<string, string>;
  try {
    const conds = priority ? [eq(announcementsTable.priority, priority)] : [];
    const announcements = await db.select().from(announcementsTable).where(conds.length > 0 ? and(...conds) : undefined).orderBy(announcementsTable.createdAt);

    const userId = req.session.userId!;
    const userRole = req.session.userRole!;
    const reads = await db.select().from(announcementReadsTable).where(and(eq(announcementReadsTable.userId, userId), eq(announcementReadsTable.userRole, userRole)));
    const readIds = new Set(reads.map((r: any) => r.announcementId));

    const enriched = await Promise.all(announcements.map(async (a: any) => {
      const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, a.teacherId)).limit(1);
      return {
        id: a.id, title: a.title, description: a.description, priority: a.priority,
        teacherName: teacher?.name ?? null,
        isRead: readIds.has(a.id),
        createdAt: a.createdAt?.toISOString(),
      };
    }));
    res.json(enriched.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireTeacher, async (req: Request, res: Response) => {
  const { title, description, priority } = req.body;
  if (!title || !description || !priority) {
    res.status(400).json({ error: "Title, description, and priority required" });
    return;
  }
  try {
    const [a] = await db.insert(announcementsTable).values({ teacherId: req.session.userId!, title, description, priority }).returning();
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, req.session.userId!)).limit(1);
    res.status(201).json({ id: a.id, title: a.title, description: a.description, priority: a.priority, teacherName: teacher?.name ?? null, isRead: false, createdAt: a.createdAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, description, priority } = req.body;
  try {
    const [updated] = await db.update(announcementsTable).set({ title, description, priority }).where(eq(announcementsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Announcement not found" }); return; }
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, updated.teacherId)).limit(1);
    res.json({ id: updated.id, title: updated.title, description: updated.description, priority: updated.priority, teacherName: teacher?.name ?? null, isRead: false, createdAt: updated.createdAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(announcementReadsTable).where(eq(announcementReadsTable.announcementId, id));
    const [deleted] = await db.delete(announcementsTable).where(eq(announcementsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Announcement not found" }); return; }
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/read", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const existing = await db.select().from(announcementReadsTable)
      .where(and(eq(announcementReadsTable.announcementId, id), eq(announcementReadsTable.userId, req.session.userId!), eq(announcementReadsTable.userRole, req.session.userRole!)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(announcementReadsTable).values({ announcementId: id, userId: req.session.userId!, userRole: req.session.userRole! });
    }
    res.json({ message: "Marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
