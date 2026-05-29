'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface WikiEntity {
  id: string;
  name: string;
  type: string;
  description: string;
  cover_image_url: string | null;
}

interface EntityEditSheetProps {
  entity: WikiEntity;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function EntityEditSheet({ entity, isOpen, onClose, onSubmitted }: EntityEditSheetProps) {
  const [description, setDescription] = useState(entity.description);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasChanges = description.trim() !== entity.description.trim();

  const submit = async () => {
    if (!hasChanges || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Sign in to propose edits'); return; }

      const content: Record<string, string> = {};
      if (description.trim() !== entity.description.trim()) content.description = description.trim();

      const res = await fetch('/api/insights/game-wiki-entity-edits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ entityId: entity.id, content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to submit edit');
        return;
      }

      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-t-2xl px-5 pt-5 pb-8 bg-card border border-border"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">Propose an Edit</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{entity.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Description field */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-white/60 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={6}
            maxLength={1500}
            placeholder="Write a concise, factual description..."
            className="w-full rounded-xl px-4 py-3 text-sm bg-background border border-border text-white placeholder-muted-foreground resize-none focus:outline-none focus:border-accent/40"
          />
          <p className="text-[11px] text-white/30 mt-1 text-right">{description.length}/1500</p>
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <p className="text-xs text-white/30 mb-4">
          Your edit will be reviewed by the community (3 votes, 70% approval, 24h after submission) before going live.
        </p>

        <button
          onClick={submit}
          disabled={!hasChanges || submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold text-background transition-colors disabled:opacity-40"
          style={{ background: '#E7FFC4' }}
        >
          {submitting ? 'Submitting…' : 'Submit Edit'}
        </button>
      </div>
    </div>
  );
}
