import { useState } from 'react';
import { X, Send, Loader2, CheckCircle, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

type FeedbackType = 'feature_request' | 'bug' | 'general';

interface FeedbackModalProps {
  onClose: () => void;
}

const TYPES: { id: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature or improvement' },
  { id: 'bug', label: 'Bug Report', icon: Bug, description: 'Something isn\'t working right' },
  { id: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Share your thoughts' },
];

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { currentUser } = useAppData();
  const [type, setType] = useState<FeedbackType>('feature_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('feedback').insert({
        type,
        title: title.trim(),
        description: description.trim(),
        user_id: currentUser?.id ?? null,
        user_handle: currentUser?.handle ?? null,
        status: 'open',
        created_at: new Date().toISOString(),
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-card rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4 text-center" onClick={e => e.stopPropagation()}>
          <CheckCircle className="w-14 h-14 text-green-500" />
          <h2 className="text-xl font-semibold">Thanks for your feedback!</h2>
          <p className="text-muted-foreground text-sm">We review every submission and use it to improve Forge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Send Feedback</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setType(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors text-center ${
                  type === id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-transparent bg-secondary hover:bg-secondary/80 text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            {TYPES.find(t => t.id === type)?.description}
          </p>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'bug' ? 'e.g. Profile picture not saving' : type === 'feature_request' ? 'e.g. Add dark mode to game cards' : 'Brief summary'}
              maxLength={120}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {type === 'bug' ? 'Steps to reproduce *' : 'Description *'}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'What did you do? What happened? What did you expect?'
                  : type === 'feature_request'
                  ? 'Describe the feature and why it would be useful'
                  : 'Share your thoughts...'
              }
              rows={5}
              maxLength={1000}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/1000</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Sending…' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}
