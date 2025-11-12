import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, UserProfile } from "@/app/types";
import { BackIcon } from "./icons/BackIcon";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { ThumbsUpFilledIcon } from "./icons/ThumbsUpFilledIcon";
import { CommentIcon } from "./icons/CommentIcon";
import { TrashIcon } from "./icons/TrashIcon";
import ConfirmationModal from "./ConfirmationModal";
import CommentItem from "./CommentItem";

interface ActivityDetailProps {
  activity: Activity;
  currentUser: UserProfile | null;
  onBack: () => void;
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
  onDeleteActivity?: (activityId: string) => void;
  onViewProfile: (username: string) => Promise<void> | void;
  onOpenImage?: (url: string) => void;
  highlightedCommentId?: string | null;
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({
  activity,
  currentUser,
  onBack,
  onAddComment,
  onAddReply,
  onToggleLike,
  onDeleteActivity,
  onViewProfile,
  onOpenImage,
  highlightedCommentId,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(activity.likedByCurrentUser));
  const [kudosCount, setKudosCount] = useState(activity.kudos);

  useEffect(() => {
    setIsLiked(Boolean(activity.likedByCurrentUser));
    setKudosCount(activity.kudos);
  }, [activity.id, activity.kudos, activity.likedByCurrentUser]);

  useEffect(() => {
    if (!highlightedCommentId) {
      return;
    }
    const element = document.getElementById(`comment-${highlightedCommentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("animate-pulse");
      const timeout = window.setTimeout(() => {
        element.classList.remove("animate-pulse");
      }, 2000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [highlightedCommentId, activity.comments]);

  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const comments = useMemo(() => activity.comments ?? [], [activity.comments]);

  const isOwner = currentUser?.username === activity.username;
  const commentCount = comments.length;

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

  const handlePostComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || isCommentSubmitting) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      await onAddComment(activity.id, trimmed);
      setNewComment("");
    } catch (error) {
      console.error("Failed to submit comment", error);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleReplyClick = () => {
    if (commentTextareaRef.current) {
      commentTextareaRef.current.focus();
      commentTextareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleOpenImage = () => {
    if (activity.image && onOpenImage) {
      onOpenImage(activity.image);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-2xl py-6 space-y-5 animate-fade-in">
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
          <p className="text-brand-text-primary text-lg leading-relaxed whitespace-pre-wrap">
            {activity.description}
          </p>
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
              <span className="text-sm font-semibold">{commentCount}</span>
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

      <div className="bg-brand-secondary/60 border border-brand-tertiary/30 rounded-2xl p-4 space-y-4">
        <div className="flex items-start space-x-3">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src={
              currentUser?.avatar || "https://i.pravatar.cc/150?u=currentuser"
            }
            alt="Your avatar"
          />
          <div className="flex-1">
            <textarea
              placeholder="Add a comment..."
              rows={3}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              ref={commentTextareaRef}
              className="w-full bg-brand-tertiary border border-transparent rounded-xl p-3 text-sm focus:ring-brand-neon focus:border-brand-neon transition-colors"
            />
            <div className="flex justify-end items-center mt-3">
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || isCommentSubmitting}
                className="bg-brand-neon text-brand-primary text-xs font-bold py-2 px-4 rounded-md hover:bg-green-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isCommentSubmitting ? "Posting…" : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {comments.length > 0 && (
          <h3 className="font-bold text-lg text-brand-text-primary pt-2">
            Replies
          </h3>
        )}
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isHighlighted = comment.id === highlightedCommentId;
              return (
                <div
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className={`rounded-xl p-1 transition-colors ${
                    isHighlighted ? "ring-2 ring-brand-neon" : ""
                  }`}
                >
                  <CommentItem
                    activityId={activity.id}
                    comment={comment}
                    onAddReply={onAddReply}
                    currentUser={currentUser}
                  />
                </div>
              );
            })}
          </div>
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
    </div>
  );
};

export default ActivityDetail;
