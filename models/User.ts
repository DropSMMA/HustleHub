import mongoose, { Schema } from "mongoose";
import type { Document, Model } from "mongoose";
import { FocusArea } from "@/app/types";
import toJSON from "./plugins/toJSON";

export interface UserSocials {
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface IUser extends Document {
  name?: string;
  email: string;
  username?: string;
  image?: string;
  tagline?: string;
  projects: UserProject[];
  focuses: FocusArea[];
  socials?: UserSocials;
  connections: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
  emailVerified?: Date;
  customerId?: string;
  priceId?: string;
  hasAccess: boolean;
}

export interface UserProject {
  name: string;
  url?: string;
}

// USER SCHEMA
const focusValues = Object.values(FocusArea);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      private: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    image: {
      type: String,
    },
    tagline: {
      type: String,
      trim: true,
    },
    projects: {
      type: [
        {
          name: {
            type: String,
            trim: true,
            required: true,
            maxlength: 120,
          },
          url: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
    focuses: {
      type: [String],
      enum: focusValues,
      default: [],
    },
    socials: {
      twitter: {
        type: String,
        trim: true,
      },
      github: {
        type: String,
        trim: true,
      },
      linkedin: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },
    connections: {
      type: [String],
      default: [],
    },
    incomingRequests: {
      type: [String],
      default: [],
    },
    outgoingRequests: {
      type: [String],
      default: [],
    },
    emailVerified: {
      type: Date,
    },
    // Used in the Stripe webhook to identify the user in Stripe and later create Customer Portal or prefill user credit card details
    customerId: {
      type: String,
      validate(value: string) {
        return value.includes("cus_");
      },
    },
    // Used in the Stripe webhook. should match a plan in config.js file.
    priceId: {
      type: String,
      validate(value: string) {
        return value.includes("price_");
      },
    },
    // Used to determine if the user has access to the product—it's turn on/off by the Stripe webhook
    hasAccess: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);

const User =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;