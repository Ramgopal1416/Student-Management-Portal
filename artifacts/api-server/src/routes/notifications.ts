import { Router, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const notifications = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userId, req.session.userId!), eq(notificationsTable.userRole, req.session.userRole!)))
      .orderBy(notificationsTable.createdAt);
    res.json(notifications.map((n: any) => ({
      id: n.id, message: n.message, type: n.type, isRead: n.isRead,
      createdAt: n.createdAt?.toISOString(),
    })).reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/read", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
    res.json({ message: "Marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.update(notificationsTable).set({ isRead: true })
      .where(and(eq(notificationsTable.userId, req.session.userId!), eq(notificationsTable.userRole, req.session.userRole!)));
    res.json({ message: "All marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
