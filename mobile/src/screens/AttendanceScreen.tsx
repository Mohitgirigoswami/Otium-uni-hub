import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { CircularProgress } from "../components/CircularProgress";
import { apiClient } from "../services/apiClient";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  attended: number;
  total: number;
}

const INITIAL_SUBJECTS: SubjectItem[] = [
  {
    id: "1",
    name: "Data Structures & Algorithms",
    code: "CS201",
    attended: 24,
    total: 28,
  },
  {
    id: "2",
    name: "Operating Systems",
    code: "CS204",
    attended: 22,
    total: 30,
  },
  {
    id: "3",
    name: "Computer Networks",
    code: "CS208",
    attended: 25,
    total: 32,
  },
  {
    id: "4",
    name: "Database Engineering",
    code: "CS210",
    attended: 19,
    total: 28,
  },
  {
    id: "5",
    name: "Theory of Computation",
    code: "CS212",
    attended: 26,
    total: 30,
  },
];

export function AttendanceScreen() {
  const [subjects, setSubjects] = useState<SubjectItem[]>(INITIAL_SUBJECTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubAttended, setNewSubAttended] = useState("20");
  const [newSubTotal, setNewSubTotal] = useState("25");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get("/attendance");
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: SubjectItem[] = res.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "SUB",
          attended: s.attendedClasses ?? s.attended ?? 0,
          total: s.totalClasses ?? s.total ?? 0,
        }));
        setSubjects(mapped);
      }
    } catch (e) {
      console.warn("Could not fetch subjects:", e);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubjects();
    setIsRefreshing(false);
  };

  // Calculate Aggregates
  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const aggregatePercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 100;
  const criticalCount = subjects.filter((s) => (s.attended / s.total) * 100 < 75).length;

  const handleLogAttendance = async (id: string, isPresent: boolean) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id === id) {
          const newAttended = isPresent ? sub.attended + 1 : sub.attended;
          const newTotal = sub.total + 1;
          return {
            ...sub,
            attended: newAttended,
            total: newTotal,
          };
        }
        return sub;
      })
    );

    try {
      await apiClient.post("/attendance", {
        action: "LOG_SESSION",
        subjectId: id,
        isPresent,
      });
    } catch (e) {
      console.warn("Could not log attendance session:", e);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubName.trim()) {
      Alert.alert("Error", "Please enter a subject name.");
      return;
    }
    const att = parseInt(newSubAttended) || 0;
    const tot = parseInt(newSubTotal) || 0;
    if (att > tot) {
      Alert.alert("Error", "Attended classes cannot exceed total classes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/attendance", {
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase() || "SUB",
        attendedClasses: att,
        totalClasses: tot,
      });
      setIsSubmitting(false);

      if (res.success) {
        setIsAddModalOpen(false);
        setNewSubName("");
        setNewSubCode("");
        fetchSubjects();
      } else {
        Alert.alert("Error", res.error || "Failed to add subject.");
      }
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert("Network Error", e?.message || "Could not connect to backend.");
    }
  };

  const calculateAdvice = (attended: number, total: number) => {
    const percentage = total > 0 ? (attended / total) * 100 : 100;
    if (percentage >= 75) {
      // Maximum bunks allowed: floor((attended - 0.75 * total) / 0.75)
      const canBunk = Math.floor((attended - 0.75 * total) / 0.75);
      return {
        isSafe: true,
        percentage: percentage.toFixed(1),
        text: canBunk > 0 ? `You can safely skip ${canBunk} more classes` : "On the edge! Do not miss next class",
        bunks: canBunk,
      };
    } else {
      // Consecutive classes needed: ceil((0.75 * total - attended) / 0.25)
      const needed = Math.ceil((0.75 * total - attended) / 0.25);
      return {
        isSafe: false,
        percentage: percentage.toFixed(1),
        text: `Attend next ${needed} classes consecutively to hit 75%`,
        needed,
      };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Header Banner (1:1 Port of Web Hero) */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          <Badge variant="success" size="sm">
            75% University Minimum Rule Engine
          </Badge>
        </View>
        <Text style={styles.heroTitle}>Attendance Guardrail & Bunk Calculator</Text>
        <Text style={styles.heroSubtitle}>
          Track real-time class attendance across all courses. Mathematical deficit and safe bunk predictions prevent exam debarment.
        </Text>
      </View>

      {/* Aggregate Circular Progress Gauge Card */}
      <GlassCard style={styles.gaugeCard}>
        <CircularProgress
          percentage={aggregatePercentage}
          size={190}
          strokeWidth={14}
          subtitle="Aggregate Attendance"
        />

        {/* 3 Metric Pills (1:1 Web KPI Stats) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiPill}>
            <Text style={styles.kpiLabel}>Status</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: aggregatePercentage >= 75 ? colors.emerald[400] : colors.rose[400] },
              ]}
            >
              {aggregatePercentage >= 75 ? "Safe" : "At Risk"}
            </Text>
          </View>

          <View style={styles.kpiPill}>
            <Text style={styles.kpiLabel}>Critical (&lt;75%)</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: criticalCount > 0 ? colors.rose[400] : colors.emerald[400] },
              ]}
            >
              {criticalCount} Courses
            </Text>
          </View>

          <View style={styles.kpiPill}>
            <Text style={styles.kpiLabel}>Total Attended</Text>
            <Text style={[styles.kpiValue, { color: "#FFFFFF" }]}>
              {totalAttended}/{totalClasses}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Course List Header with Add Subject Button */}
      <View style={styles.courseSectionHeader}>
        <Text style={styles.courseSectionTitle}>Enrolled Semester Courses</Text>
        <Button
          variant="brand"
          size="sm"
          title="Add Subject"
          leftIcon={<Ionicons name="add" size={16} color="#FFFFFF" />}
          onPress={() => setIsAddModalOpen(true)}
        />
      </View>

      {/* Scrollable Subject Breakdown Cards */}
      <View style={styles.subjectList}>
        {subjects.map((sub) => {
          const advice = calculateAdvice(sub.attended, sub.total);
          const isDanger = !advice.isSafe;

          return (
            <GlassCard
              key={sub.id}
              variant={isDanger ? "danger" : "default"}
              style={styles.subjectCard}
            >
              {/* Top Row: Name & Code */}
              <View style={styles.subTopRow}>
                <View style={styles.subTitleGroup}>
                  <Text style={styles.subNameText}>{sub.name}</Text>
                  <Text style={styles.subMetaText}>
                    {sub.attended} attended of {sub.total} classes
                  </Text>
                </View>
                <Badge variant={isDanger ? "danger" : "brand"} size="sm">
                  {sub.code}
                </Badge>
              </View>

              {/* Attendance Rate & Progress Bar */}
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Attendance Rate</Text>
                <Text
                  style={[
                    styles.rateValue,
                    { color: isDanger ? colors.rose[400] : colors.emerald[400] },
                  ]}
                >
                  {advice.percentage}%
                </Text>
              </View>

              {/* Progress Bar with 75% Marker */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, parseFloat(advice.percentage))}%`,
                      backgroundColor: isDanger ? colors.rose[500] : colors.emerald[500],
                    },
                  ]}
                />
                <View style={styles.marker75} />
              </View>

              {/* Mathematical Predictive Advice Box */}
              <View
                style={[
                  styles.adviceBox,
                  {
                    backgroundColor: isDanger ? colors.rose.bg : colors.emerald.bg,
                    borderColor: isDanger ? colors.rose.border : colors.emerald.border,
                  },
                ]}
              >
                <Ionicons
                  name={isDanger ? "warning-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={isDanger ? colors.rose[400] : colors.emerald[400]}
                />
                <Text
                  style={[
                    styles.adviceText,
                    { color: isDanger ? colors.rose[300] : colors.emerald[300] },
                  ]}
                >
                  {advice.text}
                </Text>
              </View>

              {/* Quick Attendance Logger Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleLogAttendance(sub.id, true)}
                  style={[styles.actionBtn, styles.presentBtn]}
                >
                  <Feather name="check" size={14} color={colors.emerald[400]} />
                  <Text style={styles.presentBtnText}>Present (+1)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleLogAttendance(sub.id, false)}
                  style={[styles.actionBtn, styles.absentBtn]}
                >
                  <Feather name="x" size={14} color={colors.rose[400]} />
                  <Text style={styles.absentBtnText}>Absent</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        })}
      </View>

      {/* Add Subject Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Semester Subject</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject Name *</Text>
              <TextInput
                value={newSubName}
                onChangeText={setNewSubName}
                placeholder="e.g. Distributed Systems"
                placeholderTextColor={colors.slate[500]}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Course Code</Text>
              <TextInput
                value={newSubCode}
                onChangeText={setNewSubCode}
                placeholder="e.g. CS301"
                placeholderTextColor={colors.slate[500]}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Attended</Text>
                <TextInput
                  value={newSubAttended}
                  onChangeText={setNewSubAttended}
                  keyboardType="number-pad"
                  style={styles.modalInput}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Total Held</Text>
                <TextInput
                  value={newSubTotal}
                  onChangeText={setNewSubTotal}
                  keyboardType="number-pad"
                  style={styles.modalInput}
                />
              </View>
            </View>

            <Button
              variant="brand"
              title="Save Subject"
              onPress={handleAddSubject}
              style={{ marginTop: 10 }}
            />
          </GlassCard>
        </View>
      </Modal>
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
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
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
  gaugeCard: {
    padding: 24,
    alignItems: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  kpiPill: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  courseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  courseSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  subjectList: {
    gap: 14,
  },
  subjectCard: {
    padding: 18,
    gap: 12,
  },
  subTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  subTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  subNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subMetaText: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  rateValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate[800],
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  marker75: {
    position: "absolute",
    left: "75%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.slate[400],
  },
  adviceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  adviceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  presentBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  presentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerald[400],
  },
  absentBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  absentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.rose[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    padding: 22,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  formGroup: {
    gap: 6,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[300],
  },
  modalInput: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
