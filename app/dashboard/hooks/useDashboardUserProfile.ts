import { useCallback, useEffect } from "react";
import { UserProfile, Activity, FocusArea, View } from "@/app/types";
import {
  DEFAULT_AVATAR,
  MOCK_ACTIVITIES,
  MOCK_USER_PROFILES,
  ONBOARDING_COMPLETE_STORAGE_KEY,
  USER_PROFILE_OWNER_STORAGE_KEY,
  USER_PROFILE_STORAGE_KEY,
  createWelcomeActivity,
} from "../lib/dashboard-constants";
import { PostDTO, mapPostsToActivities } from "../lib/normalizers";

interface UseDashboardUserProfileParams {
  sessionStatus: "authenticated" | "loading" | "unauthenticated";
  sessionUserId: string | null;
  userProfile: UserProfile | null;
  isOnboarding: boolean;
  hasLoadedPosts: boolean;
  isPreparingWorkspace: boolean;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setIsOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  setIsProfileLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreparingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setHasLoadedPosts: React.Dispatch<React.SetStateAction<boolean>>;
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  ensureInitialActivities: () => void;
  fetchPosts: (options?: {
    cursor?: string | null;
    replace?: boolean;
    categoryOnly?: boolean;
    username?: string;
    replyingTo?: string;
    limit?: number;
  }) => Promise<Activity[]>;
  refreshConnections: () => Promise<void>;
  setPendingConnections: React.Dispatch<React.SetStateAction<string[]>>;
  setConnectionDirectory: React.Dispatch<
    React.SetStateAction<Record<string, UserProfile>>
  >;
  setViewingProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setViewingProfileLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setViewingProfileError: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentView: (view: View) => void;
}

interface UseDashboardUserProfileResult {
  handleCompleteOnboarding: (profile: UserProfile) => void;
  handleUpdateProfile: (updatedProfile: UserProfile) => void;
  handleViewProfile: (username: string) => Promise<void>;
  handleClosePublicProfile: () => void;
}

