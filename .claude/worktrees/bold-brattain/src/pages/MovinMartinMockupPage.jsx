import React, { useEffect, useRef } from 'react';

export default function MovinMartinMockupPage() {
  const iframeRef = useRef(null);

  useEffect(() => {
    document.title = "Movin' Martin — Website Mockup | Stitch Studios";
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="/mockups/movin-martin/index.html"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
      }}
      title="Movin' Martin Website Mockup"
    />
  );
}
