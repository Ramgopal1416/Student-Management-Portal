import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Users } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  registrationNumber: z.string().min(3, "Registration number required"),
  department: z.string().min(1, "Department required"),
  year: z.string().min(1, "Year required"),
  section: z.string().min(1, "Section required"),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.string().min(1, "Gender required"),
  studentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  parentName: z.string().optional(),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["A", "B", "C", "D"];

export default function TeacherNewStudent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useCreateStudent();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", registrationNumber: "", department: "", year: "", section: "", dateOfBirth: "", gender: "", studentEmail: "", parentName: "", parentEmail: "", parentPhone: "", address: "" },
  });

  const onSubmit = (values: FormData) => {
    mutation.mutate({ data: { ...values, studentEmail: values.studentEmail || null, parentName: values.parentName || null, parentEmail: values.parentEmail || null, parentPhone: values.parentPhone || null, address: values.address || null } }, {
      onSuccess: (student) => {
        toast({ title: "Student registered", description: `${student.name} has been added successfully.` });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setLocation(`/teacher/students/${student.id}/face`);
      },
      onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.error || "Could not register student", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/teacher/students")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Register Student</h1>
            <p className="text-muted-foreground text-sm">Add a new student to the system</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Student Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="John Doe" {...field} data-testid="input-name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                    <FormItem><FormLabel>Registration Number *</FormLabel><FormControl><Input placeholder="REG2024001" {...field} data-testid="input-reg-num" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="department" render={({ field }) => (
                      <FormItem><FormLabel>Department *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Dept." /></SelectTrigger></FormControl><SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="year" render={({ field }) => (
                      <FormItem><FormLabel>Year *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger></FormControl><SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="section" render={({ field }) => (
                      <FormItem><FormLabel>Section *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sec." /></SelectTrigger></FormControl><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem><FormLabel>Date of Birth *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem><FormLabel>Gender *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="studentEmail" render={({ field }) => (
                    <FormItem><FormLabel>Student Email</FormLabel><FormControl><Input type="email" placeholder="student@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Textarea placeholder="Full address" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Parent / Guardian Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="parentName" render={({ field }) => (
                    <FormItem><FormLabel>Parent Name</FormLabel><FormControl><Input placeholder="Parent's full name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="parentEmail" render={({ field }) => (
                    <FormItem><FormLabel>Parent Email</FormLabel><FormControl><Input type="email" placeholder="parent@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="parentPhone" render={({ field }) => (
                    <FormItem><FormLabel>Parent Phone</FormLabel><FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 mt-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Next Step: Face Registration</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">After saving, you'll be redirected to register the student's face for attendance recognition.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation("/teacher/students")}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit">
                {mutation.isPending ? "Registering..." : "Register & Continue to Face Setup"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
