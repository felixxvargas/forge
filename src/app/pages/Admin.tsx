import { useState } from 'react';
import { useNavigate } from 'react-router';
import { adminAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Shield, CheckCircle, XCircle, AlertCircle, FileCheck, Database } from 'lucide-react';
import { UserInfoPanel } from '../components/UserInfoPanel';

export default function Admin() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const [profileUpdateResult, setProfileUpdateResult] = useState<any>(null);
  const [createProfileResult, setCreateProfileResult] = useState<any>(null);
  const [onboardingResult, setOnboardingResult] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();

  const handleCheckUser = async () => {
    if (!email) return;
    
    setIsChecking(true);
    setCheckResult(null);
    setUpdateResult(null);
    
    try {
      const result = await adminAPI.checkUser(email);
      setCheckResult(result);
    } catch (error: any) {
      setCheckResult({ error: error.message || 'Failed to check user' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!email || !newPassword) return;
    
    setIsUpdating(true);
    setUpdateResult(null);
    
    try {
      const result = await adminAPI.updatePassword(email, newPassword);
      setUpdateResult(result);
      setNewPassword(''); // Clear password field on success
    } catch (error: any) {
      setUpdateResult({ error: error.message || 'Failed to update password' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!email || !displayName || !handle) return;
    
    setIsUpdatingProfile(true);
    setProfileUpdateResult(null);
    
    try {
      const result = await adminAPI.updateProfile(email, displayName, handle);
      setProfileUpdateResult(result);
      setDisplayName(''); // Clear display name field on success
      setHandle(''); // Clear handle field on success
    } catch (error: any) {
      setProfileUpdateResult({ error: error.message || 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!email || !displayName || !handle) return;
    
    setIsCreatingProfile(true);
    setCreateProfileResult(null);
    
    try {
      const result = await adminAPI.createProfile(email, displayName, handle);
      setCreateProfileResult(result);
      setDisplayName(''); // Clear display name field on success
      setHandle(''); // Clear handle field on success
    } catch (error: any) {
      setCreateProfileResult({ error: error.message || 'Failed to create profile' });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!email) return;
    
    setIsCompletingOnboarding(true);
    setOnboardingResult(null);
    
    try {
      const result = await adminAPI.completeOnboarding(email);
      setOnboardingResult(result);
    } catch (error: any) {
      setOnboardingResult({ error: error.message || 'Failed to complete onboarding' });
    } finally {
      setIsCompletingOnboarding(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      const result = await adminAPI.seedTopicAccounts();
      setSeedResult(result);
    } catch (error: any) {
      setSeedResult({ error: error.message || 'Failed to seed database' });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* User Info Panel */}
        <UserInfoPanel />
        
        {/* Quick Actions */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">
            Quick Actions
          </h2>
          <Button 
            onClick={() => navigate('/review-submissions')}
            className="w-full bg-accent hover:bg-accent/90 flex items-center justify-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            <span>Review Indie Game Submissions</span>
          </Button>
        </Card>

        {/* Check User Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-accent" />
            Check User
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="check-email">Email Address</Label>
              <Input
                id="check-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <Button 
              onClick={handleCheckUser}
              disabled={!email || isChecking}
              className="w-full"
            >
              {isChecking ? 'Checking...' : 'Check User'}
            </Button>
            
            {checkResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                checkResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : checkResult.exists
                  ? 'bg-green-950/50 border border-green-800'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}>
                {checkResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{checkResult.error}</p>
                    </div>
                  </div>
                ) : checkResult.exists ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-400">User Found</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-zinc-400 min-w-24">User ID:</span>
                        <span className="font-mono text-zinc-300">{checkResult.user.id}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-400 min-w-24">Email:</span>
                        <span className="text-zinc-300">{checkResult.user.email}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-zinc-400 min-w-24">Created:</span>
                        <span className="text-zinc-300">
                          {new Date(checkResult.user.created_at).toLocaleString()}
                        </span>
                      </div>
                      {checkResult.user.profile && (
                        <>
                          <div className="flex gap-2">
                            <span className="text-zinc-400 min-w-24">Handle:</span>
                            <span className="text-zinc-300">{checkResult.user.profile.handle}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-400 min-w-24">Display Name:</span>
                            <span className="text-zinc-300">{checkResult.user.profile.displayName}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-zinc-400">User Not Found</p>
                      <p className="text-zinc-500 text-sm">{checkResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Update Password Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Update Password
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="update-email">Email Address</Label>
              <Input
                id="update-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Password should be at least 6 characters
              </p>
            </div>
            
            <Button 
              onClick={handleUpdatePassword}
              disabled={!email || !newPassword || newPassword.length < 6 || isUpdating}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </Button>
            
            {updateResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                updateResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : 'bg-green-950/50 border border-green-800'
              }`}>
                {updateResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{updateResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-400">Success</p>
                      <p className="text-green-300 text-sm">{updateResult.message}</p>
                      <p className="text-green-400 text-xs mt-1">User ID: {updateResult.userId}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Update Profile Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Update Profile
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-email">Email Address</Label>
              <Input
                id="profile-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                type="text"
                placeholder="Enter handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <Button 
              onClick={handleUpdateProfile}
              disabled={!email || !displayName || !handle || isUpdatingProfile}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
            </Button>
            
            {profileUpdateResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                profileUpdateResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : 'bg-green-950/50 border border-green-800'
              }`}>
                {profileUpdateResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{profileUpdateResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-400">Success</p>
                      <p className="text-green-300 text-sm">{profileUpdateResult.message}</p>
                      <p className="text-green-400 text-xs mt-1">User ID: {profileUpdateResult.userId}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Create Profile Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Create Profile
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="create-display-name">Display Name</Label>
              <Input
                id="create-display-name"
                type="text"
                placeholder="Enter display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="create-handle">Handle</Label>
              <Input
                id="create-handle"
                type="text"
                placeholder="Enter handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <Button 
              onClick={handleCreateProfile}
              disabled={!email || !displayName || !handle || isCreatingProfile}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isCreatingProfile ? 'Creating...' : 'Create Profile'}
            </Button>
            
            {createProfileResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                createProfileResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : 'bg-green-950/50 border border-green-800'
              }`}>
                {createProfileResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{createProfileResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-400">Success</p>
                      <p className="text-green-300 text-sm">{createProfileResult.message}</p>
                      <p className="text-green-400 text-xs mt-1 font-mono">
                        User ID: {createProfileResult.userId || createProfileResult.profile?.id || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Complete Onboarding Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Complete Onboarding
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="onboarding-email">Email Address</Label>
              <Input
                id="onboarding-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white mt-2"
              />
            </div>
            
            <Button 
              onClick={handleCompleteOnboarding}
              disabled={!email || isCompletingOnboarding}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isCompletingOnboarding ? 'Completing...' : 'Complete Onboarding'}
            </Button>
            
            {onboardingResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                onboardingResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : 'bg-green-950/50 border border-green-800'
              }`}>
                {onboardingResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{onboardingResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-400">Success</p>
                      <p className="text-green-300 text-sm">{onboardingResult.message}</p>
                      <p className="text-green-400 text-xs mt-1 font-mono">User ID: {onboardingResult.profile?.id || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Seed Database Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Seed Database
          </h2>
          
          <div className="space-y-4">
            <Button 
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isSeeding ? 'Seeding...' : 'Seed Database'}
            </Button>
            
            {seedResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                seedResult.error 
                  ? 'bg-red-950/50 border border-red-800' 
                  : 'bg-green-950/50 border border-green-800'
              }`}>
                {seedResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-400">Error</p>
                      <p className="text-red-300 text-sm">{seedResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-400">Success</p>
                      <p className="text-green-300 text-sm">{seedResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Warning */}
        <Card className="bg-amber-950/20 border-amber-800/50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-400 mb-1">Admin Access</p>
              <p className="text-amber-300/80">
                This page has unrestricted access to user accounts. Use with caution and only for authorized administrative purposes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}