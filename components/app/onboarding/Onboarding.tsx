import React, { useState } from "react";
import { UserProfile, FocusArea } from "@/app/types";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingStep1 from "./OnboardingStep1";
import OnboardingStep2 from "./OnboardingStep2";
import OnboardingFocus from "./OnboardingFocus";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
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

  const handleWelcomeComplete = () => {
    setStep(1);
  };

  const handleAuthComplete = () => {
    setStep(2);
  };

  const handleProfileComplete = (data: Omit<UserProfile, "focuses">) => {
    setProfileData(data);
    setStep(3);
  };

  const handleFocusComplete = (focuses: FocusArea[]) => {
    const finalProfile: UserProfile = {
      ...profileData,
      focuses,
    };
    onComplete(finalProfile);
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
          <OnboardingFocus onBack={goBack} onFinish={handleFocusComplete} />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
