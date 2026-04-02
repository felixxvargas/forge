import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../utils/supabase';

type AccountActionStep = 'none' | 'suspend-confirm1' | 'suspend-confirm2' | 'delete-confirm1' | 'delete-confirm2' | 'delete-confirm3';

export function AccountSettings() {
  const navigate = useNavigate();
  const { currentUser, session, signOut, updateCurrentUser } = useAppData();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [accountActionStep, setAccountActionStep] = useState<AccountActionStep>('none');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);

  const userEmail = session?.user?.email || currentUser?.email || 'Not available';

  const handleSuspendAccount = async () => {
    if (!currentUser?.id) return;
    setAccountActionLoading(true);
    try {
      await updateCurrentUser({ suspended: true });
      await signOut();
      navigate('/feed');
    } catch {
      setAccountActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id || deleteConfirmText !== 'DELETE') return;
    setAccountActionLoading(true);
    try {
      await supabase.rpc('delete_user_account');
      await signOut();
      navigate('/feed');
    } catch {
      setAccountActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    alert('Password change functionality coming soon!');
    setShowChangePassword(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Account</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Account info */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account Info</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <div className="px-4 py-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Change Password</p>
              </div>
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Account Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => setAccountActionStep('suspend-confirm1')}
              className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-secondary text-muted-foreground rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <span className="font-medium text-sm">Suspend Account</span>
            </button>
            <button
              onClick={() => setAccountActionStep('delete-confirm1')}
              className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
            >
              <span className="font-medium text-sm">Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend — Step 1 */}
      {accountActionStep === 'suspend-confirm1' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Suspend your account?</h2>
            <p className="text-sm text-muted-foreground">
              Your profile, posts, and lists will be hidden. You can unsuspend at any time by signing back in and turning suspension off in Settings.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => setAccountActionStep('suspend-confirm2')} className="flex-1 px-4 py-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm font-medium">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend — Step 2 */}
      {accountActionStep === 'suspend-confirm2' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Are you sure?</h2>
            <p className="text-sm text-muted-foreground">
              You'll be signed out and your account will be suspended until you log back in and re-enable it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button
                onClick={handleSuspendAccount}
                disabled={accountActionLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {accountActionLoading ? 'Suspending…' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete — Step 1 */}
      {accountActionStep === 'delete-confirm1' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Delete your account?</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently delete your profile, posts, game lists, and all activity. <strong>This cannot be undone.</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => setAccountActionStep('delete-confirm2')} className="flex-1 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium">I understand</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete — Step 2 */}
      {accountActionStep === 'delete-confirm2' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Final warning</h2>
            <p className="text-sm text-muted-foreground">
              Every post, list, follower, and piece of activity tied to your account will be gone forever. There is no recovery option.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button onClick={() => { setDeleteConfirmText(''); setAccountActionStep('delete-confirm3'); }} className="flex-1 px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors text-sm font-medium">Yes, delete it</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete — Step 3: type DELETE */}
      {accountActionStep === 'delete-confirm3' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Confirm deletion</h2>
            <p className="text-sm text-muted-foreground">
              Type <strong>DELETE</strong> below to permanently delete your account.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-destructive text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setAccountActionStep('none')} className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || accountActionLoading}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium disabled:opacity-40"
              >
                {accountActionLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
