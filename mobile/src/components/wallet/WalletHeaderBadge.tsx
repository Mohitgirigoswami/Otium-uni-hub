import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { WalletRechargeModal } from "../../features/wallet/WalletRechargeModal";

export const STORAGE_KEY_WALLET_PAISE = "@otium_cached_wallet_paise";

interface WalletHeaderBadgeProps {
  onBalanceUpdated?: (balanceRupees: number) => void;
}

export function WalletHeaderBadge({ onBalanceUpdated }: WalletHeaderBadgeProps) {
  const { colors } = useTheme();
  const { user, refreshUser } = useUser();
  const [balanceRupees, setBalanceRupees] = useState<number | null>(
    user?.walletBalanceRupees !== undefined ? Number(user.walletBalanceRupees) : null
  );
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Instant 0ms cache restore on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_WALLET_PAISE).then((cached) => {
      if (cached !== null) {
        const paise = parseInt(cached, 10);
        if (!isNaN(paise)) {
          setBalanceRupees(paise / 100);
        }
      }
    }).catch(() => {});
  }, []);

  // Sync if user context balance updates
  useEffect(() => {
    if (user?.walletBalanceRupees !== undefined && user.walletBalanceRupees !== null) {
      setBalanceRupees(Number(user.walletBalanceRupees));
    }
  }, [user?.walletBalanceRupees]);

  const fetchBalance = async () => {
    try {
      const res = await apiClient.get<any>("/wallet");
      if (res.success && res.data) {
        const paise = Number(res.data.balancePaise ?? 0);
        const rupees = paise / 100;
        setBalanceRupees(rupees);
        onBalanceUpdated?.(rupees);
        AsyncStorage.setItem(STORAGE_KEY_WALLET_PAISE, paise.toString()).catch(() => {});
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
        onClose={() => {
          setModalVisible(false);
          fetchBalance();
        }}
        onSuccess={() => {
          fetchBalance();
          refreshUser();
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
