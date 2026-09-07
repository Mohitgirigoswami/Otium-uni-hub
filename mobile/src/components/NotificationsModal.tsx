import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { Badge } from "./Badge";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  campusName?: string;
}

export function NotificationsModal({
  visible,
  onClose,
  campusName = "Campus Hub",
}: NotificationsModalProps) {
  const notices = [
    {
      id: "1",
      icon: "print",
      iconType: "feather",
      title: "Hostel Print Station Active",
      message: "Direct PDF upload is online. Fast morning and afternoon desk delivery active.",
      time: "10m ago",
      tag: "SERVICE",
    },
    {
      id: "2",
      icon: "eye-off-outline",
      iconType: "ionicons",
      title: "Whisper Wall Moderation",
      message: "Autonomous campus feed active. Express yourself freely with student privacy.",
      time: "1h ago",
      tag: "CAMPUS",
    },
    {
      id: "3",
      icon: "calculator-variant-outline",
      iconType: "material",
      title: "CGPA Simulator Synchronized",
      message: "Target grade engine updated with real-time credit weighting.",
      time: "2h ago",
      tag: "ACADEMICS",
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.bellBadge}>
                <Ionicons name="notifications" size={18} color={colors.brand[400]} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Campus Notifications</Text>
                <Text style={styles.modalSubtitle}>{campusName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.slate[400]} />
            </TouchableOpacity>
          </View>

          {/* List of Notices */}
          <ScrollView style={styles.noticesList} showsVerticalScrollIndicator={false}>
            {notices.map((n) => (
              <View key={n.id} style={styles.noticeItem}>
                <View style={styles.noticeIconBox}>
                  {n.iconType === "feather" ? (
                    <Feather name={n.icon as any} size={16} color={colors.brand[400]} />
                  ) : n.iconType === "material" ? (
                    <MaterialCommunityIcons name={n.icon as any} size={18} color={colors.brand[400]} />
                  ) : (
                    <Ionicons name={n.icon as any} size={18} color={colors.brand[400]} />
                  )}
                </View>
                <View style={styles.noticeContent}>
                  <View style={styles.noticeTopRow}>
                    <Text style={styles.noticeTitle}>{n.title}</Text>
                    <Badge variant="neutral" size="sm">
                      {n.tag}
                    </Badge>
                  </View>
                  <Text style={styles.noticeMessage}>{n.message}</Text>
                  <Text style={styles.noticeTime}>{n.time}</Text>
                </View>
              </View>
            ))}

            {/* All Caught Up Card */}
            <View style={styles.allCaughtUpCard}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.emerald[400]} />
              <Text style={styles.allCaughtUpText}>You're all caught up!</Text>
              <Text style={styles.allCaughtUpSubtext}>
                No urgent warnings or unread administrative notices.
              </Text>
            </View>
          </ScrollView>

          {/* Dismiss Button */}
          <TouchableOpacity onPress={onClose} style={styles.dismissBtn} activeOpacity={0.8}>
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    maxHeight: "80%",
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.slate[800],
    alignItems: "center",
    justifyContent: "center",
  },
  noticesList: {
    maxHeight: 380,
  },
  noticeItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    gap: 12,
  },
  noticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.slate[800],
    alignItems: "center",
    justifyContent: "center",
  },
  noticeContent: {
    flex: 1,
  },
  noticeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noticeMessage: {
    fontSize: 11.5,
    color: colors.slate[300],
    marginTop: 3,
    lineHeight: 16,
  },
  noticeTime: {
    fontSize: 10,
    color: colors.slate[500],
    marginTop: 4,
  },
  allCaughtUpCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  allCaughtUpText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.emerald[400],
    marginTop: 4,
  },
  allCaughtUpSubtext: {
    fontSize: 11,
    color: colors.slate[400],
    textAlign: "center",
    marginTop: 2,
  },
  dismissBtn: {
    backgroundColor: colors.slate[800],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dismissBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
