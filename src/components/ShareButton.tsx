'use client';
import { useState } from 'react';

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable (insecure context); fail silently
    }
  };
  return (
    <button onClick={copy} className="text-xs">
      [ {copied ? 'COPIED' : 'SHARE'} ]
    </button>
  );
}
