export enum ActivityType {
  DeepWork = "Deep Work",
  StartupTask = "Startup Task",
  Workout = "Workout",
  Recharge = "Recharge",
  Networking = "Networking"
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  replies?: Comment[];
}

export interface Activity {
  id: string;
  user: string;
  username: string;
  avatar: string;
  type: ActivityType;
  description: string;
  stats: string;
  image?: string;
  kudos: number;
  likedByCurrentUser?: boolean;
  likedBy?: string[];
  comments: Comment[];
  timestamp: string;
}

export interface Challenge {
    id: string;
    title: string;
    description: string;
    badge: string;
    type: ActivityType;
    goal: number;
    trackingMethod: 'streak' | 'count';
    participants: number;
}

export interface UserChallenge {
    challengeId: string;
    progress: number;
    streak?: number;
    lastLogDate?: string;
}


export type View = 'feed' | 'log' | 'insights' | 'research' | 'challenges' | 'profile' | 'publicProfile' | 'notifications' | 'connections' | 'settings';

export enum FocusArea {
    DeepWork = "🧠 Deep Work / Coding",
    Fitness = "💪 Fitness / Health",
    Startup = "💼 Startup / Business Tasks",
    Recharge = "🧘 Mental Recharge",
    Networking = "🌍 Networking / Community",
}

export interface UserProfile {
    username: string;
    name: string;
    avatar: string;
    tagline: string;
    projects: string;
    focuses: FocusArea[];
    connections: string[];
    socials?: {
        twitter?: string;
        github?: string;
        linkedin?: string;
        website?: string;
    };
}

export enum NotificationType {
    Comment = 'comment',
    Kudo = 'kudo',
    Challenge = 'challenge',
    System = 'system',
    ConnectRequest = 'connectRequest',
}

export interface Notification {
    id: number;
    type: NotificationType;
    message: string;
    timestamp: string;
    read: boolean;
    postId?: string;
    actor: {
        name: string;
        avatar: string;
        username: string;
    };
}