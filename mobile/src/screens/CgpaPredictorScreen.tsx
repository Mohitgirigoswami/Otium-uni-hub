import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";

interface CourseItem {
  id: string;
  name: string;
  credits: number;
  gradePoint: number;
  gradeLabel: string;
}

const GRADE_OPTIONS = [
  { label: "O (10)", point: 10 },
  { label: "A+ (9)", point: 9 },
  { label: "A (8)", point: 8 },
  { label: "B+ (7)", point: 7 },
  { label: "B (6)", point: 6 },
  { label: "C (5)", point: 5 },
  { label: "P (4)", point: 4 },
  { label: "F (0)", point: 0 },
];

const INITIAL_COURSES: CourseItem[] = [
  { id: "1", name: "Distributed Systems", credits: 4, gradePoint: 9, gradeLabel: "A+" },
  { id: "2", name: "Database Engineering", credits: 4, gradePoint: 10, gradeLabel: "O" },
  { id: "3", name: "Computer Networks", credits: 4, gradePoint: 8, gradeLabel: "A" },
  { id: "4", name: "Software Agile Lab", credits: 3, gradePoint: 9, gradeLabel: "A+" },
  { id: "5", name: "Cloud & DevOps Lab", credits: 2, gradePoint: 10, gradeLabel: "O" },
];

