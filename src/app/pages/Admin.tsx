import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { adminAPI } from '../utils/api';
import { supabase } from '../utils/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Shield, CheckCircle, XCircle, AlertCircle, FileCheck, Database } from 'lucide-react';

const ADMIN_EMAILS = ['felixvgiles@gmail.com'];

type Result = { success: boolean; message: string; detail?: string } | null;

function ResultBox({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
      result.success ? 'bg-green-950/50 border border-green-800' : 'bg-red-950/50 border border-red-800'
    }`}>
      {result.success
        ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
      <div>
        <p className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.message}
        </p>
        {result.detail && (
          <p className={`text-xs mt-0.5 font-mono ${result.success ? 'text-green-300' : 'text-red-300'}`}>
            {result.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Shared email input
  const [email, setEmail] = useState('');

  // Section-specific state
  const [checkResult, setCheckResult] = useState<Result>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [passwordResult, setPasswordResult] = useState<Result>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [profileResult, setProfileResult] = useState<Result>(null);
  const [isManagingProfile, setIsManagingProfile] = useState(false);

  const [onboardingResult, setOnboardingResult] = useState<Result>(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  const [seedResult, setSeedResult] = useState<Result>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userEmail = session?.user?.email ?? '';
      setIsAuthorized(ADMIN_EMAILS.includes(userEmail));
      setAuthChecked(true);
    });
  }, []);

  const handleCheckUser = async () => {
    if (!email) return;
    setIsChecking(true);
    setCheckResult(null);
    try {
      const result = await adminAPI.checkUser(email);
      if (result.exists) {
        const p = result.user?.profile;
        setCheckResult({
          success: true,
          message: `Found: ${p?.displayName || p?.display_name || 'No name'} (@${p?.handle || 'no handle'})`,
          detail: `ID: ${result.user?.id}`,
        });
      } else {
        setCheckResult({ success: false, message: result.message || 'User not found' });
      }
    } catch (e: any) {
      setCheckResult({ success: false, message: e.message || 'Error checking user' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!email || !newPassword) return;
    setIsUpdatingPassword(true);
    setPasswordResult(null);
    try {
      const result = await adminAPI.updatePassword(email, newPassword);
      setPasswordResult({ success: true, message: result.message || 'Password updated', detail: result.userId });
      setNewPassword('');
    } catch (e: any) {
      setPasswordResult({ success: false, message: e.message || 'Failed to update password' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleManageProfile = async () => {
    if (!email || !displayName || !handle) return;
    setIsManagingProfile(true);
    setProfileResult(null);
    try {
      const result = await adminAPI.upsertProfile(email, displayName, handle);
      setProfileResult({
        success: true,
        message: result.message || 'Profile saved',
        detail: result.userId || result.profile?.id,
      });
      setDisplayName('');
      setHandle('');
    } catch (e: any) {
      setProfileResult({ success: false, message: e.message || 'Failed to save profile' });
    } finally {
      setIsManagingProfile(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!email) return;
    setIsCompletingOnboarding(true);
    setOnboardingResult(null);
    try {
      const result = await adminAPI.completeOnboarding(email);
      setOnboardingResult({ success: true, message: result.message || 'Onboarding complete', detail: result.profile?.id });
    } catch (e: any) {
      setOnboardingResult({ success: false, message: e.message || 'Failed to complete onboarding' });
    } finally {
      setIsCompletingOnboarding(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await adminAPI.seedTopicAccounts();
      setSeedResult({ success: true, message: result.message || 'Seeded successfully' });
    } catch (e: any) {
      setSeedResult({ success: false, message: e.message || 'Failed to seed database' });
    } finally {
      setIsSeeding(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Checking access...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-red-500" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-zinc-400">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Quick Actions */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Quick Actions</h2>
          <Button
            onClick={() => navigate('/review-submissions')}
            className="w-full bg-accent hover:bg-accent/90 flex items-center justify-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            Review Indie Game Submissions
          </Button>
        </Card>

        {/* Shared Email */}
        <Card className="bg-zinc-900 border-zinc-800 p-4">
          <Label htmlFor="shared-email" className="text-zinc-400 text-sm">Target User Email</Label>
          <Input
            id="shared-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white mt-2"
          />
          <p className="text-xs text-zinc-500 mt-1">Used by all sections below</p>
        </Card>

        {/* Check User */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" /> Check User
          </h2>
          <Button onClick={handleCheckUser} disabled={!email || isChecking} className="w-full">
            {isChecking ? 'Checking...' : 'Check User'}
          </Button>
          <ResultBox result={checkResult} />
        </Card>

        {/* Update Password */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Update Password
          </h2>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-2"
            />
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={!email || newPassword.length < 6 || isUpdatingPassword}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </Button>
          <ResultBox result={passwordResult} />
        </Card>

        {/* Profile Management (upsert) */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Profile Management
          </h2>
          <p className="text-xs text-zinc-500">Creates or updates the profile for the target email.</p>
          <div>
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              type="text"
              placeholder="Display name"
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
              placeholder="username (no @)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white mt-2"
            />
          </div>
          <Button
            onClick={handleManageProfile}
            disabled={!email || !displayName || !handle || isManagingProfile}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isManagingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
          <ResultBox result={profileResult} />
        </Card>

        {/* Complete Onboarding */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Complete Onboarding
          </h2>
          <Button
            onClick={handleCompleteOnboarding}
            disabled={!email || isCompletingOnboarding}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isCompletingOnboarding ? 'Completing...' : 'Complete Onboarding'}
          </Button>
          <ResultBox result={onboardingResult} />
        </Card>

        {/* Seed Database */}
        <Card className="bg-zinc-900 border-zinc-800 p-4 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Seed Topic Accounts
          </h2>
          <Button
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isSeeding ? 'Seeding...' : 'Seed Topic Accounts'}
          </Button>
          <ResultBox result={seedResult} />
        </Card>

        {/* Warning */}
        <Card className="bg-amber-950/20 border-amber-800/50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-400 mb-1">Admin Access</p>
              <p className="text-amber-300/80">
                This page has elevated access to user accounts. Use with caution.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
