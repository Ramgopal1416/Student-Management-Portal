import { useRoute, useLocation, Link } from "wouter";
import { useGetStudent, useGetFaceStatus, useGetAttendanceSummary, useListLeaves, getGetStudentQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, UserCheck, UserX, Mail, Phone, Calendar, GraduationCap } from "lucide-react";

export default function TeacherStudentDetail() {
  const [, params] = useRoute("/teacher/students/:id");
  const id = parseInt(params?.id ?? "0");
  const [, setLocation] = useLocation();

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } });
  const { data: faceStatus } = useGetFaceStatus(id, { query: { enabled: !!id, queryKey: ["face-status", id] as const } });
  const { data: summary } = useGetAttendanceSummary({ studentId: id }, { query: { enabled: !!id, queryKey: ["attendance-summary", id] as const } });
  const { data: leaves } = useListLeaves({ studentId: id }, { query: { enabled: !!id, queryKey: ["leaves", id] as const } });

  const summaryData = summary?.[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/teacher/students")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1">
            {isLoading ? <Skeleton className="h-7 w-48" /> : <h1 className="text-2xl font-bold">{student?.name}</h1>}
            <p className="text-muted-foreground text-sm">{student?.registrationNumber}</p>
          </div>
          {student && (
            <Link href={`/teacher/students/${id}/face`}>
              <Button variant="outline"><Camera className="h-4 w-4 mr-2" />Update Face Data</Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Student Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-5" />) : (<>
                  <InfoRow icon={GraduationCap} label="Department" value={student?.department ?? ""} />
                  <InfoRow icon={Calendar} label="Year / Section" value={`${student?.year} / ${student?.section}`} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={student?.dateOfBirth ?? ""} />
                  <InfoRow icon={Mail} label="Email" value={student?.studentEmail ?? "—"} />
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Face Registration</p>
                    {faceStatus?.registered
                      ? <div className="flex items-center gap-2 text-emerald-600"><UserCheck className="h-4 w-4" /><span className="text-sm font-medium">Registered</span></div>
                      : <div className="flex items-center gap-2 text-red-500"><UserX className="h-4 w-4" /><span className="text-sm font-medium">Not registered</span></div>}
                    {faceStatus?.updatedAt && <p className="text-xs text-muted-foreground mt-1">Last updated: {new Date(faceStatus.updatedAt).toLocaleDateString()}</p>}
                  </div>
                </>)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Parent Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-5" />) : (<>
                  <InfoRow icon={GraduationCap} label="Name" value={student?.parentName ?? "—"} />
                  <InfoRow icon={Mail} label="Email" value={student?.parentEmail ?? "—"} />
                  <InfoRow icon={Phone} label="Phone" value={student?.parentPhone ?? "—"} />
                </>)}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Attendance %", value: summaryData ? `${summaryData.percentage}%` : "—", color: "text-blue-600" },
                { label: "Present", value: summaryData?.presentCount ?? 0, color: "text-emerald-600" },
                { label: "Absent", value: summaryData?.absentCount ?? 0, color: "text-red-600" },
                { label: "Late", value: summaryData?.lateCount ?? 0, color: "text-yellow-600" },
              ].map(({ label, value, color }) => (
                <Card key={label}><CardContent className="p-4 text-center"><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></CardContent></Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Leave History</CardTitle></CardHeader>
              <CardContent>
                {!leaves || leaves.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No leave requests</p>
                ) : (
                  <div className="space-y-2">
                    {leaves.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{l.leaveDate}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{l.reason}</p>
                        </div>
                        <LeaveBadge status={l.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

function LeaveBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
