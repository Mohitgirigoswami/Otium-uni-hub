import { TicketType, TicketStatus } from "@prisma/client";

export interface CreateSupportTicketParams {
  userId: string;
  subject: string;
  message: string;
  type: TicketType;
}

export interface ResolveSupportTicketParams {
  ticketId: string;
  adminUserId: string;
}

export interface BanUserParams {
  targetUserId: string;
  reason: string;
  adminUserId: string;
}

export interface UnbanUserParams {
  targetUserId: string;
  adminUserId: string;
}
