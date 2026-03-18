/**
 * Deployment Health Check Utility
 * Run this in console: deploymentCheck()
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

export async function deploymentCheck() {
  console.log('🔍 Forge Deployment Health Check\n');
  console.log('━'.repeat(50));
  
  // Check 1: Health endpoint
  console.log('\n1️⃣ Checking Edge Function Health...');
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Edge function is RUNNING');
      console.log('   Response:', data);
    } else {
      console.log('   ❌ Edge function returned error:', response.status, response.statusText);
    }
  } catch (error: any) {
    console.log('   ❌ Edge function is NOT RUNNING');
    console.log('   Error:', error.message);
  }
  
  // Check 2: Topic accounts endpoint
  console.log('\n2️⃣ Checking Topic Accounts Endpoint...');
  try {
    const response = await fetch(`${API_BASE}/users/topic-accounts`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Topic accounts endpoint working');
      console.log(`   Found ${data.length} topic accounts`);
      console.log('   Accounts:', data.map((u: any) => u.handle).join(', '));
    } else {
      console.log('   ❌ Topic accounts endpoint failed:', response.status, response.statusText);
    }
  } catch (error: any) {
    console.log('   ❌ Topic accounts endpoint not accessible');
    console.log('   Error:', error.message);
  }
  
  // Check 3: Authentication status
  console.log('\n3️⃣ Checking Authentication...');
  const accessToken = localStorage.getItem('forge-access-token');
  const isLoggedIn = localStorage.getItem('forge-logged-in');
  
  console.log('   Logged in flag:', isLoggedIn);
  console.log('   Has access token:', !!accessToken);
  
  if (accessToken) {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Authentication valid');
        console.log('   User:', data.handle, '-', data.displayName);
      } else {
        console.log('   ❌ Authentication failed:', response.status, response.statusText);
        console.log('   → You may need to log in again');
      }
    } catch (error: any) {
      console.log('   ❌ Cannot verify authentication');
      console.log('   Error:', error.message);
    }
  } else {
    console.log('   ⚠️ No access token found - not logged in');
  }
  
  // Check 4: localStorage data
  console.log('\n4️⃣ Checking localStorage Data...');
  const users = localStorage.getItem('forge-users');
  if (users) {
    const parsed = JSON.parse(users);
    console.log(`   Found ${parsed.length} users in cache`);
    
    // Check for unwanted users
    const unwanted = ['@gamebeez', '@rpgmaster', '@unknown'];
    const foundUnwanted = parsed.filter((u: any) => 
      unwanted.some(h => u.handle?.toLowerCase().includes(h.toLowerCase()))
    );
    
    if (foundUnwanted.length > 0) {
      console.log('   ⚠️ Found unwanted cached users:');
      foundUnwanted.forEach((u: any) => {
        console.log(`      - ${u.handle} (${u.displayName})`);
      });
      console.log('   → Run clearAllLocalStorage() to remove them');
    } else {
      console.log('   ✅ No unwanted users in cache');
    }
  } else {
    console.log('   No users in cache');
  }
  
  // Check 5: Console commands availability
  console.log('\n5️⃣ Checking Debug Commands...');
  const hasCheckStorage = typeof (window as any).checkLocalStorage === 'function';
  const hasClearStorage = typeof (window as any).clearAllLocalStorage === 'function';
  
  if (hasCheckStorage && hasClearStorage) {
    console.log('   ✅ Debug commands available');
    console.log('   Available: checkLocalStorage(), clearAllLocalStorage()');
  } else {
    console.log('   ❌ Debug commands not loaded yet');
    console.log('   → Code may not be deployed');
  }
  
  // Summary
  console.log('\n━'.repeat(50));
  console.log('\n📊 SUMMARY:');
  
  const edgeFunctionWorking = await checkEndpoint(`${API_BASE}/health`);
  const authWorking = accessToken ? await checkEndpoint(`${API_BASE}/auth/me`, accessToken) : false;
  
  if (edgeFunctionWorking) {
    console.log('✅ Edge function is deployed and working!');
  } else {
    console.log('❌ Edge function is NOT deployed');
    console.log('   → Check Figma Make deployment status');
    console.log('   → Look for "Deploy" button and click it');
  }
  
  if (authWorking) {
    console.log('✅ You are authenticated');
  } else if (accessToken) {
    console.log('⚠️ Access token exists but may be invalid');
    console.log('   → Try logging out and back in');
  } else {
    console.log('ℹ️ Not logged in (this is normal if you just cleared cache)');
  }
  
  console.log('\n💡 Next Steps:');
  if (!edgeFunctionWorking) {
    console.log('   1. Check Figma Make for deployment status');
    console.log('   2. Look for "Deploy" or "Publish" button');
    console.log('   3. Wait 1-2 minutes for deployment');
    console.log('   4. Run deploymentCheck() again');
  } else if (!authWorking && isLoggedIn) {
    console.log('   1. Logout and login again to get fresh token');
    console.log('   2. Run deploymentCheck() after login');
  } else {
    console.log('   ✨ Everything looks good! Try using the app.');
  }
  
  console.log('\n━'.repeat(50));
}

async function checkEndpoint(url: string, token?: string): Promise<boolean> {
  try {
    const headers: HeadersInit = { 'Authorization': `Bearer ${token || publicAnonKey}` };
    const response = await fetch(url, { headers });
    return response.ok;
  } catch {
    return false;
  }
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).deploymentCheck = deploymentCheck;
}
