import React, {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useMemo,
} from "react";
import { toast } from "react-hot-toast";
import {
  UserProfile,
  FocusArea,
  Activity,
  View,
  ProjectLink,
} from "@/app/types";
import apiClient from "@/libs/api";
import { optimizeImageFile } from "@/app/dashboard/lib/image-optimizer";
import { PenIcon } from "./icons/PenIcon";
import { CameraIcon } from "./icons/CameraIcon";
import ActivityCard from "./ActivityCard";
import { TwitterIcon } from "./icons/TwitterIcon";
import { GithubIcon } from "./icons/GithubIcon";
import { LinkedInIcon } from "./icons/LinkedInIcon";
import { LinkIcon } from "./icons/LinkIcon";
import HustleBalanceChart from "./HustleBalanceChart";
import ProjectEditorList from "./projects/ProjectEditorList";
import { SettingsIcon } from "./icons/SettingsIcon";
import {
  normalizeProjectLinks,
  sanitizeProjectLinksForPersistence,
} from "@/libs/projects";

interface ProfileProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onViewConnections: (username: string) => void;
  activities: Activity[];
  onDeleteActivity: (activityId: string) => void;
  onReply: (activity: Activity) => void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onViewProfile: (username: string) => Promise<void> | void;
  setCurrentView: (view: View) => void;
  onViewActivityDetail?: (activityId: string) => void;
  allActivities?: Activity[];
  allUsers?: Record<string, UserProfile>;
}

const StatCard: React.FC<{ value: string; label: string }> = ({
  value,
  label,
}) => (
  <div className="bg-brand-tertiary p-4 rounded-lg text-center h-full flex flex-col justify-center">
    <p className="text-2xl font-bold text-brand-neon">{value}</p>
    <p className="text-sm text-gray-400">{label}</p>
  </div>
);

const allFocuses = Object.values(FocusArea);

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

interface ApiUserSocials {
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

interface ApiUserProject {
  name?: string | null;
  url?: string | null;
}

interface ApiUser {
  username: string;
  name?: string;
  image?: string;
  tagline?: string;
  projects?: ApiUserProject[] | string[] | string | null;
  focuses?: FocusArea[];
  connections?: string[];
  socials?: ApiUserSocials;
}

const mapApiUserToProfile = (user: ApiUser): UserProfile => ({
  username: user.username,
  name: user.name ?? "",
  avatar: user.image ?? FALLBACK_AVATAR,
  tagline: user.tagline ?? "",
  projects: normalizeProjectLinks(user.projects),
  focuses: user.focuses ?? [],
  connections: user.connections ?? [],
  socials: user.socials,
});

const Profile: React.FC<ProfileProps> = ({
  userProfile,
  onUpdateProfile,
  onViewConnections,
  activities,
  onDeleteActivity,
  onReply,
  onToggleLike,
  onViewProfile,
  setCurrentView,
  onViewActivityDetail,
  allActivities,
  allUsers,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(
    userProfile
  );
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditedProfile(userProfile);
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
    }
  }, [userProfile, isEditing]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  if (!userProfile || !editedProfile) {
    return (
      <div className="container mx-auto px-4 max-w-lg text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, [e.target.name]: e.target.value });
    }
  };

