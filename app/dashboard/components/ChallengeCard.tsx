
import React from 'react';
import { Challenge } from '@/app/types';

interface ChallengeCardProps {
    challenge: Challenge;
    isJoined: boolean;
    userProgress: number;
    onJoin: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, isJoined, userProgress, onJoin }) => {
    const { id, title, description, participants, badge, goal, trackingMethod } = challenge;

    const progressPercentage = goal > 0 ? Math.min((userProgress / goal) * 100, 100) : 0;

    return (
        <div className="bg-brand-secondary rounded-xl shadow-lg overflow-hidden p-5 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-white">{badge} {title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{description}</p>
                </div>
                <div className="text-sm text-gray-300 font-semibold whitespace-nowrap ml-4">
                    {participants} hustlers
                </div>
            </div>
            
            {isJoined && (
                <div className="mt-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-300">
                            Progress: {userProgress} / {goal} {trackingMethod === 'streak' ? 'days' : ''}
                        </span>
                        <span className="text-sm font-medium text-brand-neon">{Math.floor(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-brand-tertiary rounded-full h-2.5">
                        <div className="bg-brand-neon h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
            )}

            <button 
                onClick={onJoin}
                disabled={isJoined}
                className="mt-4 w-full text-center bg-brand-tertiary font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-brand-neon/20 disabled:text-brand-neon/50 disabled:cursor-not-allowed hover:bg-opacity-80 text-brand-neon"
            >
                {isJoined ? (progressPercentage >= 100 ? 'Completed!' : 'Challenge Joined') : 'Join Challenge'}
            </button>
        </div>
    );
};

export default ChallengeCard;