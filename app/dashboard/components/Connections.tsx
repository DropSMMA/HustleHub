import React, { useState } from 'react';
import { UserProfile } from '@/app/types';
import { BackIcon } from './icons/BackIcon';
import { SearchIcon } from './icons/SearchIcon';

interface ConnectionsProps {
  user: UserProfile;
  allUsers: Record<string, UserProfile>;
  onBack: () => void;
  onViewProfile: (username: string) => Promise<void> | void;
}

const Connections: React.FC<ConnectionsProps> = ({ user, allUsers, onBack, onViewProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const connectionProfiles = user.connections
        .map(username => allUsers[username])
        .filter(Boolean); // Filter out any undefined profiles

    const filteredConnections = connectionProfiles.filter(profile =>
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.tagline && profile.tagline.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="container mx-auto px-4 max-w-lg space-y-4 animate-fade-in">
            <div className="relative flex items-center">
                <button onClick={onBack} className="text-gray-300 hover:text-white p-2 absolute -left-2">
                    <BackIcon />
                </button>
                <h2 className="text-xl font-bold text-center w-full">{`${user.name}’s Connections`}</h2>
            </div>

            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <SearchIcon />
                </span>
                <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-brand-secondary border-transparent rounded-lg p-3 pl-10 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
                />
            </div>

            {filteredConnections.length > 0 ? (
                <div className="space-y-3">
                    {filteredConnections.map(profile => (
                        <button 
                            key={profile.username}
                            onClick={() => void onViewProfile(profile.username)}
                            className="w-full bg-brand-secondary p-3 rounded-lg flex items-center space-x-4 transition-colors hover:bg-brand-tertiary text-left"
                        >
                            <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover" />
                            <div className="flex-grow">
                                <p className="font-bold text-white">{profile.name}</p>
                                {profile.tagline && <p className="text-sm text-gray-400 truncate">{profile.tagline}</p>}
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
                    {connectionProfiles.length === 0 ? (
                        <>
                            <p className="font-semibold text-lg">No Connections Yet</p>
                            <p className="text-sm">Connect with other hustlers to build your network.</p>
                        </>
                    ) : (
                         <>
                            <p className="font-semibold text-lg">No connections found</p>
                            <p className="text-sm">Try a different search term.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Connections;