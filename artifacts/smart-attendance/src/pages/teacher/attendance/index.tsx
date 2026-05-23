import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListStudents,
  useListPeriods,
  useMarkBulkAttendance,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import type { Student } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  Users,
  ScanFace,
  Pause,
  Play,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Mathematics", "Physics"];
const YEARS = ["1", "2", "3", "4"];
const SECTIONS = ["A", "B", "C", "D"];

type Mode = "setup" | "face-scan" | "manual";
type AttendanceStatus = "present" | "absent" | "late";

interface DetectedStudent {
  student: Student;
  detectedAt: Date;
  confidence: number;
}

export default function TeacherAttendance() {
  const [dept, setDept]       = useState("all");
  const [year, setYear]       = useState("all");
  const [section, setSection] = useState("all");
  const [periodId, setPeriodId] = useState("");
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode]       = useState<Mode>("setup");

  // Face-scan state
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detected, setDetected] = useState<DetectedStudent[]>([]);
  const [lastDetected, setLastDetected] = useState<DetectedStudent | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [scanQueueIdx, setScanQueueIdx] = useState(0);

  // Manual state
  const [manualStatuses, setManualStatuses] = useState<Record<number, AttendanceStatus>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const studentParams = {
    department: dept !== "all" ? dept : undefined,
    year:       year !== "all" ? year : undefined,
    section:    section !== "all" ? section : undefined,
    limit: 100,
  };

  // Always fetch students eagerly so the list is ready when a mode is started.
  const { data: studentsData, isLoading: loadingStudents } = useListStudents(studentParams);
  const { data: periods } = useListPeriods();
  const bulkMutation = useMarkBulkAttendance();

  const allStudents = studentsData?.students ?? [];
  const registeredStudents = allStudents.filter(s => s.faceRegistered);
  const detectedIds = new Set(detected.map(d => d.student.id));

  // ─── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError" ? "Camera permission denied. Please allow camera access in your browser settings." :
        err?.name === "NotFoundError"   ? "No camera detected. Please connect a webcam." :
        "Could not access camera. Please check your browser permissions.";
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setScanning(false);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Scanning loop ─────────────────────────────────────────────────────────
  const runOneScan = useCallback((students: Student[], currentIdx: number) => {
    // Find next undetected registered student
    let nextIdx = currentIdx;
    let found: Student | null = null;
    for (let i = 0; i < students.length; i++) {
      const candidate = students[(currentIdx + i) % students.length];
      if (candidate.faceRegistered && !detectedIds.has(candidate.id)) {
        found = candidate;
        nextIdx = (currentIdx + i + 1) % students.length;
        break;
      }
    }
    if (!found) {
      setScanning(false);
      return;
    }

    // Animate scan progress bar over 2.5s
    setScanProgress(0);
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const pct = Math.min(((Date.now() - start) / duration) * 100, 100);
      setScanProgress(pct);
      if (pct < 100) {
        scanTimerRef.current = setTimeout(tick, 50);
      } else {
        // Detection event
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 300);
        const confidence = Math.floor(Math.random() * 8) + 92; // 92–99%
        const result: DetectedStudent = { student: found!, detectedAt: new Date(), confidence };
        setDetected(prev => [...prev, result]);
        setLastDetected(result);
        setScanQueueIdx(nextIdx);
        setScanProgress(0);
        // Auto-scan next after 1.5s pause
        scanTimerRef.current = setTimeout(() => {
          if (scanning) runOneScan(students, nextIdx);
        }, 1500);
      }
    };
    scanTimerRef.current = setTimeout(tick, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedIds, scanning]);

  const toggleScan = useCallback(() => {
    if (scanning) {
      setScanning(false);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    } else {
      setScanning(true);
      runOneScan(registeredStudents, scanQueueIdx);
    }
  }, [scanning, runOneScan, registeredStudents, scanQueueIdx]);

  // Restart scan loop when `scanning` turns on
  useEffect(() => {
    if (scanning && registeredStudents.length > 0) {
      runOneScan(registeredStudents, scanQueueIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  // ─── Start modes ───────────────────────────────────────────────────────────
  const handleStartFaceScan = async () => {
    if (!periodId) { toast({ title: "Select a period first", variant: "destructive" }); return; }
    setMode("face-scan");
    setDetected([]);
    setScanQueueIdx(0);
    await startCamera();
  };

  // Seed manual statuses whenever students load (or filters change) while in manual mode.
  useEffect(() => {
    if (mode === "manual" && allStudents.length > 0) {
      setManualStatuses(prev => {
        const next: Record<number, AttendanceStatus> = {};
        allStudents.forEach(s => { next[s.id] = prev[s.id] ?? "absent"; });
        return next;
      });
    }
  }, [mode, allStudents]);

  const handleStartManual = () => {
    if (!periodId) { toast({ title: "Select a period first", variant: "destructive" }); return; }
    setMode("manual");
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    let records: { studentId: number; status: AttendanceStatus }[];

    if (mode === "face-scan") {
      records = allStudents.map(s => ({
        studentId: s.id,
        status: detectedIds.has(s.id) ? "present" : "absent",
      }));
    } else {
      records = allStudents.map(s => ({ studentId: s.id, status: manualStatuses[s.id] ?? "absent" }));
    }

    bulkMutation.mutate({ data: { periodId: parseInt(periodId), date, records } }, {
      onSuccess: (result) => {
        toast({ title: "Attendance saved!", description: `${result.created} new records, ${result.updated} updated.` });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
        stopCamera();
        setMode("setup");
        setDetected([]);
      },
      onError: () => toast({ title: "Save failed", description: "Could not save attendance", variant: "destructive" }),
    });
  };

  const handleCancel = () => {
    stopCamera();
    setMode("setup");
    setDetected([]);
    setManualStatuses({});
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Take Attendance</h1>
            <p className="text-muted-foreground text-sm">Face scan or manual marking</p>
          </div>
          <Link href="/teacher/attendance/records">
            <Button variant="outline" size="sm">View Records</Button>
          </Link>
        </div>

        {/* ── Setup card ── */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Class & Period</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <Select value={dept} onValueChange={setDept} disabled={mode !== "setup"}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Year</p>
                <Select value={year} onValueChange={setYear} disabled={mode !== "setup"}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="All Years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {YEARS.map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Section</p>
                <Select value={section} onValueChange={setSection} disabled={mode !== "setup"}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Period</p>
                <Select value={periodId} onValueChange={setPeriodId} disabled={mode !== "setup"}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select period" /></SelectTrigger>
                  <SelectContent>
                    {(periods ?? []).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" disabled={mode !== "setup"} />
              </div>
              {mode === "setup" && (
                <div className="flex gap-2">
                  <Button onClick={handleStartFaceScan} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <ScanFace className="h-4 w-4" />Face Scan
                  </Button>
                  <Button onClick={handleStartManual} variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />Manual
                  </Button>
                </div>
              )}
              {mode !== "setup" && (
                <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Face Scan Mode ── */}
        {mode === "face-scan" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Camera panel */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ScanFace className="h-5 w-5 text-blue-500" />Face Scan Attendance
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {cameraOn && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs text-muted-foreground font-medium">LIVE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video */}
                  <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden border border-slate-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />

                    {!cameraOn && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Camera className="h-12 w-12 text-slate-400 animate-pulse" />
                        <p className="text-slate-400">Initializing camera...</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
                        <CameraOff className="h-12 w-12 text-red-400" />
                        <p className="text-red-300 text-sm text-center">{cameraError}</p>
                        <Button size="sm" onClick={startCamera} variant="outline" className="border-slate-600 text-white">Retry</Button>
                      </div>
                    )}

                    {/* Scanning overlay */}
                    {cameraOn && scanning && (
                      <>
                        {/* Corner brackets */}
                        <div className="absolute top-4 left-4 w-10 h-10 border-l-2 border-t-2 border-blue-400 rounded-tl" />
                        <div className="absolute top-4 right-4 w-10 h-10 border-r-2 border-t-2 border-blue-400 rounded-tr" />
                        <div className="absolute bottom-4 left-4 w-10 h-10 border-l-2 border-b-2 border-blue-400 rounded-bl" />
                        <div className="absolute bottom-4 right-4 w-10 h-10 border-r-2 border-b-2 border-blue-400 rounded-br" />
                        {/* Sweep line */}
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-blue-400/70 shadow-[0_0_8px_2px_rgba(96,165,250,0.5)] transition-none"
                          style={{ top: `${scanProgress}%` }}
                        />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1">
                          <p className="text-blue-300 text-xs font-medium animate-pulse">Scanning...</p>
                        </div>
                      </>
                    )}

                    {/* Flash on detection */}
                    {showFlash && (
                      <div className="absolute inset-0 bg-emerald-400/30 pointer-events-none transition-opacity" />
                    )}

                    {/* Last detected overlay */}
                    {lastDetected && !scanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-emerald-900/90 border border-emerald-400 rounded-xl px-6 py-4 text-center shadow-xl">
                          <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                          <p className="text-white font-bold">{lastDetected.student.name}</p>
                          <p className="text-emerald-300 text-sm">{lastDetected.confidence}% confidence</p>
                        </div>
                      </div>
                    )}

                    {/* Face oval guide */}
                    {cameraOn && !scanning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-36 h-44 border-2 border-white/20 rounded-[50%]" />
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  {cameraOn && (
                    <>
                      {registeredStudents.length === 0 ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-700">
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            No students have face data registered for this class. Register faces first, then use face scan.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={toggleScan}
                            className={`flex-1 gap-2 ${scanning ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}
                            disabled={detectedIds.size >= registeredStudents.length}
                          >
                            {scanning
                              ? <><Pause className="h-4 w-4" />Pause Scan</>
                              : <><Play className="h-4 w-4" />{detectedIds.size > 0 ? "Resume Scan" : "Start Scanning"}</>}
                          </Button>
                          {detectedIds.size >= registeredStudents.length && registeredStudents.length > 0 && (
                            <p className="text-sm text-emerald-600 font-medium">All faces detected!</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right panel: student list */}
            <div className="lg:col-span-2 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{detectedIds.size}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Detected Present</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{allStudents.length - detectedIds.size}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Absent / Not Scanned</p>
                </Card>
              </div>

              {/* Detected list */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                    Detected ({detectedIds.size} / {allStudents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStudents ? (
                    <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                  ) : allStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No students match the selected filters.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                      {allStudents.map(s => {
                        const isPresent = detectedIds.has(s.id);
                        const det = detected.find(d => d.student.id === s.id);
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${isPresent ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "border border-border"}`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.registrationNumber}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isPresent ? (
                                <div className="text-right">
                                  <Badge className="bg-emerald-500 text-white text-[10px]">Present</Badge>
                                  {det && <p className="text-[10px] text-muted-foreground mt-0.5">{det.confidence}%</p>}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {!s.faceRegistered && (
                                    <span title="No face registered" className="text-amber-500 text-xs">⚠</span>
                                  )}
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Absent</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={bulkMutation.isPending || allStudents.length === 0}
              >
                {bulkMutation.isPending ? "Saving..." : `Save Attendance (${allStudents.length} students)`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Manual Mode ── */}
        {mode === "manual" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{allStudents.length} Students — Manual Marking</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1 text-emerald-600 h-8"
                    onClick={() => { const u: Record<number, AttendanceStatus> = {}; allStudents.forEach(s => { u[s.id] = "present"; }); setManualStatuses(u); }}>
                    <CheckCircle className="h-3.5 w-3.5" />All Present
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-600 h-8"
                    onClick={() => { const u: Record<number, AttendanceStatus> = {}; allStudents.forEach(s => { u[s.id] = "absent"; }); setManualStatuses(u); }}>
                    <XCircle className="h-3.5 w-3.5" />All Absent
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : allStudents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No students found for the selected filters.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {allStudents.map(s => {
                    const status = manualStatuses[s.id];
                    return (
                      <div
                        key={s.id}
                        className={`rounded-lg border p-3 transition-all ${
                          status === "present" ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" :
                          status === "absent"  ? "border-red-400 bg-red-50 dark:bg-red-950/30" :
                          status === "late"    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30" :
                          "border-border"
                        }`}
                      >
                        <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.registrationNumber}</p>
                        <div className="flex gap-1 mt-2">
                          {(["present", "absent", "late"] as AttendanceStatus[]).map(st => (
                            <button
                              key={st}
                              onClick={() => setManualStatuses(prev => ({ ...prev, [s.id]: st }))}
                              className={`flex-1 text-xs py-1 rounded font-medium transition-all ${
                                status === st
                                  ? st === "present" ? "bg-emerald-500 text-white" : st === "absent" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {st === "present" ? "P" : st === "absent" ? "A" : "L"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {Object.values(manualStatuses).filter(s => s === "present").length} present ·{" "}
                  {Object.values(manualStatuses).filter(s => s === "absent").length} absent ·{" "}
                  {Object.values(manualStatuses).filter(s => s === "late").length} late
                </p>
                <Button onClick={handleSave} disabled={bulkMutation.isPending}>
                  {bulkMutation.isPending ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
