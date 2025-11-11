"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import {
  Activity,
  ActivityType,
  View,
  UserProfile,
  ConnectionPreview,
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
const USER_PROFILE_OWNER_STORAGE_KEY = "hustlehub:userProfileOwner";

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

const focusValues = new Set<string>(Object.values(FocusArea));
const isValidFocus = (focus: string): focus is FocusArea =>
  typeof focus === "string" && focusValues.has(focus);

const mapPreviewToUserProfile = (preview: ConnectionPreview): UserProfile => ({
  username: preview.username,
  name: preview.name || preview.username,
  avatar: preview.avatar || DEFAULT_AVATAR,
  tagline: preview.tagline ?? "",
  projects: preview.projects ?? "",
  focuses: Array.isArray(preview.focuses) ? preview.focuses : [],
  connections: [],
});

interface ConnectionsApiResponse {
  username: string;
  connections: ConnectionPreview[];
  pending: {
    incoming: ConnectionPreview[];
    outgoing: ConnectionPreview[];
  };
  notifications: Array<{
    id: string;
    actor: {
      username: string;
      name: string;
      avatar: string;
    };
    message: string;
  }>;
}

type FetchPostsOptions = {
  cursor?: string | null;
  replace?: boolean;
};

interface DirectoryUserDTO {
  username?: string | null;
  name?: string | null;
  avatar?: string | null;
  image?: string | null;
  tagline?: string | null;
  projects?: string | string[] | null;
  focuses?: unknown;
  connections?: unknown;
  socials?: Record<string, unknown> | null;
}

