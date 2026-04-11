import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send, Loader2, CheckCircle, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';

type FeedbackType = 'feature_request' | 'bug' | 'general';

const TYPES: { id: FeedbackType; label: string; icon: typeof Bug; description: string }[] = [
  { id: 'feature_request', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature or improvement' },
  { id: 'bug', label: 'Bug Report', icon: Bug, description: "Something isn't working right" },
  { id: 'general', label: 'General Feedback', icon: MessageSquare, description: 'Share your thoughts' },
];

export function FeedbackPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppData();
  const [type, setType] = useState<FeedbackType>('feature_request');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const TYPE_LABELS: Record<FeedbackType, string> = {
    feature_request: 'Feature Request',
    bug: 'Bug Report',
    general: 'General Feedback',
  };

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
      // Fire-and-forget email notification
      fetch('/api/emails/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'felixvgiles@gmail.com',
          subject: `[Forge Feedback] ${TYPE_LABELS[type]}: ${title.trim()}`,
          recipientName: 'Felix',
          body: `<strong>Type:</strong> ${TYPE_LABELS[type]}<br><strong>From:</strong> ${currentUser?.handle ?? 'Anonymous'}<br><br><strong>Title:</strong> ${title.trim()}<br><br><strong>Description:</strong><br>${description.trim().replace(/\n/g, '<br>')}`,
        }),
      }).catch(() => {});
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Send Feedback</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 text-center py-16">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-semibold">Thanks for your feedback!</h2>
            <p className="text-muted-foreground text-sm">We review every submission and use it to improve Forge.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors text-center ${
                    type === id
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-transparent bg-card hover:bg-secondary text-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
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
                className="w-full px-3 py-2.5 bg-card rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
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
                rows={6}
                maxLength={1000}
                className="w-full px-3 py-2.5 bg-card rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/1000</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !description.trim() || submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
