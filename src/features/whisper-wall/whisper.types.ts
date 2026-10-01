import { ActionResponse } from "@/lib/types";

export interface IncognitoProfileData {
  id: string;
  userId?: string;
  handle: string;
  avatarUrl: string;
}

export interface IncognitoPostData {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaUrls?: string[];
  feedType: string;
  profileId: string;
  collegeId?: string | null;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  profile?: IncognitoProfileData;
  college?: {
    id: string;
    name: string;
    city: string;
  } | null;
  likes?: { userId: string }[];
  comments?: any[];
  _count?: {
    comments: number;
    likes: number;
  };
}

export interface CreatePostParams {
  userId: string;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  feedType?: string;
  collegeId?: string | null;
}

export interface GetPostsParams {
  feedType?: string;
  scope?: "CAMPUS" | "GLOBAL";
  collegeId?: string | null;
  userId?: string;
  limit?: number;
}
