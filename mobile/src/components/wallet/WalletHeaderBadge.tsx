import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { apiClient } from "../../services/apiClient";
import { WalletRechargeModal } from "../../features/wallet/WalletRechargeModal";

const STORAGE_KEY_WALLET_BALANCE = "@otium_cached_wallet_balance";

interface WalletHeaderBadgeProps {
  onBalanceUpdated?: (balanceRupees: number) => void;
}

export function WalletHeaderBadge({ onBalanceUpdated }: WalletHeaderBadgeProps) {
  const { colors } = useTheme();
  const [balanceRupees, setBalanceRupees] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Instant 0ms cache restore on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_WALLET_BALANCE).then((cached) => {
      if (cached !== null) {
        const val = parseFloat(cached);
        if (!isNaN(val)) {
          setBalanceRupees(val);
        }
      }
    }).catch(() => {});
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await apiClient.get("/wallet");
      if (res.success && res.data) {
        const bal = Number(res.data.balanceRupees);
        setBalanceRupees(bal);
        onBalanceUpdated?.(bal);
        AsyncStorage.setItem(STORAGE_KEY_WALLET_BALANCE, bal.toString()).catch(() => {});
      }
    } catch {
      // Ignore network errors on background fetch
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.badgeContainer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="wallet-outline" size={13} color={colors.primary} />
        </View>

        <Text style={[styles.balanceText, { color: colors.text }]}>
          {balanceRupees !== null ? `₹${balanceRupees.toFixed(2)}` : "—"}
        </Text>

        <View style={[styles.plusDot, { backgroundColor: colors.primary + "22" }]}>
          <Ionicons name="add" size={11} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <WalletRechargeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          fetchBalance();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  plusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
