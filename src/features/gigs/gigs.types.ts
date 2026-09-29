import { TaskCategoryType } from "@/lib/types";

export interface EscrowCalculation {
  rawPrice: number;
  discountPct: number;
  discountAmount: number;
  finalBuyerTotal: number;
  commission: number;
  writerPayout: number;
  ghostedGuarantee: number;
  advanceRequired: number;
  finalSettlement: number;
}

export interface CreateGigParams {
  posterId: string;
  title: string;
  description: string;
  budgetRupees: number;
  category: TaskCategoryType;
  deadline?: string;
  fileUrl?: string;
  collegeId?: string;
}

export interface GetGigsFilters {
  category?: string;
  status?: string;
  search?: string;
  collegeId?: string;
  limit?: number;
}

export interface SubmitAdvanceUtrParams {
  gigId: string;
  buyerId: string;
  advanceUtr: string;
}

export interface SubmitFinalUtrParams {
  gigId: string;
  buyerId: string;
  finalUtr: string;
}

export interface AdminMarkPayoutSentParams {
  gigId: string;
  adminUserId: string;
  payoutUtr: string;
}
