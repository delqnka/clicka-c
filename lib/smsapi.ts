const SMSAPI_ENDPOINT = 'https://api.smsapi.com/sms.do';

const TEMPLATE =
  'Здравейте {clientName}, напомняме Ви, че имате резервация за {serviceName} в {salonName} {date} от {time} часа. При невъзможност, моля свържете се с нас на {phone}.';

function formatBgDateDMY(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('bg-BG');
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  return cleaned.startsWith('0') ? '+359' + cleaned.slice(1) : cleaned;
}

export async function sendSmsReminder(
  phone: string,
  clientName: string,
  salonName: string,
  salonPhone: string,
  serviceName: string,
  date: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  const formattedDate = formatBgDateDMY(date);
  const message = TEMPLATE
    .replace('{clientName}', clientName)
    .replace('{serviceName}', serviceName)
    .replace('{salonName}', salonName)
    .replace('{date}', formattedDate)
    .replace('{time}', time)
    .replace('{phone}', salonPhone);

  const to = formatPhone(phone);

  const params = new URLSearchParams({
    to,
    message,
    format: 'json',
  });

  try {
    const res = await fetch(`${SMSAPI_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.SMSAPI_TOKEN}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.invalid_numbers?.length) {
      const error = data.message ?? `HTTP ${res.status}`;
      console.error('[smsapi] Failed to send SMS:', error, { to });
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[smsapi] Exception sending SMS:', error, { to });
    return { success: false, error };
  }
}
