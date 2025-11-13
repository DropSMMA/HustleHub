import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { Activity, Challenge, UserChallenge, UserProfile } from "@/app/types";
import apiClient from "@/libs/api";
import {
  DEFAULT_POST_LIMIT,
  MOCK_ACTIVITIES,
  createWelcomeActivity,
  isMongoObjectId,
} from "../lib/dashboard-constants";
import { mapPostsToActivities, PostDTO } from "../lib/normalizers";

type FetchPostsOptions = {
  cursor?: string | null;
  replace?: boolean;
  categoryOnly?: boolean;
  username?: string;
  replyingTo?: string;
  limit?: number;
};

interface UseDashboardActivitiesParams {
  challenges: Challenge[];
  userProfile: UserProfile | null;
  setUserChallenges: React.Dispatch<React.SetStateAction<UserChallenge[]>>;
  onActivityLogged: () => void;
}

export const useDashboardActivities = ({
  challenges,
  userProfile,
  setUserChallenges,
  onActivityLogged,
}: UseDashboardActivitiesParams) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [hasLoadedPosts, setHasLoadedPosts] = useState(false);
  const [loadingReplyThreads, setLoadingReplyThreads] = useState<
    Record<string, boolean>
  >({});
  const [loadingUserActivities, setLoadingUserActivities] = useState<
    Record<string, boolean>
  >({});
  const [userActivitiesByUsername, setUserActivitiesByUsername] = useState<
    Record<string, Activity[]>
  >({});

  const upsertActivities = useCallback((incoming: Activity[]) => {
    if (incoming.length === 0) {
      return;
    }

    setActivities((prev) => {
      if (incoming.length === 0) {
        return prev;
      }

      const updated = [...prev];
      const indexMap = new Map<string, number>();

      updated.forEach((activity, index) => {
        indexMap.set(activity.id, index);
      });

      incoming.forEach((activity) => {
        const normalizedActivity: Activity = {
          ...activity,
          replyCount:
            typeof activity.replyCount === "number" ? activity.replyCount : 0,
        };
        const existingIndex = indexMap.get(normalizedActivity.id);
        if (existingIndex !== undefined) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...normalizedActivity,
          };
        } else {
          updated.push(normalizedActivity);
          indexMap.set(normalizedActivity.id, updated.length - 1);
        }
      });

      return updated;
    });
  }, []);

  const fetchPosts: (options?: FetchPostsOptions) => Promise<Activity[]> =
    useCallback(
      async ({
        cursor,
        replace = false,
        categoryOnly = true,
        username,
        replyingTo,
        limit = DEFAULT_POST_LIMIT,
      }: FetchPostsOptions = {}): Promise<Activity[]> => {
        const params: Record<string, string> = {
          limit: String(Math.max(1, Math.min(limit, 100))),
        };
        if (cursor) {
          params.cursor = cursor;
        }
        if (username) {
          params.username = username;
        }
        if (replyingTo) {
          params.replyingTo = replyingTo;
        }
        params.categoryOnly = categoryOnly ? "true" : "false";

        try {
          if (cursor) {
            setIsLoadingMore(true);
          }

          const { posts, nextCursor } = (await apiClient.get("/posts", {
            params,
          })) as { posts: PostDTO[]; nextCursor: string | null };

          const mappedActivities: Activity[] = mapPostsToActivities(posts).map(
            (activity) => ({
              ...activity,
              replyCount:
                typeof activity.replyCount === "number"
                  ? activity.replyCount
                  : 0,
            })
          );

          if (cursor) {
            setActivities((prev) => {
              const existingIds = new Set(prev.map((activity) => activity.id));
              const filtered = mappedActivities.filter(
                (activity) => !existingIds.has(activity.id)
              );
              return [...prev, ...filtered];
            });
          } else {
            setActivities((prev) => {
              const base = [...mappedActivities];
              const repliesToKeep = prev.filter((activity) =>
                Boolean(activity.replyingTo?.activityId)
              );
              const existingIds = new Set(base.map((activity) => activity.id));

              repliesToKeep.forEach((reply) => {
                const normalizedReply: Activity = {
                  ...reply,
                  replyCount:
                    typeof reply.replyCount === "number" ? reply.replyCount : 0,
                };

                if (existingIds.has(normalizedReply.id)) {
                  const index = base.findIndex(
                    (candidate) => candidate.id === normalizedReply.id
                  );
                  if (index >= 0) {
                    base[index] = {
                      ...base[index],
                      ...normalizedReply,
                    };
                  }
                } else {
                  base.push(normalizedReply);
                }
              });

              return base;
            });
          }

          setPostsCursor(nextCursor ?? null);

          return mappedActivities;
        } catch (error) {
          console.error("Failed to load posts", error);
          return [];
        } finally {
          if (cursor) {
            setIsLoadingMore(false);
          }
        }
      },
      []
    );

  const fetchRepliesForActivity: (
    activityId: string,
    options?: { cursor?: string | null; limit?: number }
  ) => Promise<{ replies: Activity[]; nextCursor: string | null }> =
    useCallback(
      async (
        activityId: string,
        options?: { cursor?: string | null; limit?: number }
      ) => {
        const toVisit: string[] = [activityId];
        const visited = new Set<string>();
        const aggregatedReplies: Activity[] = [];
        const aggregatedReplyIds = new Set<string>();

        while (toVisit.length > 0) {
          const parentId = toVisit.shift();
          if (!parentId) {
            continue;
          }

          if (visited.has(parentId)) {
            continue;
          }
          visited.add(parentId);

          if (loadingReplyThreads[parentId]) {
            continue;
          }

          setLoadingReplyThreads((prev) => ({
            ...prev,
            [parentId]: true,
          }));

          const params: Record<string, string> = {
            limit: String(
              Math.max(1, Math.min(options?.limit ?? DEFAULT_POST_LIMIT, 100))
            ),
            replyingTo: parentId,
            categoryOnly: "false",
          };

          try {
            let cursor =
              parentId === activityId ? options?.cursor ?? null : null;

            do {
              const requestParams = { ...params };
              if (cursor) {
                requestParams.cursor = cursor;
              }

              const response = (await apiClient.get("/posts", {
                params: requestParams,
              })) as { posts: PostDTO[]; nextCursor: string | null };

              const normalizedReplies: Activity[] = mapPostsToActivities(
                response.posts
              ).map((reply) => ({
                ...reply,
                replyCount:
                  typeof reply.replyCount === "number" ? reply.replyCount : 0,
              }));

              setActivities((prev) => {
                if (normalizedReplies.length === 0) {
                  return prev;
                }

                const updated = [...prev];
                const indexMap = new Map<string, number>();

                updated.forEach((activity, index) => {
                  indexMap.set(activity.id, index);
                });

                normalizedReplies.forEach((reply) => {
                  const existingIndex = indexMap.get(reply.id);
                  if (existingIndex !== undefined) {
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      ...reply,
                    };
                  } else {
                    updated.push(reply);
                  }
                });

                return updated;
              });

              normalizedReplies.forEach((reply) => {
                if (!aggregatedReplyIds.has(reply.id)) {
                  aggregatedReplies.push(reply);
                  aggregatedReplyIds.add(reply.id);
                }

                if (reply.id && !visited.has(reply.id)) {
                  toVisit.push(reply.id);
                }
              });

              cursor = response.nextCursor;
            } while (cursor);
          } catch (error) {
            console.error("Failed to load replies", error);
          } finally {
            setLoadingReplyThreads((prev) => {
              const { [parentId]: _ignored, ...rest } = prev;
              return rest;
            });
          }
        }

        return { replies: aggregatedReplies, nextCursor: null };
      },
      [loadingReplyThreads]
    );

  const fetchUserActivitiesByUsername = useCallback(
    async (username: string | null | undefined): Promise<Activity[]> => {
      if (!username) {
        return [] as Activity[];
      }

      const normalizedUsername = username.trim().toLowerCase();

      if (normalizedUsername.length === 0) {
        return [] as Activity[];
      }

      if (loadingUserActivities[normalizedUsername]) {
        return userActivitiesByUsername[normalizedUsername] ?? [];
      }

      if (userActivitiesByUsername[normalizedUsername]) {
        return userActivitiesByUsername[normalizedUsername];
      }

      setLoadingUserActivities((prev) => ({
        ...prev,
        [normalizedUsername]: true,
      }));

      try {
        let cursor: string | null = null;
        const aggregatedMap = new Map<string, Activity>();

        do {
          const params: Record<string, string> = {
            username: normalizedUsername,
            categoryOnly: "false",
            limit: String(Math.max(1, Math.min(DEFAULT_POST_LIMIT, 100))),
          };

          if (cursor) {
            params.cursor = cursor;
          }

          const response = (await apiClient.get("/posts", {
            params,
          })) as { posts: PostDTO[]; nextCursor: string | null };

          const normalizedActivities: Activity[] = mapPostsToActivities(
            response.posts ?? []
          ).map((activity) => ({
            ...activity,
            replyCount:
              typeof activity.replyCount === "number" ? activity.replyCount : 0,
          }));

          if (normalizedActivities.length > 0) {
            normalizedActivities.forEach((activity) => {
              aggregatedMap.set(activity.id, activity);
            });

            upsertActivities(normalizedActivities);
          }

          if (response.nextCursor && response.nextCursor !== cursor) {
            cursor = response.nextCursor;
          } else {
            cursor = null;
          }
        } while (cursor);

        const aggregatedActivities = Array.from(aggregatedMap.values());

        setUserActivitiesByUsername((prev) => ({
          ...prev,
          [normalizedUsername]: aggregatedActivities,
        }));

        return aggregatedActivities;
      } catch (error) {
        console.error("Failed to load user activities", error);
        return [];
      } finally {
        setLoadingUserActivities((prev) => {
          const { [normalizedUsername]: _ignored, ...rest } = prev;
          return rest;
        });
      }
    },
    [loadingUserActivities, upsertActivities, userActivitiesByUsername]
  );

  const handleLogActivity = useCallback(
    (activity: Activity) => {
      const normalizedActivity: Activity = {
        ...activity,
        likedBy: activity.likedBy ?? [],
        likedByCurrentUser: activity.likedByCurrentUser ?? false,
      };

      setActivities((prev) => [normalizedActivity, ...prev]);

      setUserChallenges((prevUserChallenges) =>
        prevUserChallenges.map((uc) => {
          const challenge = challenges.find((c) => c.id === uc.challengeId);
          if (
            !challenge ||
            challenge.type !== activity.type ||
            uc.progress >= challenge.goal
          ) {
            return uc;
          }

          const today = new Date().toDateString();
          const lastLogDay = uc.lastLogDate
            ? new Date(uc.lastLogDate).toDateString()
            : null;

          if (today === lastLogDay) {
            return uc;
          }

          if (challenge.trackingMethod === "streak") {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toDateString();

            const newStreak =
              lastLogDay === yesterdayString ? (uc.streak ?? 0) + 1 : 1;

            return {
              ...uc,
              progress: newStreak,
              streak: newStreak,
              lastLogDate: new Date().toISOString(),
            };
          }

          return {
            ...uc,
            progress: uc.progress + 1,
            lastLogDate: new Date().toISOString(),
          };
        })
      );

      onActivityLogged();
    },
    [challenges, onActivityLogged, setUserChallenges]
  );

  const handleToggleLike = useCallback(
    async (activityId: string) => {
      if (!userProfile) {
        toast.error("Complete your profile to like posts.");
        return;
      }

      const previousActivities = activities;
      const persisted = isMongoObjectId(activityId);

      setActivities((prevActivities) =>
        prevActivities.map((activity) => {
          if (activity.id !== activityId) {
            return activity;
          }
          const currentlyLiked = activity.likedByCurrentUser ?? false;
          const baseLikedBy =
            activity.likedBy && Array.isArray(activity.likedBy)
              ? [...activity.likedBy]
              : [];

          let updatedLikedBy = baseLikedBy;

          if (!persisted) {
            const identifier =
              userProfile.username || userProfile.name || "current-user";
            const likeSet = new Set(baseLikedBy);
            if (currentlyLiked) {
              likeSet.delete(identifier);
            } else {
              likeSet.add(identifier);
            }
            updatedLikedBy = Array.from(likeSet);
          }

          return {
            ...activity,
            likedByCurrentUser: !currentlyLiked,
            kudos: Math.max(0, activity.kudos + (currentlyLiked ? -1 : 1)),
            likedBy: updatedLikedBy,
          };
        })
      );

      if (!persisted) {
        return;
      }

      try {
        const { liked, kudos, likedBy } = (await apiClient.post(
          `/posts/${activityId}/like`
        )) as { liked: boolean; kudos: number; likedBy: string[] };

        setActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  likedByCurrentUser: liked,
                  kudos,
                  likedBy,
                }
              : activity
          )
        );
      } catch (error) {
        console.error("Failed to toggle like", error);
        toast.error("Unable to update like. Please try again.");
        setActivities(previousActivities);
      }
    },
    [activities, userProfile]
  );

  const handleDeleteActivity = useCallback(
    async (activityId: string) => {
      const previousActivities = activities;
      setActivities((prev) =>
        prev.filter((activity) => activity.id !== activityId)
      );

      if (!isMongoObjectId(activityId)) {
        return;
      }

      try {
        await apiClient.delete(`/posts/${activityId}`);
      } catch (error) {
        console.error("Failed to delete activity", error);
        toast.error("Unable to delete this post. Please try again.");
        setActivities(previousActivities);
      }
    },
    [activities]
  );

  const handleLoadMoreActivities = useCallback(async () => {
    if (isLoadingMore || postsCursor === null) {
      return;
    }

    await fetchPosts({
      cursor: postsCursor === undefined ? undefined : postsCursor,
    });
  }, [fetchPosts, isLoadingMore, postsCursor]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts({ replace: true });
  }, [fetchPosts]);

  const ensureInitialActivities = useCallback(() => {
    if (!userProfile) {
      return;
    }
    setActivities((prev) =>
      prev.length > 0
        ? prev
        : [createWelcomeActivity(userProfile), ...MOCK_ACTIVITIES]
    );
  }, [userProfile]);

  return {
    activities,
    setActivities,
    isLoadingMore,
    postsCursor,
    hasLoadedPosts,
    setHasLoadedPosts,
    fetchPosts,
    handleLogActivity,
    handleToggleLike,
    handleDeleteActivity,
    handleLoadMoreActivities,
    handleRefresh,
    ensureInitialActivities,
    fetchRepliesForActivity,
    loadingReplyThreads,
    fetchUserActivitiesByUsername,
    loadingUserActivities,
    userActivitiesByUsername,
  };
};
