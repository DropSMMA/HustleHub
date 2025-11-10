import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";

const commentInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  parentId: z.string().trim().optional(),
});

type CommentsRouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: Request, context: CommentsRouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await context.params;

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
      return NextResponse.json(
        { message: "Post not found." },
        { status: 404 }
      );
    }

    const DEFAULT_AVATAR =
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

    const commentId = new mongoose.Types.ObjectId().toString();
    const commentPayload = {
      id: commentId,
      userId: user._id,
      user: user.name ?? session.user.name ?? "HustleHub Creator",
      avatar:
        user.image ?? session.user.image ?? DEFAULT_AVATAR,
      text: payload.text,
      replies: [] as never[],
    };

    let responseComment = commentPayload;
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

      parent.replies = [...(parent.replies ?? []), { ...commentPayload }];
      responseComment = { ...commentPayload };
      status = 200;
    } else {
      post.comments.push({
        ...commentPayload,
        replies: [],
      });
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

