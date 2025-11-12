import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { UserProfile, FocusArea } from "@/app/types";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingStep1 from "./OnboardingStep1";
import OnboardingStep2 from "./OnboardingStep2";
import OnboardingFocus from "./OnboardingFocus";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { data: session } = useSession();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authData, setAuthData] = useState<{ email: string } | null>(null);
  // FIX: Added missing 'username' property to initial state to satisfy Omit<UserProfile, 'focuses'> type.
  const [profileData, setProfileData] = useState<Omit<UserProfile, "focuses">>({
    username: "",
    name: "",
    avatar:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
    tagline: "",
    projects: "",
    connections: [],
    socials: {},
  });

  useEffect(() => {
    if (session?.user?.email) {
      setAuthData({ email: session.user.email.toLowerCase() });
    }
  }, [session]);

  const handleWelcomeComplete = () => {
    if (session?.user?.email) {
      setAuthData({ email: session.user.email.toLowerCase() });
      setStep(2);
      return;
    }
    setStep(1);
  };

  const handleAuthComplete = (data: { email: string }) => {
    setAuthData(data);
    setStep(2);
  };

  const handleProfileComplete = (data: Omit<UserProfile, "focuses">) => {
    setProfileData(data);
    setStep(3);
  };

  const handleFocusComplete = async (focuses: FocusArea[]) => {
    if (!authData) {
      toast.error("We couldn't verify your email. Please restart onboarding.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    const finalProfile: UserProfile = {
      ...profileData,
      focuses,
    };
    try {
      const payload = {
        email: authData.email,
        name: finalProfile.name,
        username: finalProfile.username,
        avatar: finalProfile.avatar,
        tagline: finalProfile.tagline,
        projects: finalProfile.projects
          ? finalProfile.projects
              .split(",")
              .map((project) => project.trim())
              .filter(Boolean)
          : [],
        focuses: finalProfile.focuses,
        socials: finalProfile.socials,
      };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          // Ignore body parsing errors and fall back to default message
        }

        const errorMessage =
          typeof errorBody === "object" &&
          errorBody !== null &&
          "message" in errorBody &&
          typeof (errorBody as { message: unknown }).message === "string"
            ? (errorBody as { message: string }).message
            : "Something went wrong while saving your profile.";

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const user = data.user;

      const normalizedProfile: UserProfile = {
        username: user.username,
        name: user.name,
        avatar: user.image ?? finalProfile.avatar,
        tagline: user.tagline ?? "",
        projects: (user.projects ?? []).join(", "),
        focuses: user.focuses ?? finalProfile.focuses,
        connections: user.connections ?? [],
        socials: user.socials ?? finalProfile.socials,
      };

      toast.success("Welcome aboard! Your profile is ready.");
      onComplete(normalizedProfile);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => setStep(step - 1);

  return (
    <div className="bg-brand-primary min-h-screen font-sans text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step === 0 && <OnboardingWelcome onNext={handleWelcomeComplete} />}
        {step === 1 && <OnboardingStep1 onNext={handleAuthComplete} />}
        {step === 2 && (
          <OnboardingStep2
            onNext={handleProfileComplete}
            initialData={profileData}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <OnboardingFocus
            onBack={goBack}
            onFinish={handleFocusComplete}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
