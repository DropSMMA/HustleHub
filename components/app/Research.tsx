import React, { useState } from "react";
import { UserProfile } from "@/app/types";
import { SearchIcon } from "./icons/SearchIcon";

interface ResearchProps {
  allUsers: UserProfile[];
  currentUser: UserProfile | null;
  onViewProfile: (username: string) => Promise<void> | void;
}

const Research: React.FC<ResearchProps> = ({
  allUsers,
  currentUser,
  onViewProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const otherUsers = allUsers.filter(
    (user) => user.username !== currentUser?.username
  );

  const filteredUsers = otherUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.tagline &&
        user.tagline.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 max-w-lg space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-center">Find Hustlers</h2>

      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Search by name, username, or tagline..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-brand-secondary border-transparent rounded-lg p-3 pl-10 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
        />
      </div>

      {filteredUsers.length > 0 ? (
        <div className="space-y-3">
          {filteredUsers.map((profile) => (
            <button
              key={profile.username}
              onClick={() => void onViewProfile(profile.username)}
              className="w-full bg-brand-secondary p-3 rounded-lg flex items-center space-x-4 transition-colors hover:bg-brand-tertiary text-left"
            >
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="flex-grow">
                <p className="font-bold text-white">{profile.name}</p>
                {profile.tagline && (
                  <p className="text-sm text-gray-400 truncate">
                    {profile.tagline}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
          <p className="font-semibold text-lg">No hustlers found.</p>
          <p className="text-sm">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default Research;
