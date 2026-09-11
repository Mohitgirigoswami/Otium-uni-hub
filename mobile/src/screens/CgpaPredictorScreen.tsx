import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";
import { useUser } from "../context/UserContext";

interface CourseItem {
  id: string;
  name: string;
  credits: number;
  gradePoint: number;
  gradeLabel: string;
}

const GRADE_OPTIONS = [
  { label: "O", point: 10 },
  { label: "A+", point: 9 },
  { label: "A", point: 8 },
  { label: "B+", point: 7 },
  { label: "B", point: 6 },
  { label: "C", point: 5 },
  { label: "P", point: 4 },
  { label: "F", point: 0 },
];

const INITIAL_COURSES: CourseItem[] = [
  { id: "1", name: "Engineering Mathematics", credits: 4, gradePoint: 9, gradeLabel: "A+" },
  { id: "2", name: "Data Structures & Algorithms", credits: 4, gradePoint: 10, gradeLabel: "O" },
  { id: "3", name: "Computer Organization", credits: 4, gradePoint: 8, gradeLabel: "A" },
  { id: "4", name: "Object Oriented Programming", credits: 3, gradePoint: 9, gradeLabel: "A+" },
  { id: "5", name: "Data Structures Lab", credits: 2, gradePoint: 10, gradeLabel: "O" },
];

