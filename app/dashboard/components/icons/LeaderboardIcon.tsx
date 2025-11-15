import React from "react";

interface LeaderboardIconProps {
  className?: string;
}

export const LeaderboardIcon: React.FC<LeaderboardIconProps> = ({
  className = "h-6 w-6",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path
      d="M15 21H9V12.6c0-.331.269-.6.6-.6h4.8c.331 0 .6.269.6.6V21Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.4 21H15v-2.9c0-.331.269-.6.6-.6h4.8c.331 0 .6.269.6.6v2.3c0 .331-.269.6-.6.6Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 21v-4.9c0-.331-.269-.6-.6-.6H3.6c-.331 0-.6.269-.6.6v4.3c0 .331.269.6.6.6H9Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m10.806 5.113 0 0 0 0L11.715 3.186a.329.329 0 0 1 .57 0l.909 1.928 2.033.311c.262.04.366.376.177.568l-1.47 1.5.347 2.118c.044.272-.229.48-.462.351L12 8.96l-1.818 1.001c-.233.129-.506-.08-.461-.352l.347-2.118-1.47-1.5c-.189-.193-.085-.528.176-.568l2.033-.31Z"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

