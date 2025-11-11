import React from "react";
import logo from "@/app/Logonoback.png";

const LoadingScreen: React.FC = () => {
  const logoSrc =
    typeof logo === "string"
      ? logo
      : (logo as { src?: string }).src ?? "/Logonoback.png";

  return (
    <div className="bg-brand-primary min-h-screen flex items-center justify-center animate-fade-in">
      <img
        src={logoSrc}
        alt="HustleHub logo"
        className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain"
        loading="eager"
      />
    </div>
  );
};

export default LoadingScreen;
