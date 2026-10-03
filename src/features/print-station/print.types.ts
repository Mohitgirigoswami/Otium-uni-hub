import { PrintTypeEnum } from "@/lib/types";

export interface PrintRatesData {
  singleSidedPaise: number; // e.g. 250 for ₹2.50
  doubleSidedPaise: number; // e.g. 200 for ₹2.00
  colorSinglePaise: number; // e.g. 1000 for ₹10.00
  colorDoublePaise: number; // e.g. 800 for ₹8.00
  singleSidedRupees: number; // 2.50
  doubleSidedRupees: number; // 2.00
  colorSingleRupees?: number; // 10.00
  colorDoubleRupees?: number; // 8.00
}

export interface PrintUploadResult {
  fileUrl: string;
  fileName: string;
  pageCount: number;
  fileSizeBytes: number;
  filePath: string;
}

export interface CreatePrintOrderParams {
  userId: string;
  fileName: string;
  fileUrl?: string;
  driveFileId?: string;
  pageCount: number;
  copies?: number;
  printType: PrintTypeEnum;
  deliveryLocation: string;
  deliverySlot?: string;
  utr?: string;
  expectedDelivery?: string;
  collegeId?: string | null;
  phoneNumber?: string;
  paymentMethod?: "WALLET" | "UPI";
}

export interface ReportPrintIssueParams {
  orderId: string;
  userId: string;
  reason: string;
  category?: string;
}
