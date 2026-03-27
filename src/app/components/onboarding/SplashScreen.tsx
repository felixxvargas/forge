import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ZapIcon } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-background flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: 0.2, 
            duration: 0.6,
            ease: "easeOut" 
          }}
        >
          <ZapIcon className="w-24 h-24 text-accent fill-current" strokeWidth={1.5} />
        </motion.div>
        
        <motion.div
          className="flex items-center gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-5xl font-bold text-foreground font-sora">Forge</h1>
          <motion.span
            className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-accent/15 text-accent self-center mt-1"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.4, ease: "easeOut" }}
          >
            Beta
          </motion.span>
        </motion.div>
        
        <motion.p
          className="text-muted-foreground text-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: 0.7, 
            duration: 0.6,
            ease: "easeOut" 
          }}
        >
          Connect. Play. Share.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}