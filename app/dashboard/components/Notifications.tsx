import React from "react";
import { Notification, NotificationType, View } from "@/app/types";
import { CommentIcon } from "./icons/CommentIcon";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { TrophyIcon } from "./icons/TrophyIcon";
import { SparklesIcon } from "./icons/SparklesIcon";
import { UserPlusIcon } from "./icons/UserPlusIcon";

interface NotificationsProps {
  notifications: Notification[];
  onClearAll: () => void;
  onAcceptConnectRequest: (
    notificationId: string,
    fromUsername: string
  ) => void;
  onDeclineConnectRequest: (
    notificationId: string,
    fromUsername: string
  ) => void;
  onViewProfile: (username: string) => Promise<void> | void;
  onViewActivity: (postId: string) => void;
}

const formatNotificationTimestamp = (raw: string) => {
  if (!raw) {
    return "";
  }

  const normalized = raw.trim();

  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();

  if (lower === "just now" || lower.endsWith("ago")) {
    return normalized;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));

  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return parsed.toLocaleDateString();
};

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  switch (type) {
    case NotificationType.Comment:
      return <CommentIcon />;
    case NotificationType.Mention:
      return <CommentIcon />;
    case NotificationType.Kudo:
      return <ThumbsUpIcon />;
    case NotificationType.Challenge:
      return <TrophyIcon />;
    case NotificationType.System:
      return <SparklesIcon />;
    case NotificationType.ConnectRequest:
      return <UserPlusIcon />;
    default:
      return null;
  }
};

const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onClearAll,
  onAcceptConnectRequest,
  onDeclineConnectRequest,
  onViewProfile,
  onViewActivity,
}) => {
  return (
    <div className="container mx-auto px-4 max-w-lg space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Notifications</h2>
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm font-semibold text-brand-neon hover:text-green-300 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const showActorName = ![
              NotificationType.Challenge,
              NotificationType.System,
            ].includes(notification.type);
            const formattedTimestamp = formatNotificationTimestamp(
              notification.timestamp
            );
            return (
              <div
                key={notification.id}
                className={`bg-brand-secondary rounded-lg flex items-start space-x-4 transition-colors ${
                  !notification.read
                    ? "border-l-4 border-brand-neon"
                    : "opacity-70"
                } p-4`}
              >
                <div
                  className={`flex-shrink-0 mt-1 ${
                    !notification.read ? "text-brand-neon" : "text-gray-400"
                  }`}
                >
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-grow">
                  <div
                    className={`w-full text-left ${
                      notification.postId ? "cursor-pointer" : ""
                    }`}
                    onClick={() =>
                      notification.postId && onViewActivity(notification.postId)
                    }
                  >
                    <div className="flex items-start space-x-2">
                      <button
                        className="flex-shrink-0 z-10 relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onViewProfile(notification.actor.username);
                        }}
                      >
                        <img
                          src={notification.actor.avatar}
                          alt={notification.actor.name}
                          className="h-6 w-6 rounded-full"
                        />
                      </button>
                      <div className="text-sm text-gray-200">
                        {showActorName && (
                          <>
                            <button
                              className="font-bold text-white hover:underline z-10 relative"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onViewProfile(notification.actor.username);
                              }}
                            >
                              {notification.actor.name}
                            </button>{" "}
                          </>
                        )}
                        <span
                          dangerouslySetInnerHTML={{
                            __html: notification.message,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formattedTimestamp}
                    </p>
                  </div>
                  {notification.type === NotificationType.ConnectRequest &&
                    !notification.read && (
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() =>
                            onAcceptConnectRequest(
                              notification.id,
                              notification.actor.username
                            )
                          }
                          className="bg-brand-neon text-brand-primary text-xs font-bold py-1 px-3 rounded-md hover:bg-green-400 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            onDeclineConnectRequest(
                              notification.id,
                              notification.actor.username
                            )
                          }
                          className="bg-brand-tertiary text-gray-300 text-xs font-bold py-1 px-3 rounded-md hover:bg-opacity-80 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
          <p className="font-semibold text-lg">All caught up!</p>
          <p>You have no new notifications.</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
