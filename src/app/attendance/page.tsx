"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/UserContext";
import {
  getSubjects,
  createSubject,
  logAttendanceSession,
  deleteSubject,
  updateSubjectCounts,
} from "@/actions/attendance.actions";
import { calculateAttendanceMetrics, cn } from "@/lib/utils";
import { parsePreferencesFromBio, syncUserPreferencesToCloud } from "@/lib/preferences";
import { toast } from "sonner";
import {
  CalendarCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  Sliders,
  Cloud,
  Check,
} from "lucide-react";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";
import { LiquidSlider } from "@/components/ui/liquid-slider";

export default function AttendancePage() {
  const { user, refreshUser } = useUser();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);

  // Dynamic attendance target threshold (configurable with slider and synced to cloud)
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [isSyncingTarget, setIsSyncingTarget] = useState(false);
  const [targetSynced, setTargetSynced] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [totalClasses, setTotalClasses] = useState("0");
  const [attendedClasses, setAttendedClasses] = useState("0");
  const [periodWeight, setPeriodWeight] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dynamic per-card session weight selector (defaulting to course's periodWeight)
  const [sessionWeights, setSessionWeights] = useState<Record<string, number>>({});

  // Load target attendance from cloud preferences on user record
  useEffect(() => {
    if (user?.bio) {
      const { preferences } = parsePreferencesFromBio(user.bio);
      if (preferences.attendanceTarget) {
        setTargetPercentage(preferences.attendanceTarget);
      }
    } else if (typeof window !== "undefined") {
      const saved = localStorage.getItem("otium_attendance_target");
      if (saved) {
        setTargetPercentage(Number(saved) || 75);
      }
    }
  }, [user?.bio]);

  const handleTargetChange = (newTarget: number) => {
    const clamped = Math.max(50, Math.min(95, newTarget));
    setTargetPercentage(clamped);
    setTargetSynced(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("otium_attendance_target", String(clamped));
    }
  };

  const handleSaveTargetToCloud = async () => {
    if (!user) {
      toast.info(`Target set to ${targetPercentage}%. Sign in to sync across devices.`);
      setTargetSynced(true);
      return;
    }

    setIsSyncingTarget(true);
    const { res } = await syncUserPreferencesToCloud(user.id, user.bio, {
      attendanceTarget: targetPercentage,
    });
    setIsSyncingTarget(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setTargetSynced(true);
      toast.success(`Guardrail target updated to ${targetPercentage}% & synced to cloud!`);
      if (refreshUser) refreshUser();
    }
  };

  const getSessionWeight = (subId: string, defaultWeight: number) => {
    return sessionWeights[subId] ?? (defaultWeight || 1);
  };

  const setSessionWeight = (subId: string, weight: number) => {
    setSessionWeights((prev) => ({ ...prev, [subId]: weight }));
  };

  const fetchSubjectsList = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getSubjects(user.id);
    if (res.success && res.data) {
      setSubjects(res.data);
    } else {
      toast.error(res.error || "Failed to load subjects.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjectsList();
  }, [user?.id]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const total = Number(totalClasses) || 0;
    const attended = Number(attendedClasses) || 0;

    if (attended > total) {
      toast.error("Attended classes cannot exceed total classes held.");
      return;
    }

    setIsSubmitting(true);
    const res = await createSubject({
      userId: user.id,
      name: name.trim(),
      code: code.trim() || undefined,
      totalClasses: total,
      attendedClasses: attended,
      periodWeight: Number(periodWeight) || 1,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Course "${name}" added.`);
      setIsAddModalOpen(false);
      setName("");
      setCode("");
      setTotalClasses("0");
      setAttendedClasses("0");
      setPeriodWeight(1);
      fetchSubjectsList();
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingSubject) return;

    const total = Number(editingSubject.totalClasses) || 0;
    const attended = Number(editingSubject.attendedClasses) || 0;

    if (attended > total) {
      toast.error("Attended classes cannot exceed total classes held.");
      return;
    }

    setIsSubmitting(true);
    const res = await updateSubjectCounts(editingSubject.id, user.id, {
      name: editingSubject.name,
      code: editingSubject.code,
      totalClasses: total,
      attendedClasses: attended,
      periodWeight: Number(editingSubject.periodWeight) || 1,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Course attendance updated.");
      setEditingSubject(null);
      fetchSubjectsList();
    }
  };

  const handleQuickLog = async (
    subjectId: string,
    status: "PRESENT" | "ABSENT",
    count: number = 1
  ) => {
    if (!user) return;
    setActionLoadingId(subjectId);
    const res = await logAttendanceSession(
      subjectId,
      user.id,
      status,
      count
    );
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      const label = count > 1 ? `${count} class hours` : "1 class";
      toast.success(status === "PRESENT" ? `Marked Present (${label}).` : `Marked Absent (${label}).`);
      fetchSubjectsList();
    }
  };

  const handleDelete = async (id: string, subjectName: string) => {
    if (!user) return;
    if (!confirm(`Delete "${subjectName}" from attendance tracking?`)) return;

    const res = await deleteSubject(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Course removed.");
      fetchSubjectsList();
    }
  };

  // Overall aggregate percentage
  const totalHeldAcrossAll = subjects.reduce((sum, s) => sum + s.totalClasses, 0);
  const totalAttendedAcrossAll = subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
  const overallMetrics = calculateAttendanceMetrics(
    totalAttendedAcrossAll,
    totalHeldAcrossAll,
    targetPercentage
  );

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="ATTENDANCE">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <CalendarCheck className="w-3.5 h-3.5 text-primary" />
              <span>Academic Guardrail</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {targetPercentage}% Attendance Guardrail
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track course lectures and determine safe bunk allowances or required recovery lectures for your {targetPercentage}% target.
            </p>
          </div>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Subject
          </Button>
        </div>

        {/* Dynamic Target Guardrail Slider Card */}
        <Card className="p-5 border-border bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">
                  Custom Attendance Threshold
                </h2>
                {targetSynced ? (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 py-0 font-medium"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                    Synced to Cloud
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    size="sm"
                    className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 py-0 font-medium animate-pulse"
                  >
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Set your university minimum requirement. Supports flexible rules for medical, sports, or strict quotas.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant={targetSynced ? "secondary" : "default"}
                size="sm"
                onClick={handleSaveTargetToCloud}
                disabled={isSyncingTarget}
                isLoading={isSyncingTarget}
                leftIcon={<Cloud className="w-3.5 h-3.5" />}
              >
                {targetSynced ? "Target Synced" : `Sync ${targetPercentage}% to Cloud`}
              </Button>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-foreground">
              <span className="text-muted-foreground">Threshold Gauge:</span>
              <span className="font-heading text-lg font-extrabold text-primary">
                {targetPercentage}%
              </span>
            </div>

            <LiquidSlider
              min={50}
              max={95}
              step={1}
              value={targetPercentage}
              onChange={handleTargetChange}
              unit="%"
              presets={[
                { label: "65% Medical / Duty", value: 65 },
                { label: "75% AICTE Standard", value: 75 },
                { label: "80% Dept Strict", value: 80 },
                { label: "85% Honors Quota", value: 85 },
              ]}
            />

            <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-1">
              <span>50% (Min Safe)</span>
              <span>65% (Medical/Duty)</span>
              <span className="font-bold text-foreground">75% (Standard)</span>
              <span>85% (Honors)</span>
              <span>95% (Max Strict)</span>
            </div>
          </div>
        </Card>

        {/* Aggregate Overview Card */}
        {subjects.length > 0 && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cumulative Term Attendance
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-heading text-4xl font-extrabold text-foreground">
                    {overallMetrics.percentage}%
                  </span>
                  <Badge
                    variant={overallMetrics.status === "SAFE" ? "success" : "destructive"}
                    size="md"
                  >
                    {overallMetrics.status === "SAFE"
                      ? `Eligible (Above ${targetPercentage}%)`
                      : `At Risk (Below ${targetPercentage}%)`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalAttendedAcrossAll} of {totalHeldAcrossAll} lectures attended across {subjects.length} registered courses.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border text-xs space-y-1 min-w-56">
                <span className="font-bold text-foreground">Term Guardrail Rule:</span>
                {overallMetrics.status === "SAFE" ? (
                  <p className="text-muted-foreground">
                    You can safely bunk up to <strong className="text-foreground">{overallMetrics.canBunk}</strong> more lectures overall.
                  </p>
                ) : (
                  <p className="text-destructive font-medium">
                    You must attend the next <strong className="text-foreground">{overallMetrics.consecutiveNeeded}</strong> lectures consecutively to clear the {targetPercentage}% threshold.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Subjects List Grid */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Registered Subjects ({subjects.length})
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 rounded-xl bg-secondary/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-sm">No courses added</h3>
                <p className="text-xs text-muted-foreground">
                  Add your courses and timetable to start monitoring the 75% rule.
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Subject
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((sub) => {
                const metric = calculateAttendanceMetrics(
                  sub.attendedClasses,
                  sub.totalClasses,
                  targetPercentage
                );
                const isSafe = metric.status === "SAFE";
                const isWorking = actionLoadingId === sub.id;

                return (
                  <Card key={sub.id} className="p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading font-bold text-base text-foreground truncate">
                              {sub.name}
                            </h3>
                            {sub.periodWeight > 1 && (
                              <Badge variant="outline" size="sm" className="text-[10px] font-mono">
                                {sub.periodWeight >= 3
                                  ? `Lab (${sub.periodWeight}h)`
                                  : `Tutorial (${sub.periodWeight}h)`}
                              </Badge>
                            )}
                          </div>
                          {sub.code && (
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              {sub.code}
                            </span>
                          )}
                        </div>

                        <Badge variant={isSafe ? "success" : "destructive"} size="md">
                          {metric.percentage}%
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>
                            {sub.attendedClasses} / {sub.totalClasses} attended
                          </span>
                          <span>Target: {targetPercentage}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isSafe ? "bg-emerald-500" : "bg-destructive"
                            }`}
                            style={{ width: `${Math.min(100, metric.percentage)}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Advice Notice */}
                      <div className="p-2.5 rounded-lg bg-secondary/40 border border-border text-xs leading-normal">
                        {isSafe ? (
                          <span className="text-muted-foreground">
                            Safe to miss <strong className="text-foreground">{metric.canBunk}</strong> lecture{metric.canBunk !== 1 ? "s" : ""}.
                          </span>
                        ) : (
                          <span className="text-destructive font-medium">
                            Must attend next <strong className="text-foreground">{metric.consecutiveNeeded}</strong> lecture{metric.consecutiveNeeded !== 1 ? "s" : ""} without bunking.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Log Action Bar */}
                    <div className="pt-3 border-t border-border/60 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Session Hours Selector (e.g. 1h lecture vs 3h/4h lab) */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="text-[11px] font-medium">Session:</span>
                          <div className="inline-flex rounded-md border border-border bg-secondary/50 p-0.5">
                            {[1, 2, 3, 4].map((hrs) => {
                              const currentWeight = getSessionWeight(sub.id, sub.periodWeight);
                              const isSelected = currentWeight === hrs;
                              return (
                                <button
                                  key={hrs}
                                  type="button"
                                  onClick={() => setSessionWeight(sub.id, hrs)}
                                  className={cn(
                                    "px-2 py-0.5 text-[11px] font-semibold rounded transition-colors",
                                    isSelected
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title={`${hrs} ${hrs === 1 ? "hour / lecture" : "hours / lab"}`}
                                >
                                  {hrs}h
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Card Edit & Delete */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingSubject(sub)}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit course counts and lab settings"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, sub.name)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Log Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isWorking}
                          onClick={() =>
                            handleQuickLog(
                              sub.id,
                              "PRESENT",
                              getSessionWeight(sub.id, sub.periodWeight)
                            )
                          }
                          className="flex-1 font-semibold"
                        >
                          + Present ({getSessionWeight(sub.id, sub.periodWeight)}h)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isWorking}
                          onClick={() =>
                            handleQuickLog(
                              sub.id,
                              "ABSENT",
                              getSessionWeight(sub.id, sub.periodWeight)
                            )
                          }
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          + Absent ({getSessionWeight(sub.id, sub.periodWeight)}h)
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Subject Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Subject"
          description="Enter course information and current attendance counts."
        >
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course Title *</label>
              <Input
                placeholder="e.g. Operating Systems / Chemistry Lab"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Course Code (Optional)</label>
              <Input
                placeholder="e.g. CS301 / CH102L"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {/* Session Type & Lab Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Class Type & Session Duration *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { weight: 1, label: "1h Lecture", desc: "1 period" },
                  { weight: 2, label: "2h Tutorial", desc: "2 periods" },
                  { weight: 3, label: "3h Lab", desc: "3 periods" },
                  { weight: 4, label: "4h Lab", desc: "4 periods" },
                ].map((item) => (
                  <button
                    key={item.weight}
                    type="button"
                    onClick={() => setPeriodWeight(item.weight)}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition-all",
                      periodWeight === item.weight
                        ? "border-primary bg-primary/10 text-foreground font-semibold ring-1 ring-primary"
                        : "border-border bg-card hover:bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    <div className="text-xs font-bold text-foreground">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                College lab sessions count as 3 or 4 periods towards attendance tallies.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Total Classes Held</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={totalClasses}
                  onChange={(e) => setTotalClasses(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Classes Attended</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={attendedClasses}
                  onChange={(e) => setAttendedClasses(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Add Course
            </Button>
          </form>
        </Modal>

        {/* Edit Subject Modal */}
        <Modal
          isOpen={Boolean(editingSubject)}
          onClose={() => setEditingSubject(null)}
          title="Edit Subject Counts"
          description="Manually correct tallies or lab duration for this course."
        >
          {editingSubject && (
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Course Title</label>
                <Input
                  value={editingSubject.name}
                  onChange={(e) =>
                    setEditingSubject({ ...editingSubject, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* Edit Session Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Class Type & Session Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { weight: 1, label: "1h Lecture", desc: "1 period" },
                    { weight: 2, label: "2h Tutorial", desc: "2 periods" },
                    { weight: 3, label: "3h Lab", desc: "3 periods" },
                    { weight: 4, label: "4h Lab", desc: "4 periods" },
                  ].map((item) => {
                    const isSelected = (editingSubject.periodWeight || 1) === item.weight;
                    return (
                      <button
                        key={item.weight}
                        type="button"
                        onClick={() =>
                          setEditingSubject({
                            ...editingSubject,
                            periodWeight: item.weight,
                          })
                        }
                        className={cn(
                          "p-2.5 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground font-semibold ring-1 ring-primary"
                            : "border-border bg-card hover:bg-secondary/60 text-muted-foreground"
                        )}
                      >
                        <div className="text-xs font-bold text-foreground">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Total Classes</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingSubject.totalClasses}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        totalClasses: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Attended Classes</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingSubject.attendedClasses}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        attendedClasses: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
            </form>
          )}
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
