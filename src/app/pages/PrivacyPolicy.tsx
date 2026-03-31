import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'March 30, 2026';
const CONTACT_EMAIL = 'privacy@forge-social.app';
const APP_NAME = 'Forge';
const COMPANY = 'Forge Social';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 prose prose-invert prose-sm max-w-none">
        <p className="text-muted-foreground text-sm mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Introduction">
          <p>
            {COMPANY} ("we," "us," or "our") operates the {APP_NAME} gaming social network. This Privacy Policy explains
            how we collect, use, and protect your information when you use our app and website (collectively, the "Service").
          </p>
          <p>
            By using {APP_NAME}, you agree to the practices described in this policy. If you do not agree, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <Subsection title="Account Information">
            When you create an account, we collect your email address, display name, username (handle), and optionally a profile picture and bio.
            If you sign up with Google, we receive your Google profile name and email via OAuth.
          </Subsection>
          <Subsection title="Content You Post">
            Posts, comments, game lists, LFG flares, images, and any other content you publish on {APP_NAME}.
          </Subsection>
          <Subsection title="Social Graph">
            Who you follow and who follows you; communities and groups you join.
          </Subsection>
          <Subsection title="Gaming Data">
            Games you add to your library, ratings, playtime, and game preferences you provide.
          </Subsection>
          <Subsection title="Usage Data">
            Pages visited, features used, and interactions with the Service (collected via analytics to improve the product).
          </Subsection>
          <Subsection title="Device Information">
            Browser type, operating system, and approximate location derived from IP address for analytics purposes.
          </Subsection>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul>
            <li>To operate and provide the {APP_NAME} Service</li>
            <li>To display your public profile to other users</li>
            <li>To send you notifications about activity related to your account</li>
            <li>To send email notifications (if you have opted in) including weekly digests</li>
            <li>To improve, personalise, and develop new features</li>
            <li>To detect and prevent fraud, abuse, and violations of our Terms of Service</li>
            <li>To comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="4. Information Sharing">
          <p>We do not sell your personal data. We share information only in these circumstances:</p>
          <Subsection title="Public Profile">
            Your handle, display name, profile picture, bio, posts, and public game lists are visible to all {APP_NAME} users.
          </Subsection>
          <Subsection title="Service Providers">
            We use Supabase (database and authentication), Vercel (hosting), Resend (transactional email), and Sentry (error monitoring).
            These providers process data only as necessary to provide their services.
          </Subsection>
          <Subsection title="Legal Requirements">
            We may disclose information if required by law or to protect the rights, safety, or property of {COMPANY}, our users, or the public.
          </Subsection>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account data for as long as your account is active. If you delete your account, we will delete or anonymise
            your personal data within 30 days, except where retention is required by law.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
            <li><strong>Correction</strong> — request that inaccurate data be corrected</li>
            <li><strong>Deletion</strong> — request deletion of your account and personal data</li>
            <li><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
            <li><strong>Opt-out</strong> — unsubscribe from email notifications at any time in Settings</li>
          </ul>
          <p>To exercise these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>
            We use essential cookies for authentication (managed by Supabase). We use analytics tools to understand
            aggregate usage patterns. You may disable non-essential cookies via your browser settings.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            {APP_NAME} is not directed to children under 13. We do not knowingly collect personal information from children under 13.
            If you believe a child under 13 has provided us with their personal data, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            We use industry-standard security practices including encrypted connections (HTTPS/TLS), hashed passwords, and
            access controls. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notice.
            Continued use of {APP_NAME} after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            For privacy-related questions or requests, please email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:leading-relaxed">
      <h2 className="text-lg font-semibold mb-3 text-foreground">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <span className="font-medium text-foreground">{title}: </span>
      <span>{children}</span>
    </div>
  );
}
