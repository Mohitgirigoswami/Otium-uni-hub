"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getSemesterRecords,
  saveSemesterRecord,
  deleteSemesterRecord,
} from "@/actions/cgpa.actions";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Trash2,
  Save,
  Calculator,
  Target,
  Sparkles,
  TrendingUp,
  Award,
} from "lucide-react";
import { CourseGradeItem } from "@/lib/types";

const GRADE_OPTIONS = [
  { label: "O (Outstanding)", point: 10 },
  { label: "A+ (Excellent)", point: 9 },
  { label: "A (Very Good)", point: 8 },
  { label: "B+ (Good)", point: 7 },
  { label: "B (Above Average)", point: 6 },
  { label: "C (Average)", point: 5 },
  { label: "P (Pass)", point: 4 },
  { label: "F (Fail)", point: 0 },
];

const INITIAL_COURSES: CourseGradeItem[] = [
  { id: "1", name: "Distributed Systems & Cloud", credits: 4, gradePoint: 9, gradeLabel: "A+" },
  { id: "2", name: "Database Engineering & SQL", credits: 4, gradePoint: 10, gradeLabel: "O" },
  { id: "3", name: "Computer Networks", credits: 4, gradePoint: 8, gradeLabel: "A" },
  { id: "4", name: "Software Engineering & Agile", credits: 3, gradePoint: 9, gradeLabel: "A+" },
  { id: "5", name: "Cloud & DevOps Lab", credits: 2, gradePoint: 10, gradeLabel: "O" },
];

