import React, { useEffect, useMemo } from "react";
import { Activity, ActivityType } from "@/app/types";
import { SparklesIcon } from "./icons/SparklesIcon";
import HustleBalanceChart from "./HustleBalanceChart";

interface WeeklyInsightsProps {
  activities: Activity[];
  onGenerateInsight: (activities: Activity[]) => void;
  insight: string;
  isLoading: boolean;
  error: string | null;
}

// --- In-component Icons to avoid creating new files ---
const BoltIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-yellow-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const FireIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-orange-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014A8.003 8.003 0 0122 12c0 3.771-2.5 8-12 8-3.733 0-6.267-1.333-8.657-3.343"
    />
  </svg>
);

const LightbulbIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0114 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

const StatCard: React.FC<{
  value: string;
  label: string;
  icon: React.ReactNode;
}> = ({ value, label, icon }) => (
  <div className="bg-brand-secondary/60 backdrop-blur-lg border border-brand-tertiary/20 p-5 rounded-xl text-center flex flex-col items-center justify-center gap-2">
    {icon}
    <p className="text-3xl font-bold text-white">{value}</p>
    <p className="text-sm text-gray-300 font-medium">{label}</p>
  </div>
);

const WeeklyInsights: React.FC<WeeklyInsightsProps> = ({
  activities,
  onGenerateInsight,
  insight,
  isLoading,
  error,
}) => {
  const recentActivities = useMemo(() => {
    return activities.filter((a) => {
      if (a.timestamp === "Just now" || a.timestamp.includes("h ago"))
        return true;
      const match = a.timestamp.match(/(\d+)\s*d\s*ago/);
      if (match) {
        const daysAgo = parseInt(match[1], 10);
        return daysAgo <= 7;
      }
      return false;
    });
  }, [activities]);

  useEffect(() => {
    if (recentActivities.length > 0 && !insight && !isLoading && !error) {
      onGenerateInsight(recentActivities);
    }
  }, [recentActivities, insight, isLoading, error, onGenerateInsight]);

  const { totalActivities, focusStreak } = useMemo(() => {
    const focusActivityDays = new Set<number>();
    recentActivities
      .filter((a) =>
        [ActivityType.DeepWork, ActivityType.StartupTask].includes(a.type)
      )
      .forEach((a) => {
        if (a.timestamp === "Just now" || a.timestamp.includes("h ago")) {
          focusActivityDays.add(0); // Today
        } else {
          const match = a.timestamp.match(/(\d+)\s*d\s*ago/);
          if (match) focusActivityDays.add(parseInt(match[1], 10));
        }
      });

    let currentFocusStreak = 0;
    if (focusActivityDays.has(0)) {
      currentFocusStreak = 1;
      for (let i = 1; i <= 7; i++) {
        if (focusActivityDays.has(i)) currentFocusStreak++;
        else break;
      }
    }

    return {
      totalActivities: recentActivities.length,
      focusStreak: currentFocusStreak,
    };
  }, [recentActivities]);

  const parsedInsight = useMemo(() => {
    if (!insight) return null;
    try {
      const vibeCheck = insight
        .match(
          /\*\*Vibe Check:\*\*\s*([\s\S]*?)(?:\*\*Balance Score:\*\*|$)/
        )?.[1]
        .trim();
      const balanceScore = insight
        .match(
          /\*\*Balance Score:\*\*\s*([\s\S]*?)(?:\*\*Actionable Tip:\*\*|$)/
        )?.[1]
        .trim();
      const actionableTip = insight
        .match(/\*\*Actionable Tip:\*\*\s*([\s\S]*)/)?.[1]
        .trim();

      if (!vibeCheck || !actionableTip) return null; // Balance score is optional

      return { vibeCheck, balanceScore, actionableTip };
    } catch (e) {
      return null;
    }
  }, [insight]);

  return (
    <div className="container mx-auto px-4 max-w-lg space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-center tracking-tight">
        Weekly Debrief
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          value={String(totalActivities)}
          label="Total Hustles"
          icon={<BoltIcon />}
        />
        <StatCard
          value={`${focusStreak} Day${focusStreak !== 1 ? "s" : ""}`}
          label="Focus Streak"
          icon={<FireIcon />}
        />
      </div>

      <HustleBalanceChart activities={recentActivities} />

      <div className="bg-brand-secondary/60 backdrop-blur-lg border border-brand-tertiary/20 p-5 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-white">
            <SparklesIcon /> Hustle AI
          </h3>
          <button
            onClick={() => onGenerateInsight(recentActivities)}
            disabled={isLoading || recentActivities.length === 0}
            className="text-xs font-semibold text-brand-neon hover:text-green-300 transition-colors disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? "Analyzing..." : "Refresh"}
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-neon"></div>
          </div>
        )}

        {error && !isLoading && (
          <p className="text-center text-red-400 py-8">{error}</p>
        )}

        {!isLoading && !error && insight && (
          <div className="space-y-4">
            {parsedInsight ? (
              <>
                <div>
                  <p className="text-sm text-gray-400 font-semibold mb-1">
                    Vibe Check
                  </p>
                  <p className="text-gray-200 italic">
                    "{parsedInsight.vibeCheck}"
                  </p>
                </div>
                {parsedInsight.balanceScore && (
                  <div>
                    <p className="text-sm text-gray-400 font-semibold mb-1">
                      Balance Score
                    </p>
                    <p className="text-gray-200">
                      {parsedInsight.balanceScore}
                    </p>
                  </div>
                )}
                <div className="bg-brand-neon/10 border border-brand-neon/20 p-4 rounded-lg flex items-start gap-3">
                  <div className="flex-shrink-0 text-brand-neon mt-1">
                    <LightbulbIcon />
                  </div>
                  <div>
                    <p className="text-sm text-brand-neon font-semibold mb-1">
                      Actionable Tip
                    </p>
                    <p className="text-gray-200">
                      {parsedInsight.actionableTip}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-brand-tertiary rounded-lg whitespace-pre-wrap font-mono text-sm text-gray-200">
                {insight}
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && recentActivities.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            Log an activity this week to get your first AI insight!
          </p>
        )}
      </div>
    </div>
  );
};

export default WeeklyInsights;
