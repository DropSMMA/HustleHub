import { useCallback, useState } from "react";
import { Notification, NotificationType } from "@/app/types";
import apiClient from "@/libs/api";

interface RawNotification {
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
}

export const useDashboardNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = (await apiClient.get("/notifications")) as {
        notifications?: RawNotification[];
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
                  : undefined;
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
                  avatar:
                    actorAvatar ??
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
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

  const handleClearNotifications = useCallback(async () => {
    const previousNotifications = notifications.map((notification) => ({
      ...notification,
    }));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await apiClient.patch("/notifications", { action: "markAllRead" });
    } catch (error) {
      console.error("Failed to clear notifications", error);
      setNotifications(previousNotifications);
      throw error;
    }
  }, [notifications]);

  const markNotificationsAsRead = useCallback(
    async (ids: string | string[]) => {
      const idsArray = (Array.isArray(ids) ? ids : [ids])
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idsArray.length === 0) {
        return;
      }

      const idsSet = new Set(idsArray);
      const previousNotifications = notifications.map((notification) => ({
        ...notification,
      }));

      setNotifications((prev) =>
        prev.map((notification) =>
          idsSet.has(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );

      try {
        await apiClient.patch("/notifications", { ids: idsArray });
      } catch (error) {
        console.error("Failed to mark notifications as read", error);
        setNotifications(previousNotifications);
      }
    },
    [notifications]
  );

  return {
    notifications,
    setNotifications,
    refreshNotifications,
    handleClearNotifications,
    markNotificationsAsRead,
  };
};