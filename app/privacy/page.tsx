import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Coqui Cardboard collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy Policy · Coqui Cardboard", description: "How Coqui Cardboard collects, uses, and protects your information.", url: "/privacy", type: "website" },
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="June 15, 2026">
      <h2>1. Overview</h2>
      <p>
        This Privacy Policy explains what information Coqui Cardboard (the &ldquo;Service&rdquo;) collects, how it is
        used, and the choices you have. Coqui Cardboard is an independent, fan-made tool for tracking trading cards.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your email address, used to sign you in via a one-time link, and a basic profile (username, display name, optional avatar and bio).</li>
        <li><strong>Collection data you enter</strong> — the cards you mark as owned (condition, grade, quantity, purchase price, notes, for-trade status), your want list, and target prices.</li>
        <li><strong>Authentication via a third party</strong> — if you sign in with Google, we receive basic profile information (such as your email) from that provider; we do not receive your Google password.</li>
        <li><strong>Usage &amp; technical data</strong> — standard server logs and request information needed to operate and secure the Service.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>3. How we use your information</h2>
      <ul>
        <li>to provide the Service — saving your collection, computing values and analytics, and powering your account;</li>
        <li>to display the parts of your collection you choose to make public (for example, a public profile);</li>
        <li>to secure, maintain, debug, and improve the Service;</li>
        <li>to communicate with you about your account when necessary.</li>
      </ul>

      <h2>4. Cookies &amp; local storage</h2>
      <p>
        We use a cookie to keep you signed in (set by our authentication provider). We also store small preferences in
        your browser&rsquo;s local storage — such as your light/dark theme and sound setting — which never leave your
        device.
      </p>
      <p>
        We use <strong>Google Analytics</strong> to understand aggregate usage (such as page views, approximate
        location, and device type). Google may set analytics cookies for this purpose; see{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google&rsquo;s Privacy Policy</a>.
        You can opt out through your browser settings or Google&rsquo;s{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">opt-out browser add-on</a>.
        We do not use third-party advertising trackers.
      </p>

      <h2>5. Service providers</h2>
      <p>
        We rely on trusted third parties to operate the Service, each acting as a processor of the data needed for
        their function:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, and image storage;</li>
        <li><strong>Vercel</strong> — website hosting and delivery;</li>
        <li><strong>Google</strong> — optional sign-in and Google Analytics (anonymous usage measurement);</li>
        <li><strong>eBay</strong> — public marketplace pricing data and affiliate links.</li>
      </ul>
      <p>Your use of these providers is also subject to their own privacy policies.</p>

      <h2>6. Affiliate links</h2>
      <p>
        Some outbound links (for example &ldquo;find on eBay&rdquo;) are affiliate links. As a member of the eBay
        Partner Network, we may earn a commission from qualifying purchases. We do not receive your purchase details;
        the marketplace handles the transaction under its own policies.
      </p>

      <h2>7. Public profiles</h2>
      <p>
        If you choose to make your collection or profile public, the information you mark as public (such as owned
        cards, for-trade flags, and profile details) becomes viewable by anyone with the link. You control what is
        public and can change it at any time in your settings.
      </p>

      <h2>8. Data retention &amp; deletion</h2>
      <p>
        We keep your information for as long as your account is active. You can edit or remove your collection data at
        any time, and you can request deletion of your account and associated data by contacting us. Some records may
        be retained as required for security or legal reasons.
      </p>

      <h2>9. Security</h2>
      <p>
        We use reasonable technical measures — including encrypted connections and database access controls — to
        protect your information. No method of transmission or storage is completely secure, and we cannot guarantee
        absolute security.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly collect personal information from
        them. If you believe a child has provided us information, please contact us so we can remove it.
      </p>

      <h2>11. Your rights</h2>
      <p>
        You may access, correct, export, or delete your personal information. Depending on where you live, you may have
        additional rights under laws such as the GDPR or CCPA. To exercise any of these, contact us using the details
        below.
      </p>

      <h2>12. International users</h2>
      <p>
        The Service is operated from the Commonwealth of Puerto Rico (United States). If you access it from elsewhere,
        your information may be processed in the United States, which may have different data-protection laws than your
        country.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by the &ldquo;Last
        updated&rdquo; date above.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions or requests? Email <a href="mailto:privacy@coquicardboard.com">privacy@coquicardboard.com</a>. See
        also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalDoc>
  );
}
