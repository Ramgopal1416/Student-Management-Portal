import { useState } from "react";
import { useListAttendance, useUpdateAttendance, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TeacherAttendanceRecords() {
  const [date, setDate] = useState("");
  const [dept, setDept] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateAttendance();

  const params = {
    date: date || undefined,
    department: dept !== "all" ? dept : undefined,
  };
  const { data, isLoading } = useListAttendance(params, { query: { queryKey: getListAttendanceQueryKey(params) } });
  const records = (data ?? []).filter(r => statusFilter === "all" || r.status === statusFilter);

  const handleStatusChange = (id: number, status: "present" | "absent" | "late") => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        toast({ title: "Updated", description: "Attendance record corrected." });
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/teacher/attendance"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Attendance Records</h1>
            <p className="text-muted-foreground text-sm">View and correct attendance records</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" placeholder="Filter by date" />
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
            {(date || dept !== "all") && <Button variant="ghost" onClick={() => { setDate(""); setDept("all"); setStatusFilter("all"); }}>Clear</Button>}
          </CardContent>
        </Card>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reg. Number</TableHead>
                <TableHead>Period / Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Correct</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                records.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No records found</TableCell></TableRow> :
                records.map(r => (
                  <TableRow key={r.id} data-testid={`record-${r.id}`}>
                    <TableCell className="font-medium">{r.studentName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{r.registrationNumber ?? "—"}</TableCell>
                    <TableCell>{r.periodName} — {r.subject}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v as "present" | "absent" | "late")}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "present" ? "bg-emerald-100 text-emerald-700" : status === "absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
