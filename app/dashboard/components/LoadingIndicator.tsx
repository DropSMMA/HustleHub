import React from "react";

interface LoadingIndicatorProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  label,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-4 border-brand-border border-t-brand-neon rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {label && (
        <p className={`text-brand-text-secondary ${textSizeClasses[size]}`}>
          {label}
        </p>
      )}
    </div>
  );
};

export default LoadingIndicator;

