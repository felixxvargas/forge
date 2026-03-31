import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, MessageCircle, Lock, FileText } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export function PrivacySettings() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();
  const [allowDMs, setAllowDMs] = useState<boolean>(currentUser?.allow_dms !== false);

  const handleToggleAllowDMs = async () => {
    const next = !allowDMs;
    setAllowDMs(next);
    try {
      await updateCurrentUser({ allow_dms: next });
    } catch {
      setAllowDMs(!next);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Privacy & Security</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Privacy section */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Privacy</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={handleToggleAllowDMs}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Direct Messages</p>
                <p className="text-sm text-muted-foreground">
                  {allowDMs ? 'Anyone can message you' : 'Only you can start DMs'}
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${allowDMs ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowDMs ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Legal section */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Legal</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <Link
              to="/privacy"
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Privacy Policy</p>
              </div>
            </Link>
            <Link
              to="/terms"
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Terms of Service</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
