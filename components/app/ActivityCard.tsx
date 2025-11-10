import React, { useState } from "react";
import { Activity, UserProfile } from "@/app/types";
import { ThumbsUpIcon } from "./icons/ThumbsUpIcon";
import { ThumbsUpFilledIcon } from "./icons/ThumbsUpFilledIcon";
import { CommentIcon } from "./icons/CommentIcon";
import { TrashIcon } from "./icons/TrashIcon";
import ConfirmationModal from "./ConfirmationModal";
import CommentItem from "./CommentItem";

interface ActivityCardProps {
  activity: Activity;
  isCommentSectionOpen: boolean;
  onToggleComments: () => void;
  onAddComment: (
    activityId: string,
    commentText: string
  ) => Promise<void> | void;
  onAddReply: (
    activityId: string,
    parentCommentId: string,
    replyText: string
  ) => Promise<void> | void;
  onViewProfile: (username: string) => Promise<void> | void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onDelete?: (activityId: string) => void;
  currentUser: UserProfile | null;
  isHighlighted?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isCommentSectionOpen,
  onToggleComments,
  onAddComment,
  onAddReply,
  onViewProfile,
  onToggleLike,
  onDelete,
  currentUser,
  isHighlighted = false,
}) => {
  const {
    id,
    user,
    avatar,
    type,
    description,
    stats,
    image,
    comments,
    timestamp,
    username,
    likedByCurrentUser = false,
    likedBy = [],
    kudos,
  } = activity;

  const [newComment, setNewComment] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  const isOwner = currentUser?.username === username;

  const handleLike = async () => {
    if (isLikePending) return;
    setIsLikePending(true);
    try {
      await onToggleLike(id);
    } finally {
      setIsLikePending(false);
    }
  };

  const handlePostComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || isCommentSubmitting) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      await onAddComment(id, trimmed);
      setNewComment("");
    } catch (error) {
      console.error("Failed to submit comment", error);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleProfileClick = () => {
    void onViewProfile(username);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(id);
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <div
        id={`post-${id}`}
        className={`bg-brand-secondary rounded-2xl shadow-lg overflow-hidden transition-all duration-500 ${
          isHighlighted
            ? "ring-4 ring-brand-neon ring-offset-4 ring-offset-brand-primary"
            : ""
        }`}
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
                onClick={() => setIsDeleteModalOpen(true)}
                className="ml-2 flex-shrink-0 text-gray-500 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                aria-label="Delete post"
              >
                <TrashIcon />
              </button>
            )}
          </div>

          <div>
            <p className="text-gray-200 leading-relaxed">{description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full">
                {type}
              </span>
              {stats && (
                <span className="text-xs font-semibold bg-brand-tertiary text-gray-300 px-3 py-1 rounded-full">
                  {stats}
                </span>
              )}
            </div>
          </div>
        </div>

        {image && (
          <img
            className="w-full h-64 object-cover"
            src={image}
            alt="Activity"
          />
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
              onClick={onToggleComments}
              className="flex items-center space-x-2 text-gray-300 hover:text-brand-neon transition-transform duration-200 ease-out hover:scale-110"
            >
              <CommentIcon />
              <span className="text-sm font-semibold">{comments.length}</span>
            </button>
          </div>
        </div>
        {isCommentSectionOpen && (
          <div className="p-4 border-t border-brand-tertiary/50 bg-brand-primary/60 backdrop-blur-sm animate-fade-in space-y-4">
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    activityId={id}
                    comment={comment}
                    onAddReply={onAddReply}
                    currentUser={currentUser}
                  />
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No comments yet. Be the first!
                </p>
              )}
            </div>

            <div className="flex items-start space-x-3 pt-4 border-t border-brand-tertiary/20">
              <img
                className="h-8 w-8 rounded-full object-cover"
                src={
                  currentUser?.avatar ||
                  "https://i.pravatar.cc/150?u=currentuser"
                }
                alt="Your avatar"
              />
              <div className="w-full">
                <textarea
                  placeholder="Add a comment..."
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-2 text-sm focus:ring-brand-neon focus:border-brand-neon transition-colors"
                ></textarea>
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || isCommentSubmitting}
                  className="mt-2 float-right bg-brand-neon text-brand-primary text-xs font-bold py-1 px-3 rounded-md hover:bg-green-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
};

export default ActivityCard;
