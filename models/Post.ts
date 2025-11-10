import mongoose, { Schema, Types } from "mongoose";
import type { Document, Model } from "mongoose";
import { ActivityType } from "@/app/types";
import toJSON from "./plugins/toJSON";

export interface IReply {
  id: string;
  userId: Types.ObjectId;
  user: string;
  avatar: string;
  text: string;
}

export interface IComment extends IReply {
  replies?: IReply[];
}

export interface IPost extends Document {
  userId: Types.ObjectId;
  username: string;
  name: string;
  avatar: string;
  type: ActivityType;
  description: string;
  stats?: string;
  image?: string;
  kudos: number;
  likedBy: Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user: { type: String, required: true },
    avatar: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const commentSchema = new Schema<IComment>(
  {
    id: { type: String, required: true },
    user: { type: String, required: true },
    avatar: { type: String, required: true },
    text: { type: String, required: true },
    replies: {
      type: [replySchema],
      default: [],
    },
  },
  { _id: false }
);

const postSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true, index: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
    },
    description: { type: String, required: true, trim: true },
    stats: { type: String, trim: true },
    image: { type: String },
    kudos: { type: Number, default: 0 },
    likedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

postSchema.plugin(toJSON);
postSchema.index({ createdAt: -1 });

const Post =
  (mongoose.models.Post as Model<IPost>) ||
  mongoose.model<IPost>("Post", postSchema);

export default Post;

