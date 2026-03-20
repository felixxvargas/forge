import { useState, useRef } from 'react';
import { X, Upload, Settings, Crown, Shield, Check, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { User, Platform, SocialPlatform } from '../data/mockData';
import { mockCommunities } from '../data/mockData';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ConfirmationModal } from '../components/ConfirmationModal';

const BIO_MAX_LENGTH = 150;
const ABOUT_MAX_LENGTH = 500;

export function EditProfile() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  
  const [formData, setFormData] = useState({
    displayName: currentUser.display_name || currentUser.displayName || '',
    pronouns: currentUser.pronouns || '',
    bio: currentUser.bio || '',
    about: currentUser.about || currentUser.bio || '',
    profilePicture: currentUser.profile_picture || currentUser.profilePicture || null,
    platforms: currentUser.platforms || [],
    platformHandles: currentUser.platform_handles || currentUser.platformHandles || {},
    showPlatformHandles: currentUser.show_platform_handles || currentUser.showPlatformHandles || {},
    socialPlatforms: currentUser.social_platforms || currentUser.socialPlatforms || [],
    socialHandles: currentUser.social_handles || currentUser.socialHandles || {},
    showSocialHandles: currentUser.show_social_handles || currentUser.showSocialHandles || {},
    displayedCommunities: currentUser.displayed_communities || currentUser.displayedCommunities || (currentUser.communities || []).slice(0, 3).map((m: any) => m.community_id || m.communityId)
  });

  // Ref so handleSave always reads the latest uploaded URL regardless of
  // whether React has flushed the setFormData state update yet.
  const profilePictureRef = useRef<string | null | undefined>(
    currentUser.profile_picture || currentUser.profilePicture || null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allPlatforms: Platform[] = ['steam', 'playstation', 'nintendo', 'xbox', 'pc', 'battlenet', 'riot'];
  const allSocial: SocialPlatform[] = ['x', 'instagram', 'tiktok', 'bluesky', 'tumblr', 'threads', 'rednote', 'upscrolled', 'discord'];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCurrentUser({
        display_name: formData.displayName,
        pronouns: formData.pronouns,
        bio: formData.bio,
        about: formData.about,
        // Use ref as authoritative source — it's updated synchronously on
        // upload/delete, whereas formData state update may not have flushed yet.
        profile_picture: profilePictureRef.current ?? formData.profilePicture,
        platforms: formData.platforms,
        platform_handles: formData.platformHandles,
        show_platform_handles: formData.showPlatformHandles,
        social_platforms: formData.socialPlatforms,
        social_handles: formData.socialHandles,
        show_social_handles: formData.showSocialHandles,
        displayed_communities: formData.displayedCommunities,
      });
      navigate('/profile');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureUpload = (url: string) => {
    profilePictureRef.current = url;        // synchronous — available immediately
    setFormData(prev => ({ ...prev, profilePicture: url }));
  };

  const handleDeleteProfilePicture = () => {
    profilePictureRef.current = null;
    setFormData(prev => ({ ...prev, profilePicture: undefined }));
  };

  const togglePlatform = (platform: Platform) => {
    setFormData(prev => {
      const platforms = prev.platforms || [];
      return {
        ...prev,
        platforms: platforms.includes(platform)
          ? platforms.filter(p => p !== platform)
          : [...platforms, platform]
      };
    });
  };

  const toggleSocial = (social: SocialPlatform) => {
    setFormData(prev => {
      const socialPlatforms = prev.socialPlatforms || [];
      return {
        ...prev,
        socialPlatforms: socialPlatforms.includes(social)
          ? socialPlatforms.filter(s => s !== social)
          : [...socialPlatforms, social]
      };
    });
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

  const updatePlatformHandle = (platform: Platform, handle: string) => {
    setFormData(prev => ({
      ...prev,
      platformHandles: {
        ...prev.platformHandles,
        [platform]: handle
      }
    }));
  };

  const toggleShowPlatformHandle = (platform: Platform) => {
    setFormData(prev => ({
      ...prev,
      showPlatformHandles: {
        ...prev.showPlatformHandles,
        [platform]: !prev.showPlatformHandles[platform]
      }
    }));
  };

  const updateSocialHandle = (social: SocialPlatform, handle: string) => {
    setFormData(prev => ({
      ...prev,
      socialHandles: {
        ...prev.socialHandles,
        [social]: handle
      }
    }));
  };

  const toggleShowSocialHandle = (social: SocialPlatform) => {
    setFormData(prev => ({
      ...prev,
      showSocialHandles: {
        ...prev.showSocialHandles,
        [social]: !prev.showSocialHandles[social]
      }
    }));
  };

  const getPlatformLabel = (platform: Platform): string => {
    const labels: Record<Platform, string> = {
      'steam': 'Steam',
      'playstation': 'PlayStation',
      'nintendo': 'Nintendo',
      'xbox': 'Xbox',
      'pc': 'PC',
      'battlenet': 'Battle.net',
      'riot': 'Riot',
      'epic': 'Epic Games',
      'ea': 'EA',
      'gog': 'GOG',
      'ubisoft': 'Ubisoft',
      'rockstar': 'Rockstar'
    };
    return labels[platform] || platform;
  };

  const getSocialLabel = (social: SocialPlatform): string => {
    const labels: Record<SocialPlatform, string> = {
      'bluesky': 'Bluesky',
      'tumblr': 'Tumblr',
      'x': 'X',
      'tiktok': 'TikTok',
      'instagram': 'Instagram',
      'threads': 'Threads',
      'rednote': 'Red Note',
      'upscrolled': 'Upscrolled',
      'discord': 'Discord'
    };
    return labels[social] || social;
  };

  const handleEditPlatforms = () => {
    updateCurrentUser(formData);
    navigate('/gaming-platforms');
  };

  const handleEditSocial = () => {
    updateCurrentUser(formData);
    navigate('/social-integrations');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
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
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-sm mb-2">Profile Picture</label>
          <div className="flex items-center gap-4">
            <ProfileAvatar 
              username={formData.displayName}
              profilePicture={formData.profilePicture}
              size="xl"
            />
            <div className="flex-1 space-y-2">
              <ImageUpload
                onUpload={handleProfilePictureUpload}
                accept="image/*"
                maxSizeMB={10}
                bucketType="avatar"
              />
              {formData.profilePicture && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Profile Picture
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm mb-2">Display Name</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Pronouns */}
        <div>
          <label className="block text-sm mb-2">Pronouns (optional)</label>
          <input
            type="text"
            value={formData.pronouns}
            onChange={(e) => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
            placeholder="e.g., she/her, he/him, they/them"
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm">Bio</label>
            <span className={`text-xs ${
              (formData.bio || '').length > BIO_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {(formData.bio || '').length}/{BIO_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            maxLength={BIO_MAX_LENGTH}
            rows={3}
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* About */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm">About</label>
            <span className={`text-xs ${
              (formData.about || '').length > ABOUT_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {(formData.about || '').length}/{ABOUT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            value={formData.about}
            onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
            maxLength={ABOUT_MAX_LENGTH}
            rows={6}
            placeholder="Write a longer description about yourself, your gaming interests, and anything else you'd like others to know..."
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* Gaming Platforms */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm">Gaming Platforms</label>
            <button
              onClick={handleEditPlatforms}
              className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </div>
          <div className="space-y-3">
            {(formData.platforms || []).map(platform => (
              <div key={platform} className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{getPlatformLabel(platform)}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-muted-foreground">Show Handle</span>
                    <input
                      type="checkbox"
                      checked={formData.showPlatformHandles[platform] || false}
                      onChange={() => toggleShowPlatformHandle(platform)}
                      className="w-4 h-4 accent-accent"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.platformHandles[platform] || ''}
                  onChange={(e) => updatePlatformHandle(platform, e.target.value)}
                  placeholder={`Your ${getPlatformLabel(platform)} username`}
                  className="w-full px-3 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Social Media */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm">Social Media Accounts</label>
            <button
              onClick={handleEditSocial}
              className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Add your social media handles and choose which ones to display on your profile
          </p>
          <div className="space-y-3">
            {(formData.socialPlatforms || []).map(social => (
              <div key={social} className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{getSocialLabel(social)}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-muted-foreground">Show on Profile</span>
                    <input
                      type="checkbox"
                      checked={formData.showSocialHandles[social] || false}
                      onChange={() => toggleShowSocialHandle(social)}
                      className="w-4 h-4 accent-accent"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <input
                    type="text"
                    value={formData.socialHandles[social] || ''}
                    onChange={(e) => updateSocialHandle(social, e.target.value)}
                    placeholder={`Your ${getSocialLabel(social)} handle`}
                    className="flex-1 px-3 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Communities to Display */}
        {currentUser.communities && currentUser.communities.length > 0 && (
          <div>
            <label className="block text-sm mb-2">Communities to Display (Max 3)</label>
            <p className="text-xs text-muted-foreground mb-3">
              Select up to 3 communities to show on your profile
            </p>
            <div className="space-y-2">
              {currentUser.communities.map(membership => {
                const community = mockCommunities.find(c => c.id === membership.communityId);
                if (!community) return null;

                const isSelected = (formData.displayedCommunities || []).includes(membership.communityId);
                const canSelect = !isSelected && (formData.displayedCommunities || []).length < 3;

                return (
                  <button
                    key={membership.communityId}
                    onClick={() => toggleCommunity(membership.communityId)}
                    disabled={!isSelected && !canSelect}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-accent/20 border-2 border-accent'
                        : canSelect
                        ? 'bg-secondary border-2 border-transparent hover:bg-secondary/80'
                        : 'bg-secondary/50 border-2 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">{community.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{community.name}</p>
                        {membership.role === 'creator' && (
                          <Crown className="w-4 h-4 text-accent" title="Creator" />
                        )}
                        {membership.role === 'moderator' && (
                          <Shield className="w-4 h-4 text-accent" title="Moderator" />
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Profile Picture Confirmation */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProfilePicture}
        title="Remove Profile Picture"
        message="Are you sure you want to remove your profile picture? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
}