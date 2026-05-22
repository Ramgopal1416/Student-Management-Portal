import { useState } from "react";
import { useListPeriods, useCreatePeriod, useUpdatePeriod, useDeletePeriod, getListPeriodsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D"];

type FormState = { name: string; subject: string; startTime: string; endTime: string; department: string; year: string; section: string };
const EMPTY: FormState = { name: "", subject: "", startTime: "09:00", endTime: "10:00", department: "", year: "", section: "" };

export default function TeacherPeriods() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: periods, isLoading } = useListPeriods();
  const createMutation = useCreatePeriod();
  const updateMutation = useUpdatePeriod();
  const deleteMutation = useDeletePeriod();

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (p: any) => { setForm({ name: p.name, subject: p.subject, startTime: p.startTime, endTime: p.endTime, department: p.department, year: p.year, section: p.section }); setEditId(p.id); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department || !form.year || !form.section) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    if (editId) {
      updateMutation.mutate({ id: editId, data: { name: form.name, subject: form.subject, startTime: form.startTime, endTime: form.endTime } }, {
        onSuccess: () => { toast({ title: "Period updated" }); queryClient.invalidateQueries({ queryKey: getListPeriodsQueryKey() }); setOpen(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ data: form }, {
        onSuccess: () => { toast({ title: "Period created" }); queryClient.invalidateQueries({ queryKey: getListPeriodsQueryKey() }); setOpen(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Period deleted" }); queryClient.invalidateQueries({ queryKey: getListPeriodsQueryKey() }); },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Periods</h1><p className="text-muted-foreground text-sm">Manage class periods and schedules</p></div>
          <Button onClick={openCreate} data-testid="button-add-period"><Plus className="h-4 w-4 mr-2" />Add Period</Button>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? [...Array(4)].map((_, i) => <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                (periods ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No periods yet. Add the first period.</TableCell></TableRow> :
                (periods ?? []).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.subject}</TableCell>
                    <TableCell className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{p.startTime} – {p.endTime}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.year} / {p.section}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Period</AlertDialogTitle><AlertDialogDescription>Delete "{p.name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Period" : "Add Period"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Period Name *</Label><Input placeholder="Period 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Subject *</Label><Input placeholder="Mathematics" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Start Time *</Label><Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>End Time *</Label><Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Department</Label><Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))} disabled={!!editId}><SelectTrigger><SelectValue placeholder="Dept." /></SelectTrigger><SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Year</Label><Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))} disabled={!!editId}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Section</Label><Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))} disabled={!!editId}><SelectTrigger><SelectValue placeholder="Sec." /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editId ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
