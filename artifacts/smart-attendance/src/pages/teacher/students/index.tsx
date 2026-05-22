import { useState } from "react";
import { Link } from "wouter";
import { useListStudents, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Camera, Trash2, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D"];

export default function TeacherStudents() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    search: search || undefined,
    department: dept !== "all" ? dept : undefined,
    year: year !== "all" ? year : undefined,
    section: section !== "all" ? section : undefined,
    page, limit: 20,
  };
  const { data, isLoading } = useListStudents(params, { query: { queryKey: getListStudentsQueryKey(params) } });
  const deleteMutation = useDeleteStudent();

  const handleDelete = (id: number, name: string) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Student deleted", description: `${name} has been removed.` });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      },
      onError: () => toast({ title: "Error", description: "Could not delete student", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground text-sm">{data?.total ?? 0} total students</p>
          </div>
          <Link href="/teacher/students/new">
            <Button data-testid="button-add-student"><Plus className="h-4 w-4 mr-2" />Add Student</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or registration number..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-search" />
              </div>
              <Select value={dept} onValueChange={v => { setDept(v); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={v => { setYear(v); setPage(1); }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={section} onValueChange={v => { setSection(v); setPage(1); }}>
                <SelectTrigger className="w-28"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reg. Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year / Section</TableHead>
                <TableHead>Face</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : (data?.students ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No students found. <Link href="/teacher/students/new" className="text-primary hover:underline">Add the first student</Link>
                  </TableCell>
                </TableRow>
              ) : (data?.students ?? []).map((s) => (
                <TableRow key={s.id} data-testid={`row-student-${s.id}`}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-sm">{s.registrationNumber}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>{s.year} / {s.section}</TableCell>
                  <TableCell>
                    {s.faceRegistered
                      ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><UserCheck className="h-3.5 w-3.5" />Registered</span>
                      : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><UserX className="h-3.5 w-3.5" />Not registered</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/teacher/students/${s.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link href={`/teacher/students/${s.id}/face`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Update Face"><Camera className="h-4 w-4" /></Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete {s.name}? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id, s.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / 20)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / 20)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
