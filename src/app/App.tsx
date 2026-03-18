import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import { Toaster } from './components/ui/sonner';
import { Suspense, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import './utils/reset-to-felix'; // Import to make debug commands available in console
import './utils/update-felix-profile'; // Import to make updateFelixProfile() available in console
import './utils/deployment-check'; // Import to make deploymentCheck() available in console

// App v1.0.6 - Fixed HMR context stability with module acceptance
export default function App() {
  // Debug helper - check localStorage data
  useEffect(() => {
    (window as any).checkLocalStorage = () => {
      console.log('📦 LocalStorage Data:');
      console.log('  forge-logged-in:', localStorage.getItem('forge-logged-in'));
      console.log('  forge-access-token:', localStorage.getItem('forge-access-token') ? '✓ Present' : '✗ Missing');
      console.log('  forge-user-id:', localStorage.getItem('forge-user-id'));
      console.log('  forge-onboarding-complete:', localStorage.getItem('forge-onboarding-complete'));
      console.log('  forge-current-user:', JSON.parse(localStorage.getItem('forge-current-user') || '{}'));
    };
    
    (window as any).clearAllLocalStorage = () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('forge-'));
      console.log(`🗑️ Clearing ${keys.length} Forge items from localStorage...`);
      keys.forEach(key => localStorage.removeItem(key));
      console.log('✅ Cleared! Reload the page to start fresh.');
    };

    (window as any).checkBackendUser = async () => {
      console.log('🔍 Checking backend user profile...');
      const token = localStorage.getItem('forge-access-token');
      if (!token) {
        console.error('❌ No access token found!');
        return;
      }
      
      try {
        const response = await fetch(`https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/make-server-17285bd7/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        console.log('Backend user data:', data);
        
        if (data.profile) {
          console.log('✅ Profile exists!');
          console.log('  ID:', data.profile.id);
          console.log('  Handle:', data.profile.handle || '(empty - needs onboarding)');
          console.log('  Display Name:', data.profile.displayName);
          console.log('  Email:', data.profile.email);
        } else {
          console.error('❌ No profile in response!');
        }
      } catch (error) {
        console.error('❌ Error checking backend:', error);
      }
    };

    console.log('💡 Forge Debug Commands Available:');
    console.log('   checkLocalStorage() - View all localStorage data');
    console.log('   clearAllLocalStorage() - Clear all Forge data from localStorage');
    console.log('   checkBackendUser() - Check your user profile on the backend');
  }, []);
  
  return (
    <ThemeProvider>
      <AppDataProvider>
        <Suspense fallback={<LoadingScreen />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster />
      </AppDataProvider>
    </ThemeProvider>
  );
}

// HMR: Accept updates to this module
if (import.meta.hot) {
  import.meta.hot.accept();
  console.log('[HMR] App module updated');
}