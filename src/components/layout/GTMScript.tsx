"use client";
import { useEffect, useState } from "react";

export function GTMScript() {
  const [gtmId, setGtmId] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    // Check cookie consent
    const accepted = localStorage.getItem("cookie-consent") === "accepted";
    setConsent(accepted);

    if (accepted) {
      // Fetch GTM ID from a lightweight API
      fetch("/api/badge-config").then(r => r.json()).then(j => {
        // We'll use a different approach - just check if gtm_id is set
      }).catch(() => {});
    }
  }, []);

  // Actually, for simplicity, use NEXT_PUBLIC_GTM_ID env variable
  // This is the standard approach
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  if (!id || !consent) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`
      }} />
    </>
  );
}
