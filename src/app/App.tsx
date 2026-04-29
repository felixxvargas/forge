import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import { Toaster } from './components/ui/sonner';
import { Suspense } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingTooltip } from './components/OnboardingTooltip';

export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <Suspense fallback={<LoadingScreen />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster />
        <OnboardingTooltip />
      </AppDataProvider>
    </ThemeProvider>
  );
}
