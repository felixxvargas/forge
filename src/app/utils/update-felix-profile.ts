/**
 * Utility to update felixvgiles@gmail.com profile to @felix in the backend
 * 
 * Run this in the browser console:
 * ```
 * updateFelixProfile()
 * ```
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

export async function updateFelixProfile() {
  console.log('🔧 Updating felixvgiles@gmail.com profile to @felix...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        email: 'felixvgiles@gmail.com',
        displayName: 'Felix',
        handle: '@felix'
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Profile updated successfully!', result);
      console.log('📧 Email:', 'felixvgiles@gmail.com');
      console.log('👤 Display Name:', result.profile?.displayName);
      console.log('🔖 Handle:', result.profile?.handle);
      console.log('');
      console.log('🔄 Refreshing page to load updated profile...');
      
      // Clear localStorage to force fresh data from backend
      localStorage.removeItem('forge-current-user');
      
      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.error('❌ Failed to update profile:', result);
      
      // If profile doesn't exist, try to create it
      if (result.error?.includes('not found')) {
        console.log('🆕 Profile not found, attempting to create it...');
        await createFelixProfile();
      }
    }
  } catch (error) {
    console.error('❌ Error updating profile:', error);
  }
}

export async function createFelixProfile() {
  console.log('🆕 Creating profile for felixvgiles@gmail.com...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/admin/create-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        email: 'felixvgiles@gmail.com',
        displayName: 'Felix',
        handle: '@felix'
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Profile created successfully!', result);
      console.log('🔄 Refreshing page to load new profile...');
      
      // Clear localStorage to force fresh data from backend
      localStorage.removeItem('forge-current-user');
      
      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.error('❌ Failed to create profile:', result);
    }
  } catch (error) {
    console.error('❌ Error creating profile:', error);
  }
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).updateFelixProfile = updateFelixProfile;
  (window as any).createFelixProfile = createFelixProfile;
  console.log('💡 Commands available:');
  console.log('   updateFelixProfile() - Update existing profile to @felix');
  console.log('   createFelixProfile() - Create new profile as @felix');
}
