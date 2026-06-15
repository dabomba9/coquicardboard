import Script from "next/script";

// Google Analytics (GA4). Uses NEXT_PUBLIC_GA_ID if set, otherwise defaults to the
// project's Measurement ID — but only in production builds, so it stays OFF in local
// dev and never pollutes analytics with dev traffic. Disclosed in the Privacy Policy.
const DEFAULT_GA_ID = "G-BCE0D60Z4M";

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || (process.env.NODE_ENV === "production" ? DEFAULT_GA_ID : "");
  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
