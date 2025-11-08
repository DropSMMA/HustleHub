import React, { useState } from "react";
import { UserProfile } from "@/app/types";
import { BackIcon } from "./icons/BackIcon";
import ConfirmationModal from "./ConfirmationModal";

// A simple toggle switch component for reusability
const ToggleSwitch: React.FC<{
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ label, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-gray-200">{label}</span>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
        enabled ? "bg-brand-neon" : "bg-brand-tertiary"
      }`}
    >
      <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

interface SettingsProps {
  userProfile: UserProfile | null;
  onBack: () => void;
  // In a real app, you'd have more specific update functions
  onUpdateEmail: (email: string) => void;
}

const Settings: React.FC<SettingsProps> = ({
  userProfile,
  onBack,
  onUpdateEmail,
}) => {
  // Mock settings state
  const [email, setEmail] = useState("alexdevito@shipfast.com");
  const [notifications, setNotifications] = useState({
    kudos: true,
    comments: true,
    challenges: false,
    connections: true,
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!userProfile) return null;

  const handleNotificationChange = (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteAccount = () => {
    // In a real app, this would trigger a deletion flow
    console.log("Account deletion initiated.");
    setIsDeleteModalOpen(false);
    // Maybe log out and redirect
  };

  return (
    <>
      <div className="container mx-auto px-4 max-w-lg space-y-6 animate-fade-in">
        <div className="relative flex items-center">
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white p-2 absolute -left-2"
          >
            <BackIcon />
          </button>
          <h2 className="text-xl font-bold text-center w-full">Settings</h2>
        </div>

        {/* Account Section */}
        <div className="bg-brand-secondary rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-lg text-white">Account</h3>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-400"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-brand-tertiary border-transparent rounded-md p-3 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
            />
          </div>
          <button className="w-full text-left bg-brand-tertiary p-3 rounded-md hover:bg-opacity-80 transition-colors">
            Change Password
          </button>
        </div>

        {/* Notifications Section */}
        <div className="bg-brand-secondary rounded-xl p-4 divide-y divide-brand-tertiary">
          <h3 className="font-bold text-lg text-white pb-2">Notifications</h3>
          <ToggleSwitch
            label="Kudos"
            enabled={notifications.kudos}
            onChange={(val) => handleNotificationChange("kudos", val)}
          />
          <ToggleSwitch
            label="Comments & Replies"
            enabled={notifications.comments}
            onChange={(val) => handleNotificationChange("comments", val)}
          />
          <ToggleSwitch
            label="New Challenges"
            enabled={notifications.challenges}
            onChange={(val) => handleNotificationChange("challenges", val)}
          />
          <ToggleSwitch
            label="Connection Requests"
            enabled={notifications.connections}
            onChange={(val) => handleNotificationChange("connections", val)}
          />
        </div>

        {/* Account Actions Section */}
        <div className="space-y-3 pt-4">
          <button className="w-full text-center bg-brand-secondary hover:bg-brand-tertiary text-gray-300 font-bold py-3 px-4 rounded-lg transition-colors">
            Log Out
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full text-center bg-transparent hover:bg-red-900/50 text-red-500 font-bold py-3 px-4 rounded-lg transition-colors border-2 border-red-500/50 hover:border-red-500"
          >
            Delete Account
          </button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure? This will permanently delete your account and all of your data. This action cannot be undone."
        confirmText="Yes, delete my account"
      />
    </>
  );
};

export default Settings;