export default function CgpaPage() {
  const { user } = useUser();
  const [savedSemesters, setSavedSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Semester Calculator state
  const [activeSemesterNum, setActiveSemesterNum] = useState<number>(4);
  const [courses, setCourses] = useState<CourseGradeItem[]>(INITIAL_COURSES);
  const [isSaving, setIsSaving] = useState(false);

  // Target Predictor state
  const [targetCgpa, setTargetCgpa] = useState<string>("9.0");
  const [targetUpcomingCredits, setTargetUpcomingCredits] = useState<string>("24");

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getSemesterRecords(user.id);
    if (res.success && res.data) {
      setSavedSemesters(res.data);
      if (res.data.length > 0) {
        // next semester default
        const maxSem = Math.max(...res.data.map((s: any) => s.semester));
        setActiveSemesterNum(maxSem + 1);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [user?.id]);

  // Compute Current Active Semester GPA
  const totalActiveCredits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  const totalActiveWeightedPoints = courses.reduce(
    (sum, c) => sum + (Number(c.credits) || 0) * (Number(c.gradePoint) || 0),
    0
  );
  const currentSemesterGPA =
    totalActiveCredits > 0
      ? Number((totalActiveWeightedPoints / totalActiveCredits).toFixed(2))
      : 0;

  // Compute Cumulative CGPA across all saved semesters
  let cumulativeWeightedPoints = 0;
  let cumulativeTotalCredits = 0;

  savedSemesters.forEach((sem) => {
    cumulativeWeightedPoints += sem.gpa * sem.totalCredits;
    cumulativeTotalCredits += sem.totalCredits;
  });

  const cumulativeCGPA =
    cumulativeTotalCredits > 0
      ? Number((cumulativeWeightedPoints / cumulativeTotalCredits).toFixed(2))
      : 0;

  // Add course row
  const addCourseRow = () => {
    const newCourse: CourseGradeItem = {
      id: Date.now().toString(),
      name: `Elective / Course ${courses.length + 1}`,
      credits: 3,
      gradePoint: 9,
      gradeLabel: "A+",
    };
    setCourses([...courses, newCourse]);
  };

  // Remove course row
  const removeCourseRow = (id: string) => {
    if (courses.length <= 1) {
      toast.error("At least one course is required.");
      return;
    }
    setCourses(courses.filter((c) => c.id !== id));
  };

  // Update course row
  const updateCourse = (id: string, field: keyof CourseGradeItem, value: any) => {
    setCourses(
      courses.map((c) => {
        if (c.id === id) {
          if (field === "gradePoint") {
            const foundGrade = GRADE_OPTIONS.find((g) => g.point === Number(value));
            return {
              ...c,
              gradePoint: Number(value),
              gradeLabel: foundGrade ? foundGrade.label.split(" ")[0] : "A",
            };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  // Save active semester
  const handleSaveSemester = async () => {
    if (!user) return;
    if (totalActiveCredits === 0) {
      toast.error("Add at least one valid course with credits.");
      return;
    }

    setIsSaving(true);
    const res = await saveSemesterRecord({
      userId: user.id,
      semester: activeSemesterNum,
      courses,
      gpa: currentSemesterGPA,
      totalCredits: totalActiveCredits,
    });
    setIsSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Semester ${activeSemesterNum} saved to records!`);
      fetchRecords();
    }
  };

  // Delete saved semester
  const handleDeleteSaved = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete this semester record?")) return;

    const res = await deleteSemesterRecord(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Semester record removed.");
      fetchRecords();
    }
  };

  // Target Predictor Calculation
  // Target = (cumulativeWeightedPoints + neededGPA * upcomingCredits) / (cumulativeTotalCredits + upcomingCredits)
  // neededGPA * upcomingCredits = Target * (cumulativeTotalCredits + upcomingCredits) - cumulativeWeightedPoints
  const target = parseFloat(targetCgpa) || 0;
  const upcomingCreds = parseFloat(targetUpcomingCredits) || 1;
  const totalCombinedCredits = cumulativeTotalCredits + upcomingCreds;
  const requiredWeightedTotal = target * totalCombinedCredits;
  const requiredUpcomingGPA =
    upcomingCreds > 0
      ? Number(((requiredWeightedTotal - cumulativeWeightedPoints) / upcomingCreds).toFixed(2))
      : 0;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-electric-950/90 via-slate-900/90 to-accent-950/90 p-8 sm:p-10 border border-electric-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/20 border border-electric-400/30 text-electric-300 text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Credit-Weighted Academic Performance Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              CGPA & Semester Grade Tracker
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Calculate semester SGPA with exact credit weight multipliers, record historical transcripts, and simulate future target grades.
            </p>
          </div>

          {/* Cumulative CGPA Badge */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-center min-w-[180px]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cumulative CGPA
            </p>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-brand-300 to-accent-300">
              {cumulativeCGPA > 0 ? cumulativeCGPA : "—"} / 10.0
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {cumulativeTotalCredits} Total Credits
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Semester Grade Calculator */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-brand-500" />
                  <span>Semester {activeSemesterNum} Course Calculator</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input course names, credit weights (1-6), and letter grades.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Semester:</span>
                  <select
                    value={activeSemesterNum}
                    onChange={(e) => setActiveSemesterNum(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="brand"
                  size="sm"
                  leftIcon={<Save className="w-4 h-4" />}
                  isLoading={isSaving}
                  onClick={handleSaveSemester}
                >
                  Save Record
                </Button>
              </div>
            </div>

            {/* Course Rows List */}
            <div className="space-y-3">
              {courses.map((course, idx) => (
                <div
                  key={course.id}
                  className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60"
                >
                  {/* Course Title */}
                  <div className="col-span-12 sm:col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 sm:hidden mb-1">
                      Course Name
                    </label>
                    <input
                      type="text"
                      value={course.name}
                      onChange={(e) => updateCourse(course.id, "name", e.target.value)}
                      placeholder="Course Title"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {/* Credits */}
                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 sm:hidden mb-1">
                      Credits
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={course.credits}
                        onChange={(e) =>
                          updateCourse(course.id, "credits", Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        cr
                      </span>
                    </div>
                  </div>

                  {/* Grade Dropdown */}
                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 sm:hidden mb-1">
                      Grade
                    </label>
                    <select
                      value={course.gradePoint}
                      onChange={(e) =>
                        updateCourse(course.id, "gradePoint", Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-brand-600 dark:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g.point} value={g.point}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delete Row */}
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeCourseRow(course.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Remove Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Course Button & Live SGPA Card */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={addCourseRow}
              >
                Add Another Course
              </Button>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-brand-500/15 to-electric-500/15 border border-brand-500/30">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Semester {activeSemesterNum} SGPA
                  </p>
                  <p className="text-xs text-slate-500">
                    {totalActiveCredits} Total Credits
                  </p>
                </div>
                <div className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  {currentSemesterGPA}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Historical Saved Semesters */}
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Transcripts & Saved Semesters</span>
            </h3>

            {savedSemesters.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No saved semester records yet. Click "Save Record" above to record your SGPA.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedSemesters.map((sem) => (
                  <div
                    key={sem.id}
                    className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Semester {sem.semester}
                      </span>
                      <button
                        onClick={() => handleDeleteSaved(sem.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-1">
                      {sem.gpa.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {sem.totalCredits} Credits • {sem.courses?.length || 0} Courses
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Col: Target CGPA Predictor & Planning Simulator */}
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-5 border-accent-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent-500/20 flex items-center justify-center text-accent-500">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Target CGPA Planner
                </h3>
                <p className="text-[11px] text-slate-400">
                  Simulate required SGPA for future semesters
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Desired CGPA (e.g. 9.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="4"
                  max="10"
                  value={targetCgpa}
                  onChange={(e) => setTargetCgpa(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Upcoming Semester Credits
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={targetUpcomingCredits}
                  onChange={(e) => setTargetUpcomingCredits(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              {/* Prediction Result Box */}
              <div className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/30 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent-600 dark:text-accent-300">
                  Required SGPA in Next Sem
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-black ${
                      requiredUpcomingGPA > 10
                        ? "text-rose-500"
                        : requiredUpcomingGPA <= 0
                        ? "text-emerald-500"
                        : "text-accent-600 dark:text-accent-400"
                    }`}
                  >
                    {requiredUpcomingGPA > 10
                      ? "Unreachable (>10.0)"
                      : requiredUpcomingGPA <= 0
                      ? "Target Achieved!"
                      : requiredUpcomingGPA.toFixed(2)}
                  </span>
                  {requiredUpcomingGPA > 0 && requiredUpcomingGPA <= 10 && (
                    <span className="text-xs text-slate-500">/ 10.0 SGPA</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {requiredUpcomingGPA > 10
                    ? "Target is mathematically out of reach in 1 semester. Try setting a longer 2-semester target."
                    : requiredUpcomingGPA <= 0
                    ? "Your cumulative CGPA already exceeds this target!"
                    : `Scoring ${requiredUpcomingGPA.toFixed(2)} across ${upcomingCreds} credits will raise your CGPA to exactly ${target}.`}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Grade Scale Reference Card */}
          <GlassCard className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Grading Scale Reference
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {GRADE_OPTIONS.map((g) => (
                <div
                  key={g.point}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/40"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {g.label.split(" ")[0]}
                  </span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {g.point}.0 pts
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
