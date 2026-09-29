import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  PanResponder,
  Vibration,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { CircularProgress } from "../../components/CircularProgress";
import { ClientServiceGuard } from "../../components/ClientServiceGuard";
import { apiClient } from "../../services/apiClient";

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

const SESSION_WEIGHT_OPTIONS = [
  { weight: 1, label: "1h Lecture", subtitle: "1 period weight (+1)", icon: "book-outline" },
  { weight: 2, label: "2h Tutorial", subtitle: "2 periods weight (+2)", icon: "flask-outline" },
  { weight: 3, label: "3h Lab", subtitle: "3 periods weight (+3)", icon: "hardware-chip-outline" },
  { weight: 4, label: "4h Workshop", subtitle: "4 periods weight (+4)", icon: "construct-outline" },
];

function SwipeableSubjectCardItem({
  sub,
  advice,
  isDanger,
  weight,
  isPunching,
  punchType,
  punchScale,
  colors,
  targetPercentage,
  onLog,
  onEdit,
  onDelete,
}: {
  sub: SubjectItem;
  advice: any;
  isDanger: boolean;
  weight: number;
  isPunching: boolean;
  punchType: "PRESENT" | "ABSENT" | null;
  punchScale: Animated.Value;
  colors: any;
  targetPercentage: number;
  onLog: (id: string, attended: boolean, weight: number) => void;
  onEdit: (sub: SubjectItem) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 15 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        pan.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 70) {
          Vibration.vibrate(45);
          onLog(sub.id, true, weight);
          Animated.spring(pan, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        } else if (gesture.dx < -70) {
          Vibration.vibrate(45);
          onLog(sub.id, false, weight);
          Animated.spring(pan, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        } else {
          Animated.spring(pan, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={styles.swipeCardContainer}>
      {/* Background reveals on swipe */}
      <View style={styles.swipeUnderlay}>
        <View style={[styles.swipeActionLeft, { backgroundColor: colors.success + "20" }]}>
          <Feather name="check-circle" size={20} color={colors.success} />
          <Text style={[styles.swipeActionText, { color: colors.success }]}>+ Present</Text>
        </View>
        <View style={[styles.swipeActionRight, { backgroundColor: colors.destructive + "20" }]}>
          <Text style={[styles.swipeActionText, { color: colors.destructive }]}>+ Absent</Text>
          <Feather name="x-circle" size={20} color={colors.destructive} />
        </View>
      </View>

      {/* Draggable Foreground Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [
            { translateX: pan },
            { scale: isPunching ? punchScale : 1 },
          ],
        }}
      >
        <Card
          style={[
            styles.subjectCard,
            isDanger && { borderColor: colors.destructive + "50" },
            isPunching && {
              borderColor: punchType === "PRESENT" ? colors.success : colors.destructive,
            },
          ]}
        >
          {/* Card Header: Subject name, code badge, weight badge, and edit/delete icons */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.subName, { color: colors.text }]} numberOfLines={1}>
                  {sub.name}
                </Text>
                <Badge variant="default" size="sm">
                  {sub.code}
                </Badge>
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
                onPress={() => onEdit(sub)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtn}
              >
                <Feather name="edit-2" size={14} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onDelete(sub.id, sub.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconBtn}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance Rate & Advice */}
          <View style={styles.rateRow}>
            <Text style={[styles.adviceText, { color: isDanger ? colors.destructive : colors.primary }]}>
              {advice.text}
            </Text>
            <Text
              style={[
                styles.rateValue,
                { color: isDanger ? colors.destructive : colors.primary },
              ]}
            >
              {advice.percentage}%
            </Text>
          </View>

          {/* Progress Line with Target Marker Pin */}
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, parseFloat(advice.percentage))}%`,
                  backgroundColor: isDanger ? colors.destructive : colors.primary,
                },
              ]}
            />
            {/* Target Marker Pin */}
            <View
              style={[
                styles.thresholdPin,
                {
                  left: `${targetPercentage}%`,
                  backgroundColor: colors.textSecondary,
                },
              ]}
            />
          </View>

          {/* Optimistic Flash Feedback Indicator */}
          {isPunching && (
            <View
              style={[
                styles.punchFeedbackBadge,
                {
                  backgroundColor:
                    punchType === "PRESENT" ? colors.success + "18" : colors.destructive + "18",
                  borderColor:
                    punchType === "PRESENT" ? colors.success : colors.destructive,
                },
              ]}
            >
              <Ionicons
                name={punchType === "PRESENT" ? "checkmark-circle" : "close-circle"}
                size={14}
                color={punchType === "PRESENT" ? colors.success : colors.destructive}
              />
              <Text
                style={[
                  styles.punchFeedbackText,
                  {
                    color: punchType === "PRESENT" ? colors.success : colors.destructive,
                  },
                ]}
              >
                {punchType === "PRESENT"
                  ? `+${weight} Period(s) Logged Present!`
                  : `+${weight} Period(s) Logged Absent!`}
              </Text>
            </View>
          )}

          {/* Clean Log Attendance Action Buttons (Uncluttered: without (3h)) */}
          <View style={styles.logButtonsRow}>
            <Button
              title="+ Present"
              variant="outline"
              size="sm"
              onPress={() => onLog(sub.id, true, weight)}
              leftIcon={<Feather name="check" size={13} color={colors.success} />}
              style={{ flex: 1, borderColor: colors.success + "40" }}
              textStyle={{ color: colors.success }}
            />

            <Button
              title="+ Absent"
              variant="outline"
              size="sm"
              onPress={() => onLog(sub.id, false, weight)}
              leftIcon={<Feather name="x" size={13} color={colors.destructive} />}
              style={{ flex: 1, borderColor: colors.destructive + "40" }}
              textStyle={{ color: colors.destructive }}
            />
          </View>

          <Text style={[styles.swipeHint, { color: colors.textMuted }]}>
            👉 Swipe right to mark present • 👈 Swipe left to mark absent
          </Text>
        </Card>
      </Animated.View>
    </View>
  );
}

export function AttendanceScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Tactile optimistic feedback animation states
  const [punchId, setPunchId] = useState<string | null>(null);
  const [punchType, setPunchType] = useState<"PRESENT" | "ABSENT" | null>(null);
  const punchScale = useRef(new Animated.Value(1)).current;

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

  // Flush offline pending queue with fast timeout
  const flushOfflineSyncQueue = async () => {
    try {
      const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: any[] = [];
      for (const item of queue) {
        try {
          await apiClient.post("/attendance", { ...item, userId: user?.id }, { timeoutMs: 2500 });
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
    const activeUserId = user?.id;

    try {
      const res = await apiClient.post(
        "/attendance",
        {
          action: "SYNC_OFFLINE",
          userId: activeUserId,
          subjects: activeList,
        },
        { timeoutMs: 3500 }
      );

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
        await AsyncStorage.removeItem(STORAGE_KEY_SYNC_QUEUE);
      } else {
        const fallbackRes = await apiClient.get(
          activeUserId ? `/attendance?userId=${activeUserId}` : "/attendance",
          { timeoutMs: 3500 }
        );
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

  // Re-sync immediately once user auth token restores
  useEffect(() => {
    if (user?.id) {
      syncWithBackend();
    }
  }, [user?.id]);

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

    // 1. Trigger tactile punch micro-animation
    setPunchId(id);
    setPunchType(attended ? "PRESENT" : "ABSENT");
    Animated.sequence([
      Animated.timing(punchScale, { toValue: 0.94, duration: 70, useNativeDriver: true }),
      Animated.spring(punchScale, { toValue: 1.04, friction: 3, tension: 140, useNativeDriver: true }),
      Animated.timing(punchScale, { toValue: 1.0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        setPunchId((curr) => (curr === id ? null : curr));
        setPunchType(null);
      }, 1000);
    });

    // 2. Immediately update local state & disk storage (0ms offline responsiveness!)
    setSubjects(updated);
    AsyncStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated)).catch(() => {});

    // 3. Queue or dispatch to server
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
    <ClientServiceGuard serviceKey="ATTENDANCE">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* 1. Threshold Control Card with Numeric Stepper & Presets */}
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

          {/* Numeric Stepper [-] [ 75% ] [+] */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={() => handleTargetChange(Math.max(50, targetPercentage - 5))}
                style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={18} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        "Custom Target %",
                        "Enter required attendance target percentage (50-95%):",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Apply",
                            onPress: (val?: string) => {
                              const num = parseInt(val || "75", 10);
                              if (!isNaN(num) && num >= 50 && num <= 95) handleTargetChange(num);
                            },
                          },
                        ],
                        "plain-text",
                        targetPercentage.toString()
                      )
                    : null;
                }}
                style={[
                  styles.targetDisplay,
                  { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.targetValueText, { color: colors.primary }]}>
                  {targetPercentage}%
                </Text>
                <Text style={[styles.targetSubtitle, { color: colors.textMuted }]}>
                  Min Requirement
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleTargetChange(Math.min(95, targetPercentage + 5))}
                style={[styles.stepBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Preset Chips */}
            <View style={styles.presetsRow}>
              {[
                { label: "65% Medical", val: 65 },
                { label: "75% Standard", val: 75 },
                { label: "80% Strict", val: 80 },
                { label: "85% Honors", val: 85 },
                { label: "90% Dean's List", val: 90 },
              ].map((preset) => {
                const isSelected = targetPercentage === preset.val;
                return (
                  <TouchableOpacity
                    key={preset.val}
                    onPress={() => handleTargetChange(preset.val)}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.secondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isSelected ? colors.primaryForeground : colors.textMuted,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
                    color: aggregatePercentage >= targetPercentage ? colors.primary : colors.destructive,
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
              variant={aggregatePercentage >= targetPercentage ? "primary" : "destructive"}
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

        {/* 4. Subject Cards List with Swipe Gestures */}
        {subjects.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="calendar-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Monitored Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add your enrolled courses to start tracking attendance, calculate safe bunk quotas, and receive smart lecture recovery alerts.
            </Text>
            <Button
              title="Add Your First Subject"
              size="md"
              onPress={() => setIsAddModalOpen(true)}
              leftIcon={<Ionicons name="add" size={18} color={colors.primaryForeground} />}
              style={{ marginTop: 8 }}
            />
          </Card>
        ) : (
          <View style={styles.subjectList}>
            {subjects.map((sub) => {
              const advice = calculateAdvice(sub.attended, sub.total);
              const isDanger = !advice.isSafe;
              const weight = sub.periodWeight || 1;
              const isPunching = punchId === sub.id;

              return (
                <SwipeableSubjectCardItem
                  key={sub.id}
                  sub={sub}
                  advice={advice}
                  isDanger={isDanger}
                  weight={weight}
                  isPunching={isPunching}
                  punchType={punchType}
                  punchScale={punchScale}
                  colors={colors}
                  targetPercentage={targetPercentage}
                  onLog={handleLogAttendance}
                  onEdit={(s) => {
                    setEditingSub({ ...s });
                    setIsEditModalOpen(true);
                  }}
                  onDelete={handleDeleteSubject}
                />
              );
            })}
          </View>
        )}

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
    </ClientServiceGuard>
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
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    marginVertical: 12,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 260,
  },
  punchFeedbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "center",
    marginBottom: 10,
  },
  punchFeedbackText: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepperContainer: {
    marginTop: 8,
    gap: 10,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  targetDisplay: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  targetValueText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  targetSubtitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: -2,
    textTransform: "uppercase",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 10,
  },
  swipeCardContainer: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
  },
  swipeUnderlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 14,
  },
  swipeActionLeft: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 18,
  },
  swipeActionRight: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingRight: 18,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  swipeHint: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
  },
  thresholdPin: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
});
