import { useNavigate, Link } from 'react-router';
import { ArrowLeft, Trash2, Shield, Mail, Smartphone } from 'lucide-react';

const APP_NAME = 'Forge';
const DEVELOPER = 'Forge Social';
const CONTACT_EMAIL = 'privacy@forge-social.app';
const PLAY_STORE_NAME = 'Forge - Gaming Social Network';

export function DataDeletion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Account & Data Deletion</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{APP_NAME} — Account &amp; Data Deletion</h2>
              <p className="text-sm text-muted-foreground">{DEVELOPER} · {PLAY_STORE_NAME}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You have the right to request deletion of your {APP_NAME} account and all associated personal data.
            This page explains how to make that request, what data is removed, and what (if anything) is retained
            after deletion, and for how long.
          </p>
        </div>

        {/* Option 1: Delete in-app */}
        <Section icon={<Smartphone className="w-5 h-5 text-accent" />} title="Option 1 — Delete your account in the app">
          <p className="text-sm text-muted-foreground mb-4">
            The fastest way to delete your account is directly inside the {APP_NAME} app.
            Your account and data are permanently deleted immediately.
          </p>
          <ol className="space-y-3">
            {[
              'Open the Forge app and sign in.',
              'Tap your profile icon or navigate to Settings.',
              'Scroll to the "Danger Zone" section at the bottom.',
              'Tap "Delete Account".',
              'Read the confirmation dialog — it lists exactly what will be deleted.',
              'Type DELETE to confirm, then tap "Permanently Delete Account".',
              'Your account is deleted immediately. You will be signed out.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-foreground/80 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Option 2: Email request */}
        <Section icon={<Mail className="w-5 h-5 text-accent" />} title="Option 2 — Request deletion by email">
          <p className="text-sm text-muted-foreground mb-4">
            If you no longer have access to your account or prefer to request deletion via email,
            contact us at:
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Account Deletion Request`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            Please include your Forge username or the email address associated with your account.
            We will process your request within <strong className="text-foreground">30 days</strong> and
            send a confirmation when complete.
          </p>
        </Section>

        {/* What gets deleted */}
        <Section icon={<Trash2 className="w-5 h-5 text-destructive" />} title="What is deleted">
          <p className="text-sm text-muted-foreground mb-3">
            When your account is deleted (by either method above), the following data is <strong className="text-foreground">permanently and irrecoverably removed</strong>:
          </p>
          <ul className="space-y-2 text-sm text-foreground/80">
            {[
              'Your profile — display name, handle, bio, profile picture, and banner',
              'All posts, comments, and replies you created',
              'Your game lists (library, recently played, favorites, wishlist)',
              'Follows and followers relationships',
              'Group memberships and any groups you created',
              'Likes, reposts, and other engagement data',
              'Notification history',
              'Direct messages',
              'LFG flares you posted',
              'Your authentication credentials (email/password or OAuth link)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-destructive mt-1">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        {/* What may be retained */}
        <Section icon={<Shield className="w-5 h-5 text-yellow-500" />} title="What may be retained, and for how long">
          <p className="text-sm text-muted-foreground mb-3">
            A small amount of data may be retained after deletion for legal, safety, or operational reasons:
          </p>
          <div className="space-y-4">
            <RetentionRow
              what="Aggregated, anonymised analytics"
              period="Indefinite"
              reason="Used to understand overall platform usage; contains no personally identifiable information."
            />
            <RetentionRow
              what="Abuse / safety records"
              period="Up to 12 months"
              reason="If your account was involved in a moderation action or reported for policy violations, a minimal record may be kept to prevent re-registration abuse."
            />
            <RetentionRow
              what="Financial / billing records"
              period="Up to 7 years"
              reason="Required by applicable financial regulations where a transaction occurred (e.g. a premium subscription)."
            />
            <RetentionRow
              what="Backup snapshots"
              period="Up to 30 days"
              reason="Automated database backups may contain your data for up to 30 days before they expire and are purged."
            />
          </div>
        </Section>

        {/* Partial deletion */}
        <Section icon={<Shield className="w-5 h-5 text-accent" />} title="Requesting deletion of specific data without deleting your account">
          <p className="text-sm text-muted-foreground mb-4">
            You can request deletion of specific types of data without closing your account entirely.
            To do so, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">{CONTACT_EMAIL}</a>{' '}
            and specify:
          </p>
          <ul className="space-y-2 text-sm text-foreground/80 list-disc list-outside pl-5">
            <li>Your Forge username or registered email address</li>
            <li>The specific type of data you want removed (e.g. all posts, your profile picture, game lists)</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            We will process specific data deletion requests within <strong className="text-foreground">30 days</strong>.
          </p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground underline">Terms of Service</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground underline">{CONTACT_EMAIL}</a>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function RetentionRow({ what, period, reason }: { what: string; period: string; reason: string }) {
  return (
    <div className="bg-secondary/50 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4 mb-1">
        <span className="text-sm font-medium">{what}</span>
        <span className="text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full shrink-0">{period}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
    </div>
  );
}
