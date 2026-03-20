import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SplashScreen } from '../components/onboarding/SplashScreen';
import { InterestsScreen } from '../components/onboarding/InterestsScreen';
import { FollowScreen } from '../components/onboarding/FollowScreen';
import { UsernameScreen } from '../components/onboarding/UsernameScreen';
import { topicAccounts } from '../data/data';
import { authAPI, userAPI, postAPI } from '../utils/api';
import { profiles } from '../utils/supabase';
import type { User } from '../data/data';
import type { Interest } from '../components/onboarding/InterestsScreen';

type OnboardingStep = 'splash' | 'interests' | 'follow' | 'username';

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startStep = searchParams.get('step') as OnboardingStep | null;
  const [step, setStep] = useState<OnboardingStep>(startStep || 'splash');
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  // Load suggested users based on recent activity
  useEffect(() => {
    async function loadSuggestedUsers() {
      try {
        // Get all posts to determine most active accounts
        const allPosts = await postAPI.getAllPosts();
        
        // Count posts per user (only topic accounts and forge)
        const postCounts = new Map<string, number>();
        allPosts.forEach((post: any) => {
          const userId = post.userId || post.user_id;
          if (userId && userId.startsWith('user-')) {
            postCounts.set(userId, (postCounts.get(userId) || 0) + 1);
          }
        });

        // Sort topic accounts by post count
        const sortedAccounts = topicAccounts.sort((a, b) => {
          const aCount = postCounts.get(a.id) || 0;
          const bCount = postCounts.get(b.id) || 0;
          return bCount - aCount;
        });

        // Put @forge first, then most active
        const forgeAccount = sortedAccounts.find(u => u.id === 'user-forge');
        const otherAccounts = sortedAccounts.filter(u => u.id !== 'user-forge');
        
        const suggested = forgeAccount 
          ? [forgeAccount, ...otherAccounts.slice(0, 9)]
          : otherAccounts.slice(0, 10);

        setSuggestedUsers(suggested);
      } catch (error) {
        console.error('Error loading suggested users:', error);
        // Fallback to default list
        const forgeAccount = topicAccounts.find(u => u.id === 'user-forge');
        const otherAccounts = topicAccounts.filter(u => 
          u.id.startsWith('user-') && u.id !== 'current-user' && u.id !== 'user-forge'
        );
        setSuggestedUsers(forgeAccount ? [forgeAccount, ...otherAccounts.slice(0, 9)] : otherAccounts.slice(0, 10));
      }
    }

    if (step === 'follow') {
      loadSuggestedUsers();
    }
  }, [step]);

  const handleSplashComplete = () => {
    setStep('interests');
  };

  const handleInterestsComplete = async (interests: Interest[]) => {
    setSelectedInterests(interests);
    
    // If coming from settings (step param), save interests and go back
    if (startStep === 'interests') {
      try {
        const userId = localStorage.getItem('forge-user-id');
        if (userId) {
          await profiles.update(userId, { interests });
        }
        navigate('/settings');
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
      // Check if user is signing up (has credentials in localStorage)
      const signupEmail = localStorage.getItem('forge-signup-email');
      const signupPassword = localStorage.getItem('forge-signup-password');

      if (signupEmail && signupPassword) {
        // Create new account with collected profile data
        const result = await authAPI.signup(
          signupEmail,
          signupPassword,
          displayName,
          username,
          pronouns
        );

        // Update user profile with interests
        if (result.user?.id) {
          await profiles.update(result.user.id, { interests: selectedInterests });

          // Clean up signup credentials
          localStorage.removeItem('forge-signup-email');
          localStorage.removeItem('forge-signup-password');
          
          localStorage.setItem('forge-onboarding-complete', 'true');
          navigate('/feed');
        }
      } else {
        // OAuth flow - verify we have a valid session first
        const userId = localStorage.getItem('forge-user-id');
        const accessToken = localStorage.getItem('forge-access-token');
        
        console.log('[Onboarding] Completing OAuth onboarding for user:', userId);
        
        if (!userId || !accessToken) {
          console.error('[Onboarding] Missing userId or accessToken');
          throw new Error('Session expired. Please sign in again.');
        }
        
        // Try to verify the session is still valid
        try {
          await authAPI.getCurrentUser();
          console.log('[Onboarding] Session verified, updating profile');
        } catch (verifyError) {
          console.error('[Onboarding] Session verification failed:', verifyError);
          // Session is invalid, redirect to login
          localStorage.clear();
          alert('Your session has expired. Please sign in again.');
          navigate('/login');
          return;
        }

        // Update profile with onboarding data
        await profiles.update(userId, {
          handle: username,
          display_name: displayName,
          pronouns,
          interests: selectedInterests,
        });
        
        console.log('[Onboarding] Profile updated successfully');
        localStorage.setItem('forge-onboarding-complete', 'true');
        navigate('/feed');
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      
      // Show user-friendly error message
      let errorMessage = error.message || 'Failed to complete onboarding';
      
      if (errorMessage.includes('email already exists') || errorMessage.includes('already been registered')) {
        errorMessage = 'This email is already registered. Please return to the login page and sign in instead.';
      }
      
      // If session expired, redirect to login
      if (errorMessage.includes('Session expired') || errorMessage.includes('need to log in') || errorMessage.includes('need to sign in')) {
        localStorage.clear();
        alert('Your session has expired. Please sign in again.');
        navigate('/login');
        return;
      }
      
      alert(errorMessage);
      
      // If it's an email exists error, redirect back to login
      if (errorMessage.includes('already registered')) {
        localStorage.removeItem('forge-signup-email');
        localStorage.removeItem('forge-signup-password');
        localStorage.removeItem('forge-logged-in');
        navigate('/login');
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'splash' && <SplashScreen key="splash" onComplete={handleSplashComplete} />}
      {step === 'interests' && <InterestsScreen key="interests" onComplete={handleInterestsComplete} />}
      {step === 'follow' && <FollowScreen key="follow" users={suggestedUsers} onComplete={handleFollowComplete} />}
      {step === 'username' && <UsernameScreen key="username" onComplete={handleUsernameComplete} />}
    </AnimatePresence>
  );
}