import { X } from 'lucide-react';
import { User } from '../types';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedUser: User) => void;
  onLogout: () => void;
}

export default function SettingsModal({ isOpen, onClose, user, onSave, onLogout }: SettingsModalProps) {
  const [formData, setFormData] = useState<User>(user);
  const [isFetchingAvatar, setIsFetchingAvatar] = useState(false);

  const [lastFetchedUsername, setLastFetchedUsername] = useState<string>(user.username);

  useEffect(() => {
    if (!isOpen) return;
    if (formData.username.length < 3) return;

    // Use a very short debounce for "instant" feel
    const timeoutId = setTimeout(() => {
      fetchAvatar(formData.username);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [formData.username, isOpen]);

  const fetchAvatar = async (username: string) => {
    if (!username || username.length < 3) return;
    // Don't refetch if the current avatar already matches a valid fetch attempt for this username
    // and we aren't currently fetching.
    if (username === lastFetchedUsername && !isFetchingAvatar) return;

    setIsFetchingAvatar(true);
    try {
      const response = await fetch(`/api/user-avatar/${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      
      if (data.avatarUrl) {
        setLastFetchedUsername(username);
        setFormData(prev => ({ 
          ...prev, 
          avatarUrl: data.avatarUrl,
          displayName: data.displayName || prev.displayName 
        }));
      }
    } catch (error) {
      console.error("Failed to fetch avatar:", error);
    } finally {
      setIsFetchingAvatar(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[28px] w-full max-w-[460px] shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-gray-100">
          <h3 className="text-xl font-bold">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black shadow-lg bg-black relative">
              <img 
                src={formData.avatarUrl || "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-C318C9101602477C9F9A7C91ECEEE44A-Png/150/150/AvatarHeadshot/Webp/noFilter"} 
                alt="Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-C318C9101602477C9F9A7C91ECEEE44A-Png/150/150/AvatarHeadshot/Webp/noFilter") {
                    target.src = "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-C318C9101602477C9F9A7C91ECEEE44A-Png/150/150/AvatarHeadshot/Webp/noFilter";
                  }
                }}
              />
              {isFetchingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isFetchingAvatar ? (
                <span className="text-blue-500 animate-pulse">Syncing with Roblox...</span>
              ) : (
                "Avatar Preview"
              )}
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-500">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-base focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Display Name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-500">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-base focus:outline-none focus:border-blue-500 transition-colors pr-10"
                  placeholder="Username"
                />
                {isFetchingAvatar && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-500">Robux Balance</label>
              <input
                type="number"
                value={formData.robux}
                onChange={(e) => setFormData({ ...formData, robux: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-base focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Balance"
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              disabled={isFetchingAvatar}
              onClick={handleSave}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isFetchingAvatar ? "Updating..." : "Save Changes"}
            </button>
            <button
              onClick={onLogout}
              className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-full hover:bg-gray-200 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
