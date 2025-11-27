import mongoose from "mongoose";
import User from "@/models/User";
import type { IPost } from "@/models/Post";

export type OwnerInfo = {
  name: string;
  username: string;
  avatar: string;
};

export type SerializedPost = Record<string, unknown>;

type SerializeOptions = {
  currentUserId: string | null;
  ownerOverrides?: Map<string, OwnerInfo>;
  replyCounts?: Map<string, number>;
};

export const toStringId = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof (value as { toString: () => string }).toString === "function"
  ) {
    const stringValue = (value as { toString: () => string }).toString();
    return /^[a-fA-F0-9]{24}$/.test(stringValue) ? stringValue : undefined;
  }

  return undefined;
};

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

export const serializePosts = async (
  posts: mongoose.HydratedDocument<IPost>[],
  { currentUserId, ownerOverrides, replyCounts }: SerializeOptions
) => {
  if (posts.length === 0) {
    return [] as SerializedPost[];
  }

  const serializedPosts = posts.map((post) => post.toJSON() as SerializedPost);

  const likedByLists = posts.map((post) =>
    Array.isArray(post.likedBy)
      ? post.likedBy
          .map((id) => toStringId(id))
          .filter((id): id is string => Boolean(id))
      : []
  );

  const userIds = new Set<string>();
  const replyingToSnapshots: Array<
    | {
        activityId: string;
        username: string;
        name?: string | null;
      }
    | undefined
  > = [];

  serializedPosts.forEach((post, index) => {
    const original = posts[index];
    const userId =
      toStringId(post.userId) ?? toStringId(original.userId as unknown);

    if (userId) {
      userIds.add(userId);
    }

    const replyingToRaw =
      (post as { replyingTo?: unknown }).replyingTo ??
      (original.replyingTo as unknown);

    let replyingTo;
    if (replyingToRaw && typeof replyingToRaw === "object") {
      const { postId, username, name } = replyingToRaw as {
        postId?: unknown;
        username?: unknown;
        name?: unknown;
      };

      const activityId = toStringId(postId);

      if (activityId) {
        const fallbackUsername =
          typeof username === "string" && username.length > 0
            ? username
            : original.replyingTo?.username ?? "";
        const fallbackName =
          typeof name === "string"
            ? name
            : name === null
            ? null
            : original.replyingTo?.name ?? null;

        replyingTo = {
          activityId,
          username: fallbackUsername,
          name: fallbackName,
        };
      }
    }

    replyingToSnapshots.push(replyingTo);
  });

  const ownerMap = new Map<string, OwnerInfo>();

  if (userIds.size > 0) {
    const owners = await User.find({ _id: { $in: Array.from(userIds) } })
      .select("username name image")
      .lean();

    owners.forEach((owner) => {
      ownerMap.set(owner._id.toString(), {
        name: owner.name ?? "",
        username: owner.username ?? "",
        avatar: (owner.image as string | undefined) ?? DEFAULT_AVATAR,
      });
    });
  }

  if (ownerOverrides) {
    ownerOverrides.forEach((value, key) => {
      ownerMap.set(key, value);
    });
  }

  return serializedPosts.map((post, index) => {
    const likedBy = likedByLists[index];
    const userId =
      toStringId(post.userId) ?? toStringId(posts[index].userId as unknown);
    const replyingTo = replyingToSnapshots[index];
    const postIdString =
      toStringId(posts[index]._id as unknown) ??
      toStringId((post as { _id?: unknown })._id);

    const owner =
      (userId && ownerMap.get(userId)) ||
      (post.username || post.name || post.avatar
        ? {
            name: (post.name as string | undefined) ?? "",
            username: (post.username as string | undefined) ?? "",
            avatar: (post.avatar as string | undefined) ?? DEFAULT_AVATAR,
          }
        : undefined);

    return {
      ...post,
      userId,
      likedByCurrentUser: Boolean(
        currentUserId && likedBy.includes(currentUserId)
      ),
      kudos: likedBy.length,
      likedBy,
      replyingTo,
      owner,
      replyCount:
        (postIdString && replyCounts?.get(postIdString)) ??
        (typeof (post as { replyCount?: unknown }).replyCount === "number"
          ? ((post as { replyCount: number }).replyCount as number)
          : 0),
    } satisfies SerializedPost;
  });
};