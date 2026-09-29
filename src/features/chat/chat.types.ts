export interface ConversationParticipant {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
  department?: string | null;
  year?: string | null;
  incognitoProfile?: {
    id?: string;
    handle?: string;
    avatarUrl?: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  senderId?: string | null;
  anonSenderId?: string | null;
  senderBlindId?: string | null;
  isMine?: boolean;
  sender?: ConversationParticipant;
}

export interface GetOrCreateConversationParams {
  participantOneId: string;
  participantTwoId: string;
  isAnonymousChat?: boolean;
}

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
}

export interface GetConversationMessagesOptions {
  cursor?: string;
  limit?: number;
  after?: string;
}
