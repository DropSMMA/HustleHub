import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ConnectionPreview,
  Notification,
  NotificationType,
  UserProfile,
} from "@/app/types";
import apiClient from "@/libs/api";
import { mapPreviewToUserProfile } from "../lib/normalizers";
import { MOCK_USER_PROFILES } from "../lib/dashboard-constants";

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

interface UseDashboardConnectionsParams {
  userProfile: UserProfile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const useDashboardConnections = ({
  userProfile,
  setUserProfile,
  setNotifications,
}: UseDashboardConnectionsParams) => {
  const [pendingConnections, setPendingConnections] = useState<string[]>([]);
  const [connectionDirectory, setConnectionDirectory] = useState<
    Record<string, UserProfile>
  >({});

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
  }, [setNotifications, setUserProfile]);

  const handleSendConnectRequest = useCallback(
    async (targetUsername: string) => {
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
    },
    [
      pendingConnections,
      refreshConnections,
      userProfile?.connections,
      userProfile?.username,
    ]
  );

  const handleAcceptConnectRequest = useCallback(
    async (notificationId: string, fromUsername: string) => {
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
          setConnectionDirectory((prev) => {
            const existing =
              prev[normalizedUsername] ??
              MOCK_USER_PROFILES[normalizedUsername];
            if (!existing) {
              return prev;
            }

            if (existing.connections.includes(currentUsername)) {
              return prev;
            }

            return {
              ...prev,
              [normalizedUsername]: {
                ...existing,
                connections: [...existing.connections, currentUsername],
              },
            };
          });
        }

        await refreshConnections();
      } catch (error) {
        console.error("Failed to accept connection request", error);
        toast.error("Unable to accept connection request. Please try again.");
      }
    },
    [
      refreshConnections,
      setNotifications,
      setUserProfile,
      userProfile?.username,
    ]
  );

  const handleDeclineConnectRequest = useCallback(
    async (notificationId: string, fromUsername: string) => {
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
    },
    [refreshConnections, setNotifications, setUserProfile]
  );

  return {
    pendingConnections,
    setPendingConnections,
    connectionDirectory,
    setConnectionDirectory,
    refreshConnections,
    handleSendConnectRequest,
    handleAcceptConnectRequest,
    handleDeclineConnectRequest,
  };
};