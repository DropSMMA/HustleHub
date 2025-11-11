import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import { ActivityType } from "@/app/types";

type SerializedPost = Record<string, any>;

const isValidImage = (value: string) => /^https?:\/\//.test(value);

const createPostSchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().trim().min(1).max(1000),
  stats: z.string().trim().max(120).optional(),
  image: z
    .string()
    .trim()
    .refine((value) => !value || isValidImage(value), {
      message: "Image must be a valid http(s) URL.",
    })
    .optional(),
});

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

    const serializedPosts = posts.map(
      (post) => post.toJSON() as SerializedPost
    );

    const normalizedPosts = serializedPosts.map((post, index) => {
      const original = posts[index];

      const likedBy =
        Array.isArray(original.likedBy) && original.likedBy.length > 0
          ? original.likedBy.map((id) => id.toString())
          : [];

      const userIdRaw = (post as Record<string, unknown>).userId;
      const userId =
        typeof userIdRaw === "string"
          ? userIdRaw
          : typeof userIdRaw === "object" && userIdRaw
          ? (userIdRaw as mongoose.Types.ObjectId).toString()
          : undefined;

      const normalized: SerializedPost = {
        ...post,
        userId,
        likedByCurrentUser: currentUserId
          ? likedBy.includes(currentUserId)
          : false,
        kudos: likedBy.length,
        likedBy,
      };

      return normalized;
    });

    const userIds = [
      ...new Set(
        normalizedPosts
          .map((post) => post.userId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const users =
      userIds.length > 0
        ? await User.find({ _id: { $in: userIds } })
            .select("username name image")
            .lean()
        : [];

    const DEFAULT_AVATAR =
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    const owners = new Map<
      string,
      { name: string; username: string; avatar: string }
    >(
      users.map((user) => [
        user._id.toString(),
        {
          name: user.name ?? "",
          username: user.username ?? "",
          avatar: (user.image as string | undefined) ?? DEFAULT_AVATAR,
        },
      ])
    );

    const enrichedPosts = normalizedPosts.map((post) => {
      const owner =
        (post.userId && owners.get(post.userId)) ||
        (post.username || post.name || post.avatar
          ? {
              name: post.name ?? "",
              username: post.username ?? "",
              avatar: post.avatar ?? DEFAULT_AVATAR,
            }
          : undefined);

      return {
        ...post,
        owner,
      };
    });

    return NextResponse.json({
      posts: enrichedPosts,
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

    const post = await Post.create({
      userId: user._id,
      username: user.username,
      name: user.name ?? session.user.name ?? "HustleHub Creator",
      avatar:
        user.image ??
        session.user.image ??
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
      type: payload.type,
      description: payload.description,
      stats: payload.stats,
      image: payload.image,
      kudos: 0,
      likedBy: [],
      comments: [],
    });

    const DEFAULT_AVATAR =
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    const owner = {
      name: user.name ?? session.user.name ?? "",
      username: user.username ?? "",
      avatar: user.image ?? session.user.image ?? DEFAULT_AVATAR,
    };

    const json = post.toJSON();

    return NextResponse.json(
      {
        post: {
          ...json,
          owner,
          likedByCurrentUser: false,
          likedBy: [],
          kudos: Array.isArray(post.likedBy) ? post.likedBy.length : 0,
        },
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
