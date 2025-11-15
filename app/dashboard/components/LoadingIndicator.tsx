import React from "react";

interface LoadingIndicatorProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap: Record<NonNullable<LoadingIndicatorProps["size"]>, string> = {
  sm: "h-6 w-6 border",
  md: "h-10 w-10 border-2",
  lg: "h-12 w-12 border-2",
};

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  label = "Loading…",
  size = "md",
}) => {
  const spinnerClasses = sizeMap[size] ?? sizeMap.md;

  return (
    <div className="flex flex-col items-center gap-3 text-brand-text-secondary">
      <div
        className={`animate-spin rounded-full border-brand-border border-t-brand-neon ${spinnerClasses}`}
      />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
};

export default LoadingIndicator;
