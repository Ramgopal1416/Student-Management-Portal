import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherStudents from "@/pages/teacher/students/index";
import TeacherNewStudent from "@/pages/teacher/students/new";
import TeacherStudentDetail from "@/pages/teacher/students/detail";
import TeacherStudentFace from "@/pages/teacher/students/face";
import TeacherAttendance from "@/pages/teacher/attendance/index";
import TeacherAttendanceRecords from "@/pages/teacher/attendance/records";
import TeacherPeriods from "@/pages/teacher/periods";
import TeacherLeaves from "@/pages/teacher/leaves";
import TeacherAnnouncements from "@/pages/teacher/announcements";
import TeacherReports from "@/pages/teacher/reports";
import TeacherAnalytics from "@/pages/teacher/analytics";
import TeacherProfile from "@/pages/teacher/profile";
import StudentDashboard from "@/pages/student/dashboard";
import StudentAttendance from "@/pages/student/attendance";
import StudentLeaves from "@/pages/student/leaves";
import StudentAnnouncements from "@/pages/student/announcements";
import StudentProfile from "@/pages/student/profile";
import ParentDashboard from "@/pages/parent/dashboard";
import ParentAttendance from "@/pages/parent/attendance";
import ParentLeaves from "@/pages/parent/leaves";
import ParentAnnouncements from "@/pages/parent/announcements";
import ParentProfile from "@/pages/parent/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  if (role && user.role !== role) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        {user ? (
          user.role === "teacher" ? <Redirect to="/teacher/dashboard" /> :
          user.role === "student" ? <Redirect to="/student/dashboard" /> :
          <Redirect to="/parent/dashboard" />
        ) : <Redirect to="/login" />}
      </Route>

      <Route path="/teacher/dashboard"><ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute></Route>
      <Route path="/teacher/students/new"><ProtectedRoute role="teacher"><TeacherNewStudent /></ProtectedRoute></Route>
      <Route path="/teacher/students/:id/face"><ProtectedRoute role="teacher"><TeacherStudentFace /></ProtectedRoute></Route>
      <Route path="/teacher/students/:id"><ProtectedRoute role="teacher"><TeacherStudentDetail /></ProtectedRoute></Route>
      <Route path="/teacher/students"><ProtectedRoute role="teacher"><TeacherStudents /></ProtectedRoute></Route>
      <Route path="/teacher/attendance/records"><ProtectedRoute role="teacher"><TeacherAttendanceRecords /></ProtectedRoute></Route>
      <Route path="/teacher/attendance"><ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute></Route>
      <Route path="/teacher/periods"><ProtectedRoute role="teacher"><TeacherPeriods /></ProtectedRoute></Route>
      <Route path="/teacher/leaves"><ProtectedRoute role="teacher"><TeacherLeaves /></ProtectedRoute></Route>
      <Route path="/teacher/announcements"><ProtectedRoute role="teacher"><TeacherAnnouncements /></ProtectedRoute></Route>
      <Route path="/teacher/reports"><ProtectedRoute role="teacher"><TeacherReports /></ProtectedRoute></Route>
      <Route path="/teacher/analytics"><ProtectedRoute role="teacher"><TeacherAnalytics /></ProtectedRoute></Route>
      <Route path="/teacher/profile"><ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute></Route>

      <Route path="/student/dashboard"><ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute></Route>
      <Route path="/student/attendance"><ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute></Route>
      <Route path="/student/leaves"><ProtectedRoute role="student"><StudentLeaves /></ProtectedRoute></Route>
      <Route path="/student/announcements"><ProtectedRoute role="student"><StudentAnnouncements /></ProtectedRoute></Route>
      <Route path="/student/profile"><ProtectedRoute role="student"><StudentProfile /></ProtectedRoute></Route>

      <Route path="/parent/dashboard"><ProtectedRoute role="parent"><ParentDashboard /></ProtectedRoute></Route>
      <Route path="/parent/attendance"><ProtectedRoute role="parent"><ParentAttendance /></ProtectedRoute></Route>
      <Route path="/parent/leaves"><ProtectedRoute role="parent"><ParentLeaves /></ProtectedRoute></Route>
      <Route path="/parent/announcements"><ProtectedRoute role="parent"><ParentAnnouncements /></ProtectedRoute></Route>
      <Route path="/parent/profile"><ProtectedRoute role="parent"><ParentProfile /></ProtectedRoute></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
