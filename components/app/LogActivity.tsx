import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { Activity, ActivityType, UserProfile } from '@/app/types';
import { TagIcon } from './icons/TagIcon';
import { ChartIcon } from './icons/ChartIcon';
import { ImageIcon } from './icons/ImageIcon';
import { CloseIcon } from './icons/CloseIcon';

interface LogActivityProps {
    isOpen: boolean;
    onClose: () => void;
    onLogActivity: (activity: Omit<Activity, 'id' | 'kudos' | 'comments' | 'timestamp' | 'username'>) => void;
    userProfile: UserProfile | null;
}

const activityTypes = Object.values(ActivityType);

const LogActivity: React.FC<LogActivityProps> = ({ isOpen, onClose, onLogActivity, userProfile }) => {
    const [type, setType] = useState<ActivityType | null>(null);
    const [description, setDescription] = useState('');
    const [stats, setStats] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setType(null);
        setDescription('');
        setStats('');
        setImageFile(null);
        setImagePreview(null);
        setShowTypeSelector(false);
        setIsSubmitting(false);
        setShowSuccess(false);
    };

    useEffect(() => {
        if (!isOpen) {
            setTimeout(resetState, 300); // Delay reset to allow for closing animation
        }
    }, [isOpen]);

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSelectType = (selectedType: ActivityType) => {
        setType(selectedType);
        setShowTypeSelector(false);
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!type || !description || isSubmitting) return;

        setIsSubmitting(true);

        const newActivity = {
            user: userProfile?.name || 'You',
            avatar: userProfile?.avatar || 'https://i.pravatar.cc/150?u=currentuser',
            type,
            description,
            stats,
            image: imagePreview || undefined,
        };

        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        onLogActivity(newActivity);
        
        setShowSuccess(true);
        // The parent will call onClose, which triggers the reset
    };
    
    if (!userProfile) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black/80 flex items-end justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div 
                className={`bg-brand-secondary rounded-t-2xl w-full max-w-lg transform transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} 
                onClick={e => e.stopPropagation()}
            >
                 <div className="p-4">
                    <div className="flex items-center justify-between pb-3">
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-brand-tertiary hover:text-white"><CloseIcon /></button>
                        <h2 className="text-lg font-bold">New Hustle</h2>
                        <button 
                            onClick={handleSubmit} 
                            disabled={!description || !type || isSubmitting} 
                            className="bg-brand-neon text-brand-primary font-bold py-2 px-5 rounded-lg transition-all duration-200 disabled:bg-brand-tertiary disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-green-400"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
                            ) : 'Post'}
                        </button>
                    </div>

                    <div className="flex space-x-3 mt-4">
                        <img src={userProfile.avatar} alt="Your avatar" className="h-10 w-10 rounded-full object-cover" />
                        <div className="flex-1">
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder={`What's your hustle, ${userProfile.name}?`}
                                className="w-full bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none resize-none"
                                rows={3}
                            />
                            <div className="flex flex-wrap gap-2 mt-1">
                               {type && <span className="text-xs font-semibold bg-brand-neon/10 text-brand-neon px-3 py-1 rounded-full animate-pop">{type}</span>}
                               {stats && <span className="text-xs font-semibold bg-brand-tertiary text-gray-300 px-3 py-1 rounded-full animate-pop">{stats}</span>}
                            </div>
                            {imagePreview && (
                                <div className="mt-3 relative w-full h-48 rounded-lg overflow-hidden">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/80"><CloseIcon /></button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-brand-tertiary/50 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setShowTypeSelector(!showTypeSelector)} className={`p-2 rounded-full transition-colors ${showTypeSelector || type ? 'text-brand-neon bg-brand-neon/10' : 'text-gray-400 hover:bg-brand-tertiary'}`}>
                                <TagIcon />
                            </button>
                            <button onClick={() => imageInputRef.current?.click()} className={`p-2 rounded-full transition-colors ${imagePreview ? 'text-brand-neon bg-brand-neon/10' : 'text-gray-400 hover:bg-brand-tertiary'}`}>
                                <ImageIcon />
                            </button>
                             <input ref={imageInputRef} id="image-upload" type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                             <div className="flex items-center space-x-2 text-gray-400">
                                <ChartIcon />
                                <input 
                                    type="text" 
                                    value={stats} 
                                    onChange={e => setStats(e.target.value)} 
                                    placeholder="Stats (e.g., 5km)" 
                                    className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-32"
                                />
                            </div>
                        </div>
                    </div>

                    {showTypeSelector && (
                        <div className="mt-4 border-t border-brand-tertiary/50 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
                            {activityTypes.map(activityType => (
                                <button
                                    key={activityType}
                                    type="button"
                                    onClick={() => handleSelectType(activityType)}
                                    className="p-3 rounded-lg font-semibold text-center transition-all duration-200 bg-brand-tertiary hover:bg-opacity-80 text-white"
                                >
                                    {activityType}
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default LogActivity;