import mongoose, { Types } from "mongoose";
import connectMongo from "../libs/mongoose";
import Post from "../models/Post";
import Streak from "../models/Streak";
import { ActivityType } from "../app/types";

type MinimalPost = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: ActivityType;
  createdAt: Date;
};

type StreakSummary = {
  userId: Types.ObjectId;
  category: ActivityType;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeDate = (date: Date): Date => {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  return normalized;
};

const buildKey = (userId: Types.ObjectId, category: ActivityType) =>
  `${userId.toString()}:${category}`;

const computeSummaries = (posts: MinimalPost[]): StreakSummary[] => {
  const summaryMap = new Map<string, StreakSummary>();

  posts.forEach((post) => {
    if (!post.type || !post.userId || !post.createdAt) {
      return;
    }

    const normalizedDate = normalizeDate(post.createdAt);
    const key = buildKey(post.userId, post.type);
    const existing = summaryMap.get(key);

    if (!existing) {
      summaryMap.set(key, {
        userId: post.userId,
        category: post.type,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: normalizedDate,
      });
      return;
    }

    if (!existing.lastActiveDate) {
      existing.currentStreak = 1;
      existing.longestStreak = Math.max(existing.longestStreak, 1);
      existing.lastActiveDate = normalizedDate;
      return;
    }

    const diff = Math.floor(
      (normalizedDate.getTime() - existing.lastActiveDate.getTime()) / DAY_IN_MS
    );

    if (diff <= 0) {
      return;
    }

    if (diff === 1) {
      existing.currentStreak += 1;
    } else {
      existing.currentStreak = 1;
    }

    if (existing.currentStreak > existing.longestStreak) {
      existing.longestStreak = existing.currentStreak;
    }

    existing.lastActiveDate = normalizedDate;
  });

  return Array.from(summaryMap.values());
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");

  await connectMongo();

  const posts = (await Post.find({
    type: { $exists: true, $ne: null },
  })
    .select("_id userId type createdAt")
    .sort({ userId: 1, type: 1, createdAt: 1 })
    .lean()) as unknown as MinimalPost[];

  console.log(`Found ${posts.length} posts with activity categories.`);

  const summaries = computeSummaries(posts);
  console.log(`Computed ${summaries.length} streak summaries.`);

  if (dryRun) {
    console.log("Dry run complete. No database changes were made.");
    return;
  }

  if (summaries.length === 0) {
    console.log("No streaks to upsert. Exiting.");
    return;
  }

  const bulkOperations = summaries.map((summary) => ({
    updateOne: {
      filter: {
        userId: summary.userId,
        category: summary.category,
      },
      update: {
        $set: {
          currentStreak: summary.currentStreak,
          longestStreak: summary.longestStreak,
          lastActiveDate: summary.lastActiveDate,
        },
      },
      upsert: true,
    },
  }));

  const result = await Streak.bulkWrite(bulkOperations, { ordered: false });

  console.log("Backfill complete:");
  console.log(
    ` - upserts: ${result.upsertedCount ?? 0}, matched: ${
      result.matchedCount ?? 0
    }, modified: ${result.modifiedCount ?? 0}`
  );
};

main()
  .then(() => mongoose.connection.close())
  .catch((error) => {
    console.error("Streak backfill failed:", error);
    void mongoose.connection.close().finally(() => {
      process.exit(1);
    });
  });

