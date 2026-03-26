import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { InterestsScreen } from '../components/onboarding/InterestsScreen';
import { FollowScreen } from '../components/onboarding/FollowScreen';
import { UsernameScreen } from '../components/onboarding/UsernameScreen';
import { topicAccounts } from '../data/data';
import { profiles, supabase } from '../utils/supabase';
import type { User } from '../data/data';
import type { Interest } from '../components/onboarding/InterestsScreen';

type OnboardingStep = 'splash' | 'interests' | 'follow' | 'username';

export function Onboarding() {
  const navigate = useNavigate();
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

  // Load suggested users from Supabase topic accounts
  useEffect(() => {
    if (step !== 'follow') return;
    async function loadSuggestedUsers() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('account_type', 'topic')
          .limit(10);
        if (data && data.length > 0) {
          // Normalize snake_case Supabase fields → camelCase User type
          setSuggestedUsers(data.map((u: any) => ({
            ...u,
            displayName: u.display_name || u.handle || 'User',
            handle: u.handle || '',
            profilePicture: u.profile_picture ?? null,
            followerCount: u.follower_count ?? 0,
            bio: u.bio || '',
          })));
        } else {
          // Fallback to static list
          const forgeAccount = topicAccounts.find(u => u.id === 'user-forge');
          const others = topicAccounts.filter(u => u.id !== 'user-forge' && u.id !== 'current-user');
          setSuggestedUsers(forgeAccount ? [forgeAccount, ...others.slice(0, 9)] : others.slice(0, 10));
        }
      } catch {
        const forgeAccount = topicAccounts.find(u => u.id === 'user-forge');
        const others = topicAccounts.filter(u => u.id !== 'user-forge' && u.id !== 'current-user');
        setSuggestedUsers(forgeAccount ? [forgeAccount, ...others.slice(0, 9)] : others.slice(0, 10));
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
    try {
      // Get the current Supabase session (works for both email signup and OAuth)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // Try localStorage fallback for old signup flow
        const signupEmail = localStorage.getItem('forge-signup-email');
        const signupPassword = localStorage.getItem('forge-signup-password');
        if (signupEmail && signupPassword) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: signupEmail, password: signupPassword });
          if (error) throw new Error('Session expired. Please sign in again.');
          localStorage.removeItem('forge-signup-email');
          localStorage.removeItem('forge-signup-password');
          await profiles.update(data.session!.user.id, {
            handle: username,
            display_name: displayName,
            pronouns,
            interests: selectedInterests,
          });
          navigate('/feed');
          return;
        }
        throw new Error('Session expired. Please sign in again.');
      }

      // Update profile with onboarding data
      await profiles.update(session.user.id, {
        handle: username,
        display_name: displayName,
        pronouns,
        interests: selectedInterests,
      });

      localStorage.setItem('forge-onboarding-complete', 'true');
      navigate('/feed');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      const msg = error.message || 'Failed to complete onboarding';
      if (msg.includes('Session expired') || msg.includes('sign in')) {
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