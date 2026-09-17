import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export type MobilePrintOrderStatus =
  | "PENDING"
  | "SUBMITTED"
  | "QUEUED"
  | "PRINTING"
  | "OUT_FOR_DELIVERY"
  | "READY"
  | "DELIVERED"
  | "COMPLETED"
  | "REJECTED"
  | "ISSUE_REPORTED"
  | "CANCELLED";

interface PrintOrderTrackerProps {
  status: MobilePrintOrderStatus | string;
  issueNote?: string;
}

const STEPS = [
  { key: "QUEUED", label: "Queued", icon: "file-text" },
  { key: "PRINTING", label: "Printing", icon: "printer" },
  { key: "OUT_FOR_DELIVERY", label: "Dispatched", icon: "truck" },
  { key: "COMPLETED", label: "Delivered", icon: "check-circle" },
];

export function PrintOrderTracker({ status, issueNote }: PrintOrderTrackerProps) {
  const { colors } = useTheme();

  if (status === "CANCELLED" || status === "REJECTED") {
    return (
      <View
        style={[
          styles.cancelledBox,
          {
            backgroundColor: colors.destructive + "15",
            borderColor: colors.destructive + "30",
          },
        ]}
      >
        <Ionicons name="close-circle" size={14} color={colors.destructive} />
        <Text style={[styles.cancelledText, { color: colors.destructive }]}>
          {status === "REJECTED" ? "Order rejected by operator" : "Order cancelled or refunded"}
        </Text>
      </View>
    );
  }

  const isIssueReported = status === "ISSUE_REPORTED";

  let activeIndex = 0;
  if (status === "PRINTING") activeIndex = 1;
  else if (status === "OUT_FOR_DELIVERY") activeIndex = 2;
  else if (status === "COMPLETED") activeIndex = 3;

  const progressPercent = (activeIndex / (STEPS.length - 1)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        {/* Inactive Background Line */}
        <View
          style={[
            styles.backgroundLine,
            { backgroundColor: colors.secondary },
          ]}
        />

        {/* Active Progress Line */}
        <View
          style={[
            styles.activeLine,
            {
              width: `${progressPercent * 0.85}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />

        {/* Nodes */}
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <View key={step.key} style={styles.stepNodeContainer}>
              <View
                style={[
                  styles.nodeCircle,
                  {
                    backgroundColor: isDone
                      ? colors.primary
                      : isCurrent
                      ? colors.card
                      : colors.secondary,
                    borderColor: isDone || isCurrent ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={step.icon as any}
                  size={11}
                  color={
                    isDone
                      ? colors.primaryForeground
                      : isCurrent
                      ? colors.primary
                      : colors.textMuted
                  }
                />
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCurrent
                      ? colors.primary
                      : isDone
                      ? colors.text
                      : colors.textMuted,
                    fontWeight: isCurrent ? "700" : "500",
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Observable Issue Alert directly in the Delivery Timeline */}
      {isIssueReported && (
        <View
          style={[
            styles.issueAlertBox,
            {
              backgroundColor: "#f59e0b18",
              borderColor: "#f59e0b40",
            },
          ]}
        >
          <Ionicons name="warning" size={14} color="#f59e0b" />
          <View style={styles.issueTextCol}>
            <Text style={[styles.issueAlertTitle, { color: "#f59e0b" }]}>
              Issue Flagged on Order
            </Text>
            <Text style={[styles.issueAlertSub, { color: colors.textMuted }]}>
              {issueNote || "A problem was reported on this delivery. The print manager is reviewing it."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 6,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  backgroundLine: {
    position: "absolute",
    top: 13,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 1,
  },
  activeLine: {
    position: "absolute",
    top: 13,
    left: 14,
    height: 2,
    borderRadius: 1,
  },
  stepNodeContainer: {
    alignItems: "center",
    zIndex: 2,
  },
  nodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 9,
    marginTop: 4,
    textAlign: "center",
  },
  cancelledBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelledText: {
    fontSize: 11,
    fontWeight: "600",
  },
  issueAlertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  issueTextCol: {
    flex: 1,
  },
  issueAlertTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  issueAlertSub: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
});
