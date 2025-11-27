import {
  Activity,
  ActivityMention,
  ActivityType,
  Comment,
} from "@/app/types";

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
  mentions?: ActivityMention[];
}

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const FALLBACK_NAME = "HustleHub Creator";
const FALLBACK_USERNAME = "hustlehub-user";

const formatRelativeTime = (dateString: string): string => {
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
    FALLBACK_NAME,
  username:
    normalize(post.owner?.username) ??
    normalize(post.username) ??
    normalize(post.owner?.name) ??
    FALLBACK_USERNAME,
  avatar:
    normalize(post.owner?.avatar) ??
    normalize(post.avatar) ??
    FALLBACK_AVATAR,
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
  mentions: post.mentions,
});

export const mapPostsToActivities = (posts: PostDTO[]): Activity[] =>
  posts.map(mapPostToActivity);
