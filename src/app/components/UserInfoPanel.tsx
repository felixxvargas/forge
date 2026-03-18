import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { User, LogOut, RefreshCw, Mail, AtSign, BadgeCheck } from 'lucide-react';

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

interface UserInfo {
  userId: string;
  email: string;
  handle: string;
  displayName: string;
}

interface UserInfoPanelProps {
  onTokenRefreshed?: () => void;
}

export function UserInfoPanel({ onTokenRefreshed }: UserInfoPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    const userId = localStorage.getItem('forge-user-id');
    const token = localStorage.getItem('forge-access-token');
    const isLoggedIn = localStorage.getItem('forge-logged-in') === 'true';

    if (!isLoggedIn || !userId || !token) {
      setUserInfo(null);
      return;
    }

    try {
      // Get user from Supabase Auth
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Error loading user:', error);
        setUserInfo(null);
        return;
      }

      // Get profile info
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7/auth/me`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserInfo({
          userId: user.id,
          email: user.email || 'No email',
          handle: data.profile?.handle || 'No handle',
          displayName: data.profile?.displayName || 'No display name'
        });
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    setRefreshStatus('🔄 Signing out...');

    try {
      // Step 1: Get current credentials
      const currentEmail = userInfo?.email;
      if (!currentEmail) {
        setRefreshStatus('❌ No email found - please sign in manually');
        setIsRefreshing(false);
        return;
      }

      // Get current session to extract password (we can't do this, so we'll use refreshSession instead)
      // Actually, let's just refresh the session token instead of signing out/in
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        setRefreshStatus('❌ Failed to refresh token - please sign out/in manually');
        setIsRefreshing(false);
        return;
      }

      if (data.session?.access_token) {
        // Update stored token
        localStorage.setItem('forge-access-token', data.session.access_token);
        setRefreshStatus('✅ Token refreshed successfully!');
        
        // Reload user info
        await loadUserInfo();
        
        // Notify parent component
        if (onTokenRefreshed) {
          onTokenRefreshed();
        }

        // Clear status after 3 seconds
        setTimeout(() => {
          setRefreshStatus('');
        }, 3000);
      } else {
        setRefreshStatus('❌ No new token received');
      }
    } catch (error: any) {
      console.error('Failed to refresh token:', error);
      setRefreshStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = () => {
    // Clear all auth data
    localStorage.removeItem('forge-logged-in');
    localStorage.removeItem('forge-access-token');
    localStorage.removeItem('forge-user-id');
    localStorage.removeItem('forge-onboarding-complete');
    
    // Redirect to login
    window.location.href = '/login';
  };

  if (!userInfo) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-red-300">
          <User className="w-5 h-5" />
          <div>
            <div className="font-semibold">Not Signed In</div>
            <div className="text-sm opacity-80">Please sign in to use this panel</div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-lime-400" />
          Current User
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh your authentication token"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Token
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
            title="Sign out of Forge"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* User Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
            <Mail className="w-4 h-4" />
            Email
          </div>
          <div className="font-mono text-sm text-white break-all">{userInfo.email}</div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
            <AtSign className="w-4 h-4" />
            Handle
          </div>
          <div className="font-mono text-sm text-lime-400">{userInfo.handle}</div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
            <BadgeCheck className="w-4 h-4" />
            Display Name
          </div>
          <div className="font-semibold text-white">{userInfo.displayName}</div>
        </div>

        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
            <User className="w-4 h-4" />
            User ID
          </div>
          <div className="font-mono text-xs text-white/80 break-all">{userInfo.userId}</div>
        </div>
      </div>

      {/* Refresh Status */}
      {refreshStatus && (
        <div className={`p-3 rounded-lg text-sm font-semibold ${
          refreshStatus.startsWith('✅') 
            ? 'bg-green-500/20 text-green-300' 
            : refreshStatus.startsWith('❌')
            ? 'bg-red-500/20 text-red-300'
            : 'bg-yellow-500/20 text-yellow-300'
        }`}>
          {refreshStatus}
        </div>
      )}
    </div>
  );
}
