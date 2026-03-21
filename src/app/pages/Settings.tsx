import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Moon, Sun, Bell, Lock, Info, LogOut, Upload, Heart, Gamepad2, Share2, Filter, Crown, Mail, KeyRound } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAppData } from '../context/AppDataContext';
import { useState, useEffect } from 'react';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, session } = useAppData();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('forge-toast-notifications');
    return saved !== 'false'; // Default to true
  });

  useEffect(() => {
    localStorage.setItem('forge-toast-notifications', String(toastNotificationsEnabled));
  }, [toastNotificationsEnabled]);

  const handleSetInterests = () => {
    navigate('/onboarding?step=interests');
  };

  const handleLogout = () => {
    localStorage.removeItem('forge-logged-in');
    localStorage.removeItem('forge-access-token');
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
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

    // TODO: Implement password change API call
    alert('Password change functionality coming soon!');
    setShowChangePassword(false);
  };

  const userEmail = session?.user?.email || currentUser?.email || 'Not available';

  return (
    <div className="min-h-screen pb-20">
      <Header showSettings={false} />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        {/* Appearance Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Appearance
          </h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={toggleTheme}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-accent">{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Account
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            {/* Email Display */}
            <div className="px-4 py-4 flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            {/* Change Password */}
            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Change Password</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/gaming-platforms')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Platforms</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/social-integrations')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Social Media Integrations</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/social-filtering')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Third-Party Post Filtering</p>
                <p className="text-sm text-muted-foreground">
                  Control which social media posts you see
                </p>
              </div>
            </button>
            <button
              onClick={() => setToastNotificationsEnabled(!toastNotificationsEnabled)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {toastNotificationsEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </button>
            <button className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Privacy & Security</p>
              </div>
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Preferences
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={handleSetInterests}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Gaming Interests</p>
                <p className="text-sm text-muted-foreground">
                  Update your gaming preferences
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Subscription
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/premium')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Crown className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.is_premium ? 'Forge Premium' : 'Free'}
                </p>
              </div>
              {currentUser?.is_premium && (
                <span className="px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full font-medium">Pro</span>
              )}
            </button>
          </div>
        </div>

        {/* Indie Games Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Indie Games
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button
              onClick={() => navigate('/submit-indie-game')}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Submit Indie Game</p>
                <p className="text-sm text-muted-foreground">
                  Submit your game to be featured on Forge
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            About
          </h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            <button className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">About Forge</p>
                <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              </div>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-4 flex items-center justify-center gap-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
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
    </div>
  );
}