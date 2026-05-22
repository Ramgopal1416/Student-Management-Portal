import { useListLeaves } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function ParentLeaves() {
  const { data: leaves, isLoading } = useListLeaves();

  const pending = (leaves ?? []).filter(l => l.status === "pending").length;
  const approved = (leaves ?? []).filter(l => l.status === "approved").length;
  const rejected = (leaves ?? []).filter(l => l.status === "rejected").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground text-sm">Your child's leave request history</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[{ label: "Pending", value: pending, color: "text-yellow-600" }, { label: "Approved", value: approved, color: "text-emerald-600" }, { label: "Rejected", value: rejected, color: "text-red-600" }].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="p-4 text-center"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Applied On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? [...Array(4)].map((_, i) => <TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                (leaves ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No leave requests</TableCell></TableRow>
                ) : (leaves ?? []).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.leaveDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{l.reason}</TableCell>
                    <TableCell><LeaveStatusBadge status={l.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.remarks ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
