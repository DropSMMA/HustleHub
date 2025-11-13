import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { FocusArea } from "@/app/types";
import {
  normalizeProjectLinks,
  projectLinksToDisplayString,
} from "@/libs/projects";

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username is required.")
  .max(30, "Username is too long.")
  .regex(/^[a-z0-9-_]+$/i, "Invalid username.");

const sendRequestSchema = z.object({
  username: usernameSchema,
});

const updateRequestSchema = z.object({
  username: usernameSchema,
  action: z.enum(["accept", "decline"]),
});

const mapUserToPreview = (user: any) => ({
  username: user.username,
  name: user.name ?? "",
  avatar: user.image ?? DEFAULT_AVATAR,
  tagline: user.tagline ?? "",
  focuses: Array.isArray(user.focuses) ? (user.focuses as FocusArea[]) : [],
  projects: projectLinksToDisplayString(normalizeProjectLinks(user.projects)),
});

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

const deterministicNotificationId = (username: string): number => {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = (hash << 5) - hash + username.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return 100000 + Math.abs(hash);
};

const getSessionUser = async () => {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  await connectMongo();

  const user = await User.findOne({
    email: session.user.email.toLowerCase(),
  });

  if (!user) {
    return {
      response: NextResponse.json(
        { message: "User profile not found." },
        { status: 404 }
      ),
    };
  }

  if (!user.username) {
    return {
      response: NextResponse.json(
        { message: "Complete your profile before managing connections." },
        { status: 409 }
      ),
    };
  }

  return { user };
};

