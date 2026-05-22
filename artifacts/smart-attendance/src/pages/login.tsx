import { useState } from "react";
import { useLocation } from "wouter";
import { useLoginTeacher, useRegisterTeacher, useLoginStudent, useLoginParent } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GraduationCap, UserCheck, Users, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user) {
    if (user.role === "teacher") setLocation("/teacher/dashboard");
    else if (user.role === "student") setLocation("/student/dashboard");
    else setLocation("/parent/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Smart Attendance</h1>
          <p className="text-blue-200 mt-1 text-sm">AI-Powered Attendance Management System</p>
        </div>

        <Tabs defaultValue="teacher" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 text-white mb-4">
            <TabsTrigger value="teacher" className="text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">
              <UserCheck className="h-4 w-4 mr-1.5" />Teacher
            </TabsTrigger>
            <TabsTrigger value="student" className="text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">
              <GraduationCap className="h-4 w-4 mr-1.5" />Student
            </TabsTrigger>
            <TabsTrigger value="parent" className="text-white data-[state=active]:bg-white data-[state=active]:text-slate-900">
              <Users className="h-4 w-4 mr-1.5" />Parent
            </TabsTrigger>
          </TabsList>
          <TabsContent value="teacher"><TeacherLoginForm onSuccess={(role) => {
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setLocation("/teacher/dashboard");
          }} /></TabsContent>
          <TabsContent value="student"><StudentLoginForm onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setLocation("/student/dashboard");
          }} /></TabsContent>
          <TabsContent value="parent"><ParentLoginForm onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setLocation("/parent/dashboard");
          }} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TeacherLoginForm({ onSuccess }: { onSuccess: (role: string) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();
  const loginMutation = useLoginTeacher();
  const registerMutation = useRegisterTeacher();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: () => onSuccess("teacher"),
      onError: (err: any) => toast({ title: "Login failed", description: err?.response?.data?.error || "Invalid credentials", variant: "destructive" }),
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: { name, email, password, employeeId, department } }, {
      onSuccess: () => onSuccess("teacher"),
      onError: (err: any) => toast({ title: "Registration failed", description: err?.response?.data?.error || "Something went wrong", variant: "destructive" }),
    });
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle>{tab === "login" ? "Teacher Login" : "Create Account"}</CardTitle>
        <CardDescription>{tab === "login" ? "Sign in with your email and password" : "Create your teacher account"}</CardDescription>
      </CardHeader>
      <CardContent>
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" placeholder="teacher@school.edu" value={email} onChange={e => setEmail(e.target.value)} required data-testid="input-teacher-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-password">Password</Label>
              <div className="relative">
                <Input id="t-password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required data-testid="input-teacher-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-teacher-login">
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <button type="button" className="text-primary hover:underline font-medium" onClick={() => setTab("register")}>Create one</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-name">Full Name</Label>
                <Input id="t-name" placeholder="Dr. John Smith" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-emp-id">Employee ID</Label>
                <Input id="t-emp-id" placeholder="EMP001" value={employeeId} onChange={e => setEmployeeId(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dept">Department</Label>
              <Input id="t-dept" placeholder="Computer Science" value={department} onChange={e => setDepartment(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-reg-email">Email</Label>
              <Input id="t-reg-email" type="email" placeholder="teacher@school.edu" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-reg-pw">Password</Label>
              <Input id="t-reg-pw" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Have account?{" "}
              <button type="button" className="text-primary hover:underline font-medium" onClick={() => setTab("login")}>Sign in</button>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function StudentLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [regNum, setRegNum] = useState("");
  const [dob, setDob] = useState("");
  const { toast } = useToast();
  const loginMutation = useLoginStudent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { registrationNumber: regNum, dateOfBirth: dob } }, {
      onSuccess: () => onSuccess(),
      onError: (err: any) => toast({ title: "Login failed", description: err?.response?.data?.error || "Invalid credentials", variant: "destructive" }),
    });
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle>Student Login</CardTitle>
        <CardDescription>Sign in with your registration number and date of birth</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-reg">Registration Number</Label>
            <Input id="s-reg" placeholder="REG2024001" value={regNum} onChange={e => setRegNum(e.target.value)} required data-testid="input-student-reg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-dob">Date of Birth</Label>
            <Input id="s-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required data-testid="input-student-dob" />
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-student-login">
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ParentLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [regNum, setRegNum] = useState("");
  const { toast } = useToast();
  const loginMutation = useLoginParent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, studentRegistrationNumber: regNum } }, {
      onSuccess: () => onSuccess(),
      onError: (err: any) => toast({ title: "Login failed", description: err?.response?.data?.error || "Invalid credentials", variant: "destructive" }),
    });
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle>Parent Login</CardTitle>
        <CardDescription>Sign in with your email and child's registration number</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-email">Parent Email</Label>
            <Input id="p-email" type="email" placeholder="parent@email.com" value={email} onChange={e => setEmail(e.target.value)} required data-testid="input-parent-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-reg">Student Registration Number</Label>
            <Input id="p-reg" placeholder="REG2024001" value={regNum} onChange={e => setRegNum(e.target.value)} required data-testid="input-parent-reg" />
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-parent-login">
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
