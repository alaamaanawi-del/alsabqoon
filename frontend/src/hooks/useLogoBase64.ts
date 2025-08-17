import { useEffect, useState } from 'react';

// Provided asset URL from the user upload (public, static)
const LOGO_B64_URL = 'https://customer-assets.emergentagent.com/job_prayertracker/artifacts/nw5zf246_logo_base64.txt';

export function useLogoBase64() {
  const [b64, setB64] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(LOGO_B64_URL);
        const txt = await res.text();
        if (active) setB64(txt.trim());
      } catch (e) {
        // ignore
      }
    })();
    return () => { active = false; };
  }, []);

  return b64;
}