"use client";

import React from "react";
import { View } from "@/app/types";
import { HomeIcon } from "./icons/HomeIcon";
import { SparklesIcon } from "./icons/SparklesIcon";
import { UserIcon } from "./icons/UserIcon";
import { SearchIcon } from "./icons/SearchIcon";
import { LeaderboardIcon } from "./icons/LeaderboardIcon";

interface BottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 transition-colors duration-200 ${
      isActive ? "text-brand-neon" : "text-gray-400 hover:text-white"
    }`}
  >
    {icon}
    <span className="text-xs mt-1 font-medium">{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setCurrentView,
}) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 w-full bg-brand-secondary/90 backdrop-blur-lg border-t border-brand-tertiary shadow-lg"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto py-3">
        <NavItem
          label="Feed"
          icon={<HomeIcon />}
          isActive={currentView === "feed"}
          onClick={() => setCurrentView("feed")}
        />
        <NavItem
          label="Insights"
          icon={<SparklesIcon />}
          isActive={currentView === "insights"}
          onClick={() => setCurrentView("insights")}
        />
        <NavItem
          label="Research"
          icon={<SearchIcon />}
          isActive={currentView === "research"}
          onClick={() => setCurrentView("research")}
        />
        <NavItem
          label="Leaders"
          icon={<LeaderboardIcon />}
          isActive={currentView === "leaderboards"}
          onClick={() => setCurrentView("leaderboards")}
        />
        <NavItem
          label="Profile"
          icon={<UserIcon />}
          isActive={currentView === "profile"}
          onClick={() => setCurrentView("profile")}
        />
      </div>
    </nav>
  );
};

export default BottomNav;