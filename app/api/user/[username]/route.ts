import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";

const paramsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .max(30, "Username is too long.")
    .regex(/^[a-z0-9-_]+$/i, "Invalid username."),
});

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const validation = paramsSchema.safeParse({ username: params.username });

    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Invalid username provided.";
      return NextResponse.json({ message }, { status: 400 });
    }

    const username = validation.data.username.toLowerCase();

    await connectMongo();

    const userDoc = await User.findOne({ username }).lean();

    if (!userDoc) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const normalizedSocials = Object.entries(userDoc.socials ?? {}).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          acc[key] = trimmed;
        }
      }
      return acc;
    }, {});

    const normalizedUser = {
      username: userDoc.username,
      name: userDoc.name ?? "",
      avatar: userDoc.image ?? DEFAULT_AVATAR,
      tagline: userDoc.tagline ?? "",
      projects: Array.isArray(userDoc.projects)
        ? userDoc.projects.filter(Boolean).join(", ")
        : userDoc.projects ?? "",
      focuses: Array.isArray(userDoc.focuses) ? userDoc.focuses : [],
      connections: Array.isArray(userDoc.connections)
        ? userDoc.connections
        : [],
      socials:
        Object.keys(normalizedSocials).length > 0
          ? normalizedSocials
          : undefined,
    };

    const session = await auth();

    const viewer = session?.user?.email
      ? await User.findOne({
          email: session.user.email.toLowerCase(),
        })
          .select("_id")
          .lean()
      : null;

    const viewerId = viewer?._id?.toString() ?? null;

    const posts = await Post.find({ username })
      .sort({ createdAt: -1 })
      .limit(50);

    const ownerDetails = {
      name: normalizedUser.name,
      username: normalizedUser.username,
      avatar: normalizedUser.avatar,
    };

    const serializedPosts = posts.map((post) => {
      const likedBy =
        Array.isArray(post.likedBy) && post.likedBy.length > 0
          ? post.likedBy.map((id) => id.toString())
          : [];

      return {
        id: post._id.toString(),
        userId: post.userId.toString(),
        username: post.username,
        name: ownerDetails.name || post.name,
        avatar: ownerDetails.avatar,
        type: post.type,
        description: post.description,
        stats: post.stats,
        image: post.image,
        kudos: likedBy.length,
        likedByCurrentUser: viewerId ? likedBy.includes(viewerId) : false,
        likedBy,
        comments: post.comments ?? [],
        createdAt: post.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updatedAt: post.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        owner: ownerDetails,
      };
    });

    return NextResponse.json(
      {
        user: normalizedUser,
        posts: serializedPosts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[user][username][GET]", error);
    return NextResponse.json(
      { message: "Unable to load user profile." },
      { status: 500 }
    );
  }
}
