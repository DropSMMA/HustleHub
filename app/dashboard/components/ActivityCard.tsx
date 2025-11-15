import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Activity, ActivityMention, UserProfile } from "@/app/types";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { ThumbsUpFilledIcon } from "./icons/ThumbsUpFilledIcon";
import { CommentIcon } from "./icons/CommentIcon";
import { TrashIcon } from "./icons/TrashIcon";
import ConfirmationModal from "./ConfirmationModal";
import ImageModal from "./icons/imagemodal";
import { FlameIcon } from "./icons/FlameIcon";

interface ActivityCardProps {
  activity: Activity;
  onReply: (activity: Activity) => void;
  onViewProfile: (username: string) => Promise<void> | void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onDelete?: (activityId: string) => void;
  currentUser: UserProfile | null;
  isHighlighted?: boolean;
  onClick?: () => void;
  replyCount?: number;
  allUsers?: Record<string, UserProfile>;
  onOpenImage?: (imageUrl: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onReply,
  onViewProfile,
  onToggleLike,
  onDelete,
  currentUser,
  isHighlighted = false,
  onClick,
  replyCount = 0,
  allUsers,
  onOpenImage,
}) => {
  const {
    id,
    user,
    avatar,
    type,
    description,
    stats,
    image,
    timestamp,
    username,
    timestampExact,
    likedByCurrentUser = false,
    kudos,
    replyingTo,
    mentions = [],
    streak,
  } = activity;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(likedByCurrentUser));
  const [kudosCount, setKudosCount] = useState(kudos);

  useEffect(() => {
    setIsLiked(Boolean(likedByCurrentUser));
    setKudosCount(kudos);
  }, [id, kudos, likedByCurrentUser]);

  const DESCRIPTION_CHAR_LIMIT = 260;
  const shouldTruncateDescription = description.length > DESCRIPTION_CHAR_LIMIT;
  const displayedDescription =
    isDescriptionExpanded || !shouldTruncateDescription
      ? description
      : `${description.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd()}…`;

  const isOwner = currentUser?.username === username;

  const { exactTimeLabel, exactDateTimeLabel } = useMemo(() => {
    if (!timestampExact) {
      return { exactTimeLabel: null, exactDateTimeLabel: null };
    }
    const exactDate = new Date(timestampExact);
    if (Number.isNaN(exactDate.getTime())) {
      return { exactTimeLabel: null, exactDateTimeLabel: null };
    }
    return {
      exactTimeLabel: exactDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      exactDateTimeLabel: exactDate.toLocaleString(),
    };
  }, [timestampExact]);

  const mentionMetaMap = useMemo(() => {
    const map = new Map<string, ActivityMention>();
    mentions.forEach((mention) => {
      if (!mention) {
        return;
      }
      const keys = new Set<string>();
      if (mention.handle) {
        keys.add(mention.handle.toLowerCase());
        keys.add(mention.handle.replace(/\s+/g, "").toLowerCase());
      }
      if (mention.username) {
        keys.add(mention.username.toLowerCase());
      }
      if (mention.label) {
        keys.add(mention.label.toLowerCase());
        keys.add(mention.label.replace(/\s+/g, "").toLowerCase());
        keys.add(mention.label.replace(/\s+/g, "-").toLowerCase());
      }
      keys.forEach((key) => {
        if (key) {
          map.set(key, mention);
        }
      });
    });
    return map;
  }, [mentions]);

  const resolveUser = useCallback(
    (handle: string): UserProfile | undefined => {
      if (!allUsers) {
        return undefined;
      }
      const normalized = handle.toLowerCase();
      return (
        allUsers[normalized] ??
        Object.values(allUsers).find(
          (candidate) => candidate.username.toLowerCase() === normalized
        )
      );
    },
    [allUsers]
  );

  const posterProfile = useMemo(() => {
    if (!allUsers) {
      return undefined;
    }
    return resolveUser(username);
  }, [allUsers, resolveUser, username]);

  const findMention = useCallback(
    (token: string): ActivityMention | undefined => {
      const normalized = token.toLowerCase();
      if (mentionMetaMap.has(normalized)) {
        return mentionMetaMap.get(normalized);
      }
      const hyphenated = token.replace(/\s+/g, "-").toLowerCase();
      if (mentionMetaMap.has(hyphenated)) {
        return mentionMetaMap.get(hyphenated);
      }
      const compact = token.replace(/\s+/g, "").toLowerCase();
      return mentionMetaMap.get(compact);
    },
    [mentionMetaMap]
  );

  const renderDescription = useCallback(
    (text: string): React.ReactNode => {
      if (!text) {
        return null;
      }

      const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
      const parts = text.split(mentionRegex);

      if (parts.length === 1) {
        return (
          <p className="text-brand-text-primary leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        );
      }

      return (
        <p className="text-brand-text-primary leading-relaxed whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (index % 2 === 0) {
              return part;
            }

            const mentionToken = part;
            const mentionMetadata = findMention(mentionToken);

            if (mentionMetadata) {
              if (mentionMetadata.type === "startup") {
                const displayLabel =
                  mentionMetadata.label ?? `@${mentionToken}`;
                if (mentionMetadata.url) {
                  return (
                    <a
                      key={`mention-${index}-${mentionToken}`}
                      href={mentionMetadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="font-bold text-brand-neon hover:underline focus:outline-none"
                    >
                      {displayLabel}
                    </a>
                  );
                }
                return (
                  <strong
                    key={`mention-${index}-${mentionToken}`}
                    className="text-brand-neon"
                  >
                    {displayLabel}
                  </strong>
                );
              }

              const targetUsername =
                mentionMetadata.username ?? mentionMetadata.handle;
              const label =
                mentionMetadata.label ??
                mentionMetadata.username ??
                `@${mentionToken}`;
              if (targetUsername) {
                return (
                  <button
                    key={`mention-${index}-${mentionToken}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onViewProfile(targetUsername);
                    }}
                    className="font-bold text-brand-neon hover:underline focus:outline-none"
                  >
                    {label}
                  </button>
                );
              }
            }

            const userCandidate = resolveUser(mentionToken);
            if (userCandidate) {
              return (
                <button
                  key={`mention-${index}-${mentionToken}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onViewProfile(userCandidate.username);
                  }}
                  className="font-bold text-brand-neon hover:underline focus:outline-none"
                >
                  {userCandidate.name || `@${mentionToken}`}
                </button>
              );
            }

            const projectCandidate = posterProfile?.projects.find((project) => {
              const normalizedToken = mentionToken.toLowerCase();
              const compactName = project.name.replace(/\s+/g, "").toLowerCase();
              const hyphenName = project.name.replace(/\s+/g, "-").toLowerCase();
              return (
                compactName === normalizedToken || hyphenName === normalizedToken
              );
            });

            if (projectCandidate) {
              if (projectCandidate.url) {
                return (
                  <a
                    key={`mention-${index}-${mentionToken}`}
                    href={projectCandidate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="font-bold text-brand-neon hover:underline focus:outline-none"
                  >
                    {projectCandidate.name}
                  </a>
                );
              }
              return (
                <strong
                  key={`mention-${index}-${mentionToken}`}
                  className="text-brand-neon"
                >
                  {projectCandidate.name}
                </strong>
              );
            }

            return `@${mentionToken}`;
          })}
        </p>
      );
    },
    [findMention, onViewProfile, posterProfile, resolveUser]
  );

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isLikePending) {
      return;
    }

    const nextLiked = !isLiked;
    const delta = nextLiked ? 1 : -1;
    setIsLiked(nextLiked);
    setKudosCount((prev) => Math.max(0, prev + delta));
    setIsLikePending(true);

    try {
      await onToggleLike(id);
    } catch (error) {
      console.error("Failed to toggle like", error);
      setIsLiked(Boolean(likedByCurrentUser));
      setKudosCount(kudos);
    } finally {
      setIsLikePending(false);
    }
  };

  const handleProfileClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.stopPropagation();
    void onViewProfile(username);
  };

  const handleReplyClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onReply(activity);
  };

  const handleDeleteClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
    setIsDeleteModalOpen(false);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, textarea, input, a")) {
      return;
    }

    onClick();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const handleOpenImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!image) {
      return;
    }
    if (onOpenImage) {
      onOpenImage(image);
    } else {
      setIsImageModalOpen(true);
    }
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  return (
    <>
      <div
        id={`post-${id}`}
        className={`bg-brand-secondary rounded-2xl shadow-lg overflow-hidden cursor-pointer border border-brand-border hover:border-brand-neon/50 transition-all duration-300 group ${
          isHighlighted ? "ring-2 ring-brand-neon shadow-brand-neon/20" : ""
        }`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={
          onClick ? `Open details for ${type ?? "activity"}` : undefined
        }
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-3 text-left group/user"
            >
              <img
                className="h-11 w-11 rounded-full object-cover transition-transform duration-300 group-hover/user:scale-105"
                src={avatar}
                alt={`${user}'s avatar`}
              />
              <div>
                <p className="text-sm font-bold text-brand-text-primary group-hover/user:text-brand-neon transition-colors">
                  {user}
                </p>
                <p
                  className="text-xs text-brand-text-secondary flex items-center gap-2"
                  {...(exactDateTimeLabel
                    ? { title: exactDateTimeLabel }
                    : undefined)}
                >
                  <span>{timestamp}</span>
                  {exactTimeLabel && (
                    <>
                      <span className="text-brand-border" aria-hidden="true">
                        |
                      </span>
                      <span className="text-brand-text-secondary">
                        {exactTimeLabel}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </button>
            {isOwner && onDelete && (
              <button
                onClick={handleDeleteClick}
                className="ml-2 flex-shrink-0 text-brand-text-secondary hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                aria-label="Delete post"
              >
                <TrashIcon />
              </button>
            )}
          </div>

          <div>
            {replyingTo && (
              <p className="text-sm text-brand-text-secondary mb-2">
                Replying to{" "}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onViewProfile(replyingTo.username);
                  }}
                  className="text-brand-neon/80 hover:underline"
                >
                  @{replyingTo.username}
                </button>
              </p>
            )}
            {renderDescription(displayedDescription)}
            {shouldTruncateDescription && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsDescriptionExpanded((prev) => !prev);
                }}
                className="mt-2 text-xs font-semibold text-brand-neon hover:underline"
              >
                {isDescriptionExpanded ? "See less" : "See more"}
              </button>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {type && (
                <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full">
                  {type}
                </span>
              )}
              {stats && stats.trim().length > 0 && (
                <span className="text-xs font-semibold bg-brand-tertiary text-brand-text-secondary px-3 py-1 rounded-full">
                  {stats}
                </span>
              )}
              {streak && streak.currentStreak > 0 && (
                <span className="text-xs font-semibold bg-brand-tertiary text-brand-neon px-3 py-1 rounded-full flex items-center gap-2">
                  <FlameIcon className="w-4 h-4 text-brand-neon" />
                  {streak.currentStreak} day
                  {streak.currentStreak === 1 ? "" : "s"} streak
                </span>
              )}
            </div>
          </div>
        </div>

        {image && (
          <button
            type="button"
            onClick={handleOpenImage}
            className="w-full h-64 block focus:outline-none"
            aria-label="View image larger"
          >
            <img className="w-full h-full object-cover" src={image} alt="Activity" />
          </button>
        )}

        <div className="p-4 flex justify-between items-center border-t border-brand-border">
          <div className="flex space-x-6">
            <button
              onClick={handleLike}
              disabled={isLikePending}
              className={`flex items-center space-x-2 transition-transform duration-200 ease-out hover:scale-110 active:scale-95 ${
                isLiked
                  ? "text-brand-neon"
                  : "text-brand-text-secondary hover:text-brand-neon"
              } ${isLikePending ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isLiked ? <ThumbsUpFilledIcon /> : <ThumbsUpIcon />}
              <span className="text-sm font-semibold">{kudosCount}</span>
            </button>
            <button
              onClick={handleReplyClick}
              className="flex items-center space-x-2 text-brand-text-secondary hover:text-brand-neon transition-transform duration-200 ease-out hover:scale-110 active:scale-95"
            >
              <CommentIcon />
              <span className="text-sm font-semibold">{replyCount}</span>
            </button>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Delete"
      />
      {image && !onOpenImage && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={handleCloseImageModal}
          imageUrl={image}
        />
      )}
    </>
  );
};

export default ActivityCard;
