import { Router, type Request, type Response } from "express";
import { db, attendanceTable, studentsTable, periodsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/summary", requireAuth, async (req: Request, res: Response) => {
  const { studentId, department, section, startDate, endDate } = req.query as Record<string, string>;
  try {
    let studentIds: number[] = [];
    if (studentId) {
      studentIds = [parseInt(studentId)];
    } else {
      let sQuery = db.select({ id: studentsTable.id }).from(studentsTable);
      const conds = [];
      if (department) conds.push(eq(studentsTable.department, department));
      if (section) conds.push(eq(studentsTable.section, section));
      const students = await (conds.length > 0 ? sQuery.where(and(...conds)) : sQuery);
      studentIds = students.map((s: any) => s.id);
    }

    const summaries = await Promise.all(studentIds.map(async (sid) => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sid)).limit(1);
      if (!student) return null;
      const conds = [eq(attendanceTable.studentId, sid)];
      if (startDate) conds.push(gte(attendanceTable.date, startDate));
      if (endDate) conds.push(lte(attendanceTable.date, endDate));
      const records = await db.select().from(attendanceTable).where(and(...conds));
      const total = records.length;
      const present = records.filter((r: any) => r.status === "present").length;
      const absent = records.filter((r: any) => r.status === "absent").length;
      const late = records.filter((r: any) => r.status === "late").length;
      return {
        studentId: sid,
        studentName: student.name,
        registrationNumber: student.registrationNumber,
        totalClasses: total,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        percentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
      };
    }));
    res.json(summaries.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/heatmap", requireAuth, async (req: Request, res: Response) => {
  const { studentId, month, year } = req.query as Record<string, string>;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  try {
    const conds = [gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate)];
    if (studentId) conds.push(eq(attendanceTable.studentId, parseInt(studentId)));
    const records = await db.select().from(attendanceTable).where(and(...conds));
    const grouped: Record<string, { present: number; absent: number; late: number }> = {};
    for (const r of records) {
      if (!grouped[r.date]) grouped[r.date] = { present: 0, absent: 0, late: 0 };
      if (r.status === "present") grouped[r.date].present++;
      else if (r.status === "absent") grouped[r.date].absent++;
      else if (r.status === "late") grouped[r.date].late++;
    }
    const result = Object.entries(grouped).map(([date, v]) => ({ date, ...v }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { studentId, periodId, date, department, section, startDate, endDate } = req.query as Record<string, string>;
  try {
    const conds = [];
    if (studentId) conds.push(eq(attendanceTable.studentId, parseInt(studentId)));
    if (periodId) conds.push(eq(attendanceTable.periodId, parseInt(periodId)));
    if (date) conds.push(eq(attendanceTable.date, date));
    if (startDate) conds.push(gte(attendanceTable.date, startDate));
    if (endDate) conds.push(lte(attendanceTable.date, endDate));

    let records = await db.select().from(attendanceTable).where(conds.length > 0 ? and(...conds) : undefined).orderBy(attendanceTable.date);

    if (department || section) {
      const students = await db.select().from(studentsTable);
      const filteredStudentIds = new Set(
        students.filter((s: any) => (!department || s.department === department) && (!section || s.section === section)).map((s: any) => s.id)
      );
      records = records.filter((r: any) => filteredStudentIds.has(r.studentId));
    }

    const enriched = await Promise.all(records.map(async (r: any) => {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, r.studentId)).limit(1);
      const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, r.periodId)).limit(1);
      return {
        id: r.id, studentId: r.studentId,
        studentName: student?.name ?? null,
        registrationNumber: student?.registrationNumber ?? null,
        periodId: r.periodId, periodName: period?.name ?? null, subject: period?.subject ?? null,
        date: r.date, status: r.status, markedAt: r.markedAt?.toISOString(),
      };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bulk", requireTeacher, async (req: Request, res: Response) => {
  const { periodId, date, records } = req.body;
  if (!periodId || !date || !Array.isArray(records)) {
    res.status(400).json({ error: "periodId, date, and records array required" });
    return;
  }
  let created = 0;
  let updated = 0;
  try {
    for (const r of records) {
      const existing = await db.select().from(attendanceTable)
        .where(and(eq(attendanceTable.studentId, r.studentId), eq(attendanceTable.periodId, periodId), eq(attendanceTable.date, date)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(attendanceTable).set({ status: r.status }).where(eq(attendanceTable.id, existing[0].id));
        updated++;
      } else {
        await db.insert(attendanceTable).values({ studentId: r.studentId, periodId, date, status: r.status });
        created++;
      }
    }
    res.status(201).json({ created, updated, total: records.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireTeacher, async (req: Request, res: Response) => {
  const { studentId, periodId, date, status } = req.body;
  if (!studentId || !periodId || !date || !status) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.studentId, studentId), eq(attendanceTable.periodId, periodId), eq(attendanceTable.date, date)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(attendanceTable).set({ status }).where(eq(attendanceTable.id, existing[0].id)).returning();
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
      const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, periodId)).limit(1);
      res.status(201).json({ id: updated.id, studentId, studentName: student?.name ?? null, registrationNumber: student?.registrationNumber ?? null, periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date, status: updated.status, markedAt: updated.markedAt?.toISOString() });
      return;
    }
    const [record] = await db.insert(attendanceTable).values({ studentId, periodId, date, status }).returning();
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
    const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, periodId)).limit(1);
    res.status(201).json({ id: record.id, studentId, studentName: student?.name ?? null, registrationNumber: student?.registrationNumber ?? null, periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date, status: record.status, markedAt: record.markedAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  try {
    const [updated] = await db.update(attendanceTable).set({ status }).where(eq(attendanceTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Record not found" }); return; }
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, updated.studentId)).limit(1);
    const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, updated.periodId)).limit(1);
    res.json({ id: updated.id, studentId: updated.studentId, studentName: student?.name ?? null, registrationNumber: student?.registrationNumber ?? null, periodId: updated.periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date: updated.date, status: updated.status, markedAt: updated.markedAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
