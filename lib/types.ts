import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "user";
export type ReactionType = "like" | "dislike";
export type FirestoreDate = Timestamp | Date | null | undefined;

export interface AppUserRecord {
  id: string;
  name?: string;
  nim?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  activeSessionId?: string;
  deviceInfo?: string;
  deviceId?: string;
  lastLogin?: FirestoreDate;
  createdAt?: FirestoreDate;
  isFrozen?: boolean;
}

export interface DashboardViewer {
  uid: string;
  email?: string;
  name?: string;
  nim?: string;
  role?: UserRole;
}

export interface BlockRecord {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  updatedAt?: FirestoreDate;
  createdAt?: FirestoreDate;
}

export interface VideoRecord {
  id: string;
  title: string;
  youtubeId: string;
  blockId: string;
  description?: string;
  uploadedBy?: string;
  isActive: boolean;
  order: number;
  likes: number;
  dislikes: number;
  createdAt?: FirestoreDate;
  updatedAt?: FirestoreDate;
}

export interface SessionRecord {
  id: string;
  uid: string;
  email?: string;
  deviceInfo?: string;
  deviceId?: string;
  ip?: string;
  createdAt?: FirestoreDate;
  unlockTokenHash?: string;
  unlockAttempts?: number;
  isUnlocked?: boolean;
}

export interface CommentRecord {
  id: string;
  videoId: string;
  userId: string;
  userEmail?: string;
  text: string;
  createdAt?: FirestoreDate;
}
