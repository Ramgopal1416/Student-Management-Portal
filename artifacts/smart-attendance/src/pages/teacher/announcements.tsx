import { useState } from "react";
import { useListAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, getListAnnouncementsQueryKey } from "@workspace/api-client-react";
import type { AnnouncementInputPriority, AnnouncementUpdatePriority } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export default function TeacherAnnouncements() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useListAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const openCreate = () => { setTitle(""); setDescription(""); setPriority("medium"); setEditId(null); setOpen(true); };
  const openEdit = (a: any) => { setTitle(a.title); setDescription(a.description); setPriority(a.priority); setEditId(a.id); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, data: { title, description, priority: priority as AnnouncementUpdatePriority } }, {
        onSuccess: () => { toast({ title: "Announcement updated" }); queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }); setOpen(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ data: { title, description, priority: priority as AnnouncementInputPriority } }, {
        onSuccess: () => { toast({ title: "Announcement posted" }); queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }); setOpen(false); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Announcement deleted" }); queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }); },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Announcements</h1><p className="text-muted-foreground text-sm">Post and manage class announcements</p></div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Post Announcement</Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (announcements ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No announcements yet</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {(announcements ?? []).map(a => (
              <Card key={a.id} className={`border-l-4 ${a.priority === "urgent" ? "border-l-red-500" : a.priority === "high" ? "border-l-orange-500" : a.priority === "medium" ? "border-l-yellow-500" : "border-l-blue-500"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityBadge priority={a.priority} />
                        <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Announcement</AlertDialogTitle><AlertDialogDescription>Delete "{a.title}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Announcement" : "Post Announcement"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea placeholder="Announcement details..." rows={4} value={description} onChange={e => setDescription(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editId ? "Update" : "Post"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === "urgent" ? "bg-red-100 text-red-700" : priority === "high" ? "bg-orange-100 text-orange-700" : priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${cls}`}>{priority}</span>;
}
