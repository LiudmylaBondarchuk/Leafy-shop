"use client";
import { useEffect, useState } from "react";

export function GTMScript() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent") === "accepted";
    setConsent(accepted);
  }, []);

  const id = process.env.NEXT_PUBLIC_GTM_ID;
  // Validate GTM ID format to prevent XSS
  if (!id || !consent || !/^GTM-[A-Z0-9]+$/i.test(id)) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`
      }} />
    </>
  );
}
