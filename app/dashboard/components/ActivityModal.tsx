import React from 'react';
import { Activity, UserProfile } from '@/app/types';
import ActivityCard from './ActivityCard';
import { CloseIcon } from './icons/CloseIcon';

interface ActivityModalProps {
    activity: Activity;
    currentUser: UserProfile | null;
    onClose: () => void;
    onReply: (activity: Activity) => void;
    onViewProfile: (username: string) => Promise<void> | void;
    onToggleLike: (activityId: string) => Promise<void> | void;
    onDeleteActivity: (activityId: string) => void;
    replyCount?: number;
    allUsers?: Record<string, UserProfile>;
}

const ActivityModal: React.FC<ActivityModalProps> = ({
    activity,
    currentUser,
    onClose,
    onReply,
    onViewProfile,
    onToggleLike,
    onDeleteActivity,
    replyCount = 0,
    allUsers,
}) => {
    const resolvedReplyCount = activity.replyCount ?? replyCount ?? 0;
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative bg-brand-primary rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-2 sticky top-0 bg-brand-primary z-10 flex justify-end">
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-brand-secondary transition-colors">
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-4 pt-0">
                    <ActivityCard 
                        activity={activity}
                        onReply={onReply}
                        onViewProfile={onViewProfile}
                        onToggleLike={onToggleLike}
                        onDelete={onDeleteActivity}
                        currentUser={currentUser}
                        replyCount={resolvedReplyCount}
                        allUsers={allUsers}
                    />
                </div>
            </div>
        </div>
    );
};

export default ActivityModal;