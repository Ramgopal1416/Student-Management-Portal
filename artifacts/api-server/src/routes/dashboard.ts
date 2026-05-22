import { Router, type Request, type Response } from "express";
import { db, studentsTable, attendanceTable, leaveRequestsTable, announcementsTable, notificationsTable, periodsTable, announcementReadsTable, teachersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/teacher", requireAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(studentsTable);
    const todayRecords = await db.select().from(attendanceTable).where(eq(attendanceTable.date, today));
    const presentIds = new Set(todayRecords.filter((r: any) => r.status === "present" || r.status === "late").map((r: any) => r.studentId));
    const absentIds = new Set(todayRecords.filter((r: any) => r.status === "absent").map((r: any) => r.studentId));
    const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(leaveRequestsTable).where(eq(leaveRequestsTable.status, "pending"));
    const announcements = await db.select().from(announcementsTable).orderBy(announcementsTable.createdAt).limit(5);
    const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` }).from(notificationsTable).where(and(eq(notificationsTable.userId, req.session.userId!), eq(notificationsTable.isRead, false)));

    const departments = await db.selectDistinct({ department: studentsTable.department }).from(studentsTable);
    const departmentStats = await Promise.all(departments.map(async ({ department }: any) => {
      const students = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.department, department));
      const stuIds = students.map((s: any) => s.id);
      const present = stuIds.filter((id: number) => presentIds.has(id)).length;
      return { department, totalStudents: students.length, presentToday: present, percentage: students.length > 0 ? Math.round((present / students.length) * 100) : 0 };
    }));

    const teacher = await db.select().from(teachersTable).where(eq(teachersTable.id, req.session.userId!)).limit(1);
    const recentAnnouncements = await Promise.all(announcements.slice(0, 5).map(async (a: any) => ({ id: a.id, title: a.title, description: a.description, priority: a.priority, teacherName: teacher[0]?.name ?? null, isRead: false, createdAt: a.createdAt?.toISOString() })));

    res.json({
      totalStudents: total,
      presentToday: presentIds.size,
      absentToday: absentIds.size,
      attendancePercentage: total > 0 ? Math.round((presentIds.size / total) * 100 * 10) / 10 : 0,
      pendingLeaves: pending,
      recentAnnouncements,
      departmentStats,
      unreadNotifications: unread,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/student", requireAuth, async (req: Request, res: Response) => {
  const studentId = req.session.studentId!;
  try {
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId));
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const total = records.length;
    const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(leaveRequestsTable).where(and(eq(leaveRequestsTable.studentId, studentId), eq(leaveRequestsTable.status, "pending")));
    const announcements = await db.select().from(announcementsTable).orderBy(announcementsTable.createdAt).limit(10);
    const reads = await db.select().from(announcementReadsTable).where(and(eq(announcementReadsTable.userId, req.session.userId!), eq(announcementReadsTable.userRole, "student")));
    const readIds = new Set(reads.map((r: any) => r.announcementId));
    const unreadAnnouncements = announcements.filter((a: any) => !readIds.has(a.id)).length;
    const periods = await db.select().from(periodsTable);
    const subjectWiseAttendance = Object.values(periods.reduce((acc: any, p: any) => {
      if (!acc[p.subject]) acc[p.subject] = { subject: p.subject, totalClasses: 0, present: 0 };
      const periodRecords = records.filter((r: any) => r.periodId === p.id);
      acc[p.subject].totalClasses += periodRecords.length;
      acc[p.subject].present += periodRecords.filter((r: any) => r.status === "present" || r.status === "late").length;
      return acc;
    }, {})).map((s: any) => ({ ...s, percentage: s.totalClasses > 0 ? Math.round((s.present / s.totalClasses) * 100 * 10) / 10 : 0 }));

    const recentRecords = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId)).orderBy(attendanceTable.date).limit(10);
    const enrichedRecent = await Promise.all(recentRecords.reverse().map(async (r: any) => {
      const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, r.periodId)).limit(1);
      return { id: r.id, studentId: r.studentId, studentName: null, registrationNumber: null, periodId: r.periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date: r.date, status: r.status, markedAt: r.markedAt?.toISOString() };
    }));

    res.json({
      attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
      presentDays: present, absentDays: absent, lateDays: late, totalDays: total,
      pendingLeaves: pending, subjectWiseAttendance, recentAttendance: enrichedRecent, unreadAnnouncements,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/parent", requireAuth, async (req: Request, res: Response) => {
  const studentId = req.session.studentId!;
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    const records = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId));
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const total = records.length;
    const [{ pending }] = await db.select({ pending: sql<number>`count(*)::int` }).from(leaveRequestsTable).where(and(eq(leaveRequestsTable.studentId, studentId), eq(leaveRequestsTable.status, "pending")));
    const recentRecords = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, studentId)).orderBy(attendanceTable.date).limit(10);
    const enrichedRecent = await Promise.all(recentRecords.reverse().map(async (r: any) => {
      const [period] = await db.select().from(periodsTable).where(eq(periodsTable.id, r.periodId)).limit(1);
      return { id: r.id, studentId: r.studentId, studentName: null, registrationNumber: null, periodId: r.periodId, periodName: period?.name ?? null, subject: period?.subject ?? null, date: r.date, status: r.status, markedAt: r.markedAt?.toISOString() };
    }));
    const announcements = await db.select().from(announcementsTable).orderBy(announcementsTable.createdAt).limit(5);
    const recentAnnouncements = announcements.reverse().map((a: any) => ({ id: a.id, title: a.title, description: a.description, priority: a.priority, teacherName: null, isRead: false, createdAt: a.createdAt?.toISOString() }));

    const studentMapped = { id: student.id, name: student.name, registrationNumber: student.registrationNumber, department: student.department, year: student.year, section: student.section, dateOfBirth: student.dateOfBirth, gender: student.gender, studentEmail: student.studentEmail, parentName: student.parentName, parentEmail: student.parentEmail, parentPhone: student.parentPhone, address: student.address, faceRegistered: student.faceRegistered, faceUpdatedAt: student.faceUpdatedAt?.toISOString() ?? null, createdAt: student.createdAt?.toISOString() };

    res.json({
      student: studentMapped,
      attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100 * 10) / 10 : 0,
      presentDays: present, absentDays: absent, lateDays: late, totalDays: total,
      recentAttendance: enrichedRecent, pendingLeaves: pending, recentAnnouncements,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attendance-trends", requireAuth, async (req: Request, res: Response) => {
  const { studentId, year } = req.query as Record<string, string>;
  const y = parseInt(year) || new Date().getFullYear();
  try {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = await Promise.all(Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const conds = [gte(attendanceTable.date, startDate), lte(attendanceTable.date, endDate)];
      if (studentId) conds.push(eq(attendanceTable.studentId, parseInt(studentId)));
      const records = await db.select().from(attendanceTable).where(and(...conds));
      const present = records.filter((r: any) => r.status === "present" || r.status === "late").length;
      const absent = records.filter((r: any) => r.status === "absent").length;
      const total = records.length;
      return { month: m, year: y, monthName: months[m - 1], presentCount: present, absentCount: absent, percentage: total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0 };
    }));
    res.json(trends);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/low-attendance", requireAuth, async (req: Request, res: Response) => {
  const { threshold = "75" } = req.query as Record<string, string>;
  const thresh = parseFloat(threshold);
  try {
    const students = await db.select().from(studentsTable);
    const results = await Promise.all(students.map(async (s: any) => {
      const records = await db.select().from(attendanceTable).where(eq(attendanceTable.studentId, s.id));
      const total = records.length;
      if (total === 0) return null;
      const present = records.filter((r: any) => r.status === "present" || r.status === "late").length;
      const pct = Math.round((present / total) * 100 * 10) / 10;
      if (pct < thresh) return { studentId: s.id, studentName: s.name, registrationNumber: s.registrationNumber, department: s.department, section: s.section, percentage: pct };
      return null;
    }));
    res.json(results.filter(Boolean).sort((a: any, b: any) => a.percentage - b.percentage));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
