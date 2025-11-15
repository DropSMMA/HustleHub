import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityType,
  CategoryLeaderboard,
  LeaderboardEntry,
  UserProfile,
} from "@/app/types";
import { FlameIcon } from "./icons/FlameIcon";

interface LeaderboardsProps {
  data: CategoryLeaderboard[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  currentUser?: UserProfile | null;
}

const categoryLabels: Record<ActivityType, string> = {
  [ActivityType.DeepWork]: "Deep Work",
  [ActivityType.StartupTask]: "Startup Tasks",
  [ActivityType.Workout]: "Workouts",
  [ActivityType.Recharge]: "Recharge",
  [ActivityType.Networking]: "Networking",
};

const formatLastActive = (value?: string | null): string => {
  if (!value) {
    return "No activity yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No activity yet";
  }
  const diffMs = Date.now() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / dayMs);
  if (diffDays <= 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  return `${diffDays} days ago`;
};

const LeaderboardList: React.FC<{
  entries: LeaderboardEntry[];
  currentUser?: UserProfile | null;
}> = ({ entries, currentUser }) => {
  if (entries.length === 0) {
    return (
      <div className="bg-brand-secondary border border-dashed border-brand-border rounded-2xl p-8 text-center space-y-3">
        <FlameIcon className="w-10 h-10 mx-auto text-brand-text-secondary" />
        <p className="text-brand-text-primary font-semibold text-lg">
          No streaks yet
        </p>
        <p className="text-brand-text-secondary text-sm">
          Be the first to start a streak in this category by logging a new
          activity.
        </p>
      </div>
    );
  }

  const normalizedUsername = currentUser?.username?.toLowerCase();

  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const isCurrentUser =
          normalizedUsername &&
          entry.user.username.toLowerCase() === normalizedUsername;
        const usernameLabel = entry.user.username
          ? `@${entry.user.username}`
          : "Unknown";

        return (
          <li
            key={`${entry.category}-${entry.user.id}`}
            className={`flex items-center justify-between bg-brand-secondary rounded-2xl border px-4 py-3 gap-4 ${
              isCurrentUser
                ? "border-brand-neon/50 shadow-lg shadow-brand-neon/10"
                : "border-brand-border"
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-brand-tertiary text-brand-text-secondary font-bold">
                #{entry.rank}
              </div>
              <img
                src={entry.user.avatar}
                alt={entry.user.name}
                className="w-12 h-12 rounded-full object-cover border border-brand-border"
              />
              <div className="min-w-0">
                <p className="text-brand-text-primary font-semibold truncate">
                  {entry.user.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs uppercase tracking-wider text-brand-neon">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-brand-text-secondary">
                  {usernameLabel}
                </p>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Last active: {formatLastActive(entry.lastActiveDate)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-2 text-brand-neon font-bold text-base">
                <FlameIcon className="w-4 h-4 text-brand-neon" />
                {entry.currentStreak} day{entry.currentStreak === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-brand-text-secondary">
                Personal best: {entry.longestStreak} day
                {entry.longestStreak === 1 ? "" : "s"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const Leaderboards: React.FC<LeaderboardsProps> = ({
  data,
  isLoading,
  error,
  onRefresh,
  currentUser,
}) => {
  const categories = useMemo(() => {
    if (data.length > 0) {
      return data.map((item) => item.category);
    }
    return Object.values(ActivityType);
  }, [data]);

  const [activeCategory, setActiveCategory] = useState<ActivityType>(
    categories[0]
  );

  useEffect(() => {
    if (!categories.includes(activeCategory) && categories.length > 0) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const activeEntries =
    data.find((item) => item.category === activeCategory)?.entries ?? [];

  return (
    <section className="container mx-auto px-4 max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Leaderboards
          </h2>
          <p className="text-brand-text-secondary">
            Track the hottest streaks across every hustle category.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh()}
          className="btn btn-sm btn-outline border-brand-border text-brand-text-primary hover:border-brand-neon hover:text-brand-neon"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
              activeCategory === category
                ? "bg-brand-neon text-brand-primary border-brand-neon"
                : "border-brand-border text-brand-text-secondary hover:text-brand-text-primary"
            }`}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="bg-brand-secondary border border-brand-border rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-border border-t-brand-neon mx-auto animate-spin" />
          <p className="text-brand-text-secondary">Loading streaks…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 space-y-3">
          <p className="text-red-200 font-semibold">Unable to load leaderboards</p>
          <p className="text-sm text-red-200/80">{error}</p>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="btn btn-sm bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <LeaderboardList entries={activeEntries} currentUser={currentUser} />
      )}
    </section>
  );
};

export default Leaderboards;

