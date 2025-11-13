import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/libs/next-auth";
import connectMongo from "@/libs/mongoose";
import { deleteS3ObjectByUrl } from "@/libs/s3-utils";
import User from "@/models/User";
import { FocusArea } from "@/app/types";
import {
  normalizeProjectLinks,
  sanitizeProjectLinksForPersistence,
} from "@/libs/projects";

const socialsSchema = z
  .object({
    twitter: z.string().trim().max(255).optional(),
    github: z.string().trim().max(255).optional(),
    linkedin: z.string().trim().max(255).optional(),
    website: z.string().trim().max(255).optional(),
  })
  .partial()
  .optional();

const isValidAvatar = (value: string) => /^https?:\/\//.test(value);

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(120),
  url: z
    .string()
    .trim()
    .max(255, "Project link is too long.")
    .url("Project link must be a valid URL.")
    .optional(),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    tagline: z.string().trim().max(200).optional(),
    avatar: z
      .string()
      .trim()
      .refine((value) => isValidAvatar(value), {
        message: "Avatar must be a valid URL.",
      })
      .optional(),
    projects: z.array(projectSchema).optional(),
    focuses: z
      .array(z.nativeEnum(FocusArea))
      .min(1, "Select at least one focus area.")
      .max(3, "You can select up to three focus areas.")
      .optional(),
    socials: socialsSchema,
  })
  .refine(
    (data) => {
      if (
        !data.name &&
        !data.tagline &&
        !data.avatar &&
        !data.projects &&
        !data.focuses &&
        !data.socials
      ) {
        return false;
      }
      return true;
    },
    { message: "Provide at least one field to update." }
  );

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const user = await User.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const json = user.toJSON();
    return NextResponse.json(
      { user: { ...json, projects: normalizeProjectLinks(json.projects) } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[user][profile][GET]", error);
    return NextResponse.json(
      { message: "Unable to load user profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const payload = updateProfileSchema.parse(raw);

    await connectMongo();

    const user = await User.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User profile not found." },
        { status: 404 }
      );
    }

    const previousAvatar =
      typeof user.image === "string" && user.image.length > 0
        ? user.image
        : null;

    if (payload.name !== undefined) {
      user.name = payload.name;
    }

    if (payload.tagline !== undefined) {
      user.tagline = payload.tagline;
    }

    if (payload.avatar !== undefined) {
      user.image = payload.avatar;
    }

    if (payload.focuses !== undefined) {
      user.focuses = payload.focuses;
    }

    if (payload.projects !== undefined) {
      user.projects = sanitizeProjectLinksForPersistence(payload.projects);
    }

    if (payload.socials !== undefined) {
      const sanitizedEntries = Object.entries(payload.socials).map(
        ([key, value]) => {
          if (typeof value !== "string") {
            return [key, value] as const;
          }

          const trimmed = value.trim();

          return [key, trimmed.length > 0 ? trimmed : undefined] as const;
        }
      );

      sanitizedEntries.forEach(([key, value]) => {
        user.set(`socials.${key}`, value);
      });
    }

    const updatedUser = await user.save();

    if (
      payload.avatar !== undefined &&
      previousAvatar &&
      previousAvatar !== updatedUser.image
    ) {
      await deleteS3ObjectByUrl(previousAvatar);
    }

    const json = updatedUser.toJSON();
    return NextResponse.json(
      { user: { ...json, projects: normalizeProjectLinks(json.projects) } },
      { status: 200 }
    );
  } catch (error) {
    console.error("[user][profile][PATCH]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid data provided." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to update profile. Please try again later." },
      { status: 500 }
    );
  }
}
