import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import {
  Activity,
  ActivityMention,
  ActivityType,
  UserProfile,
} from "@/app/types";
import apiClient from "@/libs/api";
import { mapPostToActivity, PostDTO } from "@/libs/posts";
import { optimizeImageFile } from "@/app/dashboard/lib/image-optimizer";
import { TagIcon } from "./icons/TagIcon";
import { ChartIcon } from "./icons/ChartIcon";
import { ImageIcon } from "./icons/ImageIcon";
import { CloseIcon } from "./icons/CloseIcon";
import { SparklesIcon } from "./icons/SparklesIcon";
import { UserIcon } from "./icons/UserIcon";

interface LogActivityProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (activity: Activity) => void;
  userProfile: UserProfile | null;
  allUsers?: Record<string, UserProfile>;
  replyingToActivity?: Activity | null;
}

const activityTypes = Object.values(ActivityType);

const LogActivity: React.FC<LogActivityProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  userProfile,
  allUsers,
  replyingToActivity = null,
}) => {
  const [type, setType] = useState<ActivityType | null>(null);
  const [description, setDescription] = useState("");
  const [stats, setStats] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(
    null
  );
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionOption[]>(
    []
  );
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReplyMode = Boolean(replyingToActivity);

  interface MentionOption {
    id: string;
    type: "startup" | "connection";
    label: string;
    handle: string;
    url?: string;
    username?: string;
    avatar?: string;
  }

  const normalizeHandle = useCallback((value: string) => {
    return value
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/-+/g, "-")
      .toLowerCase();
  }, []);

  const mentionOptions = useMemo<MentionOption[]>(() => {
    if (!userProfile) {
      return [];
    }

    const options: MentionOption[] = [];
    const seenHandles = new Set<string>();

    const lookupUser = (username: string) => {
      const normalized = username.trim().toLowerCase();
      if (!normalized) {
        return undefined;
      }
      return allUsers?.[normalized];
    };

    if (Array.isArray(userProfile.projects)) {
      userProfile.projects.forEach((project) => {
        if (!project?.name) {
          return;
        }
        const handle = normalizeHandle(project.name);
        if (!handle || seenHandles.has(handle)) {
          return;
        }
        seenHandles.add(handle);
        options.push({
          id: `startup-${handle}`,
          type: "startup",
          label: project.name.trim(),
          handle,
          url: project.url,
        });
      });
    }

    if (Array.isArray(userProfile.connections)) {
      userProfile.connections.forEach((connectionUsername) => {
        const trimmed = connectionUsername.trim();
        if (!trimmed) {
          return;
        }
        const handle = normalizeHandle(trimmed);
        if (!handle || seenHandles.has(handle)) {
          return;
        }
        const profileMatch = lookupUser(trimmed);
        seenHandles.add(handle);
        options.push({
          id: `connection-${handle}`,
          type: "connection",
          label: profileMatch?.name ?? trimmed,
          handle,
          username: profileMatch?.username ?? trimmed,
          avatar: profileMatch?.avatar,
        });
      });
    }

    return options;
  }, [allUsers, normalizeHandle, userProfile]);

  const mentionOptionMap = useMemo(() => {
    const map = new Map<string, MentionOption>();
    mentionOptions.forEach((option) => {
      map.set(option.handle, option);
    });
    return map;
  }, [mentionOptions]);

  const deriveMentions = useCallback(
    (text: string): ActivityMention[] => {
      if (!text) {
        return [];
      }

      const mentionMatches = Array.from(text.matchAll(/@([a-zA-Z0-9._-]+)/g));

      if (mentionMatches.length === 0) {
        return [];
      }

      const seen = new Set<string>();
      const derived: ActivityMention[] = [];

      mentionMatches.forEach((match) => {
        const rawHandle = match[1] ?? "";
        if (!rawHandle) {
          return;
        }
        const normalized = normalizeHandle(rawHandle);
        const option = mentionOptionMap.get(normalized);
        if (!option || seen.has(option.id)) {
          return;
        }
        derived.push({
          id: option.id,
          type: option.type,
          handle: option.handle,
          label: option.label,
          username: option.username,
          url: option.url,
        });
        seen.add(option.id);
      });

      return derived;
    },
    [mentionOptionMap, normalizeHandle]
  );

  useEffect(() => {
    if (!showMentions) {
      setMentionSuggestions([]);
      return;
    }

    const lowerQuery = mentionQuery.toLowerCase();
    const filtered = mentionOptions
      .filter((option) => {
        if (!lowerQuery) {
          return true;
        }
        return (
          option.handle.includes(lowerQuery) ||
          option.label.toLowerCase().includes(lowerQuery) ||
          (option.username?.toLowerCase().includes(lowerQuery) ?? false)
        );
      })
      .slice(0, 5);

    setMentionSuggestions(filtered);
  }, [mentionOptions, mentionQuery, showMentions]);

  const handleSelectMention = useCallback(
    (option: MentionOption) => {
      if (mentionStartIndex === null) {
        return;
      }

      const field = textareaRef.current;
      const selectionEnd =
        field?.selectionEnd ?? field?.selectionStart ?? description.length;

      const before = description.slice(0, mentionStartIndex);
      const after = description.slice(selectionEnd);

      const mentionToken = option.username ?? option.handle;
      const mentionText = `@${mentionToken}`;
      const nextChar = description.charAt(selectionEnd);
      const needsTrailingSpace =
        nextChar.length === 0 || /\s|[.,!?;:]/.test(nextChar) ? "" : " ";

      const updatedDescription = `${before}${mentionText}${needsTrailingSpace}${after}`;
      setDescription(updatedDescription);
      setMentionQuery("");
      setMentionStartIndex(null);
      setShowMentions(false);
      setMentionSuggestions([]);

      requestAnimationFrame(() => {
        const target = textareaRef.current;
        if (!target) {
          return;
        }
        const caretPosition =
          before.length + mentionText.length + needsTrailingSpace.length;
        target.focus();
        target.setSelectionRange(caretPosition, caretPosition);
      });
    },
    [description, mentionStartIndex]
  );

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = event.target;
    setDescription(value);

    const cursorPosition =
      typeof selectionStart === "number" ? selectionStart : value.length;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/(^|\s)@([a-zA-Z0-9._-]*)$/);

    if (mentionMatch) {
      const queryPart = mentionMatch[2] ?? "";
      const matchStart = cursorPosition - queryPart.length - 1;
      setMentionStartIndex(matchStart);
      setMentionQuery(queryPart);
      setShowMentions(true);
    } else {
      if (mentionStartIndex !== null) {
        setMentionStartIndex(null);
      }
      if (mentionQuery) {
        setMentionQuery("");
      }
      if (showMentions) {
        setShowMentions(false);
        setMentionSuggestions([]);
      }
    }
  };

  const resetState = useCallback(() => {
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
    setMentionQuery("");
    setMentionStartIndex(null);
    setShowMentions(false);
    setMentionSuggestions([]);
  }, [imagePreview]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (!isOpen) {
      timeoutId = window.setTimeout(() => {
        resetState();
      }, 300);
    } else if (textareaRef.current) {
      textareaRef.current.focus();
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isOpen, resetState]);

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

    const mentionDetails = deriveMentions(trimmedDescription);

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const optimizedImage = await optimizeImageFile(imageFile, {
          preset: "post",
        });

        const { uploadUrl, fileUrl } = (await apiClient.post("/uploads", {
          fileName: optimizedImage.name,
          fileType: optimizedImage.type,
        })) as { uploadUrl: string; fileUrl: string };

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": optimizedImage.type,
          },
          body: optimizedImage,
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

      if (mentionDetails.length > 0) {
        basePayload.mentions = mentionDetails;
      }

      const { post } = (await apiClient.post("/posts", basePayload)) as {
        post: PostDTO;
      };

      const activity = mapPostToActivity(post);
      const activityWithMentions: Activity = {
        ...activity,
        mentions: mentionDetails.length > 0 ? mentionDetails : undefined,
      };
      const enrichedActivity = replyingToActivity
        ? {
            ...activityWithMentions,
            replyingTo: activity.replyingTo ?? {
              activityId: replyingToActivity.id,
              username: replyingToActivity.username,
              name: replyingToActivity.user,
            },
          }
        : activityWithMentions;

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
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-brand-secondary rounded-t-2xl w-full max-w-lg transform transition-transform duration-300 ease-out shadow-lg shadow-brand-neon/5 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } max-h-[calc(100dvh-48px)] overflow-y-auto pb-[env(safe-area-inset-bottom)]`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100dvh - 48px)" }}
      >
        <div className="p-4 pb-6">
          <div className="flex items-center justify-between pb-3">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-brand-text-secondary hover:bg-brand-tertiary hover:text-brand-text-primary"
            >
              <CloseIcon />
            </button>
            <h2 className="text-lg font-bold text-brand-text-primary">
              {isReplyMode ? "Your Reply" : "New Hustle"}
            </h2>
            <button
              onClick={handleSubmit}
              disabled={
                !description.trim() || (!type && !isReplyMode) || isSubmitting
              }
              className="bg-brand-neon text-brand-primary font-bold py-2 px-5 rounded-lg transition-all duration-200 disabled:bg-brand-tertiary disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-green-400 shadow-md shadow-brand-neon/20"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
              ) : (
                "Post"
              )}
            </button>
          </div>

          <div className="flex space-x-3 mt-4">
            <img
              src={userProfile.avatar}
              alt="Your avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex-1">
              {isReplyMode && replyingToActivity && (
                <p className="text-sm text-brand-text-secondary mb-2 animate-fade-in">
                  Replying to{" "}
                  <span className="text-brand-neon">
                    @{replyingToActivity.username}
                  </span>
                </p>
              )}
              <textarea
                ref={textareaRef}
                value={description}
                onChange={handleDescriptionChange}
                placeholder={
                  isReplyMode
                    ? `Replying to ${
                        replyingToActivity?.user ?? "this post"
                      }...`
                    : `What's your hustle, ${userProfile.name}?`
                }
                className="w-full bg-transparent text-lg text-brand-text-primary placeholder-brand-text-secondary/70 focus:outline-none resize-none"
                rows={3}
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {type && (
                  <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full animate-pop">
                    {type}
                  </span>
                )}
                {stats && (
                  <span className="text-xs font-semibold bg-brand-tertiary text-brand-text-secondary px-3 py-1 rounded-full animate-pop">
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

          {showMentions && mentionSuggestions.length > 0 && (
            <div className="border-t border-brand-border mt-2 animate-fade-in max-h-40 overflow-y-auto">
              {mentionSuggestions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectMention(option)}
                  className="w-full flex items-center space-x-3 p-3 text-left hover:bg-brand-tertiary transition-colors"
                >
                  {option.type === "connection" ? (
                    option.avatar ? (
                      <img
                        src={option.avatar}
                        alt={option.label}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-brand-tertiary flex items-center justify-center text-brand-text-secondary">
                        <UserIcon />
                      </div>
                    )
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-brand-tertiary flex items-center justify-center text-brand-neon">
                      <SparklesIcon />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-brand-text-primary">
                      {option.label}
                    </p>
                    <p className="text-xs text-brand-text-secondary">
                      @{option.username ?? option.handle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTypeSelector(!showTypeSelector)}
                className={`p-2 rounded-full transition-colors ${
                  showTypeSelector || type
                    ? "text-brand-neon bg-brand-neon/10"
                    : "text-brand-text-secondary hover:bg-brand-tertiary"
                }`}
                aria-label={
                  isReplyMode
                    ? "Choose an optional category"
                    : "Choose a category"
                }
              >
                <TagIcon />
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${
                  imagePreview
                    ? "text-brand-neon bg-brand-neon/10"
                    : "text-brand-text-secondary hover:bg-brand-tertiary"
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
                  className="bg-transparent text-sm text-brand-text-primary placeholder-brand-text-secondary/70 focus:outline-none w-32 border-b border-transparent focus:border-brand-neon transition-colors"
                />
              </div>
            </div>
          </div>

          {showTypeSelector && (
            <div className="mt-4 border-t border-brand-border pt-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activityTypes.map((activityType) => {
                  const isSelected = type === activityType;
                  return (
                    <button
                      key={activityType}
                      type="button"
                      onClick={() => handleSelectType(activityType)}
                      className={`p-3 rounded-lg font-semibold text-center transition-all duration-200 bg-brand-tertiary hover:bg-brand-border text-brand-text-primary ${
                        isSelected ? "ring-2 ring-brand-neon" : ""
                      }`}
                    >
                      {activityType}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogActivity;
