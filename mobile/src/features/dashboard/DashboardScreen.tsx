import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useUser();
  const { colors } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Metrics
  const [attendanceData, setAttendanceData] = useState<{
    percentage: number;
    attended: number;
    total: number;
    criticalCount: number;
  }>({ percentage: 0, attended: 0, total: 0, criticalCount: 0 });

  const [activePrintsCount, setActivePrintsCount] = useState<number>(0);
  const [openTasksCount, setOpenTasksCount] = useState<number>(0);
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);
  const [recentWhisper, setRecentWhisper] = useState<any | null>(null);
  const [unreadWhispersCount, setUnreadWhispersCount] = useState<number>(0);

  const STORAGE_KEY_DASHBOARD_SNAPSHOT = "@otium_cached_dashboard_snapshot";

  const calculateUnreadWhispers = async (conversationsList?: any[]) => {
    try {
      let list = conversationsList;
      if (!list) {
        const cachedRaw = await AsyncStorage.getItem("@otium_cached_conversations");
        if (cachedRaw) list = JSON.parse(cachedRaw);
      }
      if (!Array.isArray(list)) return;

      const readRaw = await AsyncStorage.getItem("@otium_read_whispers");
      const readMap = readRaw ? JSON.parse(readRaw) : {};

      const unreadCount = list.filter((c: any) => {
        if (!c.isAnonymousChat) return false;
        const latestMsg = c.messages?.[0];
        if (!latestMsg || latestMsg.isMine) return false;
        const lastRead = readMap[c.id] || 0;
        return new Date(latestMsg.createdAt).getTime() > lastRead;
      }).length;

      setUnreadWhispersCount(unreadCount);
    } catch {}
  };

  const loadDashboardData = async () => {
    // 0. Load cached dashboard snapshot for immediate offline render
    try {
      const snapRaw = await AsyncStorage.getItem(STORAGE_KEY_DASHBOARD_SNAPSHOT);
      if (snapRaw) {
        const snap = JSON.parse(snapRaw);
        if (snap) {
          if (snap.attendanceData) setAttendanceData(snap.attendanceData);
          if (typeof snap.activePrintsCount === "number") setActivePrintsCount(snap.activePrintsCount);
          if (typeof snap.openTasksCount === "number") setOpenTasksCount(snap.openTasksCount);
          if (typeof snap.activeListingsCount === "number") setActiveListingsCount(snap.activeListingsCount);
          if (snap.recentWhisper) setRecentWhisper(snap.recentWhisper);
        }
      }
    } catch {}

    calculateUnreadWhispers();

    // 1. Attendance cached & live fetch
    let latestAttendance = attendanceData;
    try {
      const cached = await AsyncStorage.getItem("@otium_attendance_subjects");
      if (cached) {
        const subjects = JSON.parse(cached);
        if (Array.isArray(subjects) && subjects.length > 0) {
          const tot = subjects.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
          const att = subjects.reduce((sum: number, s: any) => sum + (s.attended || 0), 0);
          const pct = tot > 0 ? (att / tot) * 100 : 100;
          const crit = subjects.filter((s: any) => (s.total > 0 ? (s.attended / s.total) * 100 < 75 : false)).length;
          latestAttendance = { percentage: pct, attended: att, total: tot, criticalCount: crit };
          setAttendanceData(latestAttendance);
        }
      }
    } catch {}

    // 2. Parallel background fetch for all dashboard metrics (attendance, prints, gigs, marketplace, whisper, chat)
    let syncPayload: any[] = [];
    try {
      const cached = await AsyncStorage.getItem("@otium_attendance_subjects");
      if (cached) syncPayload = JSON.parse(cached);
    } catch {}

    const printUrl = user?.id ? `/print/order?userId=${encodeURIComponent(user.id)}` : "/print/order";

    const [attSettled, printSettled, gigsSettled, marketSettled, whisperSettled, chatSettled] = await Promise.allSettled([
      apiClient.post("/attendance", { action: "SYNC_OFFLINE", subjects: syncPayload }),
      apiClient.get(printUrl),
      apiClient.get("/gigs?status=OPEN"),
      apiClient.get("/marketplace?status=AVAILABLE"),
      apiClient.get("/incognito?limit=1"),
      apiClient.get("/chat"),
    ]);

    let printsCount = activePrintsCount;
    let gigsCount = openTasksCount;
    let marketCount = activeListingsCount;
    let latestWhisper = recentWhisper;

    if (attSettled.status === "fulfilled" && attSettled.value.success && Array.isArray(attSettled.value.data) && attSettled.value.data.length > 0) {
      const subjects = attSettled.value.data;
      const tot = subjects.reduce((sum: number, s: any) => sum + (s.totalClasses || 0), 0);
      const att = subjects.reduce((sum: number, s: any) => sum + (s.attendedClasses || 0), 0);
      const pct = tot > 0 ? (att / tot) * 100 : 100;
      const crit = subjects.filter((s: any) => (s.totalClasses > 0 ? (s.attendedClasses / s.totalClasses) * 100 < 75 : false)).length;
      latestAttendance = { percentage: pct, attended: att, total: tot, criticalCount: crit };
      setAttendanceData(latestAttendance);
    }

    if (printSettled.status === "fulfilled" && printSettled.value.success && Array.isArray(printSettled.value.data)) {
      printsCount = printSettled.value.data.filter((o: any) => o.status !== "DELIVERED" && o.status !== "REJECTED" && o.status !== "CANCELLED").length;
      setActivePrintsCount(printsCount);
    }

    if (gigsSettled.status === "fulfilled" && gigsSettled.value.success && Array.isArray(gigsSettled.value.data)) {
      gigsCount = gigsSettled.value.data.length;
      setOpenTasksCount(gigsCount);
    }

    if (marketSettled.status === "fulfilled" && marketSettled.value.success && Array.isArray(marketSettled.value.data)) {
      marketCount = marketSettled.value.data.length;
      setActiveListingsCount(marketCount);
    }

    if (whisperSettled.status === "fulfilled" && whisperSettled.value.success && Array.isArray(whisperSettled.value.data) && whisperSettled.value.data.length > 0) {
      latestWhisper = whisperSettled.value.data[0];
      setRecentWhisper(latestWhisper);
    }

    if (chatSettled.status === "fulfilled" && chatSettled.value.success && Array.isArray(chatSettled.value.data)) {
      AsyncStorage.setItem("@otium_cached_conversations", JSON.stringify(chatSettled.value.data)).catch(() => {});
      calculateUnreadWhispers(chatSettled.value.data);
    }

    // Save full snapshot for offline instant load
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_DASHBOARD_SNAPSHOT,
        JSON.stringify({
          attendanceData: latestAttendance,
          activePrintsCount: printsCount,
          openTasksCount: gigsCount,
          activeListingsCount: marketCount,
          recentWhisper: latestWhisper,
        })
      );
    } catch {}
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      calculateUnreadWhispers();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboardData(), refreshUser()]);
    setIsRefreshing(false);
  };

  const displayName = user?.name ? user.name.split(" ")[0] : "Student";
  const campusName = user?.college?.name || "JCBOSEUST, YMCA";
  const isSafeAttendance = attendanceData.percentage >= 75;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Top Header Row with Whisper DMs on the TOP LEFT SIDE with Unread Marker */}
      <View style={styles.topBarRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Messages", { initialTab: "whisper" })}
          style={[
            styles.topWhisperDmBtn,
            {
              backgroundColor: colors.card,
              borderColor: unreadWhispersCount > 0 ? colors.primary : colors.border,
            },
          ]}
        >
          <View style={[styles.whisperIconBadge, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="eye-off" size={15} color={colors.primary} />
          </View>
          <Text style={[styles.topWhisperDmText, { color: colors.text }]}>Whisper DMs</Text>
          {unreadWhispersCount > 0 ? (
            <View style={[styles.unreadBadgePill, { backgroundColor: colors.destructive }]}>
              <Text style={styles.unreadBadgePillText}>{unreadWhispersCount}</Text>
            </View>
          ) : (
            <View style={[styles.liveDotMarker, { backgroundColor: colors.success }]} />
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge variant="primary" size="sm">
            {campusName}
          </Badge>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Messages", { initialTab: "direct" })}
            style={[
              styles.heroMsgBtn,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Feather name="message-square" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Header Greeting Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={[styles.heroBadgeText, { color: colors.textSecondary }]}>
              Otium Uni Hub
            </Text>
          </View>
        </View>

        <Text style={[styles.heroGreeting, { color: colors.text }]}>
          Welcome back, {displayName}
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.primary }]}>
          {user?.department ? `${user.department} • Year ${user.year || 1}` : "Campus Operations"}
        </Text>
        <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
          Your academic guardrails, print station orders, anonymous whisper wall, and campus utilities are synced live.
        </Text>

        {/* Quick action buttons */}
        <View style={styles.heroActionRow}>
          <Button
            title="New Print Job"
            variant="default"
            size="sm"
            onPress={() => navigation.navigate("Print")}
            style={{ flex: 1 }}
          />
          <Button
            title="Check Attendance"
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate("Attendance")}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      {/* 2. Operational Metrics Overview (4 Web-like Stat Cards) */}
      <View style={styles.metricsGrid}>
        {/* Pending Prints */}
        <Card style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Pending Prints</Text>
            <Feather name="printer" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {activePrintsCount}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>Active queue</Text>
        </Card>

        {/* Attendance Safety */}
        <Card style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Attendance</Text>
            <Ionicons
              name={isSafeAttendance ? "shield-checkmark" : "warning"}
              size={14}
              color={isSafeAttendance ? colors.success : colors.destructive}
            />
          </View>
          <Text
            style={[
              styles.metricValue,
              { color: isSafeAttendance ? colors.success : colors.destructive },
            ]}
          >
            {attendanceData.percentage.toFixed(0)}%
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>
            {isSafeAttendance ? "Safe standing" : "Under quota"}
          </Text>
        </Card>

        {/* Open Gigs */}
        <Card style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Open Tasks</Text>
            <MaterialCommunityIcons name="briefcase-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {openTasksCount}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>Campus bounties</Text>
        </Card>

        {/* Campus Listings */}
        <Card style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Classifieds</Text>
            <Feather name="shopping-bag" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {activeListingsCount}
          </Text>
          <Text style={[styles.metricHint, { color: colors.textMuted }]}>Student items</Text>
        </Card>
      </View>

      {/* 3. Live Academic Guardrail Progress Card */}
      <Card style={styles.guardrailCard}>
        <View style={styles.guardrailHeader}>
          <View style={[styles.guardrailIconWrap, { backgroundColor: (isSafeAttendance ? colors.success : colors.destructive) + "18" }]}>
            <Ionicons
              name={isSafeAttendance ? "shield-checkmark" : "warning"}
              size={16}
              color={isSafeAttendance ? colors.success : colors.destructive}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.guardrailTitle, { color: colors.text }]}>
              {isSafeAttendance ? "Attendance Status Safe" : "Attendance Under Target"}
            </Text>
            <Text style={[styles.guardrailSubtitle, { color: colors.textMuted }]}>
              {attendanceData.criticalCount > 0
                ? `${attendanceData.criticalCount} course(s) require recovery lectures`
                : "All tracked courses meet minimum safety guidelines"}
            </Text>
          </View>
          <Badge variant={isSafeAttendance ? "success" : "destructive"} size="sm">
            {attendanceData.percentage.toFixed(1)}%
          </Badge>
        </View>

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

      {/* 4. Campus Portals Launcher Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Campus Portals</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>All student utilities</Text>
      </View>

      <View style={styles.quickGrid}>
        {/* Attendance */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Attendance")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Attendance</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Bunk rules & offline sync</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: isSafeAttendance ? colors.success : colors.destructive }]}>
              {attendanceData.percentage.toFixed(0)}%
            </Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Express Print Station */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Print")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Feather name="printer" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Print Station</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Hostel delivery & tracking</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Express</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Whisper Wall */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Whispers")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="eye-off" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Whisper Wall</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Anonymous campus board</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Live Feed</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Cab Split & RideShare */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("RideShare")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="car-sport" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Cab Split</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Transit & airport splits</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Split Fare</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Campus Lost & Found */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("LostAndFound")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="search" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Lost & Found</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Campus recovery registry</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Registry</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Student Marketplace */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Marketplace")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Feather name="shopping-bag" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Marketplace</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Classifieds & books</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Peer-to-Peer</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Campus Task Gigs */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Gigs")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <MaterialCommunityIcons name="briefcase-check" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Campus Gigs</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Tasks & escrow bounties</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Escrow Safe</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* CGPA Forecaster */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CGPA")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <MaterialCommunityIcons name="calculator-variant" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>CGPA Simulator</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>270° radial forecast gauge</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Simulator</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Messages & DMs Portal */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Messages")}
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="chatbubbles" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Messages & DMs</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Classmates & whisper chat</Text>
          <View style={styles.tileFooter}>
            <Text style={[styles.tileTag, { color: colors.primary }]}>Direct Chat</Text>
            <Feather name="chevron-right" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 5. Trending Whisper Card */}
      {recentWhisper && (
        <Card style={styles.whisperPreviewCard}>
          <View style={styles.whisperPreviewHeader}>
            <View style={styles.whisperUserRow}>
              <View style={[styles.whisperDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.whisperAlias, { color: colors.textSecondary }]}>
                {recentWhisper.authorAlias || "Anonymous Student"}
              </Text>
            </View>
            <Badge variant="outline" size="sm">
              Trending Whisper
            </Badge>
          </View>
          <Text style={[styles.whisperText, { color: colors.text }]} numberOfLines={2}>
            {recentWhisper.content}
          </Text>
          <TouchableOpacity
            style={styles.whisperLink}
            onPress={() => navigation.navigate("Whispers")}
          >
            <Text style={[styles.whisperLinkText, { color: colors.primary }]}>
              Join conversation on Whisper Wall →
            </Text>
          </TouchableOpacity>
        </Card>
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
    paddingBottom: 36,
    gap: 14,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 44 : 28,
  },
  topWhisperDmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  whisperIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topWhisperDmText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  unreadBadgePill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  liveDotMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroCard: {
    padding: 18,
    gap: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    padding: 12,
    gap: 2,
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  metricHint: {
    fontSize: 10,
  },
  guardrailCard: {
    padding: 14,
    gap: 10,
  },
  guardrailHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  guardrailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  guardrailTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  guardrailSubtitle: {
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickTile: {
    width: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
  },
  tileIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  tileDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  tileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 4,
  },
  tileTag: {
    fontSize: 11,
    fontWeight: "700",
  },
  whisperPreviewCard: {
    padding: 14,
    gap: 6,
  },
  whisperPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  whisperUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  whisperDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  whisperAlias: {
    fontSize: 11,
    fontWeight: "700",
  },
  whisperText: {
    fontSize: 12,
    lineHeight: 17,
  },
  whisperLink: {
    paddingTop: 4,
  },
  whisperLinkText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
