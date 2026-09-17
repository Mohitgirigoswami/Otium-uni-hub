import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { LiquidSlider } from "../components/ui/LiquidSlider";
import { CircularProgress } from "../components/CircularProgress";
import { apiClient } from "../services/apiClient";

const STORAGE_KEY_ATTENDANCE = "@otium_attendance_subjects";
const STORAGE_KEY_TARGET = "@otium_attendance_target";
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
  { id: "1", name: "Data Structures & Algorithms", code: "CS201", attended: 24, total: 28, periodWeight: 1 },
  { id: "2", name: "Operating Systems", code: "CS204", attended: 22, total: 30, periodWeight: 1 },
  { id: "3", name: "Computer Networks Lab", code: "CS208L", attended: 24, total: 30, periodWeight: 2 },
  { id: "4", name: "Database Engineering", code: "CS210", attended: 19, total: 28, periodWeight: 1 },
  { id: "5", name: "Theory of Computation", code: "CS212", attended: 26, total: 30, periodWeight: 1 },
];

const SESSION_WEIGHT_OPTIONS = [
  { weight: 1, label: "1h Lecture", subtitle: "1 period weight (+1)", icon: "book-outline" },
  { weight: 2, label: "2h Tutorial", subtitle: "2 periods weight (+2)", icon: "flask-outline" },
  { weight: 3, label: "3h Lab", subtitle: "3 periods weight (+3)", icon: "hardware-chip-outline" },
  { weight: 4, label: "4h Workshop", subtitle: "4 periods weight (+4)", icon: "construct-outline" },
];