const useDashboardUserProfile = ({
  sessionStatus,
  sessionUserId,
  userProfile,
  isOnboarding,
  hasLoadedPosts,
  setUserProfile,
  setIsOnboarding,
  setIsProfileLoading,
  setIsPreparingWorkspace,
  setHasLoadedPosts,
  setActivities,
  ensureInitialActivities,
  fetchPosts,
  refreshConnections,
  setPendingConnections,
  setConnectionDirectory,
  setViewingProfile,
  setViewingProfileLoading,
  setViewingProfileError,
  setCurrentView,
  isPreparingWorkspace,
}: UseDashboardUserProfileParams): UseDashboardUserProfileResult => {
  const handleCompleteOnboarding = useCallback(
    (profile: UserProfile) => {
      const enrichedProfile: UserProfile = {
        ...profile,
        pendingIncoming: profile.pendingIncoming ?? [],
        pendingOutgoing: profile.pendingOutgoing ?? [],
      };

      setUserProfile(enrichedProfile);
      const welcomeActivity = createWelcomeActivity(profile);
      setActivities((prev) => [welcomeActivity, ...MOCK_ACTIVITIES]);

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
    },
    [
      setActivities,
      setIsOnboarding,
      setIsPreparingWorkspace,
      setUserProfile,
      sessionUserId,
    ]
  );

  const handleUpdateProfile = useCallback(
    (updatedProfile: UserProfile) => {
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
    },
    [
      setConnectionDirectory,
      setPendingConnections,
      setUserProfile,
      setViewingProfile,
      sessionUserId,
    ]
  );

  const handleClosePublicProfile = useCallback(() => {
    setCurrentView("feed");
    setViewingProfile(null);
    setViewingProfileError(null);
    setViewingProfileLoading(false);
  }, [
    setCurrentView,
    setViewingProfile,
    setViewingProfileError,
    setViewingProfileLoading,
  ]);

  const handleViewProfile = useCallback(
    async (username: string) => {
      const normalizedUsername = username?.trim();
      if (!normalizedUsername) {
        return;
      }

      if (normalizedUsername === userProfile?.username) {
        setCurrentView("profile");
        return;
      }

      setViewingProfileLoading(true);
      setViewingProfileError(null);
      setCurrentView("publicProfile");

      try {
        const encodedUsername = encodeURIComponent(normalizedUsername);
        const baseProfileUrl = `/api/user/${encodedUsername}?limit=50&categoryOnly=false`;

        const response = await fetch(baseProfileUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
        });

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
            nextCursor?: string | null;
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
              ? Object.entries(data.user.socials).reduce(
                  (acc, [key, value]) => {
                    if (typeof value === "string") {
                      const trimmed = value.trim();
                      if (trimmed.length > 0) {
                        acc[key as keyof UserProfile["socials"]] = trimmed;
                      }
                    }
                    return acc;
                  },
                  {} as NonNullable<UserProfile["socials"]>
                )
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

          const aggregatedPosts: PostDTO[] = Array.isArray(data.posts)
            ? [...data.posts]
            : [];

          const fetchAdditionalPosts = async (cursor: string | null) => {
            let nextCursor = cursor;

            while (nextCursor) {
              const params = new URLSearchParams({
                username: normalizedUsername,
                categoryOnly: "false",
                limit: "50",
              });

              params.set("cursor", nextCursor);

              const postsResponse = await fetch(
                `/api/posts?${params.toString()}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  cache: "no-store",
                }
              );

              if (!postsResponse.ok) {
                break;
              }

              const postsPayload = (await postsResponse.json()) as {
                posts: PostDTO[];
                nextCursor: string | null;
              };

              if (Array.isArray(postsPayload.posts)) {
                aggregatedPosts.push(...postsPayload.posts);
              }

              if (!postsPayload.nextCursor || postsPayload.nextCursor === nextCursor) {
                nextCursor = null;
              } else {
                nextCursor = postsPayload.nextCursor;
              }
            }
          };

          await fetchAdditionalPosts(data.nextCursor ?? null);

          const mappedActivities = mapPostsToActivities(aggregatedPosts);
          const normalizedActivities = mappedActivities.map((activity) => ({
            ...activity,
            createdAtIso:
              activity.createdAtIso ?? new Date().toISOString(),
          }));

          setActivities((prev) => {
            if (normalizedActivities.length === 0) {
              return prev;
            }

            const indexMap = new Map(
              prev.map((activity, index) => [activity.id, index])
            );
            let hasChanges = false;
            const updated = [...prev];

            normalizedActivities.forEach((activity) => {
              const existingIndex = indexMap.get(activity.id);
              if (existingIndex !== undefined) {
                const existing = updated[existingIndex];
                const merged = {
                  ...existing,
                  ...activity,
                };

                merged.replyingTo =
                  activity.replyingTo === undefined
                    ? existing.replyingTo
                    : activity.replyingTo ?? undefined;

                updated[existingIndex] = merged;
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
    },
    [
      setActivities,
      setConnectionDirectory,
      setCurrentView,
      setPendingConnections,
      setViewingProfile,
      setViewingProfileError,
      setViewingProfileLoading,
      userProfile?.username,
    ]
  );

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (sessionStatus === "unauthenticated") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        window.localStorage.removeItem(ONBOARDING_COMPLETE_STORAGE_KEY);
        window.localStorage.removeItem(USER_PROFILE_OWNER_STORAGE_KEY);
      }
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

    if (typeof window !== "undefined") {
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

      window.localStorage.setItem(
        USER_PROFILE_OWNER_STORAGE_KEY,
        sessionUserId
      );

      const onboardingCompleted = window.localStorage.getItem(
        ONBOARDING_COMPLETE_STORAGE_KEY
      );
      const storedProfile = window.localStorage.getItem(
        USER_PROFILE_STORAGE_KEY
      );

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
    }

    setIsProfileLoading(true);
  }, [
    sessionStatus,
    sessionUserId,
    setHasLoadedPosts,
    setIsOnboarding,
    setIsProfileLoading,
    setUserProfile,
  ]);

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

    void fetchUserProfile();
  }, [
    isOnboarding,
    refreshConnections,
    sessionStatus,
    sessionUserId,
    setIsOnboarding,
    setIsProfileLoading,
    setPendingConnections,
    setUserProfile,
    userProfile,
  ]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !userProfile || hasLoadedPosts) {
      return;
    }

    const loadPosts = async () => {
      const posts = await fetchPosts({ replace: true });
      if ((posts?.length ?? 0) === 0) {
        ensureInitialActivities();
      }
      setHasLoadedPosts(true);
    };

    void loadPosts();
  }, [
    ensureInitialActivities,
    fetchPosts,
    hasLoadedPosts,
    sessionStatus,
    setHasLoadedPosts,
    userProfile,
  ]);

  useEffect(() => {
    if (!isPreparingWorkspace) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIsPreparingWorkspace(false);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [isPreparingWorkspace, setIsPreparingWorkspace]);

  return {
    handleCompleteOnboarding,
    handleUpdateProfile,
    handleViewProfile,
    handleClosePublicProfile,
  };
};

export default useDashboardUserProfile;
