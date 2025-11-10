"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import {
  Activity,
  ActivityType,
  View,
  UserProfile,
  FocusArea,
  Comment,
  Notification,
  NotificationType,
  Challenge,
  UserChallenge,
} from "@/app/types";
import apiClient from "@/libs/api";
import { mapPostsToActivities, PostDTO } from "@/libs/posts";
import Header from "@/components/app/Header";
import BottomNav from "@/components/app/BottomNav";
import Feed from "@/components/app/Feed";
import LogActivity from "@/components/app/LogActivity";
import WeeklyInsights from "@/components/app/Dashboard";
import Challenges from "@/components/app/Challenges";
import Onboarding from "@/components/app/onboarding/Onboarding";
import { getHustleBalanceInsight } from "@/libs/geminiService";
import LoadingScreen from "@/components/app/LoadingScreen";
import Profile from "@/components/app/Profile";
import PublicProfile from "@/components/app/PublicProfile";
import Notifications from "@/components/app/Notifications";
import Connections from "@/components/app/Connections";
import Research from "@/components/app/Research";
import Settings from "@/components/app/Settings";
import { PlusIcon } from "@/components/app/icons/PlusIcon";

const USER_PROFILE_STORAGE_KEY = "hustlehub:userProfile";
const ONBOARDING_COMPLETE_STORAGE_KEY = "hustlehub:onboardingComplete";

const createWelcomeActivity = (profile: UserProfile): Activity => ({
  id: `${Date.now() + 1}`,
  user: profile.name,
  username: profile.username,
  avatar: profile.avatar,
  type: ActivityType.StartupTask,
  description: `Just joined HustleHub! Ready to start building and connecting. My focus is on ${profile.focuses.join(
    ", "
  )}. Let's go! 🚀`,
  stats: "Joined the community",
  kudos: 0,
  likedByCurrentUser: false,
  likedBy: [],
  comments: [],
  timestamp: "Just now",
});

const MOCK_USER_PROFILES: Record<string, UserProfile> = {
  alexdevito: {
    username: "alexdevito",
    name: "Alex Devito",
    avatar: "https://i.pravatar.cc/150?u=alexdevito",
    tagline: "Building the future of SaaS.",
    projects: "ShipFast, AI-Writer",
    focuses: [FocusArea.DeepWork, FocusArea.Startup, FocusArea.Fitness],
    connections: ["jennamiles"],
    socials: {
      twitter: "https://twitter.com/alexdevito",
      github: "https://github.com/alexdevito",
      website: "https://alexdevito.com",
    },
  },
  jennamiles: {
    username: "jennamiles",
    name: "Jenna Miles",
    avatar: "https://i.pravatar.cc/150?u=jennamiles",
    tagline: "Founder & Marathon Runner.",
    projects: "ZenRun, WellnessHub",
    focuses: [FocusArea.Fitness, FocusArea.Recharge, FocusArea.Networking],
    connections: ["alexdevito", "samuraisam"],
    socials: {
      linkedin: "https://linkedin.com/in/jennamiles",
      website: "https://zenrun.com",
    },
  },
  samuraisam: {
    username: "samuraisam",
    name: "Samurai Sam",
    avatar: "https://i.pravatar.cc/150?u=samuraisam",
    tagline: "Lifting weights and building startups.",
    projects: "LiftLog, ProteinPlus",
    focuses: [FocusArea.Fitness, FocusArea.Startup],
    connections: ["jennamiles"],
  },
  techguru: {
    username: "techguru",
    name: "Tech Guru",
    avatar: "https://i.pravatar.cc/150?u=techguru",
    tagline: "Coding the matrix.",
    projects: "NeuralNet Inc.",
    focuses: [FocusArea.DeepWork],
    connections: [],
  },
};

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    user: "Alex Devito",
    username: "alexdevito",
    avatar: "https://i.pravatar.cc/150?u=alexdevito",
    type: ActivityType.DeepWork,
    description:
      "Just pushed the final feature for our MVP launch. The grind is real but so rewarding!",
    stats: "4 hours focus",
    image: "https://picsum.photos/seed/code1/600/400",
    kudos: 128,
    comments: [
      {
        id: "1",
        user: "Jenna Miles",
        avatar: "https://i.pravatar.cc/150?u=jennamiles",
        text: "Congrats on the launch! 🔥",
        replies: [
          {
            id: "101",
            user: "Alex Devito",
            avatar: "https://i.pravatar.cc/150?u=alexdevito",
            text: "Thanks Jenna! Appreciate the support.",
          },
        ],
      },
      {
        id: "2",
        user: "Samurai Sam",
        avatar: "https://i.pravatar.cc/150?u=samuraisam",
        text: "This is huge! Well done.",
      },
    ],
    timestamp: "2h ago",
  },
  {
    id: "2",
    user: "Jenna Miles",
    username: "jennamiles",
    avatar: "https://i.pravatar.cc/150?u=jennamiles",
    type: ActivityType.Recharge,
    description:
      "Cleared my head with a morning run. Sometimes you need to disconnect to reconnect.",
    stats: "5km run",
    image: "https://picsum.photos/seed/run1/600/400",
    kudos: 95,
    comments: [
      {
        id: "3",
        user: "Alex Devito",
        avatar: "https://i.pravatar.cc/150?u=alexdevito",
        text: "Love this! So important.",
      },
    ],
    timestamp: "5h ago",
  },
  {
    id: "3",
    user: "Samurai Sam",
    username: "samuraisam",
    avatar: "https://i.pravatar.cc/150?u=samuraisam",
    type: ActivityType.Workout,
    description:
      "Early morning lift to start the day strong. Building a business is a marathon, not a sprint.",
    stats: "1.5 hours workout",
    kudos: 210,
    comments: [],
    timestamp: "8h ago",
  },
];

const generateLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isMongoObjectId = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);

const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

const DEFAULT_POST_LIMIT = 20;

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: NotificationType.Kudo,
    message: "gave you kudos on your <strong>Deep Work</strong> session.",
    postId: "1",
    timestamp: "1h ago",
    read: false,
    actor: {
      name: "Jenna Miles",
      avatar: "https://i.pravatar.cc/150?u=jennamiles",
      username: "jennamiles",
    },
  },
  {
    id: 2,
    type: NotificationType.Comment,
    message:
      'commented on your <strong>Deep Work</strong> session: "This is huge! Well done."',
    postId: "1",
    timestamp: "2h ago",
    read: false,
    actor: {
      name: "Samurai Sam",
      avatar: "https://i.pravatar.cc/150?u=samuraisam",
      username: "samuraisam",
    },
  },
  {
    id: 3,
    type: NotificationType.Challenge,
    message:
      "A new challenge is available: <strong>Founder Fitness February</strong>. Ready to join?",
    timestamp: "1d ago",
    read: true,
    actor: { name: "HustleHub", avatar: "/vite.svg", username: "hustlehub" },
  },
  {
    id: 4,
    type: NotificationType.ConnectRequest,
    message: "wants to connect with you.",
    timestamp: "3d ago",
    read: false,
    actor: {
      name: "Tech Guru",
      avatar: "https://i.pravatar.cc/150?u=techguru",
      username: "techguru",
    },
  },
];

type FetchPostsOptions = {
  cursor?: string | null;
  replace?: boolean;
};
const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "mvp-30-day",
    title: "30-Day MVP Build",
    description:
      'Launch an MVP in 30 days. Stay accountable with daily check-ins by logging a "Startup Task" every day.',
    badge: "🚀",
    type: ActivityType.StartupTask,
    goal: 30,
    trackingMethod: "streak",
    participants: 42,
  },
  {
    id: "founder-fitness-20",
    title: "20 Workout Hustle",
    description:
      'Commit to 20 workouts. A healthy founder is a productive founder. Log your "Workout" sessions to advance.',
    badge: "💪",
    type: ActivityType.Workout,
    goal: 20,
    trackingMethod: "count",
    participants: 128,
  },
  {
    id: "networking-ninja-10",
    title: "Networking Ninja",
    description:
      'Expand your circle. Log 10 "Networking" activities, from coffee chats to industry events.',
    badge: "🤝",
    type: ActivityType.Networking,
    goal: 10,
    trackingMethod: "count",
    participants: 73,
  },
];