export function AttendanceScreen() {
  const { colors, isDark } = useTheme();
  const [subjects, setSubjects] = useState<SubjectItem[]>(INITIAL_SUBJECTS);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubAttended, setNewSubAttended] = useState("");
  const [newSubTotal, setNewSubTotal] = useState("");
  const [newSubPeriodWeight, setNewSubPeriodWeight] = useState<number>(1);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubjectItem | null>(null);

  // Flush offline pending queue
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

  // Two-way sync & reconciliation
  const syncWithBackend = async (localSubs?: SubjectItem[]) => {
    setIsSyncing(true);
    await flushOfflineSyncQueue();

    const activeList = localSubs || subjects;
    try {
      const res = await apiClient.post("/attendance", {
        action: "SYNC_OFFLINE",
        subjects: activeList,
      });

      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: SubjectItem[] = res.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "SUB",
          attended: s.attendedClasses ?? 0,
          total: s.totalClasses ?? 0,
          periodWeight: s.periodWeight ?? 1,
        }));
        setSubjects(mapped);
        setIsOfflineMode(false);
        await AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(mapped));
      } else {
        const fallbackRes = await apiClient.get("/attendance");
        if (fallbackRes.success && Array.isArray(fallbackRes.data) && fallbackRes.data.length > 0) {
          const mapped: SubjectItem[] = fallbackRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || "SUB",
            attended: s.attendedClasses ?? 0,
            total: s.totalClasses ?? 0,
            periodWeight: s.periodWeight ?? 1,
          }));
          setSubjects(mapped);
          setIsOfflineMode(false);
          await AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(mapped));
        }
      }
    } catch (e) {
      console.log("Offline mode: using local cached subjects");
      setIsOfflineMode(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load cached attendance & target on mount
  useEffect(() => {
    async function loadCache() {
      let currentLocal: SubjectItem[] = [];
      try {
        const [cachedSubs, cachedTarget] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_ATTENDANCE),
          AsyncStorage.getItem(STORAGE_KEY_TARGET),
        ]);
        if (cachedSubs) {
          const parsed = JSON.parse(cachedSubs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSubjects(parsed);
            currentLocal = parsed;
          }
        }
        if (cachedTarget) {
          const num = parseInt(cachedTarget, 10);
          if (!isNaN(num) && num >= 50 && num <= 95) setTargetPercentage(num);
        }
      } catch (e) {
        console.warn("Could not load local attendance:", e);
      }

      // Reconcile in background
      syncWithBackend(currentLocal);
    }
    loadCache();
  }, []);

  const handleTargetChange = (val: number) => {
    setTargetPercentage(val);
    AsyncStorage.setItem(STORAGE_KEY_TARGET, val.toString()).catch(() => {});
  };

  const handleSaveSubject = async () => {
    if (!newSubName.trim()) {
      Alert.alert("Missing Name", "Please enter a subject name.");
      return;
    }

    const att = Math.max(0, parseInt(newSubAttended || "0", 10));
    const tot = Math.max(att, parseInt(newSubTotal || "0", 10));

    const newSub: SubjectItem = {
      id: Date.now().toString(),
      name: newSubName.trim(),
      code: newSubCode.trim().toUpperCase() || "SUB",
      attended: att,
      total: tot,
      periodWeight: newSubPeriodWeight,
    };

    const updated = [...subjects, newSub];
    setSubjects(updated);
    AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});

    setIsAddModalOpen(false);
    setNewSubName("");
    setNewSubCode("");
    setNewSubAttended("");
    setNewSubTotal("");
    setNewSubPeriodWeight(1);

    const payload = {
      action: "CREATE_SUBJECT",
      name: newSub.name,
      code: newSub.code,
      periodWeight: newSub.periodWeight,
      attendedClasses: newSub.attended,
      totalClasses: newSub.total,
    };

    try {
      const res = await apiClient.post("/attendance", payload);
      if (res.success) {
        setIsOfflineMode(false);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      setIsOfflineMode(true);
      try {
        const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(payload);
        await AsyncStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(queue));
      } catch {}
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSub) return;
    const updated = subjects.map((s) => (s.id === editingSub.id ? editingSub : s));
    setSubjects(updated);
    AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});
    setIsEditModalOpen(false);

    const payload = {
      action: "UPDATE_SUBJECT",
      subjectId: editingSub.id,
      name: editingSub.name,
      code: editingSub.code,
      periodWeight: editingSub.periodWeight,
      attendedClasses: editingSub.attended,
      totalClasses: editingSub.total,
    };

    try {
      const res = await apiClient.post("/attendance", payload);
      if (res.success) {
        setIsOfflineMode(false);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      setIsOfflineMode(true);
      try {
        const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(payload);
        await AsyncStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(queue));
      } catch {}
    }
  };

  const handleDeleteSubject = (id: string, name: string) => {
    Alert.alert("Delete Subject", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = subjects.filter((s) => s.id !== id);
          setSubjects(updated);
          AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});
          try {
            await apiClient.delete(`/attendance?subjectId=${id}`);
          } catch (e) {
            setIsOfflineMode(true);
          }
        },
      },
    ]);
  };

  const handleLogAttendance = async (id: string, attended: boolean, weight: number = 1) => {
    const updated = subjects.map((s) => {
      if (s.id === id) {
        const newAttended = attended ? s.attended + weight : s.attended;
        const newTotal = s.total + weight;
        return { ...s, attended: newAttended, total: newTotal };
      }
      return s;
    });

    // 1. Immediately update local state & disk storage (0ms offline responsiveness!)
    setSubjects(updated);
    AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});

    // 2. Queue or dispatch to server
    const payload = {
      action: "LOG_SESSION",
      subjectId: id,
      status: attended ? "PRESENT" : "ABSENT",
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
      setIsOfflineMode(true);
      try {
        const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(payload);
        await AsyncStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(queue));
      } catch {}
    }
  };

  // Math recalculations for any custom target percentage T
  const calculateAdvice = (attended: number, total: number) => {
    const pct = total > 0 ? (attended / total) * 100 : 100;
    const T = targetPercentage / 100;

    if (pct >= targetPercentage) {
      const canBunk = Math.floor((attended - T * total) / T);
      return {
        isSafe: true,
        percentage: pct.toFixed(1),
        text: canBunk > 0 ? `Safe! Skip up to ${canBunk} lecture(s)` : `On ${targetPercentage}% boundary! Attend next class`,
        bunks: canBunk,
      };
    } else {
      const needed = Math.ceil((T * total - attended) / (1 - T));
      return {
        isSafe: false,
        percentage: pct.toFixed(1),
        text: `Must attend next ${needed} class(es) consecutively`,
        needed,
      };
    }
  };

  const totalHeld = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const aggregatePercentage = totalHeld > 0 ? (totalAttended / totalHeld) * 100 : 100;

  const onRefresh = async () => {
    setIsRefreshing(true);
    await syncWithBackend();
    setIsRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Threshold Control Card with LiquidSlider */}
      <Card style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Badge variant="primary" size="sm">
                Target: {targetPercentage}%
              </Badge>
              {isOfflineMode ? (
                <Badge variant="warning" size="sm">
                  ☁️ Offline Mode
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  ⚡ Live Synced
                </Badge>
              )}
            </View>
            <Text style={[styles.sliderTitle, { color: colors.text }]}>
              Attendance Guardrail
            </Text>
            <Text style={[styles.sliderSubtitle, { color: colors.textMuted }]}>
              Set custom target threshold for your department or medical quota.
            </Text>
          </View>
        </View>

        <LiquidSlider
          min={50}
          max={95}
          step={1}
          value={targetPercentage}
          onChange={handleTargetChange}
          unit="%"
          presets={[
            { label: "65% Medical", value: 65 },
            { label: "75% Standard", value: 75 },
            { label: "80% Strict", value: 80 },
            { label: "85% Honors", value: 85 },
          ]}
        />
      </Card>

      {/* 2. Aggregate Overall Status Card */}
      <Card style={styles.aggregateCard}>
        <View style={styles.aggregateRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aggLabel, { color: colors.textSecondary }]}>
              Semester Aggregate
            </Text>
            <Text
              style={[
                styles.aggPercentage,
                {
                  color: aggregatePercentage >= targetPercentage ? colors.success : colors.destructive,
                },
              ]}
            >
              {aggregatePercentage.toFixed(1)}%
            </Text>
            <Text style={[styles.aggHeld, { color: colors.textMuted }]}>
              {totalAttended} attended of {totalHeld} total lectures
            </Text>
          </View>

          <Badge
            variant={aggregatePercentage >= targetPercentage ? "success" : "destructive"}
            size="md"
          >
            {aggregatePercentage >= targetPercentage ? "Safe Standing" : "Under Quota"}
          </Badge>
        </View>
      </Card>

      {/* 3. Enrolled Courses Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Enrolled Subjects
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {subjects.length} course(s) being monitored
          </Text>
        </View>

        <Button
          title="Add Subject"
          size="sm"
          onPress={() => setIsAddModalOpen(true)}
          leftIcon={<Ionicons name="add" size={16} color={colors.primaryForeground} />}
        />
      </View>

      {/* 4. Uncluttered Subject Cards */}
      <View style={styles.subjectList}>
        {subjects.map((sub) => {
          const advice = calculateAdvice(sub.attended, sub.total);
          const isDanger = !advice.isSafe;
          const weight = sub.periodWeight || 1;

          return (
            <Card
              key={sub.id}
              style={[
                styles.subjectCard,
                isDanger && { borderColor: colors.destructive + "50" },
              ]}
            >
              {/* Card Header: Subject name, code badge, duration badge, and edit/delete icons */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.subName, { color: colors.text }]} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    <Badge variant="default" size="sm">
                      {sub.code}
                    </Badge>
                    {/* Clean duration badge */}
                    {weight > 1 && (
                      <Badge variant="outline" size="sm">
                        {weight}h Lab
                      </Badge>
                    )}
                  </View>
                  <Text style={[styles.subStats, { color: colors.textMuted }]}>
                    {sub.attended} attended / {sub.total} held
                  </Text>
                </View>

                {/* Edit & Delete Actions */}
                <View style={styles.cardActionIcons}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingSub({ ...sub });
                      setIsEditModalOpen(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.iconBtn}
                  >
                    <Feather name="edit-2" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteSubject(sub.id, sub.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.iconBtn}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Attendance Rate & Advice */}
              <View style={styles.rateRow}>
                <Text style={[styles.adviceText, { color: isDanger ? colors.destructive : colors.success }]}>
                  {advice.text}
                </Text>
                <Text
                  style={[
                    styles.rateValue,
                    { color: isDanger ? colors.destructive : colors.success },
                  ]}
                >
                  {advice.percentage}%
                </Text>
              </View>

              {/* Progress Line */}
              <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(100, parseFloat(advice.percentage))}%`,
                      backgroundColor: isDanger ? colors.destructive : colors.success,
                    },
                  ]}
                />
              </View>

              {/* Clean Log Attendance Action Buttons (Uncluttered) */}
              <View style={styles.logButtonsRow}>
                <Button
                  title={`+ Present (${weight}h)`}
                  variant="outline"
                  size="sm"
                  onPress={() => handleLogAttendance(sub.id, true, weight)}
                  leftIcon={<Feather name="check" size={13} color={colors.success} />}
                  style={{ flex: 1, borderColor: colors.success + "40" }}
                  textStyle={{ color: colors.success }}
                />

                <Button
                  title={`+ Absent (${weight}h)`}
                  variant="outline"
                  size="sm"
                  onPress={() => handleLogAttendance(sub.id, false, weight)}
                  leftIcon={<Feather name="x" size={13} color={colors.destructive} />}
                  style={{ flex: 1, borderColor: colors.destructive + "40" }}
                  textStyle={{ color: colors.destructive }}
                />
              </View>
            </Card>
          );
        })}
      </View>

      {/* Add Subject Modal with Session Duration Selector */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Subject</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input
                label="Subject Name *"
                value={newSubName}
                onChangeText={setNewSubName}
                placeholder="e.g. Distributed Systems"
                containerStyle={{ marginBottom: 12 }}
              />

              <Input
                label="Course Code"
                value={newSubCode}
                onChangeText={setNewSubCode}
                placeholder="e.g. CS301"
                containerStyle={{ marginBottom: 14 }}
              />

              {/* Session Weight Selector (Kept in Modal to Avoid Screen Clutter) */}
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Default Session Duration
              </Text>
              <Text style={[styles.formHint, { color: colors.textMuted }]}>
                Pre-configures period weight so your course cards stay clean.
              </Text>

              <View style={styles.weightGrid}>
                {SESSION_WEIGHT_OPTIONS.map((opt) => {
                  const isSelected = newSubPeriodWeight === opt.weight;
                  return (
                    <TouchableOpacity
                      key={opt.weight}
                      activeOpacity={0.75}
                      onPress={() => setNewSubPeriodWeight(opt.weight)}
                      style={[
                        styles.weightCard,
                        {
                          backgroundColor: isSelected ? colors.primary + "15" : colors.secondary,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={16}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.weightCardTitle,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={[styles.weightCardSub, { color: colors.textMuted }]}>
                        {opt.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.numbersRow}>
                <Input
                  label="Classes Attended"
                  value={newSubAttended}
                  onChangeText={setNewSubAttended}
                  placeholder="0"
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Total Classes Held"
                  value={newSubTotal}
                  onChangeText={setNewSubTotal}
                  placeholder="0"
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <View style={styles.modalButtonsRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsAddModalOpen(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Save Subject"
                  variant="default"
                  onPress={handleSaveSubject}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Subject Modal */}
      {editingSub && (
        <Modal visible={isEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsEditModalOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subject</Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Input
                  label="Subject Name"
                  value={editingSub.name}
                  onChangeText={(val) => setEditingSub({ ...editingSub, name: val })}
                  containerStyle={{ marginBottom: 12 }}
                />

                <Input
                  label="Course Code"
                  value={editingSub.code}
                  onChangeText={(val) => setEditingSub({ ...editingSub, code: val })}
                  containerStyle={{ marginBottom: 14 }}
                />

                {/* Session Duration Selector in Edit Modal */}
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Session Duration
                </Text>
                <View style={styles.weightGrid}>
                  {SESSION_WEIGHT_OPTIONS.map((opt) => {
                    const isSelected = (editingSub.periodWeight || 1) === opt.weight;
                    return (
                      <TouchableOpacity
                        key={opt.weight}
                        activeOpacity={0.75}
                        onPress={() => setEditingSub({ ...editingSub, periodWeight: opt.weight })}
                        style={[
                          styles.weightCard,
                          {
                            backgroundColor: isSelected ? colors.primary + "15" : colors.secondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon as any}
                          size={16}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.weightCardTitle,
                            {
                              color: isSelected ? colors.primary : colors.text,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={[styles.weightCardSub, { color: colors.textMuted }]}>
                          {opt.subtitle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.numbersRow}>
                  <Input
                    label="Attended"
                    value={editingSub.attended.toString()}
                    onChangeText={(val) =>
                      setEditingSub({ ...editingSub, attended: parseInt(val || "0", 10) || 0 })
                    }
                    keyboardType="number-pad"
                    containerStyle={{ flex: 1, marginRight: 8 }}
                  />
                  <Input
                    label="Total Held"
                    value={editingSub.total.toString()}
                    onChangeText={(val) =>
                      setEditingSub({ ...editingSub, total: parseInt(val || "0", 10) || 0 })
                    }
                    keyboardType="number-pad"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsEditModalOpen(false)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Save Changes"
                    variant="default"
                    onPress={handleUpdateSubject}
                    style={{ flex: 1 }}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    paddingBottom: 32,
    gap: 16,
  },
  sliderCard: {
    padding: 16,
  },
  sliderHeader: {
    marginBottom: 8,
  },
  badgeRow: {
    marginBottom: 6,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sliderSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  aggregateCard: {
    padding: 16,
  },
  aggregateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aggLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aggPercentage: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  aggHeld: {
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
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  subName: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subStats: {
    fontSize: 11,
    marginTop: 3,
  },
  cardActionIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  adviceText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  logButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  formHint: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },
  weightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  weightCard: {
    width: "48%",
    flexGrow: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  weightCardTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  weightCardSub: {
    fontSize: 10,
    marginTop: 1,
  },
  numbersRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: "row",
    marginTop: 8,
  },
});
