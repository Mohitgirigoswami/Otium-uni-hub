import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { RadialCgpaGauge } from "../components/cgpa/RadialCgpaGauge";
import { apiClient } from "../services/apiClient";
import { useUser } from "../context/UserContext";

const STORAGE_KEY_CGPA_SEMESTERS = "@otium_cgpa_semesters";

export interface CourseItem {
  id: string;
  name: string;
  credits: number;
  gradePoint: number;
  gradeLabel: string;
}

export interface SavedSemesterRecord {
  id: string;
  semester: number;
  gpa: number;
  totalCredits: number;
  courses: CourseItem[];
  createdAt?: string;
  updatedAt?: string;
}

const GRADE_OPTIONS = [
  { label: "O", point: 10, desc: "Outstanding" },
  { label: "A+", point: 9, desc: "Excellent" },
  { label: "A", point: 8, desc: "Very Good" },
  { label: "B+", point: 7, desc: "Good" },
  { label: "B", point: 6, desc: "Above Average" },
  { label: "C", point: 5, desc: "Average" },
  { label: "P", point: 4, desc: "Pass" },
  { label: "F", point: 0, desc: "Fail" },
];

const ALL_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function CgpaPredictorScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  // Active view tab: "WORKSHEET" or "TRANSCRIPT"
  const [activeTab, setActiveTab] = useState<"WORKSHEET" | "TRANSCRIPT">("WORKSHEET");

  // Active semester number (1 - 8)
  const [activeSemesterNum, setActiveSemesterNum] = useState<number>(1);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [savedSemesters, setSavedSemesters] = useState<SavedSemesterRecord[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Target Planner inputs
  const [targetCgpa, setTargetCgpa] = useState<string>("8.50");
  const [upcomingCredits, setUpcomingCredits] = useState<string>("20");

  /**
   * Parse courses helper (in case backend returns JSON string)
   */
  const parseCourses = (rawCourses: any): CourseItem[] => {
    if (Array.isArray(rawCourses)) {
      return rawCourses.map((c, index) => ({
        id: c.id || `${Date.now()}_${index}`,
        name: c.name || `Course ${index + 1}`,
        credits: Number(c.credits) || 3,
        gradePoint: Number(c.gradePoint) || 8,
        gradeLabel: c.gradeLabel || "A",
      }));
    }
    if (typeof rawCourses === "string") {
      try {
        const parsed = JSON.parse(rawCourses);
        return parseCourses(parsed);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  /**
   * Load records from offline cache and remote backend
   */
  const fetchRecords = async (targetSemToSelect?: number) => {
    let currentSaved: SavedSemesterRecord[] = [];

    // 1. Load cached transcript from AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_CGPA_SEMESTERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          currentSaved = parsed.map((s: any) => ({
            ...s,
            courses: parseCourses(s.courses),
          }));
          setSavedSemesters(currentSaved);
        }
      }
    } catch (e) {
      console.log("Cached transcript load notice:", e);
    }

    // 2. Fetch fresh from backend
    try {
      const res = await apiClient.get("/cgpa");
      if (res.success && Array.isArray(res.data)) {
        const mapped: SavedSemesterRecord[] = res.data.map((s: any) => ({
          ...s,
          courses: parseCourses(s.courses),
        }));
        currentSaved = mapped;
        setSavedSemesters(mapped);
        AsyncStorage.setItem(STORAGE_KEY_CGPA_SEMESTERS, JSON.stringify(mapped)).catch(() => {});
      }
    } catch (e) {
      console.log("Offline transcript mode: using cached records");
    }

    // Determine semester to display: prioritize explicit target, then cached user selection, then 1
    let semToPick = targetSemToSelect ?? activeSemesterNum;
    try {
      const cachedChoice = await AsyncStorage.getItem("@otium_cgpa_selected_sem");
      if (cachedChoice && !targetSemToSelect) {
        const parsed = parseInt(cachedChoice, 10);
        if (parsed >= 1 && parsed <= 8) {
          semToPick = parsed;
        }
      }
    } catch {}

    setActiveSemesterNum(semToPick);
    const existing = currentSaved.find((s) => s.semester === semToPick);
    if (existing) {
      setCourses(existing.courses);
    } else {
      setCourses([]);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecords(activeSemesterNum);
    setIsRefreshing(false);
  };

  /**
   * Switch active semester
   */
  const handleSelectSemester = (semNum: number) => {
    setActiveSemesterNum(semNum);
    AsyncStorage.setItem("@otium_cgpa_selected_sem", String(semNum)).catch(() => {});
    const existing = savedSemesters.find((s) => s.semester === semNum);
    if (existing) {
      setCourses(existing.courses);
    } else {
      setCourses([]);
    }
  };

  // --- Math Calculations ---

  // Active Term Credits & SGPA
  const totalActiveCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalActivePoints = courses.reduce(
    (sum, c) => sum + (c.credits || 0) * (c.gradePoint || 0),
    0
  );
  const currentSemesterGPA =
    totalActiveCredits > 0 ? Number((totalActivePoints / totalActiveCredits).toFixed(2)) : 0;

  // Cumulative CGPA calculations across all semesters without double-counting:
  // Exclude activeSemesterNum from archived pool if the user is currently editing it
  const otherArchivedSemesters = savedSemesters.filter((s) => s.semester !== activeSemesterNum);
  const otherArchivedCredits = otherArchivedSemesters.reduce(
    (sum, s) => sum + (s.totalCredits || 0),
    0
  );
  const otherArchivedPoints = otherArchivedSemesters.reduce(
    (sum, s) => sum + (s.totalCredits || 0) * (s.gpa || 0),
    0
  );

  const cumulativeTotalCredits = otherArchivedCredits + totalActiveCredits;
  const cumulativeTotalPoints = otherArchivedPoints + totalActivePoints;
  const cumulativeCGPA =
    cumulativeTotalCredits > 0
      ? Number((cumulativeTotalPoints / cumulativeTotalCredits).toFixed(2))
      : currentSemesterGPA;

  // Target GPA calculations
  const parsedTarget = parseFloat(targetCgpa) || 8.5;
  const parsedUpcomingCredits = parseInt(upcomingCredits, 10) || 20;
  const requiredPoints =
    parsedTarget * (cumulativeTotalCredits + parsedUpcomingCredits) - cumulativeTotalPoints;
  const requiredGPA =
    parsedUpcomingCredits > 0 ? Number((requiredPoints / parsedUpcomingCredits).toFixed(2)) : 0;
  const isTargetAchievable = requiredGPA <= 10.0;

  // Active Semester Status
  const isCurrentSemArchived = savedSemesters.some((s) => s.semester === activeSemesterNum);
  const archivedCurrentSem = savedSemesters.find((s) => s.semester === activeSemesterNum);

  // --- Course Row Mutations ---

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
        c.id === id ? { ...c, gradePoint: point, gradeLabel: found ? found.label : "A" } : c
      )
    );
  };

  const addCourseRow = () => {
    const newCourse: CourseItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: "",
      credits: 3,
      gradePoint: 8,
      gradeLabel: "A",
    };
    setCourses((prev) => [...prev, newCourse]);
  };

  const removeCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  // --- Save / Delete Actions ---

  const handleSaveSemester = async () => {
    if (courses.length === 0) {
      Alert.alert("Empty Worksheet", "Please add at least one course with credit weighting.");
      return;
    }

    if (totalActiveCredits === 0) {
      Alert.alert("Invalid Credits", "Total registered credits cannot be zero.");
      return;
    }

    setIsSaving(true);
    const newSemesterRecord: SavedSemesterRecord = {
      id: archivedCurrentSem?.id || `temp_${Date.now()}`,
      semester: activeSemesterNum,
      courses,
      gpa: currentSemesterGPA,
      totalCredits: totalActiveCredits,
    };

    // 1. Immediately update local state & offline cache
    const updatedSemesters = [
      ...savedSemesters.filter((s) => s.semester !== activeSemesterNum),
      newSemesterRecord,
    ].sort((a, b) => a.semester - b.semester);

    setSavedSemesters(updatedSemesters);
    await AsyncStorage.setItem(STORAGE_KEY_CGPA_SEMESTERS, JSON.stringify(updatedSemesters));

    // 2. Dispatch to backend
    try {
      const res = await apiClient.post("/cgpa", {
        semester: activeSemesterNum,
        courses,
        gpa: currentSemesterGPA,
        totalCredits: totalActiveCredits,
      });

      if (res.success && res.data) {
        Alert.alert(
          "Semester Archived! 🎓",
          `Semester ${activeSemesterNum} recorded with SGPA of ${currentSemesterGPA.toFixed(2)}.`
        );
        fetchRecords(activeSemesterNum);
      } else {
        Alert.alert("Saved to Device ☁️", "Recorded in local transcript (offline mode).");
      }
    } catch (e) {
      Alert.alert("Saved Locally ☁️", "Offline mode active. Semester saved on device.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSemester = (record: SavedSemesterRecord) => {
    Alert.alert(
      "Delete Semester Record",
      `Are you sure you want to remove Semester ${record.semester} from your transcript?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(record.id);
            // 1. Optimistic removal
            const updated = savedSemesters.filter((s) => s.id !== record.id);
            setSavedSemesters(updated);
            await AsyncStorage.setItem(STORAGE_KEY_CGPA_SEMESTERS, JSON.stringify(updated));

            if (activeSemesterNum === record.semester) {
              setCourses([]);
            }

            // 2. Server removal
            try {
              await apiClient.delete(`/cgpa?recordId=${record.id}`);
            } catch (e) {
              console.log("Delete sync deferred:", e);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Radial CGPA Gauge Top Banner */}
      <RadialCgpaGauge
        gpa={activeTab === "WORKSHEET" ? currentSemesterGPA : cumulativeCGPA}
        title={
          activeTab === "WORKSHEET"
            ? `Semester ${activeSemesterNum} SGPA`
            : "Cumulative Degree CGPA"
        }
        subtitle={
          activeTab === "WORKSHEET"
            ? `${totalActiveCredits} credits in term worksheet`
            : `Across ${cumulativeTotalCredits} completed university credits`
        }
      />

      {/* 2. Cumulative Academic Summary Metrics */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Cumulative CGPA
          </Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>
            {cumulativeTotalCredits > 0 ? cumulativeCGPA.toFixed(2) : "0.00"}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {cumulativeTotalCredits} total credits
          </Text>
        </Card>

        <Card style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Archived Semesters
          </Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>
            {savedSemesters.length} / 8
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            Official transcript
          </Text>
        </Card>
      </View>

      {/* 3. Primary Segmented View Switcher: Worksheet vs Transcript */}
      <View style={[styles.tabSegmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("WORKSHEET")}
          activeOpacity={0.8}
          style={[
            styles.tabSegmentBtn,
            activeTab === "WORKSHEET" && {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="calculator-outline"
            size={14}
            color={activeTab === "WORKSHEET" ? colors.primaryForeground : colors.textMuted}
          />
          <Text
            style={[
              styles.tabSegmentText,
              {
                color: activeTab === "WORKSHEET" ? colors.primaryForeground : colors.textMuted,
                fontWeight: activeTab === "WORKSHEET" ? "800" : "600",
              },
            ]}
          >
            Term Worksheet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("TRANSCRIPT")}
          activeOpacity={0.8}
          style={[
            styles.tabSegmentBtn,
            activeTab === "TRANSCRIPT" && {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="ribbon-outline"
            size={14}
            color={activeTab === "TRANSCRIPT" ? colors.primaryForeground : colors.textMuted}
          />
          <Text
            style={[
              styles.tabSegmentText,
              {
                color: activeTab === "TRANSCRIPT" ? colors.primaryForeground : colors.textMuted,
                fontWeight: activeTab === "TRANSCRIPT" ? "800" : "600",
              },
            ]}
          >
            Transcript Archive ({savedSemesters.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* VIEW A: TERM WORKSHEET                                    */}
      {/* ========================================================= */}
      {activeTab === "WORKSHEET" ? (
        <>
          {/* Horizontal Semester Selector Bar (Sem 1 to Sem 8) */}
          <View style={styles.semesterBarSection}>
            <View style={styles.semesterBarHeader}>
              <Text style={[styles.semesterBarTitle, { color: colors.text }]}>
                Select Semester
              </Text>
              <Text style={[styles.semesterBarSubtitle, { color: colors.textMuted }]}>
                Switch term to calculate or update
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.semesterChipsScroll}
            >
              {ALL_SEMESTERS.map((semNum) => {
                const isSelected = semNum === activeSemesterNum;
                const isSaved = savedSemesters.some((s) => s.semester === semNum);

                return (
                  <TouchableOpacity
                    key={semNum}
                    onPress={() => handleSelectSemester(semNum)}
                    activeOpacity={0.7}
                    style={[
                      styles.semesterChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : isSaved
                          ? colors.primary + "14"
                          : colors.card,
                        borderColor: isSelected
                          ? colors.primary
                          : isSaved
                          ? colors.primary + "30"
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.semesterChipText,
                        {
                          color: isSelected
                            ? colors.primaryForeground
                            : isSaved
                            ? colors.primary
                            : colors.textSecondary,
                          fontWeight: isSelected ? "800" : "600",
                        },
                      ]}
                    >
                      Sem {semNum}
                    </Text>
                    {isSaved && (
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={isSelected ? colors.primaryForeground : colors.primary}
                        style={{ marginLeft: 3 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Saved Status Banner if this semester was previously archived */}
          {isCurrentSemArchived && (
            <View
              style={[
                styles.savedBanner,
                { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" },
              ]}
            >
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.savedBannerText, { color: colors.text }]}>
                  Semester {activeSemesterNum} is archived in your transcript (SGPA:{" "}
                  {archivedCurrentSem?.gpa.toFixed(2)} • {archivedCurrentSem?.totalCredits} cr).
                </Text>
                <Text style={[styles.savedBannerSub, { color: colors.textMuted }]}>
                  Saving will update your verified degree transcript.
                </Text>
              </View>
            </View>
          )}

          {/* Worksheet Header */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Semester {activeSemesterNum} Course Worksheet
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Set credit weights (1-6) and letter grades
              </Text>
            </View>

            <Button
              title="Add Course"
              size="sm"
              onPress={addCourseRow}
              leftIcon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
            />
          </View>

          {/* Empty State when no courses in current semester worksheet */}
          {courses.length === 0 ? (
            <Card style={styles.emptyWorksheetCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="school-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyWorksheetTitle, { color: colors.text }]}>
                No Courses in Semester {activeSemesterNum} Worksheet
              </Text>
              <Text style={[styles.emptyWorksheetSubtitle, { color: colors.textMuted }]}>
                Add your enrolled subjects with their credit points and expected grades to calculate your term SGPA.
              </Text>
              <Button
                title="Add First Course"
                size="md"
                onPress={addCourseRow}
                leftIcon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
                style={{ marginTop: 6 }}
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {courses.map((c, index) => (
                <Card key={c.id} style={styles.courseCard}>
                  <View style={styles.courseTopRow}>
                    <Input
                      value={c.name}
                      onChangeText={(val) => updateCourseName(c.id, val)}
                      placeholder={`Course ${index + 1} title`}
                      containerStyle={{ flex: 1, marginRight: 8 }}
                      inputStyle={{ fontSize: 13, height: 38 }}
                    />

                    <Input
                      value={c.credits > 0 ? c.credits.toString() : ""}
                      onChangeText={(val) => updateCourseCredits(c.id, val)}
                      placeholder="Credits"
                      keyboardType="number-pad"
                      containerStyle={{ width: 68, marginRight: 6 }}
                      inputStyle={{ fontSize: 13, height: 38, textAlign: "center" }}
                    />

                    <TouchableOpacity
                      onPress={() => removeCourse(c.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.trashBtn}
                    >
                      <Feather name="trash-2" size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>

                  {/* Grade Option Chips */}
                  <View style={styles.gradesRow}>
                    {GRADE_OPTIONS.map((g) => {
                      const isSelected = c.gradePoint === g.point;
                      return (
                        <TouchableOpacity
                          key={g.label}
                          onPress={() => updateCourseGrade(c.id, g.point)}
                          activeOpacity={0.7}
                          style={[
                            styles.gradeChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.secondary,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeText,
                              {
                                color: isSelected ? colors.primaryForeground : colors.textMuted,
                                fontWeight: isSelected ? "700" : "500",
                              },
                            ]}
                          >
                            {g.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Card>
              ))}

              {/* Save Semester Action */}
              <Button
                title={
                  isCurrentSemArchived
                    ? `Update Semester ${activeSemesterNum} in Transcript`
                    : `Save Semester ${activeSemesterNum} to Transcript`
                }
                size="lg"
                isLoading={isSaving}
                onPress={handleSaveSemester}
                leftIcon={<Feather name="save" size={16} color={colors.primaryForeground} />}
                style={{ marginTop: 4 }}
              />
            </View>
          )}

          {/* 4. Target GPA Forecaster */}
          <Card style={styles.forecasterCard}>
            <View style={styles.forecasterHeader}>
              <Ionicons name="analytics-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Target CGPA Simulator
              </Text>
            </View>

            <View style={styles.forecasterInputs}>
              <Input
                label="Target CGPA (e.g. 8.50)"
                value={targetCgpa}
                onChangeText={setTargetCgpa}
                keyboardType="decimal-pad"
                containerStyle={{ flex: 1, marginRight: 10 }}
              />

              <Input
                label="Upcoming Credits (e.g. 20)"
                value={upcomingCredits}
                onChangeText={setUpcomingCredits}
                keyboardType="number-pad"
                containerStyle={{ flex: 1 }}
              />
            </View>

            <View
              style={[
                styles.targetResultBox,
                {
                  backgroundColor: isTargetAchievable
                    ? colors.success + "15"
                    : colors.destructive + "15",
                  borderColor: isTargetAchievable
                    ? colors.success + "30"
                    : colors.destructive + "30",
                },
              ]}
            >
              <Text
                style={[
                  styles.targetResultTitle,
                  { color: isTargetAchievable ? colors.success : colors.destructive },
                ]}
              >
                {isTargetAchievable
                  ? `Required SGPA: ${requiredGPA > 0 ? requiredGPA.toFixed(2) : "0.00"}`
                  : "Mathematically Unattainable (> 10.00)"}
              </Text>
              <Text style={[styles.targetResultDesc, { color: colors.textMuted }]}>
                {isTargetAchievable
                  ? `Achieve an average GPA of ${requiredGPA.toFixed(2)} across your next ${parsedUpcomingCredits} credits to graduate with ${parsedTarget.toFixed(2)} CGPA.`
                  : "Lower your target threshold or increase registered upcoming credits to find an achievable target."}
              </Text>
            </View>
          </Card>
        </>
      ) : (
        /* ========================================================= */
        /* VIEW B: TRANSCRIPT ARCHIVE                                */
        /* ========================================================= */
        <View style={{ gap: 14 }}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Degree Transcript Archive
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                Verified past semester performance records
              </Text>
            </View>

            <Button
              title="+ Add Term"
              size="sm"
              variant="outline"
              onPress={() => {
                setActiveTab("WORKSHEET");
                const unarchived = ALL_SEMESTERS.find(
                  (n) => !savedSemesters.some((s) => s.semester === n)
                );
                if (unarchived) handleSelectSemester(unarchived);
              }}
            />
          </View>

          {savedSemesters.length === 0 ? (
            <Card style={styles.emptyWorksheetCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyWorksheetTitle, { color: colors.text }]}>
                No Semesters Archived Yet
              </Text>
              <Text style={[styles.emptyWorksheetSubtitle, { color: colors.textMuted }]}>
                Use the Term Worksheet to calculate and archive your semesters into an official verified transcript.
              </Text>
              <Button
                title="Open Term Worksheet"
                size="md"
                onPress={() => setActiveTab("WORKSHEET")}
                style={{ marginTop: 6 }}
              />
            </Card>
          ) : (
            savedSemesters.map((sem) => {
              const isDeleting = deletingId === sem.id;
              const gpaTier =
                sem.gpa >= 8.5
                  ? "Distinction"
                  : sem.gpa >= 7.5
                  ? "Honours"
                  : sem.gpa >= 6.5
                  ? "First Class"
                  : "Pass";

              return (
                <Card key={sem.id} style={styles.transcriptCard}>
                  <View style={styles.transcriptCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.transcriptSemTitle, { color: colors.text }]}>
                          Semester {sem.semester}
                        </Text>
                        <Badge
                          variant={
                            sem.gpa >= 8.5 ? "success" : sem.gpa >= 7.5 ? "primary" : "secondary"
                          }
                          size="sm"
                        >
                          {gpaTier}
                        </Badge>
                      </View>
                      <Text style={[styles.transcriptMetaText, { color: colors.textMuted }]}>
                        {sem.totalCredits} Credits Completed • {sem.courses.length} Courses
                      </Text>
                    </View>

                    <View style={styles.transcriptGpaBadge}>
                      <Text style={[styles.transcriptGpaVal, { color: colors.primary }]}>
                        {sem.gpa.toFixed(2)}
                      </Text>
                      <Text style={[styles.transcriptGpaLabel, { color: colors.textMuted }]}>
                        SGPA
                      </Text>
                    </View>
                  </View>

                  {/* Course list preview */}
                  {sem.courses.length > 0 && (
                    <View style={styles.transcriptCoursesList}>
                      {sem.courses.map((course, idx) => (
                        <View
                          key={course.id || idx}
                          style={[
                            styles.transcriptCourseRow,
                            { borderBottomColor: colors.border + "30" },
                          ]}
                        >
                          <Text
                            style={[styles.transcriptCourseName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {course.name || `Course ${idx + 1}`}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[styles.transcriptCourseCred, { color: colors.textMuted }]}>
                              {course.credits} cr
                            </Text>
                            <Badge variant="outline" size="sm">
                              {course.gradeLabel}
                            </Badge>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Actions Footer */}
                  <View style={styles.transcriptActionsRow}>
                    <Button
                      title="Edit in Worksheet"
                      size="sm"
                      variant="outline"
                      onPress={() => {
                        handleSelectSemester(sem.semester);
                        setActiveTab("WORKSHEET");
                      }}
                      leftIcon={<Feather name="edit-2" size={13} color={colors.text} />}
                    />

                    <Button
                      title="Delete"
                      size="sm"
                      variant="destructive"
                      isLoading={isDeleting}
                      onPress={() => handleDeleteSemester(sem)}
                      leftIcon={<Feather name="trash-2" size={13} color={colors.destructiveForeground} />}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 14,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tabSegmentContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabSegmentText: {
    fontSize: 12,
  },
  semesterBarSection: {
    gap: 8,
  },
  semesterBarHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  semesterBarTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  semesterBarSubtitle: {
    fontSize: 11,
  },
  semesterChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  semesterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  semesterChipText: {
    fontSize: 12,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  savedBannerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  savedBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyWorksheetCard: {
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyWorksheetTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  emptyWorksheetSubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: 280,
  },
  courseCard: {
    padding: 12,
  },
  courseTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trashBtn: {
    padding: 6,
  },
  gradesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 10,
  },
  gradeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  gradeText: {
    fontSize: 11,
  },
  forecasterCard: {
    padding: 16,
    marginTop: 4,
  },
  forecasterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  forecasterInputs: {
    flexDirection: "row",
    marginBottom: 12,
  },
  targetResultBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  targetResultTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  targetResultDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  transcriptCard: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  transcriptCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transcriptSemTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  transcriptMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  transcriptGpaBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  transcriptGpaVal: {
    fontSize: 20,
    fontWeight: "900",
  },
  transcriptGpaLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  transcriptCoursesList: {
    gap: 4,
  },
  transcriptCourseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transcriptCourseName: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  transcriptCourseCred: {
    fontSize: 11,
  },
  transcriptActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
});
