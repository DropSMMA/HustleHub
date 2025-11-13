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
  const [loadedUserActivities, setLoadedUserActivities] = useState<
    Record<string, boolean>
  >({});

  const parseRelativeTimestamp = (value: string): number | null => {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "just now") {
      return Date.now();
    }

    const relativeMatch = trimmed.match(/^(\d+)\s*([mhd])\s*ago$/i);
    if (relativeMatch) {
      const amount = Number(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      if (!Number.isNaN(amount)) {
        const now = Date.now();
        switch (unit) {
          case "m":
            return now - amount * 60 * 1000;
          case "h":
            return now - amount * 60 * 60 * 1000;
          case "d":
            return now - amount * 24 * 60 * 60 * 1000;
          default:
            break;
        }
      }
    }

    return null;
  };

  const getActivityTime = (activity: Activity): number => {
    if (typeof activity.createdAtIso === "string") {
      const createdAtTime = Date.parse(activity.createdAtIso);
      if (Number.isFinite(createdAtTime)) {
        return createdAtTime;
      }
    }

    if (typeof activity.timestamp === "string") {
      const relative = parseRelativeTimestamp(activity.timestamp);
      if (relative !== null) {
        return relative;
      }

      const parsed = Date.parse(activity.timestamp);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return Number.NEGATIVE_INFINITY;
  };

  const sortActivitiesByRecency = (list: Activity[]): Activity[] =>
    [...list].sort((a, b) => getActivityTime(b) - getActivityTime(a));

  const fetchPosts = useCallback(
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
              typeof activity.replyCount === "number" ? activity.replyCount : 0,
          })
        );
        const sortedMappedActivities =
          sortActivitiesByRecency(mappedActivities);

        if (cursor) {
          setActivities((prev) => {
            const existingIds = new Set(prev.map((activity) => activity.id));
            const filtered = mappedActivities.filter(
              (activity) => !existingIds.has(activity.id)
            );
            return sortActivitiesByRecency([...prev, ...filtered]);
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

            return sortActivitiesByRecency(base);
          });
        }

        setPostsCursor(nextCursor ?? null);

        return sortedMappedActivities;
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

  const fetchRepliesForActivity = useCallback(
    async (
      activityId: string,
      options?: { cursor?: string | null; limit?: number }
    ): Promise<{ replies: Activity[]; nextCursor: string | null }> => {
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
          let cursor = parentId === activityId ? options?.cursor ?? null : null;

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

              return sortActivitiesByRecency(updated);
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

  const handleLogActivity = useCallback(
    (activity: Activity) => {
      const normalizedActivity: Activity = {
        ...activity,
        likedBy: activity.likedBy ?? [],
        likedByCurrentUser: activity.likedByCurrentUser ?? false,
        createdAtIso: activity.createdAtIso ?? new Date().toISOString(),
      };

      setActivities((prev) =>
        sortActivitiesByRecency([normalizedActivity, ...prev])
      );

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

  const fetchAllActivitiesForUser = useCallback(
    async (username: string) => {
      const normalizedUsernameRaw = username?.trim();
      if (!normalizedUsernameRaw) {
        return;
      }
      const normalizedUsername = normalizedUsernameRaw.toLowerCase();

      const hasCompleteHistory = activities.some(
        (activity) =>
          activity.username.toLowerCase() === normalizedUsername &&
          typeof activity.createdAtIso === "string"
      );

      if (
        loadingUserActivities[normalizedUsername] ||
        loadedUserActivities[normalizedUsername] ||
        hasCompleteHistory
      ) {
        return;
      }

      setLoadingUserActivities((prev) => ({
        ...prev,
        [normalizedUsername]: true,
      }));

      try {
        let cursor: string | null = null;
        const aggregatedActivities: Activity[] = [];
        const seenCursors = new Set<string | null>();

        do {
          const params: Record<string, string> = {
            limit: String(DEFAULT_POST_LIMIT),
            username: normalizedUsername,
            categoryOnly: "false",
          };

          if (cursor) {
            params.cursor = cursor;
          }

          const response = (await apiClient.get("/posts", {
            params,
          })) as { posts: PostDTO[]; nextCursor: string | null };

          const mappedActivities: Activity[] = mapPostsToActivities(
            response.posts
          ).map((activity) => ({
            ...activity,
            replyCount:
              typeof activity.replyCount === "number" ? activity.replyCount : 0,
            createdAtIso: activity.createdAtIso ?? new Date().toISOString(),
          }));

          aggregatedActivities.push(...mappedActivities);

          if (!response.nextCursor || seenCursors.has(response.nextCursor)) {
            cursor = null;
          } else {
            seenCursors.add(response.nextCursor);
            cursor = response.nextCursor;
          }
        } while (cursor);

        if (aggregatedActivities.length > 0) {
          setActivities((prev) => {
            const updated = [...prev];
            const indexMap = new Map(
              updated.map((activity, index) => [activity.id, index])
            );

            aggregatedActivities.forEach((activity) => {
              const existingIndex = indexMap.get(activity.id);
              if (existingIndex !== undefined) {
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  ...activity,
                };
              } else {
                updated.push(activity);
              }
            });

            return sortActivitiesByRecency(updated);
          });
        }

        setLoadedUserActivities((prev) => ({
          ...prev,
          [normalizedUsername]: true,
        }));
      } catch (error) {
        console.error("Failed to load complete activity history", error);
      } finally {
        setLoadingUserActivities((prev) => {
          const { [normalizedUsername]: _ignored, ...rest } = prev;
          return rest;
        });
      }
    },
    [activities, loadedUserActivities, loadingUserActivities]
  );

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
    fetchAllActivitiesForUser,
    loadingUserActivities,
    loadedUserActivities,
  };
};
