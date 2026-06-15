import Script from "next/script";

// Google Analytics (GA4). Loads only when NEXT_PUBLIC_GA_ID (a "G-XXXXXXXXXX"
// Measurement ID) is set — so it never runs locally and only activates in the
// environment where the id is configured. Disclosed in the Privacy Policy.
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
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
