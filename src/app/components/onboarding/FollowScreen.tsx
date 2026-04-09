import { useState } from 'react';
import { motion } from 'motion/react';
import { ProfileAvatar } from '../ProfileAvatar';
import { formatNumber } from '../../utils/formatNumber';
import type { User } from '../../data/data';

interface FollowScreenProps {
  users: User[];
  onComplete: (selectedUserIds: string[]) => void;
}

export function FollowScreen({ users, onComplete }: FollowScreenProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const isSelected = (userId: string) => selectedUsers.includes(userId);

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="min-h-screen px-6 py-12 pb-32">
        <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Follow gamers</h1>
          <p className="text-muted-foreground mb-8">
            Connect with gamers who share your interests
          </p>

          <div className="space-y-3">
            {users.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <button
                  onClick={() => toggleUser(user.id)}
                  className={`w-full p-4 rounded-xl transition-all flex items-center gap-4 border-2 ${
                    isSelected(user.id)
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-card border-transparent hover:bg-secondary'
                  }`}
                >
                  <ProfileAvatar
                    username={user.displayName}
                    profilePicture={user.profilePicture}
                    size="lg"
                    userId={user.id}
                  />

                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${isSelected(user.id) ? 'text-accent' : ''}`}>
                      {user.displayName}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.handle}</p>
                    {user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {user.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(user.followerCount)} followers
                    </span>
                    {isSelected(user.id) && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-xs font-bold text-accent"
                      >
                        Following ✓
                      </motion.span>
                    )}
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => onComplete(selectedUsers)}
            className="w-full py-4 rounded-xl font-semibold transition-all bg-accent text-accent-foreground hover:opacity-90"
          >
            {selectedUsers.length === 0
              ? 'Skip'
              : `Follow ${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
