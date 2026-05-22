import { useGetTeacherDashboard, useGetAttendanceTrends, getGetTeacherDashboardQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, BarChart3, FileText, Bell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { useAuth } from "@/hooks/use-auth";

function StatCard({ title, value, icon: Icon, color, sub }: { title: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-xl p-3 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetTeacherDashboard();
  const { data: trends } = useGetAttendanceTrends();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user?.name}</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value={data?.totalStudents ?? 0} icon={Users} color="bg-blue-500" />
            <StatCard title="Present Today" value={data?.presentToday ?? 0} icon={UserCheck} color="bg-emerald-500" />
            <StatCard title="Absent Today" value={data?.absentToday ?? 0} icon={UserX} color="bg-red-500" />
            <StatCard title="Attendance Rate" value={`${data?.attendancePercentage ?? 0}%`} icon={BarChart3} color="bg-indigo-500" sub="Today's rate" />
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
          <Card className="col-span-1">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Pending Leaves</p>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-yellow-600">{data?.pendingLeaves ?? 0}</p>}
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Department Attendance Today</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32" /> : (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={data?.departmentStats ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {!trends ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="presentCount" stroke="hsl(142 72% 29%)" name="Present" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="absentCount" stroke="hsl(0 72% 51%)" name="Absent" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Announcements</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48" /> : (
                <div className="space-y-3">
                  {(data?.recentAnnouncements ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No announcements yet</p>
                  ) : (data?.recentAnnouncements ?? []).slice(0, 4).map((a) => (
                    <div key={a.id} className="border-l-2 border-primary pl-3">
                      <p className="text-sm font-medium line-clamp-1">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PriorityBadge priority={a.priority} />
                        <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
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

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === "urgent" ? "bg-red-100 text-red-700" : priority === "high" ? "bg-orange-100 text-orange-700" : priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{priority}</span>;
}
