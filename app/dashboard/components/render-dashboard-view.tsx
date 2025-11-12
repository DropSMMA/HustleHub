import React from "react";
import Feed from "@/app/dashboard/components/Feed";
import WeeklyInsights from "@/app/dashboard/components/Dashboard";
import Challenges from "@/app/dashboard/components/Challenges";
import Profile from "@/app/dashboard/components/Profile";
import PublicProfile from "@/app/dashboard/components/PublicProfile";
import Notifications from "@/app/dashboard/components/Notifications";
import Connections from "@/app/dashboard/components/Connections";
import Research from "@/app/dashboard/components/Research";
import Settings from "@/app/dashboard/components/Settings";
import ActivityDetail from "@/app/dashboard/components/ActivityDetail";
import {
  Activity,
  Challenge,
  Notification,
  UserChallenge,
  UserProfile,
  View,
} from "@/app/types";
import { MOCK_USER_PROFILES } from "../lib/dashboard-constants";

interface CommonFeedProps {
  activities: Activity[];
  onAddComment: (
    activityId: string,
    commentText: string
  ) => Promise<void> | void;
  onAddReply: (
    activityId: string,
    parentCommentId: string,
    replyText: string
  ) => Promise<void> | void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onViewProfile: (username: string) => Promise<void> | void;
  onDeleteActivity: (activityId: string) => void;
  currentUser: UserProfile | null;
  highlightedPostId: string | null;
  onClearHighlight: () => void;
  onViewActivityDetail: (
    activityId: string,
    options?: { commentId?: string }
  ) => void;
}

export interface DashboardRenderParams {
  currentView: View;
  commonFeedProps: CommonFeedProps;
  onRefresh: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  isLoadingMore: boolean;
  activities: Activity[];
  userProfile: UserProfile | null;
  handleGenerateInsight: (activities: Activity[]) => Promise<void>;
  weeklyInsight: string;
  isLoading: boolean;
  error: string | null;
  researchUsers: UserProfile[];
  isResearchLoading: boolean;
  researchError: string | null;
  fetchResearchDirectory: (options?: { force?: boolean }) => Promise<void>;
  challenges: Challenge[];
  userChallenges: UserChallenge[];
  handleJoinChallenge: (challengeId: string) => void;
  handleUpdateProfile: (profile: UserProfile) => void;
  handleViewConnections: (username: string) => void;
  handleSendConnectRequest: (username: string) => Promise<void>;
  pendingConnections: string[];
  handleAddComment: CommonFeedProps["onAddComment"];
  handleAddReply: CommonFeedProps["onAddReply"];
  handleToggleLike: CommonFeedProps["onToggleLike"];
  handleViewProfile: CommonFeedProps["onViewProfile"];
  handleDeleteActivity: CommonFeedProps["onDeleteActivity"];
  handleViewActivityDetail: CommonFeedProps["onViewActivityDetail"];
  setCurrentView: (view: View) => void;
  viewingProfile: UserProfile | null;
  viewingProfileLoading: boolean;
  viewingProfileError: string | null;
  handleClosePublicProfile: () => void;
  notifications: Notification[];
  handleClearNotifications: () => Promise<void> | void;
  handleAcceptConnectRequest: (
    notificationId: string,
    fromUsername: string
  ) => Promise<void>;
  handleDeclineConnectRequest: (
    notificationId: string,
    fromUsername: string
  ) => Promise<void>;
  handleViewActivity: (postId: string) => void;
  viewingConnectionsOf: UserProfile | null;
  connectionDirectory: Record<string, UserProfile>;
  highlightedCommentId: string | null;
  viewingActivityId: string | null;
  handleCloseActivityDetail: () => void;
}

const renderDashboardView = ({
  currentView,
  commonFeedProps,
  onRefresh,
  onLoadMore,
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
  challenges,
  userChallenges,
  handleJoinChallenge,
  handleUpdateProfile,
  handleViewConnections,
  handleSendConnectRequest,
  pendingConnections,
  handleAddComment,
  handleAddReply,
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
  handleAcceptConnectRequest,
  handleDeclineConnectRequest,
  handleViewActivity,
  viewingConnectionsOf,
  connectionDirectory,
  highlightedCommentId,
  viewingActivityId,
  handleCloseActivityDetail,
}: DashboardRenderParams): React.ReactNode => {
  switch (currentView) {
    case "feed":
      return (
        <Feed
          {...commonFeedProps}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
        />
      );
    case "activityDetail": {
      if (!viewingActivityId) {
        return <Feed {...commonFeedProps} />;
      }
      const activity = activities.find(
        (candidate) => candidate.id === viewingActivityId
      );
      if (!activity) {
        return (
          <div className="container mx-auto px-4 max-w-lg text-center space-y-4 animate-fade-in">
            <p className="text-gray-300">
              We couldn’t find that activity anymore.
            </p>
            <button
              onClick={handleCloseActivityDetail}
              className="bg-brand-neon text-brand-primary font-bold py-2 px-6 rounded-lg hover:bg-green-400 transition-colors"
            >
              Back
            </button>
          </div>
        );
      }
      return (
        <ActivityDetail
          activity={activity}
          currentUser={userProfile}
          onBack={handleCloseActivityDetail}
          onAddComment={handleAddComment}
          onAddReply={handleAddReply}
          onToggleLike={handleToggleLike}
          onDeleteActivity={handleDeleteActivity}
          onViewProfile={handleViewProfile}
          highlightedCommentId={highlightedCommentId}
        />
      );
    }
    case "insights":
      return (
        <WeeklyInsights
          activities={activities.filter(
            (activity) => activity.username === userProfile?.username
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
            (activity) => activity.username === userProfile?.username
          )}
          onDeleteActivity={handleDeleteActivity}
          onAddComment={handleAddComment}
          onAddReply={handleAddReply}
          onToggleLike={handleToggleLike}
          onViewProfile={handleViewProfile}
          setCurrentView={setCurrentView}
          onViewActivityDetail={handleViewActivityDetail}
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
              (activity) => activity.username === viewingProfile.username
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
            onViewActivityDetail={handleViewActivityDetail}
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
              if (viewingConnectionsOf.username === userProfile.username) {
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
          onUpdateEmail={(email) => console.log("Email updated:", email)}
        />
      );
    default:
      return <Feed {...commonFeedProps} />;
  }
};

export default renderDashboardView;
