export type WalletTransactionType =
  | "TOPUP"
  | "PRINT_PAYMENT"
  | "PRINT_CASHBACK"
  | "REFUND";

export type WalletTopupStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WalletTransactionDTO {
  id: string;
  type: string;
  amountPaise: number;
  amountRupees: number;
  balanceAfterPaise: number;
  balanceAfterRupees: number;
  utr: string | null;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

export interface WalletTopupRequestDTO {
  id: string;
  userId: string;
  amountPaise: number;
  amountRupees: number;
  utr: string;
  status: WalletTopupStatus;
  rejectionReason: string | null;
  verifiedBy: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export interface WalletDetails {
  balancePaise: number;
  balanceRupees: number;
  transactions: WalletTransactionDTO[];
  pendingTopups: WalletTopupRequestDTO[];
}

export interface SubmitTopupParams {
  amountPaise: number;
  utr: string;
  userId?: string;
}

export interface WalletPaymentParams {
  userId: string;
  orderId: string;
  costPaise: number;
  description: string;
  cashbackPct?: number; // Defaults to 2%
}

export interface WalletAdminOverviewDTO {
  totalFloatPaise: number;
  totalFloatRupees: number;
  totalStudents: number;
  pendingCount: number;
  pendingPaise: number;
  pendingRupees: number;
  approvedTodayCount: number;
  approvedTodayPaise: number;
  approvedTodayRupees: number;
  rejectedTodayCount: number;
  telegramConfigured: boolean;
  requests: WalletTopupRequestDTO[];
}
