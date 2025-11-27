import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import Notification, { type INotification } from "@/models/Notification";

const updateNotificationsSchema = z.object({
  ids: z.array(z.string().trim().min(1)).optional(),
  action: z.enum(["markAllRead"]).optional(),
});

const mapNotificationToPayload = (notification: INotification) => ({
  id: notification._id.toString(),
  type: notification.type,
  message: notification.message,
  timestamp: notification.createdAt
    ? notification.createdAt.toISOString()
    : new Date().toISOString(),
  read: notification.read ?? false,
  postId: notification.postId
    ? notification.postId instanceof mongoose.Types.ObjectId
      ? notification.postId.toString()
      : String(notification.postId)
    : undefined,
  actor: {
    username: notification.actorUsername,
    name: notification.actorName,
    avatar: notification.actorAvatar,
  },
});

const getSessionUser = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  await connectMongo();

  const user = await User.findOne({
    email: session.user.email.toLowerCase(),
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { message: "User profile not found." },
        { status: 404 }
      ),
    };
  }

  return { user };
};

export async function GET() {
  try {
    const result = await getSessionUser();
    if ("error" in result) {
      return result.error;
    }

    const notifications = await Notification.find({
      recipient: result.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json(
      {
        notifications: notifications.map((doc) =>
          mapNotificationToPayload(doc as unknown as INotification)
        ),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[notifications][GET]", error);
    return NextResponse.json(
      { message: "Unable to load notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await getSessionUser();
    if ("error" in result) {
      return result.error;
    }

    const raw = await request.json();
    const payload = updateNotificationsSchema.parse(raw);

    if (payload.action === "markAllRead") {
      await Notification.updateMany(
        { recipient: result.user._id, read: false },
        { $set: { read: true } }
      );

      return NextResponse.json({ success: true }, { status: 200 });
    }

    const ids = payload.ids?.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "No valid notification ids provided." },
        { status: 400 }
      );
    }

    await Notification.updateMany(
      {
        recipient: result.user._id,
        _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[notifications][PATCH]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to update notifications." },
      { status: 500 }
    );
  }
}