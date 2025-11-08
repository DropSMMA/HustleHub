import React, { useState } from 'react';
import { AppleIcon } from '../icons/AppleIcon';
import { GoogleIcon } from '../icons/GoogleIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';
import { EmailIcon } from '../icons/EmailIcon';
import { LockIcon } from '../icons/LockIcon';


interface Step1Props {
    onNext: () => void;
}

const OnboardingStep1: React.FC<Step1Props> = ({ onNext }) => {
    const [mode, setMode] = useState<'signup' | 'login'>('signup');

    const handleNext = () => {
        // Here you would typically handle the actual auth logic
        // For this prototype, we'll just move to the next step
        onNext();
    };

    return (
        <div className="bg-brand-secondary p-8 rounded-xl shadow-lg space-y-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-neon to-green-400 text-transparent bg-clip-text">
                    {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
                </h1>
                <p className="text-gray-400 mt-1">
                    {mode === 'signup' ? 'Join the hub of founders and builders.' : 'Log in to track your hustle.'}
                </p>
            </div>

            <div className="flex justify-center space-x-3">
                <button type="button" className="w-full flex items-center justify-center p-3 bg-brand-tertiary rounded-lg hover:bg-opacity-80 transition-all"><AppleIcon /></button>
                <button type="button" className="w-full flex items-center justify-center p-3 bg-brand-tertiary rounded-lg hover:bg-opacity-80 transition-all"><GoogleIcon /></button>
                <button type="button" className="w-full flex items-center justify-center p-3 bg-brand-tertiary rounded-lg hover:bg-opacity-80 transition-all"><LinkedInIcon /></button>
            </div>
            
            <div className="relative flex items-center justify-center">
                 <div className="absolute w-full border-t border-brand-tertiary"></div>
                 <div className="relative bg-brand-secondary px-2 text-sm text-gray-400">OR</div>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <EmailIcon />
                    </span>
                    <input type="email" name="email" placeholder="Email" className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors" />
                </div>
                <div className="relative">
                     <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <LockIcon />
                    </span>
                    <input type="password" name="password" placeholder="Password" className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 pl-10 focus:ring-brand-neon focus:border-brand-neon transition-colors" />
                </div>
            </div>

            <button type="button" onClick={handleNext} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-brand-neon hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-neon transition-all duration-200">
                {mode === 'signup' ? 'Sign Up with Email' : 'Log In'}
            </button>

            <p className="text-center text-sm text-gray-400">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="font-medium text-brand-neon hover:text-green-300 ml-1">
                    {mode === 'signup' ? 'Log In' : 'Sign Up'}
                </button>
            </p>
        </div>
    );
};

export default OnboardingStep1;