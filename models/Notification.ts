import mongoose, { Schema, Types } from "mongoose";
import type { Document, Model } from "mongoose";
import { NotificationType } from "@/app/types";
import toJSON from "./plugins/toJSON";

export interface INotification extends Document {
  recipient: Types.ObjectId;
  actorId: Types.ObjectId;
  actorUsername: string;
  actorName: string;
  actorAvatar: string;
  type: NotificationType;
  message: string;
  read: boolean;
  postId?: Types.ObjectId;
  commentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorUsername: {
      type: String,
      required: true,
      trim: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorAvatar: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    commentId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

notificationSchema.plugin(toJSON);
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;