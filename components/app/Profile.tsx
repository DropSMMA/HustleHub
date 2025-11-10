import React, { useState, useEffect, ChangeEvent } from "react";
import { toast } from "react-hot-toast";
import { UserProfile, FocusArea, Activity, View } from "@/app/types";
import apiClient from "@/libs/api";
import { PenIcon } from "./icons/PenIcon";
import { CameraIcon } from "./icons/CameraIcon";
import ActivityCard from "./ActivityCard";
import { TwitterIcon } from "./icons/TwitterIcon";
import { GithubIcon } from "./icons/GithubIcon";
import { LinkedInIcon } from "./icons/LinkedInIcon";
import { LinkIcon } from "./icons/LinkIcon";
import HustleBalanceChart from "./HustleBalanceChart";
import { SettingsIcon } from "./icons/SettingsIcon";

interface ProfileProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onViewConnections: (username: string) => void;
  activities: Activity[];
  onDeleteActivity: (activityId: string) => void;
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
  setCurrentView: (view: View) => void;
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

interface ApiUser {
  username: string;
  name?: string;
  image?: string;
  tagline?: string;
  projects?: string[];
  focuses?: FocusArea[];
  connections?: string[];
  socials?: ApiUserSocials;
}

const mapApiUserToProfile = (user: ApiUser): UserProfile => ({
  username: user.username,
  name: user.name ?? "",
  avatar: user.image ?? FALLBACK_AVATAR,
  tagline: user.tagline ?? "",
  projects: Array.isArray(user.projects) ? user.projects.join(", ") : "",
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
  onAddComment,
  onAddReply,
  onToggleLike,
  onViewProfile,
  setCurrentView,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(
    userProfile
  );
  const [openCommentSectionId, setOpenCommentSectionId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleComments = (activityId: string) => {
    setOpenCommentSectionId((prevId) =>
      prevId === activityId ? null : activityId
    );
  };

  useEffect(() => {
    if (!isEditing) {
      setEditedProfile(userProfile);
    }
  }, [userProfile, isEditing]);

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

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editedProfile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedProfile((prev) => ({
          ...prev!,
          avatar: reader.result as string,
        }));
      };
      reader.readAsDataURL(e.target.files[0]);
    }
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

    const projectsArray = editedProfile.projects
      ? editedProfile.projects
          .split(",")
          .map((project) => project.trim())
          .filter(Boolean)
      : [];

    const socialsPayload = editedProfile.socials
      ? Object.entries(editedProfile.socials).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            acc[key] = typeof value === "string" ? value.trim() : "";
            return acc;
          },
          {}
        )
      : undefined;

    const payload = {
      name: trimmedName,
      tagline: editedProfile.tagline?.trim() ?? "",
      avatar: editedProfile.avatar,
      focuses: editedProfile.focuses,
      projects: projectsArray,
      socials: socialsPayload,
    };

    setIsSaving(true);

    try {
      const { user } = (await apiClient.patch("/user/profile", payload)) as {
        user: ApiUser;
      };

      const normalizedProfile = mapApiUserToProfile(user);
      onUpdateProfile(normalizedProfile);
      setEditedProfile(normalizedProfile);
      setIsEditing(false);
      toast.success("Profile updated.");
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(userProfile);
  };

  const socials = userProfile.socials;

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

      <div className="bg-brand-secondary rounded-xl p-4">
        <h3 className="font-bold text-lg mb-3">My Focus Areas</h3>
        {isEditing ? (
          <div className="grid grid-cols-1 gap-3">
            {allFocuses.map((focus) => (
              <button
                key={focus}
                type="button"
                onClick={() => toggleFocus(focus)}
                className={`p-3 rounded-lg font-semibold text-left transition-all duration-200 border-2 ${
                  editedProfile.focuses.includes(focus)
                    ? "bg-brand-neon/10 border-brand-neon text-brand-neon"
                    : "bg-brand-tertiary border-transparent hover:border-gray-500"
                }`}
              >
                {focus}
              </button>
            ))}
          </div>
        ) : (
          userProfile.focuses &&
          userProfile.focuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {userProfile.focuses.map((focus) => (
                <span
                  key={focus}
                  className="bg-brand-tertiary text-brand-neon text-xs font-semibold px-3 py-1 rounded-full"
                >
                  {focus}
                </span>
              ))}
            </div>
          )
        )}
      </div>

      <div className="bg-brand-secondary rounded-xl p-4">
        <h3 className="font-bold text-lg mb-2">My Projects</h3>
        {isEditing ? (
          <input
            type="text"
            name="projects"
            value={editedProfile.projects}
            onChange={handleChange}
            placeholder="Comma-separated projects"
            className="w-full mt-1 bg-brand-tertiary border-brand-tertiary rounded-md p-3 focus:ring-brand-neon focus:border-brand-neon transition-colors"
          />
        ) : (
          userProfile.projects && (
            <p className="text-gray-300">{userProfile.projects}</p>
          )
        )}
      </div>

      {isEditing && (
        <div className="bg-brand-secondary rounded-xl p-4">
          <h3 className="font-bold text-lg mb-3">Social Links</h3>
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <TwitterIcon />
              </span>
              <input
                type="text"
                name="twitter"
                value={editedProfile.socials?.twitter || ""}
                onChange={handleSocialChange}
                placeholder="Twitter URL"
                className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors"
              />
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <GithubIcon />
              </span>
              <input
                type="text"
                name="github"
                value={editedProfile.socials?.github || ""}
                onChange={handleSocialChange}
                placeholder="GitHub URL"
                className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors"
              />
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <LinkedInIcon />
              </span>
              <input
                type="text"
                name="linkedin"
                value={editedProfile.socials?.linkedin || ""}
                onChange={handleSocialChange}
                placeholder="LinkedIn URL"
                className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors"
              />
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <LinkIcon />
              </span>
              <input
                type="text"
                name="website"
                value={editedProfile.socials?.website || ""}
                onChange={handleSocialChange}
                placeholder="Portfolio/Website URL"
                className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors"
              />
            </div>
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
                isCommentSectionOpen={openCommentSectionId === activity.id}
                onToggleComments={() => toggleComments(activity.id)}
                onAddComment={onAddComment}
                onAddReply={onAddReply}
                onViewProfile={onViewProfile}
                onToggleLike={onToggleLike}
                onDelete={onDeleteActivity}
                currentUser={userProfile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
            <p className="font-semibold">You haven't posted yet.</p>
            <p className="text-sm">Log your first hustle to see it here!</p>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="flex space-x-4 pt-4">
          <button
            onClick={handleCancel}
            className="w-full text-center bg-brand-tertiary hover:bg-opacity-80 text-gray-300 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full text-center bg-brand-neon hover:bg-green-400 disabled:hover:bg-brand-neon/80 disabled:opacity-60 disabled:cursor-not-allowed text-brand-primary font-bold py-3 px-4 rounded-lg transition-colors"
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
