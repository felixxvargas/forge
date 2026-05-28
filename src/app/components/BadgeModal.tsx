'use client';

interface BadgeModalProps {
  name: string;
  earnedAt: Date | null;
  description: string;
  icon: React.ReactNode;
  onClose: () => void;
}

function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function BadgeModal({ name, earnedAt, description, icon, onClose }: BadgeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl p-6 max-w-xs w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="font-semibold text-base">{name}</h2>
            {earnedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">Earned {fmtMonthYear(earnedAt)}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
