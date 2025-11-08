import React, { useState } from 'react';
import { Comment, UserProfile } from '@/app/types';

interface CommentItemProps {
    activityId: number;
    comment: Comment;
    onAddReply: (activityId: number, parentCommentId: number, replyText: string) => void;
    currentUser: UserProfile | null;
}

const CommentItem: React.FC<CommentItemProps> = ({ activityId, comment, onAddReply, currentUser }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    
    const currentUserAvatar = currentUser?.avatar || 'https://i.pravatar.cc/150?u=currentuser';

    const handlePostReply = () => {
        if (replyText.trim()) {
            onAddReply(activityId, comment.id, replyText);
            setReplyText('');
            setIsReplying(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Main Comment */}
            <div className="flex items-start space-x-3">
                <img className="h-8 w-8 rounded-full object-cover" src={comment.avatar} alt={`${comment.user}'s avatar`} />
                <div className="flex-1">
                    <div className="bg-brand-tertiary rounded-lg px-3 py-2 text-sm">
                        <p className="font-bold text-white text-xs">{comment.user}</p>
                        <p className="text-gray-300">{comment.text}</p>
                    </div>
                    <div className="pl-2 mt-1">
                        <button 
                            onClick={() => setIsReplying(!isReplying)}
                            className="text-xs font-semibold text-gray-400 hover:text-brand-neon transition-colors"
                        >
                            Reply
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Reply Input Form */}
            {isReplying && (
                <div className="pl-11 mt-2 flex items-start space-x-3 animate-fade-in">
                    <img className="h-8 w-8 rounded-full object-cover" src={currentUserAvatar} alt="Your avatar" />
                    <div className="w-full">
                        <textarea
                            placeholder={`Replying to ${comment.user}...`}
                            rows={2}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-2 text-sm focus:ring-brand-neon focus:border-brand-neon transition-colors"
                            autoFocus
                        ></textarea>
                        <div className="flex justify-end items-center mt-2 space-x-2">
                            <button
                                onClick={() => setIsReplying(false)}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handlePostReply}
                                disabled={!replyText.trim()}
                                className="bg-brand-neon text-brand-primary text-xs font-bold py-1 px-3 rounded-md hover:bg-green-400 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                Post Reply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Render Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="pl-11 mt-3 space-y-3">
                    {comment.replies.map(reply => (
                        <div key={reply.id} className="flex items-start space-x-3">
                            <img className="h-8 w-8 rounded-full object-cover" src={reply.avatar} alt={`${reply.user}'s avatar`} />
                            <div className="bg-brand-tertiary rounded-lg px-3 py-2 text-sm w-full">
                                <p className="font-bold text-white text-xs">{reply.user}</p>
                                <p className="text-gray-300">{reply.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentItem;
