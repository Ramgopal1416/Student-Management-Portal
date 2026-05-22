import { useGetStudentMe } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Phone, Calendar, GraduationCap, Users, MapPin } from "lucide-react";

export default function ParentProfile() {
  const { user } = useAuth();
  const { data: student, isLoading } = useGetStudentMe();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground text-sm">Your information and your child's details</p>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Parent Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ProfileField icon={User} label="Parent Name" value={user?.name ?? ""} />
            <ProfileField icon={Mail} label="Email" value={user?.email ?? ""} />
            {isLoading ? <Skeleton className="h-10" /> : <ProfileField icon={Phone} label="Phone" value={student?.parentPhone ?? "—"} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Child's Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />) : (<>
              <ProfileField icon={User} label="Full Name" value={student?.name ?? ""} />
              <ProfileField icon={GraduationCap} label="Registration Number" value={student?.registrationNumber ?? ""} />
              <ProfileField icon={GraduationCap} label="Department" value={student?.department ?? ""} />
              <ProfileField icon={Calendar} label="Year / Section" value={`${student?.year} / ${student?.section}`} />
              <ProfileField icon={Mail} label="Student Email" value={student?.studentEmail ?? "—"} />
              {student?.address && <ProfileField icon={MapPin} label="Address" value={student.address} />}
            </>)}
          </CardContent>
        </Card>
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
