import { Router, type Request, type Response } from "express";
import { db, studentsTable, attendanceTable, periodsTable, leaveRequestsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/class", requireAuth, async (req: Request, res: Response) => {
  const { department, year, section, periodId, startDate, endDate } = req.query as Record<string, string>;
  try {
    let students = await db.select().from(studentsTable);
    if (department) students = students.filter((s: any) => s.department === department);
    if (year) students = students.filter((s: any) => s.year === year);
    if (section) students = students.filter((s: any) => s.section === section);

    const rows = await Promise.all(students.map(async (s: any) => {
      const conds = [eq(attendanceTable.studentId, s.id)];
      if (periodId) conds.push(eq(attendanceTable.periodId, parseInt(periodId)));
      if (startDate) conds.push(gte(attendanceTable.date, startDate));
      if (endDate) conds.push(lte(attendanceTable.date, endDate));
      const records = await db.select().from(attendanceTable).where(and(...conds));
      const present = records.filter((r: any) => r.status === "present").length;
      const absent = records.filter((r: any) => r.status === "absent").length;
      const late = records.filter((r: any) => r.status === "late").length;
      const total = records.length;
      return {
        studentId: s.id, studentName: s.name, registrationNumber: s.registrationNumber,
        department: s.department, section: s.section,
        totalPresent: present, totalAbsent: absent, totalLate: late,
        percentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
      };
    }));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/student", requireAuth, async (req: Request, res: Response) => {
  const { studentId, startDate, endDate } = req.query as Record<string, string>;
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }
  const sid = parseInt(studentId);
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sid)).limit(1);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    const conds = [eq(attendanceTable.studentId, sid)];
    if (startDate) conds.push(gte(attendanceTable.date, startDate));
    if (endDate) conds.push(lte(attendanceTable.date, endDate));
    const records = await db.select().from(attendanceTable).where(and(...conds));
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const total = records.length;
    const summary = {
      studentId: sid, studentName: student.name, registrationNumber: student.registrationNumber,
      totalClasses: total, presentCount: present, absentCount: absent, lateCount: late,
      percentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
    };

    const periods = await db.select().from(periodsTable);
    const subjectMap: Record<string, { subject: string; totalClasses: number; present: number }> = {};
    for (const p of periods) {
      if (!subjectMap[p.subject]) subjectMap[p.subject] = { subject: p.subject, totalClasses: 0, present: 0 };
      const pr = records.filter((r: any) => r.periodId === p.id);
      subjectMap[p.subject].totalClasses += pr.length;
      subjectMap[p.subject].present += pr.filter((r: any) => r.status === "present" || r.status === "late").length;
    }
    const subjectWiseAttendance = Object.values(subjectMap).map((s) => ({ ...s, percentage: s.totalClasses > 0 ? Math.round((s.present / s.totalClasses) * 100 * 10) / 10 : 0 }));

    const enrichedRecords = await Promise.all(records.map(async (r: any) => {
      const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, r.periodId)).limit(1);
      return { id: r.id, studentId: r.studentId, studentName: student.name, registrationNumber: student.registrationNumber, periodId: r.periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date: r.date, status: r.status, markedAt: r.markedAt?.toISOString() };
    }));

    const leaves = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.studentId, sid));
    const leaveHistory = leaves.map((l: any) => ({
      id: l.id, studentId: l.studentId, studentName: student.name, registrationNumber: student.registrationNumber,
      leaveDate: l.leaveDate, reason: l.reason, attachmentUrl: l.attachmentUrl, status: l.status,
      remarks: l.remarks, reviewedBy: l.reviewedBy, createdAt: l.createdAt?.toISOString(),
    }));

    const studentMapped = { id: student.id, name: student.name, registrationNumber: student.registrationNumber, department: student.department, year: student.year, section: student.section, dateOfBirth: student.dateOfBirth, gender: student.gender, studentEmail: student.studentEmail, parentName: student.parentName, parentEmail: student.parentEmail, parentPhone: student.parentPhone, address: student.address, faceRegistered: student.faceRegistered, faceUpdatedAt: student.faceUpdatedAt?.toISOString() ?? null, createdAt: student.createdAt?.toISOString() };

    res.json({ student: studentMapped, summary, dailyAttendance: enrichedRecords, subjectWiseAttendance, leaveHistory });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
