import { useState } from 'react';
import { ArrowRight, UserPlus, UserCheck } from 'lucide-react';
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
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const isSelected = (userId: string) => selectedUsers.includes(userId);

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="min-h-screen px-6 py-12 pb-32">
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
                  className="w-full bg-card p-4 rounded-xl hover:bg-secondary transition-all flex items-center gap-4"
                >
                  <div className="relative">
                    <ProfileAvatar 
                      username={user.displayName}
                      profilePicture={user.profilePicture}
                      size="lg"
                    />
                    {isSelected(user.id) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                      >
                        <UserCheck className="w-4 h-4 text-accent-foreground" strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.displayName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.handle}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {user.bio}
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {formatNumber(user.followerCount)} followers
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-6">
        <button
          onClick={() => onComplete(selectedUsers)}
          disabled={selectedUsers.length === 0}
          className={`w-full py-4 rounded-xl font-semibold transition-all ${
            selectedUsers.length === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-accent text-accent-foreground hover:opacity-90'
          }`}
        >
          {selectedUsers.length === 0 
            ? 'Select at least one'
            : `Follow ${selectedUsers.length} ${selectedUsers.length === 1 ? 'user' : 'users'}`
          }
        </button>
      </div>
    </div>
  );
}