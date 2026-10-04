import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export const STORAGE_KEY_WALLET_PAISE = "@otium_cached_wallet_paise";
const DEFAULT_PLATFORM_UPI_ID = "8307798816@upi";

export interface CheckoutItemDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface UnifiedCheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  mode?: "PAYMENT" | "WALLET_TOPUP"; // default: PAYMENT

  // Pricing
  amountRupees: number;
  amountPaise?: number; // optional, defaults to Math.round(amountRupees * 100)

  // Item details breakdown
  itemTitle?: string;
  itemDetails?: CheckoutItemDetail[];
  floorAdjustmentRupees?: number;

  // Wallet Option
  allowWalletPayment?: boolean; // default: true for PAYMENT mode
  cashbackPercentage?: number; // default: 2

  // UPI Option
  upiId?: string; // defaults to platform UPI ID
  upiTransactionNote?: string;

  // External Top-up redirect
  onOpenTopup?: () => void;

  // Action callbacks
  onPayWithWallet?: () => Promise<void>;
  onPayWithUpi?: (utr: string) => Promise<void>;

  isSubmitting?: boolean;
  cooldownSeconds?: number;
}

export function UnifiedCheckoutModal({
  visible,
  onClose,
  title = "Order Checkout",
  subtitle = "Review order specifications & choose payment method",
  mode = "PAYMENT",
  amountRupees,
  amountPaise: propAmountPaise,
  itemTitle,
  itemDetails = [],
  floorAdjustmentRupees = 0,
  allowWalletPayment = true,
  cashbackPercentage = 2,
  upiId = DEFAULT_PLATFORM_UPI_ID,
  upiTransactionNote = "OtiumPayment",
  onOpenTopup,
  onPayWithWallet,
  onPayWithUpi,
  isSubmitting = false,
  cooldownSeconds = 0,
}: UnifiedCheckoutModalProps) {
  const { colors } = useTheme();
  const { user, refreshUser } = useUser();

  const finalAmountPaise = propAmountPaise ?? Math.round(amountRupees * 100);
  const cashbackPaise = Math.floor(finalAmountPaise * (cashbackPercentage / 100));
  const cashbackRupees = (cashbackPaise / 100).toFixed(2);

  // Payment method: "WALLET" or "UPI". If WALLET_TOPUP mode, always "UPI"
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "UPI">(
    mode === "WALLET_TOPUP" || !allowWalletPayment ? "UPI" : "WALLET"
  );
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [walletBalancePaise, setWalletBalancePaise] = useState<number | null>(
    user?.walletBalancePaise ?? null
  );

  // Fetch live wallet balance
  const fetchWallet = async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_WALLET_PAISE);
      if (cached !== null) {
        setWalletBalancePaise(Number(cached));
      }
      const res = await apiClient.get<any>("/wallet");
      if (res.success && res.data) {
        setWalletBalancePaise(res.data.balancePaise);
        AsyncStorage.setItem(STORAGE_KEY_WALLET_PAISE, String(res.data.balancePaise)).catch(() => {});
      }
    } catch {
      // Passive fallback
    }
  };

  useEffect(() => {
    if (visible) {
      setUtrNumber("");
      fetchWallet();
      if (mode === "WALLET_TOPUP" || !allowWalletPayment) {
        setPaymentMethod("UPI");
      }
    }
  }, [visible, mode, allowWalletPayment]);

  // Sync with user context
  useEffect(() => {
    if (user?.walletBalancePaise !== undefined && user.walletBalancePaise !== null) {
      setWalletBalancePaise(user.walletBalancePaise);
    }
  }, [user?.walletBalancePaise]);

  const hasSufficientWalletBalance =
    walletBalancePaise !== null && walletBalancePaise >= finalAmountPaise;

  const handleCopyUpi = async () => {
    await Clipboard.setStringAsync(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
    Alert.alert("Copied! 📋", `UPI ID "${upiId}" copied to clipboard.`);
  };

  const handleOpenUpiApp = () => {
    const cleanNote = upiTransactionNote.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=OtiumUniHub&am=${amountRupees.toFixed(2)}&cu=INR&tn=${cleanNote}`;
    Linking.openURL(uri)
      .then(() => {
        Alert.alert(
          "UPI App Launched 🚀",
          `Complete payment of ₹${amountRupees.toFixed(2)}, copy the 12-digit UTR from your receipt, and tap "Paste UTR" below.`
        );
      })
      .catch(() => {
        Alert.alert(
          "Notice",
          `No default UPI app detected. Please transfer ₹${amountRupees.toFixed(2)} to UPI ID:\n\n${upiId}\n\nAfter paying, paste the 12-digit UTR below.`
        );
      });
  };

  const handlePasteUtr = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 12) {
        setUtrNumber(digits.slice(0, 12));
      } else if (digits.length > 0) {
        setUtrNumber(digits);
      } else {
        Alert.alert("Clipboard Empty", "No numeric UTR found in clipboard.");
      }
    } catch {
      Alert.alert("Error", "Could not read from clipboard.");
    }
  };

  const handleSubmit = async () => {
    if (paymentMethod === "WALLET") {
      if (!hasSufficientWalletBalance) {
        Alert.alert(
          "Insufficient Wallet Balance",
          `Your wallet balance is ₹${((walletBalancePaise || 0) / 100).toFixed(2)}, but this order costs ₹${amountRupees.toFixed(2)}.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Recharge Wallet",
              onPress: () => {
                onClose();
                onOpenTopup?.();
              },
            },
          ]
        );
        return;
      }
      if (onPayWithWallet) {
        await onPayWithWallet();
        refreshUser();
      }
    } else {
      const cleanUtr = utrNumber.trim().replace(/\D/g, "");
      if (cleanUtr.length < 6) {
        Alert.alert(
          "Missing UTR",
          "Please enter the 12-digit transaction UTR number from your payment receipt."
        );
        return;
      }
      if (onPayWithUpi) {
        await onPayWithUpi(cleanUtr);
        refreshUser();
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingModal}
      >
        <TouchableOpacity style={styles.modalBackdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* 1. Itemized Order Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.secondary + "40", borderColor: colors.border }]}>
              {itemTitle && (
                <View style={styles.itemTitleRow}>
                  <Feather name="file-text" size={14} color={colors.primary} />
                  <Text style={[styles.itemTitleText, { color: colors.text }]} numberOfLines={1}>
                    {itemTitle}
                  </Text>
                </View>
              )}

              {itemDetails.length > 0 && (
                <View style={styles.detailsGrid}>
                  {itemDetails.map((detail, idx) => (
                    <View key={idx} style={styles.detailCol}>
                      <Text style={[styles.detailKey, { color: colors.textMuted }]}>{detail.label}</Text>
                      <Text
                        style={[
                          styles.detailVal,
                          { color: detail.highlight ? colors.primary : colors.text },
                        ]}
                      >
                        {detail.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {floorAdjustmentRupees > 0 && (
                <View style={[styles.subtotalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.subtotalLabel, { color: colors.textMuted }]}>
                    Minimum Order Floor Adjustment
                  </Text>
                  <Text style={[styles.subtotalVal, { color: colors.primary }]}>
                    +₹{floorAdjustmentRupees.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
                  <Text style={[styles.totalSubtext, { color: colors.textMuted }]}>
                    Taxes & handling fees included
                  </Text>
                </View>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>
                  ₹{amountRupees.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* 2. Payment Method Selector (For standard payments) */}
            {mode === "PAYMENT" && allowWalletPayment && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Payment Method</Text>

                <View style={styles.methodSelectorRow}>
                  {/* E-Wallet Tab */}
                  <TouchableOpacity
                    onPress={() => setPaymentMethod("WALLET")}
                    style={[
                      styles.methodTab,
                      {
                        borderColor: paymentMethod === "WALLET" ? colors.primary : colors.border,
                        backgroundColor: paymentMethod === "WALLET" ? colors.primary + "15" : colors.secondary + "40",
                      },
                    ]}
                  >
                    <View style={styles.methodTabHeader}>
                      <Feather
                        name="zap"
                        size={13}
                        color={paymentMethod === "WALLET" ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.methodTabText, { color: colors.text }]}>Otium Wallet</Text>
                    </View>
                    <Text style={[styles.methodTabSub, { color: colors.textMuted }]}>
                      Balance: ₹{((walletBalancePaise || 0) / 100).toFixed(2)}
                    </Text>
                    <Badge variant="success" size="sm" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                      +{cashbackPercentage}% Cashback
                    </Badge>
                  </TouchableOpacity>

                  {/* Direct UPI Tab */}
                  <TouchableOpacity
                    onPress={() => setPaymentMethod("UPI")}
                    style={[
                      styles.methodTab,
                      {
                        borderColor: paymentMethod === "UPI" ? colors.primary : colors.border,
                        backgroundColor: paymentMethod === "UPI" ? colors.primary + "15" : colors.secondary + "40",
                      },
                    ]}
                  >
                    <View style={styles.methodTabHeader}>
                      <Ionicons
                        name="qr-code-outline"
                        size={14}
                        color={paymentMethod === "UPI" ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.methodTabText, { color: colors.text }]}>Direct UPI</Text>
                    </View>
                    <Text style={[styles.methodTabSub, { color: colors.textMuted }]}>
                      GPay / PhonePe / Paytm
                    </Text>
                    <Badge variant="secondary" size="sm" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                      Instant Launch
                    </Badge>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 3A. If Wallet Selected */}
            {paymentMethod === "WALLET" && (
              <View
                style={[
                  styles.walletStatusCard,
                  {
                    borderColor: hasSufficientWalletBalance ? colors.primary + "40" : colors.warning + "40",
                    backgroundColor: hasSufficientWalletBalance ? colors.primary + "10" : colors.warning + "10",
                  },
                ]}
              >
                {hasSufficientWalletBalance ? (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={[styles.walletStatusTitle, { color: colors.text }]}>
                        1-Click Checkout Available
                      </Text>
                    </View>
                    <Text style={[styles.walletStatusDesc, { color: colors.textMuted }]}>
                      ⚡ Instant confirmation without leaving the app. You will receive +₹{cashbackRupees} (
                      {cashbackPercentage}%) cashback credited to your wallet!
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={[styles.walletStatusTitle, { color: colors.warning }]}>
                        Insufficient Balance
                      </Text>
                      {onOpenTopup && (
                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            onOpenTopup();
                          }}
                          style={[styles.topupBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.topupBtnText}>Top Up Wallet</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.walletStatusDesc, { color: colors.textMuted }]}>
                      Short by ₹{(((finalAmountPaise - (walletBalancePaise || 0))) / 100).toFixed(2)}. Recharge
                      or switch to Direct UPI to continue.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 3B. If UPI Selected */}
            {paymentMethod === "UPI" && (
              <View style={{ marginTop: 10 }}>
                {/* Platform UPI Card */}
                <View style={[styles.upiCard, { borderColor: colors.border, backgroundColor: colors.secondary + "30" }]}>
                  <View style={styles.upiHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="qr-code-outline" size={15} color={colors.primary} />
                      <Text style={[styles.upiTitle, { color: colors.text }]}>Campus Platform UPI</Text>
                    </View>
                    <TouchableOpacity onPress={handleCopyUpi} style={styles.copyChip}>
                      <Feather name={copiedUpi ? "check" : "copy"} size={13} color={colors.primary} />
                      <Text style={[styles.copyChipText, { color: colors.primary }]}>
                        {copiedUpi ? "Copied" : "Copy UPI ID"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.upiIdDisplay, { color: colors.text }]}>{upiId}</Text>

                  <Button
                    title={`Pay ₹${amountRupees.toFixed(2)} with UPI App`}
                    variant="outline"
                    size="sm"
                    onPress={handleOpenUpiApp}
                    leftIcon={<Feather name="external-link" size={13} color={colors.primary} />}
                    style={{ marginTop: 6 }}
                  />
                </View>

                {/* 12-digit UTR Input */}
                <View style={{ marginTop: 14 }}>
                  <View style={styles.utrHeaderRow}>
                    <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>
                      12-Digit Transaction UTR Number *
                    </Text>
                    <TouchableOpacity
                      onPress={handlePasteUtr}
                      style={[
                        styles.pasteChip,
                        { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
                      ]}
                    >
                      <Feather name="clipboard" size={12} color={colors.primary} />
                      <Text style={[styles.pasteChipText, { color: colors.primary }]}>Paste UTR</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.utrHint, { color: colors.textMuted }]}>
                    Found on your Google Pay, PhonePe, or Paytm success screen
                  </Text>

                  <TextInput
                    placeholder="e.g. 425619283741"
                    placeholderTextColor={colors.textMuted}
                    value={utrNumber}
                    onChangeText={(val) => setUtrNumber(val.replace(/\D/g, ""))}
                    keyboardType="numeric"
                    maxLength={12}
                    style={[
                      styles.utrInput,
                      {
                        backgroundColor: colors.secondary + "40",
                        borderColor: utrNumber.length === 12 ? colors.success : colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </View>

                {/* 3-Step Checkout Guidance */}
                <View style={[styles.stepsCard, { backgroundColor: colors.secondary + "30", borderColor: colors.border }]}>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>1. </Text>
                    Tap "Pay ₹{amountRupees.toFixed(2)} with UPI App" above to launch payment.
                  </Text>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>2. </Text>
                    Copy the 12-digit UTR from your payment confirmation screen.
                  </Text>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>3. </Text>
                    Tap "Paste UTR" above and click Confirm & Submit.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Button title="Back" variant="outline" size="sm" onPress={onClose} disabled={isSubmitting} />

            <Button
              title={
                isSubmitting
                  ? "Authorizing..."
                  : cooldownSeconds > 0
                  ? `✓ Submitted (${cooldownSeconds}s)`
                  : paymentMethod === "WALLET"
                  ? hasSufficientWalletBalance
                    ? `⚡ Pay ₹${amountRupees.toFixed(2)} (+₹${cashbackRupees})`
                    : `Top Up (Short ₹${(((finalAmountPaise - (walletBalancePaise || 0))) / 100).toFixed(2)})`
                  : `Confirm & Submit (₹${amountRupees.toFixed(2)})`
              }
              variant="default"
              size="sm"
              onPress={
                paymentMethod === "WALLET" && !hasSufficientWalletBalance
                  ? () => {
                      onClose();
                      onOpenTopup?.();
                    }
                  : handleSubmit
              }
              disabled={
                isSubmitting ||
                cooldownSeconds > 0 ||
                (paymentMethod === "UPI" && utrNumber.trim().length < 6)
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 18,
    maxHeight: "88%",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 4,
    gap: 8,
  },
  detailCol: {
    minWidth: "45%",
    gap: 2,
  },
  detailKey: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subtotalLabel: {
    fontSize: 11,
  },
  subtotalVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  totalSubtext: {
    fontSize: 10,
    marginTop: 1,
  },
  totalAmount: {
    fontSize: 19,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  methodSelectorRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodTab: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
  },
  methodTabHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  methodTabSub: {
    fontSize: 11,
    marginTop: 2,
  },
  walletStatusCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  walletStatusTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  walletStatusDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  topupBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  topupBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  upiCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  upiHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upiTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  copyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  upiIdDisplay: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  utrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pasteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pasteChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  utrHint: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  utrInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "monospace",
    letterSpacing: 1.5,
  },
  stepsCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 10,
  },
  stepItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
