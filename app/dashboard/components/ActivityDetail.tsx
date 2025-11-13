import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, UserProfile } from "@/app/types";
import { BackIcon } from "./icons/BackIcon";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { ThumbsUpFilledIcon } from "./icons/ThumbsUpFilledIcon";
import { CommentIcon } from "./icons/CommentIcon";
import { TrashIcon } from "./icons/TrashIcon";
import ConfirmationModal from "./ConfirmationModal";
import ActivityCard from "./ActivityCard";
import ImageModal from "./icons/imagemodal";

interface ActivityDetailProps {
  activity: Activity;
  activities: Activity[];
  currentUser: UserProfile | null;
  onBack: () => void;
  onReply: (activity: Activity) => void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onDeleteActivity?: (activityId: string) => void;
  onViewProfile: (username: string) => Promise<void> | void;
  onOpenImage?: (url: string) => void;
  highlightedReplyId?: string | null;
  onViewActivityDetail: (activityId: string) => void;
  isThreadLoading?: boolean;
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({
  activity,
  activities,
  currentUser,
  onBack,
  onReply,
  onToggleLike,
  onDeleteActivity,
  onViewProfile,
  onOpenImage,
  highlightedReplyId,
  onViewActivityDetail,
  isThreadLoading = false,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(activity.likedByCurrentUser));
  const [kudosCount, setKudosCount] = useState(activity.kudos);
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const DESCRIPTION_CHAR_LIMIT = 320;
  const shouldTruncateDescription =
    activity.description.length > DESCRIPTION_CHAR_LIMIT;
  const displayedDescription =
    isDescriptionExpanded || !shouldTruncateDescription
      ? activity.description
      : `${activity.description.slice(0, DESCRIPTION_CHAR_LIMIT).trimEnd()}…`;

  useEffect(() => {
    setIsLiked(Boolean(activity.likedByCurrentUser));
    setKudosCount(activity.kudos);
  }, [activity.id, activity.kudos, activity.likedByCurrentUser]);

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [activity.id]);

