'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { storeLinkPreference, openLink, type LinkPreference } from '../utils/openExternalLink';

interface LinkOpenModalProps {
  url: string;
  onClose: () => void;
}

export function LinkOpenModal({ url, onClose }: LinkOpenModalProps) {
  const [save, setSave] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const pick = async (pref: LinkPreference) => {
    if (save) storeLinkPreference(pref);
    await openLink(url, pref);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-20 sm:pb-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60"
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative w-full max-w-sm mx-4 bg-sidebar rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold">Open link</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {isNative && (
              <button
                onClick={() => pick('inapp')}
                className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Open in Forge</p>
                  <p className="text-xs text-muted-foreground">Stay in the app</p>
                </div>
              </button>
            )}

            <button
              onClick={() => pick('browser')}
              className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                <ExternalLink className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{isNative ? 'Open in browser' : 'Open link'}</p>
                <p className="text-xs text-muted-foreground">
                  {isNative ? 'Opens in your default browser' : 'Opens in a new tab'}
                </p>
              </div>
            </button>

            <label className="flex items-center gap-2.5 px-1 py-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={save}
                onChange={e => setSave(e.target.checked)}
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-muted-foreground">Don't ask me again</span>
            </label>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
