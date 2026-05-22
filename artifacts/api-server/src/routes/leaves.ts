import { Router, type Request, type Response } from "express";
import { db, leaveRequestsTable, studentsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { studentId, status } = req.query as Record<string, string>;
  try {
    const conds = [];
    if (req.session.userRole === "student") {
      conds.push(eq(leaveRequestsTable.studentId, req.session.studentId!));
    } else if (req.session.userRole === "parent") {
      conds.push(eq(leaveRequestsTable.studentId, req.session.studentId!));
    } else {
      if (studentId) conds.push(eq(leaveRequestsTable.studentId, parseInt(studentId)));
    }
    if (status) conds.push(eq(leaveRequestsTable.status, status));
    const leaves = await db.select().from(leaveRequestsTable).where(conds.length > 0 ? and(...conds) : undefined).orderBy(leaveRequestsTable.createdAt);
    const enriched = await Promise.all(leaves.map(async (l: any) => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, l.studentId)).limit(1);
      return mapLeave(l, student?.name, student?.registrationNumber);
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  if (req.session.userRole !== "student") {
    res.status(403).json({ error: "Students only" });
    return;
  }
  const { leaveDate, reason, attachmentUrl } = req.body;
  if (!leaveDate || !reason) {
    res.status(400).json({ error: "Leave date and reason required" });
    return;
  }
  try {
    const [leave] = await db.insert(leaveRequestsTable).values({
      studentId: req.session.studentId!, leaveDate, reason, attachmentUrl: attachmentUrl || null,
    }).returning();
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, req.session.studentId!)).limit(1);
    res.status(201).json(mapLeave(leave, student?.name, student?.registrationNumber));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [leave] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, id)).limit(1);
    if (!leave) { res.status(404).json({ error: "Leave request not found" }); return; }
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, leave.studentId)).limit(1);
    res.json(mapLeave(leave, student?.name, student?.registrationNumber));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, remarks } = req.body;
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    return;
  }
  try {
    const [updated] = await db.update(leaveRequestsTable)
      .set({ status, remarks: remarks || null, reviewedBy: req.session.userId! })
      .where(eq(leaveRequestsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Leave request not found" }); return; }

    await db.insert(notificationsTable).values({
      userId: updated.studentId, userRole: "student",
      message: `Your leave request for ${updated.leaveDate} has been ${status}.`,
      type: "leave_update",
    });

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, updated.studentId)).limit(1);
    if (student?.parentEmail) {
      await db.insert(notificationsTable).values({
        userId: updated.studentId + 1000000, userRole: "parent",
        message: `Your child's leave request for ${updated.leaveDate} has been ${status}.`,
        type: "leave_update",
      });
    }

    res.json(mapLeave(updated, student?.name, student?.registrationNumber));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapLeave(l: any, studentName?: string, registrationNumber?: string) {
  return {
    id: l.id, studentId: l.studentId,
    studentName: studentName ?? null, registrationNumber: registrationNumber ?? null,
    leaveDate: l.leaveDate, reason: l.reason, attachmentUrl: l.attachmentUrl,
    status: l.status, remarks: l.remarks, reviewedBy: l.reviewedBy,
    createdAt: l.createdAt?.toISOString(),
  };
}

export default router;