  const replyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach((candidate) => {
      const parentId = candidate.replyingTo?.activityId;
      if (parentId) {
        counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
      }
    });
    return counts;
  }, [activities]);

  const replies = useMemo(
    () =>
      activities.filter(
        (candidate) => candidate.replyingTo?.activityId === activity.id
      ),
    [activities, activity.id]
  );

  useEffect(() => {
    if (!highlightedReplyId) {
      return;
    }
    const element = document.getElementById(`post-${highlightedReplyId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedReplyId, replies]);

  const isOwner = currentUser?.username === activity.username;
  const replyCount =
    activity.replyCount ?? replyCounts.get(activity.id) ?? replies.length ?? 0;

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isLikePending) {
      return;
    }

    setIsLikePending(true);
    setIsLiked((prev) => !prev);
    setKudosCount((prev) => prev + (isLiked ? -1 : 1));

    try {
      await onToggleLike(activity.id);
    } catch (error) {
      console.error("Failed to toggle like", error);
      setIsLiked(Boolean(activity.likedByCurrentUser));
      setKudosCount(activity.kudos);
    } finally {
      setIsLikePending(false);
    }
  };

  const handleProfileClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    void onViewProfile(activity.username);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (onDeleteActivity) {
      onDeleteActivity(activity.id);
    }
    setIsDeleteModalOpen(false);
    onBack();
  };

  const handleReplyClick = () => {
    onReply(activity);
    if (replySectionRef.current) {
      replySectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleOpenImage = () => {
    if (activity.image) {
      setIsImageModalOpen(true);
      if (onOpenImage) {
      onOpenImage(activity.image);
      }
    }
  };

  const handleCloseImage = () => {
    setIsImageModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 max-w-2xl pt-2 pb-6 space-y-5 animate-fade-in">
      <div className="relative flex items-center h-8">
        <button
          onClick={onBack}
          className="text-brand-text-secondary hover:text-white p-2 absolute -left-2 transition-colors"
        >
          <BackIcon />
        </button>
        <h2 className="text-xl font-bold text-center w-full font-display">
          Post
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 text-left group/user"
          >
            <img
              className="h-11 w-11 rounded-full object-cover transition-transform duration-300 group-hover/user:scale-105"
              src={activity.avatar}
              alt={`${activity.user}'s avatar`}
            />
            <div>
              <p className="text-sm font-bold text-brand-text-primary group-hover/user:text-brand-neon transition-colors">
                {activity.user}
              </p>
              <p className="text-xs text-brand-text-secondary">
                {activity.timestamp}
              </p>
            </div>
          </button>
          {isOwner && onDeleteActivity && (
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
          {activity.replyingTo && (
            <p className="text-xs text-brand-text-secondary mb-2">
              Replying to{" "}
              <span className="text-brand-neon">
                @{activity.replyingTo.username}
              </span>
            </p>
          )}
          <p className="text-brand-text-primary text-lg leading-relaxed whitespace-pre-wrap">
            {displayedDescription}
          </p>
          {shouldTruncateDescription && (
            <button
              type="button"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
              className="mt-2 text-xs font-semibold text-brand-neon hover:underline"
            >
              {isDescriptionExpanded ? "See less" : "See more"}
            </button>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {activity.type && (
              <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full">
                {activity.type}
              </span>
            )}
            {activity.stats && (
              <span className="text-xs font-semibold bg-brand-tertiary text-brand-text-secondary px-3 py-1 rounded-full">
                {activity.stats}
              </span>
            )}
          </div>
        </div>
      </div>

      {activity.image && (
        <button
          onClick={handleOpenImage}
          aria-label="View image larger"
          className="block w-full focus:outline-none focus:ring-2 focus:ring-brand-neon focus:ring-offset-2 focus:ring-offset-brand-primary rounded-2xl overflow-hidden"
        >
          <img
            className="w-full h-auto object-cover rounded-2xl"
            src={activity.image}
            alt="Activity"
          />
        </button>
      )}

      <div className="border-y border-brand-border divide-y divide-brand-border">
        <div className="py-3 px-1">
          <div className="flex space-x-6">
            <button
              onClick={handleLike}
              disabled={isLikePending}
              className={`flex items-center space-x-2 transition-transform duration-200 ease-out hover:scale-110 active:scale-95 ${
                isLiked
                  ? "text-brand-neon"
                  : "text-brand-text-secondary hover:text-brand-neon"
              } ${
                isLikePending
                  ? "opacity-70 cursor-not-allowed hover:scale-100"
                  : ""
              }`}
            >
              {isLiked ? <ThumbsUpFilledIcon /> : <ThumbsUpIcon />}
              <span className="text-sm font-semibold">{kudosCount}</span>
            </button>
            <div className="flex items-center space-x-2 text-brand-text-secondary">
              <CommentIcon />
              <span className="text-sm font-semibold">{replyCount}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={handleReplyClick}
            className="w-full bg-brand-secondary border border-brand-border rounded-lg p-3 text-left text-brand-text-secondary hover:bg-brand-tertiary transition-colors flex items-center space-x-3"
          >
            <img
              className="h-10 w-10 rounded-full object-cover"
              src={
                currentUser?.avatar || "https://i.pravatar.cc/150?u=currentuser"
              }
              alt="Your avatar"
            />
            <span>Post your reply...</span>
          </button>
        </div>
      </div>

      <div ref={replySectionRef} className="space-y-4">
        {(replies.length > 0 || isThreadLoading) && (
          <h3 className="font-bold text-lg text-brand-text-primary pt-2">
            Replies
          </h3>
        )}
        {isThreadLoading && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon"></div>
          </div>
        )}
        {replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => (
              <ActivityCard
                key={reply.id}
                activity={reply}
                onReply={onReply}
                onViewProfile={onViewProfile}
                onToggleLike={onToggleLike}
                onDelete={onDeleteActivity}
                    currentUser={currentUser}
                onClick={() => onViewActivityDetail(reply.id)}
                replyCount={
                  reply.replyCount ?? replyCounts.get(reply.id) ?? 0
                }
                isHighlighted={reply.id === highlightedReplyId}
                  />
            ))}
          </div>
        ) : !isThreadLoading ? (
          <p className="text-sm text-brand-text-secondary text-center py-6">
            No replies yet. Join the conversation!
          </p>
        ) : null}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Delete"
      />
      {activity.image && (
        <ImageModal
          isOpen={isImageModalOpen}
          onClose={handleCloseImage}
          imageUrl={activity.image}
        />
      )}
    </div>
  );
};

export default ActivityDetail;
