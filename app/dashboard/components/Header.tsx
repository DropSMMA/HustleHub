import React from "react";
import { View } from "@/app/types";
import { BellIcon } from "./icons/BellIcon";

interface HeaderProps {
  unreadNotifications: number;
  setCurrentView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({
  unreadNotifications,
  setCurrentView,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-brand-primary/80 backdrop-blur-sm border-b border-brand-secondary z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-neon to-green-400 text-transparent bg-clip-text">
          HustleHub
        </h1>
        <button
          onClick={() => setCurrentView("notifications")}
          className="relative text-gray-400 hover:text-white transition-colors"
          aria-label="View notifications"
        >
          <BellIcon />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
