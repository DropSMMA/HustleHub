import React, { useState, useMemo } from 'react';
import { UserProfile, Activity } from '@/app/types';
import { BackIcon } from './icons/BackIcon';
import ActivityCard from './ActivityCard';
import { TwitterIcon } from './icons/TwitterIcon';
import { GithubIcon } from './icons/GithubIcon';
import { LinkedInIcon } from './icons/LinkedInIcon';
import { LinkIcon } from './icons/LinkIcon';
import HustleBalanceChart from './HustleBalanceChart';

interface PublicProfileProps {
    user: UserProfile;
    currentUser: UserProfile | null;
    activities: Activity[];
    onBack: () => void;
    onViewConnections: (username: string) => void;
    onConnect: (username:string) => void;
    pendingConnections: string[];
    onReply: (activity: Activity) => void;
    onToggleLike: (activityId: string) => Promise<void> | void;
    onDeleteActivity: (activityId: string) => void;
    onViewProfile: (username: string) => Promise<void> | void;
    onViewActivityDetail?: (activityId: string) => void;
    allActivities?: Activity[];
}

const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <div className="bg-brand-tertiary p-3 rounded-lg text-center h-full flex flex-col justify-center">
        <p className="text-xl font-bold text-brand-neon">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
    </div>
);

const PublicProfile: React.FC<PublicProfileProps> = ({
    user,
    currentUser,
    activities,
    onBack,
    onViewConnections,
    onConnect,
    pendingConnections,
    onReply,
    onToggleLike,
    onDeleteActivity,
    onViewProfile,
    onViewActivityDetail,
    allActivities,
}) => {
    if (!user) {
        return (
            <div className="container mx-auto px-4 max-w-lg text-center">
                <p>Could not find user.</p>
                <button onClick={onBack} className="mt-4 text-brand-neon">Go Back</button>
            </div>
        );
    }

    const { name, avatar, tagline, projects, focuses, socials } = user;
    
    const isConnected = currentUser?.connections.includes(user.username);
    const isPending = pendingConnections.includes(user.username);
    const isSelf = currentUser?.username === user.username;

    const derivedReplyCounts = useMemo(() => {
        const counts = new Map<string, number>();
        const source = allActivities ?? activities;
        source.forEach((activity) => {
            const parentId = activity.replyingTo?.activityId;
            if (parentId) {
                counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
            }
        });
        return counts;
    }, [activities, allActivities]);

    const renderConnectButton = () => {
        if (isSelf) {
            return null; // Don't show button on your own profile
        }
        if (isConnected) {
            return (
                <button className="mt-4 bg-brand-tertiary text-brand-neon font-bold py-2 px-6 rounded-lg text-sm cursor-default" disabled>
                    Connected
                </button>
            );
        }
        if (isPending) {
            return (
                <button className="mt-4 bg-brand-tertiary text-gray-400 font-bold py-2 px-6 rounded-lg text-sm cursor-wait" disabled>
                    Pending...
                </button>
            );
        }
        return (
            <button 
                onClick={() => onConnect(user.username)}
                className="mt-4 bg-brand-neon text-brand-primary font-bold py-2 px-6 rounded-lg hover:bg-green-400 transition-colors text-sm"
            >
                Connect
            </button>
        );
    };


    return (
        <div className="container mx-auto px-4 max-w-lg space-y-6 animate-fade-in">
            <div className="relative flex items-center">
                <button onClick={onBack} className="text-gray-300 hover:text-white p-2 absolute -left-2">
                    <BackIcon />
                </button>
                <h2 className="text-xl font-bold text-center w-full">Profile</h2>
            </div>
            
            <div className="flex flex-col items-center text-center">
                <img src={avatar} alt={name} className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-secondary" />
                <h1 className="text-3xl font-bold mt-4">{name}</h1>
                {tagline && <p className="text-gray-400 mt-1">{tagline}</p>}

                {socials && Object.values(socials).some(s => s) && (
                     <div className="mt-4 flex space-x-4">
                        {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><TwitterIcon /></a>}
                        {socials.github && <a href={socials.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><GithubIcon /></a>}
                        {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><LinkedInIcon /></a>}
                        {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><LinkIcon /></a>}
                    </div>
                )}

                {renderConnectButton()}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatCard value={String(activities.length)} label="Total Hustles" />
                 <button onClick={() => onViewConnections(user.username)} className="w-full text-left">
                    <StatCard value={String(user.connections.length)} label="Connections" />
                </button>
            </div>

            <HustleBalanceChart activities={activities} />

            {focuses && focuses.length > 0 && (
                <div className="bg-brand-secondary rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-3">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                        {focuses.map(focus => (
                            <span key={focus} className="bg-brand-tertiary text-brand-neon text-xs font-semibold px-3 py-1 rounded-full">
                                {focus}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {projects && (
                <div className="bg-brand-secondary rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-2">Projects</h3>
                    <p className="text-gray-300">{projects}</p>
                </div>
            )}

            <div className="space-y-4">
                <h3 className="font-bold text-lg">Recent Activity</h3>
                {activities.length > 0 ? (
                    <div className="space-y-4">
                        {activities.map(activity => (
                            <ActivityCard
                                key={activity.id}
                                activity={activity}
                                onReply={onReply}
                                onViewProfile={onViewProfile}
                                onToggleLike={onToggleLike}
                                onDelete={onDeleteActivity}
                                currentUser={currentUser}
                            onClick={
                                onViewActivityDetail
                                    ? () => onViewActivityDetail(activity.id)
                                    : undefined
                            }
                                replyCount={
                                    activity.replyCount ??
                                    derivedReplyCounts.get(activity.id) ??
                                    0
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400 bg-brand-secondary rounded-lg">
                        <p className="font-semibold">No recent activity.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicProfile;