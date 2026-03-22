"use client";
import { useEffect, useState } from "react";

export function GTMScript() {
  const [consent, setConsent] = useState(false);
  const [ids, setIds] = useState<{ gtm?: string; ga4?: string; fbPixel?: string }>({});

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent") === "accepted";
    setConsent(accepted);

    if (accepted) {
      fetch("/api/badge-config")
        .then((r) => r.json())
        .then((json) => {
          if (json.data) {
            setIds({
              gtm: json.data.gtmId || "",
              ga4: json.data.ga4Id || "",
              fbPixel: json.data.fbPixelId || "",
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!consent) return null;

  // Use env vars as fallback, DB settings take priority
  const gtmId = ids.gtm || process.env.NEXT_PUBLIC_GTM_ID || "";
  const ga4Id = ids.ga4 || "";
  const fbPixelId = ids.fbPixel || "";

  const validGtm = /^GTM-[A-Z0-9]+$/i.test(gtmId);
  const validGa4 = /^G-[A-Z0-9]+$/i.test(ga4Id);
  const validFbPixel = /^\d+$/.test(fbPixelId);

  if (!validGtm && !validGa4 && !validFbPixel) return null;

  return (
    <>
      {validGtm && (
        <script dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
        }} />
      )}
      {validGa4 && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
          <script dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');`
          }} />
        </>
      )}
      {validFbPixel && (
        <script dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`
        }} />
      )}
    </>
  );
}
