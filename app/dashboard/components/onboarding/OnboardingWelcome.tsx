import React, { useState } from 'react';
import { PenIcon } from '../icons/PenIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { TrophyIcon } from '../icons/TrophyIcon';

interface OnboardingWelcomeProps {
    onNext: () => void;
}

const features = [
    {
        icon: <PenIcon />,
        title: "Log Your Hustle",
        description: "Track deep work, gym sessions, networking, and recharge moments in one place."
    },
    {
        icon: <SparklesIcon />,
        title: "Get AI Insights",
        description: "Understand your work-life balance with AI-powered analysis to avoid burnout."
    },
    {
        icon: <TrophyIcon />,
        title: "Join Challenges",
        description: "Compete with fellow founders, build products, and stay accountable together."
    }
];

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onNext }) => {
    const [step, setStep] = useState(0);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const currentFeature = features[step];

    const changeStep = (newStep: number) => {
        if (newStep === step) return;
        setIsAnimatingOut(true);
        setTimeout(() => {
            setStep(newStep);
            setIsAnimatingOut(false);
        }, 200); // Animation duration
    };

    const handleNext = () => {
        if (step < features.length - 1) {
            changeStep(step + 1);
        } else {
            onNext();
        }
    };

    const handleBack = () => {
        if (step > 0) {
            changeStep(step - 1);
        }
    };
    
    const animationClass = isAnimatingOut ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0';

    return (
        <div className="bg-brand-secondary p-8 rounded-xl shadow-lg w-full max-w-md mx-auto flex flex-col" style={{ minHeight: '520px' }}>
            <div className="text-center">
                <h1 className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-neon to-green-400 text-transparent bg-clip-text">
                    Welcome to HustleHub
                </h1>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center">
                <div className={`flex flex-col items-center text-center transition-all duration-200 ease-out ${animationClass}`}>
                    <div className="flex-shrink-0 bg-brand-tertiary p-4 rounded-full text-brand-neon mb-6">
                        <div className="h-8 w-8 flex items-center justify-center">
                            {currentFeature.icon}
                        </div>
                    </div>
                    <h2 className="font-bold text-2xl text-white">{currentFeature.title}</h2>
                    <p className="text-gray-400 text-md mt-2 max-w-xs">{currentFeature.description}</p>
                </div>
            </div>

            <div>
                <div className="flex justify-center space-x-2 mb-6">
                    {features.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => changeStep(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${step === index ? 'bg-brand-neon w-6' : 'bg-brand-tertiary w-2 hover:bg-gray-600'}`}
                            aria-label={`Go to step ${index + 1}`}
                        />
                    ))}
                </div>

                <div className="flex space-x-4">
                    {step > 0 && (
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex justify-center py-3 px-5 border border-brand-tertiary rounded-md shadow-sm text-sm font-bold text-gray-300 bg-brand-tertiary hover:bg-opacity-80 transition-all duration-200"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleNext}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-brand-neon hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-neon transition-all duration-200"
                    >
                        {step === features.length - 1 ? "Get Started" : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWelcome;