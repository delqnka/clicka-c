import { sql } from '@/lib/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNotificationEmails(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,;]+/)
      : [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const item of rawItems) {
    const email = String(item ?? '').trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails.slice(0, 10);
}

export function mergeEmailRecipients(...groups: Array<unknown>): string[] {
  return normalizeNotificationEmails(groups.flatMap((group) => {
    if (Array.isArray(group)) return group;
    return group == null ? [] : [group];
  }));
}

export async function loadOwnerNotificationEmails(salonId?: string | null): Promise<string[]> {
  if (!salonId) return [];
  try {
    const rows = await sql`
      SELECT owner_notification_emails
      FROM salons
      WHERE id = ${salonId}
      LIMIT 1
    `;
    return normalizeNotificationEmails((rows[0] as Record<string, unknown> | undefined)?.owner_notification_emails);
  } catch {
    return [];
  }
}
