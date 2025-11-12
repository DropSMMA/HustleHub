import React, { useState } from "react";
import { Activity, UserProfile } from "@/app/types";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { ThumbsUpFilledIcon } from "./icons/ThumbsUpFilledIcon";
import { CommentIcon } from "./icons/CommentIcon";
import { TrashIcon } from "./icons/TrashIcon";
import ConfirmationModal from "./ConfirmationModal";
import ImageModal from "./icons/imagemodal";

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
    likedByCurrentUser = false,
    kudos,
    replyingTo,
  } = activity;

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const isOwner = currentUser?.username === username;

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isLikePending) {
      return;
    }
    setIsLikePending(true);
    try {
      await onToggleLike(id);
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

  const handleOpenImageModal = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  return (
    <>
      <div
        id={`post-${id}`}
        className={`bg-brand-secondary border border-brand-border rounded-2xl shadow-lg overflow-hidden transition-all duration-500 ${
          isHighlighted
            ? "ring-4 ring-brand-neon ring-offset-4 ring-offset-brand-primary shadow-neon"
            : ""
        } ${
          onClick
            ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-neon"
            : ""
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
                <p className="text-sm font-bold text-white group-hover/user:text-brand-neon transition-colors">
                  {user}
                </p>
                <p className="text-xs text-gray-400">{timestamp}</p>
              </div>
            </button>
            {isOwner && onDelete && (
              <button
                onClick={handleDeleteClick}
                className="ml-2 flex-shrink-0 text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                aria-label="Delete post"
              >
                <TrashIcon />
              </button>
            )}
          </div>

          {replyingTo && (
            <p className="text-xs text-gray-400">
              Replying to{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onViewProfile(replyingTo.username);
                }}
                className="text-brand-neon hover:underline"
              >
                @{replyingTo.username}
              </button>
            </p>
          )}

          <div>
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {type && (
                <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full">
                  {type}
                </span>
              )}
              {stats && stats.trim().length > 0 && (
                <span className="text-xs font-semibold bg-brand-tertiary text-gray-300 px-3 py-1 rounded-full">
                  {stats}
                </span>
              )}
            </div>
          </div>
        </div>

        {image && (
          <button
            type="button"
            onClick={handleOpenImageModal}
            className="w-full"
            aria-label="View image"
          >
            <img
              className="w-full h-64 object-cover"
              src={image}
              alt="Activity"
            />
          </button>
        )}

        <div className="p-4 flex justify-between items-center bg-brand-secondary/60 backdrop-blur-sm border-t border-brand-tertiary/50">
          <div className="flex space-x-6">
            <button
              onClick={handleLike}
              disabled={isLikePending}
              className={`flex items-center space-x-2 transition-transform duration-200 ease-out hover:scale-110 ${
                likedByCurrentUser
                  ? "text-brand-neon"
                  : "text-gray-300 hover:text-brand-neon"
              } ${
                isLikePending
                  ? "opacity-70 cursor-not-allowed hover:scale-100"
                  : ""
              }`}
            >
              {likedByCurrentUser ? <ThumbsUpFilledIcon /> : <ThumbsUpIcon />}
              <span className="text-sm font-semibold">{kudos}</span>
            </button>
            <button
              onClick={handleReplyClick}
              className="flex items-center space-x-2 text-gray-300 hover:text-brand-neon transition-transform duration-200 ease-out hover:scale-110"
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
      {image && (
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
