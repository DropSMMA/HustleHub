import { useCallback, useRef, useState } from "react";
import apiClient from "@/libs/api";
import type { CategoryLeaderboard } from "@/app/types";

export const useStreakLeaderboards = () => {
  const [leaderboards, setLeaderboards] = useState<CategoryLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAtRef = useRef<number | null>(null);

  const fetchLeaderboards = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (isLoading) {
        return leaderboards;
      }

      const now = Date.now();
      const lastFetchedAt = lastFetchedAtRef.current;

      if (
        !force &&
        leaderboards.length > 0 &&
        lastFetchedAt &&
        now - lastFetchedAt < 60_000
      ) {
        return leaderboards;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = (await apiClient.get("/leaderboards")) as {
          leaderboards: CategoryLeaderboard[];
        };
        const payload = response.leaderboards ?? [];
        setLeaderboards(payload);
        lastFetchedAtRef.current = now;
        return payload;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load streak leaderboards.";
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, leaderboards]
  );

  return {
    leaderboards,
    isLoading,
    error,
    fetchLeaderboards,
  };
};

