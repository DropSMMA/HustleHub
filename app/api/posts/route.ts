import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post, { type IPost, type IComment } from "@/models/Post";
import { ActivityType } from "@/app/types";

type SerializedPost = Record<string, any>;

const isValidImage = (value: string) => /^https?:\/\//.test(value);
const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const replyingToInputSchema = z.object({
  activityId: z.string().trim(),
});

const createPostSchema = z
  .object({
    type: z.nativeEnum(ActivityType).optional(),
    description: z.string().trim().min(1).max(1000),
    stats: z.string().trim().max(120).optional(),
    image: z
      .string()
      .trim()
      .refine((value) => !value || isValidImage(value), {
        message: "Image must be a valid http(s) URL.",
      })
      .optional(),
    replyingTo: replyingToInputSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.replyingTo && !data.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Activity type is required for new posts.",
        path: ["type"],
      });
    }
  });

type OwnerInfo = {
  name: string;
  username: string;
  avatar: string;
};

type PostDoc = mongoose.HydratedDocument<IPost>;

type SerializeOptions = {
  currentUserId: string | null;
  ownerOverrides?: Map<string, OwnerInfo>;
};

const toStringId = (value: unknown): string | undefined => {
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

const serializePosts = async (
  posts: PostDoc[],
  { currentUserId, ownerOverrides }: SerializeOptions
) => {
  if (posts.length === 0) {
    return [] as SerializedPost[];
  }

  const serializedPosts = posts.map(
    (post) => post.toJSON() as SerializedPost
  );

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

    const owner =
      (userId && ownerMap.get(userId)) ||
      (post.username || post.name || post.avatar
        ? {
            name: post.name ?? "",
            username: post.username ?? "",
            avatar: post.avatar ?? DEFAULT_AVATAR,
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
    };
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const cursor = searchParams.get("cursor");

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

    await connectMongo();

    const session = await auth();

    const currentUser = session?.user?.email
      ? await User.findOne({
          email: session.user.email.toLowerCase(),
        })
          .select("_id")
          .lean()
      : null;

    const currentUserId = currentUser?._id?.toString() ?? null;

    const filter =
      cursor && mongoose.Types.ObjectId.isValid(cursor)
        ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
        : {};

    const posts = await Post.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1);

    let nextCursor: string | null = null;

    if (posts.length > limit) {
      const nextPost = posts.pop();
      nextCursor = nextPost ? nextPost.id : null;
    }

    const normalizedPosts = await serializePosts(posts, {
      currentUserId,
    });

    return NextResponse.json({
      posts: normalizedPosts,
      nextCursor,
    });
  } catch (error) {
    console.error("[posts][GET]", error);
    return NextResponse.json(
      { message: "Unable to load posts right now." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const payload = createPostSchema.parse(raw);

    await connectMongo();

    const user =
      (await User.findOne({
        email: session.user.email.toLowerCase(),
      })) ?? null;

    if (!user) {
      return NextResponse.json(
        { message: "User profile not found." },
        { status: 404 }
      );
    }

    if (!user.username) {
      return NextResponse.json(
        { message: "Complete your profile before posting." },
        { status: 409 }
      );
    }

    const replyingToInput = payload.replyingTo;

    let parentPost: PostDoc | null = null;
    let replyingToSnapshot: {
      postId: mongoose.Types.ObjectId;
      username: string;
      name?: string;
    } | null = null;

    if (replyingToInput) {
      const { activityId } = replyingToInput;

      if (!mongoose.Types.ObjectId.isValid(activityId)) {
        return NextResponse.json(
          { message: "Invalid parent activity identifier." },
          { status: 400 }
        );
      }

      parentPost = await Post.findById(activityId);

      if (!parentPost) {
        return NextResponse.json(
          { message: "Parent activity not found." },
          { status: 404 }
        );
      }

      replyingToSnapshot = {
        postId: new mongoose.Types.ObjectId(activityId),
        username: parentPost.username,
        name: parentPost.name,
      };
    }

    const resolvedType =
      payload.type ?? undefined;

    if (!resolvedType && !replyingToSnapshot) {
      return NextResponse.json(
        { message: "Activity type is required for new posts." },
        { status: 400 }
      );
    }
    const postData: Partial<IPost> & {
      userId: mongoose.Types.ObjectId;
      username: string;
      name: string;
      avatar: string;
      description: string;
      stats?: string;
      image?: string;
      kudos: number;
      likedBy: mongoose.Types.ObjectId[];
      comments: IComment[];
      replyingTo: typeof replyingToSnapshot;
    } = {
      userId: user._id,
      username: user.username,
      name: user.name ?? session.user.name ?? "HustleHub Creator",
      avatar:
        user.image ??
        session.user.image ??
        DEFAULT_AVATAR,
      description: payload.description,
      stats: payload.stats,
      image: payload.image,
      kudos: 0,
      likedBy: [],
      comments: [],
      replyingTo: replyingToSnapshot,
    };

    if (resolvedType) {
      postData.type = resolvedType;
    }

    const post = await Post.create(postData);

    const ownerOverride = new Map<string, OwnerInfo>();
    const userIdString = toStringId(user._id) ?? user._id.toString();

    ownerOverride.set(userIdString, {
      name: user.name ?? session.user.name ?? "",
      username: user.username ?? "",
      avatar:
        user.image ?? session.user.image ?? DEFAULT_AVATAR,
    });

    const [normalizedPost] = await serializePosts([post], {
      currentUserId: userIdString,
      ownerOverrides: ownerOverride,
    });

    return NextResponse.json(
      {
        post: normalizedPost,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("[posts][POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid data provided.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to publish post. Please try again later." },
      { status: 500 }
    );
  }
}
