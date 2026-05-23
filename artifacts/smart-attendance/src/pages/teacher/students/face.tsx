import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetStudent, useRegisterFace, getGetStudentQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, CheckCircle2, AlertCircle, RefreshCw, CameraOff } from "lucide-react";

const FACE_ANGLES = [
  { key: "front", label: "Front View", description: "Look directly at the camera", icon: "⬛" },
  { key: "left",  label: "Left View",  description: "Slowly turn your head left",  icon: "◀️" },
  { key: "right", label: "Right View", description: "Slowly turn your head right", icon: "▶️" },
  { key: "up",    label: "Up View",    description: "Slightly tilt your head up",   icon: "🔼" },
  { key: "down",  label: "Down View",  description: "Slightly tilt your head down", icon: "🔽" },
];

export default function TeacherStudentFace() {
  const [, params] = useRoute("/teacher/students/:id/face");
  const id = parseInt(params?.id ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Record<string, string>>({});
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { data: student } = useGetStudent(id, { query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } });
  const mutation = useRegisterFace();

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser."
        : err?.name === "NotFoundError"
        ? "No camera found. Please connect a webcam."
        : "Could not access camera. Please try again.";
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraActive) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, [cameraActive]);

  const captureAngle = useCallback((key: string) => {
    if (isCapturing) return;
    setIsCapturing(key);
    setCountdown(3);

    const tick = (n: number) => {
      if (n <= 0) {
        const frame = captureFrame();
        if (frame) {
          setCaptured(prev => ({ ...prev, [key]: frame }));
          toast({ title: `✓ ${FACE_ANGLES.find(a => a.key === key)?.label} captured` });
        } else {
          toast({ title: "Capture failed", description: "No video signal", variant: "destructive" });
        }
        setIsCapturing(null);
        setCountdown(null);
      } else {
        setCountdown(n);
        setTimeout(() => tick(n - 1), 1000);
      }
    };
    setTimeout(() => tick(2), 100);
  }, [isCapturing, captureFrame, toast]);

  const capturedCount = Object.keys(captured).length;
  const progress = (capturedCount / FACE_ANGLES.length) * 100;

  const handleRegister = () => {
    if (capturedCount < FACE_ANGLES.length) {
      toast({ title: "Incomplete capture", description: "Please capture all 5 angles first", variant: "destructive" });
      return;
    }
    const imageData = FACE_ANGLES.map(a => captured[a.key]);
    mutation.mutate({ id, data: { imageData } }, {
      onSuccess: () => {
        setRegistered(true);
        stopCamera();
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
        toast({ title: "Face registered successfully!", description: `${student?.name} can now be recognized.` });
      },
      onError: (err: any) => toast({ title: "Registration failed", description: err?.response?.data?.error || "Please try again", variant: "destructive" }),
    });
  };

  const handleReset = () => {
    setCaptured({});
    setRegistered(false);
    startCamera();
  };

  if (registered) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/teacher/students/${id}`)}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-2xl font-bold">Face Registration</h1>
          </div>
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-10 text-center">
              <div className="flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-5 shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-700">Registration Complete!</h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                All 5 face angles for <strong>{student?.name}</strong> have been captured and stored.
                The student can now be recognized during face-scan attendance.
              </p>
              <div className="grid grid-cols-5 gap-2 mt-5">
                {FACE_ANGLES.map(a => (
                  <div key={a.key} className="flex flex-col items-center gap-1">
                    {captured[a.key]
                      ? <img src={captured[a.key]} className="w-12 h-12 rounded-lg object-cover border-2 border-emerald-400" />
                      : <div className="w-12 h-12 rounded-lg bg-muted" />}
                    <span className="text-[10px] text-muted-foreground">{a.label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6 justify-center">
                <Button variant="outline" onClick={handleReset}><RefreshCw className="h-4 w-4 mr-2" />Re-Register</Button>
                <Button onClick={() => setLocation(`/teacher/students/${id}`)}>View Student</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/teacher/students/${id}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Face Registration</h1>
            <p className="text-muted-foreground text-sm">{student?.name} · {student?.registrationNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Camera</CardTitle>
                {cameraActive
                  ? <Button size="sm" variant="ghost" onClick={stopCamera} className="h-7 text-xs gap-1 text-muted-foreground"><CameraOff className="h-3.5 w-3.5" />Stop</Button>
                  : <Button size="sm" variant="outline" onClick={startCamera} className="h-7 text-xs gap-1"><Camera className="h-3.5 w-3.5" />Start Camera</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Camera className="h-12 w-12 text-slate-400" />
                    <p className="text-slate-400 text-sm">Camera initializing...</p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                    <CameraOff className="h-12 w-12 text-red-400" />
                    <p className="text-red-300 text-sm text-center">{cameraError}</p>
                    <Button size="sm" onClick={startCamera} variant="outline" className="border-slate-600 text-white">Retry</Button>
                  </div>
                )}

                {cameraActive && isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-2">
                    {countdown !== null && countdown > 0
                      ? <div className="text-6xl font-bold text-white drop-shadow-lg">{countdown}</div>
                      : <div className="text-white font-semibold text-lg animate-pulse">📸 Capturing...</div>}
                    <div className="absolute inset-0 border-4 border-blue-400 rounded-xl animate-pulse" />
                  </div>
                )}

                {cameraActive && !isCapturing && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-36 h-44 border-2 border-white/40 rounded-[50%]" />
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-xs font-medium">LIVE</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Capture progress</p>
                  <span className="text-sm text-muted-foreground font-medium">{capturedCount} / {FACE_ANGLES.length}</span>
                </div>
                <Progress value={progress} className="h-2.5" />
                {capturedCount > 0 && (
                  <div className="flex gap-2 mt-2">
                    {FACE_ANGLES.map(a => (
                      captured[a.key]
                        ? <img key={a.key} src={captured[a.key]} title={a.label} className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-400 flex-shrink-0" style={{ transform: "scaleX(-1)" }} />
                        : <div key={a.key} title={a.label} className="w-10 h-10 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/20 flex-shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capture Each Angle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {FACE_ANGLES.map((angle) => {
                const isDone = !!captured[angle.key];
                const isActive = isCapturing === angle.key;
                return (
                  <div key={angle.key} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isDone ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-700" : isActive ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-700" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      {isDone
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        : <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 ${isActive ? "border-blue-500 animate-pulse" : "border-muted-foreground/30"}`} />}
                      <div>
                        <p className="text-sm font-medium">{angle.label}</p>
                        <p className="text-xs text-muted-foreground">{angle.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isDone ? "outline" : "default"}
                      onClick={() => captureAngle(angle.key)}
                      disabled={isActive || !cameraActive || mutation.isPending}
                      className="ml-2 min-w-[80px]"
                    >
                      {isActive ? `${countdown}...` : isDone ? "Retake" : "Capture"}
                    </Button>
                  </div>
                );
              })}

              <div className="pt-3 border-t space-y-3">
                {student?.faceRegistered && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">Existing face data will be replaced.</p>
                  </div>
                )}
                {!cameraActive && !cameraError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted">
                    <CameraOff className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Start the camera to begin capturing.</p>
                  </div>
                )}
                <Button
                  className="w-full" size="lg"
                  onClick={handleRegister}
                  disabled={capturedCount < FACE_ANGLES.length || mutation.isPending}
                >
                  {mutation.isPending
                    ? "Saving to database..."
                    : capturedCount < FACE_ANGLES.length
                    ? `Capture ${FACE_ANGLES.length - capturedCount} more angle${FACE_ANGLES.length - capturedCount !== 1 ? "s" : ""}`
                    : "✓ Register Face Data"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
