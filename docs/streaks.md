# Streak Tracking Overview

This document summarizes the centralized streak system that powers the Leaderboards view and the in-feed streak badges.

## Data Model

- `models/Streak.ts` stores one record per `userId` + `ActivityType`.
- Each record tracks:
  - `currentStreak`: current consecutive-day streak.
  - `longestStreak`: personal best for that category.
  - `lastActiveDate`: UTC-normalized date of the most recent qualifying activity.

## Server Logic

- `libs/streaks.ts` exposes helpers to:

  - Normalize dates to day-level precision.
  - Upsert streaks whenever a post with an activity type is created (`recordActivityStreak`).
  - Batch fetch streak summaries for feed serialization (`getStreakSummaries`).
  - Assemble category leaderboards with hydrated user metadata (`getCategoryLeaderboards`).

- `app/api/posts/route.ts` calls the streak helpers after creating posts and when serializing feed responses so each post can include the author’s streak snapshot.

- `app/api/leaderboards/route.ts` surfaces a new `/api/leaderboards` endpoint that returns the top streak holders per activity type.

## Client Usage

- Feed cards (`ActivityCard`) display a flame badge when a streak summary is present.
- The new `Leaderboards` dashboard view requests `/api/leaderboards`, renders category tabs, and highlights the current user when present.

## Backfill Script

If you need to rebuild streak data from historical posts, run the CLI backfill:

```bash
pnpm backfill:streaks          # writes streaks
pnpm backfill:streaks -- --dry-run   # preview without changes
```

The script:

1. Connects to MongoDB using the existing app connection helper.
2. Loads every post with a category, sorted by `userId`, `type`, and `createdAt`.
3. Recomputes `currentStreak`, `longestStreak`, and `lastActiveDate` for each `(user, category)` pair.
4. Upserts the results into the `Streak` collection (skipped when `--dry-run` is set).
