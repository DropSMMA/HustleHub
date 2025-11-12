import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Activity,
  Challenge,
  Comment,
  UserChallenge,
  UserProfile,
} from "@/app/types";
import apiClient from "@/libs/api";
import {
  DEFAULT_AVATAR,
  DEFAULT_POST_LIMIT,
  MOCK_ACTIVITIES,
  createWelcomeActivity,
  generateLocalId,
  isMongoObjectId,
} from "../lib/dashboard-constants";
import { mapPostsToActivities, PostDTO } from "../lib/normalizers";

type FetchPostsOptions = {
  cursor?: string | null;
  replace?: boolean;
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

  const fetchPosts = useCallback(
    async ({ cursor, replace = false }: FetchPostsOptions = {}) => {
      const params: Record<string, string> = {
        limit: DEFAULT_POST_LIMIT.toString(),
      };
      if (cursor) {
        params.cursor = cursor;
      }

      try {
        if (cursor) {
          setIsLoadingMore(true);
        }

        const { posts, nextCursor } = (await apiClient.get("/posts", {
          params,
        })) as { posts: PostDTO[]; nextCursor: string | null };

        const mappedActivities = mapPostsToActivities(posts);

        if (replace) {
          setActivities(mappedActivities);
        } else if (cursor) {
          setActivities((prev) => {
            const existingIds = new Set(prev.map((activity) => activity.id));
            const filtered = mappedActivities.filter(
              (activity) => !existingIds.has(activity.id)
            );
            return [...prev, ...filtered];
          });
        } else {
          setActivities(mappedActivities);
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

  const handleAddComment = useCallback(
    async (activityId: string, commentText: string) => {
      const trimmed = commentText.trim();
      if (!trimmed) {
        return;
      }

      if (!userProfile) {
        toast.error("Complete your profile to comment.");
        return;
      }

      if (!isMongoObjectId(activityId)) {
        const newComment: Comment = {
          id: generateLocalId(),
          user: userProfile.name || "You",
          avatar: userProfile.avatar || DEFAULT_AVATAR,
          text: trimmed,
          replies: [],
        };
        setActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  comments: [...activity.comments, newComment],
                }
              : activity
          )
        );
        return;
      }

      const previousActivities = activities;

      try {
        const { comment } = (await apiClient.post(
          `/posts/${activityId}/comments`,
          { text: trimmed }
        )) as { comment: Comment };

        const hydratedComment: Comment = {
          ...comment,
          replies: comment.replies ?? [],
        };

        setActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.id === activityId
              ? {
                  ...activity,
                  comments: [...activity.comments, hydratedComment],
                }
              : activity
          )
        );
      } catch (error) {
        console.error("Failed to add comment", error);
        toast.error("Unable to add comment. Please try again.");
        setActivities(previousActivities);
        throw error;
      }
    },
    [activities, userProfile]
  );

  const handleAddReply = useCallback(
    async (activityId: string, parentCommentId: string, replyText: string) => {
      const trimmed = replyText.trim();
      if (!trimmed) {
        return;
      }

      if (!userProfile) {
        toast.error("Complete your profile to reply.");
        return;
      }

      if (!isMongoObjectId(activityId)) {
        const newReply: Comment = {
          id: generateLocalId(),
          user: userProfile.name || "You",
          avatar: userProfile.avatar || DEFAULT_AVATAR,
          text: trimmed,
        };

        setActivities((prevActivities) =>
          prevActivities.map((activity) => {
            if (activity.id !== activityId) {
              return activity;
            }

            const updatedComments = activity.comments.map((comment) => {
              if (comment.id !== parentCommentId) {
                return comment;
              }
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              };
            });

            return {
              ...activity,
              comments: updatedComments,
            };
          })
        );
        return;
      }

      const previousActivities = activities;

      try {
        const { comment } = (await apiClient.post(
          `/posts/${activityId}/comments`,
          { text: trimmed, parentId: parentCommentId }
        )) as { comment: Comment };

        setActivities((prevActivities) =>
          prevActivities.map((activity) => {
            if (activity.id !== activityId) {
              return activity;
            }

            const updatedComments = activity.comments.map((existing) => {
              if (existing.id !== parentCommentId) {
                return existing;
              }
              return {
                ...existing,
                replies: [...(existing.replies || []), comment],
              };
            });

            return {
              ...activity,
              comments: updatedComments,
            };
          })
        );
      } catch (error) {
        console.error("Failed to add reply", error);
        toast.error("Unable to add reply. Please try again.");
        setActivities(previousActivities);
        throw error;
      }
    },
    [activities, userProfile]
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
    if (isLoadingMore || !postsCursor) {
      return;
    }
    await fetchPosts({ cursor: postsCursor });
  }, [fetchPosts, isLoadingMore, postsCursor]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts({ replace: true });
  }, [fetchPosts]);

  const ensureInitialActivities = useCallback(() => {
    if (!userProfile) {
      return;
    }
    setActivities((prev) =>
      prev.length > 0 ? prev : [createWelcomeActivity(userProfile), ...MOCK_ACTIVITIES]
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
    handleAddComment,
    handleAddReply,
    handleToggleLike,
    handleDeleteActivity,
    handleLoadMoreActivities,
    handleRefresh,
    ensureInitialActivities,
  };
};

