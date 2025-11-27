import React from "react";

interface FlameIconProps {
  className?: string;
}

export const FlameIcon: React.FC<FlameIconProps> = ({
  className = "h-6 w-6",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M13.5 1.5c.3 2.7-1 4.4-2.2 5.8-1.3 1.5-2.1 2.6-1.4 4.4.5-1.1 1.5-2 2.5-2.6 1.5-.8 3-1.4 3.5-3.4.6 3.1 2.9 4.5 3.6 7.3.9 3.7-1.6 9-7 9s-7.9-4.2-7.2-8.3c.4-2.5 1.8-4 3.3-5.5 1.4-1.4 2.7-2.8 2.7-5.2 1 .6 1.9 1.4 2.2 2.5z" />
  </svg>
);
