import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import type { IPost } from "@/models/Post";
import Notification from "@/models/Notification";
import { ActivityType, NotificationType } from "@/app/types";
import { serializePosts, toStringId, type OwnerInfo } from "./utils";

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

type PostDoc = mongoose.HydratedDocument<IPost>;

type SerializeOptions = {
  currentUserId: string | null;
  ownerOverrides?: Map<string, OwnerInfo>;
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

    const resolvedType = payload.type ?? undefined;

    if (!resolvedType && !replyingToSnapshot) {
      return NextResponse.json(
        { message: "Activity type is required for new posts." },
        { status: 400 }
      );
    }
    const post = await Post.create({
      userId: user._id,
      username: user.username,
      name: user.name ?? session.user.name ?? "HustleHub Creator",
      avatar:
        user.image ??
        session.user.image ??
        DEFAULT_AVATAR,
      ...(resolvedType ? { type: resolvedType } : {}),
      description: payload.description,
      stats: payload.stats,
      image: payload.image,
      kudos: 0,
      likedBy: [],
      comments: [],
      replyingTo: replyingToSnapshot,
    });

    if (replyingToSnapshot && parentPost) {
      const parentOwnerId =
        parentPost.userId instanceof mongoose.Types.ObjectId
          ? parentPost.userId
          : new mongoose.Types.ObjectId(parentPost.userId as any);
      const isSelfReply = parentOwnerId.equals(user._id as mongoose.Types.ObjectId);

      if (!isSelfReply) {
        const actorUsername =
          typeof user.username === "string" && user.username.length > 0
            ? user.username
            : typeof session.user?.email === "string"
            ? session.user.email.split("@")[0] ?? user._id.toString()
            : user._id.toString();
        const actorName =
          typeof user.name === "string" && user.name.length > 0
            ? user.name
            : typeof session.user?.name === "string"
            ? session.user.name
            : actorUsername;
        const actorAvatar =
          typeof user.image === "string" && user.image.length > 0
            ? user.image
            : typeof session.user?.image === "string" && session.user.image.length > 0
            ? session.user.image
            : DEFAULT_AVATAR;

        const message = parentPost.replyingTo
          ? "replied to your reply."
          : "replied to your post.";

        try {
          await Notification.create({
            recipient: parentOwnerId,
            actorId: user._id,
            actorUsername,
            actorName,
            actorAvatar,
            type: NotificationType.Comment,
            message,
            read: false,
            postId: post._id,
            metadata: {
              replyingToPostId: parentPost._id,
            },
          });
        } catch (notificationError) {
          console.error("[posts][POST][notification]", notificationError);
        }
      }
    }

    const ownerOverride = new Map<string, OwnerInfo>();
    const userIdString = toStringId(user._id) ?? user._id.toString();

    ownerOverride.set(userIdString, {
      name: user.name ?? session.user.name ?? "",
      username: user.username ?? "",
      avatar: user.image ?? session.user.image ?? DEFAULT_AVATAR,
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
