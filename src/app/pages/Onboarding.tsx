import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from '@/compat/router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { InterestsScreen } from '../components/onboarding/InterestsScreen';
import { FollowScreen } from '../components/onboarding/FollowScreen';
import { UsernameScreen } from '../components/onboarding/UsernameScreen';
import { ProfilePictureScreen } from '../components/onboarding/ProfilePictureScreen';
import { topicAccounts } from '../data/data';
import { profiles, supabase, onboardingTelemetry } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import type { User } from '../data/data';
import type { Interest } from '../components/onboarding/InterestsScreen';

type OnboardingStep = 'splash' | 'interests' | 'follow' | 'username' | 'avatar';

const MAIN_STEPS: OnboardingStep[] = ['interests', 'follow', 'username', 'avatar'];

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-50%' : '50%', opacity: 0 }),
};
const slideTransition = { type: 'tween', ease: 'easeInOut', duration: 0.3 } as const;

export function Onboarding() {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAppData() as any;
  const [searchParams] = useSearchParams();
  const startStep = searchParams.get('step') as OnboardingStep | null;
  const [step, setStep] = useState<OnboardingStep>(startStep || 'splash');
  const [direction, setDirection] = useState(1);
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

  // Track onboarding start on mount (skip if entering via ?step=interests from settings)
  useEffect(() => {
    if (startStep) return;
    onboardingTelemetry.track('onboarding_started');
    onboardingTelemetry.track('step_started', 'splash');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSplashComplete = () => {
    onboardingTelemetry.track('step_completed', 'splash');
    onboardingTelemetry.track('step_started', 'interests');
    setDirection(1);
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

    onboardingTelemetry.track('step_completed', 'interests', { interestCount: interests.length });
    onboardingTelemetry.track('step_started', 'follow');
    setDirection(1);
    setStep('follow');
  };

  const handleFollowComplete = (userIds: string[]) => {
    onboardingTelemetry.track('step_completed', 'follow', { followCount: userIds.length });
    onboardingTelemetry.track('step_started', 'username');
    setDirection(1);
    setFollowing(userIds);
    setStep('username');
  };

  const handleUsernameComplete = async (username: string, displayName: string, pronouns: string) => {
    // Helper to save profile and go to feed
    const finishOnboarding = async (userId: string) => {
      // Use upsert so the profile row is created if it doesn't exist yet
      // (can happen if the AuthCallback upsert raced or the row was never inserted)
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: userId,
        handle: username,
        display_name: displayName,
        ...(pronouns ? { pronouns } : {}),
        interests: selectedInterests,
      }, { onConflict: 'id' });
      if (upsertErr) throw new Error(upsertErr.message);
      if (following.length > 0) {
        await Promise.all(following.map(id => profiles.follow(userId, id)));
      }
      sessionStorage.removeItem('forge-signup-email');
      sessionStorage.removeItem('forge-signup-password');
      localStorage.setItem('forge-onboarding-complete', 'true');
      onboardingTelemetry.track('onboarding_completed', 'username', {
        hasInterests: selectedInterests.length > 0,
        followCount: following.length,
        hasPronouns: !!pronouns,
      });
      await refreshCurrentUser();
      setDirection(1);
      setStep('avatar');
    };

    try {
      // 1. Existing session (Google OAuth or previously authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await finishOnboarding(session.user.id);
        return;
      }

      // 2. Email signup flow — credentials stored in sessionStorage by SignUp.tsx
      const signupEmail = sessionStorage.getItem('forge-signup-email');
      const signupPassword = sessionStorage.getItem('forge-signup-password');

      if (!signupEmail || !signupPassword) {
        throw new Error('Session expired. Please sign in again.');
      }

      // Try creating the account now (deferred from SignUp.tsx so we have all profile data)
      const signupCaptcha = sessionStorage.getItem('forge-signup-captcha') ?? undefined;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: signupCaptcha ? { captchaToken: signupCaptcha } : undefined,
      });
      sessionStorage.removeItem('forge-signup-captcha');

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
          following,
        }));
        sessionStorage.removeItem('forge-signup-email');
        sessionStorage.removeItem('forge-signup-password');
        sessionStorage.removeItem('forge-signup-captcha');
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
          following,
        }));
        sessionStorage.removeItem('forge-signup-email');
        sessionStorage.removeItem('forge-signup-password');
        sessionStorage.removeItem('forge-signup-captcha');
        toast.info('Check your email to verify your account, then sign in.');
        navigate('/login');
        return;
      }

      throw new Error(signInError?.message || signUpError?.message || 'Unable to complete sign-up. Please try again.');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      const msg = error.message || 'Failed to complete onboarding';
      onboardingTelemetry.track('onboarding_error', 'username', { error: msg });
      if (msg.includes('Session expired') || msg.includes('sign in') || msg.includes('sign-up')) {
        alert(msg);
        navigate('/login');
        return;
      }
      alert(msg);
    }
  };

  const handleAvatarComplete = async (avatarUrl: string | null) => {
    if (avatarUrl) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await profiles.update(session.user.id, { profile_picture: avatarUrl });
        }
      } catch { /* best-effort */ }
    }
    navigate('/feed');
  };

  const goBack = (to: OnboardingStep) => { setDirection(-1); setStep(to); };

  const stepIndex = MAIN_STEPS.indexOf(step);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        {step === 'splash' && (
          <motion.div key="splash" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <SplashScreen onComplete={handleSplashComplete} />
          </motion.div>
        )}
        {step === 'interests' && (
          <motion.div key="interests" custom={direction} variants={stepVariants}
            initial="enter" animate="center" exit="exit" transition={slideTransition}
            className="absolute inset-0 overflow-y-auto">
            <InterestsScreen onComplete={handleInterestsComplete} initialInterests={initialInterests} onBack={() => goBack('splash')} />
          </motion.div>
        )}
        {step === 'follow' && (
          <motion.div key="follow" custom={direction} variants={stepVariants}
            initial="enter" animate="center" exit="exit" transition={slideTransition}
            className="absolute inset-0 overflow-y-auto">
            <FollowScreen users={suggestedUsers} onComplete={handleFollowComplete} onBack={() => goBack('interests')} />
          </motion.div>
        )}
        {step === 'username' && (
          <motion.div key="username" custom={direction} variants={stepVariants}
            initial="enter" animate="center" exit="exit" transition={slideTransition}
            className="absolute inset-0 overflow-y-auto">
            <UsernameScreen onComplete={handleUsernameComplete} onBack={() => goBack('follow')} />
          </motion.div>
        )}
        {step === 'avatar' && (
          <motion.div key="avatar" custom={direction} variants={stepVariants}
            initial="enter" animate="center" exit="exit" transition={slideTransition}
            className="absolute inset-0 overflow-y-auto">
            <ProfilePictureScreen onComplete={handleAvatarComplete} onBack={() => goBack('username')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step indicator — visible on interests / follow / username steps */}
      {stepIndex >= 0 && (
        <div className="fixed top-5 inset-x-0 z-50 flex justify-center gap-2 pointer-events-none">
          {MAIN_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? 'w-8 bg-accent' : i < stepIndex ? 'w-6 bg-accent/50' : 'w-6 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}