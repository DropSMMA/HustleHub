import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post, { type IReply } from "@/models/Post";

const commentInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  parentId: z.string().trim().optional(),
});

export async function POST(request: Request, context: any) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const postIdRaw = context?.params?.postId;
    const postId =
      typeof postIdRaw === "string"
        ? postIdRaw
        : Array.isArray(postIdRaw)
        ? postIdRaw[0]
        : undefined;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { message: "Invalid post identifier." },
        { status: 400 }
      );
    }

    const raw = await request.json();
    const payload = commentInputSchema.parse(raw);

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

    const post = await Post.findById(postId);

    if (!post) {
      return NextResponse.json({ message: "Post not found." }, { status: 404 });
    }

    const DEFAULT_AVATAR =
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    const commentId = new mongoose.Types.ObjectId().toString();
    const baseComment: IReply = {
      id: commentId,
      userId: user._id as mongoose.Types.ObjectId,
      user: user.name ?? session.user.name ?? "HustleHub Creator",
      avatar: user.image ?? session.user.image ?? DEFAULT_AVATAR,
      text: payload.text,
    };

    let responseComment = {
      ...baseComment,
      userId: baseComment.userId.toString(),
      replies: [] as never[],
    };
    let status = 201;

    if (payload.parentId) {
      const parent = post.comments.find(
        (comment) => comment.id === payload.parentId
      );

      if (!parent) {
        return NextResponse.json(
          { message: "Parent comment not found." },
          { status: 404 }
        );
      }

      parent.replies = [...(parent.replies ?? []), baseComment];
      responseComment = {
        ...baseComment,
        userId: baseComment.userId.toString(),
        replies: [] as never[],
      };
      status = 200;
    } else {
      post.comments.push({
        ...baseComment,
        replies: [],
      } as any);
      responseComment = {
        ...baseComment,
        userId: baseComment.userId.toString(),
        replies: [] as never[],
      };
    }

    await post.save();

    return NextResponse.json(
      {
        comment: responseComment,
        parentId: payload.parentId ?? null,
      },
      { status }
    );
  } catch (error) {
    console.error("[posts][comments][POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid comment.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to submit comment right now." },
      { status: 500 }
    );
  }
}
