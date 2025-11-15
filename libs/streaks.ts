import mongoose, { Types } from "mongoose";
import { ActivityType } from "@/app/types";
import Streak, { IStreak } from "@/models/Streak";
import User from "@/models/User";

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeDate = (date: Date): Date => {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  return normalized;
};

const toObjectId = (value: Types.ObjectId | string): Types.ObjectId => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  return new mongoose.Types.ObjectId(value);
};

const streakKey = (userId: string, category: ActivityType) =>
  `${userId}:${category}`;

export interface StreakSummary {
  userId: string;
  category: ActivityType;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

export interface LeaderboardEntry extends StreakSummary {
  user: LeaderboardUser;
  rank: number;
}

export interface CategoryLeaderboard {
  category: ActivityType;
  entries: LeaderboardEntry[];
  generatedAt: Date;
}

type RecordStreakParams = {
  userId: Types.ObjectId | string;
  category: ActivityType;
  activityDate?: Date;
};

const toSummary = (doc: IStreak): StreakSummary => ({
  userId: doc.userId.toString(),
  category: doc.category,
  currentStreak: doc.currentStreak,
  longestStreak: doc.longestStreak,
  lastActiveDate: doc.lastActiveDate ?? null,
});

export const recordActivityStreak = async ({
  userId,
  category,
  activityDate = new Date(),
}: RecordStreakParams): Promise<StreakSummary> => {
  const normalizedDate = normalizeDate(activityDate);
  const targetUserId = toObjectId(userId);

  let streakDoc = await Streak.findOne({
    userId: targetUserId,
    category,
  });

  if (!streakDoc) {
    streakDoc = await Streak.create({
      userId: targetUserId,
      category,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: normalizedDate,
    });
    return toSummary(streakDoc);
  }

  if (streakDoc.lastActiveDate) {
    const lastActive = normalizeDate(streakDoc.lastActiveDate);
    const diff = Math.floor(
      (normalizedDate.getTime() - lastActive.getTime()) / DAY_IN_MS
    );

    if (diff < 0) {
      return toSummary(streakDoc);
    }

    if (diff === 0) {
      return toSummary(streakDoc);
    }

    if (diff === 1) {
      streakDoc.currentStreak += 1;
    } else if (diff > 1) {
      streakDoc.currentStreak = 1;
    }
  } else {
    streakDoc.currentStreak = 1;
  }

  if (streakDoc.currentStreak > streakDoc.longestStreak) {
    streakDoc.longestStreak = streakDoc.currentStreak;
  }

  streakDoc.lastActiveDate = normalizedDate;
  await streakDoc.save();

  return toSummary(streakDoc);
};

export const getStreakSummaries = async (
  targets: Array<{ userId: string; category: ActivityType }>
): Promise<Map<string, StreakSummary>> => {
  if (targets.length === 0) {
    return new Map();
  }

  const uniqueKeys = new Map<string, { userId: string; category: ActivityType }>();

  targets.forEach(({ userId, category }) => {
    if (!userId || !category) {
      return;
    }
    uniqueKeys.set(streakKey(userId, category), { userId, category });
  });

  if (uniqueKeys.size === 0) {
    return new Map();
  }

  const docs = await Streak.find({
    $or: Array.from(uniqueKeys.values()).map(({ userId, category }) => ({
      userId: new mongoose.Types.ObjectId(userId),
      category,
    })),
  });

  const summaryMap = new Map<string, StreakSummary>();

  docs.forEach((doc) => {
    summaryMap.set(streakKey(doc.userId.toString(), doc.category), toSummary(doc));
  });

  return summaryMap;
};

export const getCategoryLeaderboards = async ({
  limit = 10,
  categories = Object.values(ActivityType),
}: {
  limit?: number;
  categories?: ActivityType[];
}): Promise<CategoryLeaderboard[]> => {
  const sanitizedLimit = Math.min(Math.max(limit, 1), 50);
  const sanitizedCategories =
    categories.length > 0 ? categories : Object.values(ActivityType);

  const categoryDocs = await Promise.all(
    sanitizedCategories.map(async (category) => ({
      category,
      docs: await Streak.find({ category })
        .sort({ longestStreak: -1, currentStreak: -1, updatedAt: -1 })
        .limit(sanitizedLimit)
        .lean(),
    }))
  );

  const userIds = new Set<string>();
  categoryDocs.forEach(({ docs }) => {
    docs.forEach((doc) => {
      userIds.add(doc.userId.toString());
    });
  });

  const users =
    userIds.size > 0
      ? await User.find({ _id: { $in: Array.from(userIds) } })
          .select("name username image")
          .lean()
      : [];

  const userMap = new Map<string, LeaderboardUser>();
  users.forEach((user) => {
    userMap.set(user._id.toString(), {
      id: user._id.toString(),
      name: user.name ?? user.username ?? "Hustler",
      username: user.username ?? "",
      avatar: (user.image as string | undefined) ?? DEFAULT_AVATAR,
    });
  });

  return categoryDocs.map(({ category, docs }) => {
    const entries: LeaderboardEntry[] = docs.map((doc, index) => {
      const fallbackUser: LeaderboardUser = {
        id: doc.userId.toString(),
        name: "Hustler",
        username: "",
        avatar: DEFAULT_AVATAR,
      };

      return {
        ...toSummary(doc as IStreak),
        user: userMap.get(doc.userId.toString()) ?? fallbackUser,
        rank: index + 1,
      };
    });

    return {
      category,
      entries,
      generatedAt: new Date(),
    };
  });
};

export const buildStreakKey = streakKey;

