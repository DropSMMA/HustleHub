import React, { useState } from 'react';
import { FocusArea } from '@/app/types';

interface FocusProps {
    onBack: () => void;
    onFinish: (focuses: FocusArea[]) => void;
}

const allFocuses = Object.values(FocusArea);

const OnboardingFocus: React.FC<FocusProps> = ({ onBack, onFinish }) => {
    const [selectedFocuses, setSelectedFocuses] = useState<FocusArea[]>([]);

    const toggleFocus = (focus: FocusArea) => {
        setSelectedFocuses(prev =>
            prev.includes(focus)
                ? prev.filter(f => f !== focus)
                : [...prev, focus].slice(0, 3) // Limit to 3 selections
        );
    };

    const handleFinish = () => {
        if (selectedFocuses.length === 0) {
            alert('Please select at least one focus area.');
            return;
        }
        onFinish(selectedFocuses);
    };

    return (
        <div className="bg-brand-secondary p-8 rounded-xl shadow-lg space-y-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Define Your Focus
                </h1>
                <p className="text-gray-400 mt-1">What are you building? (Select up to 3)</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {allFocuses.map(focus => (
                    <button
                        key={focus}
                        type="button"
                        onClick={() => toggleFocus(focus)}
                        className={`p-4 rounded-lg font-semibold text-left transition-all duration-200 border-2 ${
                            selectedFocuses.includes(focus)
                                ? 'bg-brand-neon/10 border-brand-neon text-brand-neon'
                                : 'bg-brand-tertiary border-transparent hover:border-gray-500'
                        }`}
                    >
                        {focus}
                    </button>
                ))}
            </div>

            <div className="flex space-x-4">
                <button type="button" onClick={onBack} className="w-full flex justify-center py-3 px-4 border border-brand-tertiary rounded-md shadow-sm text-sm font-bold text-gray-300 bg-brand-tertiary hover:bg-opacity-80 transition-all duration-200">
                    Back
                </button>
                <button type="button" onClick={handleFinish} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-brand-neon hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-neon transition-all duration-200">
                    Finish
                </button>
            </div>
        </div>
    );
};

export default OnboardingFocus;