const App: React.FC = () => {
  const { data: session, status: sessionStatus } = useSession();
  const [currentView, setCurrentView] = useState<View>("feed");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [weeklyInsight, setWeeklyInsight] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(
    null
  );
  const [viewingConnectionsOf, setViewingConnectionsOf] =
    useState<UserProfile | null>(null);
  const [isPreparingWorkspace, setIsPreparingWorkspace] =
    useState<boolean>(false);
  const [challenges, setChallenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [pendingConnections, setPendingConnections] = useState<string[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(
    null
  );
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onboardingCompleted = window.localStorage.getItem(
      ONBOARDING_COMPLETE_STORAGE_KEY
    );
    const storedProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

    if (onboardingCompleted && storedProfile) {
      try {
        const parsedProfile = JSON.parse(storedProfile) as UserProfile;
        setUserProfile(parsedProfile);
        setIsOnboarding(false);
      } catch (error) {
        console.error("Failed to restore onboarding state", error);
        window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
        window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || userProfile) {
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch("/api/user/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();
        const user = data.user;

        if (!user || !user.focuses || user.focuses.length === 0) {
          setIsOnboarding(true);
          return;
        }

        const normalizedProfile: UserProfile = {
          username: user.username,
          name: user.name ?? "",
          avatar:
            user.image ??
            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
          tagline: user.tagline ?? "",
          projects: Array.isArray(user.projects)
            ? user.projects.join(", ")
            : user.projects ?? "",
          focuses: user.focuses,
          connections: user.connections ?? [],
          socials: user.socials,
        };

        setUserProfile(normalizedProfile);
        setIsOnboarding(false);

        const hasStoredProfile =
          typeof window !== "undefined" &&
          window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

        if (!hasStoredProfile && typeof window !== "undefined") {
          window.localStorage.setItem(
            USER_PROFILE_STORAGE_KEY,
            JSON.stringify(normalizedProfile)
          );
          window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
        }
      } catch (error) {
        console.error("Error loading user profile", error);
        setIsOnboarding(true);
      }
    };

    fetchUserProfile();
  }, [sessionStatus, userProfile]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !userProfile || hasLoadedPosts) {
      return;
    }

    const loadPosts = async () => {
      const posts = await fetchPosts({ replace: true });
      if ((posts?.length ?? 0) === 0) {
        setActivities((prev) =>
          prev.length > 0
            ? prev
            : [createWelcomeActivity(userProfile), ...MOCK_ACTIVITIES]
        );
      }
      setHasLoadedPosts(true);
    };

    loadPosts();
  }, [sessionStatus, userProfile, hasLoadedPosts, fetchPosts]);

  const handleCompleteOnboarding = (profile: UserProfile) => {
    setUserProfile(profile);
    const welcomeActivity = createWelcomeActivity(profile);
    setActivities([welcomeActivity, ...MOCK_ACTIVITIES]);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(profile)
      );
      window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
    }

    setIsOnboarding(false);
    setIsPreparingWorkspace(true);
  };

  useEffect(() => {
    if (isPreparingWorkspace) {
      const timer = setTimeout(() => {
        setIsPreparingWorkspace(false);
      }, 4000); // Show loading screen for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [isPreparingWorkspace]);

  const handleLogActivity = (activity: Activity) => {
    const normalizedActivity: Activity = {
      ...activity,
      likedBy: activity.likedBy ?? [],
      likedByCurrentUser: activity.likedByCurrentUser ?? false,
    };

    setActivities((prev) => [normalizedActivity, ...prev]);

    // --- Challenge Progress Logic ---
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
          return uc; // Already logged for this challenge type today
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
        } else {
          // 'count' method
          return {
            ...uc,
            progress: uc.progress + 1,
            lastLogDate: new Date().toISOString(),
          };
        }
      })
    );
    setIsLogModalOpen(false);
    setCurrentView("feed");
  };

  const handleJoinChallenge = (challengeId: string) => {
    setUserChallenges((prev) => {
      if (prev.some((uc) => uc.challengeId === challengeId)) {
        return prev;
      }
      return [
        ...prev,
        {
          challengeId: challengeId,
          progress: 0,
          streak: 0,
        },
      ];
    });
  };

  const handleAddComment = async (activityId: string, commentText: string) => {
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
  };

  const handleAddReply = async (
    activityId: string,
    parentCommentId: string,
    replyText: string
  ) => {
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
  };

  const handleToggleLike = async (activityId: string) => {
    if (!userProfile) {
      toast.error("Complete your profile to like posts.");
      return;
    }

    const previousActivities = activities;
    const isPersisted = isMongoObjectId(activityId);

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

        if (!isPersisted) {
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

    if (!isPersisted) {
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
  };

  const handleViewProfile = (username: string) => {
    if (username === userProfile?.username) {
      setCurrentView("profile");
      return;
    }
    const profile = MOCK_USER_PROFILES[username];
    if (profile) {
      setViewingProfile(profile);
      setCurrentView("publicProfile");
    }
  };

  const handleViewActivity = (postId: string) => {
    setCurrentView("feed");
    setHighlightedPostId(postId);
  };

  const handleClearHighlightedPost = () => {
    setHighlightedPostId(null);
  };

  const handleGenerateInsight = useCallback(
    async (activitiesForInsight: Activity[]) => {
      setIsLoading(true);
      setError(null);
      setWeeklyInsight("");
      try {
        const insight = await getHustleBalanceInsight(activitiesForInsight);
        setWeeklyInsight(insight);
      } catch (err) {
        setError("Failed to get insights. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleClearNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    // Also update MOCK_USER_PROFILES so changes are reflected in public views
    if (updatedProfile.username) {
      MOCK_USER_PROFILES[updatedProfile.username] = updatedProfile;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(updatedProfile)
      );
    }
  };

  const handleAcceptConnectRequest = (
    notificationId: number,
    fromUsername: string
  ) => {
    // Current user (receiver) adds sender to their connections
    setUserProfile((prev: UserProfile | null) => {
      if (!prev) return null;
      if (prev.connections.includes(fromUsername)) return prev;
      const updatedProfile = {
        ...prev,
        connections: [...prev.connections, fromUsername],
      };
      handleUpdateProfile(updatedProfile);
      return updatedProfile;
    });

    // Sender adds current user (receiver) to their connections to make it mutual
    const senderProfile = MOCK_USER_PROFILES[fromUsername];
    if (senderProfile && userProfile) {
      if (!senderProfile.connections.includes(userProfile.username)) {
        MOCK_USER_PROFILES[fromUsername] = {
          ...senderProfile,
          connections: [...senderProfile.connections, userProfile.username],
        };
      }
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleDeclineConnectRequest = (notificationId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleViewConnections = (username: string) => {
    const allProfiles = userProfile
      ? { ...MOCK_USER_PROFILES, [userProfile.username]: userProfile }
      : MOCK_USER_PROFILES;
    const profile = allProfiles[username];
    if (profile) {
      setViewingConnectionsOf(profile);
      setCurrentView("connections");
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    const previousActivities = activities;
    setActivities((prev) =>
      prev.filter((activity) => activity.id !== activityId)
    );

    const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(activityId);

    if (!isMongoObjectId) {
      return;
    }

    try {
      await apiClient.delete(`/posts/${activityId}`);
    } catch (error) {
      console.error("Failed to delete activity", error);
      toast.error("Unable to delete this post. Please try again.");
      setActivities(previousActivities);
    }
  };

  const handleSendConnectRequest = (targetUsername: string) => {
    setPendingConnections((prev) => [...prev, targetUsername]);
    // In a real app, you would make an API call here and create a notification for the target user.
    console.log(`Connection request sent to ${targetUsername}`);
  };

  const handleLoadMoreActivities = useCallback(async () => {
    if (isLoadingMore || !postsCursor) {
      return;
    }
    await fetchPosts({ cursor: postsCursor });
  }, [fetchPosts, isLoadingMore, postsCursor]);

  const handleRefresh = useCallback(async () => {
    await fetchPosts({ replace: true });
  }, [fetchPosts]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  if (isOnboarding) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  if (isPreparingWorkspace) {
    return <LoadingScreen />;
  }

  const commonFeedProps = {
    activities: activities,
    onAddComment: handleAddComment,
    onAddReply: handleAddReply,
    onToggleLike: handleToggleLike,
    onViewProfile: handleViewProfile,
    onDeleteActivity: handleDeleteActivity,
    currentUser: userProfile,
    highlightedPostId: highlightedPostId,
    onClearHighlight: handleClearHighlightedPost,
  };

  const renderContent = () => {
    switch (currentView) {
      case "feed":
        return (
          <Feed
            {...commonFeedProps}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMoreActivities}
            isLoadingMore={isLoadingMore}
          />
        );
      case "insights":
        return (
          <WeeklyInsights
            activities={activities.filter(
              (a) => a.username === userProfile?.username
            )}
            onGenerateInsight={handleGenerateInsight}
            insight={weeklyInsight}
            isLoading={isLoading}
            error={error}
          />
        );
      case "research":
        const allUsers = userProfile
          ? { ...MOCK_USER_PROFILES, [userProfile.username]: userProfile }
          : MOCK_USER_PROFILES;
        return (
          <Research
            allUsers={Object.values(allUsers)}
            currentUser={userProfile}
            onViewProfile={handleViewProfile}
          />
        );
      case "challenges":
        return (
          <Challenges
            challenges={challenges}
            userChallenges={userChallenges}
            onJoinChallenge={handleJoinChallenge}
          />
        );
      case "profile":
        return (
          <Profile
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onViewConnections={handleViewConnections}
            activities={activities.filter(
              (a) => a.username === userProfile?.username
            )}
            onDeleteActivity={handleDeleteActivity}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            onToggleLike={handleToggleLike}
            onViewProfile={handleViewProfile}
            setCurrentView={setCurrentView}
          />
        );
      case "publicProfile":
        if (viewingProfile) {
          return (
            <PublicProfile
              user={viewingProfile}
              currentUser={userProfile}
              activities={activities.filter(
                (a) => a.username === viewingProfile.username
              )}
              onBack={() => setCurrentView("feed")}
              onViewConnections={handleViewConnections}
              onConnect={handleSendConnectRequest}
              pendingConnections={pendingConnections}
              onAddComment={handleAddComment}
              onAddReply={handleAddReply}
              onToggleLike={handleToggleLike}
              onDeleteActivity={handleDeleteActivity}
              onViewProfile={handleViewProfile}
            />
          );
        }
        return <Feed {...commonFeedProps} />;
      case "notifications":
        return (
          <Notifications
            notifications={notifications}
            onClearAll={handleClearNotifications}
            onAcceptConnectRequest={handleAcceptConnectRequest}
            onDeclineConnectRequest={handleDeclineConnectRequest}
            onViewProfile={handleViewProfile}
            onViewActivity={handleViewActivity}
          />
        );
      case "connections":
        if (viewingConnectionsOf && userProfile) {
          return (
            <Connections
              user={viewingConnectionsOf}
              allUsers={{
                ...MOCK_USER_PROFILES,
                [userProfile.username]: userProfile,
              }}
              onBack={() => {
                if (viewingConnectionsOf.username === userProfile?.username) {
                  setCurrentView("profile");
                } else {
                  handleViewProfile(viewingConnectionsOf.username);
                }
              }}
              onViewProfile={handleViewProfile}
            />
          );
        }
        return <Feed {...commonFeedProps} />;
      case "settings":
        return (
          <Settings
            userProfile={userProfile}
            onBack={() => setCurrentView("profile")}
            onUpdateEmail={(email) => console.log("Email updated:", email)} // Mock handler
          />
        );
      default:
        return <Feed {...commonFeedProps} />;
    }
  };

  return (
    <div className="bg-brand-primary min-h-screen font-sans text-white">
      <Header
        unreadNotifications={unreadNotificationsCount}
        setCurrentView={setCurrentView}
      />
      <main className="pb-24 pt-16">{renderContent()}</main>
      {currentView === "feed" && (
        <button
          onClick={() => setIsLogModalOpen(true)}
          className="fixed bottom-20 right-4 bg-brand-neon text-brand-primary p-4 rounded-full shadow-lg hover:bg-green-400 transition-transform duration-200 hover:scale-110 z-30 animate-pop"
          aria-label="Log new activity"
        >
          <PlusIcon />
        </button>
      )}
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <LogActivity
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onPostCreated={handleLogActivity}
        userProfile={userProfile}
      />
    </div>
  );
};

export default App;
