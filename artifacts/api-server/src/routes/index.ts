import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import periodsRouter from "./periods";
import attendanceRouter from "./attendance";
import leavesRouter from "./leaves";
import announcementsRouter from "./announcements";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import teachersRouter from "./teachers";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/students", studentsRouter);
router.use("/periods", periodsRouter);
router.use("/attendance", attendanceRouter);
router.use("/leaves", leavesRouter);
router.use("/announcements", announcementsRouter);
router.use("/notifications", notificationsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);
router.use("/teachers", teachersRouter);

export default router;
