import { type Request, type Response, type NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: "teacher" | "student" | "parent";
    userName: string;
    userEmail: string;
    studentId?: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "teacher") {
    res.status(403).json({ error: "Forbidden: teachers only" });
    return;
  }
  next();
}

export function requireStudent(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "student") {
    res.status(403).json({ error: "Forbidden: students only" });
    return;
  }
  next();
}

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId || req.session.userRole !== "parent") {
    res.status(403).json({ error: "Forbidden: parents only" });
    return;
  }
  next();
}