const normalizeDirectoryUser = (user: DirectoryUserDTO): UserProfile | null => {
  const username =
    typeof user.username === "string" ? user.username.trim().toLowerCase() : "";

  if (!username) {
    return null;
  }

  const name =
    typeof user.name === "string" && user.name.trim().length > 0
      ? user.name.trim()
      : username;

  const avatarCandidate =
    typeof user.avatar === "string" && user.avatar.trim().length > 0
      ? user.avatar.trim()
      : typeof user.image === "string" && user.image.trim().length > 0
      ? user.image.trim()
      : DEFAULT_AVATAR;

  const tagline = typeof user.tagline === "string" ? user.tagline.trim() : "";

  const projectsValue = user.projects;
  let projects = "";

  if (Array.isArray(projectsValue)) {
    projects = projectsValue
      .map((entry) =>
        typeof entry === "string" ? entry.trim() : String(entry ?? "")
      )
      .filter((entry) => entry.length > 0)
      .join(", ");
  } else if (typeof projectsValue === "string") {
    projects = projectsValue
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(", ");
  }

  const focuses = Array.isArray(user.focuses)
    ? (user.focuses
        .map((focus) => (typeof focus === "string" ? focus.trim() : ""))
        .filter((focus): focus is FocusArea =>
          isValidFocus(focus)
        ) as FocusArea[])
    : [];

  const connections = Array.isArray(user.connections)
    ? user.connections
        .map((connection) =>
          typeof connection === "string" ? connection.trim().toLowerCase() : ""
        )
        .filter((connection) => connection.length > 0)
    : [];

  const socials =
    user.socials && typeof user.socials === "object"
      ? Object.entries(user.socials).reduce((acc, [key, value]) => {
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
              acc[key as keyof UserProfile["socials"]] = trimmed;
            }
          }
          return acc;
        }, {} as NonNullable<UserProfile["socials"]>)
      : undefined;

  return {
    username,
    name,
    avatar: avatarCandidate,
    tagline,
    projects,
    focuses,
    connections,
    socials: socials && Object.keys(socials).length > 0 ? socials : undefined,
  };
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [weeklyInsight, setWeeklyInsight] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(
    null
  );
  const [viewingConnectionsOf, setViewingConnectionsOf] =
    useState<UserProfile | null>(null);
  const [viewingProfileLoading, setViewingProfileLoading] =
    useState<boolean>(false);
  const [viewingProfileError, setViewingProfileError] = useState<string | null>(
    null
  );
  const [isPreparingWorkspace, setIsPreparingWorkspace] =
    useState<boolean>(false);
  const [challenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [pendingConnections, setPendingConnections] = useState<string[]>([]);
  const [connectionDirectory, setConnectionDirectory] = useState<
    Record<string, UserProfile>
  >({});
  const [researchUsers, setResearchUsers] = useState<UserProfile[]>([]);
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [hasRequestedResearch, setHasRequestedResearch] =
    useState<boolean>(false);
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

  const refreshNotifications = useCallback(async () => {
    try {
      const data = (await apiClient.get("/notifications")) as {
        notifications?: Array<{
          id?: string;
          type?: NotificationType;
          message?: string;
          timestamp?: string;
          read?: boolean;
          postId?: string | null;
          actor?: {
            username?: string | null;
            name?: string | null;
            avatar?: string | null;
          };
        }>;
      };

      const activityNotifications = Array.isArray(data.notifications)
        ? data.notifications
            .map((notification) => {
              if (
                !notification ||
                typeof notification.id !== "string" ||
                !notification.actor
              ) {
                return null;
              }

              if (
                typeof notification.type !== "string" ||
                !Object.values(NotificationType).includes(
                  notification.type as NotificationType
                )
              ) {
                return null;
              }

              const actorUsername =
                typeof notification.actor.username === "string" &&
                notification.actor.username.length > 0
                  ? notification.actor.username
                  : "";
              const actorName =
                typeof notification.actor.name === "string" &&
                notification.actor.name.length > 0
                  ? notification.actor.name
                  : actorUsername || "HustleHub Member";
              const actorAvatar =
                typeof notification.actor.avatar === "string" &&
                notification.actor.avatar.length > 0
                  ? notification.actor.avatar
                  : DEFAULT_AVATAR;
              const fallbackUsername =
                actorName.replace(/\s+/g, "-").toLowerCase() || "member";

              return {
                id: notification.id,
                type: notification.type as NotificationType,
                message:
                  typeof notification.message === "string" &&
                  notification.message.length > 0
                    ? notification.message
                    : "sent you an update.",
                timestamp:
                  typeof notification.timestamp === "string" &&
                  notification.timestamp.length > 0
                    ? notification.timestamp
                    : new Date().toISOString(),
                read: Boolean(notification.read),
                postId:
                  typeof notification.postId === "string" &&
                  notification.postId.length > 0
                    ? notification.postId
                    : undefined,
                actor: {
                  username: actorUsername || fallbackUsername,
                  name: actorName,
                  avatar: actorAvatar,
                },
              } as Notification;
            })
            .filter(
              (notification): notification is Notification =>
                notification !== null
            )
        : [];

      setNotifications((prev) => {
        const connectNotifications = prev.filter(
          (notification) =>
            notification.type === NotificationType.ConnectRequest
        );

        const merged = [...activityNotifications, ...connectNotifications];
        const seen = new Set<string>();

        return merged.filter((notification) => {
          if (seen.has(notification.id)) {
            return false;
          }
          seen.add(notification.id);
          return true;
        });
      });
    } catch (error) {
      console.error("Failed to load activity notifications", error);
    }
  }, []);

  const sessionUserId = session?.user?.id ?? null;

  const refreshConnections = useCallback(async () => {
    try {
      const data = (await apiClient.get(
        "/connections"
      )) as ConnectionsApiResponse;

      const connections = Array.isArray(data.connections)
        ? data.connections
        : [];
      const incoming = Array.isArray(data.pending?.incoming)
        ? data.pending.incoming
        : [];
      const outgoing = Array.isArray(data.pending?.outgoing)
        ? data.pending.outgoing
        : [];

      setPendingConnections(outgoing.map((preview) => preview.username));

      let mergedProfile: UserProfile | null = null;

      setUserProfile((prev) => {
        if (!prev || prev.username !== data.username) {
          return prev;
        }
        const nextProfile: UserProfile = {
          ...prev,
          connections: connections.map((preview) => preview.username),
          pendingIncoming: incoming.map((preview) => preview.username),
          pendingOutgoing: outgoing.map((preview) => preview.username),
        };
        mergedProfile = nextProfile;
        return nextProfile;
      });

      setConnectionDirectory(() => {
        const updated: Record<string, UserProfile> = {};
        const ingest = (preview: ConnectionPreview) => {
          updated[preview.username] = mapPreviewToUserProfile(preview);
        };
        connections.forEach(ingest);
        incoming.forEach(ingest);
        outgoing.forEach(ingest);
        if (mergedProfile) {
          updated[mergedProfile.username] = mergedProfile;
        }
        return updated;
      });

      setNotifications((prev) => {
        const otherNotifications = prev.filter(
          (notification) =>
            notification.type !== NotificationType.ConnectRequest
        );

        const previousConnectionMeta = new Map(
          prev
            .filter(
              (notification) =>
                notification.type === NotificationType.ConnectRequest
            )
            .map((notification) => [
              notification.actor.username,
              { read: notification.read, timestamp: notification.timestamp },
            ])
        );

        const connectionNotifications =
          Array.isArray(data.notifications) && data.notifications.length > 0
            ? data.notifications.map((notification) => ({
                id: notification.id,
                type: NotificationType.ConnectRequest,
                message: notification.message,
                timestamp:
                  previousConnectionMeta.get(notification.actor.username)
                    ?.timestamp ?? "Just now",
                read:
                  previousConnectionMeta.get(notification.actor.username)
                    ?.read ?? false,
                actor: notification.actor,
              }))
            : [];

        return [...otherNotifications, ...connectionNotifications];
      });
    } catch (error) {
      console.error("Failed to load connections", error);
    }
  }, []);

  const fetchResearchDirectory = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (isResearchLoading) {
        return;
      }

      if (!options.force && hasRequestedResearch) {
        return;
      }

      setHasRequestedResearch(true);
      setIsResearchLoading(true);
      setResearchError(null);

      try {
        const payload = (await apiClient.get("/user/directory")) as {
          users?: DirectoryUserDTO[];
        };

        const directory = Array.isArray(payload?.users) ? payload.users : [];

        const normalized = directory
          .map((user) => normalizeDirectoryUser(user))
          .filter((profile): profile is UserProfile => profile !== null);

        setResearchUsers(normalized);

        if (normalized.length > 0) {
          setConnectionDirectory((prev) => {
            const updated = { ...prev };
            normalized.forEach((profile) => {
              updated[profile.username] = {
                ...(updated[profile.username] ?? profile),
                ...profile,
              };
            });
            if (userProfile) {
              updated[userProfile.username] = userProfile;
            }
            return updated;
          });
        }
      } catch (error) {
        console.error("Failed to load user directory", error);
        setResearchError(
          "Unable to load founders right now. Please try again."
        );
      } finally {
        setIsResearchLoading(false);
      }
    },
    [hasRequestedResearch, isResearchLoading, userProfile]
  );

  useEffect(() => {
    if (sessionStatus === "authenticated" && userProfile?.username) {
      void refreshConnections();
    }
  }, [sessionStatus, userProfile?.username, refreshConnections]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      void refreshNotifications();
    }
  }, [sessionStatus, refreshNotifications]);

  useEffect(() => {
    if (!userProfile?.username) {
      setResearchUsers([]);
      setResearchError(null);
      setHasRequestedResearch(false);
    }
  }, [userProfile?.username]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
      window.localStorage.removeItem(USER_PROFILE_OWNER_STORAGE_KEY);
      setUserProfile(null);
      setIsOnboarding(true);
      setHasLoadedPosts(false);
      setIsProfileLoading(false);
      return;
    }

    if (sessionStatus !== "authenticated" || !sessionUserId) {
      return;
    }

    setIsProfileLoading(true);

    const storedOwnerId = window.localStorage.getItem(
      USER_PROFILE_OWNER_STORAGE_KEY
    );

    if (storedOwnerId && storedOwnerId !== sessionUserId) {
      window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
      window.localStorage.setItem(
        USER_PROFILE_OWNER_STORAGE_KEY,
        sessionUserId
      );
      setUserProfile(null);
      setIsOnboarding(true);
      setHasLoadedPosts(false);
      setIsProfileLoading(false);
      return;
    }

    window.localStorage.setItem(USER_PROFILE_OWNER_STORAGE_KEY, sessionUserId);

    const onboardingCompleted = window.localStorage.getItem(
      ONBOARDING_COMPLETE_STORAGE_KEY
    );
    const storedProfile = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

    if (onboardingCompleted && storedProfile) {
      try {
        const parsedProfile = JSON.parse(storedProfile) as UserProfile;
        setUserProfile(parsedProfile);
        setIsOnboarding(false);
        setIsProfileLoading(false);
      } catch (error) {
        console.error("Failed to restore onboarding state", error);
        window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
        window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        window.localStorage.removeItem(USER_PROFILE_OWNER_STORAGE_KEY);
        setIsProfileLoading(true);
      }
      return;
    }

    setIsProfileLoading(true);
  }, [sessionStatus, sessionUserId]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || userProfile || isOnboarding) {
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setIsProfileLoading(true);
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

        const pendingIncoming = Array.isArray(user.incomingRequests)
          ? user.incomingRequests
              .map((username: unknown) =>
                typeof username === "string"
                  ? username.trim().toLowerCase()
                  : ""
              )
              .filter((username: string) => username.length > 0)
          : [];

        const pendingOutgoing = Array.isArray(user.outgoingRequests)
          ? user.outgoingRequests
              .map((username: unknown) =>
                typeof username === "string"
                  ? username.trim().toLowerCase()
                  : ""
              )
              .filter((username: string) => username.length > 0)
          : [];

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
          connections: Array.isArray(user.connections)
            ? user.connections
                .map((username: unknown) =>
                  typeof username === "string"
                    ? username.trim().toLowerCase()
                    : ""
                )
                .filter((username: string) => username.length > 0)
            : [],
          socials: user.socials,
          pendingIncoming,
          pendingOutgoing,
        };

        setUserProfile(normalizedProfile);
        setIsOnboarding(false);
        setPendingConnections(pendingOutgoing);
        void refreshConnections();

        const hasStoredProfile =
          typeof window !== "undefined" &&
          window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);

        if (!hasStoredProfile && typeof window !== "undefined") {
          window.localStorage.setItem(
            USER_PROFILE_STORAGE_KEY,
            JSON.stringify(normalizedProfile)
          );
          window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
          if (sessionUserId) {
            window.localStorage.setItem(
              USER_PROFILE_OWNER_STORAGE_KEY,
              sessionUserId
            );
          }
        }
      } catch (error) {
        console.error("Error loading user profile", error);
        setIsOnboarding(true);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [
    sessionStatus,
    userProfile,
    sessionUserId,
    refreshConnections,
    isOnboarding,
  ]);

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

  useEffect(() => {
    if (
      currentView !== "research" ||
      sessionStatus !== "authenticated" ||
      !userProfile?.username
    ) {
      return;
    }
    void fetchResearchDirectory();
  }, [
    currentView,
    sessionStatus,
    userProfile?.username,
    fetchResearchDirectory,
  ]);

  const handleCompleteOnboarding = (profile: UserProfile) => {
    const enrichedProfile: UserProfile = {
      ...profile,
      pendingIncoming: profile.pendingIncoming ?? [],
      pendingOutgoing: profile.pendingOutgoing ?? [],
    };
    setUserProfile(enrichedProfile);
    const welcomeActivity = createWelcomeActivity(profile);
    setActivities([welcomeActivity, ...MOCK_ACTIVITIES]);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(enrichedProfile)
      );
      window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
      if (sessionUserId) {
        window.localStorage.setItem(
          USER_PROFILE_OWNER_STORAGE_KEY,
          sessionUserId
        );
      }
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

  const handleViewProfile = async (username: string) => {
    const normalizedUsername = username?.trim();
    if (!normalizedUsername) {
      return;
    }

    if (normalizedUsername === userProfile?.username) {
      setCurrentView("profile");
      return;
    }

    if (viewingProfile?.username !== normalizedUsername) {
      setViewingProfile(null);
    }

    setViewingProfileLoading(true);
    setViewingProfileError(null);
    setCurrentView("publicProfile");

    try {
      const response = await fetch(
        `/api/user/${encodeURIComponent(normalizedUsername)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (response.ok) {
        const data = (await response.json()) as {
          user: {
            username: string;
            name?: string | null;
            avatar?: string | null;
            tagline?: string | null;
            projects?: string | null;
            focuses?: FocusArea[] | null;
            connections?: string[] | null;
            socials?: Record<string, string | null> | null;
          };
          posts?: PostDTO[];
          relationship?: {
            status?: "self" | "connected" | "incoming" | "outgoing" | "none";
          };
        };

        const focuses = Array.isArray(data.user.focuses)
          ? (data.user.focuses.filter(
              (focus): focus is FocusArea =>
                typeof focus === "string" && focus.length > 0
            ) as FocusArea[])
          : [];

        const connections = Array.isArray(data.user.connections)
          ? data.user.connections
              .map((connection) =>
                typeof connection === "string" ? connection.trim() : ""
              )
              .filter((connection) => connection.length > 0)
          : [];

        const sanitizedSocials =
          data.user.socials && typeof data.user.socials === "object"
            ? Object.entries(data.user.socials).reduce((acc, [key, value]) => {
                if (typeof value === "string") {
                  const trimmed = value.trim();
                  if (trimmed.length > 0) {
                    acc[key as keyof UserProfile["socials"]] = trimmed;
                  }
                }
                return acc;
              }, {} as NonNullable<UserProfile["socials"]>)
            : undefined;

        const normalizedProfile: UserProfile = {
          username: data.user.username,
          name: data.user.name?.trim() ?? "",
          avatar: data.user.avatar ?? DEFAULT_AVATAR,
          tagline: data.user.tagline?.trim() ?? "",
          projects: data.user.projects?.trim() ?? "",
          focuses,
          connections,
          socials:
            sanitizedSocials && Object.keys(sanitizedSocials).length > 0
              ? sanitizedSocials
              : undefined,
        };

        setViewingProfile(normalizedProfile);
        setConnectionDirectory((prev) => ({
          ...prev,
          [normalizedProfile.username]: normalizedProfile,
        }));

        if (data.relationship?.status === "outgoing") {
          setPendingConnections((prev) =>
            prev.includes(normalizedUsername)
              ? prev
              : [...prev, normalizedUsername]
          );
        } else if (
          data.relationship?.status === "connected" ||
          data.relationship?.status === "none"
        ) {
          setPendingConnections((prev) =>
            prev.filter((username) => username !== normalizedUsername)
          );
        }

        const posts = Array.isArray(data.posts) ? data.posts : [];
        const mappedActivities = mapPostsToActivities(posts);

        setActivities((prev) => {
          if (mappedActivities.length === 0) {
            return prev;
          }

          const indexMap = new Map(
            prev.map((activity, index) => [activity.id, index])
          );

          let hasChanges = false;
          const updated = [...prev];

          mappedActivities.forEach((activity) => {
            const existingIndex = indexMap.get(activity.id);
            if (existingIndex !== undefined) {
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...activity,
              };
              hasChanges = true;
            } else {
              updated.push(activity);
              hasChanges = true;
            }
          });

          return hasChanges ? updated : prev;
        });

        setViewingProfileError(null);
      } else if (response.status === 404) {
        const fallback = MOCK_USER_PROFILES[normalizedUsername];
        if (fallback) {
          setViewingProfile(fallback);
          setViewingProfileError(null);
        } else {
          setViewingProfile(null);
          setViewingProfileError("We couldn't find that profile.");
        }
      } else {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Unable to load profile.");
      }
    } catch (error) {
      console.error("Failed to load profile", error);
      setViewingProfileError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to load profile right now. Please try again later."
      );
    } finally {
      setViewingProfileLoading(false);
    }
  };

  const handleViewActivity = (postId: string) => {
    setCurrentView("feed");
    setHighlightedPostId(postId);
  };

  const handleClearHighlightedPost = () => {
    setHighlightedPostId(null);
  };

  const handleClosePublicProfile = () => {
    setCurrentView("feed");
    setViewingProfile(null);
    setViewingProfileError(null);
    setViewingProfileLoading(false);
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

  const handleClearNotifications = async () => {
    const previousNotifications = notifications.map((notification) => ({
      ...notification,
    }));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await apiClient.patch("/notifications", { action: "markAllRead" });
    } catch (error) {
      console.error("Failed to clear notifications", error);
      toast.error("Unable to mark notifications as read. Please try again.");
      setNotifications(previousNotifications);
      void refreshNotifications();
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    let computedProfile: UserProfile | null = null;

    setUserProfile((prev) => {
      const mergedProfile: UserProfile = {
        ...(prev ?? updatedProfile),
        ...updatedProfile,
        pendingIncoming:
          updatedProfile.pendingIncoming ?? prev?.pendingIncoming ?? [],
        pendingOutgoing:
          updatedProfile.pendingOutgoing ?? prev?.pendingOutgoing ?? [],
      };
      computedProfile = mergedProfile;
      return mergedProfile;
    });

    if (!computedProfile) {
      return;
    }

    setViewingProfile((prev) => {
      if (!prev || prev.username !== computedProfile?.username) {
        return prev;
      }
      return {
        ...prev,
        ...computedProfile,
      };
    });

    if (computedProfile.username) {
      const profileToPersist = computedProfile;
      MOCK_USER_PROFILES[profileToPersist.username] = profileToPersist;
      setConnectionDirectory((prev) => ({
        ...prev,
        [profileToPersist.username]: profileToPersist,
      }));
    }

    setPendingConnections(computedProfile.pendingOutgoing ?? []);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(computedProfile)
      );
      window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
      if (sessionUserId) {
        window.localStorage.setItem(
          USER_PROFILE_OWNER_STORAGE_KEY,
          sessionUserId
        );
      }
    }
  };

  const handleAcceptConnectRequest = async (
    notificationId: string,
    fromUsername: string
  ) => {
    const normalizedUsername = fromUsername.trim().toLowerCase();

    try {
      await apiClient.patch("/connections", {
        username: normalizedUsername,
        action: "accept",
      });

      toast.success("Connection request accepted.");

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );

      setUserProfile((prev) => {
        if (!prev) {
          return prev;
        }
        const connections = prev.connections.includes(normalizedUsername)
          ? prev.connections
          : [...prev.connections, normalizedUsername];
        const pendingIncoming = (prev.pendingIncoming ?? []).filter(
          (username) => username !== normalizedUsername
        );
        return {
          ...prev,
          connections,
          pendingIncoming,
        };
      });

      setPendingConnections((prev) =>
        prev.filter((username) => username !== normalizedUsername)
      );

      if (userProfile?.username) {
        const currentUsername = userProfile.username;
        setViewingProfile((prev) => {
          if (!prev || prev.username !== normalizedUsername) {
            return prev;
          }
          if (prev.connections.includes(currentUsername)) {
            return prev;
          }
          return {
            ...prev,
            connections: [...prev.connections, currentUsername],
          };
        });
      }

      await refreshConnections();
    } catch (error) {
      console.error("Failed to accept connection request", error);
      toast.error("Unable to accept connection request. Please try again.");
    }
  };

  const handleDeclineConnectRequest = async (
    notificationId: string,
    fromUsername: string
  ) => {
    const normalizedUsername = fromUsername.trim().toLowerCase();

    try {
      await apiClient.patch("/connections", {
        username: normalizedUsername,
        action: "decline",
      });

      toast.success("Connection request declined.");

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );

      setUserProfile((prev) => {
        if (!prev) {
          return prev;
        }
        const pendingIncoming = (prev.pendingIncoming ?? []).filter(
          (username) => username !== normalizedUsername
        );
        return {
          ...prev,
          pendingIncoming,
        };
      });

      await refreshConnections();
    } catch (error) {
      console.error("Failed to decline connection request", error);
      toast.error("Unable to decline connection request. Please try again.");
    }
  };

  const handleViewConnections = (username: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const directory = {
      ...MOCK_USER_PROFILES,
      ...connectionDirectory,
    };
    if (userProfile) {
      directory[userProfile.username] = userProfile;
    }
    const profile = directory[normalizedUsername];
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

  const handleSendConnectRequest = async (targetUsername: string) => {
    const normalizedUsername = targetUsername.trim().toLowerCase();

    if (!normalizedUsername) {
      return;
    }

    if (normalizedUsername === userProfile?.username) {
      toast.error("You cannot connect with yourself.");
      return;
    }

    if (
      userProfile?.connections.includes(normalizedUsername) ||
      pendingConnections.includes(normalizedUsername)
    ) {
      toast("Connection already pending or established.", {
        icon: "ℹ️",
      });
      return;
    }

    setPendingConnections((prev) =>
      prev.includes(normalizedUsername) ? prev : [...prev, normalizedUsername]
    );

    try {
      const result = (await apiClient.post("/connections", {
        username: normalizedUsername,
      })) as { status?: "connected" | "pending" };

      if (result?.status === "connected") {
        toast.success("Connection established!");
        setPendingConnections((prev) =>
          prev.filter((username) => username !== normalizedUsername)
        );
      } else {
        toast.success("Connection request sent.");
        setPendingConnections((prev) =>
          prev.includes(normalizedUsername)
            ? prev
            : [...prev, normalizedUsername]
        );
      }

      await refreshConnections();
    } catch (error) {
      console.error("Failed to send connection request", error);
      setPendingConnections((prev) =>
        prev.filter((username) => username !== normalizedUsername)
      );
      toast.error("Unable to send connection request. Please try again.");
    }
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

  const shouldShowLoadingScreen =
    isPreparingWorkspace ||
    sessionStatus === "loading" ||
    isProfileLoading ||
    (sessionStatus === "authenticated" && !hasLoadedPosts && !isOnboarding);

  if (shouldShowLoadingScreen) {
    return <LoadingScreen />;
  }

  if (isOnboarding) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
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
      case "research": {
        const fallbackDirectory = userProfile
          ? { ...MOCK_USER_PROFILES, [userProfile.username]: userProfile }
          : MOCK_USER_PROFILES;
        const combinedUsers =
          researchUsers.length > 0
            ? researchUsers
            : Object.values(fallbackDirectory);
        return (
          <Research
            allUsers={combinedUsers}
            currentUser={userProfile}
            onViewProfile={handleViewProfile}
            isLoading={isResearchLoading}
            error={researchError}
            onRetry={() => void fetchResearchDirectory({ force: true })}
          />
        );
      }
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
        if (viewingProfileLoading) {
          return (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-neon"></div>
            </div>
          );
        }
        if (viewingProfileError) {
          return (
            <div className="container mx-auto px-4 max-w-lg text-center space-y-4 animate-fade-in">
              <p className="text-gray-300">{viewingProfileError}</p>
              <button
                onClick={handleClosePublicProfile}
                className="bg-brand-neon text-brand-primary font-bold py-2 px-6 rounded-lg hover:bg-green-400 transition-colors"
              >
                Back to Feed
              </button>
            </div>
          );
        }
        if (viewingProfile) {
          return (
            <PublicProfile
              user={viewingProfile}
              currentUser={userProfile}
              activities={activities.filter(
                (a) => a.username === viewingProfile.username
              )}
              onBack={handleClosePublicProfile}
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
          const combinedDirectory: Record<string, UserProfile> = {
            ...MOCK_USER_PROFILES,
            ...connectionDirectory,
          };
          combinedDirectory[userProfile.username] = userProfile;
          return (
            <Connections
              user={viewingConnectionsOf}
              allUsers={combinedDirectory}
              onBack={() => {
                if (viewingConnectionsOf.username === userProfile?.username) {
                  setCurrentView("profile");
                } else {
                  void handleViewProfile(viewingConnectionsOf.username);
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
