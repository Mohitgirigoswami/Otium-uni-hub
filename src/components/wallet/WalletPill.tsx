"use client";

import React, { useState, useEffect } from "react";
import { Wallet, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { getWalletDetailsAction } from "@/features/wallet/wallet.actions";
import { TopupModal } from "./TopupModal";

interface WalletPillProps {
  className?: string;
}

export function WalletPill({ className = "" }: WalletPillProps) {
  const { data: session } = useSession();
  const [balanceRupees, setBalanceRupees] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBalance = async () => {
    if (!session?.user) return;
    try {
      const res = await getWalletDetailsAction();
      if (res.success && res.data) {
        setBalanceRupees(res.data.balanceRupees);
      }
    } catch {
      // Keep state null
    }
  };

  useEffect(() => {
    fetchBalance();

    const handleUpdate = () => fetchBalance();
    window.addEventListener("otium:wallet_updated", handleUpdate);
    return () => window.removeEventListener("otium:wallet_updated", handleUpdate);
  }, [session?.user]);

  if (!session?.user) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-secondary text-xs font-semibold transition-all hover:border-primary/40 ${className}`}
        title="Otium Campus E-Wallet"
      >
        <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Wallet className="w-3 h-3" />
        </div>
        <span className="font-mono text-foreground font-bold">
          {balanceRupees !== null ? `₹${balanceRupees.toFixed(2)}` : "—"}
        </span>
        <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
          <Plus className="w-2.5 h-2.5" />
        </div>
      </button>

      <TopupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchBalance();
        }}
      />
    </>
  );
}
