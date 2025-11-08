import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="bg-brand-primary min-h-screen flex flex-col items-center justify-center text-white animate-fade-in">
            <div className="relative overflow-hidden group">
                 <h1 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-neon to-green-400 text-transparent bg-clip-text">
                    HustleHub
                </h1>
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>
        </div>
    );
};

export default LoadingScreen;