import {
  Activity,
  ActivityType,
  Comment,
  ConnectionPreview,
  FocusArea,
  UserProfile,
} from "@/app/types";
import { DEFAULT_AVATAR } from "./dashboard-constants";

export interface PostOwnerDTO {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
}

export interface PostDTO {
  id: string;
  userId: string;
  username?: string;
  name?: string;
  avatar?: string;
  type?: ActivityType;
  description: string;
  stats?: string;
  image?: string;
  kudos: number;
  likedByCurrentUser?: boolean;
  likedBy?: string[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  owner?: PostOwnerDTO;
  replyingTo?: {
    activityId: string;
    username: string;
    name?: string | null;
  };
  replyCount?: number;
}

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Just now";
  }
  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }
  if (diff < day * 7) {
    const days = Math.floor(diff / day);
    return `${days}d ago`;
  }
  return date.toLocaleDateString();
};

const normalize = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const mapPostToActivity = (post: PostDTO): Activity => ({
  id: post.id,
  user:
    normalize(post.owner?.name) ??
    normalize(post.name) ??
    normalize(post.owner?.username) ??
    "HustleHub Creator",
  username:
    normalize(post.owner?.username) ??
    normalize(post.username) ??
    normalize(post.owner?.name) ??
    "hustlehub-user",
  avatar:
    normalize(post.owner?.avatar) ??
    normalize(post.avatar) ??
    DEFAULT_AVATAR,
  type: post.type,
  description: post.description,
  stats: post.stats ?? "",
  image: post.image,
  kudos: post.kudos,
  likedByCurrentUser: Boolean(post.likedByCurrentUser),
  likedBy: post.likedBy ?? [],
  comments: post.comments ?? [],
  timestamp: formatRelativeTime(post.createdAt),
  replyingTo: post.replyingTo,
  replyCount: typeof post.replyCount === "number" ? post.replyCount : 0,
});

export const mapPostsToActivities = (posts: PostDTO[]): Activity[] =>
  posts.map(mapPostToActivity);

export const mapPreviewToUserProfile = (
  preview: ConnectionPreview
): UserProfile => ({
  username: preview.username,
  name: preview.name || preview.username,
  avatar: preview.avatar || DEFAULT_AVATAR,
  tagline: preview.tagline ?? "",
  projects: preview.projects ?? "",
  focuses: Array.isArray(preview.focuses)
    ? preview.focuses.filter((focus): focus is FocusArea =>
        Object.values(FocusArea).includes(focus)
      )
    : [],
  connections: [],
});

export interface DirectoryUserDTO {
  username?: string | null;
  name?: string | null;
  avatar?: string | null;
  image?: string | null;
  tagline?: string | null;
  projects?: string | string[] | null;
  focuses?: unknown;
  connections?: unknown;
  socials?: Record<string, unknown> | null;
}

const focusValues = new Set<string>(Object.values(FocusArea));

const isValidFocus = (focus: string): focus is FocusArea =>
  typeof focus === "string" && focusValues.has(focus);

export const normalizeDirectoryUser = (
  user: DirectoryUserDTO
): UserProfile | null => {
  const username =
    typeof user.username === "string" ? user.username.trim().toLowerCase() : "";

  if (!username) {
    return null;
  }

  const name =
    typeof user.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : username;

  const avatarCandidate =
    typeof user.avatar === "string" && user.avatar.trim().length > 0
      ? user.avatar.trim()
      : typeof user.image === "string" && user.image.trim().length > 0
      ? user.image.trim()
      : DEFAULT_AVATAR;

  const tagline = typeof user.tagline === "string" ? user.tagline.trim() : "";

  const projectsValue = user.projects;
  let projects = "";

  if (Array.isArray(projectsValue)) {
    projects = projectsValue
      .map((entry) =>
        typeof entry === "string" ? entry.trim() : String(entry ?? "")
      )
      .filter((entry) => entry.length > 0)
      .join(", ");
  } else if (typeof projectsValue === "string") {
    projects = projectsValue
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(", ");
  }

  const focuses = Array.isArray(user.focuses)
    ? (user.focuses
        .map((focus) => (typeof focus === "string" ? focus.trim() : ""))
        .filter((focus): focus is FocusArea => isValidFocus(focus)) as FocusArea[])
    : [];

  const connections = Array.isArray(user.connections)
    ? user.connections
        .map((connection) =>
          typeof connection === "string" ? connection.trim().toLowerCase() : ""
        )
        .filter((connection) => connection.length > 0)
    : [];

  const socials =
    user.socials && typeof user.socials === "object"
      ? Object.entries(user.socials).reduce((acc, [key, value]) => {
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
              acc[key as keyof UserProfile["socials"]] = trimmed;
            }
          }
          return acc;
        }, {} as NonNullable<UserProfile["socials"]>)
      : undefined;

  return {
    username,
    name,
    avatar: avatarCandidate,
    tagline,
    projects,
    focuses,
    connections,
    socials: socials && Object.keys(socials).length > 0 ? socials : undefined,
  };
};

