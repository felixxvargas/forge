import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'March 30, 2026';
const CONTACT_EMAIL = 'legal@forge-social.app';
const APP_NAME = 'Forge';
const COMPANY = 'Forge Social';

export function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Terms of Service</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-muted-foreground text-sm mb-8">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using {APP_NAME} ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, do not use the Service. These terms constitute a legally binding agreement
            between you and {COMPANY}.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 13 years old to use {APP_NAME}. By using the Service, you represent that you meet this
            requirement. If you are under 18, you represent that a parent or guardian has consented to these terms.
          </p>
        </Section>

        <Section title="3. Your Account">
          <ul>
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate information when creating your account.</li>
            <li>You may not impersonate other people or use a username that is misleading or offensive.</li>
            <li>You may not share your account or allow others to use it.</li>
          </ul>
        </Section>

        <Section title="4. User Content">
          <Subsection title="Your Content">
            You retain ownership of content you post. By posting, you grant {COMPANY} a non-exclusive, royalty-free,
            worldwide licence to use, display, and distribute your content within the Service.
          </Subsection>
          <Subsection title="Prohibited Content">
            You may not post content that:
          </Subsection>
          <ul>
            <li>Is illegal, threatening, harassing, abusive, or defamatory</li>
            <li>Infringes any third-party intellectual property rights</li>
            <li>Contains malware, spam, or deceptive material</li>
            <li>Violates anyone's privacy or shares another person's personal information without consent</li>
            <li>Depicts sexual content involving minors</li>
            <li>Promotes hate speech based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
          </ul>
          <Subsection title="Enforcement">
            We reserve the right to remove any content that violates these terms and to suspend or terminate accounts
            of users who repeatedly violate these terms.
          </Subsection>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Attempt to access other users' accounts without permission</li>
            <li>Scrape, crawl, or systematically download content from the Service</li>
            <li>Use automated bots or scripts to interact with the Service</li>
            <li>Attempt to disrupt or overwhelm the Service's infrastructure</li>
            <li>Circumvent any security features or access controls</li>
            <li>Use the Service for commercial advertising without our prior written consent</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            {APP_NAME}'s name, logo, design, and all software are owned by {COMPANY} and protected by intellectual property laws.
            You may not copy, modify, distribute, or create derivative works from our proprietary materials without our written consent.
          </p>
        </Section>

        <Section title="7. Third-Party Services">
          <p>
            {APP_NAME} integrates with third-party services (Google authentication, game databases, etc.). Your use of those
            services is governed by their respective terms and privacy policies. We are not responsible for third-party services.
          </p>
        </Section>

        <Section title="8. Disclaimers">
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. {COMPANY.toUpperCase()} DISCLAIMS ALL WARRANTIES,
            EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR HARMFUL COMPONENTS.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED
            OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED £100 OR THE AMOUNT YOU PAID US IN THE
            PAST 12 MONTHS, WHICHEVER IS GREATER.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may delete your account at any time. We reserve the right to suspend or terminate your account, with or without
            notice, for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to
            use the Service ceases immediately.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These terms shall be governed by and construed in accordance with applicable law. Any disputes arising from
            these terms or the Service shall be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.
          </p>
        </Section>

        <Section title="12. Changes to Terms">
          <p>
            We may update these terms from time to time. We will notify you of material changes via email or in-app notice.
            Continued use of {APP_NAME} after changes constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            For questions about these terms, please contact us at{' '}
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
      <span className="font-medium text-foreground">{title} </span>
      <span>{children}</span>
    </div>
  );
}
