import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { normalizeServices } from '@/lib/salon-services';
import { normalizeSalonFaqItems } from '@/lib/salon-visitor-info';
import { getBrandsByIds } from '@/lib/brands';
import { parseTimeToMinutes } from '@/lib/booking-time';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type StaffRow = { name: string; role?: string; bio?: string; service_names?: string[] };

const JS_DAY_KEY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function offsetDayISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

async function getStaffFreeSlots(
  salonId: string,
  staffMemberId: string,
  workingHours: Record<string, { open?: string; close?: string; closed?: boolean }>,
  durationMin: number,
  days = 7,
  slotsPerDay = 3,
): Promise<{ date: string; slots: string[] }[]> {
  const start = todayISO();
  const end = offsetDayISO(days);

  const bookings = await sql`
    SELECT date, time, COALESCE(service_duration, 60) AS duration
    FROM bookings
    WHERE salon_id = ${salonId}
      AND staff_member_id = ${staffMemberId}::uuid
      AND date >= ${start} AND date <= ${end}
      AND status NOT IN ('cancelled', 'completed')
  ` as { date: string; time: string; duration: number }[];

  const bookedByDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const b of bookings) {
    const startMin = parseTimeToMinutes(b.time) ?? 0;
    const list = bookedByDate.get(b.date) ?? [];
    list.push({ startMin, endMin: startMin + Math.max(5, b.duration) });
    bookedByDate.set(b.date, list);
  }

  const result: { date: string; slots: string[] }[] = [];
  for (let d = 0; d <= days; d++) {
    const dateStr = offsetDayISO(d);
    const jsDay = new Date(dateStr + 'T12:00:00').getDay();
    const dayKey = JS_DAY_KEY[jsDay]!;
    const dayHours = workingHours[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) continue;

    const openMin = parseTimeToMinutes(dayHours.open) ?? 540;
    const closeMin = parseTimeToMinutes(dayHours.close) ?? 1080;
    const booked = bookedByDate.get(dateStr) ?? [];
    const daySlots: string[] = [];

    for (let t = openMin; t + durationMin <= closeMin && daySlots.length < slotsPerDay; t += 30) {
      if (!booked.some((b) => t < b.endMin && t + durationMin > b.startMin)) {
        daySlots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
      }
    }

    if (daySlots.length > 0) result.push({ date: dateStr, slots: daySlots });
  }
  return result;
}

function cancelPolicyText(hours?: number, action?: string): string {
  if (!hours) return '';
  const actionMap: Record<string, string> = {
    full_refund: 'пълно връщане',
    keep_deposit: 'депозитът се задържа',
    keep_full: 'сумата не се връща',
  };
  return `безплатно отказване до ${hours} ч. преди (след срока — ${actionMap[action ?? ''] ?? 'без връщане'})`;
}

type StaffSlots = { staffName: string; days: { date: string; slots: string[] }[] };

