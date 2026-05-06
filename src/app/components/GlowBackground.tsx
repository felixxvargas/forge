'use client';
import { useTheme } from '../context/ThemeContext';

export function GlowBackground() {
  const { theme } = useTheme();
  if (theme !== 'dark') return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0, background: 'linear-gradient(135deg, #140e22 0%, #1c1228 60%, #100b1e 100%)', willChange: 'transform', transform: 'translateZ(0)' }}
      aria-hidden="true"
    >
      <div className="absolute top-[-20%] left-[0%] w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)', filter: 'blur(80px)', transform: 'translateZ(0)' }} />
      <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.22) 0%, transparent 70%)', filter: 'blur(90px)', transform: 'translateZ(0)' }} />
      <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(100px)', transform: 'translateZ(0)' }} />
      <div className="absolute bottom-[20%] left-[-5%] w-[450px] h-[450px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.20) 0%, transparent 70%)', filter: 'blur(70px)', transform: 'translateZ(0)' }} />
    </div>
  );
}
