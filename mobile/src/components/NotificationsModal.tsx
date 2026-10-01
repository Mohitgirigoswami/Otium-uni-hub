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
import { useTheme } from "../context/ThemeContext";
import { Badge } from "./ui/Badge";

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
  const { colors } = useTheme();

  const notices = [
    {
      id: "1",
      icon: "print",
      iconType: "feather",
      title: "Express Print Station Active",
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
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.bellBadge, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Campus Notifications</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{campusName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List of Notices */}
          <ScrollView style={styles.noticesList} showsVerticalScrollIndicator={false}>
            {notices.map((n) => (
              <View key={n.id} style={[styles.noticeItem, { backgroundColor: colors.secondary + "40", borderColor: colors.border }]}>
                <View style={[styles.noticeIconBox, { backgroundColor: colors.secondary }]}>
                  {n.iconType === "feather" ? (
                    <Feather name={n.icon as any} size={16} color={colors.primary} />
                  ) : n.iconType === "material" ? (
                    <MaterialCommunityIcons name={n.icon as any} size={18} color={colors.primary} />
                  ) : (
                    <Ionicons name={n.icon as any} size={18} color={colors.primary} />
                  )}
                </View>
                <View style={styles.noticeContent}>
                  <View style={styles.noticeTopRow}>
                    <Text style={[styles.noticeTitle, { color: colors.text }]}>{n.title}</Text>
                    <Badge variant="secondary" size="sm">
                      {n.tag}
                    </Badge>
                  </View>
                  <Text style={[styles.noticeMessage, { color: colors.textSecondary }]}>{n.message}</Text>
                  <Text style={[styles.noticeTime, { color: colors.textSecondary }]}>{n.time}</Text>
                </View>
              </View>
            ))}

            {/* All Caught Up Card */}
            <View style={[styles.allCaughtUpCard, { backgroundColor: colors.success + "14", borderColor: colors.success + "30" }]}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
              <Text style={[styles.allCaughtUpText, { color: colors.success }]}>You're all caught up!</Text>
              <Text style={[styles.allCaughtUpSubtext, { color: colors.textSecondary }]}>
                No urgent warnings or unread administrative notices.
              </Text>
            </View>
          </ScrollView>

          {/* Dismiss Button */}
          <TouchableOpacity onPress={onClose} style={[styles.dismissBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
            <Text style={[styles.dismissBtnText, { color: colors.primaryForeground }]}>Dismiss</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  noticeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
  },
  noticeMessage: {
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  },
  noticeTime: {
    fontSize: 10,
    marginTop: 4,
  },
  allCaughtUpCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  allCaughtUpText: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  allCaughtUpSubtext: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  dismissBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
