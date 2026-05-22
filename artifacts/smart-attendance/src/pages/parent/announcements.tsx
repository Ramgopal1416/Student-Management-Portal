import { useListAnnouncements, useMarkAnnouncementRead, getListAnnouncementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";

export default function ParentAnnouncements() {
  const queryClient = useQueryClient();
  const { data: announcements, isLoading } = useListAnnouncements();
  const readMutation = useMarkAnnouncementRead();

  const handleRead = (id: number, isRead: boolean) => {
    if (isRead) return;
    readMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground text-sm">{(announcements ?? []).filter(a => !a.isRead).length} unread</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (announcements ?? []).length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No announcements</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {(announcements ?? []).map(a => (
              <Card key={a.id}
                className={`border-l-4 cursor-pointer ${a.priority === "urgent" ? "border-l-red-500" : a.priority === "high" ? "border-l-orange-500" : a.priority === "medium" ? "border-l-yellow-500" : "border-l-blue-500"} ${!a.isRead ? "shadow-md bg-blue-50/30 dark:bg-blue-950/10" : ""}`}
                onClick={() => handleRead(a.id, a.isRead ?? false)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={a.priority} />
                    {!a.isRead && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">New</span>}
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className={`font-semibold ${!a.isRead ? "text-foreground" : "text-muted-foreground"}`}>{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                  {a.teacherName && <p className="text-xs text-muted-foreground mt-2">— {a.teacherName}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = priority === "urgent" ? "bg-red-100 text-red-700" : priority === "high" ? "bg-orange-100 text-orange-700" : priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700";
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${cls}`}>{priority}</span>;
}
