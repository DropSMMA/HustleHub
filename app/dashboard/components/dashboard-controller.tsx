"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
  Activity,
  View,
  UserProfile,
  Challenge,
  UserChallenge,
} from "@/app/types";
import Header from "@/app/dashboard/components/Header";
import BottomNav from "@/app/dashboard/components/BottomNav";
import LogActivity from "@/app/dashboard/components/LogActivity";
import Onboarding from "@/app/dashboard/components/onboarding/Onboarding";
import LoadingScreen from "@/app/dashboard/components/LoadingScreen";
import { PlusIcon } from "@/app/dashboard/components/icons/PlusIcon";
import { useDashboardActivities } from "../hooks/useDashboardActivities";
import { useDashboardNotifications } from "../hooks/useDashboardNotifications";
import { useDashboardConnections } from "../hooks/useDashboardConnections";
import { useDashboardResearch } from "../hooks/useDashboardResearch";
import useDashboardUserProfile from "../hooks/useDashboardUserProfile";
import {
  MOCK_CHALLENGES,
  MOCK_USER_PROFILES,
} from "../lib/dashboard-constants";
import renderDashboardView from "./render-dashboard-view";
import { getHustleBalanceInsight } from "@/libs/geminiService";
import { useStreakLeaderboards } from "../hooks/useStreakLeaderboards";

