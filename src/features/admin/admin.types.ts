export interface UpdatePrintOrderStatusParams {
  orderId: string;
  status: "SUBMITTED" | "PRINTING" | "OUT_FOR_DELIVERY" | "READY" | "DELIVERED" | "COMPLETED" | "REJECTED" | "ISSUE_REPORTED";
  adminUserId: string;
  rejectionReason?: string;
}

export interface AdminDownloadUrlParams {
  filePathOrUrl: string;
  adminUserId: string;
}

export interface DeletePrintOrderPdfParams {
  orderId: string;
  adminUserId: string;
  fileUrl?: string | null;
}

export interface CreateCollegeParams {
  name: string;
  city: string;
  adminUserId: string;
}

export interface UpdateCollegeParams {
  id: string;
  name: string;
  city: string;
  adminUserId: string;
}

export interface UpdatePlatformUpiIdParams {
  upiId: string;
  adminUserId: string;
}
