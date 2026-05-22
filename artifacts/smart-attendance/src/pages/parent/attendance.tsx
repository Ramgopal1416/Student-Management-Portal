import { useState } from "react";
import { useListAttendance, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ParentAttendance() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = { studentId: user?.studentId ?? undefined, startDate: startDate || undefined, endDate: endDate || undefined };
  const { data: records, isLoading } = useListAttendance(params, { query: { enabled: !!user?.studentId, queryKey: getListAttendanceQueryKey(params) } });
  const filtered = (records ?? []).filter(r => statusFilter === "all" || r.status === statusFilter);

  const total = (records ?? []).length;
  const present = (records ?? []).filter(r => r.status === "present").length;
  const absent = (records ?? []).filter(r => r.status === "absent").length;
  const late = (records ?? []).filter(r => r.status === "late").length;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Child's Attendance</h1>
          <p className="text-muted-foreground text-sm">View your child's attendance records</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Overall %", value: `${pct}%`, color: pct >= 75 ? "text-emerald-600" : "text-red-600" },
            { label: "Present", value: present, color: "text-emerald-600" },
            { label: "Absent", value: absent, color: "text-red-600" },
            { label: "Late", value: late, color: "text-yellow-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="p-4 text-center"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                filtered.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No records</TableCell></TableRow> :
                filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.periodName ?? "—"}</TableCell>
                    <TableCell>{r.subject ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
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
