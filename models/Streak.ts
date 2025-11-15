import mongoose, { Schema, Types } from "mongoose";
import type { Document, Model } from "mongoose";
import { ActivityType } from "@/app/types";
import toJSON from "./plugins/toJSON";

export interface IStreak extends Document {
  userId: Types.ObjectId;
  category: ActivityType;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
}

const streakSchema = new Schema<IStreak>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

streakSchema.plugin(toJSON);
streakSchema.index({ userId: 1, category: 1 }, { unique: true });
streakSchema.index({ category: 1, longestStreak: -1, currentStreak: -1 });

const Streak =
  (mongoose.models.Streak as Model<IStreak>) ||
  mongoose.model<IStreak>("Streak", streakSchema);

export default Streak;

