"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getSubjects,
  createSubject,
  logAttendanceSession,
  deleteSubject,
  updateSubjectCounts,
} from "@/actions/attendance.actions";
import { calculateAttendanceMetrics } from "@/lib/utils";
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
  Sparkles,
  BookOpen,
} from "lucide-react";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

export default function AttendancePage() {
  const { user } = useUser();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [totalClasses, setTotalClasses] = useState("30");
  const [attendedClasses, setAttendedClasses] = useState("25");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

    const total = Number(totalClasses);
    const attended = Number(attendedClasses);

    if (attended > total) {
      toast.error("Attended classes cannot exceed total classes.");
      return;
    }

    setIsSubmitting(true);
    const res = await createSubject({
      userId: user.id,
      name,
      code: code || undefined,
      totalClasses: total,
      attendedClasses: attended,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Subject "${name}" added successfully!`);
      setIsAddModalOpen(false);
      setName("");
      setCode("");
      setTotalClasses("30");
      setAttendedClasses("25");
      fetchSubjectsList();
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingSubject) return;

    setIsSubmitting(true);
    const res = await updateSubjectCounts(editingSubject.id, user.id, {
      name: editingSubject.name,
      code: editingSubject.code,
      totalClasses: Number(editingSubject.totalClasses),
      attendedClasses: Number(editingSubject.attendedClasses),
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Subject updated successfully!");
      setEditingSubject(null);
      fetchSubjectsList();
    }
  };

  const handleLogSession = async (subjectId: string, status: "PRESENT" | "ABSENT") => {
    if (!user) return;
    setActionLoadingId(`${subjectId}-${status}`);

    const res = await logAttendanceSession(subjectId, user.id, status);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      if (status === "PRESENT") {
        toast.success("Class marked Present! Attendance increased.");
      } else {
        toast.warning("Class marked Absent.");
      }
      fetchSubjectsList();
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this subject?")) return;

    const res = await deleteSubject(subjectId, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Subject removed.");
      fetchSubjectsList();
    }
  };

  // Aggregate Metrics
  let totalAllClasses = 0;
  let totalAllAttended = 0;
  let lowAttendanceCount = 0;

  subjects.forEach((s) => {
    totalAllClasses += s.totalClasses;
    totalAllAttended += s.attendedClasses;
    const { percentage } = calculateAttendanceMetrics(s.attendedClasses, s.totalClasses);
    if (percentage < 75) lowAttendanceCount++;
  });

  const overallAggregate =
    totalAllClasses > 0
      ? Number(((totalAllAttended / totalAllClasses) * 100).toFixed(1))
      : 100;

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="ATTENDANCE">
      <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-emerald-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>75% University Minimum Attendance Rule Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Attendance Guardrail & Bunk Calculator
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track real-time class attendance across all enrolled courses. Automatic mathematical deficit and safe bunk predictions prevent exam debarment.
            </p>
          </div>

          <Button
            variant="brand"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsAddModalOpen(true)}
            className="shadow-lg shadow-emerald-500/25"
          >
            Add Subject
          </Button>
        </div>

        {/* Aggregate KPI Stats */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Overall Attendance
              </p>
              <p
                className={`text-xl font-extrabold ${
                  overallAggregate < 75 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {overallAggregate}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                lowAttendanceCount > 0
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Critical Subjects (&lt;75%)
              </p>
              <p
                className={`text-xl font-extrabold ${
                  lowAttendanceCount > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {lowAttendanceCount} Courses at Risk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Total Classes Tracked
              </p>
              <p className="text-xl font-extrabold text-white">
                {totalAllAttended} / {totalAllClasses} Attended
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <GlassCard className="text-center py-16">
          <CalendarCheck className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            No subjects added yet
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add your semester courses and current attendance numbers to unlock automatic 75% guardrails.
          </p>
          <Button
            variant="brand"
            size="sm"
            className="mt-4"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Your First Subject
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject) => {
            const { percentage, status, consecutiveNeeded, canBunk } =
              calculateAttendanceMetrics(subject.attendedClasses, subject.totalClasses);

            const isDanger = percentage < 75;

            return (
              <GlassCard
                key={subject.id}
                variant={isDanger ? "danger" : "default"}
                className={`flex flex-col justify-between transition-all duration-300 ${
                  isDanger
                    ? "border-rose-400/50 shadow-rose-500/10"
                    : "hover:border-emerald-400/40"
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {subject.name}
                        </span>
                        {subject.code && (
                          <Badge variant="neutral" size="sm">
                            {subject.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subject.attendedClasses} attended out of {subject.totalClasses} total lectures
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingSubject(subject)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Percentage & Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Attendance Rate
                      </span>
                      <span
                        className={`text-2xl font-black ${
                          isDanger ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {percentage}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="relative w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      {/* 75% Target Line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                        style={{ left: "75%" }}
                        title="75% Minimum Requirement"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDanger
                            ? "bg-gradient-to-r from-rose-600 to-amber-500"
                            : "bg-gradient-to-r from-emerald-500 to-teal-400"
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mathematical Predictive Advice Box */}
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                      isDanger
                        ? "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200"
                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    }`}
                  >
                    {isDanger ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-700 dark:text-rose-300">
                            Below 75% Debarment Threshold!
                          </p>
                          <p className="mt-0.5 leading-relaxed">
                            You need to attend{" "}
                            <strong className="underline font-extrabold text-rose-900 dark:text-rose-100">
                              exactly {consecutiveNeeded} more consecutive classes
                            </strong>{" "}
                            without missing to reach 75%.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-700 dark:text-emerald-300">
                            Attendance Safe & Compliant
                          </p>
                          <p className="mt-0.5 leading-relaxed">
                            {canBunk > 0 ? (
                              <>
                                You can safely miss up to{" "}
                                <strong className="underline font-extrabold text-emerald-900 dark:text-emerald-100">
                                  {canBunk} classes
                                </strong>{" "}
                                and still remain above 75%.
                              </>
                            ) : (
                              "On the 75% boundary. Attend the next class to maintain compliance."
                            )}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Log Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Quick Log Today:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={actionLoadingId === `${subject.id}-ABSENT`}
                      onClick={() => handleLogSession(subject.id, "ABSENT")}
                      className="border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Missed Class
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      isLoading={actionLoadingId === `${subject.id}-PRESENT`}
                      onClick={() => handleLogSession(subject.id, "PRESENT")}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Attended (+1)
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Subject Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Enrolled Subject"
        description="Configure your course name and existing attendance counts."
      >
        <form onSubmit={handleAddSubject} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Systems & Kernel Architecture"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Course Code (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. CSE-312"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Total Classes Held *
              </label>
              <input
                type="number"
                min="0"
                required
                value={totalClasses}
                onChange={(e) => setTotalClasses(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Classes Attended *
              </label>
              <input
                type="number"
                min="0"
                required
                value={attendedClasses}
                onChange={(e) => setAttendedClasses(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} loadingText="Adding Subject...">
              Save Subject
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Edit Subject Modal */}
      {editingSubject && (
        <Modal
          isOpen={!!editingSubject}
          onClose={() => setEditingSubject(null)}
          title="Edit Subject Attendance Counts"
        >
          <form onSubmit={handleUpdateSubject} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Subject Name *
              </label>
              <input
                type="text"
                required
                value={editingSubject.name}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, name: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                value={editingSubject.code || ""}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, code: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Total Classes
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingSubject.totalClasses}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      totalClasses: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Attended Classes
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editingSubject.attendedClasses}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      attendedClasses: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSubject(null)}
              >
                Cancel
              </Button>
              <SubmitButton isSubmitting={isSubmitting} loadingText="Updating...">
                Save Changes
              </SubmitButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
    </ClientServiceGuard>
  );
}
