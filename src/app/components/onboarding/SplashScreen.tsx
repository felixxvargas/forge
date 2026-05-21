import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Gamepad2, Users, Flame, Tv2 } from 'lucide-react';
import ForgeSVG from '../../../assets/forge-logo.svg?react';

interface SplashScreenProps {
  onComplete: () => void;
}

const FEATURES = [
  { icon: Gamepad2, text: 'Track your game library across every platform' },
  { icon: Users, text: 'Connect with gamers and join communities' },
  { icon: Flame, text: 'Find teammates instantly with LFG flares' },
  { icon: Tv2, text: 'Auto-archive your Twitch streams to your profile' },
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-background flex items-center justify-center z-50 px-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-[-15%] left-[5%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[0%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        >
          <ForgeSVG width="56" height="46" aria-hidden="true" />
          <span className="font-black text-4xl text-accent font-sora tracking-tight">Forge</span>
          <p className="text-muted-foreground text-sm">Your gaming social network</p>
        </motion.div>

        <div className="w-full space-y-3">
          {FEATURES.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={text}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
            >
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <p className="text-sm text-foreground/80">{text}</p>
            </motion.div>
          ))}
        </div>

        <motion.button
          className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.4 }}
          onClick={onComplete}
        >
          Get started
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
