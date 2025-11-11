import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";

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

    post.likedBy = post.likedBy ?? [];

    const userIdString = user._id.toString();
    const currentLikedBy = post.likedBy.map((id) =>
      id instanceof mongoose.Types.ObjectId ? id.toString() : String(id)
    );
    const alreadyLiked = currentLikedBy.includes(userIdString);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter(
        (id) => id.toString() !== userIdString
      );
    } else {
      post.likedBy.push(user._id as mongoose.Types.ObjectId);
    }

    post.kudos = post.likedBy.length;

    await post.save();

    return NextResponse.json(
      {
        liked: !alreadyLiked,
        kudos: post.likedBy.length,
        likedBy: post.likedBy.map((id) => id.toString()),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[posts][like][POST]", error);
    return NextResponse.json(
      { message: "Unable to toggle like right now." },
      { status: 500 }
    );
  }
}
