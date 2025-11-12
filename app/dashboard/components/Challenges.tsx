
import React from 'react';
import { Challenge, UserChallenge } from '@/app/types';
import ChallengeCard from './ChallengeCard';

interface ChallengesProps {
    challenges: Challenge[];
    userChallenges: UserChallenge[];
    onJoinChallenge: (challengeId: string) => void;
}

const Challenges: React.FC<ChallengesProps> = ({ challenges, userChallenges, onJoinChallenge }) => {
    return (
        <div className="container mx-auto px-4 max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-center">Join a Challenge</h2>
            {challenges.map(challenge => {
                const userChallengeData = userChallenges.find(uc => uc.challengeId === challenge.id);
                const isJoined = !!userChallengeData;
                const userProgress = userChallengeData ? userChallengeData.progress : 0;

                return (
                    <ChallengeCard 
                        key={challenge.id} 
                        challenge={challenge}
                        isJoined={isJoined}
                        userProgress={userProgress}
                        onJoin={() => onJoinChallenge(challenge.id)}
                    />
                );
            })}
        </div>
    );
};

export default Challenges;