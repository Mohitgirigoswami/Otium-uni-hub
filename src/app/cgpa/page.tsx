"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Award,
} from "lucide-react";
import { CourseGradeItem } from "@/lib/types";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";
import { RadialCgpaGauge } from "@/components/cgpa/RadialCgpaGauge";

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
  { id: "1", name: "Distributed Systems", credits: 4, gradePoint: 9, gradeLabel: "A+" },
  { id: "2", name: "Database Engineering", credits: 4, gradePoint: 10, gradeLabel: "O" },
  { id: "3", name: "Computer Networks", credits: 4, gradePoint: 8, gradeLabel: "A" },
  { id: "4", name: "Software Engineering", credits: 3, gradePoint: 9, gradeLabel: "A+" },
  { id: "5", name: "DevOps Lab", credits: 2, gradePoint: 10, gradeLabel: "O" },
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
        const maxSem = Math.max(...res.data.map((s: any) => s.semester));
        setActiveSemesterNum(maxSem + 1);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [user?.id]);

  // Active Semester Math
  const totalActiveCredits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  const totalActiveWeightedPoints = courses.reduce(
    (sum, c) => sum + (Number(c.credits) || 0) * (Number(c.gradePoint) || 0),
    0
  );
  const currentSemesterGPA =
    totalActiveCredits > 0
      ? Number((totalActiveWeightedPoints / totalActiveCredits).toFixed(2))
      : 0;

  // Cumulative CGPA Math
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

  // Predictor Math
  const targetCgpaNum = parseFloat(targetCgpa) || 0;
  const upcomingCreditsNum = parseFloat(targetUpcomingCredits) || 0;
  const totalFutureCredits = cumulativeTotalCredits + upcomingCreditsNum;
  const requiredTotalWeightedPoints = targetCgpaNum * totalFutureCredits;
  const requiredUpcomingWeightedPoints = requiredTotalWeightedPoints - cumulativeWeightedPoints;
  const requiredFutureSGPA =
    upcomingCreditsNum > 0
      ? Number((requiredUpcomingWeightedPoints / upcomingCreditsNum).toFixed(2))
      : 0;

  const handleAddCourseRow = () => {
    const newCourse: CourseGradeItem = {
      id: Date.now().toString(),
      name: `Course ${courses.length + 1}`,
      credits: 3,
      gradePoint: 8,
      gradeLabel: "A",
    };
    setCourses([...courses, newCourse]);
  };

  const handleRemoveCourseRow = (id: string) => {
    if (courses.length <= 1) {
      toast.error("At least one course is required.");
      return;
    }
    setCourses(courses.filter((c) => c.id !== id));
  };

  const handleCourseChange = (id: string, field: keyof CourseGradeItem, value: any) => {
    setCourses(
      courses.map((c) => {
        if (c.id === id) {
          if (field === "gradeLabel") {
            const opt = GRADE_OPTIONS.find((g) => g.label.startsWith(value));
            return {
              ...c,
              gradeLabel: value,
              gradePoint: opt ? opt.point : c.gradePoint,
            };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const handleSaveSemester = async () => {
    if (!user) {
      toast.error("Please sign in to save transcript records.");
      return;
    }

    if (courses.length === 0) {
      toast.error("No course entries to save.");
      return;
    }

    setIsSaving(true);
    const res = await saveSemesterRecord({
      userId: user.id,
      semester: activeSemesterNum,
      gpa: currentSemesterGPA,
      totalCredits: totalActiveCredits,
      courses: courses,
    });
    setIsSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Semester ${activeSemesterNum} archived.`);
      fetchRecords();
    }
  };

  const handleDeleteRecord = async (id: string, semNum: number) => {
    if (!user) return;
    if (!confirm(`Delete Semester ${semNum} record?`)) return;

    const res = await deleteSemesterRecord(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Semester ${semNum} removed.`);
      fetchRecords();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="CGPA_CALCULATOR">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="space-y-2 border-b border-border pb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            <span>Academic Performance Engine</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            CGPA & SGPA Forecaster
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Calculate active term SGPA with exact credit weights, archive completed semesters, and simulate target GPA requirements for campus placements.
          </p>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cumulative CGPA
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl font-extrabold text-foreground">
                  {cumulativeTotalCredits > 0 ? cumulativeCGPA.toFixed(2) : "N/A"}
                </span>
                <span className="text-xs text-muted-foreground">/ 10.0</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              Across {cumulativeTotalCredits} completed university credits
            </p>
          </Card>

          <RadialCgpaGauge
            gpa={currentSemesterGPA}
            title="Current Term SGPA"
            subtitle={`${totalActiveCredits} credits registered in active worksheet`}
          />

          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Archived Semesters
              </span>
              <div className="font-heading text-3xl font-extrabold text-foreground">
                {savedSemesters.length}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
              Saved in verified academic transcript
            </p>
          </Card>
        </div>

        {/* Two Columns: Active Semester Worksheet + Target Forecaster */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Active Semester Table (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Active Semester Worksheet
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Assign credit weights (1-6) and expected letter grades.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Semester:</span>
                  <select
                    value={activeSemesterNum}
                    onChange={(e) => setActiveSemesterNum(Number(e.target.value))}
                    className="h-8 px-2 rounded-md border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        Sem {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Rows */}
              <div className="space-y-2.5">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border bg-card/60"
                  >
                    <div className="col-span-6 sm:col-span-6">
                      <Input
                        value={course.name}
                        onChange={(e) =>
                          handleCourseChange(course.id, "name", e.target.value)
                        }
                        placeholder="Course title"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-2">
                      <select
                        value={course.credits}
                        onChange={(e) =>
                          handleCourseChange(course.id, "credits", Number(e.target.value))
                        }
                        className="w-full h-9 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {[1, 2, 3, 4, 5, 6].map((cr) => (
                          <option key={cr} value={cr}>
                            {cr} Cr
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3 sm:col-span-3">
                      <select
                        value={course.gradeLabel}
                        onChange={(e) =>
                          handleCourseChange(course.id, "gradeLabel", e.target.value)
                        }
                        className="w-full h-9 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g.point} value={g.label.split(" ")[0]}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveCourseRow(course.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCourseRow}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Course
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSemester}
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Archive Semester {activeSemesterNum} Record
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Target Predictor & Transcript Archive (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Target Predictor */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Target CGPA Predictor
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-foreground">
                      Desired CGPA:
                    </span>
                    <Input
                      type="number"
                      step="0.05"
                      min="1"
                      max="10"
                      value={targetCgpa}
                      onChange={(e) => setTargetCgpa(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-foreground">
                      Upcoming Credits:
                    </span>
                    <Input
                      type="number"
                      min="1"
                      value={targetUpcomingCredits}
                      onChange={(e) => setTargetUpcomingCredits(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-1 text-xs">
                  <span className="font-bold text-foreground">Simulation Result:</span>
                  {cumulativeTotalCredits === 0 ? (
                    <p className="text-muted-foreground">
                      Archive at least one semester to calculate needed SGPA.
                    </p>
                  ) : requiredFutureSGPA > 10 ? (
                    <p className="text-destructive font-semibold">
                      Mathematically unreachable ({requiredFutureSGPA} required). Lower the goal or increase upcoming credits.
                    </p>
                  ) : requiredFutureSGPA <= 0 ? (
                    <p className="text-emerald-500 font-semibold">
                      Target achieved! Maintaining passing grades will secure this CGPA.
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      You must average an SGPA of <strong className="text-primary font-bold">{requiredFutureSGPA}</strong> across the next {targetUpcomingCredits} credits.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Transcript Archive */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Archived Semesters
                </h3>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-secondary/60 animate-pulse" />
                  ))}
                </div>
              ) : savedSemesters.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No previous semesters archived yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedSemesters.map((sem) => (
                    <div
                      key={sem.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground">
                          Semester {sem.semester}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {sem.totalCredits} credits
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="default" size="sm">
                          SGPA: {sem.gpa.toFixed(2)}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(sem.id, sem.semester)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientServiceGuard>
  );
}
