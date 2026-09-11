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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { CircularProgress } from "../components/CircularProgress";
import { apiClient } from "../services/apiClient";

const STORAGE_KEY_ATTENDANCE = "@otium_attendance_subjects";
const STORAGE_KEY_SYNC_QUEUE = "@otium_attendance_pending_sync";

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  attended: number;
  total: number;
  periodWeight?: number; // 1 = standard class, 2 = 2-period lab, 3 = 3-period lab, 4 = workshop
}

const INITIAL_SUBJECTS: SubjectItem[] = [
  {
    id: "1",
    name: "Data Structures & Algorithms",
    code: "CS201",
    attended: 24,
    total: 28,
    periodWeight: 1,
  },
  {
    id: "2",
    name: "Operating Systems",
    code: "CS204",
    attended: 22,
    total: 30,
    periodWeight: 1,
  },
  {
    id: "3",
    name: "Computer Networks Lab",
    code: "CS208L",
    attended: 24,
    total: 30,
    periodWeight: 2,
  },
  {
    id: "4",
    name: "Database Engineering",
    code: "CS210",
    attended: 19,
    total: 28,
    periodWeight: 1,
  },
  {
    id: "5",
    name: "Theory of Computation",
    code: "CS212",
    attended: 26,
    total: 30,
    periodWeight: 1,
  },
];

const SESSION_WEIGHT_OPTIONS = [
  { weight: 1, label: "1 Period", subtitle: "Standard Class (+1)", icon: "book-outline" },
  { weight: 2, label: "2 Periods", subtitle: "Lab Session (+2)", icon: "flask-outline" },
  { weight: 3, label: "3 Periods", subtitle: "3-Hour Lab (+3)", icon: "hardware-chip-outline" },
  { weight: 4, label: "4 Periods", subtitle: "Mega Workshop (+4)", icon: "construct-outline" },
];

