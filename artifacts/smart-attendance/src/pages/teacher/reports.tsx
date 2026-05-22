import { useState } from "react";
import { useGetClassReport, useFetchStudentReport, getFetchStudentReportQueryKey, useListStudents, getListStudentsQueryKey } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D"];

export default function TeacherReports() {
  const [tab, setTab] = useState("class");
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [section, setSection] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const classParams = { department: dept !== "all" ? dept : undefined, year: year !== "all" ? year : undefined, section: section !== "all" ? section : undefined, startDate: startDate || undefined, endDate: endDate || undefined };
  const { data: classReport, isLoading: classLoading } = useGetClassReport(classParams);
  const studentParams = { studentId: selectedStudentId ? parseInt(selectedStudentId) : 0, startDate: startDate || undefined, endDate: endDate || undefined };
  const { data: studentReport, isLoading: studentLoading } = useFetchStudentReport(studentParams, { query: { enabled: !!selectedStudentId, queryKey: getFetchStudentReportQueryKey(studentParams) } });

  const { data: studentsData } = useListStudents({ limit: 200 }, { query: { queryKey: getListStudentsQueryKey({ limit: 200 }) } });
  const students = studentsData?.students ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Reports</h1><p className="text-muted-foreground text-sm">Attendance reports and summaries</p></div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="class">Class Report</TabsTrigger>
            <TabsTrigger value="student">Student Report</TabsTrigger>
          </TabsList>

          <TabsContent value="class">
            <div className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-3">
                  <Select value={dept} onValueChange={setDept}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Departments</SelectItem>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Years</SelectItem>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Section" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Sections</SelectItem>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" placeholder="Start date" />
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" placeholder="End date" />
                </CardContent>
              </Card>

              {classReport && classReport.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Attendance Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={classReport.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="studentName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="percentage" fill="hsl(221 83% 53%)" radius={[3, 3, 0, 0]} name="Attendance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg. Number</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classLoading ? [...Array(5)].map((_, i) => <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>) :
                      (classReport ?? []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow> :
                      (classReport ?? []).map(r => (
                        <TableRow key={r.studentId}>
                          <TableCell className="font-medium">{r.studentName}</TableCell>
                          <TableCell className="font-mono text-sm">{r.registrationNumber}</TableCell>
                          <TableCell>{r.department}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">{r.totalPresent}</TableCell>
                          <TableCell className="text-center text-red-600 font-medium">{r.totalAbsent}</TableCell>
                          <TableCell className="text-center text-yellow-600 font-medium">{r.totalLate}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-bold ${r.percentage >= 75 ? "text-emerald-600" : "text-red-600"}`}>{r.percentage}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="student">
            <div className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-4 flex flex-wrap gap-3">
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Select a student..." /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.registrationNumber}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
                </CardContent>
              </Card>

              {!selectedStudentId ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Select a student to view their report</CardContent></Card>
              ) : studentLoading ? (
                <Skeleton className="h-64" />
              ) : studentReport && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { l: "Attendance %", v: `${studentReport.summary.percentage}%`, c: "text-blue-600" },
                      { l: "Present", v: studentReport.summary.presentCount, c: "text-emerald-600" },
                      { l: "Absent", v: studentReport.summary.absentCount, c: "text-red-600" },
                      { l: "Late", v: studentReport.summary.lateCount, c: "text-yellow-600" },
                      { l: "Total", v: studentReport.summary.totalClasses, c: "" },
                    ].map(({ l, v, c }) => (
                      <Card key={l}><CardContent className="p-4 text-center"><p className={`text-xl font-bold ${c}`}>{v}</p><p className="text-xs text-muted-foreground mt-0.5">{l}</p></CardContent></Card>
                    ))}
                  </div>

                  {studentReport.subjectWiseAttendance.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">Subject-wise Attendance</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {studentReport.subjectWiseAttendance.map((s: any) => (
                            <div key={s.subject} className="flex items-center gap-3">
                              <span className="text-sm w-36 truncate">{s.subject}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.percentage >= 75 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${s.percentage}%` }} />
                              </div>
                              <span className={`text-sm font-medium w-12 text-right ${s.percentage >= 75 ? "text-emerald-600" : "text-red-600"}`}>{s.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
