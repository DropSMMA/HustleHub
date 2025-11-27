import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import { deleteS3ObjectByUrl } from "@/libs/s3-utils";
import Post from "@/models/Post";
import User from "@/models/User";

export async function DELETE(request: Request, context: any) {
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

    if (!post.userId.equals(user._id as mongoose.Types.ObjectId)) {
      return NextResponse.json(
        { message: "You are not allowed to delete this post." },
        { status: 403 }
      );
    }

    const imageUrl = post.image;

    await post.deleteOne();

    await deleteS3ObjectByUrl(imageUrl);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[posts][DELETE]", error);
    return NextResponse.json(
      { message: "Unable to delete post right now." },
      { status: 500 }
    );
  }
}