export function AttendanceScreen() {
  const [subjects, setSubjects] = useState<SubjectItem[]>(INITIAL_SUBJECTS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Add Subject Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubAttended, setNewSubAttended] = useState("20");
  const [newSubTotal, setNewSubTotal] = useState("25");
  const [newSubPeriodWeight, setNewSubPeriodWeight] = useState<number>(1);

  // Edit Subject Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubjectItem | null>(null);

  // Quick Session Duration Picker Modal State
  const [activeWeightSubject, setActiveWeightSubject] = useState<SubjectItem | null>(null);

  const flushOfflineSyncQueue = async () => {
    try {
      const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: any[] = [];
      for (const item of queue) {
        try {
          await apiClient.post("/attendance", item);
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(remaining));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_SYNC_QUEUE);
      }
    } catch (e) {
      console.log("Sync queue flush deferred:", e);
    }
  };

  const fetchSubjects = async () => {
    // 1. Instantly load from local storage if available (0ms instant render offline!)
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_ATTENDANCE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubjects(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh from backend & flush pending sync queue
    try {
      await flushOfflineSyncQueue();

      const res = await apiClient.get("/attendance");
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: SubjectItem[] = res.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "SUB",
          attended: s.attendedClasses ?? s.attended ?? 0,
          total: s.totalClasses ?? s.total ?? 0,
          periodWeight: s.periodWeight ?? 1,
        }));
        setSubjects(mapped);
        setIsOfflineMode(false);
        await AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(mapped));
      }
    } catch (e) {
      console.log("Could not fetch fresh subjects from backend, keeping local offline subjects");
      setIsOfflineMode(true);
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
  const criticalCount = subjects.filter((s) => (s.total > 0 ? (s.attended / s.total) * 100 < 75 : false)).length;

  const handleLogAttendance = async (id: string, isPresent: boolean, count: number = 1) => {
    const weight = Math.max(1, count);
    const updated = subjects.map((sub) => {
      if (sub.id === id) {
        const newAttended = isPresent ? sub.attended + weight : sub.attended;
        const newTotal = sub.total + weight;
        return {
          ...sub,
          attended: newAttended,
          total: newTotal,
        };
      }
      return sub;
    });

    // 1. Immediately update UI & local offline storage (0ms latency!)
    setSubjects(updated);
    AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});

    // 2. Queue for backend sync
    const payload = {
      action: "LOG_SESSION",
      subjectId: id,
      isPresent,
      count: weight,
    };

    try {
      const res = await apiClient.post("/attendance", payload);
      if (res.success) {
        setIsOfflineMode(false);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      // Offline: enqueue for sync when connection restores!
      setIsOfflineMode(true);
      try {
        const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(payload);
        await AsyncStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(queue));
      } catch {}
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
        periodWeight: newSubPeriodWeight,
      });
      setIsSubmitting(false);

      if (res.success) {
        setIsAddModalOpen(false);
        setNewSubName("");
        setNewSubCode("");
        setNewSubAttended("20");
        setNewSubTotal("25");
        setNewSubPeriodWeight(1);
        fetchSubjects();
      } else {
        Alert.alert("Error", res.error || "Failed to add subject.");
      }
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert("Network Error", e?.message || "Could not connect to Otium services. Please check your internet connection.");
    }
  };

  const handleSaveEditSubject = async () => {
    if (!editingSub) return;
    if (!editingSub.name.trim()) {
      Alert.alert("Error", "Subject name cannot be empty.");
      return;
    }
    if (editingSub.attended > editingSub.total) {
      Alert.alert("Error", "Attended classes cannot exceed total classes.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/attendance", {
        action: "UPDATE_SUBJECT",
        subjectId: editingSub.id,
        name: editingSub.name.trim(),
        code: editingSub.code.trim().toUpperCase(),
        attendedClasses: editingSub.attended,
        totalClasses: editingSub.total,
        periodWeight: editingSub.periodWeight || 1,
      });
      setIsSubmitting(false);

      if (res.success) {
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSub.id ? editingSub : s))
        );
        setIsEditModalOpen(false);
        setEditingSub(null);
      } else {
        Alert.alert("Error", res.error || "Failed to update subject.");
      }
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert("Network Error", e?.message || "Could not save changes.");
    }
  };

  const handleUpdateWeight = async (subjectId: string, newWeight: number) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, periodWeight: newWeight } : s))
    );
    setActiveWeightSubject(null);
    try {
      await apiClient.post("/attendance", {
        action: "UPDATE_SUBJECT",
        subjectId,
        periodWeight: newWeight,
      });
    } catch (e) {
      console.warn("Failed to update lecture weight in advance:", e);
    }
  };

  const handleDeleteSubject = (id: string, name: string) => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSubjects((prev) => prev.filter((s) => s.id !== id));
            try {
              await apiClient.delete(`/attendance?subjectId=${id}`);
            } catch (e) {
              console.warn("Could not delete subject:", e);
            }
          },
        },
      ]
    );
  };

  const calculateAdvice = (attended: number, total: number) => {
    const percentage = total > 0 ? (attended / total) * 100 : 100;
    if (percentage >= 75) {
      const canBunk = Math.floor((attended - 0.75 * total) / 0.75);
      return {
        isSafe: true,
        percentage: percentage.toFixed(1),
        text: canBunk > 0 ? `Safe! Skip up to ${canBunk} classes` : "On the 75% boundary! Attend next class",
        bunks: canBunk,
      };
    } else {
      const needed = Math.ceil((0.75 * total - attended) / 0.25);
      return {
        isSafe: false,
        percentage: percentage.toFixed(1),
        text: `Attend next ${needed} classes consecutively`,
        needed,
      };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.brand[400]} />
      }
    >
      {/* Hero Header Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          {isOfflineMode ? (
            <Badge variant="warning" size="sm">
              ☁️ Offline Mode • Attendance Saved Locally
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              75% University Minimum Rule Engine
            </Badge>
          )}
        </View>
        <Text style={styles.heroTitle}>Attendance Guardrail & Bunk Calculator</Text>
        <Text style={styles.heroSubtitle}>
          Real-time class attendance. Configure session weights in advance to eliminate cluttered action buttons.
        </Text>
      </View>

      {/* Aggregate Circular Progress Gauge Card */}
      <GlassCard style={styles.gaugeCard}>
        <CircularProgress
          percentage={aggregatePercentage}
          size={180}
          strokeWidth={13}
          subtitle="Aggregate Attendance"
        />

        {/* 3 Metric Pills */}
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
            <Text style={styles.kpiLabel}>Classes Attended</Text>
            <Text style={[styles.kpiValue, { color: "#FFFFFF" }]}>
              {totalAttended}/{totalClasses}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Today's Lecture Attendance Quick Prompter (Horizontal, Uncluttered) */}
      <GlassCard style={styles.prompterCard}>
        <View style={styles.prompterHeader}>
          <View style={styles.prompterHeaderTitleGroup}>
            <View style={styles.prompterIconBox}>
              <Ionicons name="calendar-outline" size={16} color={colors.brand[400]} />
            </View>
            <View>
              <Text style={styles.prompterTitle}>Today's Lecture Check-in</Text>
              <Text style={styles.prompterSubtitle}>Quick tap with configured lecture duration</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.prompterScroll}
        >
          {subjects.map((sub) => {
            const weight = sub.periodWeight || 1;
            return (
              <View key={sub.id} style={styles.prompterPill}>
                <View style={styles.prompterPillTop}>
                  <Text style={styles.prompterPillCode} numberOfLines={1}>
                    {sub.code}
                  </Text>
                  <View style={styles.prompterWeightTag}>
                    <Text style={styles.prompterWeightTagText}>
                      {weight}P{weight > 1 ? " Lab" : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.prompterPillName} numberOfLines={1}>
                  {sub.name}
                </Text>
                <View style={styles.prompterBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleLogAttendance(sub.id, true, weight)}
                    style={styles.prompterPresentBtn}
                  >
                    <Feather name="check" size={12} color={colors.emerald[400]} />
                    <Text style={styles.prompterPresentText}>+{weight}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleLogAttendance(sub.id, false, weight)}
                    style={styles.prompterAbsentBtn}
                  >
                    <Feather name="x" size={12} color={colors.rose[400]} />
                    <Text style={styles.prompterAbsentText}>-{weight}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </GlassCard>

      {/* Course List Header with Add Subject Button */}
      <View style={styles.courseSectionHeader}>
        <View>
          <Text style={styles.courseSectionTitle}>Enrolled Semester Courses</Text>
          <Text style={styles.courseSectionSubtitle}>Pre-configured lecture duration applied per course</Text>
        </View>
        <Button
          variant="brand"
          size="sm"
          title="Add Course"
          leftIcon={<Ionicons name="add" size={16} color="#FFFFFF" />}
          onPress={() => setIsAddModalOpen(true)}
        />
      </View>

      {/* Decluttered Subject Breakdown Cards */}
      <View style={styles.subjectList}>
        {subjects.map((sub) => {
          const advice = calculateAdvice(sub.attended, sub.total);
          const isDanger = !advice.isSafe;
          const weight = sub.periodWeight || 1;

          return (
            <GlassCard
              key={sub.id}
              variant={isDanger ? "danger" : "default"}
              style={styles.subjectCard}
            >
              {/* Top Row: Name, Code, Session Pill & Action Icons */}
              <View style={styles.subTopRow}>
                <View style={styles.subTitleGroup}>
                  <View style={styles.subNameRow}>
                    <Text style={styles.subNameText} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    <Badge variant={isDanger ? "danger" : "brand"} size="sm">
                      {sub.code}
                    </Badge>
                  </View>
                  <Text style={styles.subMetaText}>
                    {sub.attended} attended of {sub.total} classes held
                  </Text>
                </View>

                {/* Right Top Actions: Quick Weight Picker Pill & Edit/Delete */}
                <View style={styles.topRightActions}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setActiveWeightSubject(sub)}
                    style={styles.weightSelectorPill}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={weight > 1 ? "flask-outline" : "book-outline"}
                      size={11}
                      color={colors.brand[400]}
                    />
                    <Text style={styles.weightSelectorPillText}>
                      {weight} Period{weight > 1 ? "s" : ""}
                    </Text>
                    <Feather name="chevron-down" size={11} color={colors.slate[400]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setEditingSub({ ...sub });
                      setIsEditModalOpen(true);
                    }}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="edit-2" size={13} color={colors.slate[400]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDeleteSubject(sub.id, sub.name)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={13} color={colors.rose[400]} />
                  </TouchableOpacity>
                </View>
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
                  size={15}
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

              {/* Decluttered Action Bar: ONLY 2 ACTION BUTTONS */}
              <View style={styles.cleanActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleLogAttendance(sub.id, true, weight)}
                  style={[styles.cleanActionBtn, styles.cleanPresentBtn]}
                >
                  <Feather name="check" size={15} color={colors.emerald[400]} />
                  <Text style={styles.cleanPresentText}>
                    Attended (+{weight}{weight > 1 ? " Lab" : ""})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleLogAttendance(sub.id, false, weight)}
                  style={[styles.cleanActionBtn, styles.cleanAbsentBtn]}
                >
                  <Feather name="x" size={15} color={colors.rose[400]} />
                  <Text style={styles.cleanAbsentText}>
                    Missed (-{weight})
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        })}
      </View>

      {/* Add Subject Modal with Advance Lecture Weight Configuration */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setIsAddModalOpen(false)}
          />
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Semester Subject</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

              {/* Advance Lecture Duration / Weight Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Lecture Session Type (In Advance) *</Text>
                <Text style={styles.formHint}>
                  Pre-configures period count to keep your course cards clean and decluttered.
                </Text>
                <View style={styles.weightOptionsGrid}>
                  {SESSION_WEIGHT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.weight}
                      activeOpacity={0.7}
                      onPress={() => setNewSubPeriodWeight(opt.weight)}
                      style={[
                        styles.weightCard,
                        newSubPeriodWeight === opt.weight && styles.weightCardActive,
                      ]}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={16}
                        color={newSubPeriodWeight === opt.weight ? colors.brand[400] : colors.slate[400]}
                      />
                      <Text
                        style={[
                          styles.weightCardTitle,
                          newSubPeriodWeight === opt.weight && styles.weightCardTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.weightCardSubtitle}>{opt.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                title={isSubmitting ? "Saving Subject..." : "Save Subject"}
                onPress={handleAddSubject}
                style={{ marginTop: 12 }}
                disabled={isSubmitting}
              />
            </ScrollView>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Subject Modal */}
      {editingSub && (
        <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditModalOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <TouchableOpacity
              style={styles.modalOverlayTouch}
              activeOpacity={1}
              onPress={() => setIsEditModalOpen(false)}
            />
            <GlassCard style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Course Attendance</Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={colors.slate[400]} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Subject Name</Text>
                  <TextInput
                    value={editingSub.name}
                    onChangeText={(val) => setEditingSub({ ...editingSub, name: val })}
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Course Code</Text>
                  <TextInput
                    value={editingSub.code}
                    onChangeText={(val) => setEditingSub({ ...editingSub, code: val })}
                    style={styles.modalInput}
                  />
                </View>

                {/* Edit Lecture Duration */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Lecture Duration (Advance Weight)</Text>
                  <View style={styles.weightOptionsGrid}>
                    {SESSION_WEIGHT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.weight}
                        activeOpacity={0.7}
                        onPress={() => setEditingSub({ ...editingSub, periodWeight: opt.weight })}
                        style={[
                          styles.weightCard,
                          (editingSub.periodWeight || 1) === opt.weight && styles.weightCardActive,
                        ]}
                      >
                        <Ionicons
                          name={opt.icon as any}
                          size={16}
                          color={(editingSub.periodWeight || 1) === opt.weight ? colors.brand[400] : colors.slate[400]}
                        />
                        <Text
                          style={[
                            styles.weightCardTitle,
                            (editingSub.periodWeight || 1) === opt.weight && styles.weightCardTitleActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.weightCardSubtitle}>{opt.subtitle}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Attended Classes</Text>
                    <TextInput
                      value={String(editingSub.attended)}
                      onChangeText={(val) =>
                        setEditingSub({ ...editingSub, attended: parseInt(val) || 0 })
                      }
                      keyboardType="number-pad"
                      style={styles.modalInput}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Total Held</Text>
                    <TextInput
                      value={String(editingSub.total)}
                      onChangeText={(val) =>
                        setEditingSub({ ...editingSub, total: parseInt(val) || 0 })
                      }
                      keyboardType="number-pad"
                      style={styles.modalInput}
                    />
                  </View>
                </View>

                <Button
                  variant="brand"
                  title={isSubmitting ? "Saving..." : "Save Changes"}
                  onPress={handleSaveEditSubject}
                  style={{ marginTop: 12 }}
                  disabled={isSubmitting}
                />
              </ScrollView>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Quick Lecture Duration Picker Modal */}
      {activeWeightSubject && (
        <Modal
          visible={!!activeWeightSubject}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveWeightSubject(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalOverlayTouch}
              activeOpacity={1}
              onPress={() => setActiveWeightSubject(null)}
            />
            <GlassCard style={styles.quickPickerContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Lecture Session Duration</Text>
                  <Text style={styles.quickPickerSubtitle}>
                    {activeWeightSubject.name} ({activeWeightSubject.code})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveWeightSubject(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.slate[400]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.quickPickerInstruction}>
                Select how many periods this course counts for. Card buttons will automatically log this weight in advance:
              </Text>

              <View style={styles.quickPickerList}>
                {SESSION_WEIGHT_OPTIONS.map((opt) => {
                  const isSelected = (activeWeightSubject.periodWeight || 1) === opt.weight;
                  return (
                    <TouchableOpacity
                      key={opt.weight}
                      activeOpacity={0.7}
                      onPress={() => handleUpdateWeight(activeWeightSubject.id, opt.weight)}
                      style={[
                        styles.quickPickerItem,
                        isSelected && styles.quickPickerItemActive,
                      ]}
                    >
                      <View style={styles.quickPickerItemLeft}>
                        <View
                          style={[
                            styles.quickPickerIconWrap,
                            isSelected && styles.quickPickerIconWrapActive,
                          ]}
                        >
                          <Ionicons
                            name={opt.icon as any}
                            size={18}
                            color={isSelected ? colors.brand[400] : colors.slate[400]}
                          />
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.quickPickerItemLabel,
                              isSelected && styles.quickPickerItemLabelActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={styles.quickPickerItemSubtitle}>{opt.subtitle}</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.brand[400]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        </Modal>
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
    padding: 22,
    alignItems: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
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
  prompterCard: {
    padding: 16,
    gap: 12,
  },
  prompterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prompterHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prompterIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  prompterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  prompterSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  prompterScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  prompterPill: {
    width: 140,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  prompterPillTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prompterPillCode: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand[400],
  },
  prompterWeightTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  prompterWeightTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.slate[300],
  },
  prompterPillName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  prompterBtnRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  prompterPresentBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    gap: 3,
  },
  prompterPresentText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.emerald[400],
  },
  prompterAbsentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    gap: 2,
  },
  prompterAbsentText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.rose[400],
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
  courseSectionSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
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
  subNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    flexShrink: 1,
  },
  subMetaText: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 3,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weightSelectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  weightSelectorPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand[400],
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  cleanActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cleanActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  cleanPresentBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  cleanPresentText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.emerald[400],
  },
  cleanAbsentBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderColor: "rgba(244, 63, 94, 0.35)",
  },
  cleanAbsentText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.rose[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalOverlayTouch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    padding: 22,
    gap: 14,
    maxHeight: "88%",
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
    marginBottom: 10,
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
  formHint: {
    fontSize: 11,
    color: colors.slate[400],
    marginBottom: 4,
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
  weightOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weightCard: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 2,
  },
  weightCardActive: {
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderColor: colors.brand[400],
  },
  weightCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate[200],
    marginTop: 4,
  },
  weightCardTitleActive: {
    color: colors.brand[400],
  },
  weightCardSubtitle: {
    fontSize: 10,
    color: colors.slate[400],
  },
  quickPickerContent: {
    padding: 20,
    gap: 12,
  },
  quickPickerSubtitle: {
    fontSize: 12,
    color: colors.brand[400],
    fontWeight: "700",
    marginTop: 2,
  },
  quickPickerInstruction: {
    fontSize: 12,
    color: colors.slate[300],
    lineHeight: 18,
  },
  quickPickerList: {
    gap: 8,
    marginTop: 6,
  },
  quickPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickPickerItemActive: {
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderColor: colors.brand[400],
  },
  quickPickerItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickPickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickPickerIconWrapActive: {
    backgroundColor: "rgba(20, 184, 166, 0.2)",
  },
  quickPickerItemLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  quickPickerItemLabelActive: {
    color: colors.brand[400],
  },
  quickPickerItemSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
  },
});
