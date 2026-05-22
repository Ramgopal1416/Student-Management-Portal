import { useState } from "react";
import { useListStudents, useListPeriods, useMarkBulkAttendance, getListAttendanceQueryKey, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { Link } from "wouter";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D"];

type Status = "present" | "absent" | "late";

export default function TeacherAttendance() {
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [periodId, setPeriodId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [started, setStarted] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    department: dept !== "all" ? dept : undefined,
    year: year !== "all" ? year : undefined,
    section: section !== "all" ? section : undefined,
    limit: 100,
  };
  const { data: studentsData, isLoading: loadingStudents } = useListStudents(params, {
    query: { enabled: started, queryKey: getListStudentsQueryKey(params) },
  });
  const { data: periods } = useListPeriods();
  const bulkMutation = useMarkBulkAttendance();

  const students = studentsData?.students ?? [];

  const handleStart = () => {
    if (!periodId) { toast({ title: "Select a period", variant: "destructive" }); return; }
    const initial: Record<number, Status> = {};
    setStarted(true);
    setStatuses(initial);
  };

  const markAll = (status: Status) => {
    const updated: Record<number, Status> = {};
    students.forEach(s => { updated[s.id] = status; });
    setStatuses(updated);
  };

  const handleSave = () => {
    const records = students.map(s => ({ studentId: s.id, status: statuses[s.id] ?? "absent" }));
    bulkMutation.mutate({ data: { periodId: parseInt(periodId), date, records } }, {
      onSuccess: (result) => {
        toast({ title: "Attendance saved", description: `${result.created} marked, ${result.updated} updated.` });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        setStarted(false);
        setStatuses({});
      },
      onError: () => toast({ title: "Error", description: "Could not save attendance", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Take Attendance</h1>
            <p className="text-muted-foreground text-sm">Mark attendance for a period</p>
          </div>
          <Link href="/teacher/attendance/records">
            <Button variant="outline">View Records</Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Select Class & Period</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Select value={dept} onValueChange={setDept} disabled={started}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear} disabled={started}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={section} onValueChange={setSection} disabled={started}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={periodId} onValueChange={setPeriodId} disabled={started}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Period" /></SelectTrigger>
                <SelectContent>
                  {(periods ?? []).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.subject}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" disabled={started} />
              {!started && <Button onClick={handleStart} className="gap-2"><Users className="h-4 w-4" />Start Attendance</Button>}
              {started && <Button variant="outline" onClick={() => { setStarted(false); setStatuses({}); }}>Cancel</Button>}
            </div>
          </CardContent>
        </Card>

        {started && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{students.length} Students</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-emerald-600" onClick={() => markAll("present")}><CheckCircle className="h-3.5 w-3.5" />Mark All Present</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => markAll("absent")}><XCircle className="h-3.5 w-3.5" />Mark All Absent</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : (
                students.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No students found for the selected filters.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {students.map(s => {
                      const status = statuses[s.id];
                      return (
                        <div key={s.id} data-testid={`student-card-${s.id}`} className={`rounded-lg border p-3 transition-all ${status === "present" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" : status === "absent" ? "border-red-400 bg-red-50 dark:bg-red-950/30" : status === "late" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30" : "border-border"}`}>
                          <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.registrationNumber}</p>
                          <div className="flex gap-1 mt-2">
                            {([["present", "P", "bg-emerald-500 text-white"], ["absent", "A", "bg-red-500 text-white"], ["late", "L", "bg-yellow-500 text-white"]] as [Status, string, string][]).map(([st, label, cls]) => (
                              <button key={st} onClick={() => setStatuses(prev => ({ ...prev, [s.id]: st }))} className={`flex-1 text-xs py-1 rounded font-medium transition-all ${status === st ? cls : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{label}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {Object.values(statuses).filter(s => s === "present").length} present, {Object.values(statuses).filter(s => s === "absent").length} absent, {Object.values(statuses).filter(s => s === "late").length} late
                </p>
                <Button onClick={handleSave} disabled={bulkMutation.isPending} className="gap-2">
                  {bulkMutation.isPending ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
