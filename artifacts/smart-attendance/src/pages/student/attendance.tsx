import { useState } from "react";
import { useListAttendance, useGetAttendanceHeatmap, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentAttendance() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const params = {
    studentId: user?.studentId ?? undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  const { data: records, isLoading } = useListAttendance(params, { query: { enabled: !!user?.studentId, queryKey: getListAttendanceQueryKey(params) } });

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const { data: heatmap } = useGetAttendanceHeatmap({ studentId: user?.studentId ?? undefined, month, year }, { query: { enabled: !!user?.studentId, queryKey: ["attendance-heatmap", user?.studentId, month, year] as const } });

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
          <h1 className="text-2xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground text-sm">View your attendance records</p>
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

        {heatmap && heatmap.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">This Month — Attendance Heatmap</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {heatmap.map(d => {
                  const total = (d.present ?? 0) + (d.absent ?? 0) + (d.late ?? 0);
                  const presentPct = total > 0 ? (d.present ?? 0) / total : 0;
                  const cls = total === 0 ? "bg-muted" : presentPct === 1 ? "bg-emerald-500" : presentPct >= 0.5 ? "bg-yellow-400" : "bg-red-400";
                  return <div key={d.date} className={`w-8 h-8 rounded text-center text-xs flex items-center justify-center text-white font-medium ${cls}`} title={`${d.date}: ${d.present}P ${d.absent}A ${d.late}L`}>{parseInt(d.date.slice(-2))}</div>;
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />All present</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />Partial</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Mostly absent</span>
              </div>
            </CardContent>
          </Card>
        )}

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
