import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import { Activity, ActivityType, UserProfile } from "@/app/types";
import apiClient from "@/libs/api";
import { mapPostToActivity, PostDTO } from "@/libs/posts";
import { TagIcon } from "./icons/TagIcon";
import { ChartIcon } from "./icons/ChartIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { CloseIcon } from "./icons/CloseIcon";

interface LogActivityProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (activity: Activity) => void;
  userProfile: UserProfile | null;
  replyingToActivity?: Activity | null;
}

const activityTypes = Object.values(ActivityType);

const LogActivity: React.FC<LogActivityProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  userProfile,
  replyingToActivity = null,
}) => {
  const [type, setType] = useState<ActivityType | null>(null);
  const [description, setDescription] = useState("");
  const [stats, setStats] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isReplyMode = Boolean(replyingToActivity);

  const resetState = () => {
    setType(null);
    setDescription("");
    setStats("");
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    setShowTypeSelector(false);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(resetState, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    setType(null);
  }, [replyingToActivity]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    setImageFile(file);
  };

  const handleSelectType = (selectedType: ActivityType) => {
    setType((current) => (current === selectedType ? null : selectedType));
    setShowTypeSelector(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedDescription = description.trim();
    if (!trimmedDescription || isSubmitting) return;
    if (!isReplyMode && !type) return;

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const { uploadUrl, fileUrl } = (await apiClient.post("/uploads", {
          fileName: imageFile.name,
          fileType: imageFile.type,
        })) as { uploadUrl: string; fileUrl: string };

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": imageFile.type,
          },
          body: imageFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed.");
        }

        imageUrl = fileUrl;
      }

      const basePayload: Record<string, unknown> = {
        description: trimmedDescription,
      };

      if (stats.trim()) {
        basePayload.stats = stats.trim();
      }

      if (imageUrl) {
        basePayload.image = imageUrl;
      }

      if (isReplyMode && replyingToActivity) {
        basePayload.replyingTo = {
          activityId: replyingToActivity.id,
        };
        if (type) {
          basePayload.type = type;
        }
      } else if (type) {
        basePayload.type = type;
      }

      const { post } = (await apiClient.post("/posts", basePayload)) as {
        post: PostDTO;
      };

      const activity = mapPostToActivity(post);
      const enrichedActivity = replyingToActivity
        ? {
            ...activity,
            replyingTo:
              activity.replyingTo ?? {
                activityId: replyingToActivity.id,
                username: replyingToActivity.username,
                name: replyingToActivity.user,
              },
          }
        : activity;

      onPostCreated(enrichedActivity);
      toast.success(isReplyMode ? "Reply posted!" : "Your hustle is live!");
      resetState();
    } catch (error) {
      console.error("Failed to publish activity", error);
      toast.error("Unable to publish your hustle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/80 flex items-end justify-center z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-brand-secondary rounded-t-2xl w-full max-w-lg transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center justify-between pb-3">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:bg-brand-tertiary hover:text-white"
            >
              <CloseIcon />
            </button>
            <h2 className="text-lg font-bold">
              {isReplyMode ? "Your Reply" : "New Hustle"}
            </h2>
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || (!type && !isReplyMode) || isSubmitting}
              className="bg-brand-neon text-brand-primary font-bold py-2 px-5 rounded-lg transition-all duration-200 disabled:bg-brand-tertiary disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-green-400"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
              ) : (
                "Post"
              )}
            </button>
          </div>

          {isReplyMode && replyingToActivity && (
            <div className="mb-3 text-xs text-brand-text-secondary">
              Replying to <span className="text-brand-neon">@{replyingToActivity.username}</span>
            </div>
          )}

          <div className="flex space-x-3 mt-4">
            <img
              src={userProfile.avatar}
              alt="Your avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isReplyMode
                    ? `Replying to ${replyingToActivity?.user ?? "this post"}...`
                    : `What's your hustle, ${userProfile.name}?`
                }
                className="w-full bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none resize-none"
                rows={3}
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {type && (
                  <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full animate-pop">
                    {type}
                  </span>
                )}
                {stats && (
                  <span className="text-xs font-semibold bg-brand-tertiary text-gray-300 px-3 py-1 rounded-full animate-pop">
                    {stats}
                  </span>
                )}
              </div>
              {imagePreview && (
                <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      if (imagePreview) {
                        URL.revokeObjectURL(imagePreview);
                      }
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/80"
                  >
                    <CloseIcon />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-tertiary/50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className={`p-2 rounded-full transition-colors ${
                  showTypeSelector || type
                    ? "text-brand-neon bg-brand-neon/10"
                    : "text-gray-400 hover:bg-brand-tertiary"
                }`}
                aria-label={
                  isReplyMode ? "Choose an optional category" : "Choose a category"
                }
              >
                <TagIcon />
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${
                  imagePreview
                    ? "text-brand-neon bg-brand-neon/10"
                    : "text-gray-400 hover:bg-brand-tertiary"
                }`}
              >
                <ImageIcon />
              </button>
              <input
                ref={imageInputRef}
                id="image-upload"
                type="file"
                className="hidden"
                onChange={handleImageChange}
                accept="image/*"
              />
              <div className="flex items-center space-x-2 text-gray-400">
                <ChartIcon />
                <input
                  type="text"
                  value={stats}
                  onChange={(e) => setStats(e.target.value)}
                  placeholder="Stats (e.g., 5km)"
                  className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-32"
                  disabled={isReplyMode}
                />
              </div>
            </div>
          </div>

          {showTypeSelector && (
            <div className="mt-4 border-t border-brand-tertiary/50 pt-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activityTypes.map((activityType) => (
                  <button
                    key={activityType}
                    type="button"
                    onClick={() => handleSelectType(activityType)}
                    className={`p-3 rounded-lg font-semibold text-center transition-all duration-200 bg-brand-tertiary hover:bg-opacity-80 text-white ${
                      type === activityType ? "ring-2 ring-brand-neon" : ""
                    }`}
                  >
                    {activityType}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogActivity;
