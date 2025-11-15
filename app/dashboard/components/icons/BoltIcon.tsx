import React from "react";

interface BoltIconProps {
  className?: string;
}

export const BoltIcon: React.FC<BoltIconProps> = ({
  className = "h-5 w-5",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11 2L3 14h6l-1 8 8-12h-6l1-8z" />
  </svg>
);
