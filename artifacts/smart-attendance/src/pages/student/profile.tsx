import { useGetStudentMe } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Phone, Calendar, GraduationCap, Users, MapPin, UserCheck, UserX } from "lucide-react";

export default function StudentProfile() {
  const { data: student, isLoading } = useGetStudentMe();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground text-sm">Your student information</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Student Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />) : (<>
                <ProfileField icon={User} label="Full Name" value={student?.name ?? ""} />
                <ProfileField icon={GraduationCap} label="Registration Number" value={student?.registrationNumber ?? ""} />
                <ProfileField icon={GraduationCap} label="Department" value={student?.department ?? ""} />
                <ProfileField icon={Calendar} label="Year / Section" value={`${student?.year} / ${student?.section}`} />
                <ProfileField icon={Calendar} label="Date of Birth" value={student?.dateOfBirth ?? ""} />
                <ProfileField icon={User} label="Gender" value={student?.gender ?? ""} />
                <ProfileField icon={Mail} label="Email" value={student?.studentEmail ?? "—"} />
                {student?.address && <ProfileField icon={MapPin} label="Address" value={student.address} />}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {student?.faceRegistered
                    ? <><UserCheck className="h-4 w-4 text-emerald-500" /><div><p className="text-xs text-muted-foreground">Face Registration</p><p className="text-sm font-medium text-emerald-600">Registered</p></div></>
                    : <><UserX className="h-4 w-4 text-red-500" /><div><p className="text-xs text-muted-foreground">Face Registration</p><p className="text-sm font-medium text-red-600">Not Registered</p></div></>}
                </div>
              </>)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Parent Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />) : (<>
                <ProfileField icon={User} label="Parent Name" value={student?.parentName ?? "—"} />
                <ProfileField icon={Mail} label="Parent Email" value={student?.parentEmail ?? "—"} />
                <ProfileField icon={Phone} label="Parent Phone" value={student?.parentPhone ?? "—"} />
              </>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ProfileField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || "—"}</p></div>
    </div>
  );
}
