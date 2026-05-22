import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetStudent, useRegisterFace, getGetStudentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const FACE_ANGLES = [
  { key: "front", label: "Front", description: "Look directly at the camera" },
  { key: "left", label: "Left", description: "Slowly turn your head left" },
  { key: "right", label: "Right", description: "Slowly turn your head right" },
  { key: "up", label: "Up", description: "Slightly tilt your head up" },
  { key: "down", label: "Down", description: "Slightly tilt your head down" },
];

export default function TeacherStudentFace() {
  const [, params] = useRoute("/teacher/students/:id/face");
  const id = parseInt(params?.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [captured, setCaptured] = useState<Set<string>>(new Set());
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: student } = useGetStudent(id, { query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } });
  const mutation = useRegisterFace();

  const captureAngle = (key: string) => {
    setIsCapturing(key);
    setTimeout(() => {
      setCaptured(prev => new Set([...prev, key]));
      setIsCapturing(null);
    }, 1500);
  };

  const handleRegister = () => {
    if (captured.size < FACE_ANGLES.length) {
      toast({ title: "Incomplete capture", description: "Please capture all 5 face angles", variant: "destructive" });
      return;
    }
    const imageData = FACE_ANGLES.map(a => `simulated_face_${a.key}_${id}`);
    mutation.mutate({ id, data: { imageData } }, {
      onSuccess: () => {
        setRegistered(true);
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        toast({ title: "Face Successfully Registered", description: `Face data for ${student?.name} has been saved.` });
      },
      onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.error || "Registration failed", variant: "destructive" }),
    });
  };

  const handleReset = () => {
    setCaptured(new Set());
    setRegistered(false);
    setShowConfirm(false);
  };

  const progress = (captured.size / FACE_ANGLES.length) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/teacher/students/${id}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Face Registration</h1>
            <p className="text-muted-foreground text-sm">{student?.name} — {student?.registrationNumber}</p>
          </div>
        </div>

        {registered ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-emerald-700">Face Successfully Registered</h2>
              <p className="text-muted-foreground mt-2 text-sm">All 5 face angles have been captured and stored securely. The student can now be recognized by the attendance system.</p>
              <div className="flex gap-3 mt-6 justify-center">
                <Button variant="outline" onClick={handleReset}><RefreshCw className="h-4 w-4 mr-2" />Re-Register</Button>
                <Button onClick={() => setLocation(`/teacher/students/${id}`)}>View Student Profile</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Camera Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-700 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-48 h-64 border-4 border-white rounded-full opacity-40" />
                  </div>
                  {isCapturing ? (
                    <div className="text-center z-10">
                      <div className="animate-ping w-16 h-16 bg-blue-500/30 rounded-full mx-auto mb-2" />
                      <p className="text-white text-sm font-medium">Capturing...</p>
                    </div>
                  ) : (
                    <div className="text-center z-10">
                      <Camera className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Webcam Preview</p>
                      <p className="text-slate-500 text-xs mt-1">Face detection active</p>
                    </div>
                  )}
                  {isCapturing && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium">Capture Progress</p>
                    <span className="text-sm text-muted-foreground">{captured.size}/{FACE_ANGLES.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Capture Face Angles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {FACE_ANGLES.map((angle) => {
                  const isDone = captured.has(angle.key);
                  const isActive = isCapturing === angle.key;
                  return (
                    <div key={angle.key} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isDone ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-card"}`}>
                      <div className="flex items-center gap-3">
                        {isDone
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          : <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${isActive ? "border-blue-500 animate-pulse" : "border-muted-foreground/30"}`} />}
                        <div>
                          <p className="text-sm font-medium">{angle.label} View</p>
                          <p className="text-xs text-muted-foreground">{angle.description}</p>
                        </div>
                      </div>
                      <Button
                        size="sm" variant={isDone ? "outline" : "default"}
                        onClick={() => captureAngle(angle.key)}
                        disabled={isActive || mutation.isPending}
                        className="ml-2"
                      >
                        {isActive ? "Capturing..." : isDone ? "Retake" : "Capture"}
                      </Button>
                    </div>
                  );
                })}

                <div className="pt-3 border-t">
                  {student?.faceRegistered && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded bg-yellow-50 dark:bg-yellow-950/30">
                      <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">This will replace existing face data.</p>
                    </div>
                  )}
                  <Button
                    className="w-full" size="lg"
                    onClick={handleRegister}
                    disabled={captured.size < FACE_ANGLES.length || mutation.isPending}
                  >
                    {mutation.isPending ? "Registering..." : captured.size < FACE_ANGLES.length ? `Capture ${FACE_ANGLES.length - captured.size} more angle(s)` : "Register Face Data"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
