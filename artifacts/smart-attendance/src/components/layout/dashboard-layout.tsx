import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  Users, Calendar, FileText, BarChart3, Bell, 
  Settings, LogOut, LayoutDashboard, Clock, User
} from "lucide-react";
import { Button } from "@/components/ui/button";

function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { setOpenMobile } = useSidebar();

  const role = user?.role;

  const teacherLinks = [
    { title: "Dashboard", url: "/teacher/dashboard", icon: LayoutDashboard },
    { title: "Students", url: "/teacher/students", icon: Users },
    { title: "Attendance", url: "/teacher/attendance", icon: Calendar },
    { title: "Periods", url: "/teacher/periods", icon: Clock },
    { title: "Leaves", url: "/teacher/leaves", icon: FileText },
    { title: "Announcements", url: "/teacher/announcements", icon: Bell },
    { title: "Reports", url: "/teacher/reports", icon: BarChart3 },
    { title: "Analytics", url: "/teacher/analytics", icon: BarChart3 },
    { title: "Profile", url: "/teacher/profile", icon: Settings },
  ];

  const studentLinks = [
    { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
    { title: "Attendance", url: "/student/attendance", icon: Calendar },
    { title: "Leaves", url: "/student/leaves", icon: FileText },
    { title: "Announcements", url: "/student/announcements", icon: Bell },
    { title: "Profile", url: "/student/profile", icon: User },
  ];

  const parentLinks = [
    { title: "Dashboard", url: "/parent/dashboard", icon: LayoutDashboard },
    { title: "Attendance", url: "/parent/attendance", icon: Calendar },
    { title: "Leaves", url: "/parent/leaves", icon: FileText },
    { title: "Announcements", url: "/parent/announcements", icon: Bell },
    { title: "Profile", url: "/parent/profile", icon: User },
  ];

  const links = role === "teacher" ? teacherLinks : role === "student" ? studentLinks : role === "parent" ? parentLinks : [];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex items-center px-4 py-4 h-16 border-b">
        <div className="flex items-center gap-2 overflow-hidden w-full">
          <div className="bg-primary rounded p-1 flex-shrink-0">
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base truncate group-data-[collapsible=icon]:hidden">
            Smart Attendance
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {links.map((link) => (
              <SidebarMenuItem key={link.url}>
                <SidebarMenuButton 
                  asChild
                  isActive={location.startsWith(link.url)}
                  tooltip={link.title}
                  onClick={() => setOpenMobile(false)}
                >
                  <Link href={link.url} className="flex items-center gap-3">
                    <link.icon className="h-4 w-4" />
                    <span>{link.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-4 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => logout()}>
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex">
           <Button variant="ghost" size="icon" className="w-full h-8" onClick={() => logout()} title="Logout">
              <LogOut className="h-4 w-4" />
           </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="h-16 border-b bg-card flex items-center px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
          </header>
          <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-zinc-950/50">
            <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
