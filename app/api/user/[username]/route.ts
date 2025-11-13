import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import type { IPost } from "@/models/Post";
import { serializePosts, type OwnerInfo } from "../../posts/utils";
import { normalizeProjectLinks } from "@/libs/projects";

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

const sanitizeUsernames = (values: unknown): string[] =>
  Array.isArray(values)
    ? Array.from(
        new Set(
          values
            .map((value) =>
              typeof value === "string" ? value.trim().toLowerCase() : ""
            )
            .filter((value) => value.length > 0)
        )
      )
    : [];

export async function GET(request: Request, context: any) {
  try {
    const { searchParams } = new URL(request.url);
    const usernameParam = context?.params?.username;
    const validation = paramsSchema.safeParse({ username: usernameParam });

    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Invalid username provided.";
      return NextResponse.json({ message }, { status: 400 });
    }

    const username = validation.data.username.toLowerCase();

    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const categoryOnlyParam = searchParams.get("categoryOnly");
    const limit = Math.min(Math.max(Number(limitParam) || 40, 1), 100);

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
      projects: normalizeProjectLinks(userDoc.projects),
      focuses: Array.isArray(userDoc.focuses) ? userDoc.focuses : [],
      connections: sanitizeUsernames(userDoc.connections),
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
          .select("_id username connections incomingRequests outgoingRequests")
          .lean()
      : null;

    const viewerId = viewer?._id?.toString() ?? null;
    const viewerUsername = viewer?.username?.toLowerCase();
    const viewerConnections = sanitizeUsernames(viewer?.connections);
    const viewerIncoming = sanitizeUsernames(viewer?.incomingRequests);
    const viewerOutgoing = sanitizeUsernames(viewer?.outgoingRequests);

    let relationship: "self" | "connected" | "incoming" | "outgoing" | "none" =
      "none";

    if (viewerUsername && viewerUsername === normalizedUser.username) {
      relationship = "self";
    } else if (viewerConnections.includes(normalizedUser.username)) {
      relationship = "connected";
    } else if (viewerIncoming.includes(normalizedUser.username)) {
      relationship = "incoming";
    } else if (viewerOutgoing.includes(normalizedUser.username)) {
      relationship = "outgoing";
    }

    const filterConditions: mongoose.FilterQuery<IPost>[] = [{ username }];

    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      filterConditions.push({
        _id: { $lt: new mongoose.Types.ObjectId(cursor) },
      });
    }

    const categoryOnly =
      categoryOnlyParam === null
        ? false
        : categoryOnlyParam.toLowerCase() !== "false";

    if (categoryOnly) {
      filterConditions.push({
        $or: [
          { replyingTo: null },
          {
            replyingTo: { $ne: null },
            type: { $exists: true, $ne: null },
          },
        ],
      });
    }

    const postFilter =
      filterConditions.length > 0 ? { $and: filterConditions } : {};

    const posts = await Post.find(postFilter)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    let nextCursor: string | null = null;

    if (posts.length > limit) {
      const nextPost = posts.pop();
      nextCursor = nextPost ? nextPost.id : null;
    }

    const countTargetIds = new Set<string>();
    posts.forEach((post) => {
      countTargetIds.add(post._id.toString());
    });

    const replyCounts =
      countTargetIds.size > 0
        ? await Post.aggregate<{
            _id: mongoose.Types.ObjectId;
            count: number;
          }>([
            {
              $match: {
                "replyingTo.postId": {
                  $in: Array.from(countTargetIds).map(
                    (id) => new mongoose.Types.ObjectId(id)
                  ),
                },
              },
            },
            {
              $group: {
                _id: "$replyingTo.postId",
                count: { $sum: 1 },
              },
            },
          ])
        : [];

    const replyCountMap = new Map<string, number>();
    replyCounts.forEach((entry) => {
      replyCountMap.set(entry._id.toString(), entry.count);
    });

    const ownerOverrides = new Map<string, OwnerInfo>();
    const userIdString = userDoc._id ? userDoc._id.toString() : null;

    if (userIdString) {
      ownerOverrides.set(userIdString, {
        name: normalizedUser.name,
        username: normalizedUser.username,
        avatar: normalizedUser.avatar,
      });
    }

    const serializedPosts = await serializePosts(posts, {
      currentUserId: viewerId,
      ownerOverrides: ownerOverrides.size > 0 ? ownerOverrides : undefined,
      replyCounts: replyCountMap,
    });

    return NextResponse.json(
      {
        user: normalizedUser,
        posts: serializedPosts,
        relationship: {
          status: relationship,
        },
        nextCursor,
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