function buildSystemPrompt(
  salon: Record<string, unknown>,
  staff: StaffRow[],
  isTeamPlan: boolean,
  staffSlots: StaffSlots[],
): string {
  const name = String(salon.name ?? '');
  const category = String(salon.category ?? '');
  const city = String(salon.city ?? '');
  const address = String(salon.address ?? '');
  const phone = String(salon.phone ?? '');
  const about = String(salon.about ?? '');
  const instagram = salon.instagram_username ? `@${salon.instagram_username}` : '';

  // Services with deposit & cancellation policy
  const services = normalizeServices(salon.services);
  const servicesText = services.length > 0
    ? services.map((s) => {
        const parts = [s.name];
        if (s.price) parts.push(`${s.price} €`);
        if (s.duration_min) parts.push(`${s.duration_min} мин`);
        if (s.deposit_amount) parts.push(`депозит ${s.deposit_amount} €`);
        const policy = cancelPolicyText(s.cancel_policy_hours, s.cancel_policy_action);
        if (policy) parts.push(policy);
        return parts.join(' — ');
      }).join('\n')
    : '';

  // Working hours
  let hoursText = '';
  try {
    const wh = salon.working_hours as Record<string, { open: string; close: string; closed: boolean }> | null;
    if (wh) {
      const dayNames: Record<string, string> = {
        monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Сряда',
        thursday: 'Четвъртък', friday: 'Петък', saturday: 'Събота', sunday: 'Неделя',
      };
      hoursText = Object.entries(wh)
        .map(([day, val]) => val.closed ? `${dayNames[day]}: почивен` : `${dayNames[day]}: ${val.open} — ${val.close}`)
        .join('\n');
    }
  } catch { /* ignore */ }

  // Brands
  const brandIds = Array.isArray(salon.brand_domains) ? salon.brand_domains.map(String) : [];
  const brands = getBrandsByIds(brandIds);
  const brandsText = brands.length > 0 ? brands.map((b) => b.name).join(', ') : '';

  // FAQ
  const faqItems = normalizeSalonFaqItems(salon.faq_items);
  const faqText = faqItems.length > 0
    ? faqItems.map((f) => `В: ${f.question}\nО: ${f.answer}`).join('\n\n')
    : '';

  // Offers
  let offersText = '';
  try {
    const offers = salon.offers as { title: string; description?: string; discount?: number }[] | null;
    if (Array.isArray(offers) && offers.length > 0) {
      offersText = offers.map((o) => {
        const parts = [o.title];
        if (o.discount) parts.push(`${o.discount}% отстъпка`);
        if (o.description) parts.push(o.description);
        return parts.join(' — ');
      }).join('\n');
    }
  } catch { /* ignore */ }

  // Staff
  const staffText = staff.length > 0
    ? staff.map((m) => {
        const parts = [m.name];
        if (m.role) parts.push(m.role);
        if (m.service_names && m.service_names.length > 0) parts.push(`(${m.service_names.join(', ')})`);
        return parts.join(' — ');
      }).join('\n')
    : '';

  // Free slots per staff (team plan only)
  const slotsText = staffSlots.length > 0
    ? staffSlots.map((ss) => {
        const dayLines = ss.days.map((d) => {
          const dateObj = new Date(d.date + 'T12:00:00');
          const label = dateObj.toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long' });
          return `  ${label}: ${d.slots.join(', ')}`;
        }).join('\n');
        return `${ss.staffName}:\n${dayLines}`;
      }).join('\n\n')
    : '';

  const bookingInstructions = isTeamPlan ? `
ОНЛАЙН ЗАПИСВАНЕ ПРЕЗ ЧАТ (само за team план):
Можеш да записваш клиенти директно. Когато клиент иска час, събери последователно:
1. Услуга (от списъка по-горе)
2. Майстор (от екипа по-горе) — ако не посочи, предложи наличните
3. Дата и час (от свободните часове по-долу — само тях предлагай!)
4. Имe на клиента
5. Телефон на клиента

Когато имаш ВСИЧКИТЕ 5 точки потвърдени от клиента, отговори САМО с:
<<BOOK:{"staffName":"ИМЕ","serviceName":"УСЛУГА","date":"YYYY-MM-DD","time":"HH:MM","clientName":"ИМЕ","clientPhone":"ТЕЛЕФОН"}>>
(без нищо друго в отговора — само този таг)

${slotsText ? `СВОБОДНИ ЧАСОВЕ ПО МАЙСТОР (следващите 7 дни):\n${slotsText}` : ''}` : '';

  return `Ти си асистент на "${name}" — ${category || 'салон за красота'}${city ? ` в ${city}` : ''}.

Отговаряш на въпроси от клиенти относно услугите, цените, работното време, екипа и записването.

${about ? `ЗА НАС:\n${about}\n` : ''}
${staffText ? `НАШИЯТ ЕКИП:\n${staffText}\n` : ''}
${servicesText ? `УСЛУГИ И ЦЕНИ:\n${servicesText}\n` : ''}
${hoursText ? `РАБОТНО ВРЕМЕ:\n${hoursText}\n` : ''}
${address ? `АДРЕС: ${address}${city ? `, ${city}` : ''}\n` : ''}
${phone ? `ТЕЛЕФОН: ${phone}\n` : ''}
${instagram ? `INSTAGRAM: ${instagram}\n` : ''}
${brandsText ? `РАБОТИМ С: ${brandsText}\n` : ''}
${offersText ? `АКТУАЛНИ ОФЕРТИ:\n${offersText}\n` : ''}
${faqText ? `ЧЕСТИ ВЪПРОСИ:\n${faqText}\n` : ''}
${bookingInstructions}

ПРАВИЛА:
- Отговаряй само за "${name}" — не давай информация за други салони
- Бъди кратък, приятелски и на български
- ${isTeamPlan ? 'Записвай директно когато клиентът иска час при конкретен майстор' : 'За записване насочвай клиента да натисне бутона "Запази час" на страницата'}
- Ако услуга изисква депозит, спомени го при въпрос за цена
- Ако не знаеш нещо конкретно, кажи да се обадят на ${phone || 'телефона на салона'}
- Не измисляй услуги, цени, имена на служители или свободни часове извън предоставените данни`;
}

