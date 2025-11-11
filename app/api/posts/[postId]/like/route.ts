import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
import { NotificationType } from "@/app/types";

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

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

    const recipientId =
      post.userId instanceof mongoose.Types.ObjectId
        ? post.userId
        : new mongoose.Types.ObjectId(post.userId);

    const isSelfLike = recipientId.toString() === user._id.toString();

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter(
        (id) => id.toString() !== userIdString
      );

      if (!isSelfLike) {
        await Notification.findOneAndDelete({
          recipient: recipientId,
          actorId: user._id,
          type: NotificationType.Kudo,
          postId: post._id,
        });
      }
    } else {
      post.likedBy.push(user._id as mongoose.Types.ObjectId);

      if (!isSelfLike) {
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
            : typeof session.user?.image === "string" &&
              session.user.image.length > 0
            ? session.user.image
            : DEFAULT_AVATAR;

        await Notification.findOneAndUpdate(
          {
            recipient: recipientId,
            actorId: user._id,
            type: NotificationType.Kudo,
            postId: post._id,
          },
          {
            $set: {
              actorUsername,
              actorName,
              actorAvatar,
              message: "liked your post.",
              read: false,
            },
            $setOnInsert: {
              recipient: recipientId,
              actorId: user._id,
              postId: post._id,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
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
