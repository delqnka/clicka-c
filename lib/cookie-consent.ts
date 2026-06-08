export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = 'cookie-consent-v2';
const LEGACY_CONSENT_KEY = 'clicka-cookie-consent';

function migrateLegacyConsent(): ConsentPreferences | null {
  const legacy = localStorage.getItem(LEGACY_CONSENT_KEY);
  if (legacy === null) return null;
  // Legacy banner only covered essential/booking cookies — optional tracking stays off.
  const prefs: ConsentPreferences = { analytics: false, marketing: false };
  saveConsentPreferences(prefs);
  return prefs;
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return migrateLegacyConsent();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== 'boolean') return null;
    return { analytics: parsed.analytics, marketing: parsed.marketing ?? false };
  } catch {
    return null;
  }
}

export function saveConsentPreferences(prefs: ConsentPreferences) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  // Legacy key for backwards compat with old TrackingScripts/ClarityScript
  localStorage.setItem('cookie-consent', prefs.analytics || prefs.marketing ? 'yes' : 'no');
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: prefs }));
}

export function hasAnsweredConsent(): boolean {
  if (localStorage.getItem(CONSENT_KEY) !== null) return true;
  return localStorage.getItem(LEGACY_CONSENT_KEY) !== null;
}
