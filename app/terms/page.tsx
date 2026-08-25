import type { Metadata } from "next";
import { affiliateEnabled } from "@/lib/affiliate";
import Link from "next/link";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Coqui Cardboard.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Service · Coqui Cardboard", description: "The terms that govern your use of Coqui Cardboard.", url: "/terms", type: "website" },
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="June 15, 2026">
      <h2>1. Agreement</h2>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Coqui Cardboard (the
        &ldquo;Service&rdquo;), a website and tools for tracking sports trading cards. By accessing or using the
        Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>2. What Coqui Cardboard is</h2>
      <p>
        Coqui Cardboard is an independent, fan-made tool for cataloging, organizing, valuing, and sharing trading-card
        collections. It is provided for informational and personal-use purposes only. It is not affiliated with,
        endorsed by, or sponsored by the NBA, NBA Players Inc., Michael Jordan, Fanatics, Topps, Panini, Upper Deck,
        PSA, eBay, or any league, player, or card manufacturer.
      </p>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Service. By using it, you represent that you meet this
        requirement and that you have the legal capacity to enter into these Terms.
      </p>

      <h2>4. Your account</h2>
      <p>
        Some features require an account, created via a one-time email link or a third-party sign-in (such as Google).
        You are responsible for the activity under your account and for keeping access to your email secure. Provide
        accurate information and notify us promptly of any unauthorized use.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>scrape, crawl, harvest, or bulk-download data or images from the Service except as expressly permitted;</li>
        <li>interfere with, overload, or attempt to gain unauthorized access to the Service or its infrastructure;</li>
        <li>use the Service for any unlawful, infringing, deceptive, or abusive purpose;</li>
        <li>upload content you do not have the right to share, or that is unlawful or violates others&rsquo; rights.</li>
      </ul>

      <h2>6. Your content</h2>
      <p>
        You retain ownership of the collection data, notes, profile details, and other content you submit (&ldquo;Your
        Content&rdquo;). You grant Coqui Cardboard a non-exclusive, worldwide, royalty-free license to host and display
        Your Content solely to operate the Service — including showing the parts of your collection you choose to make
        public (for example, a public profile). You are responsible for Your Content and for the accuracy of the data
        you enter.
      </p>

      <h2>7. Intellectual property &amp; third-party rights</h2>
      <p>
        All player and team names, logos, trademarks, and card images are the property of their respective owners and
        are used for identification and reference only. Card images are sourced from public databases and displayed
        for cataloging purposes. The Michael Jordan Hierarchy tier concept is credited to Cajun Cardboard. Coqui
        Cardboard claims no ownership of these third-party marks or images.
      </p>

      <h2>8. Market values are not advice</h2>
      <p>
        Estimated values shown in the Service are aggregated from public marketplace listings and are provided for
        informational purposes only. They are estimates, may be inaccurate or out of date, and do not constitute
        financial, investment, appraisal, or insurance advice. Do not rely on them for buying, selling, or insuring
        decisions.
      </p>

      <h2>9. Affiliate links</h2>
      {/* Stated conditionally: claiming an affiliate relationship we don't have is as
          inaccurate as failing to disclose one we do. `affiliateEnabled` is true only
          when a campaign id is configured, which is the same flag that tags the links. */}
      {affiliateEnabled ? (
        <p>
          As a member of the eBay Partner Network, Coqui Cardboard may earn a commission from qualifying purchases made
          through outbound links on the Service, at no extra cost to you. Such links do not influence the catalog or
          valuations shown.
        </p>
      ) : (
        <p>
          Outbound links to marketplaces (for example &ldquo;find on eBay&rdquo;) are provided for convenience and are
          not affiliate links; Coqui Cardboard earns no commission from them. Should that change, this section and the
          site footer will say so. Such links do not influence the catalog or valuations shown.
        </p>
      )}

      <h2>10. Third-party services &amp; links</h2>
      <p>
        The Service links to and relies on third-party services (for example marketplaces, sign-in providers, and
        hosting/data providers). We are not responsible for the content, policies, or practices of any third-party
        site or service. Your use of them is governed by their own terms.
      </p>

      <h2>11. Disclaimer of warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind,
        express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do
        not warrant that the Service will be uninterrupted, error-free, or that any data or valuation is accurate.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Coqui Cardboard and its operators will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of data, profits, or collection value,
        arising from your use of the Service.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Coqui Cardboard and its operators from any claims, damages, or
        expenses arising out of your use of the Service, Your Content, or your violation of these Terms.
      </p>

      <h2>14. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or terminate access if you
        violate these Terms or to protect the Service. Provisions that by their nature should survive termination will
        survive.
      </p>

      <h2>15. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Commonwealth of Puerto Rico and the United States, without regard
        to conflict-of-laws rules.
      </p>

      <h2>16. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be reflected by the &ldquo;Last updated&rdquo;
        date above. Continued use of the Service after changes take effect constitutes acceptance.
      </p>

      <h2>17. Contact</h2>
      <p>
        Questions about these Terms? Email <a href="mailto:privacy@coquicardboard.com">privacy@coquicardboard.com</a>.
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalDoc>
  );
}
