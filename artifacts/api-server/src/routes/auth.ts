import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, teachersTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";

const router = Router();

router.post("/teacher/register", async (req: Request, res: Response) => {
  const { name, email, password, employeeId, department, phone } = req.body;
  if (!name || !email || !password || !employeeId || !department) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const existing = await db.select().from(teachersTable).where(eq(teachersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [teacher] = await db.insert(teachersTable).values({
      name, email, passwordHash, employeeId, department, phone: phone || null,
    }).returning();
    req.session.userId = teacher.id;
    req.session.userRole = "teacher";
    req.session.userName = teacher.name;
    req.session.userEmail = teacher.email;
    res.status(201).json({
      user: { id: teacher.id, role: "teacher", name: teacher.name, email: teacher.email },
      token: "session",
    });
  } catch (err: any) {
    req.log.error(err);
    if (err.code === "23505") {
      res.status(400).json({ error: "Employee ID or email already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/teacher/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  try {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.email, email)).limit(1);
    if (!teacher) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, teacher.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.userId = teacher.id;
    req.session.userRole = "teacher";
    req.session.userName = teacher.name;
    req.session.userEmail = teacher.email;
    res.json({
      user: { id: teacher.id, role: "teacher", name: teacher.name, email: teacher.email },
      token: "session",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/student/login", async (req: Request, res: Response) => {
  const { registrationNumber, dateOfBirth } = req.body;
  if (!registrationNumber || !dateOfBirth) {
    res.status(400).json({ error: "Registration number and date of birth required" });
    return;
  }
  try {
    const [student] = await db.select().from(studentsTable)
      .where(and(
        eq(studentsTable.registrationNumber, registrationNumber),
        eq(studentsTable.dateOfBirth, dateOfBirth),
      )).limit(1);
    if (!student) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.userId = student.id;
    req.session.userRole = "student";
    req.session.userName = student.name;
    req.session.userEmail = student.studentEmail || "";
    req.session.studentId = student.id;
    res.json({
      user: { id: student.id, role: "student", name: student.name, email: student.studentEmail || "", studentId: student.id },
      token: "session",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/parent/login", async (req: Request, res: Response) => {
  const { email, studentRegistrationNumber } = req.body;
  if (!email || !studentRegistrationNumber) {
    res.status(400).json({ error: "Email and student registration number required" });
    return;
  }
  try {
    const [student] = await db.select().from(studentsTable)
      .where(eq(studentsTable.registrationNumber, studentRegistrationNumber))
      .limit(1);
    if (!student || student.parentEmail?.toLowerCase() !== email.toLowerCase()) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    req.session.userId = student.id + 1000000;
    req.session.userRole = "parent";
    req.session.userName = student.parentName || "Parent";
    req.session.userEmail = email;
    req.session.studentId = student.id;
    res.json({
      user: { id: student.id + 1000000, role: "parent", name: student.parentName || "Parent", email, studentId: student.id },
      token: "session",
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({
    id: req.session.userId!,
    role: req.session.userRole!,
    name: req.session.userName!,
    email: req.session.userEmail!,
    studentId: req.session.studentId ?? null,
  });
});

router.post("/teacher/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  try {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.email, email)).limit(1);
    if (!teacher) {
      res.json({ message: "If that email exists, a reset link has been sent." });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    await db.update(teachersTable).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(teachersTable.id, teacher.id));
    req.log.info({ token }, "Password reset token generated (email sending not configured)");
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/teacher/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) { res.status(400).json({ error: "Token and new password required" }); return; }
  try {
    const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.resetToken, token)).limit(1);
    if (!teacher || !teacher.resetTokenExpiresAt || teacher.resetTokenExpiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(teachersTable).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(teachersTable.id, teacher.id));
    res.json({ message: "Password reset successful" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
