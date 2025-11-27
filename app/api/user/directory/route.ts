import { NextResponse } from "next/server";
import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { FocusArea, UserProfile } from "@/app/types";
import { normalizeProjectLinks } from "@/libs/projects";

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const focusValues = new Set<string>(Object.values(FocusArea));

const isValidFocus = (value: unknown): value is FocusArea =>
  typeof value === "string" && focusValues.has(value);

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

const sanitizeSocials = (
  socials: unknown
): UserProfile["socials"] | undefined => {
  if (!socials || typeof socials !== "object") {
    return undefined;
  }

  const normalized = Object.entries(socials as Record<string, unknown>).reduce<
    NonNullable<UserProfile["socials"]>
  >((acc, [key, value]) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        acc[key as keyof UserProfile["socials"]] = trimmed;
      }
    }
    return acc;
  }, {} as NonNullable<UserProfile["socials"]>);

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeProjects = (projects: unknown) =>
  normalizeProjectLinks(projects);

const mapUserToProfile = (user: any): UserProfile | null => {
  const username =
    typeof user.username === "string" ? user.username.trim().toLowerCase() : "";

  if (!username) {
    return null;
  }

  const name =
    typeof user.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : username;

  const avatar =
    typeof user.image === "string" && user.image.trim().length > 0
      ? user.image.trim()
      : DEFAULT_AVATAR;

  const tagline = typeof user.tagline === "string" ? user.tagline.trim() : "";

  const focuses = Array.isArray(user.focuses)
    ? (user.focuses
        .map((focus: unknown) =>
          typeof focus === "string" ? focus.trim() : ""
        )
        .filter((focus: string): focus is FocusArea =>
          isValidFocus(focus)
        ) as FocusArea[])
    : [];

  const connections = sanitizeUsernames(user.connections);

  return {
    username,
    name,
    avatar,
    tagline,
    projects: normalizeProjects(user.projects),
    focuses,
    connections,
    socials: sanitizeSocials(user.socials),
  };
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const viewer = await User.findOne({
      email: session.user.email.toLowerCase(),
    })
      .select("username")
      .lean();

    if (!viewer?.username) {
      return NextResponse.json(
        { message: "Complete your profile to browse the community." },
        { status: 409 }
      );
    }

    const users = await User.find({
      username: { $exists: true, $nin: [null, ""] },
    })
      .select(
        "username name image tagline projects focuses connections socials updatedAt"
      )
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const profiles = users
      .map(mapUserToProfile)
      .filter((profile): profile is UserProfile =>
        Boolean(profile && profile.username !== viewer.username)
      );

    return NextResponse.json({ users: profiles }, { status: 200 });
  } catch (error) {
    console.error("[user][directory][GET]", error);
    return NextResponse.json(
      { message: "Unable to load user directory." },
      { status: 500 }
    );
  }
}