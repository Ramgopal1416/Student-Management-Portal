import { useState } from "react";
import { useGetTeacherMe, useUpdateTeacherMe, getGetTeacherMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Briefcase, Phone, Save } from "lucide-react";

export default function TeacherProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refetch } = useAuth();
  const { data: profile, isLoading } = useGetTeacherMe();
  const updateMutation = useUpdateTeacherMe();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");

  const startEdit = () => {
    setName(profile?.name ?? "");
    setPhone(profile?.phone ?? "");
    setDepartment(profile?.department ?? "");
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ data: { name, phone, department } }, {
      onSuccess: () => {
        toast({ title: "Profile updated" });
        queryClient.invalidateQueries({ queryKey: getGetTeacherMeQueryKey() });
        refetch();
        setEditing(false);
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Profile</h1><p className="text-muted-foreground text-sm">Manage your account information</p></div>
          {!editing && <Button variant="outline" onClick={startEdit}>Edit Profile</Button>}
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Account Information</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5"><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" /></div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-2" />{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <ProfileField icon={User} label="Full Name" value={profile?.name ?? ""} />
                <ProfileField icon={Briefcase} label="Employee ID" value={profile?.employeeId ?? ""} />
                <ProfileField icon={Briefcase} label="Department" value={profile?.department ?? ""} />
                <ProfileField icon={Mail} label="Email" value={profile?.email ?? ""} />
                <ProfileField icon={Phone} label="Phone" value={profile?.phone ?? "—"} />
              </div>
            )}
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
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
