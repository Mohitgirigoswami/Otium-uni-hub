import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { apiClient } from "../services/apiClient";

export type MobileCampusServiceKey =
  | "PRINT_STATION"
  | "INCOGNITO_WALL"
  | "GIG_HUB"
  | "MARKETPLACE"
  | "CAB_SPLIT"
  | "LOST_AND_FOUND"
  | "ATTENDANCE"
  | "CGPA_CALCULATOR";

interface ClientServiceGuardProps {
  campusId?: string | null;
  serviceKey: MobileCampusServiceKey;
  children: React.ReactNode;
}

const SERVICE_TITLES: Record<MobileCampusServiceKey, { title: string; desc: string; icon: string }> = {
  PRINT_STATION: {
    title: "Print Dispatch Paused",
    desc: "Campus print operators are restocking toner or performing queue maintenance.",
    icon: "printer",
  },
  CAB_SPLIT: {
    title: "Transit Splits on Hold",
    desc: "Ride share coordination is paused during campus transit curfew.",
    icon: "car",
  },
  MARKETPLACE: {
    title: "Marketplace Under Review",
    desc: "Campus listings and escrow verification are undergoing scheduled moderation.",
    icon: "shopping-bag",
  },
  INCOGNITO_WALL: {
    title: "Whisper Wall Cooldown",
    desc: "Campus anonymous boards are undergoing automated sentiment filter resets.",
    icon: "eye-off",
  },
  GIG_HUB: {
    title: "Gig Hub Paused",
    desc: "Freelance task escrow deposits and releases are held for ledger audit.",
    icon: "briefcase",
  },
  LOST_AND_FOUND: {
    title: "Lost & Found Syncing",
    desc: "Recovery registry is synchronizing records with campus security.",
    icon: "search",
  },
  ATTENDANCE: {
    title: "Attendance Engine Syncing",
    desc: "Lecture records are synchronizing with university academic schedules.",
    icon: "calendar",
  },
  CGPA_CALCULATOR: {
    title: "Grade Calibration Active",
    desc: "Grading curves and credit weights are undergoing routine maintenance.",
    icon: "school",
  },
};

export function ClientServiceGuard({
  campusId,
  serviceKey,
  children,
}: ClientServiceGuardProps) {
  const { colors } = useTheme();
  const [service, setService] = useState<any | null>(null);
  const [checked, setChecked] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const checkStatus = useCallback(async (showIndicator = false) => {
    if (!campusId) {
      setChecked(true);
      return;
    }
    if (showIndicator) setIsPinging(true);

    try {
      const res = await apiClient.get(`/admin/services?campusId=${campusId}`);
      if (res.success && Array.isArray(res.data)) {
        const found = res.data.find((s: any) => s.serviceKey === serviceKey);
        setService(found || null);
      }
    } catch {
      // safe fallback
    } finally {
      setChecked(true);
      if (showIndicator) setIsPinging(false);
    }
  }, [campusId, serviceKey]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (!campusId || !checked) {
    return <>{children}</>;
  }

  if (service && !service.isEnabled) {
    const meta = SERVICE_TITLES[serviceKey] || {
      title: "Service Temporarily Offline",
      desc: "This module is temporarily inactive for your campus.",
      icon: "alert-circle",
    };

    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          {/* Pulsing Hazard Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.warning + "18",
                borderColor: colors.warning + "40",
              },
            ]}
          >
            <Feather name={meta.icon as any} size={28} color={colors.warning} />
          </View>

          {/* Badge */}
          <Badge variant="warning" size="sm" style={{ marginTop: 14 }}>
            CAMPUS_INTERLOCK_ACTIVE
          </Badge>

          {/* Title & Desc */}
          <Text style={[styles.title, { color: colors.text }]}>
            {service.serviceName || meta.title}
          </Text>

          <Text style={[styles.desc, { color: colors.textMuted }]}>
            {service.maintenanceMessage || meta.desc}
          </Text>

          {/* Interactive Actions */}
          <View style={styles.buttonRow}>
            <Button
              title={isPinging ? "Querying Campus..." : "Ping Service Status"}
              variant="outline"
              size="sm"
              isLoading={isPinging}
              onPress={() => checkStatus(true)}
              leftIcon={<Ionicons name="refresh" size={14} color={colors.text} />}
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
    padding: 16,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    textAlign: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },
});
