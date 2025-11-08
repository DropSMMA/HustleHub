import React, { useMemo } from "react";
import { Activity, ActivityType } from "@/app/types";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface HustleBalanceChartProps {
  activities: Activity[];
}

const HustleBalanceChart: React.FC<HustleBalanceChartProps> = ({
  activities,
}) => {
  const radarChartData = useMemo(() => {
    const activityCounts = (
      Object.values(ActivityType) as ActivityType[]
    ).reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<ActivityType, number>);

    activities.forEach((activity) => {
      if (activityCounts.hasOwnProperty(activity.type)) {
        activityCounts[activity.type]++;
      }
    });

    const maxActivityCount = Math.max(...Object.values(activityCounts), 1);

    return Object.entries(activityCounts).map(([name, value]) => ({
      subject: name.replace(" ", "\n"), // Add newline for better label display
      count: value,
      fullMark: maxActivityCount,
    }));
  }, [activities]);

  return (
    <div className="bg-brand-secondary/60 backdrop-blur-lg border border-brand-tertiary/20 p-4 rounded-xl shadow-lg">
      <h3 className="font-bold text-lg text-white mb-4 ml-2">Hustle Balance</h3>
      {activities.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
            <PolarGrid stroke="#404040" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(26, 26, 26, 0.8)",
                backdropFilter: "blur(5px)",
                border: "1px solid #404040",
                borderRadius: "0.75rem",
                color: "#E5E7EB",
              }}
            />
            <Radar
              name="Activities"
              dataKey="count"
              stroke="#39FF14"
              fill="#39FF14"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400 py-16">
          No activity to display balance.
        </p>
      )}
    </div>
  );
};

export default HustleBalanceChart;
