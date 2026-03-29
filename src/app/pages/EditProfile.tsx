import { useState, useRef } from 'react';
import { X, Upload, Settings, Crown, Shield, Check, Trash2, Plus, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Platform, SocialPlatform } from '../data/data';
import { useAppData } from '../context/AppDataContext';
import { ImageUpload } from '../components/ImageUpload';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { GroupIcon } from '../components/GroupIcon';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PlatformIcon } from '../components/PlatformIcon';

const BIO_MAX_LENGTH = 150;
const ABOUT_MAX_LENGTH = 500;

export function EditProfile() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser, groups } = useAppData();
  
  // Handle change restriction: once every 14 days
  const rawHandle = (currentUser.handle || '').replace(/^@/, '');
  const handleChangedAt: string | null = currentUser.handle_changed_at ?? null;
  const daysSinceHandleChange = handleChangedAt
    ? (Date.now() - new Date(handleChangedAt).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  const canChangeHandle = daysSinceHandleChange >= 14;
  const nextHandleChangeDate = handleChangedAt && !canChangeHandle
    ? new Date(new Date(handleChangedAt).getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;

  const [formData, setFormData] = useState({
    handle: rawHandle,
    displayName: currentUser.display_name || currentUser.displayName || '',
    pronouns: currentUser.pronouns || '',
    bio: currentUser.bio || '',
    about: currentUser.about || '',
    profilePicture: currentUser.profile_picture || currentUser.profilePicture || null,
    platforms: currentUser.platforms || [],
    platformHandles: currentUser.platform_handles || currentUser.platformHandles || {},
    showPlatformHandles: currentUser.show_platform_handles || currentUser.showPlatformHandles || {},
    socialPlatforms: currentUser.social_platforms || currentUser.socialPlatforms || [],
    socialHandles: currentUser.social_handles || currentUser.socialHandles || {} as Record<string, string>,
    showSocialHandles: currentUser.show_social_handles || currentUser.showSocialHandles || {} as Record<string, boolean>,
    displayedCommunities: currentUser.displayed_communities || currentUser.displayedCommunities || (currentUser.communities || []).slice(0, 4).map((m: any) => m.community_id || m.communityId),
    profileLinks: (currentUser.profile_links || []) as { url: string; title: string }[]
  });

  // Ref so handleSave always reads the latest uploaded URL regardless of
  // whether React has flushed the setFormData state update yet.
  const profilePictureRef = useRef<string | null | undefined>(
    currentUser.profile_picture || currentUser.profilePicture || null
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [handleError, setHandleError] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  const allPlatforms: Platform[] = ['steam', 'playstation', 'nintendo', 'xbox', 'pc', 'mac', 'linux'];
  const allSocial: SocialPlatform[] = ['bluesky', 'mastodon', 'x', 'instagram', 'tiktok', 'threads', 'discord', 'tumblr', 'rednote', 'upscrolled'];

  const handleSave = async () => {
    setHandleError('');
    const trimmedHandle = formData.handle.trim().replace(/^@/, '');
    const handleChanged = trimmedHandle !== rawHandle;

    if (handleChanged) {
      if (!canChangeHandle) {
        setHandleError(`You can change your handle again on ${nextHandleChangeDate?.toLocaleDateString()}.`);
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedHandle)) {
        setHandleError('Handle must be 3–20 characters using only letters, numbers, and underscores.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updates: Record<string, any> = {
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
        profile_links: formData.profileLinks,
      };
      if (handleChanged) {
        updates.handle = trimmedHandle;
        updates.handle_changed_at = new Date().toISOString();
      }
      await updateCurrentUser(updates);
      navigate('/profile');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
        setHandleError('That handle is already taken. Please choose a different one.');
      } else {
        alert('Failed to save profile. Please try again.');
      }
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

  const addLink = () => {
    const rawUrl = newLinkUrl.trim();
    if (!rawUrl) return;
    const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
    const title = newLinkTitle.trim();
    setFormData(prev => ({
      ...prev,
      profileLinks: [...(prev.profileLinks || []), { url, title }].slice(0, 10),
    }));
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      profileLinks: (prev.profileLinks || []).filter((_, i) => i !== index),
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
        // Add community (max 4)
        if (current.length >= 4) {
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
      'mac': 'Mac Gaming',
      'linux': 'Linux Gaming',
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
      'mastodon': 'Mastodon',
      'tumblr': 'Tumblr',
      'x': 'X',
      'tiktok': 'TikTok',
      'instagram': 'Instagram',
      'threads': 'Threads',
      'rednote': 'Red Note',
      'upscrolled': 'Upscrolled',
      'discord': 'Discord',
      'twitch': 'Twitch',
      'reddit': 'Reddit',
      'facebook': 'Facebook',
      'github': 'GitHub',
      'youtube': 'YouTube',
      'spotify': 'Spotify',
      'youtubemusic': 'YouTube Music',
      'soundcloud': 'SoundCloud',
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
          disabled={isSaving || isImageUploading}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : isImageUploading ? 'Uploading...' : 'Save'}
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
                onUploadingChange={setIsImageUploading}
                accept="image/*"
                maxSizeMB={10}
                bucketType="avatar"
              />
              {formData.profilePicture && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
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
            style={{ fontSize: '16px' }}
            className="w-full px-4 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Handle */}
        <div>
          <label className="block text-sm mb-2">Username</label>
          {canChangeHandle ? (
            <>
              <div className="flex items-center bg-secondary rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-accent">
                <span className="px-3 py-2 text-muted-foreground select-none">@</span>
                <input
                  type="text"
                  value={formData.handle}
                  onChange={(e) => {
                    setHandleError('');
                    setFormData(prev => ({ ...prev, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }));
                  }}
                  placeholder="your_handle"
                  maxLength={20}
                  style={{ fontSize: '16px' }}
                  className="flex-1 pr-4 py-2 bg-transparent focus:outline-none"
                />
              </div>
              {handleError ? (
                <p className="text-xs text-destructive mt-1">{handleError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Can be changed once every 2 weeks.</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center bg-secondary rounded-lg overflow-hidden opacity-60">
                <span className="px-3 py-2 text-muted-foreground select-none">@</span>
                <input
                  disabled
                  value={formData.handle}
                  style={{ fontSize: '16px' }}
                  className="flex-1 pr-4 py-2 bg-transparent cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Next change available: {nextHandleChangeDate?.toLocaleDateString()}
              </p>
            </>
          )}
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
            <label className="text-sm">About <span className="font-normal opacity-50 text-xs">(Optional)</span></label>
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

        {/* Links — up to 10 custom URLs */}
        <div>
          <label className="block text-sm mb-2">Links <span className="text-muted-foreground font-normal text-xs">(up to 10)</span></label>

          {/* Existing links */}
          {(formData.profileLinks || []).length > 0 && (
            <div className="space-y-2 mb-3">
              {(formData.profileLinks || []).map((link, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-secondary rounded-lg">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.title || (() => { try { return new URL(link.url).hostname.replace('www.', ''); } catch { return link.url; } })()}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                  <button onClick={() => removeLink(i)} className="p-1 hover:bg-destructive/20 rounded transition-colors shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new link */}
          {(formData.profileLinks || []).length < 10 && (
            <div className="space-y-2">
              <input
                type="url"
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLink()}
                placeholder="https://yoursite.com"
                className="w-full px-3 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={e => setNewLinkTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLink()}
                  placeholder="Display name (optional)"
                  className="flex-1 px-3 py-2 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                />
                <button
                  onClick={addLink}
                  disabled={!newLinkUrl.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium disabled:opacity-40 transition-colors hover:bg-accent/90"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          )}
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
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={platform} className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{getPlatformLabel(platform)}</span>
                  </div>
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
                {formData.showPlatformHandles[platform] && (
                  <input
                    type="text"
                    value={formData.platformHandles[platform] || ''}
                    onChange={(e) => updatePlatformHandle(platform, e.target.value)}
                    placeholder={`Your ${getPlatformLabel(platform)} username`}
                    className="w-full px-3 py-2 bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                )}
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
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={social} className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{getSocialLabel(social)}</span>
                  </div>
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
                {formData.showSocialHandles[social] && (
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
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Groups to Display */}
        {currentUser.communities && currentUser.communities.length > 0 && (
          <div>
            <label className="block text-sm mb-2">Groups to Display (Max 4)</label>
            <p className="text-xs text-muted-foreground mb-3">
              Select up to 4 groups to show on your profile
            </p>
            <div className="space-y-2">
              {currentUser.communities.map((membership: any) => {
                const communityId = membership.community_id || membership.communityId;
                const community = groups.find((c: any) => c.id === communityId);
                if (!community) return null;

                const isSelected = (formData.displayedCommunities || []).includes(communityId);
                const canSelect = !isSelected && (formData.displayedCommunities || []).length < 4;

                return (
                  <button
                    key={membership.communityId}
                    onClick={() => toggleCommunity(communityId)}
                    disabled={!isSelected && !canSelect}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-accent/20 border-2 border-accent'
                        : canSelect
                        ? 'bg-secondary border-2 border-transparent hover:bg-secondary/80'
                        : 'bg-secondary/50 border-2 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {community.profile_picture
                      ? <img src={community.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"><GroupIcon iconKey={community.icon} className="w-5 h-5" /></div>
                    }
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