export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = 'cookie-consent-v2';

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
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
  return localStorage.getItem(CONSENT_KEY) !== null;
}
