export enum ActivityType {
  DeepWork = "Deep Work",
  StartupTask = "Startup Task",
  Workout = "Workout",
  Recharge = "Recharge",
  Networking = "Networking",
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  replies?: Comment[];
}

export type MentionType = "connection" | "startup";

export interface ActivityMention {
  id: string;
  type: MentionType;
  handle: string;
  label: string;
  username?: string;
  url?: string;
}

export interface Activity {
  id: string;
  user: string;
  username: string;
  avatar: string;
  type?: ActivityType;
  description: string;
  stats: string;
  image?: string;
  kudos: number;
  likedByCurrentUser?: boolean;
  likedBy?: string[];
  comments?: Comment[];
  timestamp: string;
  timestampExact?: string;
  replyingTo?: {
    activityId: string;
    username: string;
    name?: string | null;
  };
  replyCount?: number;
  mentions?: ActivityMention[];
  streak?: ActivityStreak;
}

export interface ActivityStreak {
  category: ActivityType;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
}

export interface LeaderboardUserSummary {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface LeaderboardEntry {
  category: ActivityType;
  rank: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
  user: LeaderboardUserSummary;
}

export interface CategoryLeaderboard {
  category: ActivityType;
  entries: LeaderboardEntry[];
  generatedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  badge: string;
  type: ActivityType;
  goal: number;
  trackingMethod: "streak" | "count";
  participants: number;
}

export interface UserChallenge {
  challengeId: string;
  progress: number;
  streak?: number;
  lastLogDate?: string;
}

export type View =
  | "feed"
  | "activityDetail"
  | "log"
  | "insights"
  | "research"
  | "leaderboards"
  | "challenges"
  | "profile"
  | "publicProfile"
  | "notifications"
  | "connections"
  | "settings";

export enum FocusArea {
  DeepWork = "🧠 Deep Work / Coding",
  Fitness = "💪 Fitness / Health",
  Startup = "💼 Startup / Business Tasks",
  Recharge = "🧘 Mental Recharge",
  Networking = "🌍 Networking / Community",
}

export interface ProjectLink {
  name: string;
  url?: string;
}

export interface UserProfile {
  username: string;
  name: string;
  avatar: string;
  tagline: string;
  projects: ProjectLink[];
  focuses: FocusArea[];
  connections: string[];
  socials?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  pendingIncoming?: string[];
  pendingOutgoing?: string[];
}

export enum NotificationType {
  Comment = "comment",
  Mention = "mention",
  Kudo = "kudo",
  Challenge = "challenge",
  System = "system",
  ConnectRequest = "connectRequest",
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
  postId?: string;
  metadata?: Record<string, unknown>;
  actor: {
    name: string;
    avatar: string;
    username: string;
  };
}

export interface ConnectionPreview {
  username: string;
  name: string;
  avatar: string;
  tagline: string;
  focuses: FocusArea[];
  projects?: string;
}
