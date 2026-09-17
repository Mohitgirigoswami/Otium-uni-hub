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
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useUser();
  const { colors, isDark } = useTheme();
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

    // 2. Fetch fresh attendance from backend
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
      }
    } catch {}

    // 3. Fetch latest whisper
    try {
      const whisperRes = await apiClient.get("/incognito?limit=1");
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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* 1. Welcome Hero Greeting Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={[styles.heroBadgeText, { color: colors.textSecondary }]}>
              Otium Uni Hub
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Badge variant="primary" size="sm">
              {campusName}
            </Badge>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Messages")}
              style={[
                styles.heroMsgBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="message-square" size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.heroGreeting, { color: colors.text }]}>
          Welcome back, {displayName}!
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.primary }]}>
          {user?.department ? `${user.department} • Year ${user.year || 1}` : "Campus Operations"}
        </Text>
        <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
          Your academic guardrails, print station orders, anonymous whisper wall, and grade calculators are synced live.
        </Text>
      </Card>

      {/* 2. Quick Launch Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Campus Portals
        </Text>
      </View>

      <View style={styles.quickGrid}>
        {/* Attendance Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Attendance")}
          style={[
            styles.quickTile,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="calendar" size={20} color={colors.success} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Attendance</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>
            Bunk calculator & rules
          </Text>
          <View style={styles.tileBadgeRow}>
            <Text
              style={[
                styles.tileMetric,
                { color: isSafeAttendance ? colors.success : colors.destructive },
              ]}
            >
              {attendanceData.percentage.toFixed(1)}%
            </Text>
          </View>
        </TouchableOpacity>

        {/* Print Station Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Print")}
          style={[
            styles.quickTile,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="printer" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Print Station</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>
            Hostel drop-off orders
          </Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: colors.primary }]}>Active</Text>
          </View>
        </TouchableOpacity>

        {/* Whisper Wall Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Whispers")}
          style={[
            styles.quickTile,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.accent + "30" }]}>
            <Ionicons name="eye-off" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Whisper Wall</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>
            Anonymous student board
          </Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: colors.textSecondary }]}>Live Feed</Text>
          </View>
        </TouchableOpacity>

        {/* CGPA Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CGPA")}
          style={[
            styles.quickTile,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.warning + "20" }]}>
            <MaterialCommunityIcons name="calculator-variant" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>CGPA Forecaster</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>
            Semester transcript & SGPA
          </Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: colors.warning }]}>Forecaster</Text>
          </View>
        </TouchableOpacity>

        {/* Messages & DMs Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Messages")}
          style={[
            styles.quickTile,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="message-circle" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Messages & DMs</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>
            Direct chat & print updates
          </Text>
          <View style={styles.tileBadgeRow}>
            <Text style={[styles.tileMetric, { color: colors.primary }]}>Dual Inbox</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Live Academic Guardrail Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusCardHeader}>
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={isSafeAttendance ? "shield-checkmark" : "warning"}
              size={18}
              color={isSafeAttendance ? colors.success : colors.destructive}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.statusCardTitle, { color: colors.text }]}>
              {isSafeAttendance ? "Attendance Status Safe" : "Attendance Under Target"}
            </Text>
            <Text style={[styles.statusCardSubtitle, { color: colors.textMuted }]}>
              {attendanceData.criticalCount > 0
                ? `${attendanceData.criticalCount} course(s) require recovery lectures`
                : "All tracked courses meet minimum safety guidelines"}
            </Text>
          </View>
          <Badge variant={isSafeAttendance ? "success" : "destructive"} size="sm">
            {attendanceData.percentage.toFixed(0)}%
          </Badge>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(Math.max(attendanceData.percentage, 0), 100)}%`,
                backgroundColor: isSafeAttendance ? colors.success : colors.destructive,
              },
            ]}
          />
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
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    padding: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroLogo: {
    width: 18,
    height: 18,
  },
  heroMsgBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickTile: {
    width: "48%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  tileDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  tileBadgeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileMetric: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusCard: {
    padding: 16,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusCardSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
});
