import React, { useState, useEffect, useMemo, useRef } from "react";
import { Activity, UserProfile } from "@/app/types";
import ActivityCard from "./ActivityCard";
import { ArrowDownIcon } from "./icons/ArrowDownIcon";

interface FeedProps {
  activities: Activity[];
  onReply: (activity: Activity) => void;
  onToggleLike: (activityId: string) => Promise<void> | void;
  onViewProfile: (username: string) => Promise<void> | void;
  onDeleteActivity: (activityId: string) => void;
  currentUser: UserProfile | null;
  highlightedPostId?: string | null;
  onClearHighlight?: () => void;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onViewActivityDetail?: (
    activityId: string,
    options?: { commentId?: string }
  ) => void;
}

const Feed: React.FC<FeedProps> = ({
  activities,
  onReply,
  onToggleLike,
  onViewProfile,
  onDeleteActivity,
  currentUser,
  highlightedPostId,
  onClearHighlight,
  onRefresh,
  onLoadMore,
  isLoadingMore = false,
  onViewActivityDetail,
}) => {
  const [pullStart, setPullStart] = useState<number>(0);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const REFRESH_THRESHOLD = 80;

  useEffect(() => {
    if (highlightedPostId && onClearHighlight) {
      const element = document.getElementById(`post-${highlightedPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
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
    if (!onLoadMore || !loadMoreRef.current) {
      return;
    }

    const rootElement = containerRef.current ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingMore) {
            onLoadMore();
          }
        });
      },
      {
        root: rootElement,
        rootMargin: "200px 0px 0px 0px",
        threshold: 0.1,
      }
    );

    const target = loadMoreRef.current;
    observer.observe(target);

    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [isLoadingMore, onLoadMore]);

  const derivedReplyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    activities.forEach((activity) => {
      const parentId = activity.replyingTo?.activityId;
      if (parentId) {
        counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
      }
    });
    return counts;
  }, [activities]);

  const visibleActivities = useMemo(
    () =>
      activities.filter(
        (activity) =>
          !activity.replyingTo || (activity.replyingTo && activity.type)
      ),
    [activities]
  );

  const handleNavigateToActivity = (activity: Activity) => {
    if (!onViewActivityDetail) {
      return;
    }

    if (activity.replyingTo?.activityId) {
      onViewActivityDetail(activity.replyingTo.activityId, {
        commentId: activity.id,
      });
    } else {
      onViewActivityDetail(activity.id);
    }
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
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {onRefresh && (
        <div
          className="fixed top-16 left-0 right-0 flex justify-center items-center transition-all duration-200 pointer-events-none z-0"
          style={{
            transform: `translateY(${
              isRefreshing
                ? "20px"
                : Math.min(pullDistance, REFRESH_THRESHOLD) - REFRESH_THRESHOLD
            }px)`,
            opacity: isRefreshing || pullDistance > 0 ? 1 : 0,
          }}
        >
          <div className="p-3 bg-brand-secondary rounded-full shadow-lg text-white">
            {isRefreshing ? (
              <div className="animate-spin h-6 w-6">
                <ArrowDownIcon />
              </div>
            ) : (
              <div
                className="transition-transform"
                style={{
                  transform: `rotate(${
                    pullDistance >= REFRESH_THRESHOLD ? "180deg" : "0deg"
                  })`,
                }}
              >
                <ArrowDownIcon />
              </div>
            )}
          </div>
        </div>
      )}

      {visibleActivities.length > 0 ? (
        visibleActivities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onReply={onReply}
            onViewProfile={onViewProfile}
            onToggleLike={onToggleLike}
            onDelete={onDeleteActivity}
            currentUser={currentUser}
            onClick={
              onViewActivityDetail
                ? () => handleNavigateToActivity(activity)
                : undefined
            }
            isHighlighted={activity.id === highlightedPostId}
            replyCount={
              activity.replyCount ?? derivedReplyCounts.get(activity.id) ?? 0
            }
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

      <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
    </div>
  );
};

export default Feed;