  const handleSocialChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        socials: {
          ...editedProfile.socials,
          [e.target.name]: e.target.value,
        },
      });
    }
  };

  const handleProjectChange = (
    index: number,
    field: keyof ProjectLink,
    value: string
  ) => {
    if (!editedProfile) {
      return;
    }

    setEditedProfile({
      ...editedProfile,
      projects: editedProfile.projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, [field]: value } : project
      ),
    });
  };

  const handleAddProject = () => {
    if (!editedProfile) {
      return;
    }
    setEditedProfile({
      ...editedProfile,
      projects: [...editedProfile.projects, { name: "", url: "" }],
    });
  };

  const handleRemoveProject = (index: number) => {
    if (!editedProfile) {
      return;
    }

    setEditedProfile({
      ...editedProfile,
      projects: editedProfile.projects.filter(
        (_, projectIndex) => projectIndex !== index
      ),
    });
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !editedProfile) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setEditedProfile((prev) => ({
      ...prev!,
      avatar: objectUrl,
    }));
    e.target.value = "";
  };

  const toggleFocus = (focus: FocusArea) => {
    if (editedProfile) {
      const currentFocuses = editedProfile.focuses || [];
      if (!currentFocuses.includes(focus) && currentFocuses.length >= 3) {
        toast.error("You can select up to three focus areas.");
        return;
      }
      const newFocuses = currentFocuses.includes(focus)
        ? currentFocuses.filter((f) => f !== focus)
        : [...currentFocuses, focus];
      setEditedProfile({ ...editedProfile, focuses: newFocuses });
    }
  };

  const handleSave = async () => {
    if (!editedProfile) {
      return;
    }

    if (isSaving) {
      return;
    }

    const trimmedName = editedProfile.name.trim();

    if (trimmedName.length === 0) {
      toast.error("Name is required.");
      return;
    }

    if (!editedProfile.focuses || editedProfile.focuses.length === 0) {
      toast.error("Select at least one focus area.");
      return;
    }

    if (editedProfile.focuses.length > 3) {
      toast.error("You can select up to three focus areas.");
      return;
    }

    const sanitizedProjects = sanitizeProjectLinksForPersistence(
      editedProfile.projects
    );

    const socialsPayload = editedProfile.socials
      ? Object.entries(editedProfile.socials).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            acc[key] = typeof value === "string" ? value.trim() : "";
            return acc;
          },
          {}
        )
      : undefined;

    setIsSaving(true);

    try {
      let avatarUrl =
        editedProfile.avatar && !editedProfile.avatar.startsWith("blob:")
          ? editedProfile.avatar.trim()
          : undefined;
      let fileToUpload = avatarFile;

      if (!fileToUpload && avatarUrl?.startsWith("data:")) {
        try {
          const response = await fetch(avatarUrl);
          const blob = await response.blob();
          const extension = blob.type.split("/")[1] || "png";
          fileToUpload = new File([blob], `avatar-${Date.now()}.${extension}`, {
            type: blob.type || "image/png",
          });
        } catch (error) {
          console.error("Failed to convert existing avatar", error);
        }
      }

      if (fileToUpload) {
        const optimizedFile = await optimizeImageFile(fileToUpload, {
          preset: "avatar",
        });

        const { uploadUrl, fileUrl } = (await apiClient.post("/uploads", {
          fileName: optimizedFile.name,
          fileType: optimizedFile.type,
        })) as { uploadUrl: string; fileUrl: string };

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": optimizedFile.type,
          },
          body: optimizedFile,
        });

        if (uploadResponse.ok) {
          avatarUrl = fileUrl;
        } else {
          throw new Error("Avatar upload failed.");
        }
      } else if (avatarUrl?.startsWith("blob:")) {
        avatarUrl = undefined;
      } else if (!avatarUrl) {
        avatarUrl =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
      }

      const payload = {
        name: trimmedName,
        tagline: editedProfile.tagline?.trim() ?? "",
        avatar: avatarUrl,
        focuses: editedProfile.focuses,
        projects: sanitizedProjects,
        socials: socialsPayload,
      };

      const { user } = (await apiClient.patch("/user/profile", payload)) as {
        user: ApiUser;
      };

      const normalizedProfile = mapApiUserToProfile(user);
      onUpdateProfile(normalizedProfile);
      setEditedProfile({
        ...normalizedProfile,
        projects:
          sanitizedProjects.length > 0
            ? sanitizedProjects
            : normalizeProjectLinks(normalizedProfile.projects),
      });
      setIsEditing(false);
      toast.success("Profile updated.");
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Unable to update profile. Please try again later.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(userProfile);
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarFile(null);
  };

  const socials = userProfile.socials;

  const replyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const source = allActivities ?? activities;
    source.forEach((activity) => {
      const parentId = activity.replyingTo?.activityId;
      if (parentId) {
        counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
      }
    });
    return counts;
  }, [activities, allActivities]);

  return (
    <div className="container mx-auto px-4 max-w-lg space-y-6 animate-fade-in">
      <div className="h-8">
        {!isEditing && (
          <div className="flex justify-end items-center space-x-4">
            <button
              onClick={() => setCurrentView("settings")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <SettingsIcon />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <PenIcon />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <img
            src={isEditing ? editedProfile.avatar : userProfile.avatar}
            alt={userProfile.name}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-secondary"
          />
          {isEditing && (
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 bg-brand-neon text-brand-primary p-2 rounded-full cursor-pointer hover:bg-green-400 transition-all"
            >
              <CameraIcon />
              <input
                id="avatar-upload"
                name="avatar-upload"
                type="file"
                className="sr-only"
                onChange={handleAvatarChange}
                accept="image/*"
              />
            </label>
          )}
        </div>
        {isEditing ? (
          <input
            type="text"
            name="name"
            value={editedProfile.name}
            onChange={handleChange}
            placeholder="Name or Handle"
            className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-brand-tertiary focus:border-brand-neon focus:outline-none p-2 transition-colors"
          />
        ) : (
          <h1 className="text-3xl font-bold">{userProfile.name}</h1>
        )}
        {isEditing ? (
          <input
            type="text"
            name="tagline"
            value={editedProfile.tagline}
            onChange={handleChange}
            placeholder="Your tagline"
            className="w-full text-center text-gray-400 mt-1 bg-transparent border-b-2 border-brand-tertiary focus:border-brand-neon focus:outline-none p-1 transition-colors"
          />
        ) : (
          userProfile.tagline && (
            <p className="text-gray-400 mt-1">{userProfile.tagline}</p>
          )
        )}

        {!isEditing && socials && Object.values(socials).some((s) => s) && (
          <div className="mt-4 flex space-x-4">
            {socials.twitter && (
              <a
                href={socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <TwitterIcon />
              </a>
            )}
            {socials.github && (
              <a
                href={socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <GithubIcon />
              </a>
            )}
            {socials.linkedin && (
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <LinkedInIcon />
              </a>
            )}
            {socials.website && (
              <a
                href={socials.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
              >
                <LinkIcon />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard value={String(activities.length)} label="My Hustles" />
        <button
          onClick={() => onViewConnections(userProfile.username)}
          className="w-full text-left"
        >
          <StatCard
            value={userProfile.connections.length.toString()}
            label="Connections"
          />
        </button>
      </div>

      <HustleBalanceChart activities={activities} />

      <div className="bg-brand-secondary border border-brand-border rounded-xl p-4">
        <h3 className="font-bold text-lg mb-3">Focus Areas</h3>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {allFocuses.map((focus) => {
              const isSelected = editedProfile.focuses.includes(focus);
              return (
                <button
                  key={focus}
                  type="button"
                  onClick={() => toggleFocus(focus)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all duration-200 border-2 ${
                    isSelected
                      ? "bg-brand-neon/10 border-brand-neon text-brand-neon"
                      : "bg-brand-tertiary border-transparent hover:border-brand-border text-brand-text-secondary"
                  }`}
                >
                  {focus}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userProfile.focuses.length > 0 ? (
              userProfile.focuses.map((focus) => (
                <span
                  key={focus}
                  className="bg-brand-tertiary text-brand-neon text-xs font-semibold px-3 py-1 rounded-full"
                >
                  {focus}
                </span>
              ))
            ) : (
              <p className="text-sm text-brand-text-secondary">
                No focus areas selected yet.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-brand-secondary border border-brand-border rounded-xl p-4">
        <h3 className="font-bold text-lg mb-3">Projects</h3>
        {isEditing ? (
          <ProjectEditorList
            projects={editedProfile.projects}
            onProjectChange={handleProjectChange}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
            helperText="Share the product, idea, or experiment you're working on. Links are optional."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {userProfile.projects.length > 0 ? (
              userProfile.projects.map((project, index) => {
                const projectUrl = project.url?.trim();
                return projectUrl ? (
                  <a
                    key={`${project.name}-${index}`}
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-tertiary text-brand-neon text-xs font-semibold px-3 py-1 rounded-full hover:bg-brand-border transition-colors inline-flex items-center gap-1.5"
                  >
                    {project.name}
                    <span className="inline-flex scale-75">
                      <LinkIcon />
                    </span>
                  </a>
                ) : (
                  <span
                    key={`${project.name}-${index}`}
                    className="bg-brand-tertiary text-brand-text-secondary text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {project.name}
                  </span>
                );
              })
            ) : (
              <p className="text-sm text-brand-text-secondary">
                No projects listed.
              </p>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="bg-brand-secondary border border-brand-border rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-lg">Social Links</h3>
          <div className="flex items-center space-x-2">
            <TwitterIcon />
            <input
              type="text"
              name="twitter"
              value={editedProfile.socials?.twitter || ""}
              onChange={handleSocialChange}
              placeholder="Twitter URL"
              className="w-full bg-brand-tertiary border border-brand-border rounded-md p-2 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <GithubIcon />
            <input
              type="text"
              name="github"
              value={editedProfile.socials?.github || ""}
              onChange={handleSocialChange}
              placeholder="GitHub URL"
              className="w-full bg-brand-tertiary border border-brand-border rounded-md p-2 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <LinkedInIcon />
            <input
              type="text"
              name="linkedin"
              value={editedProfile.socials?.linkedin || ""}
              onChange={handleSocialChange}
              placeholder="LinkedIn URL"
              className="w-full bg-brand-tertiary border border-brand-border rounded-md p-2 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <LinkIcon />
            <input
              type="text"
              name="website"
              value={editedProfile.socials?.website || ""}
              onChange={handleSocialChange}
              placeholder="Website/Portfolio URL"
              className="w-full bg-brand-tertiary border border-brand-border rounded-md p-2 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-lg">My Feed</h3>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onReply={onReply}
                onViewProfile={onViewProfile}
                onToggleLike={onToggleLike}
                onDelete={onDeleteActivity}
                currentUser={userProfile}
                onClick={
                  onViewActivityDetail
                    ? () => onViewActivityDetail(activity.id)
                    : undefined
                }
                replyCount={
                  activity.replyCount ?? replyCounts.get(activity.id) ?? 0
                }
                allUsers={allUsers}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
            <p className="font-semibold">You haven’t posted yet.</p>
            <p className="text-sm">Log your first hustle to see it here!</p>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleCancel}
            className="w-full py-2 rounded-lg bg-brand-tertiary text-brand-text-secondary font-semibold hover:bg-brand-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2 rounded-lg bg-brand-neon text-brand-primary font-semibold hover:bg-green-400 transition-colors shadow-lg shadow-brand-neon/20 disabled:opacity-60 disabled:hover:bg-brand-neon"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : (
        <div className="pt-4">
          <button className="w-full text-center bg-brand-secondary hover:bg-brand-tertiary text-red-400 font-bold py-3 px-4 rounded-lg transition-colors">
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
