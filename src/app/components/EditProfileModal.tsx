import { useState, useEffect } from 'react';
import { X, Upload, Settings, Crown, Shield, Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { User, Platform, SocialPlatform } from '../data/data';
import { communities } from '../data/data';

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: Partial<User>) => void;
}

export function EditProfileModal({ user, isOpen, onClose, onSave }: EditProfileModalProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    pronouns: user.pronouns || '',
    bio: user.bio,
    platforms: user.platforms,
    socialPlatforms: user.socialPlatforms,
    displayedCommunities: user.displayedCommunities || (user.communities || []).slice(0, 3).map(m => m.communityId)
  });

  const allPlatforms: Platform[] = ['steam', 'epic', 'ea', 'playstation', 'nintendo', 'xbox', 'pc', 'mac', 'linux', 'gog', 'ubisoft', 'rockstar'];
  const allSocial: SocialPlatform[] = ['x', 'instagram', 'tiktok', 'bluesky', 'tumblr', 'threads', 'rednote', 'upscrolled'];

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const togglePlatform = (platform: Platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const toggleSocial = (social: SocialPlatform) => {
    setFormData(prev => ({
      ...prev,
      socialPlatforms: prev.socialPlatforms.includes(social)
        ? prev.socialPlatforms.filter(s => s !== social)
        : [...prev.socialPlatforms, social]
    }));
  };

  const toggleCommunity = (communityId: string) => {
    setFormData(prev => {
      const current = prev.displayedCommunities || [];
      if (current.includes(communityId)) {
        // Remove community
        return {
          ...prev,
          displayedCommunities: current.filter(id => id !== communityId)
        };
      } else {
        // Add community (max 3)
        if (current.length >= 3) {
          return prev; // Don't add if already at max
        }
        return {
          ...prev,
          displayedCommunities: [...current, communityId]
        };
      }
    });
  };

  const handleEditPlatforms = () => {
    onSave(formData);
    onClose();
    navigate('/gaming-platforms');
  };

  const handleEditSocial = () => {
    onSave(formData);
    onClose();
    navigate('/social-integrations');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">Edit Profile</h2>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Save
          </button>
        </div>

        {/* Content */}
        <div className="w-full max-w-2xl mx-auto p-4 space-y-6 pb-20">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm mb-2">Profile Picture</label>
            <div className="flex items-center gap-4">
              <img 
                src={user.profilePicture} 
                alt={user.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm mb-2">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {/* Pronouns */}
          <div>
            <label className="block text-sm mb-2">Pronouns (optional)</label>
            <input
              type="text"
              value={formData.pronouns}
              onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
              placeholder="e.g., they/them"
              className="w-full px-3 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              placeholder="Tell us about yourself... Use @handle to mention other users"
              className="w-full px-3 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tip: Use @username to mention other users
            </p>
          </div>

          {/* Gaming Platforms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">Gaming Platforms</label>
              <button
                onClick={handleEditPlatforms}
                className="p-1.5 text-accent hover:text-accent/80 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map(platform => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    formData.platforms.includes(platform)
                      ? 'bg-secondary border-2 border-accent text-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Social Integrations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">Social Media Integrations</label>
              <button
                onClick={handleEditSocial}
                className="p-1.5 text-accent hover:text-accent/80 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSocial.map(social => (
                <button
                  key={social}
                  onClick={() => toggleSocial(social)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    formData.socialPlatforms.includes(social)
                      ? 'bg-secondary border-2 border-accent text-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {social}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Enable integrations to import posts and display your profiles
            </p>
          </div>

          {/* Groups */}
          {user.communities && user.communities.length > 0 && (
            <div>
              <label className="block text-sm mb-2">Profile Groups (Max 3)</label>
              <p className="text-xs text-muted-foreground mb-3">
                Select up to 3 groups to display on your profile
              </p>
              <div className="flex flex-wrap gap-2">
                {user.communities.map(membership => {
                  const community = communities.find(c => c.id === membership.communityId);
                  if (!community) return null;
                  
                  const isSelected = (formData.displayedCommunities || []).includes(membership.communityId);
                  const isAtMax = (formData.displayedCommunities || []).length >= 3 && !isSelected;
                  
                  return (
                    <button
                      key={membership.communityId}
                      onClick={() => toggleCommunity(membership.communityId)}
                      disabled={isAtMax}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-secondary border-2 border-accent text-foreground'
                          : isAtMax
                          ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <span>{community.icon}</span>
                      <span>{community.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      {membership.role === 'creator' && (
                        <Crown className="w-3.5 h-3.5 text-accent" title="Creator" />
                      )}
                      {membership.role === 'moderator' && (
                        <Shield className="w-3.5 h-3.5 text-accent" title="Moderator" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(formData.displayedCommunities || []).length}/3 groups selected
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}