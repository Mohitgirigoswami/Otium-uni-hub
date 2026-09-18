import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export type CampusServiceKey =
  | "PRINT_STATION"
  | "INCOGNITO_WALL"
  | "GIG_HUB"
  | "CAMPUS_GIGS"
  | "MARKETPLACE"
  | "CAB_SPLIT"
  | "LOST_AND_FOUND"
  | "ATTENDANCE"
  | "CGPA_CALCULATOR";

interface ClientServiceGuardProps {
  serviceKey: CampusServiceKey;
  children: React.ReactNode;
  navigation?: any;
}

interface ServiceMeta {
  title: string;
  subtitle: string;
  defaultReason: string;
  iconName: any;
}

const SERVICE_META: Record<CampusServiceKey, ServiceMeta> = {
  PRINT_STATION: {
    title: "Print Dispatch Temporarily Offline",
    subtitle: "Campus Print Station Maintenance",
    defaultReason: "Print operators are restocking paper cartridges or clearing offline queues. Service will resume shortly.",
    iconName: "printer",
  },
  CAB_SPLIT: {
    title: "Transit Splits on Hold",
    subtitle: "Campus Travel Safety Interlock",
    defaultReason: "Cab share coordination is temporarily paused during campus curfew or transit calibration.",
    iconName: "car",
  },
  MARKETPLACE: {
    title: "Marketplace Under Scheduled Review",
    subtitle: "Student Escrow & Catalog Moderation",
    defaultReason: "Peer-to-peer campus listings and settlement channels are undergoing standard moderation audit.",
    iconName: "shopping-bag",
  },
  INCOGNITO_WALL: {
    title: "Whisper Wall Cooldown Active",
    subtitle: "Campus Moderation Filter Sync",
    defaultReason: "Campus anonymous feeds are undergoing an automated sentiment reset and safety verification.",
    iconName: "eye-off",
  },
  GIG_HUB: {
    title: "Student Task Hub Paused",
    subtitle: "Escrow Ledger Validation",
    defaultReason: "Campus gig deposits and bounties are temporarily on hold for ledger verification.",
    iconName: "briefcase",
  },
  CAMPUS_GIGS: {
    title: "Student Task Hub Paused",
    subtitle: "Escrow Ledger Validation",
    defaultReason: "Campus gig deposits and bounties are temporarily on hold for ledger verification.",
    iconName: "briefcase",
  },
  LOST_AND_FOUND: {
    title: "Lost & Found Desk Updating",
    subtitle: "Security Registry Synchronization",
    defaultReason: "Misplaced item registry is currently syncing verified recovery records with campus security.",
    iconName: "search",
  },
  ATTENDANCE: {
    title: "Attendance Engine Syncing",
    subtitle: "University ERP Interlock",
    defaultReason: "Attendance databases are syncing term records with university server.",
    iconName: "calendar",
  },
  CGPA_CALCULATOR: {
    title: "Transcript Service Maintenance",
    subtitle: "Grading Scale Calibration",
    defaultReason: "Academic grading scales and credit weightings are syncing with department regulations.",
    iconName: "award",
  },
};

export function ClientServiceGuard({ serviceKey, children }: ClientServiceGuardProps) {
  const { colors } = useTheme();
  const { user } = useUser();
  const navigation = useNavigation<any>();

  const [isChecking, setIsChecking] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    isEnabled: boolean;
    reason: string;
  }>({ isEnabled: true, reason: "" });

  const checkService = async (isManualPing = false) => {
    if (isManualPing) setIsPinging(true);
    else setIsChecking(true);

    try {
      const collegeId = user?.collegeId || user?.college?.id || "default";
      const res = await apiClient.get(`/services?campusId=${encodeURIComponent(collegeId)}`);

      if (res.success && Array.isArray(res.data)) {
        AsyncStorage.setItem(`@otium_cached_services_${collegeId}`, JSON.stringify(res.data)).catch(() => {});
        const found = res.data.find((s: any) => s.serviceKey === serviceKey);
        if (found && found.isEnabled === false) {
          setServiceStatus({
            isEnabled: false,
            reason: found.maintenanceMessage || SERVICE_META[serviceKey].defaultReason,
          });
        } else {
          setServiceStatus({ isEnabled: true, reason: "" });
        }
      } else {
        // Read cached status if offline or endpoint unreachable
        const cached = await AsyncStorage.getItem(`@otium_cached_services_${collegeId}`).catch(() => null);
        if (cached) {
          const parsed = JSON.parse(cached);
          const found = parsed.find((s: any) => s.serviceKey === serviceKey);
          if (found && found.isEnabled === false) {
            setServiceStatus({
              isEnabled: false,
              reason: found.maintenanceMessage || SERVICE_META[serviceKey].defaultReason,
            });
            return;
          }
        }
        setServiceStatus({ isEnabled: true, reason: "" });
      }
    } catch {
      setServiceStatus({ isEnabled: true, reason: "" });
    } finally {
      setIsChecking(false);
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkService();
  }, [serviceKey, user?.collegeId]);

  if (isChecking) {
    return <>{children}</>;
  }

  // If service is disabled by admin, render the closed service screen
  if (!serviceStatus.isEnabled) {
    const meta = SERVICE_META[serviceKey] || SERVICE_META.PRINT_STATION;
    const campus = user?.college?.name || "Campus";

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Card style={styles.maintenanceCard}>
          {/* Pulsing Hazard Radar Icon */}
          <View style={[styles.beaconOuter, { backgroundColor: colors.warning + "20" }]}>
            <View style={[styles.beaconInner, { backgroundColor: colors.warning + "40" }]}>
              <Feather name={meta.iconName} size={28} color={colors.warning} />
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Badge variant="warning" size="sm">
              Service Paused
            </Badge>
            <Badge variant="outline" size="sm">
              {campus}
            </Badge>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{meta.title}</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>{meta.subtitle}</Text>

          <View style={[styles.reasonBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} style={{ marginTop: 2 }} />
            <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
              {serviceStatus.reason || meta.defaultReason}
            </Text>
          </View>

          <View style={styles.actionsCol}>
            <Button
              title={isPinging ? "Pinging Service..." : "Ping Service Status"}
              variant="default"
              size="md"
              onPress={() => checkService(true)}
              disabled={isPinging}
              leftIcon={<Feather name="refresh-cw" size={15} color={colors.primaryForeground} />}
            />

            <Button
              title="Return to Dashboard Hub"
              variant="outline"
              size="md"
              onPress={() => navigation.navigate("Hub")}
              leftIcon={<Feather name="arrow-left" size={15} color={colors.text} />}
            />
          </View>
        </Card>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  maintenanceCard: {
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  beaconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  beaconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: -6,
  },
  reasonBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  actionsCol: {
    width: "100%",
    gap: 10,
    marginTop: 6,
  },
});
