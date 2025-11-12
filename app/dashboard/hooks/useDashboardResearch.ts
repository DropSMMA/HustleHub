import { useCallback, useState } from "react";
import { UserProfile } from "@/app/types";
import apiClient from "@/libs/api";
import { normalizeDirectoryUser } from "../lib/normalizers";

interface UseDashboardResearchParams {
  userProfile: UserProfile | null;
  setConnectionDirectory: React.Dispatch<
    React.SetStateAction<Record<string, UserProfile>>
  >;
}

export const useDashboardResearch = ({
  userProfile,
  setConnectionDirectory,
}: UseDashboardResearchParams) => {
  const [researchUsers, setResearchUsers] = useState<UserProfile[]>([]);
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [hasRequestedResearch, setHasRequestedResearch] =
    useState<boolean>(false);

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
          users?: unknown[];
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
    [
      hasRequestedResearch,
      isResearchLoading,
      setConnectionDirectory,
      userProfile,
    ]
  );

  const resetResearchState = useCallback(() => {
    setResearchUsers([]);
    setResearchError(null);
    setHasRequestedResearch(false);
  }, []);

  return {
    researchUsers,
    isResearchLoading,
    researchError,
    fetchResearchDirectory,
    resetResearchState,
  };
};
