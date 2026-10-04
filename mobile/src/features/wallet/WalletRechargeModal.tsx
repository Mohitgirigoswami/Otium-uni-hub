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
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { apiClient } from "../../services/apiClient";

interface WalletRechargeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [50, 100, 200, 500];

export function WalletRechargeModal({
  visible,
  onClose,
  onSuccess,
}: WalletRechargeModalProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<"topup" | "history">("topup");
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletData, setWalletData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const platformUpiId = "8307798816@upi";

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/wallet");
      if (res.success && res.data) {
        setWalletData(res.data);
      }
    } catch {
      // Ignore network errors on passive load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchWallet();
      setUtrNumber("");
    }
  }, [visible]);

  const currentRechargeAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isOverMax = !isNaN(currentRechargeAmount) && currentRechargeAmount > 5000;
  const isUnderMin = !isNaN(currentRechargeAmount) && currentRechargeAmount < 20;
  const isAmountValid =
    !isNaN(currentRechargeAmount) &&
    currentRechargeAmount >= 20 &&
    currentRechargeAmount <= 5000;

  const validQrAmount = isAmountValid ? currentRechargeAmount : 100;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(platformUpiId)}&pn=OtiumCampusWallet&am=${validQrAmount}&cu=INR&tn=TopUp_${validQrAmount}`;

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

  const handleOpenUpiApp = async () => {
    if (isUnderMin) {
      Alert.alert("Invalid Amount", "Minimum recharge amount is ₹20.00.");
      return;
    }
    if (isOverMax) {
      Alert.alert("Ceiling Exceeded", "Maximum single top-up amount is ₹5,000.00.");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        await Clipboard.setStringAsync(platformUpiId);
        Alert.alert(
          "UPI ID Copied 📋",
          `Please open your UPI payment app (GPay/PhonePe/Paytm) and pay to:\n\n${platformUpiId}\n\nAmount: ₹${currentRechargeAmount}\n\nAfter paying, copy the 12-digit UTR from your receipt and tap "Paste UTR" below.`
        );
      }
    } catch {
      await Clipboard.setStringAsync(platformUpiId);
      Alert.alert(
        "UPI ID Copied 📋",
        `Could not open UPI app directly. Pay to:\n\n${platformUpiId}\n\nAfter paying, copy the 12-digit UTR from your receipt and tap "Paste UTR" below.`
      );
    }
  };

  const handleSubmitTopup = async () => {
    if (isUnderMin) {
      Alert.alert("Invalid Amount", "Minimum recharge amount is ₹20.00.");
      return;
    }
    if (isOverMax) {
      Alert.alert("Limit Exceeded", "Maximum single top-up amount is ₹5,000.00.");
      return;
    }
    if (!isAmountValid) {
      Alert.alert("Invalid Amount", "Please enter an amount between ₹20.00 and ₹5,000.00.");
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/\D/g, "");
    if (cleanUtr.length !== 12) {
      Alert.alert(
        "Invalid UTR",
        "Please enter the exact 12-digit numeric UPI UTR / reference number."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post("/wallet/topup", {
        amountPaise: Math.round(currentRechargeAmount * 100),
        utr: cleanUtr,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to submit top-up request.");
      }

      Alert.alert(
        "Top-Up Submitted! 🚀",
        `Recharge of ₹${currentRechargeAmount} with UTR ${cleanUtr} recorded. The campus manager will verify shortly.`
      );
      setUtrNumber("");
      fetchWallet();
      onSuccess?.();
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Could not submit top-up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingModal}
      >
        <TouchableOpacity
          style={styles.modalBackdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.walletIconCircle, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Otium Campus Wallet</Text>
                <Text style={[styles.balanceSubtitle, { color: colors.textMuted }]}>
                  Balance:{" "}
                  <Text style={{ color: colors.text, fontWeight: "700" }}>
                    ₹{walletData ? Number(walletData.balanceRupees).toFixed(2) : "0.00"}
                  </Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity
              onPress={() => setActiveTab("topup")}
              style={[
                styles.tabBtn,
                activeTab === "topup" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "topup" ? colors.primary : colors.textMuted },
                ]}
              >
                Recharge Balance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("history")}
              style={[
                styles.tabBtn,
                activeTab === "history" && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "history" ? colors.primary : colors.textMuted },
                ]}
              >
                Ledger History ({walletData?.transactions?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "topup" ? (
              <View style={styles.formContainer}>
                {/* Pending Recharges Notification */}
                {walletData?.pendingTopups && walletData.pendingTopups.length > 0 && (
                  <View style={[styles.pendingBanner, { borderColor: colors.warning + "40", backgroundColor: colors.warning + "12" }]}>
                    <Ionicons name="time-outline" size={16} color={colors.warning} />
                    <Text style={[styles.pendingText, { color: colors.text }]}>
                      {walletData.pendingTopups.length} recharge(s) pending verification (UTR:{" "}
                      {walletData.pendingTopups[0].utr})
                    </Text>
                  </View>
                )}

                {/* Amount Selection */}
                <View style={styles.amountHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>
                    1. Select Top-Up Amount
                  </Text>
                  <View style={[styles.limitBadge, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.limitBadgeText, { color: colors.textMuted }]}>
                      Min ₹20 • Max ₹5,000
                    </Text>
                  </View>
                </View>

                <View style={styles.presetGrid}>
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !customAmount && selectedAmount === amt;
                    return (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => {
                          setSelectedAmount(amt);
                          setCustomAmount("");
                        }}
                        style={[
                          styles.presetBtn,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetBtnText,
                            { color: isSelected ? colors.primaryForeground : colors.text },
                          ]}
                        >
                          ₹{amt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Amount */}
                <View style={{ gap: 4 }}>
                  <TextInput
                    placeholder="Or enter custom amount (₹20 - ₹5,000)..."
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    style={[
                      styles.customInput,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: isOverMax || (customAmount !== "" && isUnderMin) ? colors.destructive : colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                  {isOverMax && (
                    <Text style={[styles.helperErrorText, { color: colors.destructive }]}>
                      ⚠️ Maximum top-up is ₹5,000.00 per transaction.
                    </Text>
                  )}
                  {customAmount !== "" && isUnderMin && (
                    <Text style={[styles.helperErrorText, { color: colors.destructive }]}>
                      ⚠️ Minimum recharge amount is ₹20.00.
                    </Text>
                  )}
                </View>

                {/* UPI Deep Link Payment Action */}
                <View style={[styles.upiCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.upiInfoRow}>
                    <Text style={[styles.upiIdLabel, { color: colors.textMuted }]}>Platform UPI ID:</Text>
                    <Text style={[styles.upiIdVal, { color: colors.text }]}>{platformUpiId}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleOpenUpiApp}
                    disabled={!isAmountValid}
                    style={[
                      styles.openUpiBtn,
                      {
                        backgroundColor: isAmountValid ? colors.primary : colors.destructive + "20",
                        opacity: isAmountValid ? 1 : 0.6,
                      },
                    ]}
                  >
                    <Feather
                      name={isAmountValid ? "external-link" : "alert-circle"}
                      size={14}
                      color={isAmountValid ? colors.primaryForeground : colors.destructive}
                    />
                    <Text
                      style={[
                        styles.openUpiBtnText,
                        { color: isAmountValid ? colors.primaryForeground : colors.destructive },
                      ]}
                    >
                      {isAmountValid
                        ? `Pay ₹${currentRechargeAmount || 100} via UPI App`
                        : isOverMax
                        ? "Amount Exceeds ₹5,000 Limit"
                        : "Min ₹20 Required"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 12-Digit UTR Input */}
                <View style={styles.utrHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>
                    2. Enter 12-Digit UTR Number
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
                <TextInput
                  placeholder="e.g. 428190827361"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={12}
                  value={utrNumber}
                  onChangeText={(val) => setUtrNumber(val.replace(/\D/g, ""))}
                  style={[
                    styles.utrInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: utrNumber.length === 12 ? colors.success : colors.border,
                      color: colors.text,
                    },
                  ]}
                />

                {/* 3-Step Integrated Checkout Guide */}
                <View style={[styles.stepsCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>1. </Text>
                    Tap "Pay via UPI App" above to open GPay, PhonePe, or Paytm.
                  </Text>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>2. </Text>
                    Copy the 12-digit UTR / reference number from your payment receipt.
                  </Text>
                  <Text style={[styles.stepItem, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>3. </Text>
                    Tap "Paste UTR" above and submit for instant verification.
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmitTopup}
                  disabled={isSubmitting || utrNumber.length !== 12 || !isAmountValid}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: isSubmitting || utrNumber.length !== 12 || !isAmountValid ? 0.5 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      {isOverMax
                        ? "Amount Exceeds ₹5,000 Limit"
                        : isUnderMin && customAmount !== ""
                        ? "Amount Below ₹20 Minimum"
                        : `Submit ₹${currentRechargeAmount || 100} Top-Up Request`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Ledger History */
              <View style={styles.historyList}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 30 }} />
                ) : !walletData?.transactions || walletData.transactions.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No wallet transactions yet. Top up your balance to start using 1-click campus payments!
                  </Text>
                ) : (
                  walletData.transactions.map((tx: any) => {
                    const isCredit = tx.amountPaise > 0;
                    return (
                      <View
                        key={tx.id}
                        style={[
                          styles.txRow,
                          { borderColor: colors.border, backgroundColor: colors.backgroundSecondary },
                        ]}
                      >
                        <View style={styles.txLeft}>
                          <View
                            style={[
                              styles.txIconBox,
                              {
                                backgroundColor: isCredit ? colors.success + "18" : colors.destructive + "18",
                              },
                            ]}
                          >
                            <Feather
                              name={isCredit ? "arrow-down-left" : "arrow-up-right"}
                              size={14}
                              color={isCredit ? colors.success : colors.destructive}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text style={[styles.txDate, { color: colors.textMuted }]}>
                              {new Date(tx.createdAt).toLocaleDateString()}
                              {tx.utr && ` • UTR: ${tx.utr}`}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.txRight}>
                          <Text
                            style={[
                              styles.txAmount,
                              { color: isCredit ? colors.success : colors.text },
                            ]}
                          >
                            {isCredit ? "+" : "-"}₹{Math.abs(tx.amountRupees).toFixed(2)}
                          </Text>
                          <Text style={[styles.txBalAfter, { color: colors.textMuted }]}>
                            Bal: ₹{tx.balanceAfterRupees.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  balanceSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 12,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: 12,
    flex: 1,
  },
  amountHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  limitBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  helperErrorText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  presetGrid: {
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  upiCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
  },
  upiInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upiIdLabel: {
    fontSize: 12,
  },
  upiIdVal: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  openUpiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  openUpiBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  utrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
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
  stepsCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 6,
  },
  stepItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  utrInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "monospace",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  historyList: {
    gap: 10,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    marginVertical: 40,
    lineHeight: 20,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  txIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: {
    fontSize: 12,
    fontWeight: "600",
  },
  txDate: {
    fontSize: 10,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "700",
  },
  txBalAfter: {
    fontSize: 10,
    marginTop: 2,
  },
});
