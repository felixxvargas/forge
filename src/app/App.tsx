import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import { Toaster } from './components/ui/sonner';
import { Suspense } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { OnboardingTooltip } from './components/OnboardingTooltip';

function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
      <div className="absolute top-[-20%] left-[0%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[550px] h-[550px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)', filter: 'blur(90px)' }} />
      <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-[20%] left-[-5%] w-[380px] h-[380px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.16) 0%, transparent 70%)', filter: 'blur(70px)' }} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <GlowBackground />
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