export async function GET() {
  try {
    const result = await getSessionUser();
    if ("response" in result) {
      return result.response;
    }

    const viewer = result.user;

    const username = viewer.username;
    const connectionUsernames = sanitizeUsernames(viewer.connections);
    const incomingUsernames = sanitizeUsernames(viewer.incomingRequests);
    const outgoingUsernames = sanitizeUsernames(viewer.outgoingRequests);

    const uniqueUsernames = Array.from(
      new Set([
        ...connectionUsernames,
        ...incomingUsernames,
        ...outgoingUsernames,
      ])
    );

    const users =
      uniqueUsernames.length > 0
        ? await User.find({
            username: { $in: uniqueUsernames },
          })
            .select(
              "username name image tagline focuses projects connections socials"
            )
            .lean()
        : [];

    const userMap = new Map<string, any>();
    users.forEach((userDoc) => {
      userMap.set(userDoc.username, userDoc);
    });

    const buildPreviewList = (usernames: string[]) =>
      usernames.map((candidate) => {
        const doc = userMap.get(candidate);
        if (!doc) {
          return {
            username: candidate,
            name: candidate,
            avatar: DEFAULT_AVATAR,
            tagline: "",
            focuses: [] as FocusArea[],
            projects: "",
          };
        }
        return mapUserToPreview(doc);
      });

    return NextResponse.json(
      {
        username,
        connections: buildPreviewList(connectionUsernames),
        pending: {
          incoming: buildPreviewList(incomingUsernames),
          outgoing: buildPreviewList(outgoingUsernames),
        },
        notifications: buildPreviewList(incomingUsernames).map((request) => ({
          id: deterministicNotificationId(request.username).toString(),
          actor: {
            username: request.username,
            name: request.name,
            avatar: request.avatar,
          },
          message: "sent you a connection request.",
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[connections][GET]", error);
    return NextResponse.json(
      { message: "Unable to load connections." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionUser();
    if ("response" in result) {
      return result.response;
    }

    const viewer = result.user;

    const raw = await request.json();
    const payload = sendRequestSchema.parse(raw);
    const targetUsername = payload.username.toLowerCase();

    if (viewer.username.toLowerCase() === targetUsername) {
      return NextResponse.json(
        { message: "You cannot connect with yourself." },
        { status: 400 }
      );
    }

    const target = await User.findOne({ username: targetUsername });

    if (!target) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const viewerConnections = new Set(sanitizeUsernames(viewer.connections));
    const viewerIncoming = new Set(sanitizeUsernames(viewer.incomingRequests));
    const viewerOutgoing = new Set(sanitizeUsernames(viewer.outgoingRequests));

    const targetConnections = new Set(sanitizeUsernames(target.connections));
    const targetIncoming = new Set(sanitizeUsernames(target.incomingRequests));
    const targetOutgoing = new Set(sanitizeUsernames(target.outgoingRequests));

    if (viewerConnections.has(targetUsername)) {
      return NextResponse.json({ status: "connected" }, { status: 200 });
    }

    let status: "connected" | "pending" = "pending";

    if (viewerIncoming.has(targetUsername)) {
      // Accept existing request automatically
      viewerIncoming.delete(targetUsername);
      viewerOutgoing.delete(targetUsername);
      targetOutgoing.delete(viewer.username.toLowerCase());
      targetIncoming.delete(viewer.username.toLowerCase());
      viewerConnections.add(targetUsername);
      targetConnections.add(viewer.username.toLowerCase());
      status = "connected";
    } else if (!viewerOutgoing.has(targetUsername)) {
      viewerOutgoing.add(targetUsername);
      targetIncoming.add(viewer.username.toLowerCase());
      status = "pending";
    }

    viewer.connections = Array.from(viewerConnections);
    viewer.incomingRequests = Array.from(viewerIncoming);
    viewer.outgoingRequests = Array.from(viewerOutgoing);
    target.connections = Array.from(targetConnections);
    target.incomingRequests = Array.from(targetIncoming);
    target.outgoingRequests = Array.from(targetOutgoing);

    await viewer.save();
    await target.save();

    return NextResponse.json(
      { status },
      { status: status === "connected" ? 200 : 201 }
    );
  } catch (error) {
    console.error("[connections][POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid data provided." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Unable to process connection request." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await getSessionUser();
    if ("response" in result) {
      return result.response;
    }

    const viewer = result.user;

    const raw = await request.json();
    const payload = updateRequestSchema.parse(raw);
    const targetUsername = payload.username.toLowerCase();

    if (viewer.username.toLowerCase() === targetUsername) {
      return NextResponse.json(
        { message: "Invalid connection update." },
        { status: 400 }
      );
    }

    const target = await User.findOne({ username: targetUsername });

    if (!target) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const viewerConnections = new Set(sanitizeUsernames(viewer.connections));
    const viewerIncoming = new Set(sanitizeUsernames(viewer.incomingRequests));
    const viewerOutgoing = new Set(sanitizeUsernames(viewer.outgoingRequests));

    const targetConnections = new Set(sanitizeUsernames(target.connections));
    const targetIncoming = new Set(sanitizeUsernames(target.incomingRequests));
    const targetOutgoing = new Set(sanitizeUsernames(target.outgoingRequests));

    if (payload.action === "accept") {
      if (!viewerIncoming.has(targetUsername)) {
        return NextResponse.json(
          { message: "No pending connection request from this user." },
          { status: 404 }
        );
      }

      viewerIncoming.delete(targetUsername);
      viewerOutgoing.delete(targetUsername);
      targetOutgoing.delete(viewer.username.toLowerCase());
      targetIncoming.delete(viewer.username.toLowerCase());
      viewerConnections.add(targetUsername);
      targetConnections.add(viewer.username.toLowerCase());
    } else if (payload.action === "decline") {
      viewerIncoming.delete(targetUsername);
      targetOutgoing.delete(viewer.username.toLowerCase());
    }

    viewer.connections = Array.from(viewerConnections);
    viewer.incomingRequests = Array.from(viewerIncoming);
    viewer.outgoingRequests = Array.from(viewerOutgoing);
    target.connections = Array.from(targetConnections);
    target.incomingRequests = Array.from(targetIncoming);
    target.outgoingRequests = Array.from(targetOutgoing);

    await viewer.save();
    await target.save();

    return NextResponse.json({ status: payload.action }, { status: 200 });
  } catch (error) {
    console.error("[connections][PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid data provided." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Unable to update connection request." },
      { status: 500 }
    );
  }
}
