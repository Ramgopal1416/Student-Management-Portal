import { useState } from "react";
import { useListLeaves, useCreateLeave, getListLeavesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText } from "lucide-react";

export default function StudentLeaves() {
  const [open, setOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaves, isLoading } = useListLeaves();
  const createMutation = useCreateLeave();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: { leaveDate, reason } }, {
      onSuccess: () => {
        toast({ title: "Leave request submitted", description: "Your teacher will review it shortly." });
        queryClient.invalidateQueries({ queryKey: getListLeavesQueryKey() });
        setOpen(false);
        setLeaveDate("");
        setReason("");
      },
      onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.error || "Could not submit request", variant: "destructive" }),
    });
  };

  const pending = (leaves ?? []).filter(l => l.status === "pending").length;
  const approved = (leaves ?? []).filter(l => l.status === "approved").length;
  const rejected = (leaves ?? []).filter(l => l.status === "rejected").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Leave Requests</h1><p className="text-muted-foreground text-sm">Submit and track your leave requests</p></div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Apply for Leave</Button>
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
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No leave requests yet</TableCell></TableRow>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Leave Date *</Label><Input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Reason *</Label><Textarea placeholder="Please provide a detailed reason..." rows={4} value={reason} onChange={e => setReason(e.target.value)} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Submitting..." : "Submit Request"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-emerald-100 text-emerald-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{status}</span>;
}
