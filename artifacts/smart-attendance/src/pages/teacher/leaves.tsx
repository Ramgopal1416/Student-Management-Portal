import { useState } from "react";
import { useListLeaves, useUpdateLeave, getListLeavesQueryKey } from "@workspace/api-client-react";
import type { ListLeavesStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

export default function TeacherLeaves() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = { status: statusFilter !== "all" ? (statusFilter as ListLeavesStatus) : undefined };
  const { data: leaves, isLoading } = useListLeaves(params, { query: { queryKey: getListLeavesQueryKey(params) } });
  const updateMutation = useUpdateLeave();

  const handleAction = (status: "approved" | "rejected") => {
    if (!selectedLeave) return;
    updateMutation.mutate({ id: selectedLeave.id, data: { status, remarks: remarks || undefined } }, {
      onSuccess: () => {
        toast({ title: `Leave ${status}`, description: `Leave request has been ${status}.` });
        queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey() });
        setSelectedLeave(null);
        setRemarks("");
      },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Leave Requests</h1><p className="text-muted-foreground text-sm">Review and manage student leave requests</p></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", status: "pending", color: "text-yellow-600", icon: Clock },
            { label: "Approved", status: "approved", color: "text-emerald-600", icon: CheckCircle2 },
            { label: "Rejected", status: "rejected", color: "text-red-600", icon: XCircle },
          ].map(({ label, status, color, icon: Icon }) => (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status)}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <p className={`text-xl font-bold ${color}`}>{(leaves ?? []).filter(l => l.status === status).length}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reg. Number</TableHead>
                <TableHead>Leave Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? [...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                (leaves ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No leave requests</TableCell></TableRow> :
                (leaves ?? []).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.studentName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{l.registrationNumber ?? "—"}</TableCell>
                    <TableCell>{l.leaveDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{l.reason}</TableCell>
                    <TableCell><LeaveStatusBadge status={l.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelectedLeave(l); setRemarks(""); }}>
                        <Eye className="h-3.5 w-3.5" />Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Leave Request</DialogTitle></DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Student</p><p className="font-medium">{selectedLeave.studentName}</p></div>
                <div><p className="text-muted-foreground">Reg. Number</p><p className="font-mono font-medium">{selectedLeave.registrationNumber}</p></div>
                <div><p className="text-muted-foreground">Leave Date</p><p className="font-medium">{selectedLeave.leaveDate}</p></div>
                <div><p className="text-muted-foreground">Status</p><LeaveStatusBadge status={selectedLeave.status} /></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <p className="text-sm bg-muted rounded p-3">{selectedLeave.reason}</p>
              </div>
              {selectedLeave.status === "pending" && (
                <div>
                  <p className="text-sm font-medium mb-1">Remarks (optional)</p>
                  <Textarea placeholder="Add remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeave(null)}>Close</Button>
            {selectedLeave?.status === "pending" && (<>
              <Button variant="destructive" onClick={() => handleAction("rejected")} disabled={updateMutation.isPending}>
                <XCircle className="h-4 w-4 mr-1.5" />Reject
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("approved")} disabled={updateMutation.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
              </Button>
            </>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
