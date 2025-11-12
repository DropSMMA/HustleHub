"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import OnboardingStep1 from "@/app/dashboard/components/onboarding/OnboardingStep1";

const SignInContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/dashboard",
    [searchParams]
  );

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    switch (error) {
      case "OAuthAccountNotLinked":
        toast.error(
          "This email is already linked to another login method. Please use the original sign-in option."
        );
        break;
      case "Configuration":
        toast.error("There was a configuration issue with the sign-in provider.");
        break;
      default:
        toast.error("Unable to sign in. Please try again.");
    }
  }, [searchParams]);

  const handleEmailSignIn = async ({ email }: { email: string }) => {
    setIsSubmitting(true);
    try {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Check your inbox for a magic link to finish signing in.");
    } catch (error) {
      console.error("Email sign-in failed", error);
      toast.error("We couldn't send the magic link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProviderSignIn = (provider: "apple" | "google" | "linkedin") => {
    switch (provider) {
      case "google":
        void signIn("google", { callbackUrl });
        return;
      case "apple":
      case "linkedin":
        toast.error("This sign-in option isn't available yet.");
        return;
      default:
        toast.error("Unsupported provider.");
    }
  };

  return (
    <div className="bg-brand-primary min-h-screen font-sans text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OnboardingStep1
          onNext={handleEmailSignIn}
          onProviderSignIn={handleProviderSignIn}
          submitLabel="Continue with Email"
          isSubmitting={isSubmitting}
          defaultMode="login"
        />
      </div>
    </div>
  );
};

const SignInPage: React.FC = () => (
  <Suspense
    fallback={
      <div className="bg-brand-primary min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    }
  >
    <SignInContent />
  </Suspense>
);

export default SignInPage;

