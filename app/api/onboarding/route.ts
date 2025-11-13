import { NextResponse } from "next/server";
import { z } from "zod";
import connectMongo from "@/libs/mongoose";
import User from "@/models/User";
import { FocusArea } from "@/app/types";
import {
  normalizeProjectLinks,
  sanitizeProjectLinksForPersistence,
} from "@/libs/projects";

const socialsSchema = z
  .object({
    twitter: z.string().trim().min(1).max(255).optional(),
    github: z.string().trim().min(1).max(255).optional(),
    linkedin: z.string().trim().min(1).max(255).optional(),
    website: z.string().trim().min(1).max(255).optional(),
  })
  .partial()
  .optional();

const isValidAvatar = (value: string) =>
  value.startsWith("data:") || /^https?:\/\//.test(value);

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(120),
  url: z
    .string()
    .trim()
    .max(255, "Project link is too long.")
    .url("Project link must be a valid URL.")
    .optional(),
});

const onboardingSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1, "Name is required."),
  username: z.string().trim().min(3, "Username is required."),
  avatar: z
    .string()
    .trim()
    .refine((value) => isValidAvatar(value), {
      message: "Avatar must be a valid URL or data URI.",
    })
    .optional(),
  tagline: z.string().trim().max(200).optional(),
  projects: z.array(projectSchema).optional(),
  focuses: z
    .array(z.nativeEnum(FocusArea))
    .min(1, "Select at least one focus area.")
    .max(3, "You can select up to three focus areas."),
  socials: socialsSchema,
});

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || `user-${Date.now()}`;

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const payload = onboardingSchema.parse(raw);

    await connectMongo();

    const baseUsername = sanitizeUsername(payload.username);
    const projects = sanitizeProjectLinksForPersistence(
      payload.projects ?? []
    );
    const socials = payload.socials ?? {};

    const existingUserByEmail = await User.findOne({ email: payload.email });

    let usernameCandidate = baseUsername;
    let suffix = 1;
    const usernameOwnerId = existingUserByEmail?._id;

    while (
      await User.exists({
        username: usernameCandidate,
        ...(usernameOwnerId ? { _id: { $ne: usernameOwnerId } } : {}),
      })
    ) {
      usernameCandidate = `${baseUsername}-${suffix}`;
      suffix += 1;
    }

    const updates = {
      name: payload.name,
      email: payload.email,
      username: usernameCandidate,
      image: payload.avatar ?? existingUserByEmail?.image,
      tagline: payload.tagline ?? "",
      projects,
      focuses: payload.focuses,
      socials,
    };

    let userDoc;

    if (existingUserByEmail) {
      existingUserByEmail.set({
        ...updates,
        connections: existingUserByEmail.connections ?? [],
      });
      userDoc = await existingUserByEmail.save();
    } else {
      userDoc = await User.create({
        ...updates,
        connections: [],
      });
    }

    const json = userDoc.toJSON();
    return NextResponse.json(
      {
        user: {
          ...json,
          projects: normalizeProjectLinks(json.projects),
        },
        status: existingUserByEmail ? "updated" : "created",
      },
      { status: existingUserByEmail ? 200 : 201 }
    );
  } catch (error) {
    console.error("[onboarding][POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid data provided." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Unable to complete onboarding right now. Please try again later." },
      { status: 500 }
    );
  }
}

