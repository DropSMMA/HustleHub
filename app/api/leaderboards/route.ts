import { NextResponse } from "next/server";
import { z } from "zod";
import connectMongo from "@/libs/mongoose";
import { getCategoryLeaderboards } from "@/libs/streaks";

const querySchema = z.object({
  limit: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = querySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
    });

    await connectMongo();

    const leaderboards = await getCategoryLeaderboards({
      limit: rawParams?.limit,
    });

    const payload = leaderboards.map((category) => ({
      category: category.category,
      generatedAt: category.generatedAt.toISOString(),
      entries: category.entries.map((entry) => ({
        category: entry.category,
        rank: entry.rank,
        currentStreak: entry.currentStreak,
        longestStreak: entry.longestStreak,
        lastActiveDate: entry.lastActiveDate
          ? entry.lastActiveDate.toISOString()
          : null,
        user: entry.user,
      })),
    }));

    return NextResponse.json({ leaderboards: payload });
  } catch (error) {
    console.error("[leaderboards][GET]", error);
    return NextResponse.json(
      { message: "Unable to load leaderboards right now." },
      { status: 500 }
    );
  }
}

