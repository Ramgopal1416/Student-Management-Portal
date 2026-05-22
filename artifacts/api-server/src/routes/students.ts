import { Router, type Request, type Response } from "express";
import { db, studentsTable, faceDataTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { requireAuth, requireTeacher } from "../middlewares/auth";

const router = Router();

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  if (req.session.userRole !== "student") {
    res.status(403).json({ error: "Students only" });
    return;
  }
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, req.session.studentId!)).limit(1);
    if (!student) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapStudent(student));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { department, year, section, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  try {
    let conditions = [];
    if (department) conditions.push(eq(studentsTable.department, department));
    if (year) conditions.push(eq(studentsTable.year, year));
    if (section) conditions.push(eq(studentsTable.section, section));
    if (search) conditions.push(or(
      ilike(studentsTable.name, `%${search}%`),
      ilike(studentsTable.registrationNumber, `%${search}%`),
    )!);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(where);
    const students = await db.select().from(studentsTable).where(where).limit(limitNum).offset(offset).orderBy(studentsTable.name);

    res.json({
      students: students.map(mapStudent),
      total: count,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireTeacher, async (req: Request, res: Response) => {
  const { name, registrationNumber, department, year, section, dateOfBirth, gender, studentEmail, parentName, parentEmail, parentPhone, address } = req.body;
  if (!name || !registrationNumber || !department || !year || !section || !dateOfBirth || !gender) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const existing = await db.select().from(studentsTable).where(eq(studentsTable.registrationNumber, registrationNumber)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Registration number already exists" });
      return;
    }
    const [student] = await db.insert(studentsTable).values({
      name, registrationNumber, department, year, section, dateOfBirth, gender,
      studentEmail: studentEmail || null, parentName: parentName || null,
      parentEmail: parentEmail || null, parentPhone: parentPhone || null, address: address || null,
    }).returning();
    res.status(201).json(mapStudent(student));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    res.json(mapStudent(student));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, department, year, section, studentEmail, parentName, parentEmail, parentPhone, address } = req.body;
  try {
    const [updated] = await db.update(studentsTable)
      .set({ name, department, year, section, studentEmail: studentEmail || null, parentName: parentName || null, parentEmail: parentEmail || null, parentPhone: parentPhone || null, address: address || null })
      .where(eq(studentsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Student not found" }); return; }
    res.json(mapStudent(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(faceDataTable).where(eq(faceDataTable.studentId, id));
    const [deleted] = await db.delete(studentsTable).where(eq(studentsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Student not found" }); return; }
    res.json({ message: "Student deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/face", requireTeacher, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { imageData } = req.body;
  if (!imageData || !Array.isArray(imageData)) {
    res.status(400).json({ error: "imageData array required" });
    return;
  }
  try {
    await db.delete(faceDataTable).where(eq(faceDataTable.studentId, id));
    await db.insert(faceDataTable).values({ studentId: id, imageData: JSON.stringify(imageData), accuracy: 95 });
    await db.update(studentsTable).set({ faceRegistered: true, faceUpdatedAt: new Date() }).where(eq(studentsTable.id, id));
    res.json({ studentId: id, registered: true, updatedAt: new Date().toISOString(), accuracy: 95 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/face-status", requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id)).limit(1);
    if (!student) { res.status(404).json({ error: "Student not found" }); return; }
    const [face] = await db.select().from(faceDataTable).where(eq(faceDataTable.studentId, id)).limit(1);
    res.json({
      studentId: id,
      registered: student.faceRegistered,
      updatedAt: student.faceUpdatedAt?.toISOString() ?? null,
      accuracy: face?.accuracy ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapStudent(s: any) {
  return {
    id: s.id,
    name: s.name,
    registrationNumber: s.registrationNumber,
    department: s.department,
    year: s.year,
    section: s.section,
    dateOfBirth: s.dateOfBirth,
    gender: s.gender,
    studentEmail: s.studentEmail,
    parentName: s.parentName,
    parentEmail: s.parentEmail,
    parentPhone: s.parentPhone,
    address: s.address,
    faceRegistered: s.faceRegistered,
    faceUpdatedAt: s.faceUpdatedAt?.toISOString() ?? null,
    createdAt: s.createdAt?.toISOString(),
  };
}

export default router;
