import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Globe, Users, Lock } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import type { CommunityType } from '../data/data';
import { GAMING_ICONS, DEFAULT_ICON_KEY, GroupIcon } from '../components/GroupIcon';

interface TypeOption {
  value: CommunityType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'open', label: 'Open', description: 'Anyone can join', icon: <Globe className="w-5 h-5" /> },
  { value: 'request', label: 'Request to Join', description: 'Members need approval', icon: <Users className="w-5 h-5" /> },
  { value: 'invite', label: 'Invite Only', description: 'Members need an invitation', icon: <Lock className="w-5 h-5" /> },
];

export function CreateGroup() {
  const navigate = useNavigate();
  const { createCommunity } = useAppData();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON_KEY);
  const [type, setType] = useState<CommunityType>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Group name is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const community = await createCommunity(name.trim(), description.trim(), icon, type);
      navigate(`/community/${community.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create group. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold flex-1">Create Group</h1>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !description.trim()}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Icon picker */}
        <div>
          <label className="block text-sm font-medium mb-3">Group Icon</label>
          <div className="grid grid-cols-9 gap-2">
            {GAMING_ICONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setIcon(key)}
                title={label}
                className={`p-2.5 rounded-lg transition-colors flex items-center justify-center ${
                  icon === key
                    ? 'bg-accent/20 ring-2 ring-accent text-accent'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-accent">
              <GroupIcon iconKey={icon} className="w-6 h-6" />
            </div>
            <span className="text-sm text-muted-foreground">
              {GAMING_ICONS.find(g => g.key === icon)?.label ?? 'Selected icon'}
            </span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Final Fantasy Fans"
            className="w-full px-3 py-3 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">{name.length}/60</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            placeholder="What is this group about?"
            rows={4}
            className="w-full px-3 py-3 bg-secondary rounded-lg border border-transparent focus:border-accent focus:outline-none transition-colors resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length}/280</p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Group Type</label>
          <div className="space-y-2">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                  type === option.value
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-border/80 hover:bg-secondary/50'
                }`}
              >
                <div className={`shrink-0 ${type === option.value ? 'text-accent' : 'text-muted-foreground'}`}>
                  {option.icon}
                </div>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {type === option.value && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-accent shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
