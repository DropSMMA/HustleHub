import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  ActivityType,
  CategoryLeaderboard,
  LeaderboardEntry,
  UserProfile,
} from "@/app/types";
import { FlameIcon } from "./icons/FlameIcon";
import LoadingIndicator from "./LoadingIndicator";

interface LeaderboardsProps {
  data: CategoryLeaderboard[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  currentUser?: UserProfile | null;
  onViewProfile?: (username: string) => void;
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

const Leaderboards: React.FC<LeaderboardsProps> = ({
  data,
  isLoading,
  error,
  onRefresh,
  currentUser,
  onViewProfile,
}) => {
  const categories = useMemo(() => {
    if (data.length > 0) {
      return data.map((item) => item.category);
    }
    return Object.values(ActivityType);
  }, [data]);

  const [selectedCategory, setSelectedCategory] = useState<ActivityType>(
    categories[0]
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!categories.includes(selectedCategory) && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const rankedEntries =
    data.find((item) => item.category === selectedCategory)?.entries ?? [];

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-400";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-yellow-600";
      default:
        return "text-brand-text-secondary";
    }
  };

  const selectedCategoryLabel = categoryLabels[selectedCategory];

  return (
    <section className="container mx-auto px-4 max-w-2xl space-y-6 animate-fade-in">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-bold">Leaderboards</h2>
      </div>

      <div className="flex flex-wrap gap-2 justify-center px-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() =>
              startTransition(() => {
                setSelectedCategory(category);
              })
            }
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 whitespace-nowrap ${
              selectedCategory === category
                ? "bg-brand-neon text-brand-primary"
                : "bg-brand-secondary text-brand-text-secondary hover:bg-brand-tertiary"
            } ${
              isPending && selectedCategory === category ? "opacity-60" : ""
            }`}
            disabled={isPending && selectedCategory === category}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="bg-brand-secondary border border-brand-border rounded-2xl p-10 text-center">
          <LoadingIndicator label="Loading streaks…" size="lg" />
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 space-y-3 text-center">
          <p className="text-red-200 font-semibold">
            Unable to load leaderboards
          </p>
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
        <div
          className={`space-y-3 ${isPending ? "opacity-80" : ""}`}
          aria-busy={isPending}
        >
          {rankedEntries.length > 0 ? (
            rankedEntries.map((entry, index) => {
              const usernameLabel = entry.user.username
                ? `@${entry.user.username}`
                : "Unknown";
              const isCurrentUser =
                currentUser?.username &&
                entry.user.username.toLowerCase() ===
                  currentUser.username.toLowerCase();

              const content = (
                <>
                  <div
                    className={`w-8 text-center text-xl font-bold ${getRankColor(
                      index
                    )}`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex items-center space-x-3 flex-grow min-w-0">
                    <img
                      src={entry.user.avatar}
                      alt={entry.user.name}
                      className="h-12 w-12 rounded-full object-cover border border-brand-border"
                    />
                    <div className="min-w-0 text-left">
                      <p className="font-bold text-brand-text-primary truncate">
                        {entry.user.name}
                      </p>
                      <p className="text-sm text-brand-text-secondary truncate">
                        {usernameLabel}
                      </p>
                      <p className="text-xs text-brand-text-secondary">
                        Last active: {formatLastActive(entry.lastActiveDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-neon">
                      {entry.currentStreak}
                    </p>
                    <p className="text-xs text-brand-text-secondary">
                      day streak
                    </p>
                  </div>
                </>
              );

              const Wrapper = onViewProfile ? "button" : "div";

              return (
                <Wrapper
                  key={`${entry.category}-${entry.user.id}`}
                  type={onViewProfile ? "button" : undefined}
                  onClick={
                    onViewProfile
                      ? () => onViewProfile(entry.user.username)
                      : undefined
                  }
                  className={`w-full bg-brand-secondary border p-3 rounded-lg flex items-center space-x-4 transition-transform duration-200 hover:scale-[1.02] hover:border-brand-neon/50 ${
                    isCurrentUser
                      ? "border-brand-neon/70 bg-brand-secondary/90"
                      : "border-brand-border"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {content}
                </Wrapper>
              );
            })
          ) : (
            <div className="text-center py-16 text-brand-text-secondary bg-brand-secondary rounded-lg border border-brand-border space-y-2">
              <FlameIcon className="w-10 h-10 mx-auto text-brand-text-secondary" />
              <p className="font-semibold text-lg">No Active Streaks</p>
              <p>
                Be the first to start a streak in{" "}
                <span className="font-semibold text-brand-text-primary">
                  {selectedCategoryLabel}
                </span>
                !
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Leaderboards;
