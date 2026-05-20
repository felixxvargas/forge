import { useState } from 'react';
import { Sprout, FlaskConical } from 'lucide-react';
import { SproutListModal } from './SproutListModal';

interface Props {
  handle: string;
  createdAt?: string;
  accountType?: string;
}

const ALPHA_CUTOFF = new Date('2026-05-19');

export function UserBadgeIcons({ handle: _handle, createdAt, accountType }: Props) {
  const [sproutModalOpen, setSproutModalOpen] = useState(false);

  const isAlphaTester = !!createdAt && accountType !== 'topic' && new Date(createdAt) < ALPHA_CUTOFF;
  const isSprout = !!createdAt && (Date.now() - new Date(createdAt).getTime()) < 91 * 864e5;

  if (!isAlphaTester && !isSprout) return null;

  return (
    <>
      {isAlphaTester && (
        <span className="group/alpha relative inline-flex items-center shrink-0">
          <FlaskConical className="w-5 h-5 text-red-500" />
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 text-xs bg-card text-foreground rounded border border-border shadow-lg opacity-0 group-hover/alpha:opacity-100 transition-opacity whitespace-nowrap z-20">
            Alpha Tester
          </span>
        </span>
      )}
      {isSprout && (
        <span
          className="group/sprout relative inline-flex items-center cursor-pointer shrink-0"
          onClick={e => { e.stopPropagation(); setSproutModalOpen(true); }}
        >
          <Sprout className="w-5 h-5 text-green-400" />
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 text-xs bg-card text-foreground rounded border border-border shadow-lg opacity-0 group-hover/sprout:opacity-100 transition-opacity whitespace-nowrap z-20">
            Sprout
          </span>
        </span>
      )}
      {sproutModalOpen && <SproutListModal onClose={() => setSproutModalOpen(false)} />}
    </>
  );
}