const DashboardController: React.FC = () => {
  const { data: session, status: sessionStatus } = useSession();
  const sessionUserId = session?.user?.id ?? null;
  const [currentView, setCurrentView] = useState<View>("feed");
  const [weeklyInsight, setWeeklyInsight] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(
    null
  );
  const [viewingProfileLoading, setViewingProfileLoading] =
    useState<boolean>(false);
  const [viewingProfileError, setViewingProfileError] = useState<string | null>(
    null
  );
  const [isPreparingWorkspace, setIsPreparingWorkspace] =
    useState<boolean>(false);
  const [viewingConnectionsOf, setViewingConnectionsOf] =
    useState<UserProfile | null>(null);
  const [challenges] = useState<Challenge[]>(MOCK_CHALLENGES);
  const [, setUserChallenges] = useState<UserChallenge[]>([]);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(
    null
  );
  const [viewingActivityId, setViewingActivityId] = useState<string | null>(
    null
  );
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const [previousView, setPreviousView] = useState<View>("feed");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [replyingToActivity, setReplyingToActivity] = useState<Activity | null>(
    null
  );

  const {
    notifications,
    setNotifications,
    refreshNotifications,
    handleClearNotifications,
    markNotificationsAsRead,
  } = useDashboardNotifications();

  const {
    activities,
    setActivities,
    isLoadingMore,
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
  } = useDashboardActivities({
    challenges,
    userProfile,
    setUserChallenges,
    onActivityLogged: () => {
      setIsLogModalOpen(false);
      setCurrentView("feed");
      setReplyingToActivity(null);
    },
  });

  const {
    pendingConnections,
    setPendingConnections,
    connectionDirectory,
    setConnectionDirectory,
    refreshConnections,
    handleSendConnectRequest,
    handleAcceptConnectRequest,
    handleDeclineConnectRequest,
  } = useDashboardConnections({
    userProfile,
    setUserProfile,
    setNotifications,
  });

  const {
    researchUsers,
    isResearchLoading,
    researchError,
    fetchResearchDirectory,
    resetResearchState,
  } = useDashboardResearch({
    userProfile,
    setConnectionDirectory,
  });

  const {
    leaderboards,
    isLoading: isLeaderboardsLoading,
    error: leaderboardsError,
    fetchLeaderboards,
  } = useStreakLeaderboards();

  const refreshLeaderboards = useCallback(async () => {
    await fetchLeaderboards({ force: true });
  }, [fetchLeaderboards]);

  const allKnownUsers = useMemo(() => {
    const directory: Record<string, UserProfile> = {};

    Object.values(MOCK_USER_PROFILES).forEach((profile) => {
      directory[profile.username.toLowerCase()] = profile;
    });

    Object.values(connectionDirectory).forEach((profile) => {
      directory[profile.username.toLowerCase()] = profile;
    });

    if (userProfile) {
      directory[userProfile.username.toLowerCase()] = userProfile;
    }

    researchUsers.forEach((profile) => {
      directory[profile.username.toLowerCase()] = profile;
    });

    return directory;
  }, [connectionDirectory, researchUsers, userProfile]);

  const {
    handleCompleteOnboarding,
    handleUpdateProfile,
    handleViewProfile: handleViewProfileFromHook,
    handleClosePublicProfile,
  } = useDashboardUserProfile({
    sessionStatus,
    sessionUserId,
    userProfile,
    isOnboarding,
    isPreparingWorkspace,
    hasLoadedPosts,
    setUserProfile,
    setIsOnboarding,
    setIsProfileLoading,
    setIsPreparingWorkspace,
    setHasLoadedPosts,
    setActivities,
    ensureInitialActivities,
    fetchPosts,
    fetchUserActivitiesByUsername,
    refreshConnections,
    setPendingConnections,
    setConnectionDirectory,
    setViewingProfile,
    setViewingProfileLoading,
    setViewingProfileError,
    setCurrentView,
  });

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
      resetResearchState();
    }
  }, [resetResearchState, userProfile?.username]);

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

  useEffect(() => {
    if (currentView !== "leaderboards") {
      return;
    }
    void fetchLeaderboards();
  }, [currentView, fetchLeaderboards]);

  const ensureRepliesLoaded = useCallback(
    (activityId: string | null) => {
      if (!activityId) {
        return;
      }
      if (loadingReplyThreads[activityId]) {
        return;
      }
      void fetchRepliesForActivity(activityId);
    },
    [fetchRepliesForActivity, loadingReplyThreads]
  );

  const handleViewProfile = handleViewProfileFromHook;

  useEffect(() => {
    if (currentView !== "profile") {
      return;
    }

    const username = userProfile?.username;

    if (!username) {
      return;
    }

    if (loadingUserActivities[username]) {
      return;
    }

    void fetchUserActivitiesByUsername(username);
  }, [
    currentView,
    fetchUserActivitiesByUsername,
    loadingUserActivities,
    userProfile?.username,
  ]);

  const handleViewActivityDetail = useCallback(
    (activityId: string, options?: { commentId?: string }) => {
      if (currentView !== "activityDetail") {
        setPreviousView(currentView);
      }
      setViewingActivityId(activityId);
      setHighlightedCommentId(options?.commentId ?? null);
      setCurrentView("activityDetail");
      ensureRepliesLoaded(activityId);
    },
    [currentView, ensureRepliesLoaded]
  );

  const handleStartReply = useCallback(
    (activity: Activity) => {
      if (!userProfile) {
        toast.error("Complete your profile to reply.");
        return;
      }
      setReplyingToActivity(activity);
      setIsLogModalOpen(true);
    },
    [userProfile]
  );

  const handleOpenNewPostModal = useCallback(() => {
    setReplyingToActivity(null);
    setIsLogModalOpen(true);
  }, []);

  const handleCloseLogModal = useCallback(() => {
    setIsLogModalOpen(false);
    setReplyingToActivity(null);
  }, []);

  const handleCloseActivityDetail = useCallback(() => {
    setViewingActivityId(null);
    setHighlightedCommentId(null);
    setCurrentView(previousView);
    setPreviousView("feed");
  }, [previousView]);

  const handleViewActivity = (postId: string) => {
    setHighlightedPostId(postId);
    handleViewActivityDetail(postId);
  };

  const handleNotificationSeen = useCallback(
    (notificationId: string) => {
      void markNotificationsAsRead(notificationId);
    },
    [markNotificationsAsRead]
  );

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
    onReply: handleStartReply,
    onToggleLike: handleToggleLike,
    onViewProfile: handleViewProfile,
    onDeleteActivity: handleDeleteActivity,
    currentUser: userProfile,
    highlightedPostId: highlightedPostId,
    onClearHighlight: handleClearHighlightedPost,
    onViewActivityDetail: handleViewActivityDetail,
    allUsers: allKnownUsers,
  };

  const viewContent = renderDashboardView({
    currentView,
    commonFeedProps,
    onRefresh: handleRefresh,
    onLoadMore: handleLoadMoreActivities,
    isLoadingMore,
    activities,
    userProfile,
    handleGenerateInsight,
    weeklyInsight,
    isLoading,
    error,
    researchUsers,
    isResearchLoading,
    researchError,
    fetchResearchDirectory,
    handleUpdateProfile,
    handleViewConnections,
    handleSendConnectRequest,
    pendingConnections,
    handleToggleLike,
    handleViewProfile,
    handleDeleteActivity,
    handleViewActivityDetail,
    setCurrentView,
    viewingProfile,
    viewingProfileLoading,
    viewingProfileError,
    handleClosePublicProfile,
    notifications,
    handleClearNotifications,
    handleNotificationSeen,
    handleAcceptConnectRequest,
    handleDeclineConnectRequest,
    handleViewActivity,
    viewingConnectionsOf,
    connectionDirectory,
    highlightedCommentId,
    viewingActivityId,
    handleCloseActivityDetail,
    loadingReplyThreads,
    userActivitiesByUsername,
    allUsers: allKnownUsers,
    leaderboards,
    isLeaderboardsLoading,
    leaderboardsError,
    refreshLeaderboards,
  });

  return (
    <div className="bg-brand-primary h-dvh font-sans text-white flex flex-col overflow-hidden overscroll-y-none">
      <Header
        unreadNotifications={unreadNotificationsCount}
        setCurrentView={setCurrentView}
      />
      <main className="flex-1 overflow-y-auto pb-28 pt-16">{viewContent}</main>
      {currentView === "feed" && (
        <button
          onClick={handleOpenNewPostModal}
          className="fixed bottom-24 right-4 bg-brand-neon text-brand-primary p-4 rounded-full shadow-lg hover:bg-green-400 transition-transform duration-200 hover:scale-110 z-30 animate-pop"
          aria-label="Log new activity"
        >
          <PlusIcon />
        </button>
      )}
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <LogActivity
        isOpen={isLogModalOpen}
        onClose={handleCloseLogModal}
        onPostCreated={handleLogActivity}
        userProfile={userProfile}
        allUsers={allKnownUsers}
        replyingToActivity={replyingToActivity}
      />
    </div>
  );
};

export default DashboardController;