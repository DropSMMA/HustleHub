import React from "react";
import { toast } from "react-hot-toast";

import { GoogleIcon } from "../icons/GoogleIcon";

type ProviderType = "google";

interface Step1Props {
  onNext: (data: { email: string }) => void;
  onProviderSignIn?: (provider: ProviderType) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  defaultMode?: "signup" | "login";
}

const OnboardingStep1: React.FC<Step1Props> = ({
  onNext,
  onProviderSignIn,
  submitLabel,
  isSubmitting = false,
  defaultMode = "signup",
}) => {
  const handleGoogleClick = () => {
    if (onProviderSignIn) {
      onProviderSignIn("google");
      return;
    }
    toast.error("Google sign-in is not available right now. Please try again later.");
  };

  return (
    <div className="bg-brand-secondary p-8 rounded-xl shadow-lg space-y-6 animate-fade-in text-center">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-neon to-green-400 text-transparent bg-clip-text">
          Welcome to HustleHub
        </h1>
        <p className="text-gray-400 mt-1">
          Sign in with Google to join the hub of founders and builders.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-secondary focus:ring-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        <span>{isSubmitting ? "Please wait..." : "Continue with Google"}</span>
      </button>

      <p className="text-sm text-gray-500">
        Google sign-in is the only option available at the moment. We’ll add more providers soon.
      </p>
    </div>
  );
};

export default OnboardingStep1;
