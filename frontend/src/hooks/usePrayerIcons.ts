import { useState, useEffect } from 'react';

export interface PrayerIcons {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

// Base64 encoded prayer icons
const PRAYER_ICONS_BASE64: PrayerIcons = {
  fajr: '', // Will be populated after downloading and converting
  dhuhr: '',
  asr: '',
  maghrib: '',
  isha: ''
};

export const usePrayerIcons = () => {
  const [icons, setIcons] = useState<PrayerIcons | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIcons = async () => {
      try {
        // For now, we'll use placeholder icons until we convert the uploaded ones
        // This will be updated with actual base64 data
        setIcons(PRAYER_ICONS_BASE64);
      } catch (error) {
        console.error('Failed to load prayer icons:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIcons();
  }, []);

  return { icons, loading };
};