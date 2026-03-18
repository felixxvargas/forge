/**
 * Utility for debugging localStorage data
 * 
 * Run these in the browser console:
 * - checkLocalStorage() - View all localStorage data
 * - clearAllLocalStorage() - Clear all Forge data
 */

export function checkLocalStorage() {
  console.log('📦 Checking localStorage data...\n');
  
  const users = localStorage.getItem('forge-users');
  if (users) {
    const parsed = JSON.parse(users);
    console.log('👥 Users in localStorage:', parsed.length);
    parsed.forEach((user: any) => {
      console.log(`  - ${user.handle} (${user.displayName}) [${user.accountType || 'user'}]`);
    });
  } else {
    console.log('👥 No users in localStorage');
  }
  
  console.log('\n');
  
  const currentUser = localStorage.getItem('forge-current-user');
  if (currentUser) {
    const parsed = JSON.parse(currentUser);
    console.log('👤 Current user:', parsed.handle, '-', parsed.displayName);
    console.log('📧 Email:', parsed.email);
  } else {
    console.log('👤 No current user in localStorage');
  }
  
  console.log('\n');
  console.log('🔑 Auth status:');
  console.log('  - Logged in:', localStorage.getItem('forge-logged-in'));
  console.log('  - Has access token:', !!localStorage.getItem('forge-access-token'));
  console.log('  - Onboarding complete:', localStorage.getItem('forge-onboarding-complete'));
  console.log('  - User ID:', localStorage.getItem('forge-user-id'));
}

export function clearAllLocalStorage() {
  console.log('🧹 Clearing all localStorage...');
  
  const keys = [
    'forge-current-user',
    'forge-users',
    'forge-posts',
    'forge-liked-posts',
    'forge-reposted-posts',
    'forge-filtered-social-platforms',
    'forge-user-id',
    'forge-logged-in',
    'forge-onboarding-complete',
    'forge-access-token'
  ];
  
  keys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  ✅ Removed ${key}`);
  });
  
  console.log('\n✅ All localStorage cleared!');
  console.log('🔄 Reload the page to start fresh.');
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).checkLocalStorage = checkLocalStorage;
  (window as any).clearAllLocalStorage = clearAllLocalStorage;
  console.log('💡 Forge Debug Commands Available:');
  console.log('   checkLocalStorage() - View all localStorage data');
  console.log('   clearAllLocalStorage() - Clear all Forge data from localStorage');
}