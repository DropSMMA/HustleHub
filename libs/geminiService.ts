import { Activity, ActivityType } from "@/app/types";

const FALLBACK_INSIGHT =
  "**Vibe Check:** You stayed consistent this week—solid hustle with room to recharge.\n" +
  "**Balance Score:** 60% Deep Work, 25% Fitness, 15% Recharge.\n" +
  "**Actionable Tip:** Lock in one intentional recharge block tomorrow so you can hit next week with fresh energy.";

export async function getHustleBalanceInsight(
  activities: Activity[],
): Promise<string> {
  if (!activities.length) {
    return FALLBACK_INSIGHT;
  }

  const typeCounts = activities.reduce<Record<ActivityType, number>>(
    (acc, activity) => {
      acc[activity.type] = (acc[activity.type] ?? 0) + 1;
      return acc;
    },
    {
      [ActivityType.DeepWork]: 0,
      [ActivityType.StartupTask]: 0,
      [ActivityType.Workout]: 0,
      [ActivityType.Recharge]: 0,
      [ActivityType.Networking]: 0,
    },
  );

  const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

  const toPercent = (count: number) =>
    total === 0 ? 0 : Math.round((count / total) * 100);

  const scoreString = [
    `${toPercent(typeCounts[ActivityType.DeepWork])}% Deep Work`,
    `${toPercent(typeCounts[ActivityType.StartupTask])}% Startup`,
    `${toPercent(typeCounts[ActivityType.Workout])}% Fitness`,
    `${toPercent(typeCounts[ActivityType.Recharge])}% Recharge`,
    `${toPercent(typeCounts[ActivityType.Networking])}% Networking`,
  ]
    .filter((entry) => !entry.startsWith("0%"))
    .join(", ");

  const vibe =
    toPercent(typeCounts[ActivityType.DeepWork]) > 50
      ? "Heavy build mode—momentum is real."
      : "Nice balance—keeping multiple plates spinning.";

  const actionable =
    toPercent(typeCounts[ActivityType.Recharge]) < 20
      ? "Add one deliberate recharge block to stay sharp."
      : "Double down on the channel that's moving the needle most.";

  return (
    `**Vibe Check:** ${vibe}\n` +
    `**Balance Score:** ${scoreString || "Need more logged sessions."}\n` +
    `**Actionable Tip:** ${actionable}`
  );
}