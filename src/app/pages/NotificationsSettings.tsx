import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, Mail, Check } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export function NotificationsSettings() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAppData();

  const [toastNotificationsEnabled, setToastNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('forge-toast-notifications');
    return saved !== 'false';
  });
  const [dmEmailEnabled, setDmEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('forge-dm-email-notifications');
    if (saved !== null) return saved !== 'false';
    return currentUser?.dm_email_notifications !== false;
  });
  const [emailNotifications, setEmailNotifications] = useState<'off' | 'weekly' | 'all'>(() => {
    const saved = currentUser?.email_notifications;
    if (saved === 'off' || saved === 'all') return saved;
    return 'weekly';
  });

  useEffect(() => {
    localStorage.setItem('forge-toast-notifications', String(toastNotificationsEnabled));
  }, [toastNotificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('forge-dm-email-notifications', String(dmEmailEnabled));
    updateCurrentUser({ dm_email_notifications: dmEmailEnabled } as any).catch(() => {});
  }, [dmEmailEnabled]);

  const handleEmailNotificationsChange = async (value: 'off' | 'weekly' | 'all') => {
    setEmailNotifications(value);
    try {
      await updateCurrentUser({ email_notifications: value });
    } catch {
      // revert on error
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* In-app notifications */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">In-App</h2>
          <div className="bg-card rounded-xl overflow-hidden">
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
              <div className={`w-11 h-6 rounded-full transition-colors relative ${toastNotificationsEnabled ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${toastNotificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Direct message email notifications */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Direct Messages</h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => setDmEmailEnabled(!dmEmailEnabled)}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
            >
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div className="text-left flex-1">
                <p className="font-medium">Email on new message</p>
                <p className="text-sm text-muted-foreground">
                  {dmEmailEnabled ? 'Receive an email when you get a new DM' : 'No email for new DMs'}
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${dmEmailEnabled ? 'bg-accent' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dmEmailEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Email notifications */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Email Notifications</h2>
          <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
            {(['all', 'weekly', 'off'] as const).map((option) => {
              const labels = { all: 'Every notification', weekly: 'Weekly digest', off: 'Off' };
              const descs = { all: 'Get an email for each new notification', weekly: 'One summary email per week', off: 'No notification emails' };
              return (
                <button
                  key={option}
                  onClick={() => handleEmailNotificationsChange(option)}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-secondary transition-colors"
                >
                  <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="text-left flex-1">
                    <p className="font-medium">{labels[option]}</p>
                    <p className="text-sm text-muted-foreground">{descs[option]}</p>
                  </div>
                  {emailNotifications === option && (
                    <Check className="w-4 h-4 text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
