import { useGetAttendanceTrends, useGetLowAttendanceStudents } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(142 72% 29%)", "hsl(0 72% 51%)", "hsl(45 93% 47%)"];

export default function TeacherAnalytics() {
  const { data: trends, isLoading: trendsLoading } = useGetAttendanceTrends();
  const { data: lowAttendance, isLoading: lowLoading } = useGetLowAttendanceStudents();

  const pieData = trends ? [
    { name: "Present", value: trends.reduce((s, t) => s + (t.presentCount ?? 0), 0) },
    { name: "Absent", value: trends.reduce((s, t) => s + (t.absentCount ?? 0), 0) },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Attendance trends and insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Attendance Trends ({new Date().getFullYear()})</CardTitle></CardHeader>
            <CardContent>
              {trendsLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presentCount" stroke="hsl(142 72% 29%)" name="Present" strokeWidth={2} />
                    <Line type="monotone" dataKey="absentCount" stroke="hsl(0 72% 51%)" name="Absent" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Overall Distribution</CardTitle></CardHeader>
            <CardContent>
              {trendsLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Low Attendance Students (Below 75%)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lowLoading ? <Skeleton className="h-48" /> : (lowAttendance ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">All students have attendance above 75%. Great!</p>
            ) : (
              <div className="space-y-2">
                {(lowAttendance ?? []).map((s: any) => (
                  <div key={s.studentId} className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.studentName}</p>
                      <p className="text-xs text-muted-foreground">{s.registrationNumber} • {s.department} / {s.section}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-lg font-bold text-red-600">{s.percentage}%</span>
                    </div>
                    <div className="w-24">
                      <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${s.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {trends && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly Attendance Rate (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Rate"]} />
                  <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} name="Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
