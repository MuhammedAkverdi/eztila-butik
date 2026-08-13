const STORAGE_KEY = 'eztila-signup-consent';
export const TERMS_VERSION = '2026-08-13';
export const PRIVACY_VERSION = '2026-08-13';

export function saveConsent(data) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getConsent() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || Date.now() - data.createdAt > 1800 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function applySavedConsent(supabase) {
  const consent = getConsent();
  if (!consent) return;
  const { error } = await supabase.auth.updateUser({
    data: {
      phone: consent.phone,
      marketing_email: consent.marketingEmail,
      marketing_sms: consent.marketingSms,
      marketing_consent_at: (consent.marketingEmail || consent.marketingSms) ? consent.acceptedAt : null,
      terms_accepted_at: consent.acceptedAt,
      terms_version: consent.termsVersion,
      privacy_notice_version: consent.privacyVersion,
    },
  });
  if (error) throw error;
  sessionStorage.removeItem(STORAGE_KEY);
}
