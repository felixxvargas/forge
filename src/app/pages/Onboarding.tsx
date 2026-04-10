import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { InterestsScreen } from '../components/onboarding/InterestsScreen';
import { FollowScreen } from '../components/onboarding/FollowScreen';
import { UsernameScreen } from '../components/onboarding/UsernameScreen';
import { topicAccounts } from '../data/data';
import { profiles, supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import type { User } from '../data/data';
import type { Interest } from '../components/onboarding/InterestsScreen';

type OnboardingStep = 'splash' | 'interests' | 'follow' | 'username';

export function Onboarding() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAppData() as any;
  const [searchParams] = useSearchParams();
  const startStep = searchParams.get('step') as OnboardingStep | null;
  const [step, setStep] = useState<OnboardingStep>(startStep || 'splash');
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [initialInterests, setInitialInterests] = useState<Interest[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  // Load current user's existing interests when starting interests step from settings
  useEffect(() => {
    if (startStep !== 'interests') return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      profiles.getById(session.user.id).then((profile: any) => {
        if (profile?.interests?.length) {
          setInitialInterests(profile.interests);
          setSelectedInterests(profile.interests);
        }
      }).catch(() => {});
    });
  }, [startStep]);

  // Load suggested users: @forge pinned first, then top users by follower count
  useEffect(() => {
    if (step !== 'follow') return;
    async function loadSuggestedUsers() {
      const normalize = (u: any) => ({
        ...u,
        displayName: u.display_name || u.handle || 'User',
        handle: u.handle || '',
        profilePicture: u.profile_picture ?? null,
        followerCount: u.follower_count ?? 0,
        bio: u.bio || '',
      });

      try {
        // Fetch the @forge account first (pinned at top)
        const { data: forgeData } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', 'forge')
          .maybeSingle();

        // Fetch top users by follower count, excluding @forge
        const { data: topData } = await supabase
          .from('profiles')
          .select('*')
          .neq('handle', 'forge')
          .order('follower_count', { ascending: false })
          .limit(19);

        const forgeUser = forgeData ? normalize(forgeData) : null;
        const topUsers = (topData || []).map(normalize);

        const list = forgeUser ? [forgeUser, ...topUsers] : topUsers;

        if (list.length > 0) {
          setSuggestedUsers(list);
        } else {
          // Fallback to static list
          const staticForge = topicAccounts.find(u => u.id === 'user-forge');
          const others = topicAccounts.filter(u => u.id !== 'user-forge' && u.id !== 'current-user');
          setSuggestedUsers(staticForge ? [staticForge, ...others.slice(0, 19)] : others.slice(0, 20));
        }
      } catch {
        const staticForge = topicAccounts.find(u => u.id === 'user-forge');
        const others = topicAccounts.filter(u => u.id !== 'user-forge' && u.id !== 'current-user');
        setSuggestedUsers(staticForge ? [staticForge, ...others.slice(0, 19)] : others.slice(0, 20));
      }
    }
    loadSuggestedUsers();
  }, [step]);

  const handleSplashComplete = () => {
    setStep('interests');
  };

  const handleInterestsComplete = async (interests: Interest[]) => {
    setSelectedInterests(interests);
    
    // If coming from settings (step param), save interests and go back
    if (startStep === 'interests') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await profiles.update(session.user.id, { interests });
        }
        navigate('/edit-profile');
      } catch (error) {
        console.error('Error updating interests:', error);
      }
      return;
    }
    
    // Otherwise continue onboarding flow
    setStep('follow');
  };

  const handleFollowComplete = (userIds: string[]) => {
    setFollowing(userIds);
    setStep('username');
  };

  const handleUsernameComplete = async (username: string, displayName: string, pronouns: string) => {
    // Helper to save profile and go to feed
    const finishOnboarding = async (userId: string) => {
      await profiles.update(userId, {
        handle: username,
        display_name: displayName,
        ...(pronouns ? { pronouns } : {}),
        interests: selectedInterests,
      });
      localStorage.removeItem('forge-signup-email');
      localStorage.removeItem('forge-signup-password');
      localStorage.setItem('forge-onboarding-complete', 'true');
      // Refresh context so currentUser reflects the handle/display_name set above,
      // not the stale email-derived values loaded by AppDataContext during sign-up.
      await refreshCurrentUser();
      navigate('/feed');
    };

    try {
      // 1. Existing session (Google OAuth or previously authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await finishOnboarding(session.user.id);
        return;
      }

      // 2. Email signup flow — credentials stored in localStorage by SignUp.tsx
      const signupEmail = localStorage.getItem('forge-signup-email');
      const signupPassword = localStorage.getItem('forge-signup-password');

      if (!signupEmail || !signupPassword) {
        throw new Error('Session expired. Please sign in again.');
      }

      // Try creating the account now (deferred from SignUp.tsx so we have all profile data)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (signUpData?.session?.user) {
        // Email confirmation is disabled — we have a session immediately
        await finishOnboarding(signUpData.session.user.id);
        return;
      }

      if (signUpData?.user && !signUpData.session) {
        // Email confirmation is enabled — store profile data so AuthCallback can apply it
        // after the user clicks the confirmation link in their email
        localStorage.setItem('forge-pending-profile', JSON.stringify({
          handle: username,
          display_name: displayName,
          pronouns,
          interests: selectedInterests,
        }));
        localStorage.removeItem('forge-signup-email');
        localStorage.removeItem('forge-signup-password');
        toast.info('Check your email to verify your account, then sign in.');
        navigate('/login');
        return;
      }

      // signUp failed — account may already exist (previous attempt or re-try)
      // Try signing in instead
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (signInData?.session?.user) {
        await finishOnboarding(signInData.session.user.id);
        return;
      }

      // Sign-in also failed — likely email not confirmed from a previous attempt
      if (signInError?.message?.toLowerCase().includes('email')) {
        localStorage.setItem('forge-pending-profile', JSON.stringify({
          handle: username,
          display_name: displayName,
          pronouns,
          interests: selectedInterests,
        }));
        localStorage.removeItem('forge-signup-email');
        localStorage.removeItem('forge-signup-password');
        toast.info('Check your email to verify your account, then sign in.');
        navigate('/login');
        return;
      }

      throw new Error(signInError?.message || signUpError?.message || 'Unable to complete sign-up. Please try again.');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      const msg = error.message || 'Failed to complete onboarding';
      if (msg.includes('Session expired') || msg.includes('sign in') || msg.includes('sign-up')) {
        alert(msg);
        navigate('/login');
        return;
      }
      alert(msg);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'splash' && <SplashScreen key="splash" onComplete={handleSplashComplete} />}
      {step === 'interests' && <InterestsScreen key="interests" onComplete={handleInterestsComplete} initialInterests={initialInterests} />}
      {step === 'follow' && <FollowScreen key="follow" users={suggestedUsers} onComplete={handleFollowComplete} />}
      {step === 'username' && <UsernameScreen key="username" onComplete={handleUsernameComplete} />}
    </AnimatePresence>
  );
}