import { useGetStudentDashboard, useGetAttendanceTrends } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, CheckCircle, XCircle, Clock, Bell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetStudentDashboard();
  const { data: trends } = useGetAttendanceTrends({ studentId: user?.studentId ?? undefined });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome, {user?.name}</p>
        </div>

        {isLoading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Attendance %", value: `${data?.attendancePercentage ?? 0}%`, icon: Calendar, color: data && data.attendancePercentage >= 75 ? "bg-emerald-500" : "bg-red-500" },
              { title: "Present Days", value: data?.presentDays ?? 0, icon: CheckCircle, color: "bg-emerald-500" },
              { title: "Absent Days", value: data?.absentDays ?? 0, icon: XCircle, color: "bg-red-500" },
              { title: "Late", value: data?.lateDays ?? 0, icon: Clock, color: "bg-yellow-500" },
            ].map(({ title, value, icon: Icon, color }) => (
              <Card key={title}><CardContent className="p-5 flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">{title}</p><p className="text-2xl font-bold mt-0.5">{value}</p></div>
                <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5 text-white" /></div>
              </CardContent></Card>
            ))}
          </div>
        )}

        {data && data.attendancePercentage < 75 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Low Attendance Warning</p>
              <p className="text-xs text-red-600 dark:text-red-500">Your attendance is below 75%. Please attend more classes.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Subject-wise Attendance</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.subjectWiseAttendance ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={40} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} />
                    <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Attendance</CardTitle>
                {data?.unreadAnnouncements ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" />{data.unreadAnnouncements} new</span> : null}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <div className="space-y-2">
                  {(data?.recentAttendance ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No records yet</p> : (data?.recentAttendance ?? []).slice(0, 6).map(r => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{r.subject ?? r.periodName}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "present" ? "bg-emerald-100 text-emerald-700" : status === "absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
