import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { userAPI } from '../../utils/api';

interface UsernameScreenProps {
  onComplete: (username: string, displayName: string, pronouns: string) => void;
}

function getFormatError(value: string): string | null {
  if (value.length < 3) return 'Handle must be at least 3 characters';
  if (value.length > 20) return 'Handle must be 20 characters or less';
  if (!/^[a-z0-9_]+$/.test(value)) return 'Handle can only use lowercase letters, numbers, and underscores';
  return null;
}

export function UsernameScreen({ onComplete }: UsernameScreenProps) {
  const [handle, setHandle] = useState(() => sessionStorage.getItem('forge-onboarding-username') ?? '');
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('forge-onboarding-display-name') ?? '');
  const [pronouns, setPronouns] = useState(() => sessionStorage.getItem('forge-onboarding-pronouns') ?? '');
  const [feedback, setFeedback] = useState<'available' | 'taken' | 'invalid' | 'checking' | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<any>(null);

  // Restore validation state on mount if a handle was drafted
  useEffect(() => {
    const saved = sessionStorage.getItem('forge-onboarding-username');
    if (saved) validateHandle(saved);
  }, []);

  const validateHandle = async (value: string) => {
    if (!value) {
      setFeedback(null);
      setFormatError(null);
      return;
    }

    const err = getFormatError(value);
    if (err) {
      setFormatError(err);
      setFeedback('invalid');
      return;
    }

    setFormatError(null);
    setFeedback('checking');

    try {
      const result = await userAPI.checkHandle(value);
      setFeedback(result.available ? 'available' : 'taken');
    } catch {
      // If the availability check fails, allow the user to proceed
      // The server will catch duplicates at submission time
      setFeedback('available');
    }
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setHandle(value);
    sessionStorage.setItem('forge-onboarding-username', value);

    if (checkTimeout) clearTimeout(checkTimeout);

    if (!value) {
      setFeedback(null);
      setFormatError(null);
      return;
    }

    setFeedback('checking');
    const timeout = setTimeout(() => validateHandle(value), 500);
    setCheckTimeout(timeout);
  };

  const handleSubmit = () => {
    if (feedback === 'available' && displayName.trim()) {
      sessionStorage.removeItem('forge-onboarding-username');
      sessionStorage.removeItem('forge-onboarding-display-name');
      sessionStorage.removeItem('forge-onboarding-pronouns');
      onComplete(handle, displayName.trim(), pronouns.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && feedback === 'available' && displayName.trim()) {
      handleSubmit();
    }
  };

  const canContinue = feedback === 'available' && displayName.trim().length > 0;

  const feedbackMessage = () => {
    if (feedback === 'available') return { text: '✓ Handle is available!', ok: true };
    if (feedback === 'taken') return { text: '✗ Handle is already taken', ok: false };
    if (feedback === 'invalid') return { text: `✗ ${formatError ?? 'Handle is not available'}`, ok: false };
    return null;
  };

  const msg = feedbackMessage();

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto">
      <div className="min-h-screen px-6 py-12 pb-8 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              This is how other gamers will find you on Forge
            </p>
          </motion.div>

          {/* Display Name */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-4"
          >
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); sessionStorage.setItem('forge-onboarding-display-name', e.target.value); }}
              onKeyPress={handleKeyPress}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-secondary rounded-lg border-2 border-transparent focus:border-accent focus:outline-none transition-colors"
              maxLength={50}
            />
          </motion.div>

          {/* Handle Input */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <label htmlFor="handle" className="block text-sm font-medium mb-2">
              Handle
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </div>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={handleHandleChange}
                onKeyPress={handleKeyPress}
                placeholder="yourhandle"
                className={`w-full pl-8 pr-12 py-3 bg-secondary rounded-lg border-2 transition-colors focus:outline-none ${
                  feedback === 'available'
                    ? 'border-accent focus:border-accent'
                    : feedback === 'taken' || feedback === 'invalid'
                    ? 'border-destructive focus:border-destructive'
                    : 'border-transparent focus:border-accent'
                }`}
              />
              {feedback && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {feedback === 'checking' ? (
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : feedback === 'available' ? (
                    <Check className="w-5 h-5 text-accent" />
                  ) : (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              )}
            </div>

            {msg && feedback !== 'checking' && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-2 text-sm ${msg.ok ? 'text-accent' : 'text-destructive'}`}
              >
                {msg.text}
              </motion.p>
            )}
          </motion.div>

          {/* Pronouns */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mb-6"
          >
            <label htmlFor="pronouns" className="block text-sm font-medium mb-2">
              Pronouns <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="pronouns"
              type="text"
              value={pronouns}
              onChange={e => { setPronouns(e.target.value); sessionStorage.setItem('forge-onboarding-pronouns', e.target.value); }}
              onKeyPress={handleKeyPress}
              placeholder="e.g., she/her, he/him, they/them"
              className="w-full px-4 py-3 bg-secondary rounded-lg border-2 border-transparent focus:border-accent focus:outline-none transition-colors"
              maxLength={30}
            />
          </motion.div>

          {/* Requirements */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-lg p-4 mb-8"
          >
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">Handle Requirements:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className={`flex items-center gap-2 ${handle.length >= 3 ? 'text-accent' : ''}`}>
                {handle.length >= 3 ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                At least 3 characters
              </li>
              <li className={`flex items-center gap-2 ${handle.length > 0 && handle.length <= 20 ? 'text-accent' : ''}`}>
                {handle.length > 0 && handle.length <= 20 ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                Maximum 20 characters
              </li>
              <li className={`flex items-center gap-2 ${handle && /^[a-z0-9_]+$/.test(handle) ? 'text-accent' : ''}`}>
                {handle && /^[a-z0-9_]+$/.test(handle) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                Only lowercase letters, numbers, and underscores
              </li>
              <li className={`flex items-center gap-2 ${feedback === 'available' ? 'text-accent' : ''}`}>
                {feedback === 'available' ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-muted" />}
                Not already taken
              </li>
            </ul>
          </motion.div>

          {/* Continue Button */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleSubmit}
            disabled={!canContinue}
            className="w-full py-3 px-6 bg-accent text-accent-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
          >
            Complete Sign Up
          </motion.button>
        </div>
      </div>
    </div>
  );
}