export function CgpaPredictorScreen() {
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);

  // Target Planner inputs (1:1 Web CGPA Predictor)
  const [currentCgpa, setCurrentCgpa] = useState<string>("8.20");
  const [completedCredits, setCompletedCredits] = useState<string>("64");
  const [targetCgpa, setTargetCgpa] = useState<string>("8.75");
  const [upcomingCredits, setUpcomingCredits] = useState<string>("24");

  // Live Current Semester SGPA calculation
  const totalActiveCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalWeightedPoints = courses.reduce(
    (sum, c) => sum + (c.credits || 0) * (c.gradePoint || 0),
    0
  );
  const currentSemesterGPA =
    totalActiveCredits > 0
      ? Number((totalWeightedPoints / totalActiveCredits).toFixed(2))
      : 0;

  // Target CGPA Formula: (Target * (Completed + Upcoming) - (Current * Completed)) / Upcoming
  const currCgpaNum = parseFloat(currentCgpa) || 0;
  const compCreditsNum = parseFloat(completedCredits) || 0;
  const targetCgpaNum = parseFloat(targetCgpa) || 0;
  const upCreditsNum = parseFloat(upcomingCredits) || 1;

  const totalFutureCredits = compCreditsNum + upCreditsNum;
  const requiredUpcomingSGPA =
    upCreditsNum > 0
      ? (targetCgpaNum * totalFutureCredits - currCgpaNum * compCreditsNum) / upCreditsNum
      : 0;

  const updateCourseGrade = (id: string, point: number) => {
    const found = GRADE_OPTIONS.find((g) => g.point === point);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              gradePoint: point,
              gradeLabel: found ? found.label.split(" ")[0] : "A",
            }
          : c
      )
    );
  };

  const addCourseRow = () => {
    const newCourse: CourseItem = {
      id: Date.now().toString(),
      name: `Elective ${courses.length + 1}`,
      credits: 3,
      gradePoint: 9,
      gradeLabel: "A+",
    };
    setCourses([...courses, newCourse]);
  };

  const removeCourse = (id: string) => {
    if (courses.length <= 1) return;
    setCourses(courses.filter((c) => c.id !== id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Header Banner (1:1 Web Port) */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          <Badge variant="brand" size="sm">
            CGPA Predictor & Target Engine
          </Badge>
        </View>
        <Text style={styles.heroTitle}>Academic Transcript & CGPA Simulator</Text>
        <Text style={styles.heroSubtitle}>
          Simulate grade trajectories, calculate required upcoming semester marks, and optimize study effort for placement thresholds.
        </Text>
      </View>

      {/* Target CGPA Required Marks Output Card (Task 5 Core Requirement) */}
      <GlassCard style={styles.targetPlannerCard}>
        <View style={styles.plannerHeader}>
          <View style={styles.targetIconBox}>
            <Feather name="target" size={20} color={colors.brand[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.plannerTitle}>Target CGPA Output & Requirement</Text>
            <Text style={styles.plannerSubtitle}>
              Exact finals SGPA required to reach target
            </Text>
          </View>
        </View>

        {/* Large Output Card */}
        <View style={styles.outputGlowBox}>
          <Text style={styles.outputLabel}>Required SGPA in Upcoming Semester</Text>
          <View style={styles.outputNumberRow}>
            <Text
              style={[
                styles.outputNumberText,
                {
                  color:
                    requiredUpcomingSGPA > 10
                      ? colors.rose[400]
                      : requiredUpcomingSGPA <= 0
                      ? colors.emerald[400]
                      : colors.brand[400],
                },
              ]}
            >
              {requiredUpcomingSGPA > 10
                ? "Unreachable (>10.0)"
                : requiredUpcomingSGPA <= 0
                ? "Target Achieved!"
                : requiredUpcomingSGPA.toFixed(2)}
            </Text>
            {requiredUpcomingSGPA > 0 && requiredUpcomingSGPA <= 10 && (
              <Text style={styles.outputMaxText}>/ 10.00 SGPA</Text>
            )}
          </View>

          <Text style={styles.outputAdviceText}>
            {requiredUpcomingSGPA > 10
              ? "⚠️ Target is mathematically out of reach in 1 semester. Try setting a longer 2-semester target."
              : requiredUpcomingSGPA <= 0
              ? "🎉 Your current cumulative CGPA already exceeds this target!"
              : `Scoring ${requiredUpcomingSGPA.toFixed(2)} across ${upCreditsNum} upcoming credits will raise your cumulative CGPA to exactly ${targetCgpa}.`}
          </Text>
        </View>

        {/* Simulator Input Sliders / Fields */}
        <View style={styles.inputsGrid}>
          <View style={styles.inputCol}>
            <Text style={styles.inputFieldLabel}>Current CGPA</Text>
            <TextInput
              value={currentCgpa}
              onChangeText={setCurrentCgpa}
              keyboardType="decimal-pad"
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputFieldLabel}>Completed Credits</Text>
            <TextInput
              value={completedCredits}
              onChangeText={setCompletedCredits}
              keyboardType="number-pad"
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputFieldLabel}>Target Desired CGPA</Text>
            <TextInput
              value={targetCgpa}
              onChangeText={setTargetCgpa}
              keyboardType="decimal-pad"
              style={[styles.fieldInput, styles.targetFieldInput]}
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={styles.inputFieldLabel}>Upcoming Credits</Text>
            <TextInput
              value={upcomingCredits}
              onChangeText={setUpcomingCredits}
              keyboardType="number-pad"
              style={styles.fieldInput}
            />
          </View>
        </View>
      </GlassCard>

      {/* Live Semester Course GPA Calculator */}
      <GlassCard style={styles.calculatorCard}>
        <View style={styles.calcHeaderRow}>
          <View>
            <Text style={styles.calcTitle}>Semester Courses & Grades</Text>
            <Text style={styles.calcSubtitle}>
              {courses.length} Courses • {totalActiveCredits} Total Credits
            </Text>
          </View>
          <View style={styles.sgpaPill}>
            <Text style={styles.sgpaLabel}>Semester SGPA</Text>
            <Text style={styles.sgpaValue}>{currentSemesterGPA}</Text>
          </View>
        </View>

        {/* Course Rows */}
        <View style={styles.coursesList}>
          {courses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCredits}>{course.credits} Credits</Text>
              </View>

              {/* Grade Selector Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.gradeChipsRow}
              >
                {GRADE_OPTIONS.map((g) => {
                  const isSelected = course.gradePoint === g.point;
                  return (
                    <TouchableOpacity
                      key={g.point}
                      onPress={() => updateCourseGrade(course.id, g.point)}
                      style={[
                        styles.gradeChip,
                        isSelected && styles.gradeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gradeChipText,
                          isSelected && styles.gradeChipTextActive,
                        ]}
                      >
                        {g.label.split(" ")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() => removeCourse(course.id)}
                style={styles.trashBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Button
          variant="outline"
          size="sm"
          title="Add Another Course"
          leftIcon={<Ionicons name="add" size={16} color={colors.slate[300]} />}
          onPress={addCourseRow}
          style={{ marginTop: 10 }}
        />
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  heroBadgeRow: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.slate[300],
    marginTop: 6,
    lineHeight: 19,
  },
  targetPlannerCard: {
    padding: 20,
    gap: 16,
  },
  plannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  targetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  plannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  plannerSubtitle: {
    fontSize: 11.5,
    color: colors.slate[400],
    marginTop: 2,
  },
  outputGlowBox: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    gap: 6,
  },
  outputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outputNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  outputNumberText: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  outputMaxText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[400],
  },
  outputAdviceText: {
    fontSize: 12,
    color: colors.slate[300],
    lineHeight: 18,
    marginTop: 4,
  },
  inputsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  inputCol: {
    width: "48%",
    gap: 4,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  targetFieldInput: {
    borderColor: colors.brand[500],
    color: colors.brand[400],
  },
  calculatorCard: {
    padding: 20,
    gap: 14,
  },
  calcHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  calcSubtitle: {
    fontSize: 11.5,
    color: colors.slate[400],
    marginTop: 2,
  },
  sgpaPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    alignItems: "center",
  },
  sgpaLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.brand[400],
    textTransform: "uppercase",
  },
  sgpaValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  coursesList: {
    gap: 10,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  courseInfo: {
    width: "32%",
  },
  courseName: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  courseCredits: {
    fontSize: 10.5,
    color: colors.slate[400],
    marginTop: 1,
  },
  gradeChipsRow: {
    gap: 4,
    alignItems: "center",
  },
  gradeChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.slate[800],
  },
  gradeChipActive: {
    backgroundColor: colors.brand[600],
  },
  gradeChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.slate[300],
  },
  gradeChipTextActive: {
    color: "#FFFFFF",
  },
  trashBtn: {
    padding: 4,
  },
});