export async function POST(req: NextRequest) {
  try {
    const { salonId, messages } = await req.json() as { salonId: string; messages: ChatMessage[] };

    if (!salonId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid' }, { status: 400 });
    }

    const rows = await sql`
      SELECT *, CAST(id AS text) AS id
      FROM salons
      WHERE CAST(id AS text) = ${salonId} AND is_active = true
      LIMIT 1
    ` as Record<string, unknown>[];

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const salon = rows[0]!;

    // Load active offers and staff in parallel
    const [offersResult, staffResult] = await Promise.allSettled([
      sql`
        SELECT title, description, discount FROM salon_offers
        WHERE salon_id = ${salonId} AND is_active = true
        ORDER BY created_at DESC LIMIT 5
      `,
      sql`
        SELECT sm.name, sm.role, sm.bio,
          ARRAY(
            SELECT svc->>'name'
            FROM jsonb_array_elements(salons.services) AS svc
            JOIN staff_services ss ON ss.service_id = svc->>'id'
            WHERE ss.staff_member_id = sm.id
          ) AS service_names
        FROM staff_members sm
        JOIN salons ON salons.id = sm.salon_id
        WHERE sm.salon_id = ${salonId} AND sm.is_active = true
        ORDER BY sm.created_at ASC
        LIMIT 20
      `,
    ]);

    salon.offers = offersResult.status === 'fulfilled' ? offersResult.value : [];
    const staff: StaffRow[] = staffResult.status === 'fulfilled'
      ? (staffResult.value as StaffRow[])
      : [];

    const isTeamPlan = String(salon.plan ?? '') === 'team';
    let staffSlots: StaffSlots[] = [];

    if (isTeamPlan && staff.length > 0) {
      const wh = (salon.working_hours as Record<string, { open?: string; close?: string; closed?: boolean }> | null) ?? {};
      // Load staff member IDs so we can query their bookings
      const staffWithIds = await sql`
        SELECT CAST(id AS text) AS id, name FROM staff_members
        WHERE salon_id = ${salonId} AND is_active = true
        ORDER BY created_at ASC LIMIT 20
      ` as { id: string; name: string }[];

      staffSlots = (await Promise.allSettled(
        staffWithIds.map(async (sm) => {
          const days = await getStaffFreeSlots(salonId, sm.id, wh, 60);
          return { staffName: sm.name, days };
        }),
      )).flatMap((r) => r.status === 'fulfilled' ? [r.value] : []);
    }

    const systemPrompt = buildSystemPrompt(salon, staff, isTeamPlan, staffSlots);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://clicka.bg',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-8),
        ],
      }),
    });

    const data = await res.json() as { choices?: { message?: { content?: string } }[]; error?: unknown };
    if (!res.ok || data.error) {
      console.error('[salon-ai-chat] OpenRouter error', res.status, JSON.stringify(data));
    }
    const reply = data.choices?.[0]?.message?.content ?? 'Нещо се обърка. Опитай пак.';

    return NextResponse.json({ message: reply });
  } catch (e) {
    console.error('[salon-ai-chat]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
