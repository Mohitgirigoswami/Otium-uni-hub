import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick live metrics
  const [attendanceData, setAttendanceData] = useState<{
    percentage: number;
    attended: number;
    total: number;
    criticalCount: number;
  }>({ percentage: 0, attended: 0, total: 0, criticalCount: 0 });

  const [recentWhisper, setRecentWhisper] = useState<any | null>(null);

  const loadDashboardData = async () => {
    // 1. Try loading cached attendance
    try {
      const cached = await AsyncStorage.getItem("@otium_attendance_subjects");
      if (cached) {
        const subjects = JSON.parse(cached);
        if (Array.isArray(subjects) && subjects.length > 0) {
          const tot = subjects.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
          const att = subjects.reduce((sum: number, s: any) => sum + (s.attended || 0), 0);
          const pct = tot > 0 ? (att / tot) * 100 : 100;
          const crit = subjects.filter((s: any) => (s.total > 0 ? (s.attended / s.total) * 100 < 75 : false)).length;
          setAttendanceData({ percentage: pct, attended: att, total: tot, criticalCount: crit });
        }
      }
    } catch {}

    // 2. Fetch fresh attendance from backend (with offline reconciliation)
    try {
      let syncPayload: any[] = [];
      const cached = await AsyncStorage.getItem("@otium_attendance_subjects");
      if (cached) {
        try {
          syncPayload = JSON.parse(cached);
        } catch {}
      }

      const attRes = await apiClient.post("/attendance", {
        action: "SYNC_OFFLINE",
        subjects: syncPayload,
      });

      if (attRes.success && Array.isArray(attRes.data) && attRes.data.length > 0) {
        const subjects = attRes.data;
        const tot = subjects.reduce((sum: number, s: any) => sum + (s.totalClasses || 0), 0);
        const att = subjects.reduce((sum: number, s: any) => sum + (s.attendedClasses || 0), 0);
        const pct = tot > 0 ? (att / tot) * 100 : 100;
        const crit = subjects.filter((s: any) => (s.totalClasses > 0 ? (s.attendedClasses / s.totalClasses) * 100 < 75 : false)).length;
        setAttendanceData({ percentage: pct, attended: att, total: tot, criticalCount: crit });

        const mapped = subjects.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code || "SUB",
          attended: s.attendedClasses ?? 0,
          total: s.totalClasses ?? 0,
          periodWeight: s.periodWeight ?? 1,
        }));
        await AsyncStorage.setItem("@otium_attendance_subjects", JSON.stringify(mapped));
      }
    } catch {}

    // 3. Fetch fresh whisper preview
    try {
      const whisperRes = await apiClient.get("/incognito?scope=CAMPUS");
      if (whisperRes.success && Array.isArray(whisperRes.data) && whisperRes.data.length > 0) {
        setRecentWhisper(whisperRes.data[0]);
      }
    } catch {}
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboardData(), refreshUser()]);
    setIsRefreshing(false);
  };

  const displayName = user?.name ? user.name.split(" ")[0] : "Student";
  const campusName = user?.college?.name || "DTU Campus";
  const isSafeAttendance = attendanceData.percentage >= 75;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.brand[400]} />
      }
    >
      {/* Welcome Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Image source={require("../../assets/logo.png")} style={styles.heroLogo} resizeMode="contain" />
            <Text style={styles.heroBadgeText}>Otium University Hub</Text>
          </View>
          <Badge variant="brand" size="sm">
            {campusName}
          </Badge>
        </View>

        <Text style={styles.heroGreeting}>Welcome back, {displayName}!</Text>
        <Text style={styles.heroSubtitle}>
          {user?.department ? `${user.department} • Year ${user.year || 1}` : "Campus Command Center"}
        </Text>
        <Text style={styles.heroDesc}>
          Your academic guardrails, print station orders, anonymous whisper wall, and grade calculators are synced live.
        </Text>
      </View>

      {/* Quick Launch Command Bar (Fast Module Access) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Campus Quick Launch</Text>
      </View>

      <View style={styles.quickGrid}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Attendance")}
          style={[styles.quickTile, styles.tileAttendance]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
            <Ionicons name="calendar" size={22} color={colors.emerald[400]} />
          </View>
          <Text style={styles.tileTitle}>Attendance</Text>
          <Text style={styles.tileDesc}>Bunk calculator & guardrails</Text>
          <View style={styles.tileBadgeRow}>
            <Text
              style={[
                styles.tileMetric,
                { color: isSafeAttendance ? colors.emerald[400] : colors.rose[400] },
              ]}
            >
              {attendanceData.percentage.toFixed(1)}%
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Print")}
          style={[styles.quickTile, styles.tilePrint]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: "rgba(20, 184, 166, 0.2)" }]}>
            <Feather name="printer" size={22} color={colors.brand[400]} />
          </View>
          <Text style={styles.tileTitle}>Print Station</Text>
          <Text style={styles.tileDesc}>Instant file upload & UPI</Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: colors.brand[400] }]}>Ready</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Whispers")}
          style={[styles.quickTile, styles.tileWhispers]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: "rgba(139, 92, 246, 0.2)" }]}>
            <Ionicons name="eye-off" size={22} color="#A78BFA" />
          </View>
          <Text style={styles.tileTitle}>Whisper Wall</Text>
          <Text style={styles.tileDesc}>Anonymous campus memes</Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: "#A78BFA" }]}>Live Feed</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CGPA")}
          style={[styles.quickTile, styles.tileCgpa]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.2)" }]}>
            <MaterialCommunityIcons name="calculator-variant" size={22} color="#FBBF24" />
          </View>
          <Text style={styles.tileTitle}>CGPA Predictor</Text>
          <Text style={styles.tileDesc}>Semester transcript & SGPA</Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: "#FBBF24" }]}>Forecaster</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Live Academic Guardrail Status Card */}
      <GlassCard style={styles.statusCard}>
        <View style={styles.statusCardHeader}>
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={isSafeAttendance ? "shield-checkmark" : "warning"}
              size={20}
              color={isSafeAttendance ? colors.emerald[400] : colors.rose[400]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>75% Minimum Attendance Status</Text>
            <Text style={styles.statusSubtitle}>
              {isSafeAttendance
                ? "You are safely above the university exam eligibility requirement."
                : "Warning: Critical courses below 75% threshold. Attend next lectures!"}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Aggregate Rate</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: isSafeAttendance ? colors.emerald[400] : colors.rose[400] },
              ]}
            >
              {attendanceData.percentage.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Total Classes</Text>
            <Text style={[styles.kpiValue, { color: "#FFFFFF" }]}>
              {attendanceData.attended}/{attendanceData.total}
            </Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>At Risk Courses</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: attendanceData.criticalCount > 0 ? colors.rose[400] : colors.emerald[400] },
              ]}
            >
              {attendanceData.criticalCount}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Attendance")}
          style={styles.actionRowBtn}
        >
          <Text style={styles.actionRowBtnText}>Open Full Attendance Guardrails</Text>
          <Feather name="arrow-right" size={14} color={colors.brand[400]} />
        </TouchableOpacity>
      </GlassCard>

      {/* Community Whisper Spotlight */}
      {recentWhisper && (
        <GlassCard style={styles.whisperPreviewCard}>
          <View style={styles.whisperPreviewHeader}>
            <View style={styles.whisperMetaRow}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={styles.whisperBadgeText}>Trending Campus Whisper</Text>
            </View>
            <Badge variant="neutral" size="sm">
              {recentWhisper.category || "CONFESSION"}
            </Badge>
          </View>

          <Text style={styles.whisperContent} numberOfLines={3}>
            "{recentWhisper.content}"
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Whispers")}
            style={styles.whisperViewBtn}
          >
            <Text style={styles.whisperViewBtnText}>Join the Conversation on Whisper Wall</Text>
            <Feather name="message-circle" size={14} color="#A78BFA" />
          </TouchableOpacity>
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
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroLogo: {
    width: 22,
    height: 22,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand[400],
    letterSpacing: 0.2,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand[300],
    marginTop: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: colors.slate[300],
    marginTop: 8,
    lineHeight: 18,
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickTile: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  tileAttendance: {
    borderLeftWidth: 3,
    borderLeftColor: colors.emerald[400],
  },
  tilePrint: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand[400],
  },
  tileWhispers: {
    borderLeftWidth: 3,
    borderLeftColor: "#A78BFA",
  },
  tileCgpa: {
    borderLeftWidth: 3,
    borderLeftColor: "#FBBF24",
  },
  tileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tileDesc: {
    fontSize: 10.5,
    color: colors.slate[400],
  },
  tileBadgeRow: {
    marginTop: 8,
  },
  tileMetric: {
    fontSize: 13,
    fontWeight: "900",
  },
  statusCard: {
    padding: 18,
    gap: 14,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statusSubtitle: {
    fontSize: 11.5,
    color: colors.slate[400],
    marginTop: 2,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  actionRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  actionRowBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand[400],
  },
  whisperPreviewCard: {
    padding: 16,
    gap: 10,
  },
  whisperPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  whisperMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  whisperBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F97316",
  },
  whisperContent: {
    fontSize: 12.5,
    color: colors.slate[200],
    lineHeight: 18,
    fontStyle: "italic",
  },
  whisperViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  whisperViewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A78BFA",
  },
});
