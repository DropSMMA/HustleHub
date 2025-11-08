import React, { useState, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import type { UserProfile } from '@/app/types';
import { CameraIcon } from '../icons/CameraIcon';

interface Step2Props {
    onNext: (data: Omit<UserProfile, 'focuses'>) => void;
    onBack: () => void;
    initialData: Omit<UserProfile, 'focuses'>;
}

const OnboardingStep2: React.FC<Step2Props> = ({ onNext, onBack, initialData }) => {
    const [data, setData] = useState(initialData);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setData(prevData => ({ ...prevData, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = () => {
        if (!data.name) {
            toast.error('Please enter your name or a handle.');
            return;
        }
        onNext({
            ...data,
            username: data.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
            connections: [],
        });
    };

    return (
        <div className="bg-brand-secondary p-8 rounded-xl shadow-lg space-y-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tighter text-white">
                    Set Up Your Profile
                </h1>
                <p className="text-gray-400 mt-1">This is how other hustlers will see you.</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <img src={data.avatar} alt="Profile" className="h-24 w-24 rounded-full object-cover ring-2 ring-brand-tertiary" />
                    <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-brand-neon text-brand-primary p-2 rounded-full cursor-pointer hover:bg-green-400 transition-all">
                        <CameraIcon />
                        <input id="avatar-upload" name="avatar-upload" type="file" className="sr-only" onChange={handleAvatarChange} accept="image/*" />
                    </label>
                </div>
                 <input type="text" name="name" value={data.name} onChange={handleChange} placeholder="Name or Handle" className="w-full text-center bg-transparent border-b-2 border-brand-tertiary focus:border-brand-neon focus:outline-none p-2 transition-colors"/>
            </div>

            <div className="space-y-4">
                 <input type="text" name="tagline" value={data.tagline} onChange={handleChange} placeholder="Optional: Short tagline (e.g., AI founder)" className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 focus:ring-brand-neon focus:border-brand-neon transition-colors" />
                 <input type="text" name="projects" value={data.projects} onChange={handleChange} placeholder="Optional: My Projects (comma-separated)" className="w-full bg-brand-tertiary border-brand-tertiary rounded-md p-3 focus:ring-brand-neon focus:border-brand-neon transition-colors" />
            </div>

            <div className="flex space-x-4">
                <button type="button" onClick={onBack} className="w-full flex justify-center py-3 px-4 border border-brand-tertiary rounded-md shadow-sm text-sm font-bold text-gray-300 bg-brand-tertiary hover:bg-opacity-80 transition-all duration-200">
                    Back
                </button>
                <button type="button" onClick={handleNext} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-brand-neon hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-neon transition-all duration-200">
                    Next
                </button>
            </div>
        </div>
    );
};

export default OnboardingStep2;