export function CgpaPredictorScreen() {
  const { user } = useUser();
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);
  const [activeSemesterNum, setActiveSemesterNum] = useState<number>(3);
  const [savedSemesters, setSavedSemesters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Entry Mode: Quick SGPA entry vs Detailed Course Builder
  const [entryMode, setEntryMode] = useState<"quick" | "detailed">("quick");
  const [quickSemester, setQuickSemester] = useState<number>(3);
  const [quickSgpa, setQuickSgpa] = useState<string>("8.50");
  const [quickCredits, setQuickCredits] = useState<string>("24");

  // Target Planner inputs
  const [targetCgpa, setTargetCgpa] = useState<string>("8.50");
  const [upcomingCredits, setUpcomingCredits] = useState<string>("20");

  // Fetch saved semesters from backend
  const fetchRecords = async () => {
    try {
      const res = await apiClient.get("/cgpa");
      if (res.success && Array.isArray(res.data)) {
        setSavedSemesters(res.data);
        if (res.data.length > 0) {
          const maxSem = Math.max(...res.data.map((s: any) => s.semester));
          if (maxSem < 8) {
            setActiveSemesterNum(maxSem + 1);
            setQuickSemester(maxSem + 1);
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch CGPA records:", e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecords();
    setIsRefreshing(false);
  };

  // Live Current Semester SGPA calculation
  const totalActiveCredits = courses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  const totalWeightedPoints = courses.reduce(
    (sum, c) => sum + (Number(c.credits) || 0) * (Number(c.gradePoint) || 0),
    0
  );
  const currentSemesterGPA =
    totalActiveCredits > 0
      ? Number((totalWeightedPoints / totalActiveCredits).toFixed(2))
      : 0;

  // Cumulative CGPA calculation across all saved semesters
  let cumulativeWeightedPoints = 0;
  let cumulativeTotalCredits = 0;
  savedSemesters.forEach((sem) => {
    cumulativeWeightedPoints += (sem.gpa || 0) * (sem.totalCredits || 0);
    cumulativeTotalCredits += sem.totalCredits || 0;
  });

  const cumulativeCGPA =
    cumulativeTotalCredits > 0
      ? Number((cumulativeWeightedPoints / cumulativeTotalCredits).toFixed(2))
      : 0;

  // Target CGPA calculation
  const targetCgpaNum = parseFloat(targetCgpa) || 0;
  const upCreditsNum = parseFloat(upcomingCredits) || 1;
  const futureCombinedCredits = cumulativeTotalCredits + upCreditsNum;
  const requiredWeightedTotal = targetCgpaNum * futureCombinedCredits;
  const requiredUpcomingSGPA =
    upCreditsNum > 0
      ? Number(((requiredWeightedTotal - cumulativeWeightedPoints) / upCreditsNum).toFixed(2))
      : 0;

  // Course management
  const updateCourseName = (id: string, name: string) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const updateCourseCredits = (id: string, creditsText: string) => {
    const creds = parseInt(creditsText.replace(/[^0-9]/g, ""), 10) || 0;
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, credits: creds } : c)));
  };

  const updateCourseGrade = (id: string, point: number) => {
    const found = GRADE_OPTIONS.find((g) => g.point === point);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              gradePoint: point,
              gradeLabel: found ? found.label : "A",
            }
          : c
      )
    );
  };

  const addCourseRow = () => {
    const newCourse: CourseItem = {
      id: Date.now().toString(),
      name: `Course ${courses.length + 1}`,
      credits: 3,
      gradePoint: 8,
      gradeLabel: "A",
    };
    setCourses([...courses, newCourse]);
  };

  const removeCourse = (id: string) => {
    if (courses.length <= 1) {
      Alert.alert("Notice", "At least one course is required.");
      return;
    }
    setCourses(courses.filter((c) => c.id !== id));
  };

  // Save semester record to backend
  const handleSaveSemester = async () => {
    if (totalActiveCredits === 0) {
      Alert.alert("Error", "Please add at least one course with valid credits.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.post("/cgpa", {
        semester: activeSemesterNum,
        courses,
        gpa: currentSemesterGPA,
        totalCredits: totalActiveCredits,
      });

      if (res.success) {
        Alert.alert("Semester Saved! 🎓", `Semester ${activeSemesterNum} added to your transcript records.`);
        fetchRecords();
      } else {
        Alert.alert("Save Failed", res.error || "Could not save semester.");
      }
    } catch (e: any) {
      Alert.alert("Network Error", e?.message || "Could not connect to Otium services. Please check your internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save quick semester record (no courses required)
  const handleSaveQuickSemester = async () => {
    const parsedGpa = parseFloat(quickSgpa);
    const parsedCredits = parseInt(quickCredits.replace(/[^0-9]/g, ""), 10);

    if (isNaN(parsedGpa) || parsedGpa < 0 || parsedGpa > 10) {
      Alert.alert("Invalid SGPA", "Please enter an SGPA between 0.00 and 10.00.");
      return;
    }
    if (isNaN(parsedCredits) || parsedCredits <= 0 || parsedCredits > 45) {
      Alert.alert("Invalid Credits", "Please enter valid total credits for the semester (e.g. 18 to 30).");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.post("/cgpa", {
        semester: quickSemester,
        courses: [],
        gpa: parsedGpa,
        totalCredits: parsedCredits,
      });

      if (res.success) {
        Alert.alert(
          "Quick Semester Saved! 🎓",
          `Semester ${quickSemester} (SGPA: ${parsedGpa.toFixed(2)}, Credits: ${parsedCredits}) saved to your cumulative transcript.`
        );
        fetchRecords();
        if (quickSemester < 8) {
          setQuickSemester(quickSemester + 1);
        }
      } else {
        Alert.alert("Save Failed", res.error || "Could not save semester record.");
      }
    } catch (e: any) {
      Alert.alert("Network Error", e?.message || "Could not connect to Otium services. Please check your internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved semester
  const handleDeleteSemester = (recordId: string, semNum: number) => {
    Alert.alert(
      "Delete Semester",
      `Are you sure you want to delete Semester ${semNum} from your transcript?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/cgpa?recordId=${recordId}`);
              if (res.success) {
                fetchRecords();
              }
            } catch (e) {
              console.warn("Delete semester error:", e);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand[400]}
        />
      }
    >
      {/* Hero Header Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          <Badge variant="brand" size="sm">
            Credit-Weighted Academic Performance Engine
          </Badge>
        </View>
        <Text style={styles.heroTitle}>CGPA & Semester Calculator</Text>
        <Text style={styles.heroSubtitle}>
          Calculate semester SGPA with exact credit weight multipliers, record transcripts to database, and simulate target grades.
        </Text>

        {/* Cumulative CGPA Highlight Card */}
        <View style={styles.cumulativeGlowCard}>
          <View>
            <Text style={styles.cumLabel}>Cumulative CGPA</Text>
            <Text style={styles.cumScore}>
              {cumulativeCGPA > 0 ? cumulativeCGPA.toFixed(2) : "—"}
              <Text style={styles.cumMax}> / 10.0</Text>
            </Text>
            <Text style={styles.cumCredits}>
              Across {cumulativeTotalCredits} credits in {savedSemesters.length} recorded semesters
            </Text>
          </View>
          <View style={styles.cumIconBox}>
            <MaterialCommunityIcons name="trophy-award" size={28} color={colors.brand[400]} />
          </View>
        </View>

        {/* Mode Switcher: Quick SGPA Entry vs Detailed Course Calculator */}
        <View style={styles.segmentedModeContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, entryMode === "quick" && styles.segmentBtnActive]}
            onPress={() => setEntryMode("quick")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash"
              size={15}
              color={entryMode === "quick" ? colors.brand[400] : colors.slate[400]}
            />
            <Text style={[styles.segmentBtnText, entryMode === "quick" && styles.segmentBtnTextActive]}>
              ⚡ Quick SGPA Entry
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, entryMode === "detailed" && styles.segmentBtnActive]}
            onPress={() => setEntryMode("detailed")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list"
              size={15}
              color={entryMode === "detailed" ? colors.brand[400] : colors.slate[400]}
            />
            <Text style={[styles.segmentBtnText, entryMode === "detailed" && styles.segmentBtnTextActive]}>
              📝 Course Calculator
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode 1: Quick SGPA & Credits Input */}
      {entryMode === "quick" ? (
        <GlassCard style={styles.calculatorCard}>
          <View style={styles.calcHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.calcTitle}>Quick Semester Entry</Text>
              <Text style={styles.calcSubtitle}>
                No need to type courses! Enter your SGPA and Total Credits directly.
              </Text>
            </View>
            <View style={styles.sgpaPill}>
              <Text style={styles.sgpaLabel}>Semester SGPA</Text>
              <Text style={styles.sgpaValue}>
                {parseFloat(quickSgpa) ? parseFloat(quickSgpa).toFixed(2) : "0.00"}
              </Text>
            </View>
          </View>

          {/* Quick Semester Selector */}
          <View style={styles.semBarContainer}>
            <Text style={styles.semBarLabel}>Select Semester to Record:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semScroll}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <TouchableOpacity
                  key={sem}
                  onPress={() => setQuickSemester(sem)}
                  style={[
                    styles.semPill,
                    quickSemester === sem && styles.semPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.semPillText,
                      quickSemester === sem && styles.semPillTextActive,
                    ]}
                  >
                    Sem {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quick Input Fields */}
          <View style={styles.quickInputsGrid}>
            <View style={styles.quickInputCard}>
              <Text style={styles.quickInputLabel}>Semester SGPA (e.g. 8.50) *</Text>
              <TextInput
                value={quickSgpa}
                onChangeText={setQuickSgpa}
                placeholder="8.50"
                placeholderTextColor={colors.slate[500]}
                keyboardType="decimal-pad"
                maxLength={5}
                style={styles.quickTextInput}
              />
              <Text style={styles.quickInputHint}>Range: 0.00 to 10.00</Text>
            </View>

            <View style={styles.quickInputCard}>
              <Text style={styles.quickInputLabel}>Total Semester Credits *</Text>
              <TextInput
                value={quickCredits}
                onChangeText={(text) => setQuickCredits(text.replace(/\D/g, ""))}
                placeholder="24"
                placeholderTextColor={colors.slate[500]}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.quickTextInput}
              />
              <Text style={styles.quickInputHint}>Usually between 18 and 28 credits</Text>
            </View>
          </View>

          {/* Projected Cumulative CGPA Preview */}
          {(() => {
            const numSgpa = parseFloat(quickSgpa) || 0;
            const numCreds = parseInt(quickCredits, 10) || 0;
            const newTotalCredits = cumulativeTotalCredits + numCreds;
            const newCumulativeCGPA =
              newTotalCredits > 0
                ? ((cumulativeWeightedPoints + numSgpa * numCreds) / newTotalCredits).toFixed(2)
                : "—";
            return (
              <View style={styles.quickPreviewCard}>
                <Ionicons name="trending-up" size={18} color={colors.brand[400]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickPreviewHeading}>Cumulative Impact Preview</Text>
                  <Text style={styles.quickPreviewText}>
                    Recording Sem {quickSemester} will update your total transcript to{" "}
                    <Text style={{ color: colors.brand[400], fontWeight: "900" }}>
                      {newCumulativeCGPA} CGPA
                    </Text>{" "}
                    ({newTotalCredits} cumulative credits).
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Save Quick Semester Button */}
          <Button
            variant="brand"
            size="lg"
            title={isSaving ? "Saving to Transcript..." : `Save Sem ${quickSemester} to Transcript (SGPA ${quickSgpa || "—"})`}
            loading={isSaving}
            onPress={handleSaveQuickSemester}
            leftIcon={<Ionicons name="checkmark-circle-outline" size={18} color="#0B132B" />}
            style={{ width: "100%", marginTop: 14 }}
          />
        </GlassCard>
      ) : (
        /* Mode 2: Detailed Course Calculator */
        <GlassCard style={styles.calculatorCard}>
          <View style={styles.calcHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.calcTitle}>Course-by-Course Calculator</Text>
              <Text style={styles.calcSubtitle}>
                Edit course names, credits, and letter grades below
              </Text>
            </View>

          {/* Semester Selector Pills */}
          <View style={styles.sgpaPill}>
            <Text style={styles.sgpaLabel}>Semester SGPA</Text>
            <Text style={styles.sgpaValue}>{currentSemesterGPA.toFixed(2)}</Text>
          </View>
        </View>

        {/* Semester Selection Bar */}
        <View style={styles.semBarContainer}>
          <Text style={styles.semBarLabel}>Select Semester:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semScroll}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <TouchableOpacity
                key={sem}
                onPress={() => setActiveSemesterNum(sem)}
                style={[
                  styles.semPill,
                  activeSemesterNum === sem && styles.semPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.semPillText,
                    activeSemesterNum === sem && styles.semPillTextActive,
                  ]}
                >
                  Sem {sem}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Courses List - Fully Editable */}
        <View style={styles.coursesList}>
          {courses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              <View style={styles.courseInputsRow}>
                {/* Course Name Input */}
                <TextInput
                  value={course.name}
                  onChangeText={(text) => updateCourseName(course.id, text)}
                  placeholder="Course Name"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.courseNameInput}
                />

                {/* Credits Input */}
                <View style={styles.creditInputGroup}>
                  <TextInput
                    value={course.credits ? String(course.credits) : ""}
                    onChangeText={(text) => updateCourseCredits(course.id, text)}
                    placeholder="3"
                    placeholderTextColor={colors.slate[500]}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.creditInput}
                  />
                  <Text style={styles.creditLabel}>Credits</Text>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => removeCourse(course.id)}
                  style={styles.trashBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.rose[400]} />
                </TouchableOpacity>
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
                        {g.label} ({g.point})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Buttons: Add Course & Save to Transcript */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            onPress={addCourseRow}
            style={styles.addCourseBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.brand[400]} />
            <Text style={styles.addCourseBtnText}>Add Course</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveSemester}
            disabled={isSaving}
            style={[styles.saveSemBtn, isSaving && { opacity: 0.7 }]}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#0B132B" />
            ) : (
              <>
                <Feather name="check" size={15} color="#0B132B" />
                <Text style={styles.saveSemBtnText}>Save Sem {activeSemesterNum}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </GlassCard>
      )}

      {/* Target CGPA Output & Requirement Card */}
      <GlassCard style={styles.targetPlannerCard}>
        <View style={styles.plannerHeader}>
          <View style={styles.targetIconBox}>
            <Feather name="target" size={18} color={colors.brand[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.plannerTitle}>Target CGPA Simulator</Text>
            <Text style={styles.plannerSubtitle}>
              Calculate required upcoming SGPA to reach target
            </Text>
          </View>
        </View>

        {/* Output Number Glow Card */}
        <View style={styles.outputGlowBox}>
          <Text style={styles.outputLabel}>Required Upcoming SGPA</Text>
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
              ? "⚠️ Target cannot be reached in 1 upcoming semester. Aim for a multi-semester progression."
              : requiredUpcomingSGPA <= 0
              ? "🎉 Your current cumulative CGPA already meets this target!"
              : `Scoring ${requiredUpcomingSGPA.toFixed(2)} across ${upCreditsNum} upcoming credits will raise your cumulative CGPA to ${targetCgpa}.`}
          </Text>
        </View>

        {/* Simulator Inputs */}
        <View style={styles.inputsGrid}>
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

      {/* Saved Semester Records Transcripts */}
      {savedSemesters.length > 0 && (
        <GlassCard style={styles.savedCard}>
          <View style={styles.savedHeader}>
            <Ionicons name="documents-outline" size={18} color={colors.brand[400]} />
            <Text style={styles.savedTitle}>Saved Academic Transcripts</Text>
          </View>

          {savedSemesters.map((sem) => (
            <View key={sem.id} style={styles.savedItem}>
              <View style={styles.savedItemLeft}>
                <View style={styles.semNumberBadge}>
                  <Text style={styles.semNumberText}>S{sem.semester}</Text>
                </View>
                <View>
                  <Text style={styles.savedSemTitle}>Semester {sem.semester}</Text>
                  <Text style={styles.savedSemCredits}>
                    {sem.totalCredits} Credits • {sem.courses?.length || 0} Courses
                  </Text>
                </View>
              </View>

              <View style={styles.savedItemRight}>
                <View style={styles.savedGpaBadge}>
                  <Text style={styles.savedGpaValue}>{Number(sem.gpa).toFixed(2)}</Text>
                  <Text style={styles.savedGpaLabel}>SGPA</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteSemester(sem.id, sem.semester)}
                  style={styles.deleteSemBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.rose[400]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </GlassCard>
      )}
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
    gap: 12,
  },
  heroBadgeRow: {
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: colors.slate[300],
    lineHeight: 18,
  },
  cumulativeGlowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    marginTop: 4,
  },
  cumLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand[400],
    textTransform: "uppercase",
  },
  cumScore: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  cumMax: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[400],
  },
  cumCredits: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  cumIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(20, 184, 166, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  calculatorCard: {
    padding: 20,
    gap: 16,
  },
  calcHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text.primary,
  },
  calcSubtitle: {
    fontSize: 11.5,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sgpaPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    alignItems: "center",
  },
  sgpaLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.brand[600],
    textTransform: "uppercase",
  },
  sgpaValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.text.primary,
  },
  semBarContainer: {
    gap: 8,
  },
  semBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  semScroll: {
    flexDirection: "row",
  },
  semPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  semPillActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[400],
  },
  semPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.secondary,
  },
  semPillTextActive: {
    color: "#FFFFFF",
  },
  coursesList: {
    gap: 12,
  },
  courseRow: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  courseInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  courseNameInput: {
    flex: 1,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text.primary,
  },
  creditInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  creditInput: {
    width: 24,
    fontSize: 13,
    fontWeight: "800",
    color: colors.brand[400],
    textAlign: "center",
  },
  creditLabel: {
    fontSize: 10.5,
    color: colors.slate[400],
    fontWeight: "600",
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeChipsRow: {
    gap: 6,
    alignItems: "center",
  },
  gradeChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  gradeChipActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[400],
  },
  gradeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[300],
  },
  gradeChipTextActive: {
    color: "#FFFFFF",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  addCourseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  addCourseBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand[400],
  },
  saveSemBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand[400],
  },
  saveSemBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0B132B",
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    gap: 4,
  },
  outputLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.brand[400],
    textTransform: "uppercase",
  },
  outputNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  outputNumberText: {
    fontSize: 28,
    fontWeight: "900",
  },
  outputMaxText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[400],
  },
  outputAdviceText: {
    fontSize: 11.5,
    color: colors.slate[300],
    lineHeight: 16,
    marginTop: 4,
  },
  inputsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  inputCol: {
    flex: 1,
    gap: 4,
  },
  inputFieldLabel: {
    fontSize: 10.5,
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
  savedCard: {
    padding: 20,
    gap: 12,
  },
  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  savedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  savedItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  semNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.slate[800],
    alignItems: "center",
    justifyContent: "center",
  },
  semNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand[400],
  },
  savedSemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  savedSemCredits: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  savedItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  savedGpaBadge: {
    alignItems: "center",
  },
  savedGpaValue: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.brand[400],
  },
  savedGpaLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.slate[400],
  },
  deleteSemBtn: {
    padding: 6,
  },
  segmentedModeContainer: {
    flexDirection: "row",
    backgroundColor: colors.slate[900],
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: "rgba(20, 184, 166, 0.2)",
    borderWidth: 1,
    borderColor: colors.brand[400],
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.slate[400],
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  quickInputsGrid: {
    gap: 12,
    marginTop: 12,
  },
  quickInputCard: {
    backgroundColor: colors.slate[900],
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[300],
    textTransform: "uppercase",
    marginBottom: 6,
  },
  quickTextInput: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.brand[400],
    paddingVertical: 4,
    fontFamily: "monospace",
  },
  quickInputHint: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  quickPreviewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.2)",
    marginTop: 12,
  },
  quickPreviewHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand[300],
    marginBottom: 2,
  },
  quickPreviewText: {
    fontSize: 11.5,
    color: colors.slate[300],
    lineHeight: 16,
  },
});
