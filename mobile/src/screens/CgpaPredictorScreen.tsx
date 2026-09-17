import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { RadialCgpaGauge } from "../components/cgpa/RadialCgpaGauge";
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
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);
  const [activeSemesterNum, setActiveSemesterNum] = useState<number>(3);
  const [savedSemesters, setSavedSemesters] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Target Planner inputs
  const [targetCgpa, setTargetCgpa] = useState<string>("8.50");
  const [upcomingCredits, setUpcomingCredits] = useState<string>("20");

  const fetchRecords = async () => {
    try {
      const res = await apiClient.get("/cgpa");
      if (res.success && Array.isArray(res.data)) {
        setSavedSemesters(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecords();
    setIsRefreshing(false);
  };

  // SGPA Calculations
  const totalActiveCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const totalActivePoints = courses.reduce(
    (sum, c) => sum + (c.credits || 0) * (c.gradePoint || 0),
    0
  );
  const currentSemesterGPA = totalActiveCredits > 0 ? totalActivePoints / totalActiveCredits : 0;

  // Cumulative CGPA calculations across transcript
  const archivedCredits = savedSemesters.reduce((sum, s) => sum + (s.totalCredits || 0), 0);
  const archivedPoints = savedSemesters.reduce(
    (sum, s) => sum + (s.totalCredits || 0) * (s.gpa || 0),
    0
  );
  const cumulativeTotalCredits = archivedCredits + totalActiveCredits;
  const cumulativeTotalPoints = archivedPoints + totalActivePoints;
  const cumulativeCGPA =
    cumulativeTotalCredits > 0 ? cumulativeTotalPoints / cumulativeTotalCredits : currentSemesterGPA;

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
        c.id === id ? { ...c, gradePoint: point, gradeLabel: found ? found.label : "A" } : c
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
      Alert.alert("Network Error", "Could not connect to Otium services.");
    } finally {
      setIsSaving(false);
    }
  };

  // Required GPA calculation for target
  const parsedTarget = parseFloat(targetCgpa) || 8.5;
  const parsedUpcomingCredits = parseInt(upcomingCredits, 10) || 20;
  const requiredPoints =
    parsedTarget * (cumulativeTotalCredits + parsedUpcomingCredits) - cumulativeTotalPoints;
  const requiredGPA = parsedUpcomingCredits > 0 ? requiredPoints / parsedUpcomingCredits : 0;
  const isTargetAchievable = requiredGPA <= 10.0;

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
        gpa={currentSemesterGPA}
        title={`Semester ${activeSemesterNum} Term SGPA`}
        subtitle={`${totalActiveCredits} credits registered in current term worksheet`}
      />

      {/* 2. Cumulative Academic Summary Metrics */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Cumulative CGPA
          </Text>
          <Text style={[styles.metricVal, { color: colors.text }]}>
            {cumulativeCGPA.toFixed(2)}
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
            {savedSemesters.length}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            Official transcript
          </Text>
        </Card>
      </View>

      {/* 3. Active Semester Worksheet Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Semester {activeSemesterNum} Course Worksheet
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Set credit weights (1-5) and expected letter grades
          </Text>
        </View>

        <Button
          title="Add Course"
          size="sm"
          onPress={addCourseRow}
          leftIcon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
        />
      </View>

      {/* Course List */}
      <View style={{ gap: 10 }}>
        {courses.map((c) => (
          <Card key={c.id} style={styles.courseCard}>
            <View style={styles.courseTopRow}>
              <Input
                value={c.name}
                onChangeText={(val) => updateCourseName(c.id, val)}
                containerStyle={{ flex: 1, marginRight: 8 }}
                inputStyle={{ fontSize: 13, height: 38 }}
              />

              <Input
                value={c.credits.toString()}
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
      </View>

      {/* Save Semester Action */}
      <Button
        title={`Save Semester ${activeSemesterNum} to Transcript`}
        size="lg"
        isLoading={isSaving}
        onPress={handleSaveSemester}
        leftIcon={<Feather name="save" size={16} color={colors.primaryForeground} />}
        style={{ marginTop: 4 }}
      />

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
              backgroundColor: isTargetAchievable ? colors.success + "15" : colors.destructive + "15",
              borderColor: isTargetAchievable ? colors.success + "30" : colors.destructive + "30",
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
              ? `Achieve an average GPA of ${requiredGPA.toFixed(2)} in your upcoming ${parsedUpcomingCredits} credits to reach ${parsedTarget.toFixed(2)} CGPA.`
              : "Increase your upcoming credits or lower your target threshold to find an attainable target."}
          </Text>
        </View>
      </Card>
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
    gap: 16,
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
    marginTop: 6,
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
});
