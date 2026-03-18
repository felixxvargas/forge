import { useState } from 'react';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { UserInfoPanel } from '../components/UserInfoPanel';
import { ArrowLeft } from 'lucide-react';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

interface TestResult {
  status: 'pending' | 'success' | 'error';
  icon: string;
  message: string;
}

export function VerifyBackend() {
  const navigate = useNavigate();
  const [passed, setPassed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [pending, setPending] = useState(8);
  const [isRunning, setIsRunning] = useState(false);
  
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({
    health: { status: 'pending', icon: '⏳', message: 'Testing if Edge Function is responding...' },
    dbAccess: { status: 'pending', icon: '⏳', message: 'Testing database access with service role...' },
    auth: { status: 'pending', icon: '⏳', message: 'Checking if you\'re signed in...' },
    token: { status: 'pending', icon: '⏳', message: 'Testing token validation...' },
    topicAccounts: { status: 'pending', icon: '⏳', message: 'Testing /users/topic-accounts...' },
    posts: { status: 'pending', icon: '⏳', message: 'Testing /posts...' },
    profile: { status: 'pending', icon: '⏳', message: 'Testing /auth/me...' },
    storage: { status: 'pending', icon: '⏳', message: 'Checking storage buckets...' }
  });

  const updateTest = (testId: string, status: 'success' | 'error', icon: string, message: string) => {
    setTestResults(prev => ({
      ...prev,
      [testId]: { status, icon, message }
    }));
    
    setPending(p => p - 1);
    if (status === 'success') setPassed(p => p + 1);
    if (status === 'error') setFailed(f => f + 1);
  };

  const testHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        updateTest('health', 'success', '✅', 'Edge Function is running!');
        return true;
      } else {
        const errorText = await response.text();
        updateTest('health', 'error', '❌', `Failed with status ${response.status}: ${errorText.substring(0, 100)}`);
        return false;
      }
    } catch (error: any) {
      updateTest('health', 'error', '❌', `Cannot reach Edge Function: ${error.message}`);
      return false;
    }
  };

  const testDbAccess = async () => {
    try {
      const response = await fetch(`${API_BASE}/debug/db-access`);
      if (response.ok) {
        const data = await response.json();
        if (data.databaseAccess?.success) {
          updateTest('dbAccess', 'success', '✅', `Service role can query database (${data.databaseAccess.rowsReturned} rows found)`);
        } else {
          updateTest('dbAccess', 'error', '❌', `Database query failed: ${data.databaseAccess?.error || 'Unknown error'}`);
        }
        return data.databaseAccess?.success || false;
      } else {
        const errorText = await response.text();
        updateTest('dbAccess', 'error', '❌', `Failed with status ${response.status}: ${errorText.substring(0, 100)}`);
        return false;
      }
    } catch (error: any) {
      updateTest('dbAccess', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const testAuth = async () => {
    const isLoggedIn = localStorage.getItem('forge-logged-in') === 'true';
    const token = localStorage.getItem('forge-access-token');
    const userId = localStorage.getItem('forge-user-id');
    
    if (isLoggedIn && token && userId) {
      updateTest('auth', 'success', '✅', `Signed in as user ${userId}`);
      return true;
    } else {
      updateTest('auth', 'error', '⚠️', 'Not signed in - some tests will be skipped');
      return false;
    }
  };

  const testTokenValidation = async () => {
    const token = localStorage.getItem('forge-access-token');
    if (!token) {
      updateTest('token', 'error', '⏭️', 'Skipped - not signed in');
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE}/debug/validate-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.anonClient?.success) {
          updateTest('token', 'success', '✅', `Token valid for user ${data.anonClient.userId}`);
          return true;
        } else {
          updateTest('token', 'error', '❌', `Token invalid: ${data.anonClient?.error}`);
          return false;
        }
      } else {
        updateTest('token', 'error', '❌', `Failed with status ${response.status}`);
        return false;
      }
    } catch (error: any) {
      updateTest('token', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const testTopicAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/topic-accounts`);
      
      if (response.ok) {
        const data = await response.json();
        updateTest('topicAccounts', 'success', '✅', `Loaded ${data.length} topic accounts`);
        return true;
      } else {
        const errorText = await response.text();
        updateTest('topicAccounts', 'error', '❌', `Failed with status ${response.status}: ${errorText.substring(0, 100)}`);
        return false;
      }
    } catch (error: any) {
      updateTest('topicAccounts', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const testPosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/posts`);
      
      if (response.ok) {
        const data = await response.json();
        updateTest('posts', 'success', '✅', `Loaded ${data.length} posts`);
        return true;
      } else {
        updateTest('posts', 'error', '❌', `Failed with status ${response.status}`);
        return false;
      }
    } catch (error: any) {
      updateTest('posts', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const testProfile = async () => {
    const token = localStorage.getItem('forge-access-token');
    if (!token) {
      updateTest('profile', 'error', '⏭️', 'Skipped - not signed in');
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        updateTest('profile', 'success', '✅', `Loaded profile for ${data.profile?.handle}`);
        return true;
      } else {
        updateTest('profile', 'error', '❌', `Failed with status ${response.status}`);
        return false;
      }
    } catch (error: any) {
      updateTest('profile', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const testStorage = async () => {
    try {
      // Use the backend endpoint to check storage buckets
      // (frontend anon key doesn't have permission to list buckets)
      const response = await fetch(`${API_BASE}/storage/check`);
      
      if (!response.ok) {
        updateTest('storage', 'error', '❌', `Failed with status ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      
      if (data.error) {
        updateTest('storage', 'error', '❌', `Error: ${data.error}`);
        return false;
      }
      
      if (data.allPresent) {
        updateTest('storage', 'success', '✅', `All 5 buckets exist: ${data.buckets.join(', ')}`);
        console.log('📦 Storage buckets:', data.buckets);
        return true;
      } else {
        updateTest('storage', 'error', '⚠️', `Missing buckets: ${data.missing.join(', ')}`);
        console.log('📦 Existing buckets:', data.buckets);
        console.log('❌ Missing buckets:', data.missing);
        return false;
      }
    } catch (error: any) {
      updateTest('storage', 'error', '❌', `Error: ${error.message}`);
      return false;
    }
  };

  const runAllTests = async () => {
    // Reset
    setPassed(0);
    setFailed(0);
    setPending(8);
    setIsRunning(true);
    setTestResults({
      health: { status: 'pending', icon: '⏳', message: 'Testing if Edge Function is responding...' },
      dbAccess: { status: 'pending', icon: '⏳', message: 'Testing database access with service role...' },
      auth: { status: 'pending', icon: '⏳', message: 'Checking if you\'re signed in...' },
      token: { status: 'pending', icon: '⏳', message: 'Testing token validation...' },
      topicAccounts: { status: 'pending', icon: '⏳', message: 'Testing /users/topic-accounts...' },
      posts: { status: 'pending', icon: '⏳', message: 'Testing /posts...' },
      profile: { status: 'pending', icon: '⏳', message: 'Testing /auth/me...' },
      storage: { status: 'pending', icon: '⏳', message: 'Checking storage buckets...' }
    });

    console.log('🚀 Running all backend tests...');
    
    await testHealth();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await testDbAccess();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const isAuth = await testAuth();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (isAuth) {
      await testTokenValidation();
      await new Promise(resolve => setTimeout(resolve, 300));
    } else {
      setPending(p => p - 1);
      updateTest('token', 'error', '⏭️', 'Skipped - not signed in');
    }
    
    await testTopicAccounts();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await testPosts();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (isAuth) {
      await testProfile();
    } else {
      setPending(p => p - 1);
      updateTest('profile', 'error', '⏭️', 'Skipped - not signed in');
    }
    
    await testStorage();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsRunning(false);
    console.log('✅ All tests complete!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 text-lime-400 hover:text-lime-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back to Feed</span>
        </button>
        
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-purple-400 bg-clip-text text-transparent">
          ⚡ Backend Verification
        </h1>
        <p className="text-lime-400 text-lg mb-8">Automated checks for your Forge backend</p>
        
        {/* User Info Panel */}
        <UserInfoPanel onTokenRefreshed={runAllTests} />
        
        {/* Summary */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Summary</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`p-4 rounded-lg text-center ${passed > 0 ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <div className="text-3xl font-bold">{passed}</div>
              <div className="text-sm opacity-80">Passed</div>
            </div>
            <div className={`p-4 rounded-lg text-center ${failed > 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <div className="text-3xl font-bold">{failed}</div>
              <div className="text-sm opacity-80">Failed</div>
            </div>
            <div className={`p-4 rounded-lg text-center ${pending > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
              <div className="text-3xl font-bold">{pending}</div>
              <div className="text-sm opacity-80">Pending</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Run All Tests
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/20 transition-all"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-3">
            {/* Health Check */}
            <TestItem
              name="Health Check"
              result={testResults.health}
            />
            
            {/* Database Access */}
            <TestItem
              name="Database Access"
              result={testResults.dbAccess}
            />
            
            {/* Authentication */}
            <TestItem
              name="Authentication Status"
              result={testResults.auth}
            />
            
            {/* JWT Validation */}
            <TestItem
              name="JWT Validation"
              result={testResults.token}
            />
            
            {/* Topic Accounts */}
            <TestItem
              name="Topic Accounts Endpoint"
              result={testResults.topicAccounts}
            />
            
            {/* Posts */}
            <TestItem
              name="Posts Endpoint"
              result={testResults.posts}
            />
            
            {/* Profile */}
            <TestItem
              name="User Profile"
              result={testResults.profile}
            />
            
            {/* Storage */}
            <TestItem
              name="Storage Buckets"
              result={testResults.storage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface TestItemProps {
  name: string;
  result: TestResult;
}

function TestItem({ name, result }: TestItemProps) {
  const getBorderColor = () => {
    if (result.status === 'success') return 'border-green-500';
    if (result.status === 'error') return 'border-red-500';
    return 'border-yellow-500';
  };

  const getBgColor = () => {
    if (result.status === 'success') return 'bg-green-500/10';
    if (result.status === 'error') return 'bg-red-500/10';
    return 'bg-black/20';
  };

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border-l-4 ${getBorderColor()} ${getBgColor()}`}>
      <div className="text-2xl min-w-[30px]">{result.icon}</div>
      <div className="flex-1">
        <div className="font-semibold">{name}</div>
        <div className="text-sm opacity-80">{result.message}</div>
      </div>
    </div>
  );
}