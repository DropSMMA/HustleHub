import React, { useState, useEffect } from 'react';
import { Activity, UserProfile } from '@/app/types';
import ActivityCard from './ActivityCard';
import { ArrowDownIcon } from './icons/ArrowDownIcon';

interface FeedProps {
    activities: Activity[];
    onAddComment: (activityId: string, commentText: string) => void;
    onAddReply: (activityId: string, parentCommentId: string, replyText: string) => void;
    onViewProfile: (username: string) => void;
    onDeleteActivity: (activityId: string) => void;
    currentUser: UserProfile | null;
    highlightedPostId?: string | null;
    onClearHighlight?: () => void;
    onRefresh?: () => Promise<void>;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
}

const Feed: React.FC<FeedProps> = ({ 
    activities, 
    onAddComment, 
    onAddReply, 
    onViewProfile, 
    onDeleteActivity, 
    currentUser, 
    highlightedPostId, 
    onClearHighlight,
    onRefresh,
    onLoadMore,
    isLoadingMore = false
}) => {
    const [openCommentSectionId, setOpenCommentSectionId] = useState<string | null>(null);
    const [pullStart, setPullStart] = useState<number>(0);
    const [pullDistance, setPullDistance] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const REFRESH_THRESHOLD = 80;

    useEffect(() => {
        if (highlightedPostId && onClearHighlight) {
            const element = document.getElementById(`post-${highlightedPostId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const timer = setTimeout(() => {
                    onClearHighlight();
                }, 2500); 
                return () => clearTimeout(timer);
            } else {
                onClearHighlight();
            }
        }
    }, [highlightedPostId, onClearHighlight]);

    useEffect(() => {
        if (!onLoadMore) return;

        const handleScroll = () => {
            const isAtBottom = window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 200;
            if (isAtBottom && !isLoadingMore) {
                onLoadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoadingMore, onLoadMore]);

    const toggleComments = (activityId: string) => {
        setOpenCommentSectionId(prevId => (prevId === activityId ? null : activityId));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!onRefresh || isRefreshing) return;
        if (window.scrollY === 0) {
            setPullStart(e.touches[0].clientY);
        } else {
            setPullStart(0);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!onRefresh || pullStart === 0 || isRefreshing) return;
        const touchY = e.touches[0].clientY;
        const distance = touchY - pullStart;
        if (distance > 0) {
            setPullDistance(distance);
        }
    };

    const handleTouchEnd = async () => {
        if (!onRefresh || pullStart === 0 || isRefreshing) return;
        if (pullDistance > REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            await onRefresh();
            setIsRefreshing(false);
        }
        setPullStart(0);
        setPullDistance(0);
    };

    return (
        <div
            className="container mx-auto px-4 space-y-4 max-w-lg"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
             {onRefresh && (
                <div
                    className="fixed top-16 left-0 right-0 flex justify-center items-center transition-all duration-200 pointer-events-none z-0"
                    style={{
                        transform: `translateY(${isRefreshing ? '20px' : Math.min(pullDistance, REFRESH_THRESHOLD) - REFRESH_THRESHOLD}px)`,
                        opacity: isRefreshing || pullDistance > 0 ? 1 : 0,
                    }}
                >
                    <div className="p-3 bg-brand-secondary rounded-full shadow-lg text-white">
                        {isRefreshing ? (
                            <div className="animate-spin h-6 w-6">
                                <ArrowDownIcon />
                            </div>
                        ) : (
                            <div className="transition-transform" style={{ transform: `rotate(${pullDistance >= REFRESH_THRESHOLD ? '180deg' : '0deg'})` }}>
                                <ArrowDownIcon />
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activities.length > 0 ? (
                activities.map(activity => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        isCommentSectionOpen={openCommentSectionId === activity.id}
                        onToggleComments={() => toggleComments(activity.id)}
                        onAddComment={onAddComment}
                        onAddReply={onAddReply}
                        onViewProfile={onViewProfile}
                        onDelete={onDeleteActivity}
                        currentUser={currentUser}
                        isHighlighted={activity.id === highlightedPostId}
                    />
                ))
            ) : (
                <div className="text-center py-10 text-gray-400">
                    <p className="font-semibold text-lg">Your feed is empty.</p>
                    <p>Log your first hustle to get started!</p>
                </div>
            )}

            {isLoadingMore && (
                <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon"></div>
                </div>
            )}
        </div>
    );
};

export default Feed;